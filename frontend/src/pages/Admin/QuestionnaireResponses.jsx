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
        <>
          <div 
            className="admin-modal-backdrop"
            onClick={() => setSelectedResponse(null)}
          />
          <div className="admin-modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="admin-modal-header">
              <h3>Response Details</h3>
              <button 
                className="admin-btn-close"
                onClick={() => setSelectedResponse(null)}
              >
                ×
              </button>
            </div>

            <div className="admin-modal-content">
              <div className="admin-details-section">
                <h4>User Information</h4>
                <div className="admin-details-grid">
                  <div className="admin-details-item">
                    <span className="admin-details-label">Name</span>
                    <span className="admin-details-value">{selectedResponse.user?.name}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Email</span>
                    <span className="admin-details-value">{selectedResponse.user?.email}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Total Score</span>
                    <span className="admin-details-value">{selectedResponse.totalScore}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Risk Profile</span>
                    <span className="admin-details-value">
                      <span className={`status-badge ${getRiskBadgeStyle(selectedResponse.riskProfile)}`}>
                        {selectedResponse.riskProfile}
                      </span>
                    </span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Submitted</span>
                    <span className="admin-details-value">
                      {new Date(selectedResponse.submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-details-section">
                <h4>Responses</h4>
                {selectedResponse.sectionResponses?.map((section, sectionIndex) => (
                  <div key={sectionIndex} style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ 
                      backgroundColor: '#f0f0f0', 
                      padding: '0.5rem', 
                      borderRadius: '4px',
                      marginBottom: '0.75rem'
                    }}>
                      {section.sectionName}
                    </h5>
                    {section.answers?.map((answer, answerIndex) => (
                      <div key={answerIndex} style={{ 
                        marginBottom: '1rem', 
                        paddingLeft: '1rem',
                        borderLeft: '3px solid #ddd'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                          Q: {answer.questionText}
                        </div>
                        <div style={{ color: '#666' }}>
                          A: {answer.selectedOptionText} 
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            padding: '0.125rem 0.5rem', 
                            backgroundColor: '#e3f2fd', 
                            borderRadius: '12px',
                            fontSize: '0.85rem'
                          }}>
                            {answer.points} points
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuestionnaireResponses;
