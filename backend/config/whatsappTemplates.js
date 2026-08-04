/**
 * WhatsApp template registry (8 Meta templates).
 *
 * `templateName` must match an approved Meta template. Rename here without
 * changing call sites. `bodyParams(ctx)` returns ordered body placeholder strings.
 */

const text = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const money = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : text(value);
};

const dateStr = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return text(value);
  }
};

const sideLabel = (value) => {
  const raw = String(value || 'buy').toLowerCase();
  if (raw === 'sell') return 'Sell';
  if (raw === 'buy') return 'Buy';
  return text(value, 'Buy');
};

const WHATSAPP_TEMPLATES = {
  welcome: {
    key: 'welcome',
    templateName: 'ik_welcome',
    language: 'en',
    enabled: true,
    category: 'onboarding',
    bodyParams: (ctx = {}) => [
      text(ctx.userName || ctx.name, 'Investor')
    ]
  },

  subscription_activated: {
    key: 'subscription_activated',
    templateName: 'ik_subscription_activated',
    language: 'en',
    enabled: true,
    category: 'subscription',
    bodyParams: (ctx = {}) => [
      text(ctx.userName, 'Investor'),
      text(ctx.planName, 'your plan'),
      text(ctx.duration, '-'),
      dateStr(ctx.endDate)
    ]
  },

  payment_successful: {
    key: 'payment_successful',
    templateName: 'ik_payment_successful',
    language: 'en',
    enabled: true,
    category: 'subscription',
    bodyParams: (ctx = {}) => [
      text(ctx.userName, 'Investor'),
      money(ctx.amount),
      text(ctx.planName, 'your plan'),
      text(ctx.transactionId, '-')
    ]
  },

  payment_failed: {
    key: 'payment_failed',
    templateName: 'ik_payment_failed',
    language: 'en',
    enabled: true,
    category: 'subscription',
    bodyParams: (ctx = {}) => [
      text(ctx.userName, 'Investor'),
      money(ctx.amount),
      text(ctx.planName, 'your plan'),
      text(ctx.reason || ctx.adminNotes, 'Payment could not be verified')
    ]
  },

  // {{1}} name, {{2}} plan, {{3}} days remaining, {{4}} expiry date
  subscription_expiring: {
    key: 'subscription_expiring',
    templateName: 'ik_subscription_expiring',
    language: 'en',
    enabled: true,
    category: 'subscription',
    bodyParams: (ctx = {}) => [
      text(ctx.userName, 'Investor'),
      text(ctx.planName, 'your plan'),
      text(ctx.daysRemaining, '7'),
      dateStr(ctx.endDate)
    ]
  },

  // {{1}} name, {{2}} message, {{3}} plan
  subscription_renewal: {
    key: 'subscription_renewal',
    templateName: 'ik_subscription_renewal',
    language: 'en',
    enabled: true,
    category: 'subscription',
    bodyParams: (ctx = {}) => [
      text(ctx.userName, 'Investor'),
      text(ctx.message, 'Your subscription has expired.'),
      text(ctx.planName, 'your plan')
    ]
  },

  // Teaser only — no entry/target/SL levels on WhatsApp
  // {{1}} name, {{2}} stock, {{3}} Buy/Sell
  recommendation_new: {
    key: 'recommendation_new',
    templateName: 'ik_recommendation_new',
    language: 'en',
    enabled: true,
    category: 'recommendation',
    bodyParams: (ctx = {}) => [
      text(ctx.userName, 'Investor'),
      text(ctx.stockSymbol),
      sideLabel(ctx.recommendationType)
    ]
  },

  // {{1}} name, {{2}} update type, {{3}} stock, {{4}} additional info
  recommendation_update: {
    key: 'recommendation_update',
    templateName: 'ik_recommendation_update',
    language: 'en',
    enabled: true,
    category: 'recommendation',
    bodyParams: (ctx = {}) => [
      text(ctx.userName, 'Investor'),
      text(ctx.updateType, 'Recommendation Updated'),
      text(ctx.stockSymbol),
      text(ctx.additionalInfo, 'Please log in for details')
    ]
  }
};

export const WHATSAPP_NOTIFICATION_TYPES = Object.keys(WHATSAPP_TEMPLATES);

export const getWhatsAppTemplate = (notificationType) => {
  const entry = WHATSAPP_TEMPLATES[notificationType];
  if (!entry) return null;
  return entry;
};

export const listWhatsAppTemplates = () =>
  Object.values(WHATSAPP_TEMPLATES).map(({ key, templateName, language, enabled, category }) => ({
    key,
    templateName,
    language,
    enabled,
    category
  }));

export default WHATSAPP_TEMPLATES;
