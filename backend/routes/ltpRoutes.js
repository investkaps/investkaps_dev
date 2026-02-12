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

router.get('/single', verifyToken, getSinglePrice);
router.post('/batch', verifyToken, getBatchPrices);
router.post('/multi', verifyToken, getMultiExchangePrices);
router.post('/smart', verifyToken, smartFetchPrices);
router.post('/recommendations', verifyToken, getRecommendationPrices);

export default router;
