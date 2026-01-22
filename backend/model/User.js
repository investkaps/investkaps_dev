import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  profile: {
    phone: {
      type: String,
      trim: true,
      default: null,
      index: true  // Index for fast duplicate phone checks
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    address: {
      type: String,
      trim: true,
      default: null
    },
    city: {
      type: String,
      trim: true,
      default: null
    },
    state: {
      type: String,
      trim: true,
      default: null
    },
    pincode: {
      type: String,
      trim: true,
      default: null
    }
  },
  kycStatus: {
    isVerified: {
      type: Boolean,
      default: false
    },
    panNumber: {
      type: String,
      trim: true,
      default: null,
      index: true  // Index for fast duplicate PAN checks
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    // Reference to the latest successful KYC verification
    latestVerification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KycVerification',
      default: null
    },
    // Full name from KYC verification
    fullName: {
      type: String,
      trim: true,
      default: null
    },
    // Father's name from KYC verification
    fatherName: {
      type: String,
      trim: true,
      default: null
    },
    // Date of birth from KYC verification
    dob: {
      type: String,
      default: null
    },
    // Gender from KYC verification
    gender: {
      type: String,
      trim: true,
      default: null
    }
  },
  // All KYC verifications for this user
  kycVerifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KycVerification'
  }],
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast PAN verification checks
UserSchema.index({ 'kycStatus.panNumber': 1, 'kycStatus.isVerified': 1 });

// Update the updatedAt field on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Cascade delete related records when user is deleted
UserSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const KycVerification = mongoose.model('KycVerification');
    const Document = mongoose.model('Document');
    
    // Delete all KYC verifications for this user
    await KycVerification.deleteMany({ user: this._id });
    
    // Delete all documents for this user
    await Document.deleteMany({ user: this._id });
    
    console.log(`Cascade deleted related records for user: ${this._id}`);
    next();
  } catch (error) {
    console.error('Error in cascade delete:', error);
    next(error);
  }
});

// Also handle findOneAndDelete
UserSchema.pre('findOneAndDelete', async function(next) {
  try {
    const KycVerification = mongoose.model('KycVerification');
    const Document = mongoose.model('Document');
    
    const user = await this.model.findOne(this.getFilter());
    if (user) {
      await KycVerification.deleteMany({ user: user._id });
      await Document.deleteMany({ user: user._id });
      console.log(`Cascade deleted related records for user: ${user._id}`);
    }
    next();
  } catch (error) {
    console.error('Error in cascade delete:', error);
    next(error);
  }
});

export default mongoose.model('User', UserSchema);
