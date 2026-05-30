import nodemailer from 'nodemailer';
import logger from './logger.js';
import { getUnsubscribeFooterHtml, isEmailUnsubscribed } from '../services/emailPreferenceService.js';

// Create a transporter (lazy initialization)
const transporters = new Map();

const SERVICE_TYPES = ['RA', 'IA'];

const normalizeServiceType = (serviceType) => {
  const normalized = String(serviceType || 'RA').toUpperCase();
  return SERVICE_TYPES.includes(normalized) ? normalized : 'RA';
};

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  const unquoted = trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  return unquoted.trim();
};

const getMailProfile = (serviceType = 'RA') => {
  const normalizedServiceType = normalizeServiceType(serviceType);

  if (normalizedServiceType === 'IA') {
    return {
      serviceType: normalizedServiceType,
      host: normalizeEnvValue(process.env.SMTP_HOST_IA || process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com'),
      port: Number(normalizeEnvValue(process.env.SMTP_PORT_IA || process.env.SMTP_PORT || process.env.EMAIL_PORT)) || 587,
      secure: normalizeEnvValue(process.env.EMAIL_SECURE_IA) === 'true' || normalizeEnvValue(process.env.EMAIL_SECURE) === 'true',
      user: normalizeEnvValue(process.env.SMTP_USER_IA || process.env.SMTP_USER || process.env.EMAIL_USER),
      pass: normalizeEnvValue(process.env.SMTP_PASS_IA || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD),
      from: normalizeEnvValue(process.env.SMTP_FROM_IA || process.env.EMAIL_FROM || 'InvestKaps IA <noreply@investkaps.com>')
    };
  }

  return {
    serviceType: normalizedServiceType,
    host: normalizeEnvValue(process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com'),
    port: Number(normalizeEnvValue(process.env.EMAIL_PORT || process.env.SMTP_PORT)) || 587,
    secure: normalizeEnvValue(process.env.EMAIL_SECURE) === 'true' || normalizeEnvValue(process.env.EMAIL_SECURE_IA) === 'true',
    user: normalizeEnvValue(process.env.EMAIL_USER || process.env.SMTP_USER || process.env.SMTP_USER_IA),
    pass: normalizeEnvValue(process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASS_IA),
    from: normalizeEnvValue(process.env.EMAIL_FROM || process.env.SMTP_FROM_IA || 'InvestKaps <noreply@investkaps.com>')
  };
};

const getDefaultCc = (serviceType = 'RA') => {
  const normalizedServiceType = normalizeServiceType(serviceType);

  if (normalizedServiceType === 'IA') {
    return normalizeEnvValue(process.env.SMTP_USER_IA || process.env.EMAIL_USER);
  }

  return normalizeEnvValue(process.env.EMAIL_USER || process.env.SMTP_USER_IA);
};

const getTransporter = (serviceType = 'RA') => {
  const normalizedServiceType = normalizeServiceType(serviceType);

  if (!transporters.has(normalizedServiceType)) {
    const mailProfile = getMailProfile(normalizedServiceType);

    transporters.set(normalizedServiceType, nodemailer.createTransport({
      host: mailProfile.host,
      port: mailProfile.port,
      secure: mailProfile.secure,
      auth: {
        user: mailProfile.user,
        pass: mailProfile.pass
      }
    }));
  }

  return transporters.get(normalizedServiceType);
};

// Send email function
const sendEmail = async (options) => {
  try {
    const serviceType = normalizeServiceType(options.serviceType);
    const mailProfile = getMailProfile(serviceType);
    const recipientEmail = String(options.to || '').trim().toLowerCase();

    if (recipientEmail && !options.allowUnsubscribed) {
      const unsubscribed = await isEmailUnsubscribed(recipientEmail);
      if (unsubscribed) {
        throw new Error('Recipient has unsubscribed from InvestKaps emails');
      }
    }

    const from = normalizeEnvValue(options.from || mailProfile.from);
    const unsubscribeFooter = recipientEmail
      ? getUnsubscribeFooterHtml({ email: recipientEmail, serviceType })
      : '';

    const html = String(options.html || '');
    const htmlWithFooter = html.includes('data-email-unsubscribe-footer-slot="true"')
      ? html.replace('<div data-email-unsubscribe-footer-slot="true"></div>', unsubscribeFooter)
      : html.includes('</body>')
        ? html.replace('</body>', `${unsubscribeFooter}</body>`)
        : `${html}${unsubscribeFooter}`;
    
    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      html: htmlWithFooter
    };

    if (options.cc) {
      mailOptions.cc = options.cc;
    } else {
      const defaultCc = getDefaultCc(serviceType);
      if (defaultCc) {
        mailOptions.cc = defaultCc;
      }
    }
    
    // Add CC if provided
    if (options.cc) {
      mailOptions.cc = options.cc;
    }
    
    // Add BCC if provided
    if (options.bcc) {
      mailOptions.bcc = options.bcc;
    }
    
    // Add attachments if provided
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
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

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML helpers
// ─────────────────────────────────────────────────────────────────────────────
const wrap = (body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InvestKaps</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 36px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">InvestKaps</h1>
            <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Smart Investing, Smarter Returns</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;">${body}<div data-email-unsubscribe-footer-slot="true"></div></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const badge = (text, color, bg) =>
  `<span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;color:${color};background:${bg};">${text}</span>`;

const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#2563eb;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${text}</a>`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Payment request RECEIVED  (sent to user on submission)
// ─────────────────────────────────────────────────────────────────────────────
const sendPaymentRequestReceivedEmail = async (user, paymentRequest, options = {}) => {
  const serviceType = normalizeServiceType(paymentRequest?.serviceType);
  const html = wrap(`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">Payment Request Received</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${user.name || user.email}, we've received your payment request and it is currently under review.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Payment Details</p>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr><td style="color:#475569;font-size:13px;">Plan</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${paymentRequest.planName || 'N/A'}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Amount</td><td style="color:#1e293b;font-size:13px;font-weight:600;">₹${paymentRequest.amount}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Duration</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${paymentRequest.duration}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Transaction ID</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${paymentRequest.transactionId}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Status</td><td>${badge('Pending Review', '#92400e', '#fef3c7')}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Our team will verify your payment and activate your subscription within <strong>24 hours</strong>. You'll receive another email once it's processed.</p>
  `);

  return sendEmail({
    to: user.email,
    subject: '✅ Payment Request Received — InvestKaps',
    html,
    serviceType,
    allowUnsubscribed: options.allowUnsubscribed
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Payment request APPROVED  (sent to user)
// ─────────────────────────────────────────────────────────────────────────────
const sendPaymentApprovedEmail = async (user, paymentRequest, userSubscription, options = {}) => {
  const serviceType = normalizeServiceType(userSubscription?.serviceType || paymentRequest?.serviceType);
  const endDate = userSubscription?.endDate
    ? new Date(userSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';

  const html = wrap(`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">🎉 Payment Approved!</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${user.name || user.email}, your payment has been verified and your subscription is now <strong>active</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:20px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 8px;font-size:13px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Subscription Activated</p>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr><td style="color:#475569;font-size:13px;">Plan</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${paymentRequest.planName || 'N/A'}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Amount Paid</td><td style="color:#1e293b;font-size:13px;font-weight:600;">₹${paymentRequest.amount}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Duration</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${paymentRequest.duration}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Valid Until</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${endDate}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Status</td><td>${badge('Active', '#15803d', '#dcfce7')}</td></tr>
        </table>
      </td></tr>
    </table>

    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Log in to your dashboard to view stock recommendations, manage your account, and explore all plan features.</p>
    ${btn('Go to Dashboard', (process.env.FRONTEND_URL || 'https://investkaps.com') + '/dashboard')}
  `);

  return sendEmail({
    to: user.email,
    subject: '🎉 Payment Approved — Your Subscription is Active!',
    html,
    serviceType,
    allowUnsubscribed: options.allowUnsubscribed
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Payment request REJECTED  (sent to user)
// ─────────────────────────────────────────────────────────────────────────────
const sendPaymentRejectedEmail = async (user, paymentRequest, options = {}) => {
  const serviceType = normalizeServiceType(paymentRequest?.serviceType);
  const html = wrap(`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">Payment Request Update</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${user.name || user.email}, unfortunately your payment request could not be verified.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border:1px solid #fecaca;border-radius:10px;margin-bottom:20px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 8px;font-size:13px;color:#dc2626;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Request Details</p>
        <table width="100%" cellpadding="4" cellspacing="0">
          <tr><td style="color:#475569;font-size:13px;">Plan</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${paymentRequest.planName || 'N/A'}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Amount</td><td style="color:#1e293b;font-size:13px;font-weight:600;">₹${paymentRequest.amount}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Transaction ID</td><td style="color:#1e293b;font-size:13px;font-weight:600;">${paymentRequest.transactionId}</td></tr>
          <tr><td style="color:#475569;font-size:13px;">Status</td><td>${badge('Rejected', '#991b1b', '#fee2e2')}</td></tr>
          ${paymentRequest.adminNotes ? `<tr><td style="color:#475569;font-size:13px;vertical-align:top;">Reason</td><td style="color:#1e293b;font-size:13px;">${paymentRequest.adminNotes}</td></tr>` : ''}
        </table>
      </td></tr>
    </table>

    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">If you believe this is a mistake, please contact our support team with your transaction details. Alternatively, you can retry the payment from our pricing page.</p>
    ${btn('View Plans', (process.env.FRONTEND_URL || 'https://investkaps.com') + '/pricing')}
  `);

  return sendEmail({
    to: user.email,
    subject: '⚠️ Payment Request Update — InvestKaps',
    html,
    serviceType,
    allowUnsubscribed: options.allowUnsubscribed
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. NEW stock recommendation  (bulk — one per subscribed user)
// ─────────────────────────────────────────────────────────────────────────────
const sendNewRecommendationEmail = async (user, recommendation, serviceType = 'RA', options = {}) => {
  const normalizedServiceType = normalizeServiceType(serviceType);
  const typeColor = recommendation.recommendationType === 'buy'
    ? { text: '#15803d', bg: '#dcfce7' }
    : recommendation.recommendationType === 'sell'
    ? { text: '#b91c1c', bg: '#fee2e2' }
    : { text: '#92400e', bg: '#fef3c7' };

  const html = wrap(`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">📈 New Stock Recommendation</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${user.name || user.email}, a new recommendation has just been published for your plan.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:10px;margin-bottom:20px;">
      <tr><td style="padding:22px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td><p style="margin:0;color:#bfdbfe;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Stock</p>
                <p style="margin:4px 0 0;color:#ffffff;font-size:24px;font-weight:700;">${recommendation.stockSymbol}</p>
                <p style="margin:2px 0 0;color:#93c5fd;font-size:13px;">${recommendation.stockName}</p></td>
            <td align="right" valign="top">${badge(recommendation.recommendationType.toUpperCase(), typeColor.text, typeColor.bg)}</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
          <tr>
            <td style="text-align:center;border-right:1px solid rgba(255,255,255,.15);">
              <p style="margin:0;color:#bfdbfe;font-size:11px;font-weight:600;text-transform:uppercase;">LTP</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:18px;font-weight:700;">₹${recommendation.currentPrice}</p>
            </td>
            <td style="text-align:center;border-right:1px solid rgba(255,255,255,.15);">
              <p style="margin:0;color:#bfdbfe;font-size:11px;font-weight:600;text-transform:uppercase;">Target</p>
              <p style="margin:4px 0 0;color:#6ee7b7;font-size:18px;font-weight:700;">₹${recommendation.targetPrice}</p>
            </td>
            <td style="text-align:center;">
              <p style="margin:0;color:#bfdbfe;font-size:11px;font-weight:600;text-transform:uppercase;">Stop Loss</p>
              <p style="margin:4px 0 0;color:#fca5a5;font-size:18px;font-weight:700;">₹${recommendation.stopLoss || 'N/A'}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    ${recommendation.description ? `<p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.7;"><strong style="color:#1e293b;">Summary: </strong>${recommendation.description}</p>` : ''}
    <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;">Timeframe: <strong>${(recommendation.timeFrame || '').replace('_', ' ').toUpperCase()}</strong> &nbsp;|&nbsp; Risk: <strong>${(recommendation.riskLevel || '').toUpperCase()}</strong></p>
    ${btn('View on Dashboard', (process.env.FRONTEND_URL || 'https://investkaps.com') + '/dashboard')}
    <p style="margin:20px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;">This is for informational purposes only and not financial advice. Investments are subject to market risks.</p>
  `);

  return sendEmail({
    to: user.email,
    subject: `📈 New Recommendation: ${recommendation.stockSymbol} — InvestKaps`,
    html,
    serviceType: normalizedServiceType,
    allowUnsubscribed: options.allowUnsubscribed
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. UPDATED stock recommendation  (bulk — one per subscribed user)
// ─────────────────────────────────────────────────────────────────────────────
const sendUpdatedRecommendationEmail = async (user, recommendation, serviceType = 'RA', options = {}) => {
  const normalizedServiceType = normalizeServiceType(serviceType);
  const typeColor = recommendation.recommendationType === 'buy'
    ? { text: '#15803d', bg: '#dcfce7' }
    : recommendation.recommendationType === 'sell'
    ? { text: '#b91c1c', bg: '#fee2e2' }
    : { text: '#92400e', bg: '#fef3c7' };

  const html = wrap(`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">🔄 Recommendation Updated</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${user.name || user.email}, an existing recommendation has been updated with the latest data.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:10px;margin-bottom:20px;">
      <tr><td style="padding:22px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td><p style="margin:0;color:#ddd6fe;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Stock — Updated</p>
                <p style="margin:4px 0 0;color:#ffffff;font-size:24px;font-weight:700;">${recommendation.stockSymbol}</p>
                <p style="margin:2px 0 0;color:#c4b5fd;font-size:13px;">${recommendation.stockName}</p></td>
            <td align="right" valign="top">${badge(recommendation.recommendationType.toUpperCase(), typeColor.text, typeColor.bg)}</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
          <tr>
            <td style="text-align:center;border-right:1px solid rgba(255,255,255,.15);">
              <p style="margin:0;color:#ddd6fe;font-size:11px;font-weight:600;text-transform:uppercase;">LTP</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:18px;font-weight:700;">₹${recommendation.currentPrice}</p>
            </td>
            <td style="text-align:center;border-right:1px solid rgba(255,255,255,.15);">
              <p style="margin:0;color:#ddd6fe;font-size:11px;font-weight:600;text-transform:uppercase;">Target</p>
              <p style="margin:4px 0 0;color:#6ee7b7;font-size:18px;font-weight:700;">₹${recommendation.targetPrice}</p>
            </td>
            <td style="text-align:center;">
              <p style="margin:0;color:#ddd6fe;font-size:11px;font-weight:600;text-transform:uppercase;">Stop Loss</p>
              <p style="margin:4px 0 0;color:#fca5a5;font-size:18px;font-weight:700;">₹${recommendation.stopLoss || 'N/A'}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    ${recommendation.description ? `<p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.7;"><strong style="color:#1e293b;">Summary: </strong>${recommendation.description}</p>` : ''}
    ${btn('View on Dashboard', (process.env.FRONTEND_URL || 'https://investkaps.com') + '/dashboard')}
    <p style="margin:20px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;">This is for informational purposes only and not financial advice. Investments are subject to market risks.</p>
  `);

  return sendEmail({
    to: user.email,
    subject: `🔄 Updated Recommendation: ${recommendation.stockSymbol} — InvestKaps`,
    html,
    serviceType: normalizedServiceType,
    allowUnsubscribed: options.allowUnsubscribed
  });
};

const sendOnboardingReminderEmail = async (user, serviceType = 'RA', pendingSteps = [], options = {}) => {
  const normalizedServiceType = normalizeServiceType(serviceType);
  const serviceLabel = normalizedServiceType === 'IA' ? 'IA' : 'RA';
  const dashboardUrl = `${process.env.FRONTEND_URL || 'https://investkaps.com'}/dashboard`;
  const stepsList = pendingSteps.length
    ? pendingSteps.map(step => `<li style="margin-bottom:8px;">${step}</li>`).join('')
    : '<li style="margin-bottom:8px;">Complete your pending onboarding steps</li>';

  const html = wrap(`
    <h2 style="margin:0 0 6px;color:#1e293b;font-size:20px;">${serviceLabel} Onboarding Reminder</h2>
    <p style="margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;">Hi ${user.name || user.email}, we noticed that your ${serviceLabel} onboarding is still incomplete.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;">
      <tr><td style="padding:18px 22px;">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Pending Steps</p>
        <ul style="margin:0;padding-left:20px;color:#1e293b;font-size:14px;line-height:1.7;">${stepsList}</ul>
      </td></tr>
    </table>

    <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.7;">Please complete the remaining steps from your dashboard using the button below.</p>
    <p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.7;">If you have already completed these steps, kindly ignore this email.</p>
    ${btn('Open Dashboard', dashboardUrl)}
  `);

  return sendEmail({
    to: user.email,
    subject: `${serviceLabel} Onboarding Reminder — InvestKaps`,
    html,
    serviceType: normalizedServiceType,
    allowUnsubscribed: options.allowUnsubscribed
  });
};

export {
  sendEmail,
  sendPaymentRequestReceivedEmail,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendNewRecommendationEmail,
  sendUpdatedRecommendationEmail,
  sendOnboardingReminderEmail
};
