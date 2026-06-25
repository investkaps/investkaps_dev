import express from 'express';
const router = express.Router();
import multer from 'multer';
import PaymentRequest from '../model/PaymentRequest.js';
import User from '../model/User.js';
import Subscription from '../model/Subscription.js';
import UserSubscription from '../model/UserSubscription.js';
import Referral from '../model/Referral.js';
import { uploadImage, deleteImage  } from '../config/cloudinary.js';
import { verifyToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';
import { generateInvoiceNumber, generateInvoicePDF, uploadInvoicePDF } from '../utils/invoiceGenerator.js';
import KycVerification from '../model/KycVerification.js';
import {
  sendPaymentRequestReceivedEmail,
  sendPaymentApprovedEmail,
  sendSubscriptionStartedEmail,
  sendPaymentRejectedEmail
} from '../utils/emailService.js';

const generateReferralCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const existing = await User.findOne({ 'referral.code': code }).lean();
    if (!existing) return code;
  }
  return 'R' + Date.now().toString(36).toUpperCase().slice(-7);
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const LEGACY_PLAN_MONTHS = {
  monthly: 1,
  sixMonth: 6,
  yearly: 12
};

const getDurationMonths = ({ duration, durationMonths, planOption }) => {
  const fromPayload = Number(durationMonths);
  if (Number.isFinite(fromPayload) && fromPayload > 0) {
    return fromPayload;
  }

  if (planOption?.months) {
    return Number(planOption.months);
  }

  return LEGACY_PLAN_MONTHS[duration] || 1;
};

const getDurationLabel = ({ planName, duration, planOption }) => {
  if (planOption?.name) return planOption.name;
  if (planName) return planName;
  if (duration && !LEGACY_PLAN_MONTHS[duration]) return duration;
  if (duration && LEGACY_PLAN_MONTHS[duration]) {
    return duration === 'monthly' ? 'Monthly' : duration === 'sixMonth' ? '6 Months' : 'Yearly';
  }
  return 'Monthly';
};

// Submit payment request
router.post('/submit', upload.single('transactionImage'), async (req, res) => {
  try {
    const { senderName, billingName, billingState, transactionId, planId, planName, duration, durationMonths, planOptionId, amount, userId, serviceType = 'RA', paymentMethod = 'qr', referralCode } = req.body;

    // For IA payments, planId and duration are not required
    const isIaPayment = serviceType === 'IA';
    
    if (!senderName || !transactionId || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: 'All required fields are required'
      });
    }

    // For RA payments, validate plan and plan option metadata
    if (!isIaPayment) {
      if (!planId || (!duration && !durationMonths)) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID and duration are required for RA payments'
        });
      }
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Transaction image is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if plan exists (only for RA)
    let plan = null;
    let planOption = null;
    if (!isIaPayment) {
      plan = await Subscription.findById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      const availablePlanOptions = Array.isArray(plan.planOptions) && plan.planOptions.length > 0
        ? plan.planOptions
        : [];

      if (planOptionId) {
        planOption = availablePlanOptions.find(option => String(option._id) === String(planOptionId)) || null;
      }

      if (!planOption && duration) {
        const legacyMatch = {
          monthly: { name: 'Monthly', months: 1, price: plan.pricing?.monthly },
          sixMonth: { name: '6 Months', months: 6, price: plan.pricing?.sixMonth },
          yearly: { name: 'Yearly', months: 12, price: plan.pricing?.yearly }
        }[duration];
        if (legacyMatch) {
          planOption = legacyMatch;
        }
      }

      if (!planOption && availablePlanOptions.length > 0) {
        planOption = availablePlanOptions[0];
      }

      if (!planOption) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan option'
        });
      }

      const submittedAmount = Number(amount);
      const expectedAmount = Number(planOption.price);
      if (!Number.isFinite(submittedAmount) || submittedAmount !== expectedAmount) {
        return res.status(400).json({
          success: false,
          message: 'Submitted amount does not match the selected plan option'
        });
      }
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(req.file.buffer, 'payment-requests');

    // Create payment request
    const paymentRequest = new PaymentRequest({
      user: user._id,
      serviceType,
      plan: !isIaPayment ? planId : undefined,
      planOptionId: !isIaPayment ? (planOptionId || planOption?._id?.toString?.() || null) : undefined,
      planName: planName || (plan ? plan.name : undefined),
      duration: !isIaPayment ? getDurationLabel({ planName, duration, planOption }) : undefined,
      durationMonths: !isIaPayment ? getDurationMonths({ duration, durationMonths, planOption }) : undefined,
      amount: parseFloat(amount),
      senderName,
      billingName: billingName || senderName,
      billingState: billingState || '',
      transactionId,
      transactionImageUrl: uploadResult.url,
      transactionImagePublicId: uploadResult.publicId,
      paymentMethod,
      status: 'pending'
    });

    await paymentRequest.save();

    // ── Referral code processing (RA payments only) ──────────────────────────
    if (serviceType === 'RA' && referralCode) {
      try {
        const code = String(referralCode).trim().toUpperCase();
        const referrer = await User.findOne({ 'referral.code': code }).lean();

        const alreadyReferred = await Referral.findOne({ referred: user._id }).lean();
        const alreadyUsedCode = user.referral?.usedCode;
        const isSelfReferral  = referrer && String(referrer._id) === String(user._id);

        if (referrer && !alreadyReferred && !alreadyUsedCode && !isSelfReferral) {
          // Create pending referral record
          await Referral.create({
            referrer: referrer._id,
            referred: user._id,
            referralCode: code,
            status: 'pending',
          });

          // Mark on the referred user that they used this code
          await User.updateOne(
            { _id: user._id },
            { $set: { 'referral.usedCode': code, 'referral.usedCodeAt': new Date(), 'referral.referredBy': referrer._id } }
          );

          console.log(`[REFERRAL] Pending referral created: referrer=${referrer._id} referred=${user._id}`);
        }
      } catch (refErr) {
        // Non-blocking — don't fail the payment submit if referral processing errors
        console.error('[REFERRAL] Error processing referral code on submit:', refErr.message);
      }
    }

    // Email confirmation to user (fire-and-forget)
    sendPaymentRequestReceivedEmail(user, paymentRequest).catch(err =>
      console.error('Failed to send payment-received email:', err)
    );

    res.status(201).json({
      success: true,
      message: 'Payment request submitted successfully',
      data: paymentRequest
    });
  } catch (error) {
    console.error('Error submitting payment request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit payment request',
      error: error.message
    });
  }
});

// Get all payment requests (Admin only)
router.get('/all', verifyToken, checkRole('admin'), async (req, res) => {
  try {

    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};

    const paymentRequests = await PaymentRequest.find(query)
      .populate('user', 'name email clerkId')
      .populate('plan', 'name packageCode')
      .populate('approvedBy', 'name email')
      .populate('userSubscription', 'status startDate endDate')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await PaymentRequest.countDocuments(query);

    res.json({
      success: true,
      data: paymentRequests,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment requests',
      error: error.message
    });
  }
});

// Get user's payment requests
router.get('/my-requests', verifyToken, async (req, res) => {
  try {
    const user = req.user; // User is already attached by verifyToken middleware

    const paymentRequests = await PaymentRequest.find({ user: user._id })
      .populate('plan', 'name packageCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: paymentRequests
    });
  } catch (error) {
    console.error('Error fetching user payment requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment requests',
      error: error.message
    });
  }
});

// Approve payment request (Admin only)
router.post('/approve/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const admin = req.user; // Admin user is already attached by verifyToken middleware
    const { id } = req.params;
    const { adminNotes } = req.body;

    const paymentRequest = await PaymentRequest.findById(id)
      .populate('user')
      .populate('plan');

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found'
      });
    }

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment request has already been processed'
      });
    }

    let userSubscription = null;

    // Create subscription for RA and MP payments (not IA)
    if (paymentRequest.serviceType === 'RA' || paymentRequest.serviceType === 'MP') {
      if (!paymentRequest.plan) {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve: the linked subscription plan no longer exists. Please check the plan ID on this payment request.'
        });
      }

      // Check if user has completed all mandatory onboarding steps
      const payingUser = await User.findById(paymentRequest.user._id).select('verificationStatus');
      const vs = payingUser?.verificationStatus || {};
      const onboardingComplete = vs.panKyc === true && vs.phone === true && vs.esign === true;

      const startDate = onboardingComplete ? new Date() : null;
      let endDate = null;
      const durationMonths = Number(paymentRequest.durationMonths) || LEGACY_PLAN_MONTHS[paymentRequest.duration] || 1;
      if (onboardingComplete) {
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);
      }

      userSubscription = new UserSubscription({
        user: paymentRequest.user._id,
        subscription: paymentRequest.plan._id,
        serviceType: paymentRequest.serviceType === 'MP' ? 'RA' : 'RA',
        duration: paymentRequest.duration || 'monthly',
        durationMonths,
        planOptionId: paymentRequest.planOptionId || null,
        planOptionName: paymentRequest.duration || 'monthly',
        startDate,
        endDate,
        price: paymentRequest.amount,
        status: onboardingComplete ? 'active' : 'pending',
        paymentMethod: 'qr_code',
        paymentRequestId: paymentRequest._id
      });

      await userSubscription.save();
    }

    // Update payment request
    paymentRequest.status = 'approved';
    paymentRequest.approvedBy = admin._id;
    paymentRequest.approvedAt = new Date();
    paymentRequest.adminNotes = adminNotes;
    if (userSubscription) {
      paymentRequest.userSubscription = userSubscription._id;
    }
    await paymentRequest.save();

    // ── Referral reward (RA payments only) ──────────────────────────────────
    if (paymentRequest.serviceType === 'RA') {
      try {
        const pendingReferral = await Referral.findOne({
          referred: paymentRequest.user._id,
          status: 'pending',
        });

        if (pendingReferral) {
          const referralPlan = await Subscription.findOne({ isReferralPlan: true }).lean();

          if (referralPlan) {
            const referrerId = pendingReferral.referrer;
            const now = new Date();

            // Increment both totalReferred (permanent) and unclaimedMonths (claimable balance)
            await User.updateOne(
              { _id: referrerId },
              { $inc: { 'referral.unclaimedMonths': 1, 'referral.totalReferred': 1 } }
            );

            // Mark referral as rewarded
            pendingReferral.status           = 'rewarded';
            pendingReferral.rewardedAt        = now;
            pendingReferral.paymentRequestId  = paymentRequest._id;
            await pendingReferral.save();

            console.log(`[REFERRAL] Rewarded referrer=${referrerId}; +1 unclaimed month added`);
          } else {
            console.warn('[REFERRAL] No referral plan found (isReferralPlan=true). Reward skipped.');
          }
        }
      } catch (refErr) {
        // Non-blocking — approval already saved, just log
        console.error('[REFERRAL] Error granting referral reward:', refErr.message);
      }
    }

    // ── Generate invoice ──────────────────────────────────────────────────────
    let invoicePdfUrl = null;
    let invoicePdfBuffer = null;
    let invoiceNumber = null;
    try {
      // Fetch PAN from latest KYC record
      let pan = null;
      try {
        const kyc = await KycVerification.findOne({ user: paymentRequest.user._id, status: 'completed' })
          .sort({ createdAt: -1 }).select('pan').lean();
        pan = kyc?.pan || null;
      } catch {}

      invoiceNumber = await generateInvoiceNumber(PaymentRequest);
      invoicePdfBuffer = await generateInvoicePDF({
        invoiceNumber,
        date: new Date(),
        serviceType: paymentRequest.serviceType || 'RA',
        billingName: paymentRequest.billingName || paymentRequest.senderName,
        billingState: paymentRequest.billingState || '',
        pan,
        email: paymentRequest.user.email,
        phone: paymentRequest.user.profile?.phone || '',
        transactionId: paymentRequest.transactionId,
        packageName: paymentRequest.planName,
        duration: paymentRequest.duration,
        amount: paymentRequest.amount,
        coupon: 0,
      });

      const uploaded = await uploadInvoicePDF(invoicePdfBuffer, invoiceNumber);
      invoicePdfUrl = uploaded.url;

      await PaymentRequest.findByIdAndUpdate(paymentRequest._id, {
        invoiceNumber,
        invoicePdfUrl: uploaded.url,
        invoicePdfPublicId: uploaded.publicId,
      });

      console.log(`[INVOICE] Generated ${invoiceNumber} for payment ${paymentRequest._id}`);
    } catch (invErr) {
      console.error('[INVOICE] Generation failed (non-blocking):', invErr.message);
    }

    // Generate referral code on first plan purchase (if they don't already have one)
    if (paymentRequest.user && !paymentRequest.user.referral?.code) {
      try {
        const code = await generateReferralCode();
        await User.updateOne(
          { _id: paymentRequest.user._id },
          { $set: { 'referral.code': code } }
        );
        console.log(`[REFERRAL] Generated referral code ${code} for user ${paymentRequest.user._id}`);
      } catch (codeErr) {
        console.error('[REFERRAL] Failed to generate referral code:', codeErr.message);
      }
    }

    // Email the user that their payment was approved, attach invoice PDF (fire-and-forget)
    if (paymentRequest.user?.email) {
      sendPaymentApprovedEmail(
        paymentRequest.user,
        paymentRequest,
        userSubscription,
        invoicePdfBuffer ? { buffer: invoicePdfBuffer, filename: `Invoice_${invoiceNumber || 'INV'}.pdf` } : null
      ).catch(err => console.error('Failed to send payment-approved email:', err));
    }

    const subStatus = userSubscription?.status || 'active';
    res.json({
      success: true,
      message: subStatus === 'pending'
        ? 'Payment approved. Subscription is on hold until user completes all onboarding steps.'
        : 'Payment approved and subscription activated.',
      subscriptionStatus: subStatus,
      data: {
        paymentRequest,
        userSubscription
      }
    });
  } catch (error) {
    console.error('Error approving payment request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve payment request',
      error: error.message
    });
  }
});

// Get pending subscription for a user (payment approved but onboarding incomplete)
router.get('/pending-subscription/:clerkId', verifyToken, async (req, res) => {
  try {
    const { clerkId } = req.params;
    if (req.clerkId !== clerkId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const user = await User.findOne({ clerkId }).select('_id');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const sub = await UserSubscription.findOne({ user: user._id, status: 'pending' })
      .populate('subscription')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: sub || null });
  } catch (error) {
    console.error('Error fetching pending subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending subscription' });
  }
});

// Activate pending subscriptions once all onboarding steps are done (called by frontend after each step)
router.post('/activate-pending/:clerkId', verifyToken, async (req, res) => {
  try {
    const { clerkId } = req.params;

    // Users can only trigger activation for themselves
    if (req.clerkId !== clerkId && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findOne({ clerkId }).select('name email verificationStatus');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const vs = user.verificationStatus || {};
    if (!(vs.panKyc === true && vs.phone === true && vs.esign === true)) {
      return res.json({ success: true, activated: false, message: 'Onboarding not yet complete' });
    }

    // Find all pending subscriptions for this user and activate them
    const pendingSubs = await UserSubscription.find({ user: user._id, status: 'pending' });
    if (!pendingSubs.length) {
      return res.json({ success: true, activated: false, message: 'No pending subscriptions found' });
    }

    const now = new Date();
    for (const sub of pendingSubs) {
      sub.status = 'active';
      sub.startDate = now;
      const end = new Date(now);
      end.setMonth(end.getMonth() + (sub.durationMonths || 1));
      sub.endDate = end;
      await sub.save();

      // Send "plan started" email (fire-and-forget)
      if (user.email) {
        const populatedSub = await UserSubscription.findById(sub._id).populate('subscription', 'name');
        sendSubscriptionStartedEmail(user, populatedSub).catch(err =>
          console.error('Failed to send subscription-started email:', err)
        );
      }
    }

    return res.json({ success: true, activated: true, count: pendingSubs.length, message: `${pendingSubs.length} subscription(s) activated.` });
  } catch (error) {
    console.error('Error activating pending subscriptions:', error);
    res.status(500).json({ success: false, message: 'Failed to activate subscriptions', error: error.message });
  }
});

// Reject payment request (Admin only)
router.post('/reject/:id', verifyToken, checkRole('admin'), async (req, res) => {
  try {
    const admin = req.user; // Admin user is already attached by verifyToken middleware
    const { id } = req.params;
    const { adminNotes } = req.body;

    const paymentRequest = await PaymentRequest.findById(id);

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found'
      });
    }

    if (paymentRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Payment request has already been processed'
      });
    }

    // Update payment request
    paymentRequest.status = 'rejected';
    paymentRequest.approvedBy = admin._id;
    paymentRequest.rejectedAt = new Date();
    paymentRequest.adminNotes = adminNotes || 'Payment verification failed';
    await paymentRequest.save();

    // Fetch user details for the email if not already populated
    const userForEmail = paymentRequest.user
      ? (typeof paymentRequest.user === 'object' && paymentRequest.user.email
          ? paymentRequest.user
          : await User.findById(paymentRequest.user).select('name email'))
      : null;

    if (userForEmail?.email) {
      sendPaymentRejectedEmail(userForEmail, paymentRequest).catch(err =>
        console.error('Failed to send payment-rejected email:', err)
      );
    }

    res.json({
      success: true,
      message: 'Payment request rejected',
      data: paymentRequest
    });
  } catch (error) {
    console.error('Error rejecting payment request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject payment request',
      error: error.message
    });
  }
});

export default router;
