import User from '../model/User.js';
import logger from '../utils/logger.js';
import {
  sendEmail,
  sendPaymentRequestReceivedEmail,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail,
  sendNewRecommendationEmail,
  sendUpdatedRecommendationEmail,
} from '../utils/emailService.js';
import notificationService from '../utils/notificationService.js';
import { sendQuestionnaireResultsEmail } from '../utils/questionnaireEmailService.js';
import { isEmailUnsubscribed } from './emailPreferenceService.js';

const SERVICE_TYPES = ['RA', 'IA'];

const normalizeServiceType = (serviceType) => {
  const normalized = String(serviceType || 'RA').toUpperCase();
  return SERVICE_TYPES.includes(normalized) ? normalized : 'RA';
};

const buildSampleQuestionnaireData = () => ({
  questionnaire: {
    title: 'Risk Profile Questionnaire',
    riskProfileThresholds: [
      { profileName: 'Conservative', minPoints: 0, maxPoints: 30, description: 'Prefers capital preservation.' },
      { profileName: 'Moderate', minPoints: 31, maxPoints: 60, description: 'Balanced risk and return.' },
      { profileName: 'Aggressive', minPoints: 61, maxPoints: 100, description: 'Higher risk tolerance.' }
    ]
  },
  riskProfile: 'Moderate',
  sectionResponses: [
    {
      sectionName: 'Sample Section',
      answers: [
        { questionText: 'How do you feel about risk?', selectedOptionText: 'I prefer moderate risk.' },
        { questionText: 'What is your horizon?', selectedOptionText: '3-5 years' }
      ]
    }
  ]
});

const sampleQuestionnaireData = buildSampleQuestionnaireData();

const buildSampleResponseData = () => ({
  questionnaire: sampleQuestionnaireData.questionnaire,
  riskProfile: 'Moderate',
  sectionResponses: sampleQuestionnaireData.sectionResponses
});

const buildSampleRecommendation = () => ({
  title: 'Sample Recommendation',
  stockSymbol: 'TCS',
  stockName: 'Tata Consultancy Services',
  currentPrice: 3925.5,
  targetPrice: 4200,
  stopLoss: 3750,
  recommendationType: 'buy',
  timeFrame: 'medium_term',
  description: 'This is a sample stock recommendation for testing.',
  rationale: 'Sample rationale for testing the mail template.',
  riskLevel: 'moderate'
});

const buildSamplePaymentRequest = (serviceType, status = 'received') => {
  const paymentRequest = {
    serviceType,
    planName: serviceType === 'IA' ? 'IA Starter' : 'RA Starter',
    amount: serviceType === 'IA' ? 2499 : 1999,
    duration: serviceType === 'IA' ? 'IA Onboarding' : 'Monthly',
    transactionId: `TEST-${status.toUpperCase()}-${Date.now()}`,
    adminNotes: 'Sample test mail generated from admin settings.'
  };

  return paymentRequest;
};

const buildSampleSubscription = (serviceType) => ({
  name: serviceType === 'IA' ? 'IA Growth Plan' : 'RA Growth Plan',
  serviceType,
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});

const buildSampleUserSubscription = (serviceType) => ({
  serviceType,
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});

const buildGenericHtml = (title, lines) => `
  <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;">${title}</h2>
  ${lines.map((line) => `<p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">${line}</p>`).join('')}
`;

const mailTypeLabels = {
  'test-email': 'Test Email',
  'payment-request-received': 'Payment Request Received',
  'payment-approved': 'Payment Approved',
  'payment-rejected': 'Payment Rejected',
  'subscription-expiring-soon': 'Subscription Expiring Soon',
  'subscription-expired': 'Subscription Expired',
  'new-recommendation': 'New Recommendation',
  'updated-recommendation': 'Updated Recommendation',
  'questionnaire-results': 'Questionnaire Results',
  'legacy-recommendation-notification': 'Recommendation Notification (Legacy)'
};

const getMailTypeOptions = () => Object.entries(mailTypeLabels).map(([value, label]) => ({ value, label }));

const buildMailPreviewPath = () => '/api/admin/mail/send';

const sendAdminMail = async ({ userId, mailType, serviceType = 'RA' }) => {
  const normalizedMailType = String(mailType || '').trim();
  if (!normalizedMailType) {
    throw new Error('mailType is required');
  }

  const normalizedServiceType = normalizeServiceType(serviceType);
  const user = await User.findById(userId).select('name email verificationStatus kycStatus.isVerified profile.phoneVerified clientTypes role');

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.email) {
    throw new Error('User does not have an email address');
  }

  const subjectPrefix = `${mailTypeLabels[normalizedMailType] || normalizedMailType} — InvestKaps`;
  const unsubscribed = await isEmailUnsubscribed(user.email);
  const warning = unsubscribed
    ? 'Recipient has unsubscribed. Mail will still be sent because admin override is enabled.'
    : null;

  switch (normalizedMailType) {
    case 'test-email': {
      await sendEmail({
        to: user.email,
        subject: `Test Email from Admin Panel — ${normalizedServiceType}`,
        serviceType: normalizedServiceType,
        allowUnsubscribed: true,
        html: buildGenericHtml('Test Email from Admin Panel', [
          `Hello ${user.name || 'there'},`,
          'This is a basic test email sent from the admin settings tab.',
          `Service type: <strong>${normalizedServiceType}</strong>`,
          'If you received this message, the mail setup is working.'
        ])
      });
      break;
    }

    case 'payment-request-received': {
      await sendPaymentRequestReceivedEmail(user, buildSamplePaymentRequest(normalizedServiceType, 'received'), { allowUnsubscribed: true });
      break;
    }

    case 'payment-approved': {
      const paymentRequest = buildSamplePaymentRequest(normalizedServiceType, 'approved');
      await sendPaymentApprovedEmail(user, paymentRequest, buildSampleUserSubscription(normalizedServiceType), { allowUnsubscribed: true });
      break;
    }

    case 'payment-rejected': {
      await sendPaymentRejectedEmail(user, buildSamplePaymentRequest(normalizedServiceType, 'rejected'), { allowUnsubscribed: true });
      break;
    }

    case 'subscription-expiring-soon': {
      await notificationService.sendExpirationReminder(user, buildSampleSubscription(normalizedServiceType), normalizedServiceType, { allowUnsubscribed: true });
      break;
    }

    case 'subscription-expired': {
      await sendEmail({
        to: user.email,
        subject: subjectPrefix,
        serviceType: normalizedServiceType,
        allowUnsubscribed: true,
        html: buildGenericHtml('Subscription Expired', [
          `Hi ${user.name || 'there'},`,
          `Your sample ${normalizedServiceType} subscription has expired.`,
          'Please renew to continue using the service.',
          'Kindly ignore this email if this was already handled.'
        ])
      });
      break;
    }

    case 'new-recommendation': {
      await sendNewRecommendationEmail(user, buildSampleRecommendation(), normalizedServiceType, { allowUnsubscribed: true });
      break;
    }

    case 'updated-recommendation': {
      await sendUpdatedRecommendationEmail(user, buildSampleRecommendation(), normalizedServiceType, { allowUnsubscribed: true });
      break;
    }

    case 'questionnaire-results': {
      await sendQuestionnaireResultsEmail(user.email, user.name || user.email, buildSampleQuestionnaireData(), buildSampleResponseData(), { allowUnsubscribed: true });
      return {
        message: `Questionnaire results email sent to ${user.email}`,
        mailType: normalizedMailType,
        serviceType: 'IA',
        warning
      };
    }

    case 'legacy-recommendation-notification': {
      await notificationService.sendRecommendationNotification(user, buildSampleRecommendation(), normalizedServiceType, { allowUnsubscribed: true });
      break;
    }

    default:
      throw new Error(`Unsupported mail type: ${normalizedMailType}`);
  }

  logger.info('Admin mail sent', {
    userId: String(user._id),
    email: user.email,
    mailType: normalizedMailType,
    serviceType: normalizedServiceType
  });

  return {
    message: `${mailTypeLabels[normalizedMailType] || normalizedMailType} sent to ${user.email}`,
    mailType: normalizedMailType,
    serviceType: normalizedServiceType,
    warning
  };
};

export {
  getMailTypeOptions,
  buildMailPreviewPath,
  sendAdminMail
};

export default {
  getMailTypeOptions,
  buildMailPreviewPath,
  sendAdminMail
};
