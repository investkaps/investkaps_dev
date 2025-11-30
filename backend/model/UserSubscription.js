const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  renewalDate: {
    type: Date
  },
  paymentId: {
    type: String
  },
  orderId: {
    type: String
  },
  transactionDetails: {
    type: Object
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  notificationsSent: {
    type: [{
      type: {
        type: String,
        enum: ['expiring_soon', 'expired', 'renewal_failed', 'renewal_success']
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      message: String
    }],
    default: []
  },
  renewalHistory: {
    type: [{
      date: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['success', 'failed']
      },
      paymentId: String,
      amount: Number
    }],
    default: []
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  duration: {
    type: String,
    enum: ['monthly', 'sixMonth', 'yearly'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient queries
userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1 });

// Pre-save hook to update the updatedAt field
userSubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check if subscription is active
userSubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() < this.endDate;
};

// Instance method to check if subscription is expiring soon (within 3 days)
userSubscriptionSchema.methods.isExpiringSoon = function() {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);
  
  return this.endDate > now && this.endDate <= threeDaysFromNow;
};

// Static method to find active subscriptions expiring soon
userSubscriptionSchema.statics.findExpiringSoon = function(daysThreshold = 3) {
  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(now.getDate() + daysThreshold);
  
  return this.find({
    status: 'active',
    endDate: {
      $gt: now,
      $lte: thresholdDate
    }
  }).populate('user subscription');
};

// Static method to find expired subscriptions
userSubscriptionSchema.statics.findExpired = function() {
  const now = new Date();
  
  return this.find({
    status: 'active',
    endDate: { $lt: now }
  }).populate('user subscription');
};

const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);

module.exports = UserSubscription;
