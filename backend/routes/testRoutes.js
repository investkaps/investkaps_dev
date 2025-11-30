const express = require('express');
const router = express.Router();
const KycVerification = require('../model/KycVerification');

// Test endpoint to check if KYC verification is being saved
router.get('/kyc-verifications', async (req, res) => {
  try {
    // Get the most recent 10 KYC verifications
    const verifications = await KycVerification.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    return res.status(200).json({
      success: true,
      count: verifications.length,
      data: verifications
    });
  } catch (error) {
    console.error('Error fetching KYC verifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
