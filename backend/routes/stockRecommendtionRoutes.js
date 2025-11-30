const express = require('express');
const router = express.Router();
const stockRecommendationController = require('../controllers/stockRecommendationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleAuth');

// Base route: /api/recommendations

// Public routes - None

// Protected routes for regular users
router.get('/user', authenticateToken, stockRecommendationController.getUserRecommendations);
router.post('/refresh-prices', authenticateToken, stockRecommendationController.refreshStockPrices);

// Zerodha API routes (Admin only) - MUST be before /:id routes
router.post('/zerodha/set-token', authenticateToken, checkRole('admin'), stockRecommendationController.setZerodhaToken);
router.get('/zerodha/token-status', authenticateToken, checkRole('admin'), stockRecommendationController.getZerodhaTokenStatus);
router.get('/zerodha/get-price', authenticateToken, checkRole('admin'), stockRecommendationController.getStockPrice);
router.get('/zerodha/search', authenticateToken, checkRole('admin'), stockRecommendationController.searchStocks);

// Admin-only routes
router.post('/', authenticateToken, checkRole('admin'), stockRecommendationController.createRecommendation);
router.get('/', authenticateToken, checkRole('admin'), stockRecommendationController.getAllRecommendations);
router.get('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.getRecommendation);
router.put('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.updateRecommendation);
router.delete('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.deleteRecommendation);
router.post('/:id/send', authenticateToken, checkRole('admin'), stockRecommendationController.sendRecommendation);
router.post('/:id/generate-pdf', authenticateToken, checkRole('admin'), stockRecommendationController.generatePDFReport);

module.exports = router;
