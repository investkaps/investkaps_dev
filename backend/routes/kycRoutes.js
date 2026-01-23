import express from 'express';
const router = express.Router();
import * as kycController from '../controllers/kycController.js';
import { verifyToken  } from '../middleware/auth.js';
import User from '../model/User.js';

// Simplified auth middleware for KYC verification (doesn't require user to exist in DB)
const simpleAuthCheck = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    // If token exists, extract clerkId but don't require authentication
    if (token) {
      try {
        // Extract payload without verification
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        req.clerkId = payload.sub;
        console.log('Extracted clerkId from token:', req.clerkId);
        
        // Try to find user by clerkId
        if (req.clerkId) {
          const user = await User.findOne({ clerkId: req.clerkId });
          if (user) {
            req.user = user;
            console.log('Found user for clerkId:', req.clerkId);
          } else {
            console.log('No user found for clerkId:', req.clerkId);
          }
        }
      } catch (err) {
        // Ignore token parsing errors, just continue without clerkId
        console.warn('Error parsing token:', err);
      }
    } else {
      console.log('No token provided in KYC request');
    }
    
    // Continue regardless of token validity
    next();
  } catch (error) {
    console.error('Error in simpleAuthCheck:', error);
    // Continue without authentication
    next();
  }
};

// Verify KYC - public endpoint with optional authentication
router.post('/verify', simpleAuthCheck, kycController.verifyAndSaveKYC);

// Get KYC history by clerkId - requires authentication
router.get('/history/clerk/:clerkId', verifyToken, kycController.getKYCHistory);

// Get KYC history by email - requires authentication
router.get('/history/email/:email', verifyToken, kycController.getKYCHistory);

// Get specific KYC verification by ID - requires authentication
router.get('/verification/:id', verifyToken, kycController.getKYCVerification);

// Check if a PAN number already exists - public endpoint with optional authentication
router.get('/check-pan/:pan', simpleAuthCheck, kycController.checkPANExists);

// Bypass KYC for testing - requires authentication
router.post('/bypass', verifyToken, kycController.bypassKYC);

export default router;
