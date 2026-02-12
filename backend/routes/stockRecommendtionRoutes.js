import express from 'express';
const router = express.Router();
import * as stockRecommendationController from '../controllers/stockRecommendationController.js';
import { authenticateToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';

// Base route: /api/recommendations

// Public routes - None

// Protected routes for regular users
router.get('/user', authenticateToken, stockRecommendationController.getUserRecommendations);

// Admin-only routes
router.post('/', authenticateToken, checkRole('admin'), stockRecommendationController.createRecommendation);
router.get('/', authenticateToken, checkRole('admin'), stockRecommendationController.getAllRecommendations);
router.get('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.getRecommendation);
router.put('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.updateRecommendation);
router.delete('/:id', authenticateToken, checkRole('admin'), stockRecommendationController.deleteRecommendation);
router.post('/:id/send', authenticateToken, checkRole('admin'), stockRecommendationController.sendRecommendation);
router.post('/:id/generate-pdf', authenticateToken, checkRole('admin'), stockRecommendationController.generatePDFReport);

export default router;
