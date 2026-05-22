import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true
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
  // ── Verification Status Flags ──────────────────────────────────────────────
  // These are the ONLY onboarding status values the frontend ever reads.
  // Sensitive data (PAN, DOB, CAMS blobs) lives exclusively in KycVerification
  // and Document schemas — never on this document.
  //
  // null  = step not yet started
  // true  = step completed successfully
  // false = step attempted but failed / blocked
  verificationStatus: {
    panKyc: {
      type: Boolean,
      default: null  // null = not started
    },
    phone: {
      type: Boolean,
      default: null  // null = not started
    },
    esign: {
      type: Boolean,
      default: null  // null = not started
    }
  },

  kycStatus: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    // Reference to the latest successful KYC verification record
    // Raw PAN/DOB/CAMS data lives there, NOT here.
    latestVerification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KycVerification',
      default: null
    },
    // Per-user KYC attempt tracking (max 3 failed attempts then blocked)
    kycAttempts: {
      type: Number,
      default: 0
    },
    kycBlocked: {
      type: Boolean,
      default: false
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
  // Track which service types the user has completed onboarding for
  clientTypes: {
    RA: {
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date,
        default: null
      },
      agreementDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        default: null
      }
    },
    IA: {
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date,
        default: null
      },
      agreementDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        default: null
      }
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

// Index for fast onboarding status lookups
UserSchema.index({ 'verificationStatus.panKyc': 1 });
UserSchema.index({ 'kycStatus.isVerified': 1 });

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
