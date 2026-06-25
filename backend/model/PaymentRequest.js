import mongoose from 'mongoose';

const paymentRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['RA', 'IA', 'MP'],
    default: 'RA'
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false
  },
  planName: {
    type: String,
    required: false
  },
  duration: {
    type: String,
    required: false,
    trim: true
  },
  durationMonths: {
    type: Number,
    required: false,
    min: 1
  },
  planOptionId: {
    type: String,
    required: false,
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  senderName: {
    type: String,
    required: false,
    default: ''
  },
  transactionId: {
    type: String,
    required: false,
    default: ''
  },
  transactionImageUrl: {
    type: String,
    required: false,
    default: ''
  },
  transactionImagePublicId: {
    type: String,
    required: false,
    default: ''
  },
  billingName: {
    type: String,
    required: false,
    trim: true
  },
  billingState: {
    type: String,
    required: false,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['qr', 'bank_transfer', 'razorpay'],
    default: 'qr'
  },
  invoiceNumber: {
    type: String,
    required: false,
    unique: false,
    sparse: true
  },
  invoicePdfUrl: {
    type: String,
    required: false
  },
  invoicePdfPublicId: {
    type: String,
    required: false
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
