import express from 'express';
const router = express.Router();
import { authenticateToken, requireAdmin  } from '../middleware/authMiddleware.js';
import { getAllSubscriptions,
  getAllSubscriptionsAdmin,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  toggleSubscriptionStatus,
  addStrategiesToSubscription,
  removeStrategiesFromSubscription
 } from '../controllers/subscriptionController.js';

// Public routes
router.get('/', getAllSubscriptions);
router.get('/:id', getSubscriptionById);

// Admin routes (protected)
router.get('/admin/all', authenticateToken, requireAdmin, getAllSubscriptionsAdmin);
router.post('/', authenticateToken, requireAdmin, createSubscription);
router.put('/:id', authenticateToken, requireAdmin, updateSubscription);
router.delete('/:id', authenticateToken, requireAdmin, deleteSubscription);
router.patch('/:id/toggle', authenticateToken, requireAdmin, toggleSubscriptionStatus);

// Strategy management routes
router.post('/:id/strategies', authenticateToken, requireAdmin, addStrategiesToSubscription);
router.delete('/:id/strategies', authenticateToken, requireAdmin, removeStrategiesFromSubscription);

export default router;
