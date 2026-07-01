// Must be the very first import so process.env is populated before any other
// module (rateLimiter, kyc_client, etc.) is evaluated by the ESM loader.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

import connectDB from './config/db.js';
import logger from './utils/logger.js';
import * as subscriptionService from './controllers/subscriptionService.js';
import { globalLimiter } from './middleware/rateLimiter.js';

// Route imports
import esignRoutes from './routes/esignRoutes.js';
import userRoutes from './routes/userRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import setupRoutes from './routes/setupRoutes.js';
import consolidatedSubscriptionRoutes from './routes/consolidatedSubscriptionRoutes.js';
import strategyRoutes from './routes/strategyRoutes.js';
import stockRecommendationRoutes from './routes/stockRecommendtionRoutes.js';
import phoneRoutes from './routes/phoneRoutes.js';
import paymentRequestRoutes from './routes/paymentRequestRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import emailPreferenceRoutes from './routes/emailPreferenceRoutes.js';
import symbolRoutes from './routes/symbolRoutes.js';
import ltpRoutes from './routes/ltpRoutes.js';
import questionnaireRoutes from './routes/questionnaireRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import callRoutes from './routes/callRoutes.js';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Cloud Run sits behind Google Front End / load balancers, so Express must
// trust forwarded headers for correct client IPs and protocol detection.
app.set('trust proxy', 1);

// ─── Middleware ───
const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://investkaps.com',
  'https://www.investkaps.com',
  ...String(process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true
}));
// Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: false, // CSP is handled by the frontend (Vite/React)
}));
app.use(globalLimiter);

// KYC routes get a strict 10kb limit – they only receive { pan, dob }.
// This MUST be registered before the global express.json() so it processes
// the stream first; body-parser skips re-parsing if the body is already consumed.
app.use('/api/kyc', express.json({ limit: '10kb' }));

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (req.originalUrl === '/api/payment/webhook') {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging (skip noisy endpoints)
app.use((req, res, next) => {
  if (!req.url.includes('/api/phone/status') && !req.url.includes('/health')) {
    logger.info(`${req.method} ${req.url}`, { ip: req.ip });
  }
  next();
});

// ─── Health / Root ───
app.get('/', (req, res) => {
  res.send('InvestKaps API is running');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── API Routes ───
app.use('/api', esignRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/phone', phoneRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/subscriptions', consolidatedSubscriptionRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/recommendations', stockRecommendationRoutes);
app.use('/api/payment-requests', paymentRequestRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/email', emailPreferenceRoutes);
app.use('/api/symbols', symbolRoutes);
app.use('/api/ltp', ltpRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/calls', callRoutes);

// ─── Ensure directories exist ───
for (const dir of ['uploads']) {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ─── Start server & cron jobs ───
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Check for expired subscriptions daily at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      logger.info('Running scheduled task: Check expired subscriptions');
      const updatedCount = await subscriptionService.checkExpiredSubscriptions();
      logger.info(`Updated ${updatedCount} expired subscriptions`);
    } catch (error) {
      logger.error('Error in expired subscriptions scheduled task:', error);
    }
  });

  // Send expiration reminders daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Running scheduled task: Send expiration reminders');
      const notifiedCount = await subscriptionService.sendExpirationReminders();
      logger.info(`Sent reminders for ${notifiedCount} expiring subscriptions`);
    } catch (error) {
      logger.error('Error in expiration reminders scheduled task:', error);
    }
  });


  // Check price alerts every 5 minutes on weekdays (market hours check is inside the service)
  cron.schedule('*/5 * * * 1-5', async () => {
    try {
      // Fetch current prices for all published recommendations then check alerts
      const StockRecommendation = (await import('./model/StockRecommendation.js')).default;
      const ltpService = (await import('./services/ltpService.js')).default;

      const recs = await StockRecommendation.find({ status: 'published', isActive: { $ne: false } })
        .select('stockSymbol exchange');

      if (!recs.length) return;

      const prices = await ltpService.fetchRecommendationPrices(
        recs.map(r => ({ stockSymbol: r.stockSymbol, exchange: r.exchange || 'NSE' }))
      );

      // Persist live prices back to each recommendation so currentPrice stays current
      const now = new Date();
      const bulkOps = recs
        .filter(r => prices[r.stockSymbol] != null)
        .map(r => ({
          updateOne: {
            filter: { _id: r._id },
            update: { $set: { currentPrice: prices[r.stockSymbol], lastPriceUpdate: now } }
          }
        }));
      if (bulkOps.length) await StockRecommendation.bulkWrite(bulkOps, { ordered: false });

      const { checkPriceAlerts } = await import('./services/priceAlertService.js');
      await checkPriceAlerts(prices);
    } catch (error) {
      logger.error('Error in price alert scheduled task:', error);
    }
  });
});
