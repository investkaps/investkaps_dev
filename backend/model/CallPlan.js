import mongoose from 'mongoose';

const callPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  durationMinutes: { type: Number, required: true, min: 5 },
  price: { type: Number, required: true, min: 0 },
  features: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('CallPlan', callPlanSchema);
