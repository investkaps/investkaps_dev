const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Load environment variables first, before any other imports that might use them
dotenv.config();

// Now import modules that might use environment variables
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const subscriptionService = require('./controllers/subscriptionService');
const stockRecommendationController = require('./controllers/stockRecommendationController');

// Route imports
const esignRoutes = require('./routes/esignRoutes');
const userRoutes = require('./routes/userRoutes');
const kycRoutes = require('./routes/kycRoutes');
const adminRoutes = require('./routes/adminRoutes');
const setupRoutes = require('./routes/setupRoutes');
const consolidatedSubscriptionRoutes = require('./routes/consolidatedSubscriptionRoutes');
const strategyRoutes = require('./routes/strategyRoutes');
const stockRecommendationRoutes = require('./routes/stockRecommendtionRoutes');
const testRoutes = require('./routes/testRoutes');
const phoneRoutes = require('./routes/phoneRoutes');
const paymentRequestRoutes = require('./routes/paymentRequestRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');

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
  logger.info(`Server running on port ${PORT}`);
  logger.info(`E-Signing API available at http://localhost:${PORT}/api/esign`);
  
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

  // Deactivate expired Zerodha tokens daily at 6:00 AM IST
  cron.schedule('0 6 * * *', async () => {
    try {
      logger.info('Running scheduled task: Deactivate expired Zerodha tokens');
      const result = await stockRecommendationController.deactivateExpiredTokens();
      if (result.success && result.deactivated > 0) {
        logger.info(`Deactivated ${result.deactivated} expired Zerodha token(s)`);
      }
    } catch (error) {
      logger.error('Error in token deactivation scheduled task:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // Update stock prices every 15 minutes during market hours (9:15 AM - 3:30 PM IST, Mon-Fri)
  // Runs at :00, :15, :30, :45 of every hour
  cron.schedule('*/15 * * * 1-5', async () => {
    try {
      const now = new Date();
      const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const hours = istTime.getHours();
      const minutes = istTime.getMinutes();
      
      // Only run between 9:15 AM and 3:30 PM IST
      const isMarketHours = (hours === 9 && minutes >= 15) || 
                           (hours >= 10 && hours < 15) || 
                           (hours === 15 && minutes <= 30);
      
      if (isMarketHours) {
        logger.info('Running scheduled task: Update stock prices');
        const result = await stockRecommendationController.updateAllStockPrices();
        if (result.success) {
          logger.info(`Stock price update: ${result.updated} updated, ${result.failed} failed out of ${result.total} total`);
        }
      }
    } catch (error) {
      logger.error('Error in stock price update scheduled task:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
});
