import User from '../model/User.js';
import logger from '../utils/logger.js';

/**
 * Set initial admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const setInitialAdmin = async (req, res) => {
  try {
    const { email, adminSecret } = req.body;
    
    // Validate admin secret from environment variable
    const validSecret = process.env.ADMIN_SECRET;
    if (!validSecret || adminSecret !== validSecret) {
      return res.status(401).json({
        success: false,
        error: 'Invalid admin secret'
      });
    }
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Set user role to admin
    user.role = 'admin';
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User set as admin successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Error setting admin user: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Get current admin status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAdminStatus = async (req, res) => {
  try {
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Count admin users
    const adminUsers = await User.countDocuments({ role: 'admin' });
    
    // Check if current user is admin
    const isAdmin = req.user && req.user.role === 'admin';
    
    return res.status(200).json({
      success: true,
      data: {
        hasAdmins: adminUsers > 0,
        totalUsers,
        adminUsers,
        isAdmin
      }
    });
  } catch (error) {
    logger.error(`Error getting admin status: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
