import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Send WhatsApp message using Meta WhatsApp Cloud API
 * @param {string} phoneNumber - Recipient phone number (with country code, no + or spaces)
 * @param {string} templateName - Approved template name
 * @param {Array} templateParams - Template parameters (optional)
 * @returns {Promise<boolean>} Success status
 */
const sendWhatsAppTemplate = async (phoneNumber, templateName = 'hello_world', templateParams = []) => {
  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      logger.warn('WhatsApp credentials not configured. Skipping WhatsApp notification.');
      return false;
    }

    if (!phoneNumber) {
      logger.warn('WhatsApp phone number not provided. Skipping notification.');
      return false;
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US'
        }
      }
    };

    // Add parameters if provided
    if (templateParams.length > 0) {
      payload.template.components = [
        {
          type: 'body',
          parameters: templateParams.map(param => ({
            type: 'text',
            text: param
          }))
        }
      ];
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`WhatsApp message sent to ${phoneNumber}: ${templateName}`);
    return true;

  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    };
    logger.error(`Error sending WhatsApp message to ${phoneNumber}:`, errorDetails);
    return false;
  }
};

/**
 * Send stock recommendation to WhatsApp (using hello_world template for now)
 * @param {Object} recommendation - Stock recommendation object
 * @param {Object} user - User object with profile.phone
 * @returns {Promise<boolean>} Success status
 */
const sendRecommendationToWhatsApp = async (recommendation, user) => {
  try {
    const phoneNumber = user?.profile?.phone;
    
    if (!phoneNumber) {
      logger.warn(`WhatsApp phone number not found for user ${user?._id}. Skipping notification.`);
      return false;
    }

    if (!user?.profile?.phoneVerified) {
      logger.warn(`Phone not verified for user ${user._id}. Skipping WhatsApp notification.`);
      return false;
    }

    // For now, use hello_world template
    // TODO: Create and approve a custom template for stock recommendations
    const success = await sendWhatsAppTemplate(phoneNumber, 'hello_world');
    
    if (success) {
      logger.info(`Stock recommendation notification sent to WhatsApp ${phoneNumber}: ${recommendation.stockSymbol}`);
    }

    return success;

  } catch (error) {
    logger.error(`Error sending recommendation to WhatsApp for user ${user?._id}:`, error);
    return false;
  }
};

export {
  sendWhatsAppTemplate,
  sendRecommendationToWhatsApp
};
