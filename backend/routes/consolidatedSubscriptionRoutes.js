import express from 'express';
const router = express.Router();
import { authenticateToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';
import * as subscriptionService from '../controllers/subscriptionService.js';
import ModelPortfolio from '../model/ModelPortfolio.js';

// ===== PUBLIC ROUTES =====
router.get('/model-portfolios/public', async (_req, res) => {
  try {
    const portfolios = await ModelPortfolio.find({ isActive: true })
      .populate({
        path: 'subscription',
        select: 'name planOptions currency features isActive',
        match: { isActive: true }
      })
      .sort({ displayOrder: 1, createdAt: -1 });
    // populate with match can return null subscription — filter those out
    const filtered = portfolios.filter(p => p.subscription !== null);
    return res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    console.error('Error fetching public model portfolios:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get all active subscription plans
router.get('/plans', subscriptionService.getAllSubscriptions);
// Get subscription plan by ID
router.get('/plans/:id', subscriptionService.getSubscriptionById);

// ===== USER ROUTES (PROTECTED) =====

// Get the model portfolio linked to the user's active subscription
router.get('/my-model-portfolio', authenticateToken, async (req, res) => {
  try {
    const dbUserId = req.user?._id;
    if (!dbUserId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const UserSubscription = (await import('../model/UserSubscription.js')).default;

    // Find all active user subscriptions, then look for a portfolio linked to any of them
    const userSubs = await UserSubscription.find({
      user: dbUserId,
      status: 'active',
      endDate: { $gte: new Date() },
    }).populate('subscription').lean();

    if (!userSubs.length) {
      return res.status(404).json({ success: false, error: 'No active subscription' });
    }

    const subIds = userSubs.map(s => s.subscription?._id).filter(Boolean);

    const portfolio = await ModelPortfolio.findOne({
      subscription: { $in: subIds },
      isActive: true,
    }).lean();

    if (!portfolio) {
      return res.status(404).json({ success: false, error: 'No portfolio found' });
    }

    return res.status(200).json({ success: true, data: portfolio });
  } catch (err) {
    console.error('Error fetching user model portfolio:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

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
