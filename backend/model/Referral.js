import mongoose from 'mongoose';

const ReferralSchema = new mongoose.Schema(
  {
    // The user who shared their code
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The user who used the code
    referred: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // A user can only be referred once
    },
    // The code that was entered
    referralCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    // pending  = code applied but the qualifying RA payment not yet approved
    // rewarded = payment approved, referrer got +1 month on their Referral Plan
    status: {
      type: String,
      enum: ['pending', 'rewarded'],
      default: 'pending',
    },
    rewardedAt: {
      type: Date,
      default: null,
    },
    // The payment request that triggered the reward (set at approval time)
    paymentRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentRequest',
      default: null,
    },
    // Snapshot of the referral plan subscription after this reward
    referralPlanSubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserSubscription',
      default: null,
    },
  },
  { timestamps: true }
);

ReferralSchema.index({ referrer: 1, status: 1 });
ReferralSchema.index({ referralCode: 1 });

export default mongoose.model('Referral', ReferralSchema);
