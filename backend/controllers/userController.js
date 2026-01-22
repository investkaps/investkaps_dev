import User from '../model/User.js';
import UserSubscription from '../model/UserSubscription.js';

/**
 * Create a new user manually
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createUser = async (req, res) => {
  try {
    const { clerkId: bodyClerkId, email, name, isVerified } = req.body;
    
    // Use clerkId from token if not provided in body
    const clerkId = bodyClerkId || req.clerkId;
    
    if (!clerkId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Clerk ID and email are required'
      });
    }
    
    // Check if user already exists
    let user = await User.findOne({ clerkId });
    
    if (user) {
      console.log(`User already exists with clerkId: ${clerkId}`);
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        user
      });
    }
    
    console.log(`Creating new user with clerkId: ${clerkId}, email: ${email}`);
    
    // Create new user
    user = new User({
      clerkId,
      email,
      name: name || email.split('@')[0],
      isVerified: isVerified || false
    });
    
    await user.save();
    
    console.log(`User created successfully: ${user._id}`);
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Create or update a user from Clerk webhook data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createOrUpdateUser = async (req, res) => {
  try {
    const { id, email_addresses, first_name, last_name } = req.body.data;
    
    // Extract primary email
    const primaryEmail = email_addresses.find(email => email.id === req.body.data.primary_email_address_id);
    
    if (!primaryEmail) {
      return res.status(400).json({ success: false, error: 'No primary email found' });
    }
    
    // Check if user exists
    let user = await User.findOne({ clerkId: id });
    
    if (user) {
      // Update existing user
      user.email = primaryEmail.email_address;
      user.name = `${first_name || ''} ${last_name || ''}`.trim();
      user.isVerified = primaryEmail.verification?.status === 'verified';
      
      await user.save();
      
      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        user
      });
    } else {
      // Create new user
      user = new User({
        clerkId: id,
        email: primaryEmail.email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim() || primaryEmail.email_address.split('@')[0],
        isVerified: primaryEmail.verification?.status === 'verified'
      });
      
      await user.save();
      
      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        user
      });
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get user by Clerk ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserById = async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    if (!clerkId) {
      return res.status(400).json({
        success: false,
        error: 'Clerk ID is required'
      });
    }
    
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Fetch user subscriptions
    const userSubscriptions = await UserSubscription.find({ user: user._id })
      .populate('subscription', 'name packageCode description')
      .sort({ createdAt: -1 });
    
    // Add subscriptions to user object
    const userWithSubscriptions = {
      ...user.toObject(),
      userSubscriptions
    };
    
    return res.status(200).json({
      success: true,
      user: userWithSubscriptions
    });
  } catch (error) {
    console.error('Error getting user by clerkId:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get user by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserProfile = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Fetch user subscriptions
    const userSubscriptions = await UserSubscription.find({ user: user._id })
      .populate('subscription', 'name packageCode description')
      .sort({ createdAt: -1 });
    
    // Add subscriptions to user object
    const userWithSubscriptions = {
      ...user.toObject(),
      userSubscriptions
    };
    
    return res.status(200).json({
      success: true,
      user: userWithSubscriptions
    });
  } catch (error) {
    console.error('Error getting user by email:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { name, profile } = req.body;
    
    if (!clerkId) {
      return res.status(400).json({
        success: false,
        error: 'Clerk ID is required'
      });
    }
    
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update user fields
    if (name) user.name = name;
    
    // Update profile fields if provided
    if (profile) {
      user.profile = {
        ...user.profile,
        ...profile
      };
    }
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Update user KYC status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserKYC = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { panNumber, aadhaarNumber, isVerified } = req.body;
    
    if (!clerkId) {
      return res.status(400).json({
        success: false,
        error: 'Clerk ID is required'
      });
    }
    
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update KYC fields
    user.kycStatus = {
      ...user.kycStatus,
      panNumber: panNumber || user.kycStatus.panNumber,
      aadhaarNumber: aadhaarNumber || user.kycStatus.aadhaarNumber,
      isVerified: isVerified !== undefined ? isVerified : user.kycStatus.isVerified,
      verifiedAt: isVerified ? new Date() : user.kycStatus.verifiedAt
    };
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User KYC updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user KYC:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get user KYC status and data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserKYCStatus = async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    if (!clerkId) {
      return res.status(400).json({
        success: false,
        error: 'Clerk ID is required'
      });
    }
    
    const user = await User.findOne({ clerkId })
      .populate('kycStatus.latestVerification');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      kycStatus: user.kycStatus,
      isVerified: user.kycStatus.isVerified
    });
  } catch (error) {
    console.error('Error getting user KYC status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get user KYC verification history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserKYCHistory = async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    if (!clerkId) {
      return res.status(400).json({
        success: false,
        error: 'Clerk ID is required'
      });
    }
    
    const user = await User.findOne({ clerkId })
      .populate('kycVerifications');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      kycVerifications: user.kycVerifications || []
    });
  } catch (error) {
    console.error('Error getting user KYC history:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get user KYC history by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserKYCHistoryByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('kycVerifications');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      kycVerifications: user.kycVerifications || []
    });
  } catch (error) {
    console.error('Error getting user KYC history by email:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get user KYC status by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserKYCStatusByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('kycStatus.latestVerification');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      kycStatus: user.kycStatus,
      isVerified: user.kycStatus.isVerified
    });
  } catch (error) {
    console.error('Error getting user KYC status by email:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Update user KYC status by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateUserKYCByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const { panNumber, aadhaarNumber, isVerified } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update KYC fields
    user.kycStatus = {
      ...user.kycStatus,
      panNumber: panNumber || user.kycStatus?.panNumber,
      aadhaarNumber: aadhaarNumber || user.kycStatus?.aadhaarNumber,
      isVerified: isVerified !== undefined ? isVerified : user.kycStatus?.isVerified,
      verifiedAt: isVerified ? new Date() : user.kycStatus?.verifiedAt
    };
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User KYC updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user KYC by email:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
