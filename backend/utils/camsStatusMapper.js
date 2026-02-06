/**
 * CAMS KRA Status Code Mapping Utility
 * 
 * Maps CAMS numeric status codes to human-readable status strings
 * Reference: CAMS KRA API Documentation
 */

// CAMS KYC Status Code Mapping
const CAMS_STATUS_MAP = {
  '01': { status: 'REGISTERED', description: 'KYC Registered' },
  '02': { status: 'PENDING', description: 'KYC Pending' },
  '03': { status: 'ON_HOLD', description: 'KYC On Hold' },
  '04': { status: 'REJECTED', description: 'KYC Rejected' },
  '05': { status: 'INCOMPLETE', description: 'KYC Incomplete' },
  '06': { status: 'DEACTIVATED', description: 'KYC Deactivated' },
  '07': { status: 'VERIFIED', description: 'KYC Verified' },
  '08': { status: 'SUSPENDED', description: 'KYC Suspended' },
  '09': { status: 'EXPIRED', description: 'KYC Expired' },
  '10': { status: 'MODIFIED', description: 'KYC Modified' }
};

/**
 * Map CAMS numeric status code to readable status
 * @param {string} camsCode - CAMS status code (e.g., "07")
 * @returns {object} - { status, description, rawCode }
 */
export function mapCAMSStatus(camsCode) {
  if (!camsCode) {
    return {
      status: 'UNKNOWN',
      description: 'Status not available',
      rawCode: null
    };
  }

  const normalized = String(camsCode).padStart(2, '0');
  const mapping = CAMS_STATUS_MAP[normalized];

  if (mapping) {
    return {
      status: mapping.status,
      description: mapping.description,
      rawCode: normalized
    };
  }

  // Unknown status code
  return {
    status: 'UNKNOWN',
    description: `Unknown CAMS status code: ${normalized}`,
    rawCode: normalized
  };
}

/**
 * Check if KYC status is verified/active
 * @param {string} camsCode - CAMS status code
 * @returns {boolean}
 */
export function isKYCVerified(camsCode) {
  const normalized = String(camsCode).padStart(2, '0');
  return normalized === '07'; // Only "07" is fully verified
}

/**
 * Check if KYC status is actionable (needs user action)
 * @param {string} camsCode - CAMS status code
 * @returns {boolean}
 */
export function isKYCActionable(camsCode) {
  const normalized = String(camsCode).padStart(2, '0');
  return ['02', '05'].includes(normalized); // Pending or Incomplete
}

/**
 * Extract KYC status from CAMS response
 * Handles both enquiry and download response formats
 * @param {object} camsResponse - CAMS API response
 * @returns {object} - Mapped status object
 */
export function extractCAMSStatus(camsResponse) {
  // Try kycData format (download) first, then verifyPanResponseList (enquiry)
  const panData = camsResponse?.kycData?.[0] || 
                  camsResponse?.verifyPanResponseList?.[0] || 
                  camsResponse?.PAN?.[0];
  
  if (!panData) {
    return {
      status: 'UNKNOWN',
      description: 'No PAN data in response',
      rawCode: null
    };
  }

  // CAMS uses different field names for status
  // Download uses 'status', enquiry uses 'updateStatus' or 'camskra'
  const statusCode = panData.status || panData.updateStatus || panData.kycStatus || panData.camskra;
  
  return mapCAMSStatus(statusCode);
}

export default {
  mapCAMSStatus,
  isKYCVerified,
  isKYCActionable,
  extractCAMSStatus,
  CAMS_STATUS_MAP
};
