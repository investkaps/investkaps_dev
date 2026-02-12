import express from 'express';
const router = express.Router();
import { authenticateToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';
import * as subscriptionService from '../controllers/subscriptionService.js';

// ===== PUBLIC ROUTES =====
// Get all active subscription plans
router.get('/plans', subscriptionService.getAllSubscriptions);
// Get subscription plan by ID
router.get('/plans/:id', subscriptionService.getSubscriptionById);

// ===== USER ROUTES (PROTECTED) =====
// Get user's subscriptions
router.get('/user/:userId', authenticateToken, subscriptionService.getUserSubscriptions);
// Get user's active subscription
router.get('/user/:userId/active', authenticateToken, subscriptionService.getActiveSubscription);
// Cancel a subscription
router.put('/:subscriptionId/cancel', authenticateToken, subscriptionService.cancelSubscription);

// ===== PAYMENT ROUTES (PROTECTED) =====
// Create payment order for subscription
router.post('/payment/order', authenticateToken, subscriptionService.createOrder);
// Verify payment and create subscription
router.post('/payment/verify', authenticateToken, subscriptionService.verifyPayment);
// Create test subscription (bypass payment for testing)
router.post('/payment/test-bypass', authenticateToken, subscriptionService.createTestSubscription);

// ===== ADMIN ROUTES (PROTECTED) =====
// Get all subscription plans (including inactive)
router.get('/admin/plans', authenticateToken, checkRole('admin'), subscriptionService.getAllSubscriptionsAdmin);
// Create new subscription plan
router.post('/plans', authenticateToken, checkRole('admin'), subscriptionService.createSubscription);
// Update subscription plan
router.put('/plans/:id', authenticateToken, checkRole('admin'), subscriptionService.updateSubscription);
// Delete subscription plan
router.delete('/plans/:id', authenticateToken, checkRole('admin'), subscriptionService.deleteSubscription);
// Toggle subscription plan status
router.patch('/plans/:id/toggle', authenticateToken, checkRole('admin'), subscriptionService.toggleSubscriptionStatus);

// Strategy management routes
router.post('/plans/:id/strategies', authenticateToken, checkRole('admin'), subscriptionService.addStrategiesToSubscription);
router.delete('/plans/:id/strategies', authenticateToken, checkRole('admin'), subscriptionService.removeStrategiesFromSubscription);

// Get all user subscriptions (admin)
router.get('/admin/users', authenticateToken, checkRole('admin'), subscriptionService.getAllUserSubscriptions);
// Get subscription statistics (admin)
router.get('/admin/stats', authenticateToken, checkRole('admin'), subscriptionService.getSubscriptionStats);

export default router;
