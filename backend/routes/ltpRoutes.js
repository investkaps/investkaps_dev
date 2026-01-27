import express from 'express';
import { 
  getSinglePrice, 
  getBatchPrices, 
  getMultiExchangePrices, 
  smartFetchPrices,
  getRecommendationPrices 
} from '../controllers/ltpController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * All LTP routes require authentication
 * This ensures only logged-in users can fetch stock prices
 */

// GET /api/ltp/single?exchange=NSE&symbol=TCS
router.get('/single', (req, res, next) => {
  console.log('\n=== LTP ROUTE: SINGLE PRICE REQUEST ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Route: GET /api/ltp/single');
  console.log('Query:', req.query);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('User after auth:', req.user ? { id: req.user._id, email: req.user.email } : 'Not authenticated');
  console.log('=== END LTP ROUTE: SINGLE PRICE ===\n');
  next();
}, verifyToken, getSinglePrice);

// POST /api/ltp/batch
// Body: { exchange: "NSE", symbols: ["TCS", "RELIANCE"] }
router.post('/batch', (req, res, next) => {
  console.log('\n=== LTP ROUTE: BATCH PRICES REQUEST ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Route: POST /api/ltp/batch');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User after auth:', req.user ? { id: req.user._id, email: req.user.email } : 'Not authenticated');
  console.log('=== END LTP ROUTE: BATCH PRICES ===\n');
  next();
}, verifyToken, getBatchPrices);

// POST /api/ltp/multi
// Body: { items: [{ exchange: "NSE", symbol: "TCS" }] }
router.post('/multi', verifyToken, getMultiExchangePrices);

// POST /api/ltp/smart (recommended - auto-optimizes)
// Body: { items: [{ exchange: "NSE", symbol: "TCS" }] }
router.post('/smart', verifyToken, smartFetchPrices);

// POST /api/ltp/recommendations (for admin panel)
// Body: { recommendations: [{ stockSymbol: "TCS", exchange: "NSE" }] }
router.post('/recommendations', verifyToken, getRecommendationPrices);

export default router;
