import axios from 'axios';
import logger from '../utils/logger.js';
import WhatsAppMessage from '../model/WhatsAppMessage.js';
import { getWhatsAppTemplate } from '../config/whatsappTemplates.js';

const DEFAULT_API_VERSION = 'v21.0';

/**
 * Normalize to Meta-ready digits (country code + national number, no +).
 * Indian 10-digit mobiles get a 91 prefix.
 */
export const normalizeWhatsAppPhone = (input) => {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
};

const getCredentials = () => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;
  return { token, phoneNumberId, apiVersion };
};

const resolveRecipient = ({ user, phone } = {}) => {
  if (phone) {
    return {
      to: normalizeWhatsAppPhone(phone),
      userId: user?._id || null,
      skipReason: null
    };
  }

  if (!user) {
    return { to: null, userId: null, skipReason: 'No user or phone provided' };
  }

  const phoneVerified =
    user.profile?.phoneVerified === true || user.verificationStatus?.phone === true;

  if (!phoneVerified) {
    return {
      to: null,
      userId: user._id,
      skipReason: `Phone not verified for user ${user._id}`
    };
  }

  const to = normalizeWhatsAppPhone(user.profile?.phone);
  if (!to) {
    return {
      to: null,
      userId: user._id,
      skipReason: `No WhatsApp phone for user ${user._id}`
    };
  }

  return { to, userId: user._id, skipReason: null };
};

const buildContextSnapshot = (notificationType, context = {}) => {
  const { user, recommendation, paymentRequest, subscription, ...rest } = context;
  return {
    notificationType,
    userId: user?._id ? String(user._id) : undefined,
    stockSymbol: recommendation?.stockSymbol || rest.stockSymbol,
    paymentRequestId: paymentRequest?._id ? String(paymentRequest._id) : undefined,
    subscriptionId: subscription?._id ? String(subscription._id) : undefined,
    ...rest
  };
};

const buildTemplatePayload = (template, params) => {
  const payload = {
    name: template.templateName,
    language: { code: template.language || 'en' }
  };

  if (params.length > 0) {
    payload.components = [
      {
        type: 'body',
        parameters: params.map((value) => ({
          type: 'text',
          text: String(value)
        }))
      }
    ];
  }

  return payload;
};

/**
 * Send a whitelisted WhatsApp notification and log the outbound message.
 * Never throws for soft-skip / Meta errors — returns a result object instead.
 */
export const sendWhatsAppNotification = async (notificationType, options = {}) => {
  const template = getWhatsAppTemplate(notificationType);
  if (!template) {
    logger.warn(`Unknown WhatsApp notification type: ${notificationType}`);
    return { success: false, skipped: true, reason: 'unknown_type' };
  }

  if (!template.enabled) {
    logger.info(`WhatsApp template disabled: ${notificationType}`);
    return { success: false, skipped: true, reason: 'disabled' };
  }

  const { token, phoneNumberId, apiVersion } = getCredentials();
  if (!token || !phoneNumberId) {
    logger.warn('WhatsApp credentials not configured. Skipping notification.');
    return { success: false, skipped: true, reason: 'missing_credentials' };
  }

  const { to, userId, skipReason } = resolveRecipient(options);
  if (!to) {
    logger.warn(skipReason || 'WhatsApp phone missing. Skipping notification.');
    return { success: false, skipped: true, reason: skipReason || 'missing_phone' };
  }

  const ctx = {
    userName: options.user?.name,
    name: options.user?.name,
    ...(options.context || {}),
    ...(options.paymentRequest || {}),
    planName:
      options.context?.planName ||
      options.paymentRequest?.planName ||
      options.subscription?.subscription?.name ||
      options.subscription?.name ||
      options.planName,
    duration:
      options.context?.duration ||
      options.paymentRequest?.duration ||
      options.subscription?.duration,
    endDate:
      options.context?.endDate ||
      options.subscription?.endDate,
    amount: options.context?.amount ?? options.paymentRequest?.amount,
    transactionId:
      options.context?.transactionId ||
      options.paymentRequest?.transactionId,
    adminNotes: options.paymentRequest?.adminNotes,
    reason: options.context?.reason || options.paymentRequest?.adminNotes,
    message: options.context?.message,
    daysRemaining: options.context?.daysRemaining,
    stockSymbol: options.recommendation?.stockSymbol || options.context?.stockSymbol,
    stockName: options.recommendation?.stockName || options.context?.stockName,
    recommendationType: options.recommendation?.recommendationType,
    updateType: options.context?.updateType,
    additionalInfo: options.context?.additionalInfo,
    ltp: options.context?.ltp,
    alertLabel: options.context?.alertLabel
  };

  const params = typeof template.bodyParams === 'function'
    ? template.bodyParams(ctx)
    : [];

  let log = null;
  try {
    log = await WhatsAppMessage.create({
      user: userId,
      to,
      notificationType,
      templateName: template.templateName,
      language: template.language || 'en',
      params,
      status: 'queued',
      statusHistory: [{ status: 'queued', timestamp: new Date() }],
      context: buildContextSnapshot(notificationType, {
        user: options.user,
        recommendation: options.recommendation,
        paymentRequest: options.paymentRequest,
        subscription: options.subscription,
        ...(options.context || {})
      })
    });
  } catch (createErr) {
    logger.error('Failed to create WhatsAppMessage log:', createErr.message);
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: buildTemplatePayload(template, params)
  };

  try {
    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });

    const messageId = response.data?.messages?.[0]?.id || null;

    if (log) {
      log.messageId = messageId;
      log.status = 'sent';
      log.statusHistory.push({ status: 'sent', timestamp: new Date() });
      log.metaResponse = response.data;
      await log.save();
    }

    logger.info(`WhatsApp [${notificationType}] sent to ${to} (${template.templateName}) id=${messageId}`);
    return {
      success: true,
      skipped: false,
      messageId,
      logId: log?._id || null,
      to,
      templateName: template.templateName
    };
  } catch (error) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
    logger.error(`WhatsApp [${notificationType}] failed for ${to}:`, errorDetails);

    const metaError = error.response?.data?.error;
    const failureReason = metaError
      ? [metaError.message, metaError.error_user_msg, metaError.code].filter(Boolean).join(' — ')
      : error.message;

    if (log) {
      log.status = 'failed';
      log.failureReason = failureReason;
      log.metaResponse = error.response?.data || { message: error.message };
      log.statusHistory.push({
        status: 'failed',
        timestamp: new Date(),
        errorCode: metaError?.code != null ? String(metaError.code) : undefined,
        errorTitle: metaError?.type || metaError?.error_user_title,
        errorMessage: metaError?.message || error.message,
        raw: error.response?.data
      });
      await log.save().catch(() => {});
    }

    return {
      success: false,
      skipped: false,
      reason: failureReason,
      logId: log?._id || null,
      to,
      templateName: template.templateName
    };
  }
};

/** Fire-and-forget wrapper so callers never block on WhatsApp. */
export const sendWhatsAppNotificationSafe = (notificationType, options = {}) => {
  sendWhatsAppNotification(notificationType, options).catch((err) => {
    logger.error(`WhatsApp safe-send failed [${notificationType}]:`, err.message);
  });
};

export const sendWelcomeWhatsApp = (user) =>
  sendWhatsAppNotificationSafe('welcome', { user });

export const sendSubscriptionActivatedWhatsApp = (user, context = {}) =>
  sendWhatsAppNotificationSafe('subscription_activated', { user, ...context });

export const sendPaymentSuccessfulWhatsApp = (user, context = {}) =>
  sendWhatsAppNotificationSafe('payment_successful', { user, ...context });

export const sendPaymentFailedWhatsApp = (user, context = {}) =>
  sendWhatsAppNotificationSafe('payment_failed', { user, ...context });

export const sendSubscriptionExpiringWhatsApp = (user, days, options = {}) => {
  const daysRemaining = String(
    options.context?.daysRemaining ?? days ?? '7'
  );
  return sendWhatsAppNotificationSafe('subscription_expiring', {
    user,
    subscription: options.subscription,
    context: {
      ...(options.context || {}),
      daysRemaining,
      planName: options.planName || options.context?.planName || options.subscription?.subscription?.name,
      endDate: options.endDate || options.context?.endDate || options.subscription?.endDate,
      userName: options.userName || options.context?.userName || user?.name
    }
  });
};

export const sendSubscriptionExpiredWhatsApp = (user, options = {}) =>
  sendWhatsAppNotificationSafe('subscription_renewal', {
    user,
    subscription: options.subscription,
    context: {
      ...(options.context || {}),
      message: options.context?.message || 'Your subscription has expired.',
      planName: options.context?.planName || options.subscription?.subscription?.name,
      userName: options.context?.userName || user?.name
    }
  });

export const sendRenewalReminderWhatsApp = (user, options = {}) =>
  sendWhatsAppNotificationSafe('subscription_renewal', {
    user,
    subscription: options.subscription,
    context: {
      ...(options.context || {}),
      message: options.context?.message || 'Renew your subscription today.',
      planName: options.context?.planName || options.subscription?.subscription?.name,
      userName: options.context?.userName || user?.name
    }
  });

export const sendRecommendationNewWhatsApp = (user, recommendation) =>
  sendWhatsAppNotificationSafe('recommendation_new', { user, recommendation });

const sendRecommendationUpdate = (user, recommendation, context = {}) =>
  sendWhatsAppNotificationSafe('recommendation_update', {
    user,
    recommendation,
    context: {
      stockSymbol: recommendation?.stockSymbol,
      ...context
    }
  });

export const sendRecommendationUpdatedWhatsApp = (user, recommendation, context = {}) =>
  sendRecommendationUpdate(user, recommendation, {
    ...context,
    updateType: 'Recommendation Updated',
    additionalInfo: context.additionalInfo || 'Please log in for complete details.'
  });

export const sendTargetAchievedWhatsApp = (user, recommendation, context = {}) => {
  const price = context.ltp ?? context.currentPrice ?? recommendation?.currentPrice;
  const label = context.alertLabel || 'Target';
  const priceText = price != null && price !== ''
    ? `Current Price: ₹${Number(price).toLocaleString('en-IN')}`
    : `${label} hit`;
  return sendRecommendationUpdate(user, recommendation, {
    ...context,
    updateType: 'Target Achieved',
    additionalInfo: context.additionalInfo || priceText
  });
};

export const sendStopLossTriggeredWhatsApp = (user, recommendation, context = {}) => {
  const price = context.ltp ?? context.currentPrice ?? recommendation?.currentPrice;
  const priceText = price != null && price !== ''
    ? `Current Price: ₹${Number(price).toLocaleString('en-IN')}`
    : 'Stop loss level hit';
  return sendRecommendationUpdate(user, recommendation, {
    ...context,
    updateType: 'Stop Loss Triggered',
    additionalInfo: context.additionalInfo || priceText
  });
};

export const sendRecommendationClosedWhatsApp = (user, recommendation, context = {}) =>
  sendRecommendationUpdate(user, recommendation, {
    ...context,
    updateType: 'Recommendation Closed',
    additionalInfo: context.additionalInfo || context.reason || 'Closed'
  });

/**
 * Apply a Meta webhook status event to a logged message.
 */
export const applyWhatsAppStatusEvent = async (statusEvent = {}) => {
  const messageId = statusEvent.id;
  if (!messageId) return { updated: false, reason: 'missing_id' };

  const log = await WhatsAppMessage.findOne({ messageId });
  if (!log) {
    logger.warn(`WhatsApp status for unknown messageId ${messageId}`);
    return { updated: false, reason: 'not_found', messageId };
  }

  const metaStatus = String(statusEvent.status || '').toLowerCase();
  const mapped = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed'
  }[metaStatus];

  if (!mapped) {
    return { updated: false, reason: 'ignored_status', status: metaStatus, messageId };
  }

  const err = Array.isArray(statusEvent.errors) ? statusEvent.errors[0] : null;
  const timestampMs = statusEvent.timestamp
    ? Number(statusEvent.timestamp) * 1000
    : Date.now();

  const changed = log.applyStatusUpdate({
    status: mapped,
    timestamp: new Date(timestampMs),
    errorCode: err?.code != null ? String(err.code) : null,
    errorTitle: err?.title || null,
    errorMessage: err?.message || null,
    raw: statusEvent
  });

  if (changed) {
    await log.save();
  }

  return { updated: changed, messageId, status: mapped, logId: log._id };
};

export default {
  normalizeWhatsAppPhone,
  sendWhatsAppNotification,
  sendWhatsAppNotificationSafe,
  applyWhatsAppStatusEvent
};
