/**
 * CAMS KRA Status Code Mapping Utility
 *
 * Status codes returned by the internal KYC proxy API (/pan-download):
 *   01 / 11  UNDER_PROCESS
 *   02 / 12  KYC_REGISTERED  (verified ✓)
 *   03 / 13  ON_HOLD
 *   04 / 14  KYC_REJECTED
 *   05       NOT_AVAILABLE
 *   06       DEACTIVATED
 *   07       KYC_VALIDATED   (verified ✓)
 *   22       MUTUAL_FUND_VERIFIED (verified ✓)
 */

// Codes that represent a fully verified KYC
export const VERIFIED_CODES = new Set(['02', '07', '12', '22']);

// Codes that are "informational" — not errors, not verified
const CAMS_STATUS_MAP = {
  '01': { status: 'UNDER_PROCESS',        description: 'KYC Under Process',          userMessage: 'Your KYC verification is currently under process.' },
  '02': { status: 'KYC_REGISTERED',       description: 'KYC Registered',             userMessage: 'KYC verified successfully.' },
  '03': { status: 'ON_HOLD',              description: 'KYC On Hold',                userMessage: 'Your KYC verification is currently on hold.' },
  '04': { status: 'KYC_REJECTED',         description: 'KYC Rejected',               userMessage: 'Your KYC has been rejected. Please re-submit KYC.' },
  '05': { status: 'NOT_AVAILABLE',        description: 'PAN Not Available',          userMessage: 'No KYC record found for this PAN.' },
  '06': { status: 'DEACTIVATED',          description: 'KYC Deactivated',            userMessage: 'Your KYC record is deactivated.' },
  '07': { status: 'KYC_VALIDATED',        description: 'KYC Validated',              userMessage: 'KYC verified successfully.' },
  '11': { status: 'UNDER_PROCESS',        description: 'KYC Under Process',          userMessage: 'Your KYC verification is currently under process.' },
  '12': { status: 'KYC_REGISTERED',       description: 'KYC Registered',             userMessage: 'KYC verified successfully.' },
  '13': { status: 'ON_HOLD',              description: 'KYC On Hold',                userMessage: 'Your KYC verification is currently on hold.' },
  '14': { status: 'KYC_REJECTED',         description: 'KYC Rejected',               userMessage: 'Your KYC has been rejected. Please re-submit KYC.' },
  '22': { status: 'MUTUAL_FUND_VERIFIED', description: 'Mutual Fund KYC Verified',   userMessage: 'KYC verified successfully.' },
};

/**
 * Map a status_code from the proxy API to its descriptor.
 * @param {string|number} code
 * @returns {{ status: string, description: string, userMessage: string, rawCode: string }}
 */
export function mapCAMSStatus(code) {
  if (!code && code !== 0) {
    return { status: 'UNKNOWN', description: 'Status not available', userMessage: 'Unable to determine KYC status. Please try again later.', rawCode: null };
  }

  const normalized = String(code).padStart(2, '0');
  const entry = CAMS_STATUS_MAP[normalized];

  if (entry) {
    return { ...entry, rawCode: normalized };
  }

  return {
    status: 'UNKNOWN',
    description: `Unknown KYC status code: ${normalized}`,
    userMessage: 'Unable to determine KYC status. Please try again later.',
    rawCode: normalized,
  };
}

/**
 * Returns true when the status_code represents a fully verified KYC.
 * @param {string|number} code
 */
export function isKYCVerified(code) {
  if (!code && code !== 0) return false;
  return VERIFIED_CODES.has(String(code).padStart(2, '0'));
}

/**
 * Extract KYC status from a legacy CAMS nested response (enquiry/download format).
 * Only used when the response still wraps data in kycData / verifyPanResponseList.
 */
export function extractCAMSStatus(camsResponse) {
  const panData =
    camsResponse?.kycData?.[0] ||
    camsResponse?.verifyPanResponseList?.[0] ||
    camsResponse?.PAN?.[0];

  if (!panData) {
    return { status: 'UNKNOWN', description: 'No PAN data in response', rawCode: null };
  }

  const statusCode = panData.status || panData.updateStatus || panData.kycStatus || panData.camskra;
  return mapCAMSStatus(statusCode);
}

export default {
  mapCAMSStatus,
  isKYCVerified,
  extractCAMSStatus,
  CAMS_STATUS_MAP,
  VERIFIED_CODES,
};
