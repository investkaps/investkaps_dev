import express from 'express';
const router = express.Router();

import Testimonial from '../model/Testimonial.js';
import User from '../model/User.js';
import UserSubscription from '../model/UserSubscription.js';
import PaymentRequest from '../model/PaymentRequest.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';

/* ═══════════════════════════════════════════════════════════════
   PUBLIC  — no auth required
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/testimonials
 * Returns only approved + showOnHome testimonials, sorted by displayOrder.
 * Used by the home page marquee — no auth needed.
 */
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ status: 'approved', showOnHome: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select('name occupation text source displayOrder createdAt')
      .lean();

    return res.json({ success: true, data: testimonials });
  } catch (err) {
    logger.error('[TESTIMONIALS] GET public list error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   USER  — requires auth
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/testimonials/my
 * Returns the authenticated user's own testimonial (if submitted).
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const testimonial = await Testimonial.findOne({ user: req.user.id }).lean();
    return res.json({ success: true, data: testimonial || null });
  } catch (err) {
    logger.error('[TESTIMONIALS] GET my error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/testimonials
 * Submit a testimonial.
 *
 * Eligibility:
 *  - RA client  → must have an active UserSubscription (serviceType: 'RA')
 *  - IA client  → must have an approved PaymentRequest  (serviceType: 'IA')
 *  - Either way → must also have verificationStatus.esign = true (e-sign done)
 *
 * One testimonial per user (the unique index on `user` also enforces this at DB level).
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, occupation, text } = req.body;
    // Users may optionally request to be shown on home page; admin still approves.
    const requestedShowOnHome = req.body.requestedShowOnHome === true;

    // ── Basic validation ──
    if (!name?.trim() || !occupation?.trim() || !text?.trim()) {
      return res.status(400).json({ success: false, error: 'name, occupation and text are all required.' });
    }
    if (text.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Testimonial must be at least 20 characters.' });
    }
    if (text.trim().length > 1000) {
      return res.status(400).json({ success: false, error: 'Testimonial cannot exceed 1000 characters.' });
    }

    // ── Already submitted? ──
    const existing = await Testimonial.findOne({ user: userId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a testimonial. Submissions cannot be edited.',
      });
    }

    // ── Fetch user for eligibility check ──
    const user = await User.findById(userId).select('verificationStatus clientTypes').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    // ── Must have completed e-sign ──
    if (!user.verificationStatus?.esign) {
      return res.status(403).json({
        success: false,
        error: 'You must complete onboarding (e-sign) before submitting a testimonial.',
      });
    }

    // ── Service-type eligibility ──
    const isRA = user.clientTypes?.RA?.isCompleted === true;
    const isIA = user.clientTypes?.IA?.isCompleted === true;

    let eligible = false;
    let eligibilityReason = '';

    if (isRA) {
      // RA: must have an active subscription
      const activeSub = await UserSubscription.findOne({
        user: userId,
        serviceType: 'RA',
        status: 'active',
        endDate: { $gt: new Date() },
      }).lean();

      if (activeSub) {
        eligible = true;
      } else {
        eligibilityReason = 'RA clients must have an active subscription plan to submit a testimonial.';
      }
    }

    if (!eligible && isIA) {
      // IA: must have at least one approved payment request
      const approvedPayment = await PaymentRequest.findOne({
        user: userId,
        serviceType: 'IA',
        status: 'approved',
      }).lean();

      if (approvedPayment) {
        eligible = true;
      } else {
        eligibilityReason = 'IA clients must have an approved payment request to submit a testimonial.';
      }
    }

    if (!eligible) {
      return res.status(403).json({
        success: false,
        error: eligibilityReason || 'You are not yet eligible to submit a testimonial.',
      });
    }

    // ── Create ──
    const testimonial = await Testimonial.create({
      source: 'user',
      user: userId,
      name: name.trim(),
      occupation: occupation.trim(),
      text: text.trim(),
      requestedShowOnHome: requestedShowOnHome,
    });

    logger.info(`[TESTIMONIALS] User ${userId} submitted testimonial ${testimonial._id}`);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your testimonial has been submitted and is pending review.',
      data: testimonial,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a testimonial. Submissions cannot be edited.',
      });
    }
    logger.error('[TESTIMONIALS] POST submit error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN  — requires auth + admin role
   ═══════════════════════════════════════════════════════════════ */

/**
 * GET /api/testimonials/admin/all
 * Returns ALL testimonials with user info, sorted newest first.
 */
router.get('/admin/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const testimonials = await Testimonial.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, count: testimonials.length, data: testimonials });
  } catch (err) {
    logger.error('[TESTIMONIALS] Admin GET all error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/testimonials/admin
 * Admin creates a custom testimonial (not linked to any user account).
 */
router.post('/admin', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, occupation, text, showOnHome, displayOrder } = req.body;

    if (!name?.trim() || !occupation?.trim() || !text?.trim()) {
      return res.status(400).json({ success: false, error: 'name, occupation and text are required.' });
    }

    const testimonial = await Testimonial.create({
      source: 'admin',
      user: null,
      name: name.trim(),
      occupation: occupation.trim(),
      text: text.trim(),
      status: 'approved',         // Admin-created are auto-approved
      showOnHome: showOnHome === true,
      displayOrder: typeof displayOrder === 'number' ? displayOrder : 9999,
    });

    return res.status(201).json({ success: true, data: testimonial });
  } catch (err) {
    logger.error('[TESTIMONIALS] Admin POST create error:', err.message, err);
    // Return more detailed error information for debugging
    const errorMsg = err.message || 'Server error';
    return res.status(500).json({ success: false, error: errorMsg, details: err.errors ? Object.values(err.errors).map(e => e.message) : undefined });
  }
});

/**
 * PATCH /api/testimonials/admin/:id
 * Admin updates any field: status, showOnHome, displayOrder, name, occupation, text.
 */
router.patch('/admin/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, showOnHome, displayOrder, name, occupation, text } = req.body;

    const update = {};
    if (status    !== undefined && ['pending', 'approved', 'rejected'].includes(status)) update.status      = status;
    if (showOnHome !== undefined) update.showOnHome    = !!showOnHome;
    if (displayOrder !== undefined && typeof displayOrder === 'number')                   update.displayOrder = displayOrder;
    if (name?.trim())       update.name       = name.trim();
    if (occupation?.trim()) update.occupation = occupation.trim();
    if (text?.trim())       update.text       = text.trim();

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!testimonial) {
      return res.status(404).json({ success: false, error: 'Testimonial not found.' });
    }

    return res.json({ success: true, data: testimonial });
  } catch (err) {
    logger.error('[TESTIMONIALS] Admin PATCH error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * DELETE /api/testimonials/admin/:id
 */
router.delete('/admin/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ success: false, error: 'Testimonial not found.' });
    }
    return res.json({ success: true, message: 'Testimonial deleted.' });
  } catch (err) {
    logger.error('[TESTIMONIALS] Admin DELETE error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
