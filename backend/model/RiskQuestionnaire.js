import mongoose from 'mongoose';

// Schema for individual question options
const OptionSchema = new mongoose.Schema({
  text: {
    type: String,
    trim: true,
    default: ''
  },
  points: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: true });

// Schema for individual questions
const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    trim: true,
    default: ''
  },
  questionType: {
    type: String,
    enum: ['mcq', 'text'],
    default: 'mcq'
  },
  options: [OptionSchema],
  isRequired: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

// Schema for sections
const SectionSchema = new mongoose.Schema({
  sectionName: {
    type: String,
    trim: true,
    default: ''
  },
  questions: [QuestionSchema],
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

// Schema for risk profile thresholds
const RiskProfileThresholdSchema = new mongoose.Schema({
  profileName: {
    type: String,
    trim: true,
    required: true,
    default: 'Moderate'
  },
  minPoints: {
    type: Number,
    required: true,
    default: 0
  },
  maxPoints: {
    type: Number,
    required: true,
    default: 100
  },
  description: {
    type: String,
    default: ''
  }
}, { _id: true });

// Main questionnaire schema
const RiskQuestionnaireSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: 'IA Risk Profiling Questionnaire'
  },
  description: {
    type: String,
    default: 'Please answer the following questions to help us understand your risk profile.'
  },
  serviceType: {
    type: String,
    enum: ['IA'],
    default: 'IA',
    required: true
  },
  sections: [SectionSchema],
  riskProfileThresholds: [RiskProfileThresholdSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Update the updatedAt field on save
RiskQuestionnaireSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('RiskQuestionnaire', RiskQuestionnaireSchema);
