import Subscription from '../model/Subscription.js';
import UserSubscription from '../model/UserSubscription.js';
import User from '../model/User.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { sendEmail  } from '../utils/emailService.js';
import logger from '../utils/logger.js';
import moment from 'moment';

// Initialize Razorpay lazily to ensure environment variables are loaded
let razorpay = null;

const getRazorpayInstance = () => {
  if (!razorpay) {
    // Debug log for environment variables
    console.log('Razorpay Key ID available:', !!process.env.RAZORPAY_KEY_ID);
    console.log('Razorpay Key Secret available:', !!process.env.RAZORPAY_KEY_SECRET);
    
    try {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      console.log('Razorpay initialized successfully');
    } catch (error) {
      console.error('Error initializing Razorpay:', error.message);
      throw new Error('Razorpay initialization failed: ' + error.message);
    }
  }
  return razorpay;
};

// Helper function to calculate end date based on duration
const calculateEndDate = (startDate, duration) => {
  const start = new Date(startDate);
  
  switch (duration) {
    case 'monthly':
      return new Date(start.setMonth(start.getMonth() + 1));
    case 'sixMonth':
      return new Date(start.setMonth(start.getMonth() + 6));
    case 'yearly':
      return new Date(start.setFullYear(start.getFullYear() + 1));
    default:
      return new Date(start.setMonth(start.getMonth() + 1)); // Default to monthly
  }
};

// ===== SUBSCRIPTION PLANS MANAGEMENT (ADMIN) =====

// Get all subscription plans (public)
export const getAllSubscriptions = async (req, res) => {
  try {
    // For public access, only return active subscriptions
    const subscriptions = await Subscription.find({ isActive: true })
      .sort({ displayOrder: 1, price: 1 });
    
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching subscriptions'
    });
  }
};

// Get all subscription plans (admin only - includes inactive)
export const getAllSubscriptionsAdmin = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('strategies')
      .sort({ displayOrder: 1, price: 1 });
    
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching all subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching subscriptions'
    });
  }
};

// Get subscription by ID
export const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('strategies');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching subscription'
    });
  }
};

// Create new subscription plan (admin only)
export const createSubscription = async (req, res) => {
  try {
    const {
      packageCode,
      name,
      description,
      pricing,
      tradingOptions,
      currency,
      features,
      telegramChatId,
      isActive,
      displayOrder
    } = req.body;

    // Validate required fields
    if (!packageCode || !name || !description || !pricing) {
      return res.status(400).json({
        success: false,
        error: 'Please provide packageCode, name, description, and pricing'
      });
    }

    // Create subscription
    const subscription = await Subscription.create({
      packageCode,
      name,
      description,
      pricing,
      tradingOptions: tradingOptions || {},
      currency: currency || 'INR',
      features: features || [],
      telegramChatId: telegramChatId || null,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      strategies: [] // Initialize with empty strategies array
    });

    res.status(201).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating subscription'
    });
  }
};

// Update subscription (admin only)
export const updateSubscription = async (req, res) => {
  try {
    const {
      packageCode,
      name,
      description,
      pricing,
      tradingOptions,
      currency,
      features,
      strategies,
      telegramChatId,
      isActive,
      displayOrder
    } = req.body;

    // Find subscription
    let subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Update fields
    const updateData = {
      packageCode: packageCode || subscription.packageCode,
      name: name || subscription.name,
      description: description || subscription.description,
      pricing: pricing || subscription.pricing,
      tradingOptions: tradingOptions || subscription.tradingOptions,
      currency: currency || subscription.currency,
      features: features || subscription.features,
      strategies: strategies !== undefined ? strategies : subscription.strategies,
      telegramChatId: telegramChatId !== undefined ? telegramChatId : subscription.telegramChatId,
      isActive: isActive !== undefined ? isActive : subscription.isActive,
      displayOrder: displayOrder !== undefined ? displayOrder : subscription.displayOrder,
      updatedAt: Date.now()
    };

    // Update subscription
    subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating subscription'
    });
  }
};

// Delete subscription (admin only)
export const deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    await subscription.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Error deleting subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting subscription'
    });
  }
};

// Toggle subscription plan status
export const toggleSubscriptionStatus = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Toggle isActive status
    subscription.isActive = !subscription.isActive;
    await subscription.save();

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error toggling subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while toggling subscription status'
    });
  }
};

// Add strategies to subscription
export const addStrategiesToSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { strategyIds } = req.body;
    
    if (!strategyIds || !Array.isArray(strategyIds) || strategyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of strategy IDs'
      });
    }
    
    // Find subscription
    const subscription = await Subscription.findById(id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    // Add strategies to subscription
    subscription.strategies = [...new Set([...subscription.strategies, ...strategyIds])];
    await subscription.save();
    
    // Populate strategies and return
    const updatedSubscription = await Subscription.findById(id).populate('strategies');
    
    res.status(200).json({
      success: true,
      data: updatedSubscription
    });
  } catch (error) {
    logger.error('Error adding strategies to subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while adding strategies to subscription'
    });
  }
};

// Remove strategies from subscription
export const removeStrategiesFromSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { strategyIds } = req.body;
    
    if (!strategyIds || !Array.isArray(strategyIds) || strategyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of strategy IDs'
      });
    }
    
    // Find subscription
    const subscription = await Subscription.findById(id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    // Remove strategies from subscription
    subscription.strategies = subscription.strategies.filter(
      strategy => !strategyIds.includes(strategy.toString())
    );
    
    await subscription.save();
    
    // Populate strategies and return
    const updatedSubscription = await Subscription.findById(id).populate('strategies');
    
    res.status(200).json({
      success: true,
      data: updatedSubscription
    });
  } catch (error) {
    logger.error('Error removing strategies from subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while removing strategies from subscription'
    });
  }
};

// ===== USER SUBSCRIPTIONS MANAGEMENT =====

// Get all subscriptions for a user
export const getUserSubscriptions = async (req, res) => {
  try {
    const clerkUserId = req.params.userId;
    
    // First, find the User document by Clerk ID
    const user = await User.findOne({ clerkId: clerkUserId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const subscriptions = await UserSubscription.find({ user: user._id })
      .populate('subscription')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching user subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user subscriptions'
    });
  }
};

// Get active subscriptions for a user (returns ALL active subscriptions)
export const getActiveSubscription = async (req, res) => {
  try {
    const clerkUserId = req.params.userId;
    console.log('🔍 Searching for active subscriptions - Clerk ID:', clerkUserId);
    
    // First, find the User document by Clerk ID
    const user = await User.findOne({ clerkId: clerkUserId });
    console.log('👤 User found:', user ? `Yes (MongoDB ID: ${user._id})` : 'No');
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Find ALL active subscriptions using the MongoDB User ObjectId
    const subscriptions = await UserSubscription.find({
      user: user._id,
      status: 'active'
    })
    .populate('subscription')
    .sort({ createdAt: -1 }); // Most recent first
    
    console.log(`📦 Found ${subscriptions.length} active subscription(s)`);
    if (subscriptions.length > 0) {
      console.log('✅ Subscriptions:', subscriptions.map(s => ({
        plan: s.subscription?.name,
        status: s.status,
        endDate: s.endDate
      })));
    }
    
    // Return array of subscriptions (can be empty)
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    console.error('💥 Error in getActiveSubscription:', error);
    logger.error('Error fetching active subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching active subscriptions'
    });
  }
};

// Cancel a subscription
export const cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const subscription = await UserSubscription.findById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    // Check if user is authorized (either the subscription owner or an admin)
    if (subscription.user.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this subscription'
      });
    }
    
    subscription.status = 'cancelled';
    subscription.updatedAt = Date.now();
    await subscription.save();
    
    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while cancelling subscription'
    });
  }
};

// ===== PAYMENT AND SUBSCRIPTION PURCHASE =====

// Create a Razorpay order for subscription purchase
export const createOrder = async (req, res) => {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not initialized. Please check server logs.'
      });
    }

    const { amount, currency, subscriptionId, duration } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!amount || !subscriptionId || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Please provide amount, subscriptionId, and duration'
      });
    }
    
    // Check if subscription exists
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    // Verify the amount matches the subscription price for the selected duration
    const expectedAmount = subscription.pricing[duration];
    if (!expectedAmount || expectedAmount !== Number(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount for the selected subscription and duration'
      });
    }
    
    // Create Razorpay order with a shorter receipt ID (max 40 chars)
    // Generate a shorter timestamp and user reference
    const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp (seconds)
    const shortUserId = userId.toString().slice(-6); // Last 6 chars of user ID
    
    const options = {
      amount: amount * 100, // Convert to paise
      currency: currency || 'INR',
      receipt: `rcpt_${timestamp}_${shortUserId}`, // Shorter receipt ID
      notes: {
        userId,
        subscriptionId,
        duration
      }
    };
    
    const razorpayInstance = getRazorpayInstance();
    const order = await razorpayInstance.orders.create(options);
    
    // Get user details for prefill
    const user = await User.findById(userId);
    
    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      customerName: user.name,
      customerEmail: user.email
    });
  } catch (error) {
    logger.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating payment order'
    });
  }
};

// Verify payment and create user subscription
export const verifyPayment = async (req, res) => {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not initialized. Please check server logs.'
      });
    }
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, duration } = req.body;
    const userId = req.user.id;
    
    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }
    
    // Get payment details from Razorpay
    const razorpayInstance = getRazorpayInstance();
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        error: 'Payment not captured'
      });
    }
    
    // Get subscription details
    const subscription = await Subscription.findById(planId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Allow multiple subscriptions - no need to cancel existing ones
    // Users can now have multiple active subscriptions simultaneously
    
    // Calculate start and end dates
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, duration);
    
    // Get price based on duration
    const price = subscription.pricing[duration] || 0;
    
    // Create new user subscription
    const newUserSubscription = new UserSubscription({
      user: userId,
      subscription: planId,
      startDate,
      endDate,
      duration,
      price,
      currency: subscription.currency || 'INR',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      transactionDetails: payment
    });
    
    await newUserSubscription.save();
    
    // Send confirmation email to user
    try {
      const emailData = {
        to: user.email,
        subject: 'Subscription Confirmation - InvestKaps',
        text: `Thank you for subscribing to ${subscription.name}. Your subscription is now active and will expire on ${moment(endDate).format('MMMM Do, YYYY')}.`,
        html: `
          <h2>Subscription Confirmation</h2>
          <p>Dear ${user.name},</p>
          <p>Thank you for subscribing to <strong>${subscription.name}</strong>.</p>
          <p>Your subscription details:</p>
          <ul>
            <li><strong>Plan:</strong> ${subscription.name}</li>
            <li><strong>Duration:</strong> ${duration === 'monthly' ? 'Monthly' : duration === 'sixMonth' ? '6 Months' : 'Yearly'}</li>
            <li><strong>Start Date:</strong> ${moment(startDate).format('MMMM Do, YYYY')}</li>
            <li><strong>Expiry Date:</strong> ${moment(endDate).format('MMMM Do, YYYY')}</li>
            <li><strong>Amount Paid:</strong> ${subscription.currency || '₹'} ${price}</li>
          </ul>
          <p>You can view your subscription details in your dashboard.</p>
          <p>Thank you for choosing InvestKaps!</p>
        `
      };
      
      await sendEmail(emailData);
    } catch (emailError) {
      logger.error('Error sending subscription confirmation email:', emailError);
      // Don't fail the request if email fails
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment verified and subscription created successfully',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        subscriptionId: newUserSubscription._id
      }
    });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while verifying payment'
    });
  }
};

// ===== TESTING/DEVELOPMENT ENDPOINTS =====

// Create test subscription (bypass payment for testing)
export const createTestSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get a random active subscription plan
    const subscriptions = await Subscription.find({ isActive: true });
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription plans available'
      });
    }
    
    // Pick a random subscription (or use the first one)
    const subscription = subscriptions[Math.floor(Math.random() * subscriptions.length)];
    
    // Random duration
    const durations = ['monthly', 'sixMonth', 'yearly'];
    const duration = durations[Math.floor(Math.random() * durations.length)];
    
    // Check if user already has an active subscription
    const existingSubscription = await UserSubscription.findOne({
      user: userId,
      status: 'active'
    });
    
    if (existingSubscription) {
      // Mark the current one as cancelled
      existingSubscription.status = 'cancelled';
      await existingSubscription.save();
    }
    
    // Calculate start and end dates
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, duration);
    
    // Get price based on duration
    const price = subscription.pricing[duration] || 0;
    
    // Generate random test payment IDs
    const testPaymentId = `test_pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const testOrderId = `test_order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Create new user subscription
    const newUserSubscription = new UserSubscription({
      user: userId,
      subscription: subscription._id,
      startDate,
      endDate,
      duration,
      price,
      currency: subscription.currency || 'INR',
      paymentId: testPaymentId,
      orderId: testOrderId,
      transactionDetails: {
        method: 'test',
        status: 'captured',
        amount: price * 100,
        created_at: Date.now(),
        description: 'Test subscription created via bypass'
      }
    });
    
    await newUserSubscription.save();
    
    logger.info(`Test subscription created for user ${userId}: ${subscription.name} (${duration})`);
    
    res.status(200).json({
      success: true,
      message: 'Test subscription created successfully',
      data: {
        subscriptionId: newUserSubscription._id,
        planName: subscription.name,
        duration,
        startDate,
        endDate,
        price,
        paymentId: testPaymentId,
        orderId: testOrderId
      }
    });
  } catch (error) {
    logger.error('Error creating test subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while creating test subscription'
    });
  }
};

// ===== ADMIN SUBSCRIPTION MANAGEMENT =====

// Get all user subscriptions (admin only)
export const getAllUserSubscriptions = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Filtering
    const filter = {};
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.duration) {
      filter.duration = req.query.duration;
    }
    
    // Date range filtering
    if (req.query.startDateFrom && req.query.startDateTo) {
      filter.startDate = {
        $gte: new Date(req.query.startDateFrom),
        $lte: new Date(req.query.startDateTo)
      };
    } else if (req.query.startDateFrom) {
      filter.startDate = { $gte: new Date(req.query.startDateFrom) };
    } else if (req.query.startDateTo) {
      filter.startDate = { $lte: new Date(req.query.startDateTo) };
    }
    
    if (req.query.endDateFrom && req.query.endDateTo) {
      filter.endDate = {
        $gte: new Date(req.query.endDateFrom),
        $lte: new Date(req.query.endDateTo)
      };
    } else if (req.query.endDateFrom) {
      filter.endDate = { $gte: new Date(req.query.endDateFrom) };
    } else if (req.query.endDateTo) {
      filter.endDate = { $lte: new Date(req.query.endDateTo) };
    }
    
    // Search by user or subscription
    if (req.query.search) {
      const users = await User.find({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ]
      }).select('_id');
      
      const subscriptions = await Subscription.find({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } }
        ]
      }).select('_id');
      
      filter.$or = [
        { user: { $in: users.map(user => user._id) } },
        { subscription: { $in: subscriptions.map(sub => sub._id) } }
      ];
    }
    
    // Get total count
    const total = await UserSubscription.countDocuments(filter);
    
    // Get subscriptions with pagination
    const subscriptions = await UserSubscription.find(filter)
      .populate('user', 'name email')
      .populate('subscription', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching all user subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user subscriptions'
    });
  }
};

// Get dashboard stats for subscriptions
export const getSubscriptionStats = async (req, res) => {
  try {
    const now = new Date();
    
    // Active subscriptions count
    const activeCount = await UserSubscription.countDocuments({
      status: 'active',
      endDate: { $gt: now }
    });
    
    // Expiring soon count (next 7 days)
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);
    
    const expiringSoonCount = await UserSubscription.countDocuments({
      status: 'active',
      endDate: {
        $gt: now,
        $lte: sevenDaysLater
      }
    });
    
    // Expired count (last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const recentlyExpiredCount = await UserSubscription.countDocuments({
      status: 'active',
      endDate: {
        $lt: now,
        $gte: thirtyDaysAgo
      }
    });
    
    // Subscriptions by plan
    const subscriptionsByPlan = await UserSubscription.aggregate([
      {
        $match: {
          status: 'active',
          endDate: { $gt: now }
        }
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subscription',
          foreignField: '_id',
          as: 'subscriptionDetails'
        }
      },
      {
        $unwind: '$subscriptionDetails'
      },
      {
        $group: {
          _id: '$subscriptionDetails.name',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      }
    ]);
    
    // Subscriptions by duration
    const subscriptionsByDuration = await UserSubscription.aggregate([
      {
        $match: {
          status: 'active',
          endDate: { $gt: now }
        }
      },
      {
        $group: {
          _id: '$duration',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      }
    ]);
    
    // Monthly revenue for the last 6 months
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const monthlyRevenue = await UserSubscription.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$price' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        activeSubscriptions: activeCount,
        expiringSoon: expiringSoonCount,
        recentlyExpired: recentlyExpiredCount,
        subscriptionsByPlan,
        subscriptionsByDuration,
        monthlyRevenue
      }
    });
  } catch (error) {
    logger.error('Error fetching subscription stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching subscription stats'
    });
  }
};

// ===== SUBSCRIPTION MAINTENANCE (CRON JOBS) =====

// Check and update expired subscriptions
export const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find expired but still active subscriptions
    const expiredSubscriptions = await UserSubscription.find({
      status: 'active',
      endDate: { $lt: now }
    }).populate('user subscription');
    
    logger.info(`Found ${expiredSubscriptions.length} expired subscriptions to update`);
    
    // Update each expired subscription
    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      await subscription.save();
      
      // Send expiration notification
      try {
        const emailData = {
          to: subscription.user.email,
          subject: 'Your Subscription Has Expired - InvestKaps',
          text: `Your subscription to ${subscription.subscription.name} has expired. Please renew to continue enjoying our services.`,
          html: `
            <h2>Subscription Expired</h2>
            <p>Dear ${subscription.user.name},</p>
            <p>Your subscription to <strong>${subscription.subscription.name}</strong> has expired.</p>
            <p>To continue enjoying our services, please renew your subscription from your dashboard.</p>
            <p>Thank you for choosing InvestKaps!</p>
          `
        };
        
        await sendEmail(emailData);
        
        // Record notification
        subscription.notificationsSent.push({
          type: 'expired',
          sentAt: now,
          message: 'Subscription expiration notification sent'
        });
        
        await subscription.save();
      } catch (emailError) {
        logger.error(`Error sending expiration email to ${subscription.user.email}:`, emailError);
      }
    }
    
    return expiredSubscriptions.length;
  } catch (error) {
    logger.error('Error checking expired subscriptions:', error);
    throw error;
  }
};

// Send notifications for subscriptions expiring soon
export const sendExpirationReminders = async () => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(now.getDate() + 3);
    
    // Find subscriptions expiring in the next 3 days that haven't received a notification yet
    const expiringSubscriptions = await UserSubscription.find({
      status: 'active',
      endDate: {
        $gt: now,
        $lte: threeDaysLater
      },
      'notificationsSent.type': { $ne: 'expiring_soon' }
    }).populate('user subscription');
    
    logger.info(`Found ${expiringSubscriptions.length} subscriptions expiring soon to notify`);
    
    // Send notification for each expiring subscription
    for (const subscription of expiringSubscriptions) {
      try {
        const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
        
        const emailData = {
          to: subscription.user.email,
          subject: 'Your Subscription is Expiring Soon - InvestKaps',
          text: `Your subscription to ${subscription.subscription.name} will expire in ${daysRemaining} days. Please renew to avoid interruption.`,
          html: `
            <h2>Subscription Expiring Soon</h2>
            <p>Dear ${subscription.user.name},</p>
            <p>Your subscription to <strong>${subscription.subscription.name}</strong> will expire in <strong>${daysRemaining} days</strong>.</p>
            <p>To avoid any interruption in service, please renew your subscription from your dashboard.</p>
            <p>Thank you for choosing InvestKaps!</p>
          `
        };
        
        await sendEmail(emailData);
        
        // Record notification
        subscription.notificationsSent.push({
          type: 'expiring_soon',
          sentAt: now,
          message: `Subscription expiring in ${daysRemaining} days notification sent`
        });
        
        await subscription.save();
      } catch (emailError) {
        logger.error(`Error sending expiration reminder to ${subscription.user.email}:`, emailError);
      }
    }
    
    return expiringSubscriptions.length;
  } catch (error) {
    logger.error('Error sending expiration reminders:', error);
    throw error;
  }
};
