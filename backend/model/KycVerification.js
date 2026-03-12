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

  // Mapped human-readable status (normalized, matches camsStatusMapper output)
  kycStatus: {
    type: String,
    enum: [
      'VERIFIED',  // codes 02, 07, 12, 22
      'PENDING',   // codes 01, 11
      'ON_HOLD',   // codes 03, 13
      'REJECTED',  // codes 04, 14
      'UNKNOWN'    // codes 05, 06, or unrecognised
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
    type: Object   // PANEnquiry decrypted JSON (not used in current flow)
  },

  camsDownloadData: {
    type: Object   // Extracted structured fields from the EC2 response
  },

  // ========================
  // FULL EC2 API RESPONSE (audit / compliance)
  // ========================

  // The complete, unmodified JSON returned by the AWS EC2 FastAPI service.
  // Stored for audit and debugging purposes ONLY.
  // Access must be restricted to admin roles – never returned to the frontend.
  // Purged automatically via the piiPurgeAt TTL index after 90 days.
  rawEc2Response: {
    type: Object
  },

  // ========================
  // PII RETENTION POLICY
  // ========================

  // Auto-purge after 90 days (configurable per-record).
  // MongoDB TTL index on this field deletes the entire document when it expires.
  // Retention period: 90 days (DPDP Act – minimum necessary storage principle).
  piiPurgeAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from creation
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

// TTL index – MongoDB background job auto-deletes documents when piiPurgeAt elapses.
// expireAfterSeconds: 0 means "delete as soon as the Date value is reached".
KycVerificationSchema.index({ piiPurgeAt: 1 }, { expireAfterSeconds: 0, sparse: true });

export default mongoose.model("KycVerification", KycVerificationSchema);
