import StockRecommendation from '../model/StockRecommendation.js';
import User from '../model/User.js';
import UserSubscription from '../model/UserSubscription.js';
import notificationService from '../utils/notificationService.js';
import logger from '../utils/logger.js';
import { generateStockReportPDF  } from '../utils/pdfGenerator.js';
import { uploadPDF, deletePDF  } from '../config/cloudinary.js';
import { sendRecommendationToTelegram  } from '../services/telegramService.js';
import { sendRecommendationToWhatsApp  } from '../services/whatsappService.js';
import Subscription from '../model/Subscription.js';

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
      
      // Fetch subscriptions that have the target strategies
      const subscriptions = await Subscription.find({
        strategies: { $in: targetStrategies }
      });
      
      // Get subscription IDs
      const subscriptionIds = subscriptions.map(sub => sub._id);
      
      // Fetch active user subscriptions with user data
      const userSubscriptions = await UserSubscription.find({
        subscription: { $in: subscriptionIds },
        status: 'active'
      }).populate('user');
      
      // Send to Telegram
      try {
        const telegramSubscriptions = subscriptions.filter(sub => sub.telegramChatId);
        for (const subscription of telegramSubscriptions) {
          await sendRecommendationToTelegram(recommendation, subscription.telegramChatId);
          logger.info(`Recommendation sent to Telegram chat ${subscription.telegramChatId}: ${recommendation.stockSymbol}`);
        }
      } catch (telegramError) {
        logger.error('Failed to send to Telegram:', telegramError);
        // Don't fail the request if Telegram fails
      }

      // Send to WhatsApp - use phone numbers from User model
      try {
        const users = userSubscriptions
          .map(us => us.user)
          .filter(user => user?.profile?.phone && user?.profile?.phoneVerified);
        
        for (const user of users) {
          await sendRecommendationToWhatsApp(recommendation, user);
          logger.info(`Recommendation sent to WhatsApp ${user.profile.phone}: ${recommendation.stockSymbol}`);
        }
      } catch (whatsappError) {
        logger.error('Failed to send to WhatsApp:', whatsappError);
        // Don't fail the request if WhatsApp fails
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
      
      // Fetch subscriptions that have the target strategies
      const subscriptions = await Subscription.find({
        strategies: { $in: recommendation.targetStrategies }
      });
      
      // Get subscription IDs
      const subscriptionIds = subscriptions.map(sub => sub._id);
      
      // Fetch active user subscriptions with user data
      const userSubscriptions = await UserSubscription.find({
        subscription: { $in: subscriptionIds },
        status: 'active'
      }).populate('user');
      
      // Send to Telegram
      try {
        const telegramSubscriptions = subscriptions.filter(sub => sub.telegramChatId);
        for (const subscription of telegramSubscriptions) {
          await sendRecommendationToTelegram(recommendation, subscription.telegramChatId);
          logger.info(`Recommendation sent to Telegram chat ${subscription.telegramChatId}: ${recommendation.stockSymbol}`);
        }
      } catch (telegramError) {
        logger.error('Failed to send to Telegram:', telegramError);
        // Don't fail the request if Telegram fails
      }

      // Send to WhatsApp - use phone numbers from User model
      try {
        const users = userSubscriptions
          .map(us => us.user)
          .filter(user => user?.profile?.phone && user?.profile?.phoneVerified);
        
        for (const user of users) {
          await sendRecommendationToWhatsApp(recommendation, user);
          logger.info(`Recommendation sent to WhatsApp ${user.profile.phone}: ${recommendation.stockSymbol}`);
        }
      } catch (whatsappError) {
        logger.error('Failed to send to WhatsApp:', whatsappError);
        // Don't fail the request if WhatsApp fails
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

export {
  createRecommendation,
  getAllRecommendations,
  getRecommendation,
  updateRecommendation,
  deleteRecommendation,
  sendRecommendation,
  getUserRecommendations,
  generatePDFReport
};
