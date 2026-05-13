import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './AdminDashboard.css';

const QuestionnaireResponses = () => {
  const [responses, setResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllQuestionnaireResponses();
      setResponses(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching responses:', err);
      setError('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  const viewResponseDetails = async (responseId) => {
    try {
      setLoading(true);
      const response = await adminAPI.getQuestionnaireResponseById(responseId);
      setSelectedResponse(response.data);
    } catch (err) {
      console.error('Error fetching response details:', err);
      alert('Failed to load response details');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeStyle = (riskProfile) => {
    const lower = String(riskProfile || '').toLowerCase();
    if (lower.includes('conserv')) return 'inactive';
    if (lower.includes('moder')) return 'pending';
    if (lower.includes('aggress')) return 'active';
    return 'default';
  };

  if (loading && responses.length === 0) {
    return <div className="admin-loading">Loading responses...</div>;
  }

  return (
    <div className="admin-content">
      <div className="admin-header">
        <h2>Questionnaire Responses</h2>
        <button className="admin-btn-secondary" onClick={fetchResponses}>
          Refresh
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Total Score</th>
              <th>Risk Profile</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((response) => (
              <tr key={response._id}>
                <td>{response.user?.name || 'N/A'}</td>
                <td>{response.user?.email || 'N/A'}</td>
                <td>{response.totalScore}</td>
                <td>
                  <span className={`status-badge ${getRiskBadgeStyle(response.riskProfile)}`}>
                    {response.riskProfile}
                  </span>
                </td>
                <td>{new Date(response.submittedAt).toLocaleString()}</td>
                <td>
                  <button 
                    className="admin-btn-small"
                    onClick={() => viewResponseDetails(response._id)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Response Details Modal */}
      {selectedResponse && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }} onClick={() => setSelectedResponse(null)}>
          
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '600' }}>
                Questionnaire Response
              </h3>
              <button 
                onClick={() => setSelectedResponse(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1,
              backgroundColor: '#ffffff'
            }}>
              {/* User Info Grid */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#334155', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>User Information</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1.25rem',
                  backgroundColor: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Name</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>{selectedResponse.user?.name || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Email</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>{selectedResponse.user?.email || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Total Score</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>{selectedResponse.totalScore}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Risk Profile</span>
                    <span>
                      <span className={`status-badge ${getRiskBadgeStyle(selectedResponse.riskProfile)}`}>
                        {selectedResponse.riskProfile}
                      </span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Submitted</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>
                      {new Date(selectedResponse.submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answers Section */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#334155', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>Detailed Responses</h4>
                
                {selectedResponse.sectionResponses?.length > 0 ? (
                  selectedResponse.sectionResponses.map((section, sectionIndex) => (
                    <div key={sectionIndex} style={{ marginBottom: '2rem' }}>
                      <h5 style={{ 
                        margin: '0 0 1rem 0',
                        backgroundColor: '#f1f5f9', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '6px',
                        color: '#334155',
                        borderLeft: '4px solid #6366f1',
                        fontSize: '1rem'
                      }}>
                        {section.sectionName || `Section ${sectionIndex + 1}`}
                      </h5>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {section.answers?.length > 0 ? (
                          section.answers.map((answer, answerIndex) => (
                            <div key={answerIndex} style={{ 
                              padding: '1rem',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                <span style={{ color: '#64748b', marginRight: '0.5rem' }}>Q{answerIndex + 1}.</span>
                                {answer.questionText}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                                <div style={{ color: '#0f172a', fontWeight: '500' }}>
                                  <span style={{ color: '#64748b', marginRight: '0.5rem' }}>A:</span>
                                  {answer.selectedOptionText}
                                </div>
                                <span style={{ 
                                  padding: '0.25rem 0.75rem', 
                                  backgroundColor: '#e0e7ff', 
                                  color: '#4338ca',
                                  borderRadius: '20px',
                                  fontSize: '0.85rem',
                                  fontWeight: '600'
                                }}>
                                  {answer.points} points
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '1rem', color: '#64748b', fontStyle: 'italic', backgroundColor: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                            No answers recorded for this section.
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    No responses found for this submission.
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={() => setSelectedResponse(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#64748b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#475569'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#64748b'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionnaireResponses;
