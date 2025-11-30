const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Hardcoded for testing
const LEEGALITY_API_BASE = "https://app1.leegality.com/api/v3.0";
const LEEGALITY_AUTH_TOKEN = "SZ4WMvKmP4ZNWMNDRsanQ52m0sCOYLCI";

function asyncLog(entry) {
  try {
    const logfile = path.join(process.cwd(), 'logs', 'leegality_integration.log');
    const dir = path.dirname(logfile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFile(logfile, JSON.stringify(entry) + '\n', (err) => {
      if (err) console.error('[LeegalityLogger] write error', err);
    });
  } catch (err) {
    console.error('[LeegalityLogger] error preparing log', err);
  }
}

function makeLog(message, level = 'INFO', details = {}) {
  const entry = { timestamp: new Date().toISOString(), level, message, details };
  if (level === 'ERROR') console.error(`[${entry.timestamp}] [${level}] ${message}`, details);
  else console.info(`[${entry.timestamp}] [${level}] ${message}`, details);
  asyncLog(entry);
}

function generateRandomIRN() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

const axiosInstance = axios.create({
  baseURL: LEEGALITY_API_BASE,
  timeout: 30000,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: {
    Accept: 'application/json',
    'User-Agent': 'InvestKaps-Backend/1.0'
  }
});

async function postWithRetry(url, body, options = {}, retries = 1) {
  let attempt = 0;
  while (true) {
    try {
      return await axiosInstance.post(url, body, options);
    } catch (err) {
      const status = err.response?.status;
      attempt++;
      if (attempt > retries || !(status >= 500 && status < 600)) throw err;
      const backoffMs = 500 * attempt;
      makeLog('Transient error — retrying after backoff', 'WARN', { attempt, status, backoffMs });
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
}

async function createSignRequest({ name, email, profileId, pdfBase64, fileName, irn }) {
  // ✅ FIXED: Keep validation for PDF workflow
  if (!profileId || !pdfBase64 || !email) {
    const msg = 'Missing required fields: profileId, pdfBase64, email';
    makeLog(msg, 'ERROR', { profileId, email, hasBase64: !!pdfBase64 });
    return { success: false, error: msg, httpStatus: 400 };
  }

  const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  
  // Get frontend URL from environment or use default
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // ✅ FIXED: Correct payload structure for Leegality template workflow
  const payload = {
    profileId,
    file: { 
      name: fileName || 'Terms and Conditions',
      fields: [
        {
          // PDF file as base64 in fields array
          file: cleanBase64
        }
      ]
    },
    invitees: [{ 
      name: name || '', 
      email: email,
      phone: '' // Optional phone field
    }],
    irn: irn || generateRandomIRN()
  };

  const preview = { length: cleanBase64.length, head: cleanBase64.slice(0, 40), tail: cleanBase64.slice(-40) };
  makeLog('Sending request to Leegality API', 'INFO', {
    url: `${LEEGALITY_API_BASE}/sign/request`,
    profileId,
    fileName: payload.file.name,
    base64Preview: preview
  });

  // ✅ CRITICAL FIX: Correct authentication header
  const headers = { 
    'X-Auth-Token': LEEGALITY_AUTH_TOKEN, // NOT Bearer!
    'Content-Type': 'application/json' 
  };

  try {
    const resp = await postWithRetry('/sign/request', payload, { headers }, 1);
    makeLog('Signature request created', 'INFO', { status: resp.status });
    
    // Log the full response structure for debugging
    makeLog('Leegality API Response Structure', 'INFO', {
      responseData: JSON.stringify(resp.data, null, 2)
    });
    console.log('=== LEEGALITY FULL RESPONSE ===');
    console.log(JSON.stringify(resp.data, null, 2));
    console.log('=== END RESPONSE ===');
    
    return { success: true, data: resp.data };
  } catch (err) {
    const status = err.response?.status;
    const respData = err.response?.data;
    makeLog('Error creating signature request', 'ERROR', {
      message: err.message,
      status,
      response: respData,
      payloadPreview: { profileId, fileName: payload.file.name, base64Preview: preview }
    });
    return { success: false, error: err.message, details: respData, httpStatus: status || 500 };
  }
}

async function checkSignStatus(requestId) {
  if (!requestId) return { success: false, error: 'requestId required', httpStatus: 400 };
  makeLog('Checking signature request status', 'INFO', { requestId });
  try {
    const resp = await axiosInstance.get(`/sign/request/${requestId}`, {
      headers: { 'X-Auth-Token': LEEGALITY_AUTH_TOKEN } // ✅ FIXED: Correct auth header
    });
    makeLog('Signature request status retrieved', 'INFO', { requestId, status: resp.status });
    return { success: true, data: resp.data };
  } catch (err) {
    makeLog('Error checking signature status', 'ERROR', { 
      error: err.message, 
      response: err.response?.data, 
      status: err.response?.status 
    });
    return { success: false, error: err.message, details: err.response?.data, httpStatus: err.response?.status };
  }
}

module.exports = { createSignRequest, checkSignStatus, generateRandomIRN };