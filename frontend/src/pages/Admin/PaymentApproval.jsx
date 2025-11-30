import React, { useState, useEffect } from 'react';
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

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${await window.Clerk.session.getToken()}`
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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/payment-requests/approve/${requestId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await window.Clerk.session.getToken()}`
          },
          body: JSON.stringify({ adminNotes })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve payment request');
      }

      alert('Payment request approved successfully!');
      setSelectedRequest(null);
      setAdminNotes('');
      fetchPaymentRequests();
    } catch (err) {
      console.error('Error approving payment request:', err);
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/payment-requests/reject/${requestId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await window.Clerk.session.getToken()}`
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
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Plan</th>
                <th>Duration</th>
                <th>Amount</th>
                <th>Sender Name</th>
                <th>Transaction ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentRequests.map((request) => (
                <tr key={request._id}>
                  <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div>
                      <strong>{request.user?.name}</strong>
                      <div style={{ fontSize: '0.85em', color: '#6c757d' }}>
                        {request.user?.email}
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{request.planName}</strong>
                    <div style={{ fontSize: '0.85em', color: '#6c757d' }}>
                      {request.plan?.packageCode}
                    </div>
                  </td>
                  <td>
                    {request.duration === 'sixMonth' ? '6 Months' : 
                     request.duration.charAt(0).toUpperCase() + request.duration.slice(1)}
                  </td>
                  <td>
                    <strong>₹{request.amount.toLocaleString()}</strong>
                  </td>
                  <td>{request.senderName}</td>
                  <td>
                    <code style={{ fontSize: '0.85em' }}>{request.transactionId}</code>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(request.status)}>
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="admin-btn-small"
                      onClick={() => setSelectedRequest(request)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Request Details Modal */}
      {selectedRequest && (
        <>
          <div 
            className="admin-modal-backdrop" 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', 
              zIndex: 999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setSelectedRequest(null)}
          />
          <div 
            className="admin-user-details" 
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh', 
              overflowY: 'auto', 
              zIndex: 1000,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
            }}
          >
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
        </>
      )}
    </div>
  );
};

export default PaymentApproval;
