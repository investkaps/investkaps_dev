import crypto from 'crypto';
import EmailUnsubscribe from '../model/EmailUnsubscribe.js';

const UN_SUBSCRIBE_SECRET = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY || 'investkaps-unsubscribe-secret';
const UNSUBSCRIBE_FRONTEND_URL = process.env.UNSUBSCRIBE_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeServiceType = (serviceType) => String(serviceType || 'RA').toUpperCase() === 'IA' ? 'IA' : 'RA';

export const createUnsubscribeToken = ({ email, serviceType = 'RA' }) => {
  const payload = {
    email: normalizeEmail(email),
    serviceType: normalizeServiceType(serviceType),
    purpose: 'email-unsubscribe',
    issuedAt: Date.now()
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', UN_SUBSCRIBE_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
};

export const verifyUnsubscribeToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', UN_SUBSCRIBE_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.purpose !== 'email-unsubscribe' || !payload.email) {
      return null;
    }

    return {
      email: normalizeEmail(payload.email),
      serviceType: normalizeServiceType(payload.serviceType),
      issuedAt: payload.issuedAt || null
    };
  } catch {
    return null;
  }
};

export const buildUnsubscribeUrl = ({ email, serviceType = 'RA' }) => {
  const token = createUnsubscribeToken({ email, serviceType });
  return `${UNSUBSCRIBE_FRONTEND_URL.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(token)}`;
};

export const isEmailUnsubscribed = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const record = await EmailUnsubscribe.findOne({ email: normalizedEmail, status: 'unsubscribed' }).select('_id');
  return !!record;
};

export const markEmailUnsubscribed = async ({ email, userId = null, reason = 'email_footer_link' }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const record = await EmailUnsubscribe.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      user: userId || null,
      status: 'unsubscribed',
      unsubscribedAt: new Date(),
      reason
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return record;
};

export const getUnsubscribeFooterHtml = ({ email, serviceType = 'RA' }) => {
  const unsubscribeUrl = buildUnsubscribeUrl({ email, serviceType });

  return `
    <div data-email-unsubscribe-footer="true" style="padding:0 0 28px;text-align:center;">
      <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
        If you no longer want these emails, you can
        <a href="${unsubscribeUrl}" style="color:#2563eb;text-decoration:underline;">unsubscribe here</a>.
      </p>
    </div>
  `;
};

export default {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
  isEmailUnsubscribed,
  markEmailUnsubscribed,
  getUnsubscribeFooterHtml
};
