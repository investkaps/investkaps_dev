import mongoose from 'mongoose';

const paymentRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    enum: ['monthly', 'sixMonth', 'yearly'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  transactionId: {
    type: String,
    required: true
  },
  transactionImageUrl: {
    type: String,
    required: true
  },
  transactionImagePublicId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  userSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription'
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentRequestSchema.index({ user: 1, status: 1 });
paymentRequestSchema.index({ status: 1, createdAt: -1 });

const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);

export default PaymentRequest;
