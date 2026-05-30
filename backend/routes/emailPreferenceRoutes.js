import express from 'express';
import User from '../model/User.js';
import logger from '../utils/logger.js';
import { markEmailUnsubscribed, verifyUnsubscribeToken } from '../services/emailPreferenceService.js';

const router = express.Router();

router.get('/unsubscribe', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const payload = verifyUnsubscribeToken(token);

    const wantsJson = String(req.headers.accept || '').includes('application/json') || String(req.query.format || '').toLowerCase() === 'json';

    const respond = (statusCode, body) => {
      if (wantsJson) {
        return res.status(statusCode).json(body);
      }

      return res.status(statusCode).send(body.html);
    };

    if (!payload) {
      return respond(400, {
        success: false,
        message: 'This unsubscribe link is invalid or has been tampered with.',
        html: `
          <html>
            <head><title>Invalid unsubscribe link</title></head>
            <body style="font-family:Arial,sans-serif;padding:40px;max-width:640px;margin:0 auto;">
              <h2>Invalid unsubscribe link</h2>
              <p>This unsubscribe link is invalid or has been tampered with.</p>
            </body>
          </html>
        `
      });
    }

    const user = await User.findOne({ email: payload.email }).select('_id email name');
    await markEmailUnsubscribed({
      email: payload.email,
      userId: user?._id || null,
      reason: 'email_footer_link'
    });

    logger.info(`Email unsubscribe recorded for ${payload.email}`);

    return respond(200, {
      success: true,
      message: `${payload.email} will no longer receive standard InvestKaps emails.`,
      html: `
        <html>
          <head><title>Unsubscribed</title></head>
          <body style="font-family:Arial,sans-serif;padding:40px;max-width:640px;margin:0 auto;">
            <h2>You have been unsubscribed</h2>
            <p>${payload.email} will no longer receive standard InvestKaps emails.</p>
            <p>You can close this page now.</p>
          </body>
        </html>
      `
    });
  } catch (error) {
    logger.error('Unsubscribe processing error:', error);
    const wantsJson = String(req.headers.accept || '').includes('application/json') || String(req.query.format || '').toLowerCase() === 'json';
    const failureBody = {
      success: false,
      message: 'Please try again later.',
      html: `
        <html>
          <head><title>Unsubscribe failed</title></head>
          <body style="font-family:Arial,sans-serif;padding:40px;max-width:640px;margin:0 auto;">
            <h2>Unable to process unsubscribe request</h2>
            <p>Please try again later.</p>
          </body>
        </html>
      `
    };

    if (wantsJson) {
      return res.status(500).json(failureBody);
    }

    return res.status(500).send(failureBody.html);
  }
});

export default router;
