const mongoose = require('mongoose');

const strategySchema = new mongoose.Schema({
  strategyCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  tradingOptions: {
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
  },
  isActive: {
    type: Boolean,
    default: true
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

// Update the updatedAt field before saving
strategySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
strategySchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const Strategy = mongoose.model('Strategy', strategySchema);

module.exports = Strategy;
