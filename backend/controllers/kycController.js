const KycVerification = require('../model/KycVerification');
const User = require('../model/User');
const { verifyKYC } = require('../kyc_check');
const logger = require('../utils/logger');

/**
 * Verify KYC and save the verification result to database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyAndSaveKYC = async (req, res) => {
  try {
    const { pan, dob, email } = req.body;
    
    if (!pan || !dob) {
      return res.status(400).json({ 
        success: false, 
        error: 'PAN and DOB are required fields' 
      });
    }
    
    logger.info(`KYC Request: PAN=${pan}, email=${email || 'not provided'}`);
    
    // 🔍 FAST CHECK: Check if PAN already exists and is verified (indexed query)
    // This prevents unnecessary API calls to KYC service
    const userWithVerifiedPan = await User.findOne({ 
      'kycStatus.panNumber': pan, 
      'kycStatus.isVerified': true 
    }).select('email clerkId kycStatus.verifiedAt').lean();
    
    if (userWithVerifiedPan) {
      logger.info(`PAN ${pan} is already verified for user: ${userWithVerifiedPan.email || userWithVerifiedPan.clerkId}`);
      
      // Check if it's the same user trying to re-verify
      const isSameUser = (req.user && req.user._id.toString() === userWithVerifiedPan._id.toString()) ||
                         (req.clerkId && req.clerkId === userWithVerifiedPan.clerkId);
      
      if (!isSameUser) {
        return res.status(409).json({
          success: false,
          error: 'This PAN number already exists in our system. Please retry with a different PAN number.'
        });
      }
      
      // Same user re-verifying - allow it but mark as duplicate
      logger.info('Same user re-verifying their PAN - allowing request');
    }
    
    // Get user ID if authenticated
    let userId = null;
    let clerkId = null;
    let userEmail = email; // Use email from request body if provided
    let existingUser = null;
    let alreadyVerified = false;
    
    // First check if we have a user in the request (from verifyToken middleware)
    if (req.user) {
      userId = req.user._id;
      clerkId = req.user.clerkId;
      existingUser = req.user;
      // If email wasn't provided in the request body, use the one from the user object
      if (!userEmail && req.user.email) {
        userEmail = req.user.email;
      }
      logger.info(`User found in request: userId=${userId}, email=${userEmail}`);
    } 
    // Then check if we have a clerkId in the request (from simpleAuthCheck middleware)
    else if (req.clerkId) {
      clerkId = req.clerkId;
      // Try to find user by clerkId
      existingUser = await User.findOne({ clerkId });
      if (existingUser) {
        userId = existingUser._id;
        // If email wasn't provided in the request body, use the one from the user object
        if (!userEmail && existingUser.email) {
          userEmail = existingUser.email;
        }
        logger.info(`User found by clerkId: userId=${userId}, email=${userEmail}`);
      } else {
        logger.info(`No user found for clerkId: ${clerkId}`);
      }
    }
    
    // If we have an email but no user yet, try to find by email
    if (userEmail && !userId) {
      existingUser = await User.findOne({ email: userEmail });
      if (existingUser) {
        userId = existingUser._id;
        clerkId = existingUser.clerkId;
        logger.info(`User found by email: userId=${userId}, email=${userEmail}`);
      }
    }
    
    // Check if this PAN is already verified by any user
    if (pan) {
      const userWithPan = await User.findOne({ 'kycStatus.panNumber': pan, 'kycStatus.isVerified': true });
      if (userWithPan) {
        logger.info(`Found user with verified PAN: ${pan}`);
        existingUser = userWithPan;
        userId = userWithPan._id;
        clerkId = userWithPan.clerkId;
        // If email wasn't provided, use the one from the user with this PAN
        if (!userEmail && userWithPan.email) {
          userEmail = userWithPan.email;
        }
        
        // Mark as already verified
        alreadyVerified = true;
        logger.info(`This PAN is already verified for user: ${userWithPan.email || userWithPan.clerkId}`);
      }
    }
    
    // If the current user is already verified with this PAN
    if (existingUser && existingUser.kycStatus && existingUser.kycStatus.isVerified && 
        existingUser.kycStatus.panNumber === pan) {
      alreadyVerified = true;
      logger.info('User is already verified with this PAN');
    }
    
    // Call the KYC verification function
    const result = await verifyKYC(pan, dob);
    
    // Store KYC response email for reference only, but don't use it for user identification
    let kycResponseEmail = null;
    if (result.success && result.data?.Email?.value) {
      kycResponseEmail = result.data.Email.value.toLowerCase();
      logger.info(`KYC response contained email: ${kycResponseEmail} (not using for identification)`);
    }
    
    // Create a new KYC verification record
    const kycVerification = new KycVerification({
      user: userId,
      clerkId: clerkId,
      email: userEmail, // Include email in the verification record
      pan: pan,
      dob: dob,
      status: result.success ? 'success' : 'failed',
      kycData: result.data,
      auditInfo: result.auditInfo,
      error: result.error
    });
    
    // Check if this is a duplicate verification (same PAN, same result) or already verified user
    let isDuplicate = false;
    let isAlreadyVerified = alreadyVerified;
    
    if (existingUser && existingUser.kycStatus && existingUser.kycStatus.isVerified && 
        existingUser.kycStatus.panNumber === pan && result.success) {
      logger.info('This appears to be a duplicate verification for an already verified user');
      isDuplicate = true;
      isAlreadyVerified = true;
    }
    
    // Always save the verification for audit purposes
    await kycVerification.save();
    
    // If verification was successful and we have a user, update their KYC status
    if (result.success && userId) {
      const user = await User.findById(userId);
      if (user) {
        // Update KYC status with data from verification
        user.kycStatus = {
          ...user.kycStatus,
          panNumber: pan,
          isVerified: true,
          verifiedAt: new Date(),
          latestVerification: kycVerification._id,
          // Extract data from KYC response
          fullName: result.data?.Name?.value || user.kycStatus.fullName,
          fatherName: result.data?.FatherName?.value || user.kycStatus.fatherName,
          dob: result.data?.DOB?.value || user.kycStatus.dob,
          gender: result.data?.Gender?.value || user.kycStatus.gender
        };
        
        // Add this verification to the user's KYC verifications array
        if (!user.kycVerifications) {
          user.kycVerifications = [];
        }
        user.kycVerifications.push(kycVerification._id);
        
        await user.save();
        logger.info(`Updated user ${user._id} with KYC verification ${kycVerification._id}`);
      }
    }
    
    // If verification was successful but no user is associated yet, try to find one by clerkId
    else if (result.success && !userId && clerkId) {
      try {
        let user = null;
        
        // Try to find user by clerkId
        user = await User.findOne({ clerkId });
        if (user) {
          logger.info(`Found existing user with clerkId ${clerkId}`);
          
          // Update the user with KYC data
          user.kycStatus = {
            ...user.kycStatus,
            panNumber: pan,
            isVerified: true,
            verifiedAt: new Date(),
            latestVerification: kycVerification._id,
            fullName: result.data?.Name?.value || user.kycStatus?.fullName,
            fatherName: result.data?.FatherName?.value || user.kycStatus?.fatherName,
            dob: result.data?.DOB?.value || user.kycStatus?.dob,
            gender: result.data?.Gender?.value || user.kycStatus?.gender
          };
          
          if (!user.kycVerifications) {
            user.kycVerifications = [];
          }
          user.kycVerifications.push(kycVerification._id);
          
          await user.save();
          logger.info(`Updated user ${user._id} with KYC verification ${kycVerification._id}`);
          
          // Update the KYC verification with the user ID
          kycVerification.user = user._id;
          await kycVerification.save();
        } else {
          logger.info(`No user found for clerkId ${clerkId}, cannot create user without Clerk email`);
        }
      } catch (err) {
        logger.error(`Error finding/updating user by clerkId: ${err.message}`);
      }
    }
    
    // We don't create users from KYC data alone anymore - must have Clerk email
    
    // Return the result to the client
    if (result.success) {
      if (isDuplicate || isAlreadyVerified) {
        return res.status(200).json({
          success: true,
          message: 'Your KYC verification has already been completed successfully',
          data: result.data,
          verificationId: kycVerification._id,
          isDuplicate: isDuplicate,
          isAlreadyVerified: isAlreadyVerified,
          existingUser: existingUser ? {
            id: existingUser._id,
            clerkId: existingUser.clerkId,
            email: existingUser.email,
            name: existingUser.name,
            kycStatus: {
              isVerified: existingUser.kycStatus.isVerified,
              verifiedAt: existingUser.kycStatus.verifiedAt,
              panNumber: existingUser.kycStatus.panNumber
            }
          } : null
        });
      } else {
        return res.status(200).json({
          ...result,
          message: 'KYC verification completed successfully',
          verificationId: kycVerification._id,
          isDuplicate: false,
          isAlreadyVerified: false
        });
      }
    } else {
      return res.status(400).json({
        ...result,
        verificationId: kycVerification._id,
        isDuplicate: false,
        isAlreadyVerified: false
      });
    }
  } catch (error) {
    logger.error(`KYC verification error: ${error.message}`);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * Get KYC verification history for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getKYCHistory = async (req, res) => {
  try {
    const { clerkId, email } = req.params;
    
    // We need either clerkId or email
    if (!clerkId && !email) {
      return res.status(400).json({
        success: false,
        error: 'Either Clerk ID or email is required'
      });
    }
    
    let query = {};
    
    // If we have an email, use that as the primary search parameter
    if (email) {
      query.email = email.toLowerCase();
    } 
    // Otherwise use clerkId
    else if (clerkId) {
      query.clerkId = clerkId;
    }
    
    // Find all KYC verifications for this user
    const kycVerifications = await KycVerification.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(10); // Limit to 10 records
    
    return res.status(200).json({
      success: true,
      data: kycVerifications
    });
  } catch (error) {
    logger.error(`Error fetching KYC history: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get a specific KYC verification by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getKYCVerification = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Verification ID is required'
      });
    }
    
    // Find the KYC verification
    const kycVerification = await KycVerification.findById(id);
    
    if (!kycVerification) {
      return res.status(404).json({
        success: false,
        error: 'KYC verification not found'
      });
    }
    
    // Check if the user is authorized to view this verification
    // Allow access if either clerkId or email matches
    if (req.user && 
        kycVerification.clerkId !== req.user.clerkId && 
        kycVerification.email !== req.user.email) {
      
      // Extra check - if the verification has no clerkId or email, allow access
      // This is for backward compatibility with existing records
      if (kycVerification.clerkId || kycVerification.email) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this verification'
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      data: kycVerification
    });
  } catch (error) {
    logger.error(`Error fetching KYC verification: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Check if a PAN number already exists and is verified in the system
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkPANExists = async (req, res) => {
  try {
    const { pan } = req.params;
    
    if (!pan) {
      return res.status(400).json({
        success: false,
        error: 'PAN number is required'
      });
    }
    
    // Check if this PAN is already verified by any user
    const userWithPan = await User.findOne({ 'kycStatus.panNumber': pan, 'kycStatus.isVerified': true });
    
    // Also check if there's a successful verification record for this PAN
    const kycVerification = await KycVerification.findOne({ pan, status: 'success' })
      .sort({ createdAt: -1 }) // Get the most recent one
      .limit(1);
    
    if (userWithPan || (kycVerification && kycVerification.status === 'success')) {
      // PAN exists and is verified
      return res.status(200).json({
        success: true,
        exists: true,
        isVerified: true,
        message: 'This PAN number has already been verified in our system',
        // Include minimal user info if available
        user: userWithPan ? {
          id: userWithPan._id,
          email: userWithPan.email,
          verifiedAt: userWithPan.kycStatus.verifiedAt
        } : null,
        // Include verification info if available
        verification: kycVerification ? {
          id: kycVerification._id,
          createdAt: kycVerification.createdAt
        } : null
      });
    } else {
      // Check if there's a failed verification record for this PAN
      const failedVerification = await KycVerification.findOne({ pan, status: 'failed' })
        .sort({ createdAt: -1 }) // Get the most recent one
        .limit(1);
      
      if (failedVerification) {
        return res.status(200).json({
          success: true,
          exists: true,
          isVerified: false,
          message: 'This PAN number has been submitted before but verification failed',
          verification: {
            id: failedVerification._id,
            createdAt: failedVerification.createdAt
          }
        });
      } else {
        // PAN doesn't exist in our system
        return res.status(200).json({
          success: true,
          exists: false,
          isVerified: false,
          message: 'This PAN number has not been verified in our system'
        });
      }
    }
  } catch (error) {
    logger.error(`Error checking PAN existence: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Bypass KYC verification for testing purposes
 * Creates a fake verification record without calling external API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.bypassKYC = async (req, res) => {
  try {
    // Get user from authenticated request
    const userId = req.user?.id;
    const clerkId = req.user?.clerkId;
    const userEmail = req.user?.email;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    logger.info(`KYC Bypass Request for user: ${userId}`);
    
    // Check if user already has a verified KYC
    const existingVerification = await KycVerification.findOne({
      $or: [
        { user: userId },
        { clerkId: clerkId },
        { email: userEmail }
      ],
      status: 'success'
    });
    
    if (existingVerification) {
      logger.info(`User ${userId} already has verified KYC`);
      
      // Update user's KYC status
      const user = await User.findById(userId);
      if (user && !user.kycStatus?.isVerified) {
        user.kycStatus = {
          isVerified: true,
          verifiedAt: existingVerification.createdAt,
          panNumber: existingVerification.pan,
          fullName: existingVerification.fullName || user.name,
          dob: existingVerification.dob,
          fatherName: existingVerification.fatherName,
          gender: existingVerification.gender
        };
        await user.save();
      }
      
      return res.status(200).json({
        success: true,
        message: 'KYC already verified',
        isAlreadyVerified: true,
        data: existingVerification
      });
    }
    
    // Create a test KYC verification record
    const testPAN = 'AAAAA0000A'; // Test PAN number
    const testData = {
      fullName: req.user?.name || 'Test User',
      dob: '1990-01-01',
      fatherName: 'Test Father',
      gender: 'M'
    };
    
    // Create KYC verification record
    const kycVerification = new KycVerification({
      user: userId,
      clerkId: clerkId,
      email: userEmail,
      pan: testPAN,
      dob: testData.dob,
      fullName: testData.fullName,
      fatherName: testData.fatherName,
      gender: testData.gender,
      status: 'success',
      method: 'bypass',
      response: {
        message: 'KYC bypassed for testing',
        bypass: true
      }
    });
    
    await kycVerification.save();
    logger.info(`Test KYC verification created for user ${userId}`);
    
    // Update user's KYC status
    const user = await User.findById(userId);
    if (user) {
      user.kycStatus = {
        isVerified: true,
        verifiedAt: new Date(),
        panNumber: testPAN,
        fullName: testData.fullName,
        dob: testData.dob,
        fatherName: testData.fatherName,
        gender: testData.gender
      };
      await user.save();
      logger.info(`User ${userId} KYC status updated`);
    }
    
    return res.status(200).json({
      success: true,
      message: 'KYC verification bypassed successfully',
      data: testData,
      verificationId: kycVerification._id
    });
    
  } catch (error) {
    logger.error(`Error bypassing KYC: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
