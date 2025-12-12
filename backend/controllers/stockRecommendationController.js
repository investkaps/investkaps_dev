const StockRecommendation = require('../model/StockRecommendation');
const User = require('../model/User');
const UserSubscription = require('../model/UserSubscription');
const ZerodhaToken = require('../model/ZerodhaToken');
const notificationService = require('../utils/notificationService');
const logger = require('../utils/logger');
const zerodhaService = require('../utils/zerodhaService');
const { generateStockReportPDF } = require('../utils/pdfGenerator');
const { uploadPDF, deletePDF } = require('../config/cloudinary');
const { sendRecommendationToTelegram } = require('../services/telegramService');
const Subscription = require('../model/Subscription');

/**
 * Create a new stock recommendation
 * @route POST /api/recommendations
 * @access Admin only
 */
const createRecommendation = async (req, res) => {
  try {
    const {
      title,
      stockSymbol,
      stockName,
      currentPrice,
      targetPrice,
      targetPrice2,
      targetPrice3,
      stopLoss,
      recommendationType,
      timeFrame,
      description,
      rationale,
      riskLevel,
      targetStrategies,
      status,
      expiresAt
    } = req.body;

    // Create new recommendation
    const recommendation = new StockRecommendation({
      title,
      stockSymbol,
      stockName,
      currentPrice,
      targetPrice,
      targetPrice2,
      targetPrice3,
      stopLoss,
      recommendationType,
      timeFrame,
      description,
      rationale,
      riskLevel,
      targetStrategies,
      status,
      expiresAt,
      createdBy: req.user._id,
      ...(status === 'published' && { publishedAt: Date.now() })
    });

    await recommendation.save();

    // If status is published, send notifications
    if (status === 'published') {
      await sendRecommendationToUsers(recommendation._id);
      
      // Send to Telegram - fetch subscriptions that have the target strategies
      try {
        const subscriptions = await Subscription.find({
          strategies: { $in: targetStrategies },
          telegramChatId: { $exists: true, $ne: null, $ne: '' }
        });
        
        for (const subscription of subscriptions) {
          await sendRecommendationToTelegram(recommendation, subscription.telegramChatId);
          logger.info(`Recommendation sent to Telegram chat ${subscription.telegramChatId}: ${recommendation.stockSymbol}`);
        }
      } catch (telegramError) {
        logger.error('Failed to send to Telegram:', telegramError);
        // Don't fail the request if Telegram fails
      }
    }

    res.status(201).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    logger.error('Error creating stock recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Get all stock recommendations
 * @route GET /api/recommendations
 * @access Admin only
 */
const getAllRecommendations = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (status) query.status = status;

    const recommendations = await StockRecommendation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('targetStrategies', 'name strategyCode');

    const total = await StockRecommendation.countDocuments(query);

    res.status(200).json({
      success: true,
      count: recommendations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting stock recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Get a single stock recommendation
 * @route GET /api/recommendations/:id
 * @access Admin only
 */
const getRecommendation = async (req, res) => {
  try {
    const recommendation = await StockRecommendation.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('targetStrategies', 'name strategyCode');

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    logger.error(`Error getting stock recommendation ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Update a stock recommendation
 * @route PUT /api/recommendations/:id
 * @access Admin only
 */
const updateRecommendation = async (req, res) => {
  try {
    const recommendation = await StockRecommendation.findById(req.params.id);

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    // Check if status is changing from draft to published
    const wasPublished = recommendation.status === 'published';
    const willBePublished = req.body.status === 'published' && !wasPublished;

    // Update recommendation
    Object.keys(req.body).forEach(key => {
      recommendation[key] = req.body[key];
    });

    // If publishing, set publishedAt
    if (willBePublished) {
      recommendation.publishedAt = Date.now();
    }

    await recommendation.save();

    // If newly published, send notifications
    if (willBePublished) {
      await sendRecommendationToUsers(recommendation._id);
      
      // Send to Telegram - fetch subscriptions that have the target strategies
      try {
        const subscriptions = await Subscription.find({
          strategies: { $in: recommendation.targetStrategies },
          telegramChatId: { $exists: true, $ne: null, $ne: '' }
        });
        
        for (const subscription of subscriptions) {
          await sendRecommendationToTelegram(recommendation, subscription.telegramChatId);
          logger.info(`Recommendation sent to Telegram chat ${subscription.telegramChatId}: ${recommendation.stockSymbol}`);
        }
      } catch (telegramError) {
        logger.error('Failed to send to Telegram:', telegramError);
        // Don't fail the request if Telegram fails
      }
    }

    res.status(200).json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    logger.error(`Error updating stock recommendation ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Delete a stock recommendation
 * @route DELETE /api/recommendations/:id
 * @access Admin only
 */
const deleteRecommendation = async (req, res) => {
  try {
    const recommendation = await StockRecommendation.findById(req.params.id);

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    await recommendation.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error deleting stock recommendation ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Send a recommendation to users with specific subscriptions
 * @route POST /api/recommendations/:id/send
 * @access Admin only
 */
const sendRecommendation = async (req, res) => {
  try {
    const result = await sendRecommendationToUsers(req.params.id);
    
    res.status(200).json({
      success: true,
      message: `Recommendation sent to ${result.sentCount} users`,
      data: result
    });
  } catch (error) {
    logger.error(`Error sending stock recommendation ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Get recommendations for a specific user
 * @route GET /api/recommendations/user
 * @access Private
 */
const getUserRecommendations = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get user's active subscriptions with strategies
    const userSubscriptions = await UserSubscription.find({
      user: req.user._id,
      status: 'active'
    }).populate({
      path: 'subscription',
      populate: {
        path: 'strategies'
      }
    });
    
    // Extract all strategy IDs and find the earliest subscription start date
    const strategyIds = [];
    let earliestStartDate = null;
    
    userSubscriptions.forEach(sub => {
      if (sub.subscription && sub.subscription.strategies) {
        sub.subscription.strategies.forEach(strategy => {
          strategyIds.push(strategy._id);
        });
      }
      
      // Track the earliest subscription start date
      if (!earliestStartDate || new Date(sub.startDate) < earliestStartDate) {
        earliestStartDate = new Date(sub.startDate);
      }
    });
    
    // Build query to filter recommendations
    const query = {
      status: 'published',
      targetStrategies: { $in: strategyIds }
    };
    
    // Only show recommendations published AFTER the user's subscription started
    if (earliestStartDate) {
      query.publishedAt = { $gte: earliestStartDate };
    }
    
    // Find recommendations targeting these strategies
    const recommendations = await StockRecommendation.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await StockRecommendation.countDocuments(query);
    
    // Mark recommendations as viewed
    for (const recommendation of recommendations) {
      const alreadyViewed = recommendation.viewedBy.some(
        view => view.user.toString() === req.user._id.toString()
      );
      
      if (!alreadyViewed) {
        recommendation.viewedBy.push({
          user: req.user._id,
          viewedAt: Date.now()
        });
        await recommendation.save();
      }
    }
    
    res.status(200).json({
      success: true,
      count: recommendations.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting user recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * Helper function to send recommendation to users
 */
const sendRecommendationToUsers = async (recommendationId) => {
  try {
    const recommendation = await StockRecommendation.findById(recommendationId)
      .populate('targetStrategies');
    
    if (!recommendation) {
      throw new Error('Recommendation not found');
    }
    
    // Get strategy IDs
    const strategyIds = recommendation.targetStrategies.map(strategy => strategy._id);
    
    // Find users with active subscriptions that include these strategies
    const activeUserSubscriptions = await UserSubscription.find({
      status: 'active'
    }).populate({
      path: 'subscription',
      populate: {
        path: 'strategies'
      }
    });
    
    // Filter users whose subscriptions include the target strategies
    const userIds = new Set();
    activeUserSubscriptions.forEach(userSub => {
      if (userSub.subscription && userSub.subscription.strategies) {
        const hasMatchingStrategy = userSub.subscription.strategies.some(strategy =>
          strategyIds.some(targetId => targetId.toString() === strategy._id.toString())
        );
        if (hasMatchingStrategy) {
          userIds.add(userSub.user.toString());
        }
      }
    });
    
    const users = await User.find({ _id: { $in: Array.from(userIds) } });
    
    let sentCount = 0;
    let failedCount = 0;
    
    for (const user of users) {
      try {
        // Send notification
        await notificationService.sendRecommendationNotification(user, recommendation);
        
        // Track sent status
        recommendation.sentTo.push({
          user: user._id,
          sentAt: Date.now(),
          deliveryStatus: 'sent'
        });
        
        sentCount++;
      } catch (error) {
        logger.error(`Failed to send recommendation to user ${user._id}:`, error);
        
        recommendation.sentTo.push({
          user: user._id,
          sentAt: Date.now(),
          deliveryStatus: 'failed'
        });
        
        failedCount++;
      }
    }
    
    await recommendation.save();
    
    return {
      sentCount,
      failedCount,
      totalUsers: users.length
    };
  } catch (error) {
    logger.error('Error in sendRecommendationToUsers:', error);
    throw error;
  }
};


/**
 * Set Zerodha access token
 * @route POST /api/recommendations/zerodha/set-token
 * @access Admin only
 */
const setZerodhaToken = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const adminEmail = req.user?.email || 'admin';
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }
    
    // Calculate expiration time (next day at 6:00 AM IST)
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const expiresAt = new Date(istTime);
    
    // Set to next day at 6:00 AM
    expiresAt.setDate(expiresAt.getDate() + 1);
    expiresAt.setHours(6, 0, 0, 0);
    
    // Convert back to UTC for storage
    const expiresAtUTC = new Date(expiresAt.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    // Find existing active token and update it, or create new one if none exists
    const existingToken = await ZerodhaToken.findOne({ isActive: true });
    
    if (existingToken) {
      // Update existing token
      existingToken.accessToken = accessToken;
      existingToken.updatedBy = adminEmail;
      existingToken.updatedAt = new Date();
      existingToken.expiresAt = expiresAtUTC;
      existingToken.isActive = true;
      
      await existingToken.save();
      
      logger.info(`Zerodha access token updated by ${adminEmail}, expires at ${expiresAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    } else {
      // Create new token if none exists
      const newToken = new ZerodhaToken({
        accessToken,
        updatedBy: adminEmail,
        expiresAt: expiresAtUTC,
        isActive: true
      });
      
      await newToken.save();
      
      logger.info(`Zerodha access token created by ${adminEmail}, expires at ${expiresAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }
    
    res.status(200).json({
      success: true,
      message: 'Zerodha access token set successfully',
      expiresAt: expiresAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    });
  } catch (error) {
    logger.error('Error setting Zerodha token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set Zerodha token',
      details: error.message
    });
  }
};

/**
 * Deactivate expired Zerodha tokens
 * Called by cron job at 6:00 AM daily
 * @access Internal/Cron
 */
const deactivateExpiredTokens = async () => {
  try {
    const now = new Date();
    
    // Find and deactivate all expired tokens
    const result = await ZerodhaToken.updateMany(
      {
        isActive: true,
        expiresAt: { $lte: now }
      },
      {
        isActive: false
      }
    );
    
    if (result.modifiedCount > 0) {
      logger.info(`Deactivated ${result.modifiedCount} expired Zerodha token(s)`);
    }
    
    return { success: true, deactivated: result.modifiedCount };
  } catch (error) {
    logger.error('Error deactivating expired tokens:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current Zerodha token status
 * @route GET /api/recommendations/zerodha/token-status
 * @access Admin only
 */
const getZerodhaTokenStatus = async (req, res) => {
  try {
    const token = await ZerodhaToken.findOne({ isActive: true }).sort({ updatedAt: -1 });
    
    if (!token) {
      return res.status(200).json({
        success: true,
        hasToken: false,
        message: 'No active token found'
      });
    }
    
    // Check if token has expired
    const now = new Date();
    const isExpired = token.expiresAt && token.expiresAt <= now;
    
    if (isExpired) {
      // Deactivate expired token
      token.isActive = false;
      await token.save();
      
      return res.status(200).json({
        success: true,
        hasToken: false,
        message: 'Token has expired',
        expiredAt: token.expiresAt
      });
    }
    
    res.status(200).json({
      success: true,
      hasToken: true,
      updatedBy: token.updatedBy,
      updatedAt: token.updatedAt,
      expiresAt: token.expiresAt,
      isExpired: false
    });
  } catch (error) {
    logger.error('Error getting token status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get token status'
    });
  }
};

/**
 * Get stock price from Zerodha
 * @route GET /api/recommendations/zerodha/get-price
 * @access Admin only
 */
const getStockPrice = async (req, res) => {
  try {
    const { symbol, exchange = 'NSE' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Stock symbol is required'
      });
    }
    
    // Format instrument as EXCHANGE:SYMBOL
    const instrument = `${exchange}:${symbol}`;
    
    // Get quote from Zerodha
    const quoteData = await zerodhaService.getQuote([instrument]);
    
    if (!quoteData || !quoteData.data || !quoteData.data[instrument]) {
      return res.status(404).json({
        success: false,
        error: 'Stock not found or invalid symbol'
      });
    }
    
    const quote = quoteData.data[instrument];
    
    // Try to get the stock name from instruments data
    let stockName = symbol; // Default to symbol
    try {
      const instruments = await zerodhaService.searchInstruments(symbol, exchange);
      if (instruments && instruments.length > 0) {
        // Find exact match for the symbol
        const exactMatch = instruments.find(inst => 
          inst.tradingsymbol && inst.tradingsymbol.toUpperCase() === symbol.toUpperCase()
        );
        if (exactMatch && exactMatch.name) {
          stockName = exactMatch.name;
        }
      }
    } catch (instrumentError) {
      // If fetching instrument name fails, just use the symbol
      logger.warn('Could not fetch instrument name:', instrumentError.message);
    }
    
    res.status(200).json({
      success: true,
      data: {
        symbol: symbol,
        exchange: exchange,
        stockName: stockName,
        lastPrice: quote.last_price,
        ohlc: quote.ohlc,
        change: quote.change,
        changePercent: quote.change_percent || ((quote.last_price - quote.ohlc.close) / quote.ohlc.close * 100),
        volume: quote.volume,
        averagePrice: quote.average_price,
        lastTradeTime: quote.last_trade_time,
        instrumentToken: quote.instrument_token
      }
    });
  } catch (error) {
    logger.error('Error getting stock price:', error);
    
    if (error.message && error.message.includes('No active Zerodha access token')) {
      return res.status(401).json({
        success: false,
        error: 'Zerodha access token not configured. Please set token from admin panel.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get stock price',
      details: error.message
    });
  }
};

/**
 * Search stocks from Zerodha
 * @route GET /api/recommendations/zerodha/search
 * @access Admin only
 */
const searchStocks = async (req, res) => {
  try {
    const { query, exchange } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }
    
    const instruments = await zerodhaService.searchInstruments(query, exchange);
    
    res.status(200).json({
      success: true,
      count: instruments.length,
      data: instruments
    });
  } catch (error) {
    logger.error('Error searching stocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search stocks',
      details: error.message
    });
  }
};

/**
 * Update all active stock recommendation prices
 * Called by cron job during market hours
 * @access Internal/Cron
 */
const updateAllStockPrices = async () => {
  try {
    logger.info('Starting automatic stock price update...');
    
    // Get all active recommendations that haven't expired
    const recommendations = await StockRecommendation.find({ 
      status: 'published',
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ]
    });
    
    if (recommendations.length === 0) {
      logger.info('No active recommendations to update');
      return { success: true, updated: 0, failed: 0 };
    }
    
    let updatedCount = 0;
    let failedCount = 0;
    
    // Update each recommendation's price
    for (const rec of recommendations) {
      try {
        // Detect exchange from symbol suffix if not explicitly set
        let exchange = rec.exchange || 'NSE';
        let cleanSymbol = rec.stockSymbol;
        
        // If symbol has exchange suffix (e.g., CIANAGRO.BSE), extract it
        if (cleanSymbol.includes('.')) {
          const parts = cleanSymbol.split('.');
          cleanSymbol = parts[0]; // Symbol part
          const suffixExchange = parts[1]; // Exchange part (BSE, NSE, etc.)
          
          // Use the suffix exchange if the rec.exchange is not set or is default NSE
          if (!rec.exchange || rec.exchange === 'NSE') {
            exchange = suffixExchange.toUpperCase();
          }
        }
        
        const instrument = `${exchange}:${cleanSymbol}`;
        
        const quoteData = await zerodhaService.getQuote([instrument]);
        
        if (quoteData?.data?.[instrument]?.last_price) {
          const newPrice = quoteData.data[instrument].last_price;
          
          // Only update if price has changed
          if (rec.currentPrice !== newPrice) {
            rec.currentPrice = newPrice;
            rec.lastPriceUpdate = new Date();
            await rec.save();
            
            logger.info(`Updated price for ${rec.stockSymbol}: ₹${newPrice}`);
            updatedCount++;
          }
        } else {
          logger.warn(`No price data available for ${rec.stockSymbol}`);
          failedCount++;
        }
      } catch (error) {
        logger.error(`Failed to update price for ${rec.stockSymbol}:`, error.message);
        failedCount++;
      }
    }
    
    logger.info(`Price update complete: ${updatedCount} updated, ${failedCount} failed`);
    return { success: true, updated: updatedCount, failed: failedCount, total: recommendations.length };
    
  } catch (error) {
    logger.error('Error in updateAllStockPrices:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Refresh stock prices on-demand (for dashboard)
 * Only updates if last update was more than 10 minutes ago
 * @route POST /api/recommendations/refresh-prices
 * @access Private
 */
const refreshStockPrices = async (req, res) => {
  try {
    logger.info('========== STARTING PRICE REFRESH ==========');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    logger.info(`Looking for recommendations that need price update (older than ${tenMinutesAgo.toISOString()})`);
    
    // Get active recommendations that need price update
    const recommendations = await StockRecommendation.find({ 
      status: 'published',
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ],
      $or: [
        { lastPriceUpdate: { $lt: tenMinutesAgo } },
        { lastPriceUpdate: null }
      ]
    });
    
    logger.info(`Found ${recommendations.length} recommendations to refresh`);
    
    if (recommendations.length === 0) {
      logger.info('All prices are up to date. No refresh needed.');
      return res.status(200).json({
        success: true,
        message: 'All prices are up to date',
        updated: 0
      });
    }
    
    let updatedCount = 0;
    let failedCount = 0;
    const errors = [];
    
    logger.info(`Starting to process ${recommendations.length} recommendations...`);
    
    for (const rec of recommendations) {
      try {
        logger.info(`\n--- Processing: ${rec.stockSymbol} (ID: ${rec._id}) ---`);
        
        // Detect exchange from symbol suffix if not explicitly set
        let exchange = rec.exchange || 'NSE';
        let cleanSymbol = rec.stockSymbol;
        
        logger.info(`Original symbol: ${rec.stockSymbol}, Exchange: ${exchange}`);
        
        // If symbol has exchange suffix (e.g., CIANAGRO.BSE), extract it
        if (cleanSymbol.includes('.')) {
          const parts = cleanSymbol.split('.');
          cleanSymbol = parts[0]; // Symbol part
          const suffixExchange = parts[1]; // Exchange part (BSE, NSE, etc.)
          
          // Use the suffix exchange if the rec.exchange is not set or is default NSE
          if (!rec.exchange || rec.exchange === 'NSE') {
            exchange = suffixExchange.toUpperCase();
            logger.info(`Detected exchange from symbol: ${rec.stockSymbol} -> ${exchange}:${cleanSymbol}`);
          }
        }
        
        const instrument = `${exchange}:${cleanSymbol}`;
        
        logger.info(`Fetching price for instrument: ${instrument}`);
        
        const quoteData = await zerodhaService.getQuote([instrument]);
        
        logger.info(`Quote response received for ${instrument}`);
        logger.info(`Quote data keys: ${Object.keys(quoteData || {}).join(', ')}`);
        
        if (quoteData?.data?.[instrument]?.last_price) {
          const oldPrice = rec.currentPrice;
          rec.currentPrice = quoteData.data[instrument].last_price;
          rec.lastPriceUpdate = new Date();
          await rec.save();
          updatedCount++;
          logger.info(`✓ SUCCESS: ${rec.stockSymbol} price updated from ₹${oldPrice} to ₹${rec.currentPrice}`);
        } else {
          const errorMsg = `No price data in response for ${instrument}`;
          logger.warn(`✗ FAILED: ${errorMsg}`);
          logger.warn(`Response structure: ${JSON.stringify(quoteData, null, 2)}`);
          errors.push(`${rec.stockSymbol}: No price data`);
          failedCount++;
        }
      } catch (error) {
        const errorMsg = `Failed to refresh price for ${rec.stockSymbol}: ${error.message}`;
        logger.error(`✗ ERROR: ${errorMsg}`);
        logger.error(`Error stack: ${error.stack}`);
        errors.push(`${rec.stockSymbol}: ${error.message}`);
        failedCount++;
      }
    }
    
    logger.info(`\n========== PRICE REFRESH COMPLETE ==========`);
    logger.info(`Total processed: ${recommendations.length}`);
    logger.info(`Successfully updated: ${updatedCount}`);
    logger.info(`Failed: ${failedCount}`);
    if (errors.length > 0) {
      logger.warn(`Errors: ${errors.join(', ')}`);
    }
    
    // Fetch updated recommendations to return fresh data
    logger.info(`Fetching all updated recommendations...`);
    const updatedRecommendations = await StockRecommendation.find({ 
      status: 'published',
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('targetStrategies', 'name strategyCode');
    
    logger.info(`Returning ${updatedRecommendations.length} recommendations to frontend`);
    
    res.status(200).json({
      success: true,
      message: `Refreshed ${updatedCount} stock prices`,
      updated: updatedCount,
      failed: failedCount,
      total: recommendations.length,
      errors: errors.length > 0 ? errors : undefined,
      data: updatedRecommendations
    });
    
  } catch (error) {
    logger.error('========== PRICE REFRESH ERROR ==========');
    logger.error('Error refreshing stock prices:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh stock prices',
      details: error.message
    });
  }
};

/**
 * Generate PDF report for a stock recommendation
 * @route POST /api/recommendations/:id/generate-pdf
 * @access Admin only
 */
const generatePDFReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      companyAbout,
      technicalReason,
      summary,
      disclaimer
    } = req.body;

    // Get the recommendation
    const recommendation = await StockRecommendation.findById(id);
    
    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
    }

    // Default disclaimer if not provided
    const defaultDisclaimer = 'This report is for informational purposes only and should not be considered as financial advice. Investment in securities market are subject to market risks. Please read all the related documents carefully before investing. Past performance is not indicative of future returns. Please consider your specific investment requirements, risk tolerance, goal, time frame, risk and reward balance and the cost associated with the investment before choosing a fund, or designing a portfolio that suits your needs. Performance and returns of any investment portfolio can neither be predicted nor guaranteed.';

    // Prepare PDF data
    const pdfData = {
      stockSymbol: recommendation.stockSymbol,
      stockName: recommendation.stockName,
      companyAbout: companyAbout || recommendation.description || 'No company information available.',
      ltp: recommendation.currentPrice,
      targetPrice: recommendation.targetPrice,
      stopLoss: recommendation.stopLoss || 0,
      technicalReason: technicalReason || recommendation.rationale || 'Technical analysis not provided.',
      summary: summary || recommendation.description || 'Summary not provided.',
      disclaimer: disclaimer || defaultDisclaimer,
      recommendationType: recommendation.recommendationType,
      timeFrame: recommendation.timeFrame,
      riskLevel: recommendation.riskLevel
    };

    // Generate PDF
    const pdfBuffer = await generateStockReportPDF(pdfData);

    // Upload PDF to Cloudinary
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `InvestKaps_${recommendation.stockSymbol}_${currentDate}`;
    
    // Delete old PDF if exists
    if (recommendation.pdfReport && recommendation.pdfReport.publicId) {
      try {
        await deletePDF(recommendation.pdfReport.publicId);
      } catch (err) {
        logger.warn('Failed to delete old PDF from Cloudinary:', err);
      }
    }

    // Upload new PDF to Cloudinary
    const uploadResult = await uploadPDF(pdfBuffer, filename);

    // Update recommendation with PDF URL
    recommendation.pdfReport = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      generatedAt: new Date()
    };
    await recommendation.save();

    logger.info(`PDF uploaded to Cloudinary for recommendation ${id}: ${uploadResult.url}`);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error generating PDF report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF report',
      details: error.message
    });
  }
};

module.exports = {
  createRecommendation,
  getAllRecommendations,
  getRecommendation,
  updateRecommendation,
  deleteRecommendation,
  sendRecommendation,
  getUserRecommendations,
  setZerodhaToken,
  getZerodhaTokenStatus,
  getStockPrice,
  searchStocks,
  updateAllStockPrices,
  refreshStockPrices,
  deactivateExpiredTokens,
  generatePDFReport
};
