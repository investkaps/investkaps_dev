import mongoose from 'mongoose';

const KycVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional because user might not exist in DB yet
  },
  clerkId: {
    type: String,
    required: false // Optional for the same reason
  },
  email: {
    type: String,
    required: false, // Optional but highly recommended
    trim: true,
    lowercase: true,
    index: true // Add index for faster lookups by email
  },
  pan: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  dob: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  kycData: {
    PAN: {
      value: String,
      description: String
    },
    Name: {
      value: String,
      description: String
    },
    Status: {
      value: String,
      description: String
    },
    StatusDate: {
      value: String,
      description: String
    },
    KYCMode: {
      value: String,
      description: String
    },
    IPVFlag: {
      value: String,
      description: String
    },
    FatherName: {
      value: String,
      description: String
    },
    DOB: {
      value: String,
      description: String
    },
    Gender: {
      value: String,
      description: String
    },
    Address1: {
      value: String,
      description: String
    },
    City: {
      value: String,
      description: String
    },
    Pincode: {
      value: String,
      description: String
    },
    State: {
      value: String,
      description: String
    },
    Mobile: {
      value: String,
      description: String
    },
    Email: {
      value: String,
      description: String
    }
  },
  auditInfo: {
    type: String
  },
  error: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
KycVerificationSchema.index({ pan: 1, createdAt: -1 });
KycVerificationSchema.index({ clerkId: 1, createdAt: -1 });

export default mongoose.model('KycVerification', KycVerificationSchema);
