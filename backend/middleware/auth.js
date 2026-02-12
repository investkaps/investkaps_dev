import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../model/User.js';
import logger from '../utils/logger.js';

// ─── Helper: extract clerkId from JWT ───
const extractClerkId = (token) => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return payload.sub;
};

/**
 * Full auth middleware – verifies token with Clerk API and loads DB user.
 * Sets req.user (Mongoose doc) and req.clerkId.
 */
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided, authorization denied' });
    }

    let clerkId;
    try {
      clerkId = extractClerkId(token);
      if (!clerkId) {
        return res.status(401).json({ success: false, error: 'Invalid token: missing user ID' });
      }
    } catch (err) {
      logger.error(`Error parsing token: ${err.message}`);
      return res.status(401).json({ success: false, error: 'Invalid token format' });
    }

    // Verify user exists in Clerk
    const clerkUser = await clerkClient.users.getUser(clerkId);
    if (!clerkUser) {
      return res.status(401).json({ success: false, error: 'User not found in Clerk' });
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
 * Lightweight token extraction – only parses the JWT to get clerkId.
 * Does NOT require the user to exist in DB (used for user creation).
 * Sets req.clerkId.
 */
export const extractTokenOnly = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    try {
      req.clerkId = extractClerkId(token);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid token format' });
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
