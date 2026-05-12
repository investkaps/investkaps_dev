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
import symbolRoutes from './routes/symbolRoutes.js';
import ltpRoutes from './routes/ltpRoutes.js';
import questionnaireRoutes from './routes/questionnaireRoutes.js';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───
const allowedOrigins = [
  'http://localhost:5173',
  'https://investkaps.com',
  'https://www.investkaps.com'
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
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
  limit: '1mb',  // Reduced from 50mb; prevents JSON-bomb attacks while allowing esign PDF base64
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
app.use('/api/symbols', symbolRoutes);
app.use('/api/ltp', ltpRoutes);
app.use('/api/questionnaire', questionnaireRoutes);

// ─── Ensure directories exist ───
for (const dir of ['uploads', 'logs']) {
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
});
