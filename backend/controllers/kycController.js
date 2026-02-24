import { fetchPanKyc } from '../services/kyc_client.js';
import KycVerification from '../model/KycVerification.js';
import User from '../model/User.js';
import { extractCAMSStatus, isKYCVerified } from '../utils/camsStatusMapper.js';
import logger from '../utils/logger.js';

/** Mask PAN for safe log output */
const maskPan = (pan) => pan.slice(0, 4) + '****';

// ====== PAN Validation Helper ======
// NOTE: expects the value already trimmed & uppercased (sanitise before calling).
function validatePAN(pan) {
  if (!pan) {
    return { valid: false, error: 'PAN is required' };
  }
  if (pan.length > 20) {
    return { valid: false, error: 'Invalid PAN format. Expected format: ABCDE1234F' };
  }
  // PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan)) {
    return { valid: false, error: 'Invalid PAN format. Expected format: ABCDE1234F' };
  }
  return { valid: true };
}

// ====== DOB Validation Helper ======
// NOTE: expects the value already trimmed (sanitise before calling).
function validateDOB(dob) {
  if (!dob) {
    return { valid: false, error: 'Date of Birth is required' };
  }
  // Format check: DD-MM-YYYY
  const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (!dobRegex.test(dob)) {
    return { valid: false, error: 'Invalid DOB format. Expected format: DD-MM-YYYY' };
  }

  // Calendar validity check – rejects values like 31-02-2000 or 99-99-9999
  const [day, month, year] = dob.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { valid: false, error: 'Invalid date of birth. Please enter a real calendar date.' };
  }

  // DOB must be in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) {
    return { valid: false, error: 'Date of birth must be in the past.' };
  }

  // Age must be between 18 and 120 years
  const ageLimitMin = new Date(today);
  ageLimitMin.setFullYear(today.getFullYear() - 120);
  const ageLimitMax = new Date(today);
  ageLimitMax.setFullYear(today.getFullYear() - 18);
  if (date < ageLimitMin) {
    return { valid: false, error: 'Invalid date of birth.' };
  }
  if (date > ageLimitMax) {
    return { valid: false, error: 'Applicant must be at least 18 years old.' };
  }

  return { valid: true };
}

// ====== Extract KYC Data Helper ======
function extractKYCData(enquiryResult, downloadResult) {
  const extracted = {};
  
  // Extract from download result (priority) - handle kycData array format
  let downloadData = null;
  if (downloadResult?.kycData?.[0]) {
    downloadData = downloadResult.kycData[0]; // Full KYC data from download
  } else if (downloadResult?.verifyPanResponseList?.[0]) {
    downloadData = downloadResult.verifyPanResponseList[0]; // Fallback format
  } else if (downloadResult?.PAN?.[0]) {
    downloadData = downloadResult.PAN[0]; // Another fallback format
  }
  
  // Extract from enquiry result - handle verifyPanResponseList format
  let enquiryData = null;
  if (enquiryResult?.verifyPanResponseList?.[0]) {
    enquiryData = enquiryResult.verifyPanResponseList[0];
  } else if (enquiryResult?.PAN?.[0]) {
    enquiryData = enquiryResult.PAN[0];
  }
  
  // Use download data if available, otherwise enquiry data
  const panData = downloadData || enquiryData;
  
  if (panData) {
    // Basic info
    extracted.fullName = panData.name || null;
    extracted.dob = panData.dob || null;
    extracted.mobile = panData.mobile || null;
    extracted.email = panData.email || null;
    
    // Additional fields from full KYC data
    extracted.fatherName = panData.firtName || panData.fatherName || null; // Note: "firtName" typo in CAMS
    extracted.gender = panData.gender || null;
    extracted.nationality = panData.nationality || null;
    extracted.address = panData.corAddress1 || null;
    
    // CAMS status mapping - check multiple possible status fields
    // Download uses 'status', enquiry uses 'updateStatus' or 'camskra'
    const rawStatusCode = panData.status || panData.updateStatus || panData.kycStatus || panData.camskra || panData.compStatus;
    const statusMapping = extractCAMSStatus(downloadResult || enquiryResult);
    
    extracted.camsStatusCode = statusMapping.rawCode;
    extracted.kycStatus = statusMapping.status;
    extracted.statusDescription = statusMapping.description;
    
    // Additional CAMS metadata
    extracted.kycMode = panData.kycMode || null;
    extracted.signFlag = panData.signFlag || null;
    extracted.ipvFlag = panData.ipvFlag || null;
    
    // Additional verification details
    extracted.ipvDate = panData.ipvDate || null;
    extracted.applicationNo = panData.appNo || null;
    extracted.registrationDate = panData.date || null;
  }
  
  return extracted;
}

export const verifyAndSaveKYC = async (req, res) => {
  const startTime = Date.now();
  const requestId = `KYC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('KYC request started', { requestId });

  try {
    const { pan, dob } = req.body;

    // Type guards – prevents .toUpperCase() / .trim() crashing on non-string input
    // (e.g. a JSON body with pan: [] or pan: {})
    if (typeof pan !== 'string' || typeof dob !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'pan and dob must be strings',
        requestId: requestId
      });
    }

    // Sanitise FIRST so the validators work on normalised values
    const sanitizedPAN = pan.toUpperCase().trim();
    const sanitizedDOB = dob.trim();

    const panValidation = validatePAN(sanitizedPAN);
    if (!panValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: panValidation.error,
        requestId: requestId
      });
    }
    const dobValidation = validateDOB(sanitizedDOB);
    if (!dobValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: dobValidation.error,
        requestId: requestId
      });
    }
    
    const existingPan = await User.findOne({ 
      'kycStatus.panNumber': sanitizedPAN, 
      'kycStatus.isVerified': true 
    }).select('_id email clerkId kycStatus.verifiedAt kycStatus.camsData');
    
    if (existingPan) {
      const isSameUser = req.user && req.user._id.equals(existingPan._id);
      
      if (!isSameUser) {
        return res.status(409).json({
          success: false,
          error: 'This PAN number is already registered with another account. Please use a different PAN or contact support.',
          code: 'PAN_ALREADY_EXISTS',
          requestId: requestId
        });
      }
      
      // Same user re-verifying
      return res.json({
        success: true,
        isAlreadyVerified: true,
        isVerified: true,
        message: 'Your KYC verification has already been completed successfully',
        data: {
          Name: { value: existingPan.kycStatus.fullName || existingPan.kycStatus.camsData?.fullName || 'N/A', description: 'Full Name' },
          FatherName: { value: existingPan.kycStatus.fatherName || existingPan.kycStatus.camsData?.fatherName || 'N/A', description: 'Father Name' },
          PAN: { value: sanitizedPAN, description: 'PAN Number' },
          Status: { value: existingPan.kycStatus.camsData?.kycStatus || 'VERIFIED', description: existingPan.kycStatus.camsData?.statusDescription || 'KYC Status' },
          StatusCode: { value: existingPan.kycStatus.camsData?.camsStatusCode || 'N/A', description: 'CAMS Status Code' },
          DOB: { value: existingPan.kycStatus.dob || existingPan.kycStatus.camsData?.dob || sanitizedDOB, description: 'Date of Birth' },
          Gender: { value: existingPan.kycStatus.gender || existingPan.kycStatus.camsData?.gender || 'N/A', description: 'Gender' },
          Nationality: { value: existingPan.kycStatus.nationality || existingPan.kycStatus.camsData?.nationality || 'N/A', description: 'Nationality' },
          Address: { value: existingPan.kycStatus.address || existingPan.kycStatus.camsData?.address || 'N/A', description: 'Address' },
          Mobile: { value: existingPan.kycStatus.mobile || existingPan.kycStatus.camsData?.mobile || 'N/A', description: 'Mobile Number' },
          KYCMode: { value: existingPan.kycStatus.camsData?.kycMode || 'N/A', description: 'KYC Mode' },
          SignFlag: { value: existingPan.kycStatus.camsData?.signFlag || 'N/A', description: 'Signature Available' },
          IPVFlag: { value: existingPan.kycStatus.camsData?.ipvFlag || 'N/A', description: 'IPV Completed' },
          IPVDate: { value: existingPan.kycStatus.camsData?.ipvDate || 'N/A', description: 'IPV Date' },
          ApplicationNo: { value: existingPan.kycStatus.camsData?.applicationNo || 'N/A', description: 'Application Number' },
          RegistrationDate: { value: existingPan.kycStatus.camsData?.registrationDate || 'N/A', description: 'Registration Date' }
        },
        verifiedAt: existingPan.kycStatus.verifiedAt,
        requestId: requestId
      });
    }
    
    // ── Call AWS EC2 KYC API ────────────────────────────────────────────────
    // fetchPanKyc returns { raw, data } on success and throws a typed
    // kycError (with a .code property) on every failure path.
    let kycRaw, kycData;
    try {
      ({ raw: kycRaw, data: kycData } = await fetchPanKyc(sanitizedPAN, sanitizedDOB));
      logger.info('KYC data fetched from AWS EC2', { requestId, pan: maskPan(sanitizedPAN) });
    } catch (err) {
      // Map every typed error code to a precise HTTP status + user message.
      // The raw error detail (err.message internals) is NEVER sent to the frontend.
      const errorCode = err.code || 'KYC_UNEXPECTED';
      logger.error('KYC API call failed', { requestId, errorCode, message: err.message });

      const EC2_ERROR_MAP = {
        KYC_TIMEOUT:           { status: 504, code: 'TIMEOUT',             error: 'Verification timed out. Please try again.' },
        KYC_UNREACHABLE:       { status: 503, code: 'SERVICE_UNAVAILABLE', error: 'Verification service is currently unavailable. Please try again later.' },
        KYC_AUTH_FAILURE:      { status: 503, code: 'SERVICE_UNAVAILABLE', error: 'Verification service is temporarily unavailable. Please contact support.' },
        KYC_SERVICE_ERROR:     { status: 503, code: 'SERVICE_ERROR',       error: 'Verification service encountered an error. Please try again later.' },
        KYC_VALIDATION_ERROR:  { status: 400, code: 'INVALID_DATA',        error: err.message }, // safe – already mapped in kyc_client
        KYC_CAMS_FAILURE:      { status: 422, code: 'CAMS_REJECTION',       error: err.message }, // safe – already mapped in kyc_client
        KYC_EMPTY_RESPONSE:    { status: 503, code: 'SERVICE_ERROR',       error: 'Verification service returned an incomplete response. Please try again.' },
        KYC_UNEXPECTED:        { status: 503, code: 'SERVICE_ERROR',       error: 'An unexpected error occurred. Please try again later.' },
      };

      const mapped = EC2_ERROR_MAP[errorCode] ?? EC2_ERROR_MAP.KYC_UNEXPECTED;
      return res.status(mapped.status).json({
        success: false,
        error: mapped.error,
        code: mapped.code,
        requestId,
      });
    }

    // ── Extract structured fields from the response ───────────────────────
    const extractedData = extractKYCData(null, kycData);
    logger.info('KYC data extracted', { requestId, pan: maskPan(sanitizedPAN), kycStatus: extractedData.kycStatus || 'N/A' });

    const record = new KycVerification({
      user: req.user?._id,
      clerkId: req.clerkId,
      pan: sanitizedPAN,
      dob: sanitizedDOB,
      fullName: extractedData.fullName,
      camsStatusCode: extractedData.camsStatusCode,
      kycStatus: extractedData.kycStatus || 'UNKNOWN',
      kycMode: extractedData.kycMode,
      signFlag: extractedData.signFlag,
      ipvFlag: extractedData.ipvFlag,
      status: 'success',
      camsEnquiryData: null,
      // Structured extracted fields – fast query / display access
      camsDownloadData: {
        kycStatus: extractedData.kycStatus,
        camsStatusCode: extractedData.camsStatusCode,
        statusDescription: extractedData.statusDescription,
        kycMode: extractedData.kycMode,
        signFlag: extractedData.signFlag,
        ipvFlag: extractedData.ipvFlag,
        ipvDate: extractedData.ipvDate,
        applicationNo: extractedData.applicationNo,
        registrationDate: extractedData.registrationDate,
        fullName: extractedData.fullName,
        fatherName: extractedData.fatherName,
        gender: extractedData.gender,
        nationality: extractedData.nationality,
        address: extractedData.address,
        mobile: extractedData.mobile,
        email: extractedData.email,
        dob: extractedData.dob,
        recordedAt: new Date(),
      },
      // Complete, verbatim EC2 response – stored for audit / compliance.
      // Purged automatically after 90 days by the piiPurgeAt TTL index.
      // Never returned to the frontend.
      rawEc2Response: kycRaw,
    });

    try {
      await record.save();
      logger.info('KYC verification record saved', { requestId, recordId: record._id });
    } catch (saveError) {
      logger.error('Failed to save KYC verification record', { requestId, error: saveError.message });
      throw saveError;
    }

    if (req.user) {
      const isVerified = isKYCVerified(extractedData.camsStatusCode);
      
      const updateData = {
        "kycStatus.panNumber": sanitizedPAN,
        "kycStatus.isVerified": isVerified,
        "kycStatus.verifiedAt": isVerified ? new Date() : null,
        "kycStatus.fullName": extractedData.fullName,
        "kycStatus.fatherName": extractedData.fatherName,
        "kycStatus.dob": extractedData.dob || sanitizedDOB,
        "kycStatus.gender": extractedData.gender,
        "kycStatus.nationality": extractedData.nationality,
        "kycStatus.address": extractedData.address,
        "kycStatus.mobile": extractedData.mobile,
        "kycStatus.camsData": {
          fullName: extractedData.fullName,
          fatherName: extractedData.fatherName,
          gender: extractedData.gender,
          nationality: extractedData.nationality,
          address: extractedData.address,
          mobile: extractedData.mobile,
          kycStatus: extractedData.kycStatus,
          camsStatusCode: extractedData.camsStatusCode,
          statusDescription: extractedData.statusDescription,
          kycMode: extractedData.kycMode,
          signFlag: extractedData.signFlag,
          ipvFlag: extractedData.ipvFlag,
          ipvDate: extractedData.ipvDate,
          applicationNo: extractedData.applicationNo,
          registrationDate: extractedData.registrationDate,
          lastChecked: new Date()
        }
      };
      
      await User.updateOne({ _id: req.user._id }, updateData);
      logger.info('User KYC status updated', { requestId, userId: req.user._id });
    }

    const duration = Date.now() - startTime;
    logger.info('KYC request completed successfully', { requestId, recordId: record._id, durationMs: duration });

    const isVerified = isKYCVerified(extractedData.camsStatusCode);

    // ── Frontend response – minimal, safe fields only ─────────────────────
    // Raw CAMS data, addresses, mobile, email, internal IDs are NEVER sent.
    // The frontend only needs enough to show a status screen and personalise
    // the confirmation message.
    return res.json({
      success: true,
      requestId,
      verificationId: record._id,
      isVerified,
      kycStatus: extractedData.kycStatus || 'UNKNOWN',
      statusDescription: extractedData.statusDescription || 'KYC status retrieved',
      message: isVerified
        ? 'KYC verification completed successfully.'
        : `KYC status: ${extractedData.statusDescription || 'could not be confirmed'}. Please contact support if this is unexpected.`,
      // Display-safe fields
      fullName: extractedData.fullName || null,
      pan: sanitizedPAN.slice(0, 4) + '****',  // masked – never send full PAN
    });

  } catch (err) {
    const duration = Date.now() - startTime;
    // At this point only unexpected internal errors reach here (e.g. DB write
    // failure, Mongoose validation error).  EC2 / CAMS errors are all handled
    // inline above with explicit return statements and typed error codes, so
    // they never reach this block.
    logger.error('KYC request failed with unexpected error', {
      requestId,
      error: err.message,
      durationMs: duration,
    });

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during KYC verification. Please try again.',
      code: 'INTERNAL_ERROR',
      requestId,
    });
  }
};

// ====== Get KYC History ======
export const getKYCHistory = async (req, res) => {
  try {
    const { clerkId, email } = req.params;
    const isAdmin = req.user?.role === 'admin';

    // IDOR guard: a non-admin user may only retrieve their own history.
    if (clerkId && !isAdmin) {
      if (req.clerkId !== clerkId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }
    if (email && !isAdmin) {
      const normalizedEmail = email.toLowerCase();
      if (req.user?.email?.toLowerCase() !== normalizedEmail) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    let query = {};
    if (email) {
      query.email = email.toLowerCase();
    } else if (clerkId) {
      query.clerkId = clerkId;
    }
    
    const kycVerifications = await KycVerification.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      // Never return raw CAMS blobs in history listings
      .select('-camsEnquiryData -camsDownloadData -fullResponseJson');
    
    res.json({
      success: true,
      data: kycVerifications
    });
  } catch (err) {
    logger.error('Error fetching KYC history', { error: err.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC history'
    });
  }
};

// ====== Get KYC Verification by ID ======
export const getKYCVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'admin';

    // Basic ObjectId format guard to avoid leaking timing info on garbage input
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(404).json({ success: false, error: 'KYC verification not found' });
    }
    
    const kycVerification = await KycVerification
      .findById(id)
      .select('-camsEnquiryData -fullResponseJson'); // strip raw CAMS blobs
    
    if (!kycVerification) {
      return res.status(404).json({
        success: false,
        error: 'KYC verification not found'
      });
    }

    // IDOR guard: only the record owner or an admin may view it
    const ownsRecord =
      (kycVerification.clerkId && kycVerification.clerkId === req.clerkId) ||
      (kycVerification.user && req.user?._id && kycVerification.user.equals(req.user._id));

    if (!isAdmin && !ownsRecord) {
      // Return 404 rather than 403 to avoid confirming the record exists
      return res.status(404).json({ success: false, error: 'KYC verification not found' });
    }
    
    res.json({
      success: true,
      data: kycVerification
    });
  } catch (err) {
    logger.error('Error fetching KYC verification', { error: err.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC verification'
    });
  }
};

// ====== Check if PAN exists ======
// SECURITY NOTE: This endpoint intentionally returns only a boolean exists/isVerified
// flag.  It MUST NOT return any information about the user who owns the PAN
// (email, clerkId, internalId, verifiedAt) to prevent PAN enumeration attacks.
export const checkPANExists = async (req, res) => {
  try {
    const { pan } = req.params;

    // Validate PAN format before hitting the DB
    const panValidation = validatePAN(pan?.toUpperCase?.().trim());
    if (!panValidation.valid) {
      return res.status(400).json({ success: false, error: panValidation.error });
    }
    const sanitizedPAN = pan.toUpperCase().trim();

    const exists = !!(await User.exists({ 
      'kycStatus.panNumber': sanitizedPAN,
      'kycStatus.isVerified': true
    })) || !!(await KycVerification.exists({ 
      pan: sanitizedPAN, 
      status: 'success' 
    }));

    // If the requesting user owns this PAN, tell them it's already done.
    // For any other caller (or anonymous): only reveal exists=true/false.
    const isSameUser = req.user && (
      await User.exists({ _id: req.user._id, 'kycStatus.panNumber': sanitizedPAN, 'kycStatus.isVerified': true })
    );

    return res.json({
      success: true,
      exists,
      isVerified: exists,
      message: exists
        ? (isSameUser
            ? 'Your KYC has already been completed for this PAN'
            : 'This PAN is already registered')
        : 'PAN not found in system'
      // Deliberately no user object – avoids leaking other users\' PII
    });
  } catch (err) {
    logger.error('Error checking PAN existence', { error: err.message });
    res.status(500).json({
      success: false,
      error: 'Failed to check PAN status'
    });
  }
};

