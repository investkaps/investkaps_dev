import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

// Load environment variables first, before any other imports that might use them
dotenv.config();

// Now import modules that might use environment variables
import connectDB from './config/db.js';
import logger from './utils/logger.js';

// Import subscriptionService after dotenv loads to ensure env vars are available
import * as subscriptionService from './controllers/subscriptionService.js';
import * as stockRecommendationController from './controllers/stockRecommendationController.js';

// Route imports
import esignRoutes from './routes/esignRoutes.js';
import userRoutes from './routes/userRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import setupRoutes from './routes/setupRoutes.js';
import consolidatedSubscriptionRoutes from './routes/consolidatedSubscriptionRoutes.js';
import strategyRoutes from './routes/strategyRoutes.js';
import stockRecommendationRoutes from './routes/stockRecommendtionRoutes.js';
import testRoutes from './routes/testRoutes.js';
import phoneRoutes from './routes/phoneRoutes.js';
import paymentRequestRoutes from './routes/paymentRequestRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import symbolRoutes from './routes/symbolRoutes.js';
import ltpRoutes from './routes/ltpRoutes.js';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Restrict CORS to frontend origin if provided, otherwise allow all (useful for dev)
app.use(cors({ origin: "*" }));


// Parse JSON requests with increased limit and capture raw body for webhook signature verification
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    // We only save rawBody for the specific webhook endpoint to avoid extra memory use
    if (req.originalUrl === '/api/payment/webhook') {
      req.rawBody = buf;
    }
  }
}));

// Parse URL-encoded requests
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (exclude noisy endpoints)
app.use((req, res, next) => {
  // Skip logging for phone status checks to reduce noise
  if (!req.url.includes('/api/phone/status')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send('InvestKaps KYC API is running');
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// E-Signing routes
app.use('/api', esignRoutes);

// Payment routes are now part of consolidated subscription routes

// User routes
app.use('/api/users', userRoutes);

// KYC routes
app.use('/api/kyc', kycRoutes);

// Phone verification routes
app.use('/api/phone', phoneRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Setup routes
app.use('/api/setup', setupRoutes);

// Test routes (for development only)
app.use('/api/test', testRoutes);

// Consolidated Subscription routes (includes payments and user subscriptions)
app.use('/api/subscriptions', consolidatedSubscriptionRoutes);

// Strategy routes
app.use('/api/strategies', strategyRoutes);

// Stock Recommendation routes
app.use('/api/recommendations', stockRecommendationRoutes);

// Payment Request routes
app.use('/api/payment-requests', paymentRequestRoutes);

// Newsletter routes
app.use('/api/newsletter', newsletterRoutes);


// Symbol search routes
app.use('/api/symbols', symbolRoutes);

// LTP (Last Traded Price) routes
app.use('/api/ltp', ltpRoutes);

// Create directory for uploads if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Start server
app.listen(PORT, () => {
  // Initialize subscription scheduler
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
