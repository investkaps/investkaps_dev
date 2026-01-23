import axios from 'axios';
import fs from 'fs';
import path from 'path';

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

/**
 * Get document details from Leegality API v3.0
 * @param {string} documentId - Leegality document ID
 * @returns {Promise<Object>} Response with document details, signing status, and files
 */
async function getDocumentDetails(documentId) {
  if (!documentId) {
    return { success: false, error: 'documentId required', httpStatus: 400 };
  }

  makeLog('Fetching document details from Leegality', 'INFO', { documentId });

  try {
    const resp = await axiosInstance.get('/sign/request', {
      params: { documentId },
      headers: { 'X-Auth-Token': LEEGALITY_AUTH_TOKEN }
    });

    makeLog('Document details retrieved', 'INFO', { 
      documentId, 
      status: resp.status,
      apiStatus: resp.data?.status 
    });

    // Check if API call was successful (status: 1)
    if (resp.data?.status !== 1) {
      makeLog('Leegality API returned failure status', 'WARN', { 
        documentId, 
        apiStatus: resp.data?.status,
        response: resp.data 
      });
      return { 
        success: false, 
        error: 'Failed to fetch document details', 
        details: resp.data,
        httpStatus: 200 
      };
    }

    const data = resp.data.data || {};
    const requests = data.requests || [];
    const files = data.files || [];
    const auditTrail = data.auditTrail || null;

    // Analyze signing status
    const totalInvitees = requests.length;
    const signedInvitees = requests.filter(r => r.status === 'signed').length;
    const rejectedInvitees = requests.filter(r => r.status === 'rejected').length;
    const expiredInvitees = requests.filter(r => r.status === 'expired').length;
    const pendingInvitees = requests.filter(r => r.status === 'pending' || !r.status).length;

    const allSigned = totalInvitees > 0 && signedInvitees === totalInvitees;
    const anyRejected = rejectedInvitees > 0;
    const anyExpired = expiredInvitees > 0;

    // Determine overall status
    let overallStatus = 'pending';
    if (allSigned) {
      overallStatus = 'completed';
    } else if (anyRejected) {
      overallStatus = 'rejected';
    } else if (anyExpired && pendingInvitees === 0) {
      overallStatus = 'expired';
    }

    makeLog('Document signing status analyzed', 'INFO', {
      documentId,
      totalInvitees,
      signedInvitees,
      rejectedInvitees,
      expiredInvitees,
      pendingInvitees,
      overallStatus,
      allSigned,
      hasAuditTrail: !!auditTrail
    });

    return {
      success: true,
      data: {
        documentId,
        status: overallStatus,
        allSigned,
        signingDetails: {
          total: totalInvitees,
          signed: signedInvitees,
          rejected: rejectedInvitees,
          expired: expiredInvitees,
          pending: pendingInvitees
        },
        invitees: requests.map(r => ({
          name: r.name,
          email: r.email,
          status: r.status || 'pending',
          signedAt: r.signedAt || null
        })),
        files: files.map(f => ({
          name: f.name || 'document.pdf',
          base64: f.base64 || f.file || null
        })),
        auditTrail: auditTrail ? {
          base64: auditTrail
        } : null,
        rawResponse: resp.data
      }
    };

  } catch (err) {
    makeLog('Error fetching document details', 'ERROR', {
      documentId,
      error: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    return {
      success: false,
      error: err.message,
      details: err.response?.data,
      httpStatus: err.response?.status || 500
    };
  }
}

export { createSignRequest, checkSignStatus, getDocumentDetails, generateRandomIRN };