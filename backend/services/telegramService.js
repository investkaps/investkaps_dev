const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

// Initialize bot - uses common bot token from env
let bot = null;

const initializeTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token || token === 'your_bot_token_here') {
    logger.warn('Telegram bot token not configured. Telegram notifications disabled.');
    return null;
  }

  try {
    bot = new TelegramBot(token, { polling: false });
    logger.info('Telegram bot initialized successfully');
    return bot;
  } catch (error) {
    logger.error('Failed to initialize Telegram bot:', error);
    return null;
  }
};

/**
 * Send stock recommendation to Telegram chat
 * @param {Object} recommendation - Stock recommendation object
 * @param {string} chatId - Telegram chat ID (from subscription)
 * @returns {Promise<boolean>} Success status
 */
const sendRecommendationToTelegram = async (recommendation, chatId) => {
  try {
    if (!bot) {
      bot = initializeTelegramBot();
      if (!bot) {
        logger.warn('Telegram bot not initialized. Skipping notification.');
        return false;
      }
    }

    if (!chatId) {
      logger.warn('Telegram chat ID not provided. Skipping notification.');
      return false;
    }

    // Format target prices
    let targetPricesText = `• Target 1: ₹${recommendation.targetPrice}`;
    if (recommendation.targetPrice2) {
      targetPricesText += `\n• Target 2: ₹${recommendation.targetPrice2}`;
    }
    if (recommendation.targetPrice3) {
      targetPricesText += `\n• Target 3: ₹${recommendation.targetPrice3}`;
    }

    // Format the message
    const typeEmoji = recommendation.recommendationType === 'buy' ? '🟢' : 
                      recommendation.recommendationType === 'sell' ? '🔴' : '🟡';
    
    const message = `
${typeEmoji} *NEW STOCK RECOMMENDATION* ${typeEmoji}

📊 *${recommendation.stockSymbol}* - ${recommendation.stockName}

💰 *Price Details:*
• Current Price: ₹${recommendation.currentPrice}
${targetPricesText}
${recommendation.stopLoss ? `• Stop Loss: ₹${recommendation.stopLoss}` : ''}

📈 *Recommendation:* ${recommendation.recommendationType.toUpperCase()}
⏰ *Time Frame:* ${recommendation.timeFrame.replace('_', ' ').toUpperCase()}

📝 *Description:*
${recommendation.description}

💡 *Rationale:*
${recommendation.rationale}

${recommendation.pdfReport && recommendation.pdfReport.url ? `\n📄 *Full Report:* ${recommendation.pdfReport.url}` : ''}

---
_InvestKaps - Your Investment Partner_
    `.trim();

    // Send message with Markdown formatting
    await bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });

    logger.info(`Stock recommendation sent to Telegram chat ${chatId}: ${recommendation.stockSymbol}`);
    return true;

  } catch (error) {
    logger.error(`Error sending recommendation to Telegram chat ${chatId}:`, error);
    return false;
  }
};

/**
 * Send custom message to Telegram chat
 * @param {string} message - Message to send
 * @param {string} chatId - Telegram chat ID (from subscription)
 * @returns {Promise<boolean>} Success status
 */
const sendTelegramMessage = async (message, chatId) => {
  try {
    if (!bot) {
      bot = initializeTelegramBot();
      if (!bot) return false;
    }

    if (!chatId) {
      logger.warn('Telegram chat ID not provided.');
      return false;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    logger.info(`Custom message sent to Telegram chat ${chatId}`);
    return true;

  } catch (error) {
    logger.error(`Error sending message to Telegram chat ${chatId}:`, error);
    return false;
  }
};

/**
 * Send PDF document to Telegram chat
 * @param {string} pdfUrl - URL of the PDF
 * @param {string} caption - Caption for the PDF
 * @param {string} chatId - Telegram chat ID (from subscription)
 * @returns {Promise<boolean>} Success status
 */
const sendPDFToTelegram = async (pdfUrl, caption, chatId) => {
  try {
    if (!bot) {
      bot = initializeTelegramBot();
      if (!bot) return false;
    }

    if (!chatId) {
      logger.warn('Telegram chat ID not provided.');
      return false;
    }

    await bot.sendDocument(chatId, pdfUrl, { 
      caption: caption,
      parse_mode: 'Markdown'
    });
    
    logger.info(`PDF sent to Telegram chat ${chatId}`);
    return true;

  } catch (error) {
    logger.error(`Error sending PDF to Telegram chat ${chatId}:`, error);
    return false;
  }
};

/**
 * Send recommendation to multiple Telegram chats (for multiple subscriptions)
 * @param {Object} recommendation - Stock recommendation object
 * @param {Array} subscriptions - Array of subscription objects with telegramChatId
 * @returns {Promise<Object>} Results with success/failure counts
 */
const sendRecommendationToSubscriptions = async (recommendation, subscriptions) => {
  const results = { sent: 0, failed: 0, skipped: 0 };
  
  for (const subscription of subscriptions) {
    if (!subscription.telegramChatId) {
      results.skipped++;
      continue;
    }
    
    const success = await sendRecommendationToTelegram(recommendation, subscription.telegramChatId);
    if (success) {
      results.sent++;
    } else {
      results.failed++;
    }
  }
  
  logger.info(`Telegram notifications: sent=${results.sent}, failed=${results.failed}, skipped=${results.skipped}`);
  return results;
};

module.exports = {
  initializeTelegramBot,
  sendRecommendationToTelegram,
  sendRecommendationToSubscriptions,
  sendTelegramMessage,
  sendPDFToTelegram
};
