import mongoose from 'mongoose';

const callBookingSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  callPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'CallPlan', required: true },
  // Slot stored inline (denormalized) so it's readable even if the day doc changes
  slotDate:      { type: String, required: true }, // 'YYYY-MM-DD'
  slotStartTime: { type: String, required: true }, // 'HH:MM'
  slotEndTime:   { type: String, required: true }, // 'HH:MM'
  // Reference back to the CallDay doc + subdoc _id so we can flip isBooked
  callDayId: { type: mongoose.Schema.Types.ObjectId, ref: 'CallDay', required: true },
  slotId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  // Payment
  paymentRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRequest', default: null },
  paymentStatus:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  amount:         { type: Number, required: true },
  // Booking status
  status: {
    type: String,
    enum: ['awaiting_payment', 'payment_submitted', 'confirmed', 'completed', 'cancelled'],
    default: 'awaiting_payment',
  },
  // Google Meet
  meetLink:      { type: String, default: null },
  googleEventId: { type: String, default: null },
  // Flags
  isFreeCall: { type: Boolean, default: false },
  // Admin notes
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('CallBooking', callBookingSchema);
