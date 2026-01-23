import express from 'express';
const router = express.Router();
import * as symbolController from '../controllers/symbolController.js';
import { verifyToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/roleAuth.js';

/**
 * @route   GET /api/symbols/search
 * @desc    Search symbols by query
 * @access  Private (Admin only)
 */
router.get('/search', verifyToken, checkRole(['admin']), symbolController.searchSymbols);

/**
 * @route   GET /api/symbols
 * @desc    Get all symbols with pagination
 * @access  Private (Admin only)
 */
router.get('/', verifyToken, checkRole(['admin']), symbolController.getAllSymbols);

/**
 * @route   POST /api/symbols/reload
 * @desc    Reload symbols cache
 * @access  Private (Admin only)
 */
router.post('/reload', verifyToken, checkRole(['admin']), symbolController.reloadSymbols);

export default router;
