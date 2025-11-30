const express = require('express');
const router = express.Router();
const multer = require('multer');
const PaymentRequest = require('../model/PaymentRequest');
const User = require('../model/User');
const Subscription = require('../model/Subscription');
const UserSubscription = require('../model/UserSubscription');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleAuth');

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
    const { senderName, transactionId, planId, planName, duration, amount, userId } = req.body;

    if (!senderName || !transactionId || !planId || !duration || !amount || !userId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
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

    // Check if plan exists
    const plan = await Subscription.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(req.file.buffer, 'payment-requests');

    // Create payment request
    const paymentRequest = new PaymentRequest({
      user: user._id,
      plan: planId,
      planName: planName || plan.name,
      duration,
      amount: parseFloat(amount),
      senderName,
      transactionId,
      transactionImageUrl: uploadResult.url,
      transactionImagePublicId: uploadResult.publicId,
      status: 'pending'
    });

    await paymentRequest.save();

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
    const userSubscription = new UserSubscription({
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

    // Update payment request
    paymentRequest.status = 'approved';
    paymentRequest.approvedBy = admin._id;
    paymentRequest.approvedAt = new Date();
    paymentRequest.adminNotes = adminNotes;
    paymentRequest.userSubscription = userSubscription._id;
    await paymentRequest.save();

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

module.exports = router;
