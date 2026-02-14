import axios from 'axios';
import fs from 'fs';
import path from 'path';

function getLeegalityConfig() {
  return {
    apiBase: process.env.LEEGALITY_API_BASE || 'https://app1.leegality.com/api/v3.0',
    authToken: process.env.LEEGALITY_AUTH_TOKEN || ''
  };
}

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

function createAxiosInstance() {
  const { apiBase } = getLeegalityConfig();
  return axios.create({
    baseURL: apiBase,
    timeout: 30000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'InvestKaps-Backend/1.0'
    }
  });
}

async function postWithRetry(url, body, options = {}, retries = 1) {
  const axiosInstance = createAxiosInstance();
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

async function createSignRequest({ name, email, profileId, pdfBase64, fileName, irn, fields }) {
  const { apiBase, authToken } = getLeegalityConfig();

  // ✅ FIXED: Keep validation for PDF workflow
  if (!profileId || !pdfBase64 || !email) {
    const msg = 'Missing required fields: profileId, pdfBase64, email';
    makeLog(msg, 'ERROR', { profileId, email, hasBase64: !!pdfBase64 });
    return { success: false, error: msg, httpStatus: 400 };
  }

  const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');

  // Get frontend URL from environment or use default
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // ✅ FIXED: Correct payload structure for Leegality API
  const fileObj = { 
    name: fileName || 'Terms and Conditions',
    file: cleanBase64
  };
  // Pass fields array through if provided (required for template workflows)
  if (fields) fileObj.fields = fields;

  const payload = {
    profileId,
    file: fileObj,
    invitees: [{ 
      name: name || '', 
      email: email
    }],
    irn: irn || generateRandomIRN()
  };

  console.log('📤 LEEGALITY REQUEST:');
  console.log('   URL:', `${apiBase}/sign/request`);
  console.log('   Profile ID:', profileId);
  console.log('   File Name:', payload.file.name);
  console.log('   Invitee:', { name: payload.invitees[0].name, email: payload.invitees[0].email });
  console.log('   IRN:', payload.irn);

  // ✅ CRITICAL FIX: Correct authentication header
  const headers = { 
    'X-Auth-Token': authToken, // NOT Bearer!
    'Content-Type': 'application/json' 
  };

  try {
    const resp = await postWithRetry('/sign/request', payload, { headers }, 1);
    const normalized = resp.data?.data || resp.data;
    const apiStatus = resp.data?.status;
    
    console.log('📥 LEEGALITY RESPONSE:');
    console.log('   Status:', resp.status);
    console.log('   API Status:', apiStatus);
    console.log('   Document ID:', normalized?.documentId);
    console.log('   IRN:', normalized?.irn);
    console.log('   Sign URL:', normalized?.invitees?.[0]?.signUrl);
    console.log('   Invitee Count:', normalized?.invitees?.length || 0);

    if (!normalized?.documentId || !Array.isArray(normalized?.invitees) || normalized.invitees.length === 0) {
      return {
        success: false,
        error: 'Leegality did not return documentId/invitees',
        details: resp.data,
        httpStatus: 502
      };
    }

    return { success: true, data: normalized };
  } catch (err) {
    console.log('❌ LEEGALITY ERROR:');
    console.log('   Message:', err.message);
    console.log('   Status:', err.response?.status);
    console.log('   Response:', err.response?.data);
    
    return { success: false, error: err.message, details: err.response?.data, httpStatus: err.response?.status || 500 };
  }
}

async function checkSignStatus(requestId) {
  const { authToken } = getLeegalityConfig();
  if (!requestId) return { success: false, error: 'requestId required', httpStatus: 400 };
  makeLog('Checking signature request status', 'INFO', { requestId });
  try {
    const axiosInstance = createAxiosInstance();
    const resp = await axiosInstance.get(`/sign/request/${requestId}`, {
      headers: { 'X-Auth-Token': authToken } // ✅ FIXED: Correct auth header
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
  const { apiBase, authToken } = getLeegalityConfig();
  if (!documentId) {
    return { success: false, error: 'documentId required', httpStatus: 400 };
  }

  console.log('📤 LEEGALITY STATUS CHECK:');
  console.log('   URL:', `${apiBase}/sign/request?documentId=${documentId}`);
  console.log('   Document ID:', documentId);

  try {
    // Correct endpoint: GET /sign/request?documentId=XXX
    const resp = await axios.get(`${apiBase}/sign/request`, {
      params: { documentId },
      headers: { 'X-Auth-Token': authToken }
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

    // Analyze signing status - just check signed boolean
    const totalInvitees = requests.length;
    const signedInvitees = requests.filter(r => r.signed === true).length;
    const rejectedInvitees = requests.filter(r => r.rejected === true).length;
    const expiredInvitees = requests.filter(r => r.expired === true).length;
    const activeInvitees = requests.filter(r => r.active === true).length;
    const pendingInvitees = requests.filter(r => !r.signed && !r.rejected && !r.expired && r.active).length;

    let overallStatus;
    if (totalInvitees > 0 && signedInvitees === totalInvitees) {
      overallStatus = 'COMPLETED';
    } else if (rejectedInvitees > 0) {
      overallStatus = 'REJECTED';
    } else if (expiredInvitees > 0 && pendingInvitees === 0) {
      overallStatus = 'EXPIRED';
    } else if (signedInvitees > 0) {
      overallStatus = 'SIGNED';
    } else if (activeInvitees > 0) {
      overallStatus = 'SENT';
    } else {
      overallStatus = 'INACTIVE';
    }

    const allSigned = totalInvitees > 0 && signedInvitees === totalInvitees;
    
    console.log('📥 LEEGALITY STATUS RESPONSE:');
    console.log('   Overall Status:', overallStatus);
    console.log('   Signed:', signedInvitees, '/', totalInvitees);
    console.log('   All Signed:', allSigned);

    return {
      success: true,
      data: {
        documentId: data.documentId || documentId,
        irn: data.irn,
        status: overallStatus,
        allSigned,
        signingDetails: {
          total: totalInvitees,
          signed: signedInvitees,
          rejected: rejectedInvitees,
          expired: expiredInvitees,
          pending: pendingInvitees
        },
        // Store invitee details but NOT base64 files
        invitees: requests.map(r => ({
          name: r.name,
          email: r.email,
          signed: r.signed,
          rejected: r.rejected,
          expired: r.expired,
          active: r.active,
          expiryDate: r.expiryDate || null,
          signUrl: r.signUrl || null,
          signType: r.signType || null
        }))
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