import express from 'express';
const router = express.Router();
import multer from 'multer';
import PaymentRequest from '../model/PaymentRequest.js';
import User from '../model/User.js';
import Subscription from '../model/Subscription.js';
import UserSubscription from '../model/UserSubscription.js';
import { uploadImage, deleteImage  } from '../config/cloudinary.js';
import { verifyToken  } from '../middleware/auth.js';
import { checkRole  } from '../middleware/roleAuth.js';
import {
  sendPaymentRequestReceivedEmail,
  sendPaymentApprovedEmail,
  sendPaymentRejectedEmail
} from '../utils/emailService.js';

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

// Submit payment request
router.post('/submit', upload.single('transactionImage'), async (req, res) => {
  try {
    const { senderName, transactionId, planId, planName, duration, amount, userId, serviceType = 'RA', paymentMethod = 'qr' } = req.body;

    // For IA payments, planId and duration are not required
    const isIaPayment = serviceType === 'IA';
    
    if (!senderName || !transactionId || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: 'All required fields are required'
      });
    }

    // For RA payments, validate plan and duration
    if (!isIaPayment) {
      if (!planId || !duration) {
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
    if (!isIaPayment) {
      plan = await Subscription.findById(planId);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
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
      planName: planName || (plan ? plan.name : undefined),
      duration: !isIaPayment ? duration : undefined,
      amount: parseFloat(amount),
      senderName,
      transactionId,
      transactionImageUrl: uploadResult.url,
      transactionImagePublicId: uploadResult.publicId,
      paymentMethod,
      status: 'pending'
    });

    await paymentRequest.save();

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

    // Only create subscription for RA payments
    if (paymentRequest.serviceType === 'RA') {
      // Calculate subscription dates
      const startDate = new Date();
      let endDate = new Date();

      switch (paymentRequest.duration) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'sixMonth':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      // Create user subscription
      userSubscription = new UserSubscription({
        user: paymentRequest.user._id,
        subscription: paymentRequest.plan._id,
        duration: paymentRequest.duration,
        startDate,
        endDate,
        price: paymentRequest.amount,
        status: 'active',
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

    // Email the user that their payment was approved (fire-and-forget)
    if (paymentRequest.user?.email) {
      sendPaymentApprovedEmail(paymentRequest.user, paymentRequest, userSubscription).catch(err =>
        console.error('Failed to send payment-approved email:', err)
      );
    }

    res.json({
      success: true,
      message: 'Payment request approved successfully',
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
