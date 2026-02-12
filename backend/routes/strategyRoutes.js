import express from 'express';
const router = express.Router();
import { check  } from 'express-validator';
import * as strategyController from '../controllers/strategyController.js';
import { authenticateToken, requireAdmin  } from '../middleware/auth.js';

// All strategy routes are protected by admin middleware
router.use(authenticateToken);
router.use(requireAdmin);

// @route   GET /api/strategies
// @desc    Get all strategies
// @access  Admin
router.get('/', strategyController.getAllStrategies);

// @route   GET /api/strategies/:id
// @desc    Get strategy by ID
// @access  Admin
router.get('/:id', strategyController.getStrategyById);

// @route   POST /api/strategies
// @desc    Create new strategy
// @access  Admin
router.post('/', [
  check('strategyCode', 'Strategy code is required').notEmpty(),
  check('name', 'Strategy name is required').notEmpty(),
  check('description', 'Description is required').notEmpty()
], strategyController.createStrategy);

// @route   PUT /api/strategies/:id
// @desc    Update strategy
// @access  Admin
router.put('/:id', [
  check('strategyCode', 'Strategy code is required').notEmpty(),
  check('name', 'Strategy name is required').notEmpty(),
  check('description', 'Description is required').notEmpty()
], strategyController.updateStrategy);

// @route   DELETE /api/strategies/:id
// @desc    Delete strategy
// @access  Admin
router.delete('/:id', strategyController.deleteStrategy);

// @route   PATCH /api/strategies/:id/toggle-status
// @desc    Toggle strategy status (active/inactive)
// @access  Admin
router.patch('/:id/toggle-status', strategyController.toggleStrategyStatus);

// @route   GET /api/strategies/:id/subscriptions
// @desc    Get subscriptions by strategy ID
// @access  Admin
router.get('/:id/subscriptions', strategyController.getSubscriptionsByStrategy);

export default router;
