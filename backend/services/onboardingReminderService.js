import User from '../model/User.js';
import logger from '../utils/logger.js';
import { sendOnboardingReminderEmail } from '../utils/emailService.js';
import { isEmailUnsubscribed } from './emailPreferenceService.js';

const SERVICE_TYPES = ['RA', 'IA'];

const normalizeServiceType = (serviceType) => {
  const normalized = String(serviceType || 'RA').toUpperCase();
  return SERVICE_TYPES.includes(normalized) ? normalized : 'RA';
};

export const getPendingOnboardingSteps = (user, serviceType = 'RA') => {
  const normalizedServiceType = normalizeServiceType(serviceType);
  const steps = [];

  const panKycComplete = user.verificationStatus?.panKyc === true || user.kycStatus?.isVerified === true;
  const phoneComplete = user.verificationStatus?.phone === true || user.profile?.phoneVerified === true;
  const esignComplete = user.verificationStatus?.esign === true;
  const serviceComplete = user.clientTypes?.[normalizedServiceType]?.isCompleted === true;

  if (!panKycComplete) steps.push('PAN / KYC verification');
  if (!phoneComplete) steps.push('Mobile number verification');
  if (!esignComplete) steps.push('E-sign agreement completion');
  if (!serviceComplete) steps.push(`${normalizedServiceType} onboarding completion`);

  return steps;
};

export const sendOnboardingReminderToUser = async (user, serviceType = 'RA', options = {}) => {
  const normalizedServiceType = normalizeServiceType(serviceType);
  const pendingSteps = getPendingOnboardingSteps(user, normalizedServiceType);

  if (pendingSteps.length === 0 && !options.force) {
    return {
      sent: false,
      skipped: true,
      serviceType: normalizedServiceType,
      pendingSteps: []
    };
  }

  await sendOnboardingReminderEmail(user, normalizedServiceType, pendingSteps, {
    allowUnsubscribed: options.allowUnsubscribed
  });

  return {
    sent: true,
    skipped: false,
    serviceType: normalizedServiceType,
    pendingSteps
  };
};

export const sendWeeklyOnboardingReminders = async () => {
  const users = await User.find({ role: 'customer' })
    .select('name email verificationStatus kycStatus.isVerified profile.phoneVerified clientTypes role')
    .lean();

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const user of users) {
    if (!user?.email) {
      skippedCount++;
      continue;
    }

    if (await isEmailUnsubscribed(user.email)) {
      skippedCount++;
      continue;
    }

    for (const serviceType of SERVICE_TYPES) {
      const pendingSteps = getPendingOnboardingSteps(user, serviceType);

      if (pendingSteps.length === 0) {
        skippedCount++;
        continue;
      }

      try {
        await sendOnboardingReminderEmail(user, serviceType, pendingSteps);
        sentCount++;
      } catch (error) {
        failedCount++;
        logger.error(`Failed to send ${serviceType} onboarding reminder to ${user.email}:`, error);
      }
    }
  }

  logger.info('Weekly onboarding reminder run complete', {
    checkedUsers: users.length,
    sentCount,
    skippedCount,
    failedCount
  });

  return {
    checkedUsers: users.length,
    sentCount,
    skippedCount,
    failedCount
  };
};

export default {
  getPendingOnboardingSteps,
  sendOnboardingReminderToUser,
  sendWeeklyOnboardingReminders
};
