import express from 'express';
const router = express.Router();
import * as userController from '../controllers/userController.js';
import { verifyToken, extractTokenOnly, handleWebhook } from '../middleware/auth.js';
import { createUserLimiter } from '../middleware/rateLimiter.js';

// Webhook
router.post('/webhook', handleWebhook, userController.createOrUpdateUser);

// User creation (lightweight auth – user doesn't exist in DB yet)
router.post('/create', createUserLimiter, extractTokenOnly, userController.createUser);

// User lookup
router.get('/clerk/:clerkId', verifyToken, userController.getUserById);
router.get('/email/:email', verifyToken, userController.getUserProfile);

// Profile update
router.put('/:clerkId/profile', verifyToken, userController.updateUserProfile);

// KYC status
router.put('/clerk/:clerkId/kyc', verifyToken, userController.updateUserKYC);
router.put('/email/:email/kyc', verifyToken, userController.updateUserKYCByEmail);
router.get('/clerk/:clerkId/kyc', verifyToken, userController.getUserKYCStatus);
router.get('/email/:email/kyc', verifyToken, userController.getUserKYCStatusByEmail);

// KYC history
router.get('/clerk/:clerkId/kyc/history', verifyToken, userController.getUserKYCHistory);
router.get('/email/:email/kyc/history', verifyToken, userController.getUserKYCHistoryByEmail);

export default router;
