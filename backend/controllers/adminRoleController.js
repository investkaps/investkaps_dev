import User from '../model/User.js';

/**
 * Set admin role directly by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const setAdminByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
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
    console.error('Error setting admin user:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};
