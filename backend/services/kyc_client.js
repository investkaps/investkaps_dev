import axios from 'axios';
import logger from '../utils/logger.js';

// ─── Configuration (validated at startup) ────────────────────────────────────
const KYC_API_URL = process.env.KYC_API_URL;
const KYC_INTERNAL_API_KEY = process.env.KYC_INTERNAL_API_KEY;

if (!KYC_API_URL) {
  throw new Error('KYC_API_URL environment variable is required (e.g. http://<EC2_IP>/pan-download)');
}
if (!KYC_INTERNAL_API_KEY) {
  throw new Error('KYC_INTERNAL_API_KEY environment variable is required');
}

// Timeout for AWS EC2 / FastAPI – kept generous for cold-starts.
const REQUEST_TIMEOUT_MS = 30_000;

// Exponential-backoff retry – only for transient errors (network blips, 5xx).
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

/**
 * Create a typed error that carries a machine-readable `code` so the
 * controller can map each failure case to a precise HTTP response without
 * ever leaking internal details to the frontend.
 *
 * Codes:
 *   KYC_TIMEOUT       – network timeout reaching EC2
 *   KYC_UNREACHABLE   – DNS / connection refused
 *   KYC_AUTH_FAILURE  – EC2 returned 401 / 403 (wrong x-api-key)
 *   KYC_VALIDATION_ERROR – EC2 returned 400 / 422 (bad PAN or DOB shape)
 *   KYC_SERVICE_ERROR – EC2 returned 5xx
 *   KYC_CAMS_FAILURE  – EC2 HTTP-200 but CAMS returned a business error
 *                        (PAN not found, DOB mismatch, invalid PAN, etc.)
 *   KYC_EMPTY_RESPONSE – EC2 HTTP-200, success=true, but data is missing
 *   KYC_UNEXPECTED    – anything else
 */
function kycError(code, friendlyMessage) {
  return Object.assign(new Error(friendlyMessage), { code });
}

/** Returns true for errors that are safe to retry (network blips, 5xx). */
function isRetryableError(error) {
  if (!error) return false;
  const retryableCodes = ['ETIMEDOUT', 'ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];
  if (retryableCodes.includes(error.code)) return true;
  if (error.response?.status >= 500) return true;
  return false;
}

/** Mask PAN – first 4 chars only – safe for log output. */
function maskPan(pan) {
  return pan.slice(0, 4) + '****';
}

/**
 * Fetch PAN KYC data from the AWS EC2 FastAPI microservice.
 *
 * Returns { raw, data } on success:
 *   raw  – the complete, unmodified EC2 JSON response (stored by the controller)
 *   data – the `data` sub-object extracted from the response
 *
 * Throws a typed kycError on every failure path so the controller can map
 * each case to an appropriate HTTP status and user-facing message without
 * any raw error detail ever reaching the frontend.
 *
 * @param {string} pan  PAN (already sanitised / uppercased)
 * @param {string} dob  DOB in DD-MM-YYYY (the format EC2 expects)
 * @returns {Promise<{ raw: object, data: object }>}
 */
export async function fetchPanKyc(pan, dob) {
  const masked = maskPan(pan);
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      if (attempt > 1) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 2);
        logger.warn('Retrying KYC API request', { pan: masked, attempt, delayMs: delay });
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      logger.info('Calling KYC API (AWS EC2)', { pan: masked, attempt });

      const response = await axios.post(
        KYC_API_URL,
        { pan, dob },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': KYC_INTERNAL_API_KEY,
          },
          timeout: REQUEST_TIMEOUT_MS,
        }
      );

      logger.info('KYC API response received', { status: response.status, pan: masked });

      const raw = response.data; // full payload – stored verbatim for audit

      // ── CAMS business-error inside an HTTP-200 response ──────────────────
      // EC2 returns { success: false, error/message } when CAMS rejects the
      // request (PAN not found, DOB mismatch, invalid PAN, etc.).
      // These are NOT retryable – fail immediately.
      if (raw.success === false) {
        // Log the raw error internally for ops visibility.
        const camsMsg = raw.error || raw.message || raw.detail || 'unknown CAMS error';
        logger.warn('KYC API: CAMS business failure', { pan: masked, camsMsg });
        // Expose only a safe, generic typed error to the controller.
        throw kycError(
          'KYC_CAMS_FAILURE',
          // Attempt to map common CAMS messages to actionable user messages.
          resolveCamsUserMessage(camsMsg)
        );
      }

      if (!raw.data) {
        throw kycError('KYC_EMPTY_RESPONSE', 'Verification service returned an incomplete response.');
      }

      logger.info('PAN KYC data fetched successfully', { pan: masked });

      // Return BOTH the raw envelope (for DB storage) and the data sub-object
      // (for field extraction).  The controller decides what to persist and
      // what to return to the frontend.
      return { raw, data: raw.data };

    } catch (error) {
      lastError = error;

      // Typed errors we raised ourselves – never retry.
      if (error.code && error.code.startsWith('KYC_')) {
        break;
      }

      // HTTP errors that must not be retried.
      const isDefinitive =
        error.response?.status === 400 ||
        error.response?.status === 401 ||
        error.response?.status === 403 ||
        error.response?.status === 422;

      if (isDefinitive || !isRetryableError(error) || attempt > MAX_RETRIES) {
        break;
      }
    }
  }

  // ─── Map every possible failure to a typed kycError ───────────────────────
  const error = lastError;

  // Already a typed kycError – re-throw as-is.
  if (error?.code?.startsWith('KYC_')) {
    throw error;
  }

  // Network timeout
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED') {
    logger.error('KYC API request timed out', { pan: masked });
    throw kycError('KYC_TIMEOUT', 'Verification is taking longer than expected. Please try again.');
  }

  // DNS / connection refused
  if (['ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ECONNRESET'].includes(error?.code)) {
    logger.error('KYC API unreachable', { pan: masked, code: error.code });
    throw kycError('KYC_UNREACHABLE', 'Verification service is currently unavailable. Please try again later.');
  }

  if (error?.response) {
    const status = error.response.status;
    logger.error('KYC API returned HTTP error', { pan: masked, status });

    // 401 / 403: wrong x-api-key or Nginx rejects the request.
    // This is an OPS problem – alert internally, never tell the user.
    if (status === 401 || status === 403) {
      logger.error('ALERT: KYC API key rejected by EC2 – rotate KYC_INTERNAL_API_KEY', { pan: masked });
      throw kycError('KYC_AUTH_FAILURE', 'Verification service is temporarily unavailable. Please contact support.');
    }

    // 400 / 422: EC2 rejected the request body shape.
    if (status === 400 || status === 422) {
      const detail = error.response.data?.detail || error.response.data?.message || '';
      logger.warn('KYC API validation rejection', { pan: masked, status, detail });
      throw kycError('KYC_VALIDATION_ERROR', 'Please check your PAN and date of birth and try again.');
    }

    // 5xx: EC2 / Gunicorn / FastAPI internal error.
    if (status >= 500) {
      throw kycError('KYC_SERVICE_ERROR', 'Verification service encountered an error. Please try again later.');
    }

    throw kycError('KYC_UNEXPECTED', 'An unexpected error occurred. Please try again later.');
  }

  logger.error('Unexpected error calling KYC API', { pan: masked, message: error?.message });
  throw kycError('KYC_UNEXPECTED', 'An unexpected error occurred. Please try again later.');
}

/**
 * Map common CAMS error message fragments to safe, user-friendly strings.
 * The raw CAMS message is NEVER forwarded to the frontend.
 */
function resolveCamsUserMessage(rawMsg) {
  const msg = (rawMsg || '').toLowerCase();
  if (msg.includes('pan not found') || msg.includes('invalid pan') || msg.includes('pan does not exist')) {
    return 'PAN not found in CAMS records. Please verify your PAN number.';
  }
  if (msg.includes('dob') || msg.includes('date of birth') || msg.includes('mismatch')) {
    return 'Date of birth does not match CAMS records. Please verify and try again.';
  }
  if (msg.includes('kyc not') || msg.includes('not registered') || msg.includes('no kyc')) {
    return 'KYC is not registered for this PAN. Please complete your KYC with a SEBI-registered intermediary.';
  }
  // Generic safe fallback – no raw detail leaks through
  return 'Verification could not be completed. Please check your details and try again.';
}
