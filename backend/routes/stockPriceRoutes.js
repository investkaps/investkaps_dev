import express from 'express';
const router = express.Router();
import * as stockPriceController from '../controllers/stockPriceController.js';
import { verifyToken } from '../middleware/auth.js';

/**
 * @route   POST /api/stocks/prices
 * @desc    Fetch and update stock prices from m.Stock
 * @access  Private (requires authentication)
 */
router.post('/prices', verifyToken, stockPriceController.updateStockPrices);

/**
 * @route   GET /api/stocks/prices
 * @desc    Get current stock prices from database
 * @access  Private (requires authentication)
 */
router.get('/prices', verifyToken, stockPriceController.getStockPrices);

export default router;
