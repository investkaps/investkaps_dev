import mongoose from 'mongoose';

const emailUnsubscribeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['unsubscribed'],
    default: 'unsubscribed'
  },
  unsubscribedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: 'email_footer_link'
  }
}, {
  timestamps: true
});

const EmailUnsubscribe = mongoose.model('EmailUnsubscribe', emailUnsubscribeSchema);

export default EmailUnsubscribe;
