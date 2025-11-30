const mongoose = require('mongoose');

const zerodhaTokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Only keep one active token at a time
zerodhaTokenSchema.index({ isActive: 1 });

module.exports = mongoose.model('ZerodhaToken', zerodhaTokenSchema);
