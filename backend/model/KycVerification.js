import mongoose from "mongoose";

const KycVerificationSchema = new mongoose.Schema({

  // ========================
  // USER LINKS
  // ========================

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },

  clerkId: {
    type: String,
    required: false
  },

  
  // ========================
  // BASIC KYC INPUT
  // ========================

  pan: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
    // Index defined in compound index below
  },

  dob: {
    type: String,
    required: true
  },

  // ========================
  // EXTRACTED FIELDS (for indexing/searching)
  // ========================

  fullName: {
    type: String,
    trim: true
    // Index defined below
  },

  // ========================
  // CAMS STATUS FIELDS
  // ========================

  // Raw CAMS status code (e.g., "07", "05")
  camsStatusCode: {
    type: String,
    trim: true
  },

  // Mapped human-readable status
  kycStatus: {
    type: String,
    enum: [
      "VERIFIED",      // 07 - Fully verified
      "PENDING",       // 02 - Pending verification
      "INCOMPLETE",    // 05 - Incomplete documents
      "REGISTERED",    // 01 - Just registered
      "ON_HOLD",       // 03 - On hold
      "REJECTED",      // 04 - Rejected
      "DEACTIVATED",   // 06 - Deactivated
      "SUSPENDED",     // 08 - Suspended
      "EXPIRED",       // 09 - Expired
      "MODIFIED",      // 10 - Modified
      "UNKNOWN"        // Unknown/unmapped status
    ]
    // Index defined below
  },

  // Additional CAMS metadata
  kycMode: String,        // KYC mode from CAMS
  signFlag: String,       // Signature flag (Y/N)
  ipvFlag: String,        // IPV flag (Y/N)

  // ========================
  // STATUS
  // ========================

  status: {
    type: String,
    enum: ["success", "failed"],
    required: true
  },

  // ========================
  // CAMS RAW RESPONSES
  // ========================

  camsEnquiryData: {
    type: Object   // PANEnquiry decrypted JSON
  },

  camsDownloadData: {
    type: Object   // PANDownload decrypted JSON (full KYC)
  },

  // ========================
  // OPTIONAL META
  // ========================

  auditInfo: String,

  error: String,

  createdAt: {
    type: Date,
    default: Date.now
  }

});


// ========================
// INDEXES (No duplicates - only compound indexes)
// ========================

// Primary lookup indexes
KycVerificationSchema.index({ pan: 1, createdAt: -1 });
KycVerificationSchema.index({ clerkId: 1, createdAt: -1 });

// Search and filter indexes
KycVerificationSchema.index({ fullName: 1 });
KycVerificationSchema.index({ kycStatus: 1, createdAt: -1 });
KycVerificationSchema.index({ status: 1, pan: 1 });
KycVerificationSchema.index({ camsStatusCode: 1 });

export default mongoose.model("KycVerification", KycVerificationSchema);
