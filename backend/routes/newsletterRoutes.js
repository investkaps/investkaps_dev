import express from 'express';
const router = express.Router();
import * as newsletterController from '../controllers/newsletterController.js';
import { authenticateToken  } from '../middleware/authMiddleware.js';
import { checkRole  } from '../middleware/roleAuth.js';

router.post('/subscribe', newsletterController.subscribe);

router.post('/unsubscribe', newsletterController.unsubscribe);

router.get('/subscribers', authenticateToken, checkRole('admin'), newsletterController.getAllSubscribers);

export default router;
