import express from 'express';
const router = express.Router();
import * as phoneController from '../controllers/phoneController.js';
import { verifyToken  } from '../middleware/auth.js';

// Send OTP to phone number - requires authentication
router.post('/send-otp', verifyToken, phoneController.sendOTP);

// Verify OTP - requires authentication
router.post('/verify-otp', verifyToken, phoneController.verifyOTP);

// Check phone verification status - requires authentication
router.get('/status', verifyToken, phoneController.checkPhoneStatus);

// Pre-check: does a phone number already exist in DB? (used for real-time input validation)
router.get('/check/:phone', verifyToken, phoneController.checkPhoneExists);

export default router;
