const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleAuth');

router.post('/subscribe', newsletterController.subscribe);

router.post('/unsubscribe', newsletterController.unsubscribe);

router.get('/subscribers', authenticateToken, checkRole('admin'), newsletterController.getAllSubscribers);

module.exports = router;
