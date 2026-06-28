import mongoose from 'mongoose';

const callSlotSchema = new mongoose.Schema({
  date: { type: String, required: true },         // 'YYYY-MM-DD'
  startTime: { type: String, required: true },    // 'HH:MM' (IST)
  endTime: { type: String, required: true },      // 'HH:MM' (IST)
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

callSlotSchema.index({ date: 1, startTime: 1 });

export default mongoose.model('CallSlot', callSlotSchema);
