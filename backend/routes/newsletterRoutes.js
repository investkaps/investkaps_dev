import express from 'express';
const router = express.Router();
import * as newsletterController from '../controllers/newsletterController.js';
import { authenticateToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';
import { publicFormLimiter } from '../middleware/rateLimiter.js';

router.post('/subscribe', publicFormLimiter, newsletterController.subscribe);

router.post('/unsubscribe', publicFormLimiter, newsletterController.unsubscribe);

router.get('/subscribers', authenticateToken, checkRole('admin'), newsletterController.getAllSubscribers);

export default router;
