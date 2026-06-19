import React, { useState, useEffect } from 'react';
import Modal from '../../components/Shared/Modal';
import './AdminDashboard.css';

const PaymentApproval = () => {
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPaymentRequests();
  }, [filterStatus]);

  const fetchPaymentRequests = async () => {
    try {
      setLoading(true);
      const url = filterStatus === 'all'
        ? `${import.meta.env.VITE_API_URL}/payment-requests/all`
        : `${import.meta.env.VITE_API_URL}/payment-requests/all?status=${filterStatus}`;

      const token = localStorage.getItem('clerk_jwt');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payment requests');
      }

      setPaymentRequests(data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching payment requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this payment request? This will activate the user\'s subscription.')) {
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('clerk_jwt');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/payment-requests/approve/${requestId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ adminNotes })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Server error ${response.status}`);
      }

      alert('Payment approved! Subscription activated.');
      setSelectedRequest(null);
      setAdminNotes('');
      fetchPaymentRequests();
    } catch (err) {
      console.error('Error approving payment request:', err);
      alert('Approval failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('clerk_jwt');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/payment-requests/reject/${requestId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ adminNotes: reason })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject payment request');
      }

      alert('Payment request rejected');
      setSelectedRequest(null);
      fetchPaymentRequests();
    } catch (err) {
      console.error('Error rejecting payment request:', err);
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-badge pending';
      case 'approved':
        return 'status-badge verified';
      case 'rejected':
        return 'status-badge failed';
      default:
        return 'status-badge';
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2>Payment Approval</h2>
        <p>Review and approve QR code payment requests</p>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      <div className="admin-filters">
        <div className="admin-filter-group">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-inline">
          <div className="spinner-small"></div>
          <span>Loading payment requests...</span>
        </div>
      ) : paymentRequests.length === 0 ? (
        <div className="admin-empty-state">
          <p>No payment requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {paymentRequests.map((request) => (
            <div key={request._id} style={{
              background: '#fff',
              border: '1.5px solid #e5e7eb',
              borderRadius: '12px',
              padding: '18px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              {/* Top row: user + meta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{request.user?.name || '—'}</strong>
                  <div style={{ fontSize: '0.82rem', color: '#6c757d' }}>{request.user?.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700,
                    background: request.serviceType === 'IA' ? '#dbeafe' : '#fef3c7',
                    color: request.serviceType === 'IA' ? '#1e40af' : '#92400e',
                  }}>{request.serviceType}</span>
                  <span className={getStatusBadgeClass(request.status)} style={{ fontSize: '0.8rem' }}>
                    {request.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 16px', marginBottom: '14px', fontSize: '0.875rem' }}>
                <div><span style={{ color: '#6c757d' }}>Plan</span><br /><strong>{request.planName || (request.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'QR Payment')}</strong></div>
                <div><span style={{ color: '#6c757d' }}>Duration</span><br /><strong>{request.serviceType === 'RA' ? (request.duration === 'sixMonth' ? '6 Months' : request.duration?.charAt(0).toUpperCase() + request.duration?.slice(1)) : 'N/A'}</strong></div>
                <div><span style={{ color: '#6c757d' }}>Amount</span><br /><strong style={{ color: '#059669', fontSize: '1rem' }}>₹{Number(request.amount).toLocaleString()}</strong></div>
                <div><span style={{ color: '#6c757d' }}>Sender Name</span><br /><strong>{request.senderName}</strong></div>
                <div><span style={{ color: '#6c757d' }}>Transaction ID</span><br /><code style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{request.transactionId}</code></div>
              </div>

              {/* Action buttons row */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="admin-btn-small"
                  onClick={() => setSelectedRequest(request)}
                >
                  View Screenshot
                </button>
                {request.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(request._id)}
                      disabled={processing}
                      style={{
                        padding: '8px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        opacity: processing ? 0.6 : 1,
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(request._id)}
                      disabled={processing}
                      style={{
                        padding: '8px 20px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        opacity: processing ? 0.6 : 1,
                      }}
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Request Details Modal */}
      {selectedRequest && (
        <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)}>
          <div className="admin-user-details" style={{ width: '100%', maxWidth: '800px' }}>
            <div className="admin-details-header">
              <h3>Payment Request Details</h3>
              <button 
                className="admin-btn-close"
                onClick={() => setSelectedRequest(null)}
              >
                ×
              </button>
            </div>
            
            <div className="admin-details-content">
              <div className="admin-details-section">
                <h4>User Information</h4>
                <div className="admin-details-grid">
                  <div className="admin-details-item">
                    <span className="admin-details-label">Name</span>
                    <span className="admin-details-value">{selectedRequest.user?.name}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Email</span>
                    <span className="admin-details-value">{selectedRequest.user?.email}</span>
                  </div>
                </div>
              </div>

              <div className="admin-details-section">
                <h4>Subscription Details</h4>
                <div className="admin-details-grid">
                  <div className="admin-details-item">
                    <span className="admin-details-label">Service Type</span>
                    <span className="admin-details-value">
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: '600',
                        backgroundColor: selectedRequest.serviceType === 'IA' ? '#dbeafe' : '#fef3c7',
                        color: selectedRequest.serviceType === 'IA' ? '#1e40af' : '#92400e'
                      }}>
                        {selectedRequest.serviceType}
                      </span>
                    </span>
                  </div>
                  {selectedRequest.serviceType === 'RA' && (
                    <>
                      <div className="admin-details-item">
                        <span className="admin-details-label">Plan</span>
                        <span className="admin-details-value">{selectedRequest.planName}</span>
                      </div>
                      <div className="admin-details-item">
                        <span className="admin-details-label">Duration</span>
                        <span className="admin-details-value">
                          {selectedRequest.duration === 'sixMonth' ? '6 Months' : 
                           selectedRequest.duration.charAt(0).toUpperCase() + selectedRequest.duration.slice(1)}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedRequest.serviceType === 'IA' && (
                    <div className="admin-details-item">
                      <span className="admin-details-label">Payment Method</span>
                      <span className="admin-details-value">
                        {selectedRequest.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'QR Payment'}
                      </span>
                    </div>
                  )}
                  <div className="admin-details-item">
                    <span className="admin-details-label">Amount</span>
                    <span className="admin-details-value">
                      <strong style={{ fontSize: '1.2em', color: '#667eea' }}>
                        ₹{selectedRequest.amount.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-details-section">
                <h4>Payment Information</h4>
                <div className="admin-details-grid">
                  <div className="admin-details-item">
                    <span className="admin-details-label">Sender Name</span>
                    <span className="admin-details-value">{selectedRequest.senderName}</span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Transaction ID</span>
                    <span className="admin-details-value">
                      <code>{selectedRequest.transactionId}</code>
                    </span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Status</span>
                    <span className="admin-details-value">
                      <span className={getStatusBadgeClass(selectedRequest.status)}>
                        {selectedRequest.status}
                      </span>
                    </span>
                  </div>
                  <div className="admin-details-item">
                    <span className="admin-details-label">Submitted On</span>
                    <span className="admin-details-value">
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-details-section">
                <h4>Transaction Screenshot</h4>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <img 
                    src={selectedRequest.transactionImageUrl} 
                    alt="Transaction proof" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '500px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div style={{ marginTop: '10px' }}>
                    <a 
                      href={selectedRequest.transactionImageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#667eea', textDecoration: 'none' }}
                    >
                      Open in new tab →
                    </a>
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="admin-details-section">
                  <h4>Admin Notes (Optional)</h4>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add any notes about this payment..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {selectedRequest.adminNotes && (
                <div className="admin-details-section">
                  <h4>Admin Notes</h4>
                  <p style={{ 
                    padding: '12px', 
                    background: '#f9fafb', 
                    borderRadius: '8px',
                    color: '#374151'
                  }}>
                    {selectedRequest.adminNotes}
                  </p>
                  {selectedRequest.approvedBy && (
                    <p style={{ fontSize: '0.85em', color: '#6c757d', marginTop: '8px' }}>
                      By: {selectedRequest.approvedBy.name} on{' '}
                      {new Date(selectedRequest.approvedAt || selectedRequest.rejectedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginTop: '24px',
                  padding: '20px',
                  background: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <button
                    onClick={() => handleApprove(selectedRequest._id)}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      opacity: processing ? 0.6 : 1
                    }}
                  >
                    {processing ? 'Processing...' : '✓ Approve Payment'}
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest._id)}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      opacity: processing ? 0.6 : 1
                    }}
                  >
                    {processing ? 'Processing...' : '✕ Reject Payment'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PaymentApproval;
