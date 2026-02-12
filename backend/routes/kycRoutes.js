import express from 'express';
const router = express.Router();
import * as kycController from '../controllers/kycController.js';
import { verifyToken } from '../middleware/auth.js';
import User from '../model/User.js';

// Optional auth – extracts clerkId + loads user if possible, but never blocks
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        req.clerkId = payload.sub;
        if (req.clerkId) {
          const user = await User.findOne({ clerkId: req.clerkId });
          if (user) req.user = user;
        }
      } catch {
        // Ignore token parsing errors
      }
    }
    next();
  } catch {
    next();
  }
};

// Public (optional auth)
router.post('/verify', optionalAuth, kycController.verifyAndSaveKYC);
router.get('/check-pan/:pan', optionalAuth, kycController.checkPANExists);

// Protected
router.get('/history/clerk/:clerkId', verifyToken, kycController.getKYCHistory);
router.get('/history/email/:email', verifyToken, kycController.getKYCHistory);
router.get('/verification/:id', verifyToken, kycController.getKYCVerification);
router.post('/bypass', verifyToken, kycController.bypassKYC);

export default router;
