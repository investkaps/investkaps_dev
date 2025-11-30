const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, handleWebhook } = require('../middleware/auth');

// Create or update user from Clerk webhook
router.post('/webhook', handleWebhook, userController.createOrUpdateUser);

// Manual user creation route (for when webhook doesn't work)
// Using a simplified auth check that doesn't require user to exist in DB
router.post('/create', async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
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
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }
    
    // Add clerkId to request for the controller
    req.clerkId = clerkId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}, userController.createUser);

// Get user by Clerk ID
router.get('/clerk/:clerkId', verifyToken, userController.getUserByClerkId);

// Get user by email
router.get('/email/:email', verifyToken, userController.getUserByEmail);

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

module.exports = router;
