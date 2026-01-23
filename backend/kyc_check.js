// nsekra_kyc_check.js
// KYC verification module for API use

import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import net from 'net';
import readline from 'readline';

// ===========================
// KYC CREDENTIALS FROM ENV (lazy initialization)
// ===========================
let KYC_CREDENTIALS = null;

const getKYCCredentials = () => {
  if (!KYC_CREDENTIALS) {
    const USERNAME = process.env.KYC_USERNAME;
    const PASSWORD = process.env.KYC_PASSWORD;
    const PASSKEY = process.env.KYC_PASSKEY;
    const POS_CODE = process.env.KYC_POS_CODE;

    // Validate required credentials
    if (!USERNAME || !PASSWORD || !PASSKEY || !POS_CODE) {
      console.error('ERROR: Missing KYC credentials in environment variables');
      console.error('Required: KYC_USERNAME, KYC_PASSWORD, KYC_PASSKEY, KYC_POS_CODE');
      throw new Error('Missing KYC credentials');
    }

    KYC_CREDENTIALS = { USERNAME, PASSWORD, PASSKEY, POS_CODE };
  }
  return KYC_CREDENTIALS;
};

// ===========================
// LOGGING (save log in backend folder)
// ===========================
const logsPath = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}
const logFile = path.join(logsPath, "kyc_validation.log");

function log(message, level = "INFO") {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `${timestamp} - ${level} - ${message}\n`;
  fs.appendFileSync(logFile, line);
  if (level === "ERROR") {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}

// ===========================
// CONNECTIVITY TEST
// ===========================
function chkConnectivity() {
  return new Promise((resolve) => {
    const socket = net.createConnection(443, "www.nsekra.com");
    socket.setTimeout(5000);

    socket.on("connect", () => {
      log("Connection test to www.nsekra.com successful");
      socket.end();
      resolve(true);
    });

    socket.on("error", (err) => {
      log(`Connection test failed: ${err.message}`, "ERROR");
      resolve(false);
    });

    socket.on("timeout", () => {
      log("Connection test timed out", "ERROR");
      socket.destroy();
      resolve(false);
    });
  });
}

// ===========================
// FETCH ENCRYPTED PASSWORD
// ===========================
async function getEncryptedPassword(passkey, password) {
  const url = "https://www.nsekra.com/intermediary/getpassword";
  const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<GetPassword>
    <Passkey>${passkey}</Passkey>
    <Password>${password}</Password>
</GetPassword>`;

  try {
    const response = await axios.post(url, xmlData, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml",
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 15000,
      maxRedirects: 0,
    });

    const text = response.data;
    const match =
      text.match(/<GetPasswordResult>(.*?)<\/GetPasswordResult>/) ||
      text.match(/<PASSWORD>(.*?)<\/PASSWORD>/);
    return match ? match[1] : null;
  } catch (err) {
    log(`Password fetch error: ${err.message}`, "ERROR");
    return null;
  }
}

// ===========================
// FETCH KYC DETAILS
// ===========================
async function fetchKycDetails(pan, dob, posCode, username, encryptedPassword, passkey) {
  const url = "https://www.nsekra.com/intermediary/kycfetch";
  const currentDate = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

  const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<APP_REQ_ROOT>
    <APP_PAN_INQ>
        <APP_PAN_NO>${pan}</APP_PAN_NO>
        <APP_PAN_DOB>${dob}</APP_PAN_DOB>
        <APP_POS_CODE>${posCode}</APP_POS_CODE>
    </APP_PAN_INQ>
    <APP_SUMM_REC>
        <APP_REQ_DATE>${currentDate}</APP_REQ_DATE>
    </APP_SUMM_REC>
    <USERNAME>${username}</USERNAME>
    <PASSWORD>${encryptedPassword}</PASSWORD>
    <PASSKEY>${passkey}</PASSKEY>
</APP_REQ_ROOT>`;

  try {
    const response = await axios.post(url, xmlData, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        Accept: "application/xml",
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 15000,
    });

    const rawXml = response.data;

    // Error case
    const errorMatch = rawXml.match(/<ERROR>[\s\S]*?<\/ERROR>/);
    if (errorMatch) {
      const codeMatch = rawXml.match(/<ERROR_CODE>(.*?)<\/ERROR_CODE>/);
      const msgMatch = rawXml.match(/<ERROR_MSG>(.*?)<\/ERROR_MSG>/);
      return [{ error: `${codeMatch?.[1] || "UNKNOWN"}: ${msgMatch?.[1] || "Unknown error"}` }, rawXml];
    }

    // Normal case (map fields)
    const fieldMappings = {
      APP_PAN_NO: ["PAN", "PAN Number"],
      APP_NAME: ["Name", "Full Name"],
      APP_STATUS: ["Status", "KYC Status"],
      APP_STATUSDT: ["StatusDate", "Status Date"],
      APP_KYC_MODE: ["KYCMode", "KYC Mode (0-4)"],
      APP_IPV_FLAG: ["IPVFlag", "In-Person Verification"],
      APP_F_NAME: ["FatherName", "Father's Name"],
      APP_DOB_DT: ["DOB", "Date of Birth"],
      APP_GEN: ["Gender", "Gender"],
      APP_COR_ADD1: ["Address1", "Address Line 1"],
      APP_COR_CITY: ["City", "City"],
      APP_COR_PINCD: ["Pincode", "PIN Code"],
      APP_COR_STATE: ["State", "State Code"],
      APP_MOB_NO: ["Mobile", "Mobile Number"],
      APP_EMAIL: ["Email", "Email Address"],
    };

    let kycData = {};
    for (const [tag, [key, description]] of Object.entries(fieldMappings)) {
      const match = rawXml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "i"));
      kycData[key] = {
        value: match ? match[1] : "N/A",
        description,
      };
    }

    return [kycData, rawXml];
  } catch (err) {
    log(`KYC fetch error: ${err.message}`, "ERROR");
    return [{ error: err.message }, null];
  }
}

// ===========================
// AUDIT LOGGING (without folder creation)
// ===========================
function logAudit(rawXmlResponse, kycData, pan) {
  // Just log the verification without creating folders
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  const xmlHash = rawXmlResponse ? crypto.createHash("sha256").update(rawXmlResponse).digest("hex").substring(0, 8) : "none";
  
  log(`KYC Verification for PAN: ${pan}, Timestamp: ${timestamp}, Hash: ${xmlHash}`, "INFO");
  
  return `KYC verified at ${timestamp}`;
}

// ===========================
// API FUNCTION
// ===========================
async function verifyKYC(pan, dob) {
  try {
    // Check connectivity first
    if (!(await chkConnectivity())) {
      return { success: false, error: "Cannot connect to www.nsekra.com" };
    }

    if (!pan || !dob) {
      return { success: false, error: "PAN and DOB cannot be empty" };
    }

    // Format inputs
    pan = pan.toUpperCase();
    
    // Get credentials
    const { USERNAME, PASSWORD, PASSKEY, POS_CODE } = getKYCCredentials();
    
    // Get encrypted password
    log(`Fetching encrypted password for PAN: ${pan}`);
    const encryptedPassword = await getEncryptedPassword(PASSKEY, PASSWORD);

    if (!encryptedPassword) {
      return { success: false, error: "Failed to retrieve encrypted password" };
    }

    // Fetch KYC details
    log(`Fetching KYC details for PAN: ${pan}`);
    const [kycData, rawXml] = await fetchKycDetails(pan, dob, POS_CODE, USERNAME, encryptedPassword, PASSKEY);

    if (kycData && !kycData.error) {
      // Log audit without creating folders
      const auditInfo = logAudit(rawXml, kycData, pan);
      log(`KYC verification logged: ${auditInfo}`);
      
      // Return success with data
      return { 
        success: true, 
        data: kycData,
        auditInfo: auditInfo
      };
    } else {
      return { 
        success: false, 
        error: kycData.error || "Unknown error fetching KYC details" 
      };
    }
  } catch (error) {
    log(`Unexpected error in verifyKYC: ${error.message}`, "ERROR");
    return { 
      success: false, 
      error: `Internal server error: ${error.message}` 
    };
  }
}

export { verifyKYC };