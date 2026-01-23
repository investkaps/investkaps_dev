import express from 'express';
const router = express.Router();
import { verifyToken  } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

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

export default router;
