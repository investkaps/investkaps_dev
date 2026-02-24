import express from 'express';
const router = express.Router();
import { verifyToken as clerkVerifyToken } from '@clerk/clerk-sdk-node';
import * as kycController from '../controllers/kycController.js';
import { verifyToken } from '../middleware/auth.js';
import { kycLimiter } from '../middleware/rateLimiter.js';
import User from '../model/User.js';
import logger from '../utils/logger.js';

/**
 * optionalAuth – cryptographically verifies the Clerk JWT when a token is
 * present, then loads the DB user.  On failure or absent token passes through
 * anonymously.
 *
 * SECURITY FIX: previously this only called clerkClient.users.getUser(clerkId)
 * which confirms a user *exists* but does NOT verify the JWT signature.  An
 * attacker who knew a real clerkId could forge a token and the check would pass.
 * We now call clerkVerifyToken() which validates the cryptographic signature and
 * token expiry before trusting any payload claim.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    // Cryptographically verify signature and expiry.
    let payload;
    try {
      payload = await clerkVerifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    } catch {
      return next(); // Invalid/expired token – continue anonymously
    }

    const clerkId = payload?.sub;
    if (!clerkId) return next();

    req.clerkId = clerkId;

    // Load the corresponding DB user (non-blocking – not all callers have a DB record yet)
    const user = await User.findOne({ clerkId });
    if (user) req.user = user;

    next();
  } catch {
    next();
  }
};

// ─── Public (optional auth + rate-limited) ───
// IMPORTANT: optionalAuth must run BEFORE kycLimiter so the rate-limiter's
// keyGenerator can use req.user._id / req.clerkId for per-user buckets.
// If kycLimiter came first those fields would always be undefined and every
// request would fall back to IP-based limiting, collapsing all users behind a
// shared NAT into a single bucket.
router.post('/verify', optionalAuth, kycLimiter, kycController.verifyAndSaveKYC);
router.get('/check-pan/:pan', optionalAuth, kycLimiter, kycController.checkPANExists);

// ─── Protected ───
router.get('/history/clerk/:clerkId', verifyToken, kycController.getKYCHistory);
router.get('/history/email/:email', verifyToken, kycController.getKYCHistory);
router.get('/verification/:id', verifyToken, kycController.getKYCVerification);

export default router;
