import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // 'HH:MM' IST
  endTime:   { type: String, required: true }, // 'HH:MM' IST
  isBooked:  { type: Boolean, default: false },
  bookedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: true });

const callDaySchema = new mongoose.Schema({
  date:  { type: String, required: true, unique: true }, // 'YYYY-MM-DD'
  slots: [slotSchema],
}, { timestamps: true });

export default mongoose.model('CallDay', callDaySchema);
