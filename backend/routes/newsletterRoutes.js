const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleAuth');

router.post('/subscribe', newsletterController.subscribe);

router.post('/unsubscribe', newsletterController.unsubscribe);

router.get('/subscribers', requireAuth, requireRole(['admin']), newsletterController.getAllSubscribers);

module.exports = router;
