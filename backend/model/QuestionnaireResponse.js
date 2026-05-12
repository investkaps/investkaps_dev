import mongoose from 'mongoose';

// Schema for individual answer
const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  selectedOptionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOptionText: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

// Schema for section responses
const SectionResponseSchema = new mongoose.Schema({
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  sectionName: {
    type: String,
    required: true
  },
  answers: [AnswerSchema]
}, { _id: false });

// Main questionnaire response schema
const QuestionnaireResponseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionnaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskQuestionnaire',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['IA'],
    default: 'IA',
    required: true
  },
  sectionResponses: [SectionResponseSchema],
  totalScore: {
    type: Number,
    default: 0
  },
  riskProfile: {
    type: String,
    trim: true,
    default: 'Not Calculated'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient queries
QuestionnaireResponseSchema.index({ user: 1, serviceType: 1 });
QuestionnaireResponseSchema.index({ submittedAt: -1 });

// Method to calculate risk profile based on score and thresholds
QuestionnaireResponseSchema.methods.calculateRiskProfile = function(thresholds) {
  const score = this.totalScore;
  
  // If thresholds are provided, use them; otherwise use default values
  if (thresholds && thresholds.length > 0) {
    for (const threshold of thresholds) {
      if (score >= threshold.minPoints && score <= threshold.maxPoints) {
        this.riskProfile = threshold.profileName;
        return this.riskProfile;
      }
    }
    // If no matching threshold found, use the last one
    this.riskProfile = thresholds[thresholds.length - 1].profileName;
  } else {
    // Default thresholds if not configured
    if (score <= 30) {
      this.riskProfile = 'Conservative';
    } else if (score <= 60) {
      this.riskProfile = 'Moderate';
    } else {
      this.riskProfile = 'Aggressive';
    }
  }
  
  return this.riskProfile;
};

export default mongoose.model('QuestionnaireResponse', QuestionnaireResponseSchema);
