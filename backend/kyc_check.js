import axios from "axios";
import crypto from "crypto";
import logger from "./utils/logger.js";

// ─── SECURITY WARNING ──────────────────────────────────────────────────────
// This file is legacy / test code for direct CAMS API access.
// It is NOT called by kycController; the production flow uses kyc_client.js.
//
// The AES-256-CBC keys below MUST be moved to environment variables before
// this file is used in any live environment.  Hardcoded crypto keys are a
// critical security vulnerability.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_URL = "https://camskra.com/restAuth/api/v1/getToken";
const PAN_ENQUIRY_URL = "https://camskra.com/CAMSWS_KRA/KRA_API/PANEnquiry";
const PAN_DOWNLOAD_URL = "https://camskra.com/CAMSWS_KRA/KRA_API/PANdownload";

const CLIENT_CODE = "KAPOLIV";

// Helper function to get credentials (reads from env at runtime)
function getCredentials() {
  return {
    clientId: process.env.CAMS_CLIENT_ID,
    secretKey: process.env.CAMS_SECRET_KEY
  };
}

// ================= TOKEN CACHE =================
let cachedToken = null;
let tokenExpiry = null;

// TODO: Move these to environment variables (CAMS_ENC_KEY, CAMS_IV_KEY).
// Hardcoded keys are a critical security risk – anyone with source access can
// decrypt all CAMS PAN payloads.
const ENC_DEC_KEY = Buffer.from(
  process.env.CAMS_ENC_KEY || "LzM+aHwsv/M4aL3YAIbwN4NhbHUHtsTaFGIvyZmUiSY=",
  "base64"
);

const IV_KEY = Buffer.from(
  process.env.CAMS_IV_KEY || "5S3a+G4uChnTD+8DcgFHUQ==",
  "base64"
);

// ================= AES =================

function encryptPayload(payload) {
  const cipher = crypto.createCipheriv("aes-256-cbc", ENC_DEC_KEY, IV_KEY);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

function decryptPayload(data) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENC_DEC_KEY, IV_KEY);
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

// ================= TOKEN WITH CACHING & RETRY =================

export async function getToken(maxRetries = 3) {
  const tokenRequestId = `TOKEN_${Date.now()}`;
  
  const { clientId, secretKey } = getCredentials();
  if (!clientId || !secretKey) {
    cachedToken = null;
    tokenExpiry = null;
    throw new Error('CAMS credentials missing: CAMS_CLIENT_ID/CAMS_SECRET_KEY not configured');
  }
  
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    logger.info('CAMS token: using cached token');
    return cachedToken;
  }

  logger.info('CAMS token: requesting new token');

  // Retry logic for token fetch
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const payload = {
        clientCode: CLIENT_CODE,
        grantType: "client_credentials",
        scope: "KYC"
      };
      
      const res = await axios.post(TOKEN_URL, payload, {
        auth: {
          username: clientId,
          password: secretKey
        },
        timeout: 15000
      });

      // Check for CAMS error response format
      if (res.data.returnCode && res.data.returnCode !== "0") {
        logger.error('CAMS token API returned error', {
          returnCode: res.data.returnCode,
          returnMsg: res.data.returnMsg
        });
        throw new Error(`CAMS API error: ${res.data.returnMsg} (Code: ${res.data.returnCode})`);
      }

      if (!res.data.accessToken) {
        logger.error('CAMS token API: no accessToken in response');
        throw new Error("Token not returned from CAMS");
      }

      // Cache token for 55 minutes (tokens valid for 60 min)
      cachedToken = res.data.accessToken;
      tokenExpiry = Date.now() + (55 * 60 * 1000);
      
      logger.info('CAMS token: received and cached');
      return cachedToken;

    } catch (err) {
      if (attempt === maxRetries) {
        cachedToken = null;
        tokenExpiry = null;
        logger.error('CAMS token: all retries exhausted', { message: err.message });
        throw new Error(`CAMS token API error: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// ================= PAN ENQUIRY =================

export async function panEnquiry(token, pan) {
  const enquiryRequestId = `ENQ_${Date.now()}`;
  const { clientId } = getCredentials();
  
  try {
    const payload = { PAN: [{ pan }] };
    const encrypted = encryptPayload(payload);

    const res = await axios.post(
      PAN_ENQUIRY_URL,
      { data: encrypted },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ClientId: clientId,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    if (!res.data || !res.data.data) {
      throw new Error('Invalid response from CAMS enquiry API');
    }

    const decrypted = decryptPayload(res.data.data);

    if (!decrypted || (!decrypted.PAN && !decrypted.verifyPanResponseList)) {
      throw new Error('Invalid decrypted response from CAMS enquiry API');
    }

    logger.info('CAMS PAN enquiry succeeded', { status: res.status });
    return decrypted;

  } catch (err) {
    if (err.response?.status === 401) {
      cachedToken = null;
      tokenExpiry = null;
      throw new Error('CAMS token expired - please retry');
    }
    throw err;
  }
}

// ================= PAN DOWNLOAD =================

export async function panDownload(token, pan, dob) {
  const downloadRequestId = `DL_${Date.now()}`;
  const { clientId } = getCredentials();
  
  try {
    const payload = { PAN: [{ pan, dob }], sign_required: "N" };
    const encrypted = encryptPayload(payload);

    const res = await axios.post(
      PAN_DOWNLOAD_URL,
      { data: encrypted },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ClientId: clientId,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    if (!res.data || !res.data.data) {
      throw new Error('Invalid response from CAMS download API');
    }

    const decrypted = decryptPayload(res.data.data);

    if (!decrypted) {
      throw new Error('Invalid decrypted response from CAMS download API');
    }

    logger.info('CAMS PAN download succeeded', { status: res.status });
    return decrypted;

  } catch (err) {
    if (err.response?.status === 401) {
      cachedToken = null;
      tokenExpiry = null;
      throw new Error('CAMS token expired - please retry');
    }
    throw err;
  }
}
