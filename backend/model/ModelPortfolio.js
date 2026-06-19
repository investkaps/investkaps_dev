import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  stockSymbol: { type: String, required: true, uppercase: true },
  stockName: { type: String, required: true },
  exchange: { type: String, enum: ['NSE', 'BSE', 'NFO', 'MCX'], default: 'NSE' },
  buyRange: {
    min: { type: Number },
    max: { type: Number }
  },
  targetPrice1: { type: Number, required: true },
  targetPrice2: { type: Number },
  targetPrice3: { type: Number },
  stopLoss: { type: Number, required: true },
  allocation: { type: Number, min: 0, max: 100 },
  addedAt: { type: Date, default: Date.now },
  notes: { type: String }
}, { _id: true });

const rebalanceEntrySchema = new mongoose.Schema({
  rebalancedAt: { type: Date, default: Date.now },
  rebalancedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changes: { type: String },
  snapshot: { type: Array }
}, { _id: true });

const modelPortfolioSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  stocks: {
    type: [stockSchema],
    validate: {
      validator: function (val) { return val.length <= 15; },
      message: 'A model portfolio cannot have more than 15 stocks.'
    }
  },
  rebalanceHistory: { type: [rebalanceEntrySchema], default: [] },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const ModelPortfolio = mongoose.model('ModelPortfolio', modelPortfolioSchema);

export default ModelPortfolio;
