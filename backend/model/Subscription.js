import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  included: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  }
});

// Trading options schema
const tradingOptionsSchema = new mongoose.Schema({
  stockOptions: {
    type: Boolean,
    default: false
  },
  indexOptions: {
    type: Boolean,
    default: false
  },
  stockFuture: {
    type: Boolean,
    default: false
  },
  indexFuture: {
    type: Boolean,
    default: false
  },
  equity: {
    type: Boolean,
    default: false
  },
  mcx: {
    type: Boolean,
    default: false
  }
});

// Pricing options schema
const pricingSchema = new mongoose.Schema({
  monthly: {
    type: Number,
    required: true,
    min: 0
  },
  sixMonth: {
    type: Number,
    required: true,
    min: 0
  },
  yearly: {
    type: Number,
    required: true,
    min: 0
  }
});

const subscriptionSchema = new mongoose.Schema({
  packageCode: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  pricing: {
    type: pricingSchema,
    required: true
  },
  tradingOptions: {
    type: tradingOptionsSchema,
    default: {}
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  features: [featureSchema],
  strategies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy'
  }],
  telegramChatId: {
    type: String,
    trim: true,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
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

// Pre-save hook to update the updatedAt field
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
