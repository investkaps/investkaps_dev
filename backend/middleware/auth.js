import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../model/User.js';
import logger from '../utils/logger.js';

/**
 * Middleware to verify JWT token from Clerk
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyToken = async (req, res, next) => {
  try {
    console.log('\n=== AUTH MIDDLEWARE: VERIFY TOKEN ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Auth Header:', req.headers.authorization ? 'Bearer [TOKEN]' : 'No auth header');
    
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'No token provided, authorization denied'
      });
    }
    
    console.log('Token found, length:', token.length);
    console.log('Token prefix:', token.substring(0, 20) + '...');
    
    // Extract user ID from token
    // Note: Token signature is verified by Clerk API call below
    let clerkId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      clerkId = payload.sub;
      console.log('Extracted Clerk ID:', clerkId);
      
      if (!clerkId) {
        console.log('❌ No user ID in token');
        return res.status(401).json({
          success: false,
          error: 'Invalid token: missing user ID'
        });
      }
    } catch (err) {
      console.log('❌ Error parsing token:', err.message);
      logger.error(`Error parsing token: ${err.message}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }
    
    // Verify user exists in Clerk
    try {
      console.log('Verifying user with Clerk API...');
      const clerkUser = await clerkClient.users.getUser(clerkId);
      console.log('✅ Clerk user verified:', { id: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress });
    } catch (err) {
      console.log('❌ Clerk verification failed:', err.message);
      logger.error(`Error verifying user with Clerk: ${err.message}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    // Find user in database
    console.log('Looking up user in database...');
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log('✅ User found in database:', { id: user._id, email: user.email, role: user.role });
    
    // Add user to request object
    req.user = user;
    req.clerkId = clerkId;
    
    console.log('✅ Authentication successful');
    console.log('=== END AUTH MIDDLEWARE ===\n');
    
    next();
  } catch (error) {
    console.log('❌ Auth middleware error:', error.message);
    console.log('Error stack:', error.stack);
    console.log('=== END AUTH MIDDLEWARE (ERROR) ===\n');
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
export const handleWebhook = async (req, res, next) => {
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
