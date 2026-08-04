import mongoose from 'mongoose';

const STATUS_RANK = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4
};

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  errorCode: String,
  errorTitle: String,
  errorMessage: String,
  raw: mongoose.Schema.Types.Mixed
}, { _id: false });

const whatsAppMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  to: {
    type: String,
    required: true,
    index: true
  },
  notificationType: {
    type: String,
    required: true,
    index: true
  },
  templateName: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'en'
  },
  params: {
    type: [String],
    default: []
  },
  messageId: {
    type: String,
    default: null,
    sparse: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'queued',
    index: true
  },
  statusHistory: {
    type: [statusHistorySchema],
    default: []
  },
  failureReason: {
    type: String,
    default: null
  },
  metaResponse: mongoose.Schema.Types.Mixed,
  context: mongoose.Schema.Types.Mixed
}, { timestamps: true });

whatsAppMessageSchema.index({ createdAt: -1 });
whatsAppMessageSchema.index({ user: 1, createdAt: -1 });
whatsAppMessageSchema.index({ status: 1, createdAt: -1 });

whatsAppMessageSchema.statics.statusRank = function (status) {
  return STATUS_RANK[status] ?? -1;
};

/**
 * Advance status without downgrading (except failed, which can land anytime).
 * Returns true if the document was updated.
 */
whatsAppMessageSchema.methods.applyStatusUpdate = function ({
  status,
  timestamp = new Date(),
  errorCode = null,
  errorTitle = null,
  errorMessage = null,
  raw = null
} = {}) {
  if (!status || !STATUS_RANK.hasOwnProperty(status)) {
    return false;
  }

  const currentRank = STATUS_RANK[this.status] ?? -1;
  const nextRank = STATUS_RANK[status];
  const isFailure = status === 'failed';
  const isUpgrade = nextRank > currentRank;

  // Ignore duplicate non-failure updates for the same status
  if (!isFailure && this.status === status) {
    return false;
  }

  // Do not downgrade (e.g. read → delivered)
  if (!isFailure && nextRank < currentRank) {
    return false;
  }

  this.statusHistory.push({
    status,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    errorCode: errorCode || undefined,
    errorTitle: errorTitle || undefined,
    errorMessage: errorMessage || undefined,
    raw: raw || undefined
  });

  this.status = status;

  if (isFailure) {
    this.failureReason = [errorTitle, errorMessage, errorCode].filter(Boolean).join(' — ') || 'Message failed';
  }

  return true;
};

const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);

export default WhatsAppMessage;
export { STATUS_RANK };
