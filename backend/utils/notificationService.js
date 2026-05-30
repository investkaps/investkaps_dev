import nodemailer from 'nodemailer';
import logger from './logger.js';

const SERVICE_TYPES = ['RA', 'IA'];

const normalizeServiceType = (serviceType) => {
  const normalized = String(serviceType || 'RA').toUpperCase();
  return SERVICE_TYPES.includes(normalized) ? normalized : 'RA';
};

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim();
};

/**
 * Email transporter configuration (lazy initialization)
 */
const transporters = new Map();

const getTransporter = (serviceType = 'RA') => {
  const normalizedServiceType = normalizeServiceType(serviceType);

  if (!transporters.has(normalizedServiceType)) {
    const host = normalizedServiceType === 'IA'
      ? normalizeEnvValue(process.env.SMTP_HOST_IA || process.env.EMAIL_HOST)
      : normalizeEnvValue(process.env.EMAIL_HOST || process.env.SMTP_HOST_IA);
    const port = Number(normalizedServiceType === 'IA'
      ? normalizeEnvValue(process.env.SMTP_PORT_IA || process.env.EMAIL_PORT)
      : normalizeEnvValue(process.env.EMAIL_PORT || process.env.SMTP_PORT_IA)) || 587;
    const secure = normalizedServiceType === 'IA'
      ? normalizeEnvValue(process.env.EMAIL_SECURE_IA) === 'true' || normalizeEnvValue(process.env.EMAIL_SECURE) === 'true'
      : normalizeEnvValue(process.env.EMAIL_SECURE) === 'true' || normalizeEnvValue(process.env.EMAIL_SECURE_IA) === 'true';
    const user = normalizedServiceType === 'IA'
      ? normalizeEnvValue(process.env.SMTP_USER_IA || process.env.EMAIL_USER)
      : normalizeEnvValue(process.env.EMAIL_USER || process.env.SMTP_USER_IA);
    const pass = normalizedServiceType === 'IA'
      ? normalizeEnvValue(process.env.SMTP_PASS_IA || process.env.EMAIL_PASSWORD)
      : normalizeEnvValue(process.env.EMAIL_PASSWORD || process.env.SMTP_PASS_IA);

    transporters.set(normalizedServiceType, nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    }));
  }

  return transporters.get(normalizedServiceType);
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise}
 */
const sendEmail = async (options) => {
  try {
    const serviceType = normalizeServiceType(options.serviceType);
    const defaultCc = serviceType === 'IA'
      ? normalizeEnvValue(process.env.SMTP_USER_IA || process.env.EMAIL_USER)
      : normalizeEnvValue(process.env.EMAIL_USER || process.env.SMTP_USER_IA);
    const mailOptions = {
      from: serviceType === 'IA'
        ? normalizeEnvValue(process.env.SMTP_FROM_IA || process.env.EMAIL_FROM || `${process.env.EMAIL_FROM_NAME || 'InvestKaps IA'} <${process.env.SMTP_USER_IA || process.env.EMAIL_USER}>`)
        : `${normalizeEnvValue(process.env.EMAIL_FROM_NAME || 'InvestKaps')} <${normalizeEnvValue(process.env.EMAIL_FROM || process.env.SMTP_USER_IA || process.env.EMAIL_USER)}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    if (options.cc) {
      mailOptions.cc = options.cc;
    } else if (defaultCc) {
      mailOptions.cc = defaultCc;
    }

    const transporterInstance = getTransporter(serviceType);
    const info = await transporterInstance.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send stock recommendation to a user
 * @param {Object} user - User object
 * @param {Object} recommendation - Stock recommendation object
 * @returns {Promise}
 */
const sendStockRecommendation = async (user, recommendation, serviceType = 'RA', options = {}) => {
  try {
    const normalizedServiceType = normalizeServiceType(serviceType);
    const recommendationTypeFormatted =
      recommendation.recommendationType.charAt(0).toUpperCase() +
      recommendation.recommendationType.slice(1);

    const riskLevelFormatted =
      recommendation.riskLevel.charAt(0).toUpperCase() +
      recommendation.riskLevel.slice(1);

    let timeFrameFormatted = '';
    switch (recommendation.timeFrame) {
      case 'short_term':
        timeFrameFormatted = 'Short Term';
        break;
      case 'medium_term':
        timeFrameFormatted = 'Medium Term';
        break;
      case 'long_term':
        timeFrameFormatted = 'Long Term';
        break;
      default:
        timeFrameFormatted = recommendation.timeFrame;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0b73ff; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Stock Recommendation</h1>
        </div>

        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333;">${recommendation.title}</h2>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #0b73ff;">
              ${recommendation.stockName} (${recommendation.stockSymbol})
            </h3>
            <p>
              <strong>Recommendation:</strong>
              <span style="color: ${
                recommendation.recommendationType === 'buy'
                  ? 'green'
                  : recommendation.recommendationType === 'sell'
                  ? 'red'
                  : 'orange'
              };">
                ${recommendationTypeFormatted}
              </span>
            </p>
            <p><strong>Current Price:</strong> ₹${recommendation.currentPrice.toFixed(2)}</p>
            <p><strong>Target Price:</strong> ₹${recommendation.targetPrice.toFixed(2)}</p>
            ${
              recommendation.stopLoss
                ? `<p><strong>Stop Loss:</strong> ₹${recommendation.stopLoss.toFixed(2)}</p>`
                : ''
            }
            <p><strong>Time Frame:</strong> ${timeFrameFormatted}</p>
            <p><strong>Risk Level:</strong> ${riskLevelFormatted}</p>
          </div>

          <h3>Description</h3>
          <p>${recommendation.description}</p>

          <h3>Rationale</h3>
          <p>${recommendation.rationale}</p>

          <div style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
            <p>
              This recommendation is provided as part of your subscription with InvestKaps.
              Please note that all investments carry risk.
            </p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>

        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>© ${new Date().getFullYear()} InvestKaps. All rights reserved.</p>
          <p>This email was sent to ${user.email}</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Stock Recommendation: ${recommendation.stockSymbol} - ${recommendationTypeFormatted}`,
      html,
      serviceType: normalizedServiceType,
      allowUnsubscribed: options.allowUnsubscribed
    });

    return true;
  } catch (error) {
    logger.error(`Error sending stock recommendation to user ${user._id}:`, error);
    throw error;
  }
};

/**
 * Send subscription expiration reminder
 * @param {Object} user - User object
 * @param {Object} subscription - User subscription object
 * @returns {Promise}
 */
const sendExpirationReminder = async (user, subscription, serviceType = 'RA', options = {}) => {
  try {
    const normalizedServiceType = normalizeServiceType(serviceType);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0b73ff; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Subscription Reminder</h1>
        </div>

        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333;">Your Subscription is Expiring Soon</h2>

          <p>Dear ${user.name},</p>

          <p>
            Your ${subscription.subscription.name} subscription will expire on
            ${new Date(subscription.endDate).toLocaleDateString()}.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/pricing"
               style="background-color: #0b73ff; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Renew Now
            </a>
          </div>

          <p>Thank you for choosing InvestKaps!</p>
        </div>

        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          <p>© ${new Date().getFullYear()} InvestKaps. All rights reserved.</p>
          <p>This email was sent to ${user.email}</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Your InvestKaps Subscription is Expiring Soon',
      html,
      serviceType: normalizedServiceType,
      allowUnsubscribed: options.allowUnsubscribed
    });

    return true;
  } catch (error) {
    logger.error(`Error sending expiration reminder to user ${user._id}:`, error);
    throw error;
  }
};

/* -----------------------------
   EXPORTS
-------------------------------- */

export {
  sendEmail,
  sendStockRecommendation,
  sendStockRecommendation as sendRecommendationNotification,
  sendExpirationReminder
};

export default {
  sendEmail,
  sendStockRecommendation,
  sendRecommendationNotification: sendStockRecommendation,
  sendExpirationReminder
};
