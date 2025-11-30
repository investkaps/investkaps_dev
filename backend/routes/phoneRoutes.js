const express = require('express');
const router = express.Router();
const phoneController = require('../controllers/phoneController');
const { verifyToken } = require('../middleware/auth');

// Send OTP to phone number - requires authentication
router.post('/send-otp', verifyToken, phoneController.sendOTP);

// Verify OTP - requires authentication
router.post('/verify-otp', verifyToken, phoneController.verifyOTP);

// Check phone verification status - requires authentication
router.get('/status', verifyToken, phoneController.checkPhoneStatus);

module.exports = router;
