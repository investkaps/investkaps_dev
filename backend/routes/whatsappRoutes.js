import express from 'express';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { applyWhatsAppStatusEvent } from '../services/whatsappService.js';

const router = express.Router();

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification handshake.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(String(challenge));
  }

  logger.warn('WhatsApp webhook verification failed', { mode, hasToken: !!token });
  return res.sendStatus(403);
});

const timingSafeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Verify X-Hub-Signature-256 from Meta using WHATSAPP_APP_SECRET.
 */
const verifyMetaSignature = (req) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    logger.error('WHATSAPP_APP_SECRET is not configured');
    return false;
  }

  const signatureHeader = req.get('x-hub-signature-256') || '';
  if (!signatureHeader.startsWith('sha256=')) return false;

  const expected = signatureHeader.slice('sha256='.length);
  const rawBody = req.rawBody;
  if (!rawBody) {
    logger.error('Missing rawBody for WhatsApp webhook signature check');
    return false;
  }

  const computed = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  return timingSafeEqual(expected, computed);
};

/**
 * POST /api/whatsapp/webhook
 * Delivery / read / failed status callbacks from Meta.
 */
router.post('/webhook', async (req, res) => {
  // Always acknowledge quickly after validation so Meta does not retry forever
  // on application errors. Signature must pass before we process.
  try {
    if (!verifyMetaSignature(req)) {
      logger.warn('WhatsApp webhook rejected: invalid signature');
      return res.sendStatus(403);
    }

    // Respond first on signature OK, then process (Meta expects 200 quickly).
    res.sendStatus(200);

    const body = req.body || {};
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value || {};
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const statusEvent of statuses) {
          try {
            const result = await applyWhatsAppStatusEvent(statusEvent);
            if (result.updated) {
              logger.info(`WhatsApp status updated ${result.messageId} → ${result.status}`);
            }
          } catch (err) {
            logger.error('WhatsApp status apply failed:', err.message);
          }
        }
      }
    }
  } catch (error) {
    logger.error('WhatsApp webhook handler error:', error);
    if (!res.headersSent) {
      return res.sendStatus(500);
    }
  }
});

export default router;
