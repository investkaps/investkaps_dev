const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

/**
 * @route   POST /api/setup/admin
 * @desc    Set initial admin user
 * @access  Public (with admin secret)
 */
router.post('/admin', adminController.setInitialAdmin);

/**
 * @route   GET /api/setup/admin-status
 * @desc    Get admin status
 * @access  Private
 */
router.get('/admin-status', verifyToken, adminController.getAdminStatus);

module.exports = router;
