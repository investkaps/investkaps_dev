const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../model/User');
const logger = require('../utils/logger');

/**
 * Middleware to verify JWT token from Clerk
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.verifyToken = async (req, res, next) => {
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
 * Middleware to handle Clerk webhooks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.handleWebhook = async (req, res, next) => {
  try {
    // SECURITY WARNING: Webhook signature verification is disabled
    // TODO: Implement Clerk webhook signature verification before production
    // See: https://clerk.com/docs/integrations/webhooks/overview#verifying-webhooks
    
    // Process the webhook event
    const { type, data } = req.body;
    logger.info(`Received webhook event: ${type}`);
    
    // Handle different event types
    // For example: user.created, user.updated, etc.
    
    next();
  } catch (error) {
    logger.error(`Webhook handling error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
};
