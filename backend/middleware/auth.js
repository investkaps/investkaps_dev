import { verifyToken as clerkVerifyToken } from '@clerk/clerk-sdk-node';
import User from '../model/User.js';
import logger from '../utils/logger.js';

/**
 * Full auth middleware – cryptographically verifies the Clerk JWT (signature +
 * expiry) and loads the DB user.  Sets req.user (Mongoose doc) and req.clerkId.
 *
 * SECURITY NOTE: We use clerkVerifyToken() which validates the JWT signature
 * against Clerk's public key.  A previous version only called
 * clerkClient.users.getUser(clerkId) which only checked user existence, not
 * that the caller actually signed the token – a forged JWT with a known clerkId
 * would have passed.
 */
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided, authorization denied' });
    }

    // Cryptographically verify signature and expiry.
    let payload;
    try {
      payload = await clerkVerifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    } catch (err) {
      logger.error(`Token verification failed: ${err.message}`);
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const clerkId = payload?.sub;
    if (!clerkId) {
      return res.status(401).json({ success: false, error: 'Invalid token: missing user ID' });
    }

    // Load DB user
    const dbUser = await User.findOne({ clerkId });
    if (!dbUser) {
      return res.status(401).json({ success: false, error: 'User not found in database' });
    }

    req.user = dbUser;
    req.clerkId = clerkId;
    next();
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

// Backward-compatible alias used by some route files
export const authenticateToken = verifyToken;

/**
 * Lightweight token extraction – cryptographically verifies the JWT but does
 * NOT require the user to exist in DB (used for user creation flow).
 * Sets req.clerkId.
 */
export const extractTokenOnly = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    let payload;
    try {
      payload = await clerkVerifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.clerkId = payload?.sub;
    if (!req.clerkId) {
      return res.status(401).json({ success: false, error: 'Invalid token: missing user ID' });
    }

    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

/**
 * Admin-only middleware – must be used AFTER verifyToken.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied: Admin privileges required' });
  }
  next();
};

/**
 * Middleware to handle Clerk webhooks.
 * TODO: Implement Clerk webhook signature verification before production.
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const { type } = req.body;
    logger.info(`Received webhook event: ${type}`);
    next();
  } catch (error) {
    logger.error(`Webhook handling error: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to process webhook' });
  }
};
