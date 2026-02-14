import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['agreement', 'kyc', 'receipt', 'other']
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  esign: {
    // Flexible schema to store any Leegality API response
    // Initial request response + status check responses
    initialResponse: {
      type: Object // Stores the complete initial sign request response
    },
    statusResponse: {
      type: Object // Stores the latest status check response
    },
    // Extracted key fields for easy querying
    documentId: {
      type: String
    },
    irn: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'expired', 'SENT', 'SIGNED', 'COMPLETED', 'REJECTED', 'EXPIRED', 'INACTIVE'],
      default: 'pending'
    },
    currentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'expired', 'SENT', 'SIGNED', 'COMPLETED', 'REJECTED', 'EXPIRED', 'INACTIVE'],
      default: 'pending'
    },
    // Signing details extracted from responses
    signingDetails: {
      total: { type: Number, default: 0 },
      signed: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      expired: { type: Number, default: 0 },
      pending: { type: Number, default: 0 }
    },
    // Files and audit trail URLs (from status check)
    files: [{
      name: String,
      url: String
    }],
    auditTrail: {
      url: String
    },
    // Invitees/requests (merged from both responses)
    invitees: [{
      name: String,
      email: String,
      signUrl: String,
      signed: Boolean,
      rejected: Boolean,
      expired: Boolean,
      active: Boolean,
      expiryDate: String,
      signedAt: Date,
      signType: String
    }],
    // Timestamps
    signedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
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

// Update the updatedAt field on save
DocumentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Document', DocumentSchema);
