const mongoose = require('mongoose');

const StockRecommendationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  stockSymbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  stockName: {
    type: String,
    required: true,
    trim: true
  },
  exchange: {
    type: String,
    enum: ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX'],
    default: 'NSE'
  },
  currentPrice: {
    type: Number,
    required: true
  },
  lastPriceUpdate: {
    type: Date,
    default: Date.now
  },
  targetPrice: {
    type: Number,
    required: true
  },
  targetPrice2: {
    type: Number,
    required: false
  },
  targetPrice3: {
    type: Number,
    required: false
  },
  stopLoss: {
    type: Number,
    required: false
  },
  recommendationType: {
    type: String,
    enum: ['buy', 'sell', 'hold'],
    required: true
  },
  timeFrame: {
    type: String,
    enum: ['short_term', 'medium_term', 'long_term'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  rationale: {
    type: String,
    required: true,
    trim: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    required: true
  },
  // Target strategies that should receive this recommendation
  targetStrategies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy'
  }],
  // Track which users have viewed this recommendation
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Track which users this recommendation was sent to
  sentTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  pdfReport: {
    url: {
      type: String
    },
    publicId: {
      type: String
    },
    generatedAt: {
      type: Date
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
});

// Pre-save hook to update the updatedAt field
StockRecommendationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for efficient queries
StockRecommendationSchema.index({ stockSymbol: 1 });
StockRecommendationSchema.index({ status: 1, createdAt: -1 });
StockRecommendationSchema.index({ targetStrategies: 1 });
StockRecommendationSchema.index({ status: 1, publishedAt: -1 }); // For filtering by publication date
StockRecommendationSchema.index({ targetStrategies: 1, publishedAt: -1 }); // Compound index for user recommendations

module.exports = mongoose.model('StockRecommendation', StockRecommendationSchema);
