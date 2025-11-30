const User = require('../model/User');
const axios = require('axios');
const logger = require('../utils/logger');

// In-memory store (prod: use Redis)
const otpSessions = new Map();
/*
otpSessions.set('91<phone>', {
  lastSentAt: ms,
  otpExpiresAt: ms,
  attempts: number
})
*/

// 🔒 Hardcoded OTP behavior
const RESEND_COOLDOWN_MS = 60_000;   // 60 seconds cooldown between OTP requests
const OTP_TTL_MS = 10 * 60_000;      // 10 minutes expiry time
const MAX_VERIFY_ATTEMPTS = 3;       // 3 attempts per OTP

const keyForPhone = (tenDigitPhone) => `91${tenDigitPhone}`;

/**
 * Send OTP to phone number (AUTOGEN2 for sandbox, AUTOGEN for production)
 */
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Please enter 10 digits.'
      });
    }

    // 🔍 Check if phone number already exists in database (indexed query for speed)
    const existingUser = await User.findOne({ 'profile.phone': phone }).lean();
    if (existingUser && existingUser.profile?.phoneVerified) {
      return res.status(409).json({
        success: false,
        error: 'This phone number is already registered and verified.'
      });
    }

    const phoneWithCode = keyForPhone(phone);
    const apiKey = process.env.TWOFACTOR_API_KEY;

    if (!apiKey || apiKey === 'your_2factor_api_key_here') {
      return res.status(500).json({
        success: false,
        error: 'OTP service not configured. Please contact administrator.'
      });
    }

    // 🕒 Enforce resend cooldown
    const existing = otpSessions.get(phoneWithCode);
    const now = Date.now();
    if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
      const waitMs = RESEND_COOLDOWN_MS - (now - existing.lastSentAt);
      const waitSec = Math.ceil(waitMs / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSec}s before requesting another OTP.`
      });
    }

    // Use AUTOGEN3 with custom OTP template (OTP1)
    // 2Factor service is properly configured with custom SMS template
    const otpTemplate = 'OTP1';
    const sendUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${encodeURIComponent(phoneWithCode)}/AUTOGEN3/${otpTemplate}`;

    logger.info(`Sending OTP to: ${phoneWithCode}`);
    logger.info(`API URL: ${sendUrl}`);

    const response = await axios.get(sendUrl);
    logger.info(`2Factor API Response: ${JSON.stringify(response.data)}`);

    if (response.data.Status === 'Success') {
      otpSessions.set(phoneWithCode, {
        lastSentAt: now,
        otpExpiresAt: now + OTP_TTL_MS,
        attempts: 0
      });

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });
    }

    logger.error(`Failed to send OTP. Status: ${response.data.Status}`);
    return res.status(400).json({
      success: false,
      error: 'Failed to send OTP. Please try again.'
    });

  } catch (apiError) {
    logger.error(`2Factor API error: ${JSON.stringify(apiError.response?.data) || apiError.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to send OTP. Please try again later.'
    });
  }
};

/**
 * Verify OTP (phone-based VERIFY3)
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Please enter 10 digits.'
      });
    }

    // Validate OTP format (4 digits for AUTOGEN3)
    if (!/^\d{4}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP format. Please enter 4 digits.'
      });
    }

    const phoneWithCode = keyForPhone(phone);
    const state = otpSessions.get(phoneWithCode);

    // 🔒 Expiry check
    if (!state || Date.now() > state.otpExpiresAt) {
      otpSessions.delete(phoneWithCode);
      return res.status(400).json({
        success: false,
        error: 'OTP expired. Please request a new OTP.'
      });
    }

    // 🔒 Attempts check
    if (state.attempts >= MAX_VERIFY_ATTEMPTS) {
      otpSessions.delete(phoneWithCode);
      return res.status(400).json({
        success: false,
        error: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    const apiKey = process.env.TWOFACTOR_API_KEY;
    const verifyUrl = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY3/${encodeURIComponent(phoneWithCode)}/${encodeURIComponent(String(otp))}`;

    logger.info(`Verifying OTP (phone-based): ${phoneWithCode}`);
    logger.info(`Verify URL: ${verifyUrl}`);

    const response = await axios.get(verifyUrl);
    logger.info(`2Factor Verify Response: ${JSON.stringify(response.data)}`);
    logger.info(`Response Status: ${response.data.Status}, Details: ${response.data.Details}`);

    // 2Factor returns Status: Success with a session ID in Details when OTP is correct
    // For VERIFY3 endpoint, we just check if Status is Success
    if (response.data.Status === 'Success') {
      otpSessions.delete(phoneWithCode);
      logger.info(`✅ OTP verification successful for ${phoneWithCode}`);

      // Optional: update user record if logged in
      if (req.user) {
        const user = await User.findById(req.user._id);
        if (user) {
          user.profile.phone = phone;
          user.profile.phoneVerified = true;
          await user.save();

          logger.info(`User phone updated in DB: ${user.profile.phone}`);
          return res.status(200).json({
            success: true,
            message: 'Phone number verified successfully',
            user: {
              phone: user.profile.phone,
              phoneVerified: user.profile.phoneVerified
            }
          });
        }
      }

      // Generic success response (UI unchanged)
      logger.info(`Returning success response to frontend`);
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        verified: true
      });
    }

    // ❌ Invalid OTP
    logger.warn(`❌ OTP verification failed - Status: ${response.data.Status}, Details: ${response.data.Details}`);
    state.attempts += 1;
    otpSessions.set(phoneWithCode, state);

    return res.status(400).json({
      success: false,
      error: 'Invalid OTP. Please try again.',
      attemptsLeft: Math.max(0, MAX_VERIFY_ATTEMPTS - state.attempts)
    });

  } catch (apiError) {
    logger.error(`2Factor verify error: ${JSON.stringify(apiError.response?.data) || apiError.message}`);

    const phoneWithCode = keyForPhone(req.body?.phone || '');
    const state = otpSessions.get(phoneWithCode);
    if (state) {
      state.attempts += 1;
      otpSessions.set(phoneWithCode, state);
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid OTP. Please try again.'
    });
  }
};

/**
 * Check if phone number is verified
 */
exports.checkPhoneStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      phone: user.profile.phone,
      phoneVerified: user.profile.phoneVerified || false
    });
  } catch (error) {
    logger.error(`Check phone status error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
