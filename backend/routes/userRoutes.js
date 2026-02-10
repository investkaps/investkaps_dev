import express from 'express';
const router = express.Router();
import * as userController from '../controllers/userController.js';
import { verifyToken, handleWebhook  } from '../middleware/auth.js';

// Create or update user from Clerk webhook
router.post('/webhook', handleWebhook, userController.createOrUpdateUser);

// Manual user creation route (for when webhook doesn't work)
// Using a simplified auth check that doesn't require user to exist in DB
router.post('/create', async (req, res, next) => {
  try {
    console.log('🟡 Backend: /users/create endpoint called');
    console.log('🟡 Backend: Request headers:', req.headers);
    
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('🟡 Backend: Token extracted:', !!token);
    
    if (!token) {
      console.log('❌ Backend: No token provided in request');
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    // Extract user ID from token without full verification
    let clerkId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      clerkId = payload.sub;
      console.log('🟡 Backend: Extracted clerkId from token:', clerkId);
    } catch (err) {
      console.log('❌ Backend: Failed to parse token:', err.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }
    
    // Add clerkId to request for the controller
    req.clerkId = clerkId;
    console.log('🟡 Backend: Proceeding to userController.createUser');
    next();
  } catch (error) {
    console.error('❌ Backend: Error in user creation middleware:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}, userController.createUser);

// Get user by Clerk ID
router.get('/clerk/:clerkId', verifyToken, userController.getUserById);

// Get user by email
router.get('/email/:email', verifyToken, userController.getUserProfile);

// Update user profile
router.put('/:clerkId/profile', verifyToken, userController.updateUserProfile);

// Update user KYC status by clerkId
router.put('/clerk/:clerkId/kyc', verifyToken, userController.updateUserKYC);

// Update user KYC status by email
router.put('/email/:email/kyc', verifyToken, userController.updateUserKYCByEmail);

// Get user KYC status by clerkId
router.get('/clerk/:clerkId/kyc', verifyToken, userController.getUserKYCStatus);

// Get user KYC status by email
router.get('/email/:email/kyc', verifyToken, userController.getUserKYCStatusByEmail);

// Get user KYC verification history by clerkId
router.get('/clerk/:clerkId/kyc/history', verifyToken, userController.getUserKYCHistory);

// Get user KYC verification history by email
router.get('/email/:email/kyc/history', verifyToken, userController.getUserKYCHistoryByEmail);

export default router;
