import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../model/User.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate JWT token from Clerk
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided, authorization denied'
      });
    }
    
    // Extract user ID from token
    // Note: Token signature is verified by Clerk API call below
    let clerkId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      clerkId = payload.sub;
      
      if (!clerkId) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token: missing user ID'
        });
      }
    } catch (err) {
      logger.error(`Error parsing token: ${err.message}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }
    
    // Verify user exists in Clerk
    try {
      await clerkClient.users.getUser(clerkId);
    } catch (err) {
      logger.error(`Error verifying user with Clerk: ${err.message}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    // Find user in database
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Add user to request object
    req.user = user;
    req.clerkId = clerkId;
    
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(401).json({
      success: false,
      error: 'Token is not valid'
    });
  }
};

/**
 * Helper function to validate if a user is an admin
 * @param {Object} req - Express request object
 * @returns {Boolean} - True if user is admin, false otherwise
 */
export const validateAdmin = async (req) => {
  try {
    // If req.user is already populated by authenticateToken middleware
    if (req.user) {
      return req.user.role === 'admin';
    }
    
    // Otherwise, get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return false;
    }
    
    // Get user ID from token
    let clerkId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      clerkId = payload.sub;
      
      if (!clerkId) {
        return false;
      }
    } catch (err) {
      logger.error(`Error parsing token: ${err.message}`);
      return false;
    }
    
    // Find user in database
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      return false;
    }
    
    // Check if user is admin
    return user.role === 'admin';
  } catch (error) {
    logger.error(`Admin validation error: ${error.message}`);
    return false;
  }
};

/**
 * Middleware to check if user has admin role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const isAdmin = await validateAdmin(req);
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Admin privileges required'
      });
    }
    
    next();
  } catch (error) {
    logger.error(`Admin middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Server error while validating admin privileges'
    });
  }
};
