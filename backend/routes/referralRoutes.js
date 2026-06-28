import express from 'express';
const router = express.Router();

import Referral from '../model/Referral.js';
import User from '../model/User.js';
import UserSubscription from '../model/UserSubscription.js';
import Subscription from '../model/Subscription.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — referral plan details (for pricing page)
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/referrals/plan
 * Returns the referral plan's public details (name, features) — no auth required.
 */
router.get('/plan', async (_req, res) => {
  try {
    const plan = await Subscription.findOne({ isReferralPlan: true, isActive: true })
      .select('name description features')
      .lean();
    return res.json({ success: true, data: plan || null });
  } catch (err) {
    logger.error('[REFERRAL] GET plan error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   PUBLIC — validate a code (used inline in payment form)
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/referrals/validate/:code
 * Returns { valid, referrerName } — no sensitive data.
 */
router.get('/validate/:code', async (req, res) => {
  try {
    const code = req.params.code?.trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Code is required.' });

    const referrer = await User.findOne({ 'referral.code': code })
      .select('name referral.code')
      .lean();

    if (!referrer) {
      return res.json({ success: true, valid: false, message: 'Invalid referral code.' });
    }

    return res.json({
      success: true,
      valid: true,
      referrerId: referrer._id,
      referrerName: referrer.name,
      message: `Valid code! Referred by ${referrer.name}.`,
    });
  } catch (err) {
    logger.error('[REFERRAL] validate error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   USER — referral info
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/referrals/my
 * Returns the authenticated user's referral info:
 *   - their code
 *   - who referred them
 *   - list of users they referred + reward status
 *   - referral plan subscription details
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // The user document (include referral sub-doc + referral plan sub)
    const user = await User.findById(userId)
      .select('referral name')
      .populate('referral.referredBy', 'name email')
      .populate({
        path: 'referral.referralPlanSub',
        populate: { path: 'subscription', select: 'name isReferralPlan' },
      })
      .lean();

    // All people this user has referred
    const referrals = await Referral.find({ referrer: userId })
      .populate('referred', 'name email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const totalMonthsEarned = referrals.filter(r => r.status === 'rewarded').length;

    return res.json({
      success: true,
      data: {
        myCode: user.referral?.code || null,
        usedCode: user.referral?.usedCode || null,
        referredBy: user.referral?.referredBy || null,
        referralPlanSub: user.referral?.referralPlanSub || null,
        totalReferred: user.referral?.totalReferred || 0,
        unclaimedMonths: user.referral?.unclaimedMonths || 0,
        referrals,
        totalReferrals: referrals.length,
        totalRewarded: totalMonthsEarned,
      },
    });
  } catch (err) {
    logger.error('[REFERRAL] GET my error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/**
 * POST /api/referrals/claim
 * Claim all accumulated unclaimed months onto the referral plan subscription.
 * Creates the subscription if it doesn't exist yet; extends it if it does.
 */
router.post('/claim', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('referral name').lean();
    const unclaimedMonths = user?.referral?.unclaimedMonths || 0;

    if (unclaimedMonths <= 0) {
      return res.status(400).json({ success: false, error: 'No unclaimed months available.' });
    }

    const referralPlan = await Subscription.findOne({ isReferralPlan: true }).lean();
    if (!referralPlan) {
      return res.status(404).json({ success: false, error: 'Referral plan not configured. Contact support.' });
    }

    let referralSub = await UserSubscription.findOne({
      user: userId,
      subscription: referralPlan._id,
    });

    const now = new Date();

    if (!referralSub) {
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + unclaimedMonths);

      referralSub = new UserSubscription({
        user: userId,
        subscription: referralPlan._id,
        serviceType: referralPlan.serviceType || 'RA',
        status: 'active',
        startDate: now,
        endDate,
        price: 0,
        duration: 'monthly',
        durationMonths: unclaimedMonths,
        paymentMethod: 'manual',
      });
      await referralSub.save();

      await User.updateOne(
        { _id: userId },
        { $set: { 'referral.referralPlanSub': referralSub._id, 'referral.unclaimedMonths': 0 } }
      );
    } else {
      const base = referralSub.endDate > now ? new Date(referralSub.endDate) : new Date(now);
      base.setMonth(base.getMonth() + unclaimedMonths);
      referralSub.endDate = base;
      if (referralSub.status !== 'active') referralSub.status = 'active';
      await referralSub.save();

      await User.updateOne(
        { _id: userId },
        { $set: { 'referral.unclaimedMonths': 0, 'referral.referralPlanSub': referralSub._id } }
      );
    }

    logger.info(`[REFERRAL] User ${userId} claimed ${unclaimedMonths} month(s); sub ends ${referralSub.endDate}`);

    return res.json({
      success: true,
      message: `Successfully claimed ${unclaimedMonths} month${unclaimedMonths > 1 ? 's' : ''} on your referral plan.`,
      data: { referralSub, claimedMonths: unclaimedMonths },
    });
  } catch (err) {
    logger.error('[REFERRAL] claim error:', err.message, err.errors || '');
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — referral management
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/referrals/admin/all
 * All referral records with full user info.
 * Supports ?status=pending|rewarded, ?search=<name|email|code>
 */
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 30 } = req.query;

    const query = {};
    if (status && ['pending', 'rewarded'].includes(status)) query.status = status;

    let referrals = await Referral.find(query)
      .populate('referrer', 'name email referral.code referral.referralPlanSub')
      .populate('referred', 'name email createdAt')
      .populate('paymentRequestId', 'amount serviceType createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // In-memory search (small dataset)
    if (search) {
      const s = search.toLowerCase();
      referrals = referrals.filter(r =>
        r.referrer?.name?.toLowerCase().includes(s) ||
        r.referrer?.email?.toLowerCase().includes(s) ||
        r.referred?.name?.toLowerCase().includes(s) ||
        r.referred?.email?.toLowerCase().includes(s) ||
        r.referralCode?.toLowerCase().includes(s)
      );
    }

    const total = referrals.length;
    const paginated = referrals.slice((page - 1) * limit, page * limit);

    return res.json({ success: true, data: paginated, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    logger.error('[REFERRAL] Admin GET all error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/**
 * GET /api/referrals/admin/stats
 * Summary analytics for the Referrals tab header.
 */
router.get('/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const [total, rewarded] = await Promise.all([
      Referral.countDocuments(),
      Referral.countDocuments({ status: 'rewarded' }),
    ]);

    // Active referral plan subscriptions (in UserSubscription, linked to the isReferralPlan plan)
    const referralPlan = await Subscription.findOne({ isReferralPlan: true }).select('_id name').lean();
    const activeReferralPlans = referralPlan
      ? await UserSubscription.countDocuments({
          subscription: referralPlan._id,
          status: 'active',
          endDate: { $gt: new Date() },
        })
      : 0;

    // Top 5 referrers
    const topReferrers = await Referral.aggregate([
      { $match: { status: 'rewarded' } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $project: { name: '$user.name', email: '$user.email', referralCode: '$user.referral.code', count: 1 } },
    ]);

    return res.json({
      success: true,
      data: {
        totalReferrals: total,
        totalRewarded: rewarded,
        conversionRate: total > 0 ? ((rewarded / total) * 100).toFixed(1) : '0.0',
        activeReferralPlans,
        referralPlanName: referralPlan?.name || null,
        topReferrers,
      },
    });
  } catch (err) {
    logger.error('[REFERRAL] Admin stats error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

/**
 * GET /api/referrals/admin/users
 * Per-user referral summary table for admin.
 */
router.get('/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 30 } = req.query;

    // Find all users who have a referral code (i.e. all users)
    const userQuery = { 'referral.code': { $exists: true, $ne: null } };
    if (search) {
      const s = new RegExp(search, 'i');
      userQuery.$or = [{ name: s }, { email: s }, { 'referral.code': s }];
    }

    const users = await User.find(userQuery)
      .select('name email referral createdAt')
      .populate('referral.referredBy', 'name email')
      .populate({
        path: 'referral.referralPlanSub',
        select: 'status endDate startDate',
        populate: { path: 'subscription', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Attach referral counts
    const userIds = users.map(u => u._id);
    const referralCounts = await Referral.aggregate([
      { $match: { referrer: { $in: userIds } } },
      { $group: { _id: '$referrer', total: { $sum: 1 }, rewarded: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } } } },
    ]);
    const countMap = {};
    referralCounts.forEach(r => { countMap[String(r._id)] = r; });

    const result = users.map(u => ({
      ...u,
      referralStats: countMap[String(u._id)] || { total: 0, rewarded: 0 },
    }));

    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);

    return res.json({ success: true, data: paginated, total });
  } catch (err) {
    logger.error('[REFERRAL] Admin users error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error.' });
  }
});

export default router;
