import mongoose from 'mongoose';

const TestimonialSchema = new mongoose.Schema(
  {
    // 'user'  = submitted by a logged-in user
    // 'admin' = manually created by an admin (no user account required)
    source: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },

    // Populated for source='user'; null for admin-created entries
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Display name shown on the home page (user fills this in themselves)
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // e.g. "Retail Industry Professional", "Senior Banker"
    occupation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // The testimonial body text
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Admin review state
    // pending  = just submitted, awaiting admin action
    // approved = accepted; eligible to show on home (if showOnHome = true)
    // rejected = hidden / declined
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    // Whether this testimonial is currently visible on the home page
    showOnHome: {
      type: Boolean,
      default: false,
    },

    // Whether the user requested the admin to show this on home page.
    // Admin must still approve and set `showOnHome`.
    requestedShowOnHome: {
      type: Boolean,
      default: false,
    },

    // Lower number = appears first in the marquee (admin-controlled)
    displayOrder: {
      type: Number,
      default: 9999,
    },
    // Optional reason provided by admin when rejecting a user's testimonial
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Only one testimonial per logged-in user.
// Admin-created testimonials are excluded by source so admins can create unlimited entries.
TestimonialSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { source: 'user' } }
);

// Fast home-page query
TestimonialSchema.index({ showOnHome: 1, status: 1, displayOrder: 1 });

export default mongoose.model('Testimonial', TestimonialSchema);
