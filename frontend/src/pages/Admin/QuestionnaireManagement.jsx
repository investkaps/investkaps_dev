import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { adminAPI } from '../../services/api';
import './AdminDashboard.css';

const DEFAULT_RISK_PROFILES = () => [
  { profileName: 'Conservative', minPoints: 0, maxPoints: 30, description: 'Prioritizes capital preservation with lower risk tolerance' },
  { profileName: 'Moderate', minPoints: 31, maxPoints: 60, description: 'Balanced approach with moderate risk tolerance' },
  { profileName: 'Aggressive', minPoints: 61, maxPoints: 100, description: 'High risk tolerance seeking maximum returns' },
];

const createDefaultFormData = () => ({
  title: '',
  description: '',
  sections: [],
  riskProfileThresholds: DEFAULT_RISK_PROFILES(),
});

const QuestionnaireManagement = () => {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Form state
  const [formData, setFormData] = useState(createDefaultFormData());

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllQuestionnaires();
      setQuestionnaires(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching questionnaires:', err);
      setError('Failed to load questionnaires');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      title: '',
      description: '',
      sections: [],
      riskProfileThresholds: DEFAULT_RISK_PROFILES(),
    });
    setExpandedSections({});
    setIsEditing(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setIsEditing(false);
    setExpandedSections({});
    setFormData({
      title: '',
      description: '',
      sections: [],
      riskProfileThresholds: DEFAULT_RISK_PROFILES(),
    });
  };

  const openEditModal = (questionnaire) => {
    setFormData({
      title: questionnaire.title,
      description: questionnaire.description,
      sections: questionnaire.sections || [],
      riskProfileThresholds: questionnaire.riskProfileThresholds || DEFAULT_RISK_PROFILES(),
    });
    setEditingId(questionnaire._id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSaveQuestionnaire = async () => {
    try {
      setLoading(true);
      if (isEditing && editingId) {
        await adminAPI.updateQuestionnaire(editingId, formData);
      } else {
        await adminAPI.createQuestionnaire(formData);
      }
      fetchQuestionnaires();
      closeModal();
    } catch (err) {
      console.error('Error saving questionnaire:', err);
      setError('Failed to save questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestionnaire = async (id) => {
    if (window.confirm('Are you sure you want to delete this questionnaire?')) {
      try {
        setLoading(true);
        await adminAPI.deleteQuestionnaire(id);
        fetchQuestionnaires();
      } catch (err) {
        console.error('Error deleting questionnaire:', err);
        setError('Failed to delete questionnaire');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSectionExpanded = (sectionIdx) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionIdx]: !prev[sectionIdx],
    }));
  };

  const addSection = () => {
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { sectionName: '', questions: [] }],
    }));
  };

  const removeSection = (sectionIdx) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, idx) => idx !== sectionIdx),
    }));
  };

  const updateSection = (sectionIdx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIdx ? { ...section, [field]: value } : section
      ),
    }));
  };

  const addQuestion = (sectionIdx) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              questions: [
                ...section.questions,
                {
                  questionText: '',
                  questionType: 'mcq',
                  options: [
                    { text: 'Option A', points: 1 },
                    { text: 'Option B', points: 2 },
                    { text: 'Option C', points: 3 },
                    { text: 'Option D', points: 4 },
                    { text: 'Option E', points: 5 },
                  ],
                },
              ],
            }
          : section
      ),
    }));
  };

  const removeQuestion = (sectionIdx, questionIdx) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              questions: section.questions.filter((_, qIdx) => qIdx !== questionIdx),
            }
          : section
      ),
    }));
  };

  const updateQuestion = (sectionIdx, questionIdx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              questions: section.questions.map((question, qIdx) =>
                qIdx === questionIdx ? { ...question, [field]: value } : question
              ),
            }
          : section
      ),
    }));
  };

  const addOption = (sectionIdx, questionIdx) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              questions: section.questions.map((question, qIdx) =>
                qIdx === questionIdx
                  ? {
                      ...question,
                      options: [...question.options, { text: '', points: 0 }],
                    }
                  : question
              ),
            }
          : section
      ),
    }));
  };

  const removeOption = (sectionIdx, questionIdx, optionIdx) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              questions: section.questions.map((question, qIdx) =>
                qIdx === questionIdx
                  ? {
                      ...question,
                      options: question.options.filter((_, oIdx) => oIdx !== optionIdx),
                    }
                  : question
              ),
            }
          : section
      ),
    }));
  };

  const updateOption = (sectionIdx, questionIdx, optionIdx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              questions: section.questions.map((question, qIdx) =>
                qIdx === questionIdx
                  ? {
                      ...question,
                      options: question.options.map((option, oIdx) =>
                        oIdx === optionIdx ? { ...option, [field]: value } : option
                      ),
                    }
                  : question
              ),
            }
          : section
      ),
    }));
  };

  const addThreshold = () => {
    setFormData((prev) => ({
      ...prev,
      riskProfileThresholds: [
        ...prev.riskProfileThresholds,
        { profileName: '', minPoints: 0, maxPoints: 0, description: '' },
      ],
    }));
  };

  const removeThreshold = (thresholdIdx) => {
    setFormData((prev) => ({
      ...prev,
      riskProfileThresholds: prev.riskProfileThresholds.filter((_, idx) => idx !== thresholdIdx),
    }));
  };

  const updateThreshold = (thresholdIdx, field, value) => {
    setFormData((prev) => ({
      ...prev,
      riskProfileThresholds: prev.riskProfileThresholds.map((threshold, idx) =>
        idx === thresholdIdx ? { ...threshold, [field]: value } : threshold
      ),
    }));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Questionnaire Management</h1>
        <button
          onClick={openCreateModal}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          + Create Questionnaire
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && !showModal ? (
        <div>Loading questionnaires...</div>
      ) : questionnaires.length === 0 ? (
        <div style={{ padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
          No questionnaires yet. Create one to get started.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {questionnaires.map((q) => (
            <div key={q._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{q.title}</h3>
                  <p style={{ margin: '0.5rem 0', color: '#666' }}>{q.description}</p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#999' }}>
                    {q.sections?.length || 0} sections • {q.sections?.reduce((sum, s) => sum + (s.questions?.length || 0), 0) || 0} questions
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => openEditModal(q)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#0f766e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestionnaire(q._id)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '900px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
            >
              <h2 style={{ marginTop: 0 }}>{isEditing ? 'Edit Questionnaire' : 'Create Questionnaire'}</h2>

              <div className="admin-form-group">
                <label>Questionnaire Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="admin-input"
                  placeholder="e.g., IA Risk Profiling Questionnaire"
                />
              </div>

              <div className="admin-form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="admin-input"
                  placeholder="Describe the purpose of this questionnaire"
                  rows="3"
                />
              </div>

              <div className="admin-form-group" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ margin: 0 }}>
                    <strong>Sections</strong>
                  </label>
                  <button
                    onClick={addSection}
                    style={{
                      padding: '0.45rem 0.8rem',
                      backgroundColor: '#0f766e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Section
                  </button>
                </div>

                {formData.sections.length === 0 ? (
                  <div
                    style={{
                      padding: '1rem',
                      border: '1px dashed #ccc',
                      borderRadius: '8px',
                      color: '#6b7280',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    No sections yet. Add one section, then add questions inside it.
                  </div>
                ) : null}

                {formData.sections.map((section, sectionIdx) => {
                  const isExpanded = expandedSections[sectionIdx];
                  return (
                    <div
                      key={sectionIdx}
                      style={{
                        border: '1px solid #dbe3ea',
                        borderRadius: '10px',
                        marginBottom: '0.75rem',
                        backgroundColor: isExpanded ? '#f8fafc' : '#ffffff',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        onClick={() => toggleSectionExpanded(sectionIdx)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem',
                          backgroundColor: isExpanded ? '#e0f2fe' : '#f1f5f9',
                          cursor: 'pointer',
                          userSelect: 'none',
                          borderBottom: isExpanded ? '1px solid #dbe3ea' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#0f766e',
                              color: 'white',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                            }}
                          >
                            {isExpanded ? '−' : '+'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>Section {sectionIdx + 1}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              {section.sectionName ? section.sectionName : '(Untitled)'} • {section.questions.length} question(s)
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(sectionIdx);
                          }}
                          style={{
                            padding: '0.45rem 0.8rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '1rem', borderTop: '1px solid #dbe3ea' }}>
                          <input
                            type="text"
                            placeholder="Section name"
                            value={section.sectionName}
                            onChange={(e) => updateSection(sectionIdx, 'sectionName', e.target.value)}
                            className="admin-input"
                            style={{ width: '100%', marginBottom: '1rem' }}
                          />

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <strong>Questions</strong>
                            <button
                              onClick={() => addQuestion(sectionIdx)}
                              style={{
                                padding: '0.45rem 0.8rem',
                                backgroundColor: '#0f766e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              + Add Question
                            </button>
                          </div>

                          {section.questions.length === 0 ? (
                            <div style={{ padding: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', backgroundColor: 'white' }}>
                              No questions in this section yet.
                            </div>
                          ) : null}

                          {section.questions.map((question, questionIdx) => (
                            <div
                              key={questionIdx}
                              style={{
                                border: '1px solid #dbe3ea',
                                padding: '1rem',
                                marginBottom: '0.85rem',
                                borderRadius: '10px',
                                backgroundColor: 'white',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div>
                                  <div style={{ fontWeight: 600 }}>Question {sectionIdx + 1}.{questionIdx + 1}</div>
                                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    {question.questionType === 'mcq' ? 'Multiple choice' : 'Text'}
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeQuestion(sectionIdx, questionIdx)}
                                  style={{
                                    padding: '0.4rem 0.75rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Remove Question
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0.75rem' }}>
                                <input
                                  type="text"
                                  placeholder="Question text"
                                  value={question.questionText}
                                  onChange={(e) => updateQuestion(sectionIdx, questionIdx, 'questionText', e.target.value)}
                                  className="admin-input"
                                />
                                <select
                                  value={question.questionType}
                                  onChange={(e) => updateQuestion(sectionIdx, questionIdx, 'questionType', e.target.value)}
                                  className="admin-input"
                                >
                                  <option value="mcq">Multiple choice</option>
                                  <option value="text">Text answer</option>
                                </select>
                              </div>

                              {question.questionType === 'mcq' ? (
                                <div style={{ marginTop: '1rem', padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <strong>Options</strong>
                                    <button
                                      onClick={() => addOption(sectionIdx, questionIdx)}
                                      style={{
                                        padding: '0.35rem 0.7rem',
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      + Add Option
                                    </button>
                                  </div>

                                  {question.options.length === 0 ? (
                                    <div style={{ padding: '0.75rem', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', backgroundColor: 'white' }}>
                                      Add options for this multiple-choice question.
                                    </div>
                                  ) : null}

                                  {question.options.map((option, optionIdx) => (
                                    <div
                                      key={optionIdx}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 90px auto',
                                        gap: '0.5rem',
                                        marginBottom: '0.5rem',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span
                                          style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '999px',
                                            backgroundColor: '#e2e8f0',
                                            color: '#334155',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.8rem',
                                            flexShrink: 0,
                                          }}
                                        >
                                          {optionIdx + 1}
                                        </span>
                                        <input
                                          type="text"
                                          placeholder="Option text"
                                          value={option.text}
                                          onChange={(e) => updateOption(sectionIdx, questionIdx, optionIdx, 'text', e.target.value)}
                                          className="admin-input"
                                        />
                                      </div>
                                      <input
                                        type="number"
                                        placeholder="Points"
                                        value={option.points}
                                        onChange={(e) => updateOption(sectionIdx, questionIdx, optionIdx, 'points', parseInt(e.target.value) || 0)}
                                        className="admin-input"
                                      />
                                      <button
                                        onClick={() => removeOption(sectionIdx, questionIdx, optionIdx)}
                                        style={{
                                          padding: '0.35rem 0.65rem',
                                          backgroundColor: '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          height: '40px',
                                        }}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    marginTop: '1rem',
                                    padding: '0.85rem',
                                    borderRadius: '8px',
                                    backgroundColor: '#f8fafc',
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  This question uses a text answer, so options are hidden.
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="admin-form-group" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ margin: 0 }}>
                    <strong>Point System / Risk Profiles</strong>
                  </label>
                  <button
                    onClick={addThreshold}
                    style={{
                      padding: '0.45rem 0.8rem',
                      backgroundColor: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Profile
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {formData.riskProfileThresholds.map((threshold, thresholdIdx) => (
                    <div
                      key={thresholdIdx}
                      style={{
                        border: '1px solid #dbe3ea',
                        borderRadius: '10px',
                        padding: '1rem',
                        backgroundColor: '#faf5ff',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px auto', gap: '0.75rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="Profile name (customizable)"
                          value={threshold.profileName}
                          onChange={(e) => updateThreshold(thresholdIdx, 'profileName', e.target.value)}
                        />
                        <input
                          type="number"
                          className="admin-input"
                          placeholder="Min points"
                          value={threshold.minPoints}
                          onChange={(e) => updateThreshold(thresholdIdx, 'minPoints', parseInt(e.target.value) || 0)}
                        />
                        <input
                          type="number"
                          className="admin-input"
                          placeholder="Max points"
                          value={threshold.maxPoints}
                          onChange={(e) => updateThreshold(thresholdIdx, 'maxPoints', parseInt(e.target.value) || 0)}
                        />
                        <button
                          onClick={() => removeThreshold(thresholdIdx)}
                          style={{
                            padding: '0.45rem 0.8rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            height: '40px',
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <textarea
                        className="admin-input"
                        placeholder="Profile description shown to user"
                        value={threshold.description}
                        onChange={(e) => updateThreshold(thresholdIdx, 'description', e.target.value)}
                        rows="2"
                        style={{ width: '100%', marginTop: '0.75rem' }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
                  Add as many profiles as you want and name them however you like. Make sure the point ranges do not overlap.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  className="admin-btn-primary"
                  onClick={handleSaveQuestionnaire}
                  disabled={loading || !formData.title}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: loading || !formData.title ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading || !formData.title ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Saving...' : 'Save Questionnaire'}
                </button>
                <button
                  onClick={closeModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default QuestionnaireManagement;
