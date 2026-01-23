import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!currentUser?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Try to get user details by clerkId first
        try {
          const response = await userAPI.getUserByClerkId(currentUser.id);
          if (response.success && response.user) {
            setUserDetails(response.user);
            return;
          }
        } catch (err) {
          console.log('Could not fetch by clerkId, trying email...');
        }
        
        // If that fails, try by email
        if (currentUser.email) {
          const response = await userAPI.getUserByEmail(currentUser.email);
          if (response.success && response.user) {
            setUserDetails(response.user);
            return;
          }
        }
        
        // If we get here, we couldn't fetch detailed user info
        // Fall back to the currentUser from context
        setUserDetails(currentUser);
        
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError('Could not load your profile information. Please try again later.');
        // Fall back to currentUser from context
        setUserDetails(currentUser);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserDetails();
  }, [currentUser]);

  // Fetch payment requests
  useEffect(() => {
    const fetchPaymentRequests = async () => {
      if (!currentUser?.id) return;
      
      try {
        setLoadingPaymentRequests(true);
        const token = await window.Clerk.session.getToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/payment-requests/my-requests`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPaymentRequests(data.data || []);
          }
        }
      } catch (err) {
        console.error('Error fetching payment requests:', err);
      } finally {
        setLoadingPaymentRequests(false);
      }
    };
    
    fetchPaymentRequests();
  }, [currentUser]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="profile-page loading">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Your Profile</h1>
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2>Basic Information</h2>
            <div className="profile-card">
              <div className="profile-avatar">
                {userDetails?.name ? userDetails.name[0].toUpperCase() : 'U'}
              </div>
              <div className="profile-details">
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{userDetails?.name || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{userDetails?.email || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{userDetails?.profile?.phone || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Type</span>
                  <span className="detail-value">{userDetails?.role || 'Customer'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Account Created</span>
                  <span className="detail-value">{formatDate(userDetails?.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Updated</span>
                  <span className="detail-value">{formatDate(userDetails?.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {userDetails?.profile && (
            <div className="profile-section">
              <h2>Contact Information</h2>
              <div className="profile-card">
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{userDetails.profile.phone || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{userDetails.profile.address || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">City</span>
                  <span className="detail-value">{userDetails.profile.city || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">State</span>
                  <span className="detail-value">{userDetails.profile.state || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pincode</span>
                  <span className="detail-value">{userDetails.profile.pincode || 'Not provided'}</span>
                </div>
              </div>
            </div>
          )}

          {userDetails?.kycStatus && (
            <div className="profile-section">
              <h2>KYC Information</h2>
              <div className="profile-card">
                <div className="detail-item">
                  <span className="detail-label">KYC Status</span>
                  <span className={`detail-value ${userDetails.kycStatus.isVerified ? 'verified' : 'unverified'}`}>
                    {userDetails.kycStatus.isVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>
                {userDetails.kycStatus.isVerified && (
                  <>
                    <div className="detail-item">
                      <span className="detail-label">Full Name</span>
                      <span className="detail-value">{userDetails.kycStatus.fullName || 'Not available'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Father's Name</span>
                      <span className="detail-value">{userDetails.kycStatus.fatherName || 'Not available'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Date of Birth</span>
                      <span className="detail-value">{userDetails.kycStatus.dob || 'Not available'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Gender</span>
                      <span className="detail-value">{userDetails.kycStatus.gender || 'Not available'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">PAN Number</span>
                      <span className="detail-value">{userDetails.kycStatus.panNumber || 'Not available'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Verified At</span>
                      <span className="detail-value">{formatDate(userDetails.kycStatus.verifiedAt)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {userDetails?.kycVerifications && userDetails.kycVerifications.length > 0 && (
            <div className="profile-section">
              <h2>KYC Verification History</h2>
              <div className="profile-card">
                <table className="kyc-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetails.kycVerifications.map((verification, index) => (
                      <tr key={index}>
                        <td>{formatDate(verification.createdAt)}</td>
                        <td className={verification.status}>{verification.status}</td>
                        <td>{verification.method || 'PAN Verification'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {userDetails?.documents && userDetails.documents.length > 0 && (
            <div className="profile-section">
              <h2>Your Documents</h2>
              <div className="profile-card">
                <table className="documents-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetails.documents.map((doc, index) => (
                      <tr key={index}>
                        <td>{doc.name}</td>
                        <td>{doc.type}</td>
                        <td>{formatDate(doc.createdAt)}</td>
                        <td>{doc.esign?.status || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subscription Information Section - Always show if there are subscriptions OR non-approved payment requests */}
          {((userDetails?.userSubscriptions && userDetails.userSubscriptions.length > 0) || 
            paymentRequests.filter(req => req.status !== 'approved').length > 0) && (
            <div className="profile-section">
              <h2>Subscription Information</h2>
              
              {/* Active Subscriptions */}
              {userDetails?.userSubscriptions && userDetails.userSubscriptions.some(sub => sub.status === 'active') && (
                <div className="profile-card active-subscription-card">
                  <h3 style={{ color: '#198754', marginTop: 0 }}>Active Subscription</h3>
                  {userDetails.userSubscriptions
                    .filter(sub => sub.status === 'active')
                    .map((sub, index) => (
                      <div key={index} className="subscription-highlight">
                        <div className="subscription-header">
                          <h4>{sub.subscription?.name || 'Subscription'}</h4>
                          <span className="subscription-badge active">Active</span>
                        </div>
                        <div className="subscription-details-grid">
                          <div className="detail-item">
                            <span className="detail-label">Plan</span>
                            <span className="detail-value">{sub.subscription?.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Duration</span>
                            <span className="detail-value">
                              {sub.duration === 'sixMonth' ? '6 Months' : sub.duration}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Start Date</span>
                            <span className="detail-value">{new Date(sub.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">End Date</span>
                            <span className="detail-value">{new Date(sub.endDate).toLocaleDateString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Days Remaining</span>
                            <span className="detail-value" style={{ fontWeight: 'bold', color: '#198754' }}>
                              {Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Amount Paid</span>
                            <span className="detail-value">₹{sub.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {/* Pending Payment Requests - Only show pending and rejected */}
              {paymentRequests.filter(req => req.status !== 'approved').length > 0 && (
                <div className="profile-card payment-requests-card">
                  <h3 style={{ color: '#ff9800', marginTop: 0 }}>Payment Requests</h3>
                  {paymentRequests.filter(req => req.status !== 'approved').map((request) => (
                    <div key={request._id} className="payment-request-item">
                      <div className="payment-request-header">
                        <div>
                          <h4>{request.planName}</h4>
                          <span className="plan-duration">
                            {request.duration === 'sixMonth' ? '6 Months' : 
                             request.duration.charAt(0).toUpperCase() + request.duration.slice(1)}
                          </span>
                        </div>
                        <span className={`subscription-badge ${request.status}`}>
                          {request.status === 'pending' ? '⏳ Pending' : 
                           request.status === 'approved' ? '✓ Approved' : 
                           '✕ Rejected'}
                        </span>
                      </div>
                      
                      <div className="payment-request-details">
                        <div className="detail-item">
                          <span className="detail-label">Amount Paid</span>
                          <span className="detail-value">₹{request.amount.toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Transaction ID</span>
                          <span className="detail-value"><code>{request.transactionId}</code></span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Submitted On</span>
                          <span className="detail-value">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {request.status === 'pending' && (
                          <div className="detail-item status-message">
                            <span className="detail-label">Status</span>
                            <span className="detail-value">
                              Your payment is being verified by our team. This usually takes 24-48 hours.
                            </span>
                          </div>
                        )}
                        {request.status === 'rejected' && request.adminNotes && (
                          <div className="detail-item rejection-note">
                            <span className="detail-label">Rejection Reason</span>
                            <span className="detail-value">{request.adminNotes}</span>
                          </div>
                        )}
                      </div>
                      
                      {request.transactionImageUrl && (
                        <div className="payment-proof">
                          <a 
                            href={request.transactionImageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-proof-link"
                          >
                            View Transaction Screenshot →
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Subscription History */}
              {userDetails?.userSubscriptions && userDetails.userSubscriptions.length > 0 && (
                <div className="profile-card">
                  <h3 style={{ marginTop: 0 }}>Subscription History</h3>
                  <table className="subscription-history-table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDetails.userSubscriptions.map((sub, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{sub.subscription?.name || 'N/A'}</strong>
                          {sub.subscription?.packageCode && (
                            <div style={{ fontSize: '0.85em', color: '#6c757d' }}>
                              {sub.subscription.packageCode}
                            </div>
                          )}
                        </td>
                        <td>{sub.duration === 'sixMonth' ? '6 Months' : sub.duration}</td>
                        <td>
                          <span className={`subscription-badge ${sub.status}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td>{new Date(sub.startDate).toLocaleDateString()}</td>
                        <td>{new Date(sub.endDate).toLocaleDateString()}</td>
                        <td>₹{sub.price.toLocaleString()}</td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="profile-section">
            <h2>Account Security</h2>
            <div className="profile-card">
              <div className="detail-item">
                <span className="detail-label">Email Verification</span>
                <span className="detail-value verified">Verified</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Last Login</span>
                <span className="detail-value">Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
