import UserSubscription from '../model/UserSubscription.js';

/**
 * Adds whole months without spilling into the following month when the target
 * month is shorter — Jan 31 + 1 month lands on Feb 28, not Mar 3.
 */
export const addMonths = (date, months) => {
  const result = new Date(date);
  const requestedDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(requestedDay, daysInTargetMonth));

  return result;
};

/**
 * The date a user's paid coverage for a single plan runs out, or null when they
 * have none. Future-dated terms count, so buying the same plan three times in a
 * row keeps stacking rather than collapsing onto the same window.
 */
export const getCoverageEndForPlan = async (userId, planId, { excludeSubscriptionId = null } = {}) => {
  if (!userId || !planId) return null;

  const query = {
    user: userId,
    subscription: planId,
    status: { $in: ['active', 'pending'] }
  };

  if (excludeSubscriptionId) {
    query._id = { $ne: excludeSubscriptionId };
  }

  const latest = await UserSubscription.findOne(query)
    .sort({ endDate: -1 })
    .select('endDate')
    .lean();

  return latest?.endDate ? new Date(latest.endDate) : null;
};

/**
 * Where a newly purchased term begins: the moment existing coverage for the same
 * plan ends, or now when nothing is running.
 */
export const resolveTermStart = (coverageEnd, now = new Date()) => (
  coverageEnd && coverageEnd > now ? new Date(coverageEnd) : new Date(now)
);
