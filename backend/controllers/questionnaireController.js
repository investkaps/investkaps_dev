import RiskQuestionnaire from '../model/RiskQuestionnaire.js';
import QuestionnaireResponse from '../model/QuestionnaireResponse.js';
import User from '../model/User.js';
import logger from '../utils/logger.js';
import { sendQuestionnaireResultsEmail } from '../utils/questionnaireEmailService.js';

// ===== ADMIN ROUTES =====

/**
 * Get all questionnaires (admin only)
 */
export const getAllQuestionnaires = async (req, res) => {
  try {
    const questionnaires = await RiskQuestionnaire.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: questionnaires.length,
      data: questionnaires
    });
  } catch (error) {
    logger.error('Error fetching questionnaires:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch questionnaires'
    });
  }
};

/**
 * Get questionnaire by ID (admin only)
 */
export const getQuestionnaireById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const questionnaire = await RiskQuestionnaire.findById(id)
      .populate('createdBy', 'name email');
    
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: 'Questionnaire not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: questionnaire
    });
  } catch (error) {
    logger.error('Error fetching questionnaire:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch questionnaire'
    });
  }
};

/**
 * Create new questionnaire (admin only)
 */
export const createQuestionnaire = async (req, res) => {
  try {
    const { title, description, sections, riskProfileThresholds } = req.body;
    const userId = req.user?.id;
    
    const questionnaire = new RiskQuestionnaire({
      title: title || 'IA Risk Profiling Questionnaire',
      description: description || 'Please answer the following questions to help us understand your risk profile.',
      serviceType: 'IA',
      sections: sections || [],
      riskProfileThresholds: riskProfileThresholds || [
        { profileName: 'Conservative', minPoints: 0, maxPoints: 30, description: 'Prioritizes capital preservation with lower risk tolerance' },
        { profileName: 'Moderate', minPoints: 31, maxPoints: 60, description: 'Balanced approach with moderate risk tolerance' },
        { profileName: 'Aggressive', minPoints: 61, maxPoints: 100, description: 'High risk tolerance seeking maximum returns' }
      ],
      createdBy: userId,
      isActive: true
    });
    
    await questionnaire.save();
    
    logger.info(`Questionnaire created by admin ${userId}`);
    
    return res.status(201).json({
      success: true,
      message: 'Questionnaire created successfully',
      data: questionnaire
    });
  } catch (error) {
    logger.error('Error creating questionnaire:', error.message || error);
    console.error('Full error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create questionnaire',
      details: error.errors ? Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`) : []
    });
  }
};

/**
 * Update questionnaire (admin only)
 */
export const updateQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, sections, riskProfileThresholds, isActive } = req.body;
    
    const questionnaire = await RiskQuestionnaire.findById(id);
    
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: 'Questionnaire not found'
      });
    }
    
    if (title !== undefined) questionnaire.title = title;
    if (description !== undefined) questionnaire.description = description;
    if (sections !== undefined) questionnaire.sections = sections;
    if (riskProfileThresholds !== undefined) {
      const validThresholds = riskProfileThresholds.map((threshold) => {
        const profileName = String(threshold.profileName ?? 'Moderate').trim() || 'Moderate';

        return {
          profileName,
          minPoints: Number(threshold.minPoints) || 0,
          maxPoints: Number(threshold.maxPoints) || 100,
          description: threshold.description || ''
        };
      });
      questionnaire.riskProfileThresholds = validThresholds;
    }
    if (isActive !== undefined) questionnaire.isActive = isActive;
    
    await questionnaire.save();
    
    logger.info(`Questionnaire ${id} updated`);
    
    return res.status(200).json({
      success: true,
      message: 'Questionnaire updated successfully',
      data: questionnaire
    });
  } catch (error) {
    logger.error('Error updating questionnaire:', error.message || error);
    console.error('Full error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update questionnaire',
      details: error.errors ? Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`) : []
    });
  }
};

/**
 * Delete questionnaire (admin only)
 */
export const deleteQuestionnaire = async (req, res) => {
  try {
    const { id } = req.params;
    
    const questionnaire = await RiskQuestionnaire.findByIdAndDelete(id);
    
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: 'Questionnaire not found'
      });
    }
    
    logger.info(`Questionnaire ${id} deleted`);
    
    return res.status(200).json({
      success: true,
      message: 'Questionnaire deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting questionnaire:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete questionnaire'
    });
  }
};

/**
 * Get all user responses (admin only)
 */
export const getAllResponses = async (req, res) => {
  try {
    const responses = await QuestionnaireResponse.find()
      .populate('user', 'name email clerkId')
      .populate('questionnaire', 'title')
      .sort({ submittedAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: responses.length,
      data: responses
    });
  } catch (error) {
    logger.error('Error fetching responses:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch responses'
    });
  }
};

/**
 * Get response by ID (admin only)
 */
export const getResponseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await QuestionnaireResponse.findById(id)
      .populate('user', 'name email clerkId profile')
      .populate('questionnaire');
    
    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'Response not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Error fetching response:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch response'
    });
  }
};

// ===== USER ROUTES =====

/**
 * Get active questionnaire for IA service (user)
 */
export const getActiveQuestionnaire = async (req, res) => {
  try {
    const questionnaire = await RiskQuestionnaire.findOne({
      serviceType: 'IA',
      isActive: true
    }).sort({ createdAt: -1 });
    
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: 'No active questionnaire found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: questionnaire
    });
  } catch (error) {
    logger.error('Error fetching active questionnaire:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch questionnaire'
    });
  }
};

/**
 * Submit questionnaire response (user)
 */
export const submitResponse = async (req, res) => {
  try {
    const { questionnaireId, sectionResponses } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!questionnaireId || !sectionResponses || !Array.isArray(sectionResponses)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data'
      });
    }
    
    // Check if questionnaire exists
    const questionnaire = await RiskQuestionnaire.findById(questionnaireId);
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: 'Questionnaire not found'
      });
    }
    
    // Calculate total score
    let totalScore = 0;
    sectionResponses.forEach(section => {
      section.answers.forEach(answer => {
        totalScore += answer.points || 0;
      });
    });
    
    // Check if user already has a response for this questionnaire
    let response = await QuestionnaireResponse.findOne({
      user: userId,
      questionnaire: questionnaireId
    });
    
    if (response) {
      // Update existing response
      response.sectionResponses = sectionResponses;
      response.totalScore = totalScore;
      response.submittedAt = new Date();
      response.calculateRiskProfile(questionnaire.riskProfileThresholds);
    } else {
      // Create new response
      response = new QuestionnaireResponse({
        user: userId,
        questionnaire: questionnaireId,
        serviceType: 'IA',
        sectionResponses,
        totalScore,
        submittedAt: new Date()
      });
      response.calculateRiskProfile(questionnaire.riskProfileThresholds);
    }
    
    await response.save();
    
    logger.info(`Questionnaire response submitted by user ${userId}`);
    
    // Send email with results (non-blocking)
    try {
      const user = await User.findById(userId);
      if (user && user.email) {
        await sendQuestionnaireResultsEmail(
          user.email,
          user.name || 'User',
          questionnaire,
          {
            questionnaire: questionnaire,
            totalScore: response.totalScore,
            riskProfile: response.riskProfile,
            sectionResponses: response.sectionResponses
          }
        );
        logger.info(`Questionnaire results email sent to ${user.email}`);
      }
    } catch (emailError) {
      // Log email error but don't fail the submission
      logger.error('Failed to send questionnaire results email:', emailError);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Response submitted successfully',
      data: {
        responseId: response._id,
        totalScore: response.totalScore,
        riskProfile: response.riskProfile
      }
    });
  } catch (error) {
    logger.error('Error submitting response:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit response'
    });
  }
};

/**
 * Get user's own response (user)
 */
export const getUserResponse = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const response = await QuestionnaireResponse.findOne({
      user: userId,
      serviceType: 'IA'
    })
      .populate('questionnaire')
      .sort({ submittedAt: -1 });
    
    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'No response found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    logger.error('Error fetching user response:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch response'
    });
  }
};
