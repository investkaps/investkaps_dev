const mongoose = require('mongoose');

const StockDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  exchange: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    default: 'NSE'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  instrumentToken: {
    type: Number,
    required: true
  },
  lastPrice: {
    type: Number
  },
  change: {
    type: Number
  },
  percentChange: {
    type: Number
  },
  open: {
    type: Number
  },
  high: {
    type: Number
  },
  low: {
    type: Number
  },
  close: {
    type: Number
  },
  volume: {
    type: Number
  },
  marketCap: {
    type: Number
  },
  pe: {
    type: Number
  },
  eps: {
    type: Number
  },
  dividendYield: {
    type: Number
  },
  sector: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  historicalData: {
    daily: [{
      date: Date,
      open: Number,
      high: Number,
      low: Number,
      close: Number,
      volume: Number
    }],
    weekly: [{
      date: Date,
      open: Number,
      high: Number,
      low: Number,
      close: Number,
      volume: Number
    }],
    monthly: [{
      date: Date,
      open: Number,
      high: Number,
      low: Number,
      close: Number,
      volume: Number
    }]
  },
  fundamentals: {
    bookValue: Number,
    faceValue: Number,
    marketCap: Number,
    pb: Number,
    pe: Number,
    eps: Number,
    dividendYield: Number,
    roe: Number,
    debtToEquity: Number
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
});

// Create indexes for efficient queries
StockDataSchema.index({ symbol: 1, exchange: 1 }, { unique: true });
StockDataSchema.index({ instrumentToken: 1 }, { unique: true });
StockDataSchema.index({ name: 'text' });

module.exports = mongoose.model('StockData', StockDataSchema);
