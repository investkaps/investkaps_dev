import StockRecommendation from '../model/StockRecommendation.js';
import UserSubscription from '../model/UserSubscription.js';
import Subscription from '../model/Subscription.js';
import ltpService from './ltpService.js';
import { sendPriceAlertEmail } from '../utils/emailService.js';
import { isEmailUnsubscribed } from './emailPreferenceService.js';
import logger from '../utils/logger.js';

// IST offset is UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function isMarketOpen() {
  const nowUtc = Date.now();
  const nowIst = new Date(nowUtc + IST_OFFSET_MS);

  const day = nowIst.getUTCDay(); // 0=Sun 6=Sat
  if (day === 0 || day === 6) return false;

  const h = nowIst.getUTCHours();
  const m = nowIst.getUTCMinutes();
  const mins = h * 60 + m;

  // 9:15 AM – 3:30 PM IST
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

// Fetch all users subscribed to a recommendation's target strategies
async function getUsersForRecommendation(recommendation) {
  if (!recommendation.targetStrategies?.length) return [];

  const subscriptions = await Subscription.find({
    strategies: { $in: recommendation.targetStrategies }
  }).select('_id serviceType');

  if (!subscriptions.length) return [];

  const subscriptionIds = subscriptions.map(s => s._id);
  const serviceTypeMap = new Map(subscriptions.map(s => [s._id.toString(), s.serviceType || 'RA']));

  const userSubs = await UserSubscription.find({
    subscription: { $in: subscriptionIds },
    status: 'active'
  }).populate('user', 'email name').select('user subscription serviceType');

  return userSubs
    .filter(us => us.user?.email)
    .map(us => ({
      user: us.user,
      serviceType: us.serviceType || serviceTypeMap.get(us.subscription?.toString()) || 'RA'
    }));
}

async function sendAlertsToUsers(recommendation, alertType, ltp) {
  const entries = await getUsersForRecommendation(recommendation);
  let sent = 0;

  for (const { user, serviceType } of entries) {
    try {
      if (await isEmailUnsubscribed(user.email)) continue;
      await sendPriceAlertEmail(user, recommendation, alertType, ltp, serviceType);
      sent++;
    } catch (err) {
      logger.error(`Price alert email failed for ${user.email} (${alertType} ${recommendation.stockSymbol}):`, err);
    }
  }

  return sent;
}

export async function checkPriceAlerts(prices) {
  // prices: { SYMBOL: ltp } — keyed by stockSymbol (raw, same as recommendation.stockSymbol)
  if (!prices || !Object.keys(prices).length) return;

  if (!isMarketOpen()) {
    logger.info('Price alert check skipped — market closed');
    return;
  }

  // Only check published, active recommendations where at least one alert hasn't fired yet
  const recs = await StockRecommendation.find({
    status: 'published',
    isActive: { $ne: false },
    $or: [
      { 'alertFlags.target1Hit': false },
      { 'alertFlags.target2Hit': false, targetPrice2: { $exists: true, $ne: null } },
      { 'alertFlags.target3Hit': false, targetPrice3: { $exists: true, $ne: null } },
      { 'alertFlags.stopLossHit': false, stopLoss: { $exists: true, $ne: null } }
    ]
  }).select('stockSymbol exchange recommendationType targetPrice targetPrice2 targetPrice3 stopLoss currentPrice alertFlags targetStrategies stockName');

  let totalAlerts = 0;

  for (const rec of recs) {
    const ltp = prices[rec.stockSymbol];
    if (ltp == null) continue;

    const isBuy = rec.recommendationType !== 'sell';
    const updates = {};
    const alertsToSend = [];

    // For BUY: target hit when ltp >= target; stop loss hit when ltp <= stopLoss
    // For SELL: target hit when ltp <= target; stop loss hit when ltp >= stopLoss
    const targetHit  = (price) => isBuy ? ltp >= price : ltp <= price;
    const slHit      = (price) => isBuy ? ltp <= price : ltp >= price;

    if (!rec.alertFlags.target1Hit && rec.targetPrice && targetHit(rec.targetPrice)) {
      updates['alertFlags.target1Hit'] = true;
      alertsToSend.push('target1');
      // Deactivate if target1 is the final target set
      if (!rec.targetPrice2 && !rec.targetPrice3) updates['isActive'] = false;
    }
    if (!rec.alertFlags.target2Hit && rec.targetPrice2 && targetHit(rec.targetPrice2)) {
      updates['alertFlags.target2Hit'] = true;
      alertsToSend.push('target2');
      // Deactivate if target2 is the final target set
      if (!rec.targetPrice3) updates['isActive'] = false;
    }
    if (!rec.alertFlags.target3Hit && rec.targetPrice3 && targetHit(rec.targetPrice3)) {
      updates['alertFlags.target3Hit'] = true;
      alertsToSend.push('target3');
      // target3 is always the final target
      updates['isActive'] = false;
    }
    if (!rec.alertFlags.stopLossHit && rec.stopLoss && slHit(rec.stopLoss)) {
      updates['alertFlags.stopLossHit'] = true;
      alertsToSend.push('stopLoss');
      // Stop loss hit always deactivates the recommendation
      updates['isActive'] = false;
    }

    if (!alertsToSend.length) continue;

    // Mark flags immediately so concurrent runs don't double-send
    await StockRecommendation.updateOne({ _id: rec._id }, { $set: updates });

    for (const alertType of alertsToSend) {
      const sent = await sendAlertsToUsers(rec, alertType, ltp);
      logger.info(`Price alert [${alertType}] for ${rec.stockSymbol} @ ₹${ltp} — sent to ${sent} user(s)`);
      totalAlerts += sent;
    }
  }

  if (totalAlerts > 0) {
    logger.info(`Price alert run complete — ${totalAlerts} alert email(s) sent`);
  }
}
