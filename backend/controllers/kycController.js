import { getToken, panEnquiry, panDownload } from "../kyc_check.js";
import KycVerification from "../model/KycVerification.js";
import User from "../model/User.js";
import { extractCAMSStatus, isKYCVerified } from "../utils/camsStatusMapper.js";

// ====== PAN Validation Helper ======
function validatePAN(pan) {
  if (!pan) {
    return { valid: false, error: 'PAN is required' };
  }
  
  // PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  
  if (!panRegex.test(pan)) {
    return { valid: false, error: 'Invalid PAN format. Expected format: ABCDE1234F' };
  }
  
  return { valid: true };
}

// ====== DOB Validation Helper ======
function validateDOB(dob) {
  if (!dob) {
    return { valid: false, error: 'Date of Birth is required' };
  }
  
  // DOB format: DD-MM-YYYY
  const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
  
  if (!dobRegex.test(dob)) {
    return { valid: false, error: 'Invalid DOB format. Expected format: DD-MM-YYYY' };
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
  
  console.log('\n=== KYC REQUEST ===', requestId);

  try {
    const { pan, dob } = req.body;
    
    const panValidation = validatePAN(pan);
    if (!panValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: panValidation.error,
        requestId: requestId
      });
    }
    const dobValidation = validateDOB(dob);
    if (!dobValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: dobValidation.error,
        requestId: requestId
      });
    }
    const sanitizedPAN = pan.toUpperCase().trim();
    const sanitizedDOB = dob.trim();
    
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
    
    console.log('Fetching CAMS token...');
    let token;
    try {
      token = await getToken();
      console.log('✅ Token received');
    } catch (err) {
      console.error('❌ Token failed:', err.message);
      return res.status(503).json({
        success: false,
        error: 'KYC service authentication failed. Please try again later.',
        code: 'CAMS_AUTH_FAILED',
        details: err.message,
        requestId: requestId
      });
    }

    let enquiryResult;
    try {
      enquiryResult = await panEnquiry(token, sanitizedPAN);
      console.log('✅ Enquiry success');
    } catch (err) {
      console.error('❌ Enquiry failed:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify PAN. Please check your PAN number and try again.',
        code: 'CAMS_ENQUIRY_FAILED',
        details: err.message,
        requestId: requestId
      });
    }

    let downloadResult = null;
    try {
      downloadResult = await panDownload(token, sanitizedPAN, sanitizedDOB);
      console.log('✅ Download success');
    } catch (err) {
      console.error('⚠️ Download failed (non-critical):', err.message);
      downloadResult = null;
    }

    // Debug: Log actual CAMS response structure
    if (process.env.NODE_ENV === 'development') {
      console.log('--- DEBUG CAMS RESPONSES ---');
      console.log('Enquiry keys:', enquiryResult ? Object.keys(enquiryResult) : 'null');
      console.log('Download keys:', downloadResult ? Object.keys(downloadResult) : 'null');
      if (enquiryResult?.verifyPanResponseList?.[0]) {
        console.log('Enquiry PAN data:', Object.keys(enquiryResult.verifyPanResponseList[0]));
      }
      if (downloadResult?.verifyPanResponseList?.[0]) {
        console.log('Download PAN data:', Object.keys(downloadResult.verifyPanResponseList[0]));
      }
      console.log('--- END DEBUG ---');
    }
    
    const extractedData = extractKYCData(enquiryResult, downloadResult);
    console.log('✅ Data extracted:', extractedData.fullName || 'N/A', '|', extractedData.kycStatus || 'N/A');
    
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
      status: "success",
      camsEnquiryData: enquiryResult,
      camsDownloadData: downloadResult
    });

    try {
      await record.save();
      console.log('✅ Saved:', record._id);
    } catch (saveError) {
      console.error('❌ Save failed:', saveError.message);
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
      console.log('✅ User updated');
    }
    
    const duration = Date.now() - startTime;
    console.log('✅ SUCCESS:', duration + 'ms', '| ID:', record._id);
    
    // ====== Return frontend-compatible response ======
    const isVerified = isKYCVerified(extractedData.camsStatusCode);
    
    const responseData = {
      success: true,
      message: isVerified ? 'KYC verification completed successfully' : 'KYC verification completed with status: ' + extractedData.statusDescription,
      verificationId: record._id,
      requestId: requestId,
      isVerified: isVerified,
      data: {
        // Frontend expects this format
        Name: { value: extractedData.fullName || 'N/A', description: 'Full Name' },
        FatherName: { value: extractedData.fatherName || 'N/A', description: 'Father Name' },
        PAN: { value: sanitizedPAN, description: 'PAN Number' },
        Status: { value: extractedData.kycStatus || 'UNKNOWN', description: extractedData.statusDescription || 'KYC Status' },
        StatusCode: { value: extractedData.camsStatusCode || 'N/A', description: 'CAMS Status Code' },
        DOB: { value: extractedData.dob || sanitizedDOB, description: 'Date of Birth' },
        Gender: { value: extractedData.gender || 'N/A', description: 'Gender' },
        Nationality: { value: extractedData.nationality || 'N/A', description: 'Nationality' },
        Address: { value: extractedData.address || 'N/A', description: 'Address' },
        Mobile: { value: extractedData.mobile || 'N/A', description: 'Mobile Number' },
        KYCMode: { value: extractedData.kycMode || 'N/A', description: 'KYC Mode' },
        SignFlag: { value: extractedData.signFlag || 'N/A', description: 'Signature Available' },
        IPVFlag: { value: extractedData.ipvFlag || 'N/A', description: 'IPV Completed' },
        IPVDate: { value: extractedData.ipvDate || 'N/A', description: 'IPV Date' },
        ApplicationNo: { value: extractedData.applicationNo || 'N/A', description: 'Application Number' },
        RegistrationDate: { value: extractedData.registrationDate || 'N/A', description: 'Registration Date' }
      },
      // Raw CAMS responses for debugging (only in development)
      ...(process.env.NODE_ENV === 'development' && {
        enquiry: enquiryResult,
        download: downloadResult
      }),
      isDuplicate: false,
      isAlreadyVerified: false
    };
    
    
    res.json(responseData);

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('❌ FAILED:', err.message, '|', duration + 'ms');

    // Determine appropriate status code and error message
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred during KYC verification';
    let errorCode = 'INTERNAL_ERROR';
    
    if (err.message.includes('CAMS')) {
      statusCode = 503;
      errorMessage = 'KYC service is temporarily unavailable. Please try again later.';
      errorCode = 'SERVICE_UNAVAILABLE';
    } else if (err.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'KYC verification timed out. Please try again.';
      errorCode = 'TIMEOUT';
    } else if (err.message.includes('Invalid')) {
      statusCode = 400;
      errorMessage = err.message;
      errorCode = 'INVALID_DATA';
    } else if (err.message.includes('PAN')) {
      statusCode = 400;
      errorMessage = err.message;
      errorCode = 'PAN_ERROR';
    }

    const errorResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      requestId: requestId,
      details: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        stack: err.stack,
        name: err.name
      } : undefined
    };
    
    console.error('Error response:', JSON.stringify(errorResponse, null, 2));
    
    res.status(statusCode).json(errorResponse);
  }
};

// ====== Get KYC History ======
export const getKYCHistory = async (req, res) => {
  try {
    const { clerkId, email } = req.params;
    
    let query = {};
    if (email) {
      query.email = email.toLowerCase();
    } else if (clerkId) {
      query.clerkId = clerkId;
    }
    
    const kycVerifications = await KycVerification.find(query)
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: kycVerifications
    });
  } catch (err) {
    console.error("Error fetching KYC history:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ====== Get KYC Verification by ID ======
export const getKYCVerification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const kycVerification = await KycVerification.findById(id);
    
    if (!kycVerification) {
      return res.status(404).json({
        success: false,
        error: 'KYC verification not found'
      });
    }
    
    res.json({
      success: true,
      data: kycVerification
    });
  } catch (err) {
    console.error("Error fetching KYC verification:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ====== Check if PAN exists ======
export const checkPANExists = async (req, res) => {
  try {
    const { pan } = req.params;
    
    const userWithPan = await User.findOne({ 
      'kycStatus.panNumber': pan, 
      'kycStatus.isVerified': true 
    });
    
    const kycVerification = await KycVerification.findOne({ 
      pan, 
      status: 'success' 
    }).sort({ createdAt: -1 }).limit(1);
    
    if (userWithPan || kycVerification) {
      return res.json({
        success: true,
        exists: true,
        isVerified: true,
        message: 'This PAN number has already been verified',
        user: userWithPan ? {
          id: userWithPan._id,
          clerkId: userWithPan.clerkId,
          email: userWithPan.email,
          verifiedAt: userWithPan.kycStatus.verifiedAt
        } : null
      });
    }
    
    res.json({
      success: true,
      exists: false,
      isVerified: false,
      message: 'PAN not found in system'
    });
  } catch (err) {
    console.error("Error checking PAN:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ====== Bypass KYC (for testing) ======
export const bypassKYC = async (req, res) => {
  try {
    const userId = req.user?._id;
    const clerkId = req.user?.clerkId;
    const userEmail = req.user?.email;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Check if already verified
    const existingVerification = await KycVerification.findOne({
      $or: [
        { user: userId },
        { clerkId: clerkId },
        { email: userEmail }
      ],
      status: 'success'
    });
    
    if (existingVerification) {
      return res.json({
        success: true,
        message: 'KYC already verified',
        isAlreadyVerified: true,
        data: existingVerification
      });
    }
    
    // Create test KYC record
    const testPAN = 'AAAAA0000A';
    const testData = {
      fullName: req.user?.name || 'Test User',
      dob: '01-01-1990',
      status: 'Active'
    };
    
    const kycVerification = new KycVerification({
      user: userId,
      clerkId: clerkId,
      email: userEmail,
      pan: testPAN,
      dob: testData.dob,
      status: 'success',
      camsEnquiryData: { bypass: true, ...testData },
      camsDownloadData: { bypass: true, ...testData }
    });
    
    await kycVerification.save();
    
    // Update user KYC status
    await User.updateOne(
      { _id: userId },
      {
        'kycStatus.panNumber': testPAN,
        'kycStatus.isVerified': true,
        'kycStatus.verifiedAt': new Date(),
        'kycStatus.camsData': testData
      }
    );
    
    res.json({
      success: true,
      message: 'KYC verification bypassed successfully',
      data: testData,
      verificationId: kycVerification._id
    });
    
  } catch (err) {
    console.error("Error bypassing KYC:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
