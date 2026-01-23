import mongoose from 'mongoose';

const mStockTokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  source: {
    type: String,
    default: 'mstock'
  }
}, {
  timestamps: true
});

// Index for quick lookup of active token
mStockTokenSchema.index({ isActive: 1, expiresAt: 1 });

const MStockToken = mongoose.model('MStockToken', mStockTokenSchema);

export default MStockToken;
