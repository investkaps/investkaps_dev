
const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');

// Initialize bot
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
 * Send stock recommendation to Telegram group
 * @param {Object} recommendation - Stock recommendation object
 * @returns {Promise<boolean>} Success status
 */
const sendRecommendationToTelegram = async (recommendation) => {
  try {
    if (!bot) {
      bot = initializeTelegramBot();
      if (!bot) {
        logger.warn('Telegram bot not initialized. Skipping notification.');
        return false;
      }
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!chatId || chatId === 'your_group_chat_id_here') {
      logger.warn('Telegram chat ID not configured. Skipping notification.');
      return false;
    }

    // Format the message
    const typeEmoji = recommendation.recommendationType === 'buy' ? '🟢' : 
                      recommendation.recommendationType === 'sell' ? '🔴' : '🟡';
    
    const message = `
${typeEmoji} *NEW STOCK RECOMMENDATION* ${typeEmoji}

📊 *${recommendation.stockSymbol}* - ${recommendation.stockName}

💰 *Price Details:*
• Current Price: ₹${recommendation.currentPrice}
• Target Price: ₹${recommendation.targetPrice}
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

    logger.info(`Stock recommendation sent to Telegram: ${recommendation.stockSymbol}`);
    return true;

  } catch (error) {
    logger.error('Error sending recommendation to Telegram:', error);
    return false;
  }
};

/**
 * Send custom message to Telegram group
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} Success status
 */
const sendTelegramMessage = async (message) => {
  try {
    if (!bot) {
      bot = initializeTelegramBot();
      if (!bot) return false;
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId || chatId === 'your_group_chat_id_here') {
      logger.warn('Telegram chat ID not configured.');
      return false;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    logger.info('Custom message sent to Telegram');
    return true;

  } catch (error) {
    logger.error('Error sending message to Telegram:', error);
    return false;
  }
};

/**
 * Send PDF document to Telegram group
 * @param {string} pdfUrl - URL of the PDF
 * @param {string} caption - Caption for the PDF
 * @returns {Promise<boolean>} Success status
 */
const sendPDFToTelegram = async (pdfUrl, caption) => {
  try {
    if (!bot) {
      bot = initializeTelegramBot();
      if (!bot) return false;
    }

    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId || chatId === 'your_group_chat_id_here') {
      logger.warn('Telegram chat ID not configured.');
      return false;
    }

    await bot.sendDocument(chatId, pdfUrl, { 
      caption: caption,
      parse_mode: 'Markdown'
    });
    
    logger.info('PDF sent to Telegram');
    return true;

  } catch (error) {
    logger.error('Error sending PDF to Telegram:', error);
    return false;
  }
};

module.exports = {
  initializeTelegramBot,
  sendRecommendationToTelegram,
  sendTelegramMessage,
  sendPDFToTelegram
};
