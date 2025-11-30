const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');
const User = require('../model/User');
const KycVerification = require('../model/KycVerification');
const Document = require('../model/Document');
const UserSubscription = require('../model/UserSubscription');
const adminRoleController = require('../controllers/adminRoleController');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin only)
 */
router.get('/dashboard', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    // Get counts for dashboard
    const userCount = await User.countDocuments({ role: 'customer' });
    const kycCount = await KycVerification.countDocuments({ status: 'success' });
    const documentCount = await Document.countDocuments();
    
    // Get recent users
    const recentUsers = await User.find({ role: 'customer' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt kycStatus.isVerified');
    
    // Get recent KYC verifications
    const recentKyc = await KycVerification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');
    
    return res.status(200).json({
      success: true,
      data: {
        counts: {
          users: userCount,
          kyc: kycCount,
          documents: documentCount
        },
        recentUsers,
        recentKyc
      }
    });
  } catch (error) {
    console.error('Error getting admin dashboard data:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/users', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('-__v');
    
    // Add active subscription flag to each user
    const usersWithSubscriptionStatus = await Promise.all(
      users.map(async (user) => {
        const activeSubscription = await UserSubscription.findOne({
          user: user._id,
          status: 'active',
          endDate: { $gt: new Date() }
        });
        
        return {
          ...user.toObject(),
          hasActiveSubscription: !!activeSubscription
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      count: usersWithSubscriptionStatus.length,
      data: usersWithSubscriptionStatus
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/users/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Manually fetch related data (only for this specific user)
    const kycVerifications = await KycVerification.find({ 
      $or: [
        { user: user._id },
        { email: user.email, user: { $exists: false } }, // Legacy records without user reference
        { clerkId: user.clerkId, user: { $exists: false } } // Legacy records by clerkId
      ]
    }).sort({ createdAt: -1 });
    
    const documents = await Document.find({ user: user._id }).sort({ createdAt: -1 });
    
    // Fetch user subscriptions
    const userSubscriptions = await UserSubscription.find({ user: user._id })
      .populate('subscription', 'name packageCode description')
      .sort({ createdAt: -1 });
    
    // Add related data to user object
    const userWithRelations = {
      ...user.toObject(),
      kycVerifications,
      documents,
      userSubscriptions,
      investments: [] // Add investments if you have an Investment model
    };
    
    return res.status(200).json({
      success: true,
      data: userWithRelations
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put('/users/:id/role', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['customer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    user.role = role;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/kyc
 * @desc    Get all KYC verifications
 * @access  Private (Admin only)
 */
router.get('/kyc', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const kycVerifications = await KycVerification.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');
    
    return res.status(200).json({
      success: true,
      count: kycVerifications.length,
      data: kycVerifications
    });
  } catch (error) {
    console.error('Error getting KYC verifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});


/**
 * @route   GET /api/admin/set-admin/:email
 * @desc    Set a user as admin by their email address
 * @access  Public (for initial setup only)
 */
router.get('/set-admin/:email', adminRoleController.setAdminByEmail);

module.exports = router;
