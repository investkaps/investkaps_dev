import React, { useState, useEffect } from 'react';
import { questionnaireAPI } from '../../services/api';
import './RiskQuestionnaire.css';

const RiskQuestionnaire = ({ onComplete, onSkip }) => {
  const [questionnaire, setQuestionnaire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [showReview, setShowReview] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchQuestionnaire();
  }, []);

  const fetchQuestionnaire = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getActiveQuestionnaire();
      setQuestionnaire(response.data);
      
      // Initialize responses object
      const initialResponses = {};
      response.data.sections.forEach(section => {
        section.questions.forEach(question => {
          initialResponses[question._id] = null;
        });
      });
      setResponses(initialResponses);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching questionnaire:', err);
      setError('Failed to load questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionId, optionId, optionText, points) => {
    setResponses({
      ...responses,
      [questionId]: { optionId, optionText, points }
    });
  };

  const isCurrentSectionComplete = () => {
    if (!questionnaire) return false;
    
    const currentSection = questionnaire.sections[currentSectionIndex];
    return currentSection.questions.every(question => {
      return responses[question._id] !== null;
    });
  };

  const handleNext = () => {
    if (currentSectionIndex < questionnaire.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    } else {
      // Show review step after completing last section
      setShowReview(true);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setCalculating(true);
      
      // Format responses for backend
      const sectionResponses = questionnaire.sections.map(section => ({
        sectionId: section._id,
        sectionName: section.sectionName,
        answers: section.questions
          .filter(question => responses[question._id])
          .map(question => ({
            questionId: question._id,
            questionText: question.questionText,
            selectedOptionId: responses[question._id].optionId,
            selectedOptionText: responses[question._id].optionText,
            points: responses[question._id].points
          }))
      }));

      const submitData = {
        questionnaireId: questionnaire._id,
        sectionResponses
      };

      setSubmitting(true);
      const result = await questionnaireAPI.submitResponse(submitData);
      
      if (result.success) {
        onComplete && onComplete({
          totalScore: result.data.totalScore,
          riskProfile: result.data.riskProfile
        });
      }
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      setError('Failed to submit questionnaire. Please try again.');
    } finally {
      setCalculating(false);
      setSubmitting(false);
    }
  };

  const handleBackToEdit = () => {
    setShowReview(false);
    setCurrentSectionIndex(questionnaire.sections.length - 1);
  };

  const calculateTotalScore = () => {
    let total = 0;
    Object.values(responses).forEach(response => {
      if (response) total += response.points || 0;
    });
    return total;
  };

  if (loading) {
    return (
      <div className="risk-questionnaire-container">
        <div className="risk-questionnaire-loading">
          <div className="spinner"></div>
          <p>Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (calculating) {
    return (
      <div className="risk-questionnaire-container">
        <div className="risk-questionnaire-loading">
          <div className="spinner"></div>
          <p>Calculating your risk profile...</p>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="risk-questionnaire-container">
        <div className="risk-questionnaire-loading">
          <div className="spinner"></div>
          <p>Saving your responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="risk-questionnaire-container">
        <div className="risk-questionnaire-error">
          <p>{error}</p>
          <button onClick={fetchQuestionnaire} className="btn-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!questionnaire || !questionnaire.sections || questionnaire.sections.length === 0) {
    return (
      <div className="risk-questionnaire-container">
        <div className="risk-questionnaire-error">
          <p>No questionnaire available at this time.</p>
          {onSkip && (
            <button onClick={onSkip} className="btn-skip">
              Continue Without Questionnaire
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentSection = questionnaire.sections[currentSectionIndex];
  const progress = showReview ? 100 : ((currentSectionIndex + 1) / questionnaire.sections.length) * 100;

  // Render review step
  if (showReview) {
    const totalScore = calculateTotalScore();
    
    return (
      <div className="risk-questionnaire-container">
        <div className="risk-questionnaire-card">
          <div className="risk-questionnaire-header">
            <h2>{questionnaire.title}</h2>
            <p className="risk-questionnaire-description">Review your responses before submitting</p>
          </div>

          <div className="risk-questionnaire-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '100%' }}></div>
            </div>
            <p className="progress-text">Review Your Responses</p>
          </div>

          <div style={{ backgroundColor: '#fff3cd', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', borderLeft: '4px solid #ffc107' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404', fontSize: '1.1rem' }}>Important Notice</h3>
            <p style={{ margin: 0, color: '#856404', lineHeight: '1.6' }}>
              Please review your responses carefully. Once submitted, these responses will be considered final and will be used to calculate your risk profile. A copy of your responses will be sent to your email address.
            </p>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>Your Responses</h3>
            {questionnaire.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '1rem', color: '#1a2a3a', paddingBottom: '0.5rem', borderBottom: '2px solid #e0e0e0' }}>
                  {section.sectionName}
                </h4>
                {section.questions.map((question, questionIndex) => (
                  <div key={question._id} style={{ marginBottom: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #4CAF50' }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem', color: '#333' }}>
                      Q{questionIndex + 1}: {question.questionText}
                    </div>
                    <div style={{ color: '#666' }}>
                      <strong>Your Answer:</strong> {responses[question._id]?.optionText || 'Not answered'}
                      <span style={{ marginLeft: '0.5rem', padding: '0.25rem 0.75rem', backgroundColor: '#e3f2fd', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '500' }}>
                        {responses[question._id]?.points || 0} points
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#e3f2fd', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976D2', fontSize: '1.5rem' }}>Estimated Total Score</h3>
            <p style={{ margin: 0, color: '#1976D2', fontSize: '2.5rem', fontWeight: '700' }}>{totalScore} points</p>
          </div>

          <div className="risk-questionnaire-actions">
            <button
              onClick={handleBackToEdit}
              className="btn-secondary"
            >
              ← Back to Edit
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
            >
              Submit Final Responses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="risk-questionnaire-container">
      <div className="risk-questionnaire-card">
        <div className="risk-questionnaire-header">
          <h2>{questionnaire.title}</h2>
          <p className="risk-questionnaire-description">{questionnaire.description}</p>
        </div>

        <div className="risk-questionnaire-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">
            Section {currentSectionIndex + 1} of {questionnaire.sections.length}
          </p>
        </div>

        <div className="risk-questionnaire-section">
          <h3 className="section-title">{currentSection.sectionName}</h3>

          {currentSection.questions.map((question, qIndex) => (
            <div key={question._id} className="question-block">
              <p className="question-text">
                <span className="question-number">{qIndex + 1}.</span>
                {question.questionText}
                {question.isRequired && <span className="required-mark">*</span>}
              </p>

              <div className="options-list">
                {question.options.map((option) => (
                  <label
                    key={option._id}
                    className={`option-item ${
                      responses[question._id]?.optionId === option._id ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={question._id}
                      value={option._id}
                      checked={responses[question._id]?.optionId === option._id}
                      onChange={() =>
                        handleOptionSelect(question._id, option._id, option.text, option.points)
                      }
                    />
                    <span className="option-text">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="risk-questionnaire-actions">
          <button
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0}
            className="btn-secondary"
          >
            Previous
          </button>

          {currentSectionIndex < questionnaire.sections.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isCurrentSectionComplete()}
              className="btn-primary"
            >
              Next Section
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isCurrentSectionComplete() || submitting}
              className="btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskQuestionnaire;
