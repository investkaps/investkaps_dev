import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import UserManagement from './UserManagement';
import SubscriptionManagement from './SubscriptionManagement';
import StrategyManagement from './StrategyManagement';
import KycManagement from '../../components/Admin/KycManagement';
import StockRecommendationManagement from '../../components/Admin/StockRecommendationManagement';
import PaymentApproval from './PaymentApproval';
import QuestionnaireManagement from './QuestionnaireManagement';
import QuestionnaireResponses from './QuestionnaireResponses';
import EsignManagement from './EsignManagement';
import TestimonialsManagement from '../../components/Admin/TestimonialsManagement';
import './AdminDashboard.css';

/* ─────────────────────────── Settings / Maintenance tab ─── */
const SettingsTab = () => {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [mailTypes, setMailTypes] = useState([]);
  const [mailTypesLoading, setMailTypesLoading] = useState(false);
  const [mailTypesError, setMailTypesError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMailType, setSelectedMailType] = useState('test-email');
  const [selectedServiceType, setSelectedServiceType] = useState('RA');
  const [mailSending, setMailSending] = useState(false);
  const [mailResult, setMailResult] = useState(null);
  const [mailError, setMailError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await adminAPI.getAllUsers();
        const payload = response?.data ?? response;
        setUsers(Array.isArray(payload) ? payload : []);
        setUsersError(null);
      } catch (err) {
        setUsersError(err.message || 'Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    };

    const fetchMailTypes = async () => {
      try {
        setMailTypesLoading(true);
        const response = await adminAPI.getMailTypes();
        const payload = response?.data ?? response;
        setMailTypes(Array.isArray(payload) ? payload : []);
        setMailTypesError(null);
      } catch (err) {
        setMailTypesError(err.message || 'Failed to load mail types');
      } finally {
        setMailTypesLoading(false);
      }
    };

    fetchUsers();
    fetchMailTypes();
  }, []);

  const handleSendMail = async () => {
    if (!selectedUserId) {
      setMailError('Please select a user first.');
      return;
    }

    const selectedUser = users.find(user => user._id === selectedUserId);
    if (!selectedUser) {
      setMailError('Selected user was not found.');
      return;
    }

    if (!selectedUser.email) {
      setMailError('Selected user does not have an email address.');
      return;
    }

    const selectedMail = mailTypes.find((mailType) => mailType.value === selectedMailType);
    const actionLabel = selectedMail?.label || selectedMailType;
    const serviceForMail = selectedMailType === 'questionnaire-results' ? 'IA' : selectedServiceType;
    const confirmed = window.confirm(`Send ${actionLabel} to ${selectedUser.name || selectedUser.email} using ${serviceForMail} mail?`);
    if (!confirmed) return;

    setMailSending(true);
    setMailError(null);
    setMailResult(null);

    try {
      const response = await adminAPI.sendAdminMail({
        userId: selectedUserId,
        mailType: selectedMailType,
        serviceType: serviceForMail
      });

      const resultMessage = [response?.message, response?.warning].filter(Boolean).join(' ');
      setMailResult(resultMessage || `${actionLabel} sent to ${selectedUser.email}`);
    } catch (err) {
      setMailError(err.message || 'Failed to send mail');
    } finally {
      setMailSending(false);
    }
  };

  return (
    <div className="admin-section">
      <div style={{
        background: '#fff', borderRadius: '12px',
        border: '1px solid #e9ecef', padding: '1.75rem',
        marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
      }}>
        <h3 style={{ margin: '0 0 0.4rem', color: '#1e293b', fontSize: '1.05rem' }}>
          📧 Mail Center
        </h3>
        <p style={{ color: '#6c757d', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
          Send any supported mail template from one place.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Recipient</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={usersLoading}
              style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name || user.email} {user.email ? `(${user.email})` : ''}
                </option>
              ))}
            </select>
            {usersLoading && <div style={{ fontSize: '0.78rem', color: '#6c757d', marginTop: '0.35rem' }}>Loading users…</div>}
            {usersError && <div style={{ fontSize: '0.78rem', color: '#dc3545', marginTop: '0.35rem' }}>{usersError}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Mail Type</label>
            <select
              value={selectedMailType}
              onChange={(e) => setSelectedMailType(e.target.value)}
              disabled={mailTypesLoading}
              style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              {mailTypes.map((mailType) => (
                <option key={mailType.value} value={mailType.value}>
                  {mailType.label}
                </option>
              ))}
            </select>
            {mailTypesLoading && <div style={{ fontSize: '0.78rem', color: '#6c757d', marginTop: '0.35rem' }}>Loading mail types…</div>}
            {mailTypesError && <div style={{ fontSize: '0.78rem', color: '#dc3545', marginTop: '0.35rem' }}>{mailTypesError}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>Service Type</label>
            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
              disabled={selectedMailType === 'questionnaire-results'}
              style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="RA">RA</option>
              <option value="IA">IA</option>
            </select>
            {selectedMailType === 'questionnaire-results' && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>Questionnaire results always use IA mail.</div>
            )}
          </div>

          <div>
            <button
              onClick={handleSendMail}
              disabled={mailSending || !selectedUserId}
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
                border: 'none', background: mailSending ? '#94a3b8' : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                color: '#fff', fontWeight: 700, cursor: mailSending ? 'not-allowed' : 'pointer'
              }}
            >
              {mailSending ? 'Sending…' : 'Send Mail'}
            </button>
          </div>
        </div>

        {mailError && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8d7da', color: '#721c24', borderRadius: '8px', fontSize: '0.85rem' }}>
            ⚠ {mailError}
          </div>
        )}
        {mailResult && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#d4edda', color: '#155724', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
            ✓ {mailResult}
          </div>
        )}
      </div>
    </div>
  );
};


const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // AdminRoute already verified the user is admin, so no need to redirect here.
  // Just fetch dashboard data if user is available.

  useEffect(() => {
    // Fetch dashboard data when component mounts and currentUser is available
    if (!currentUser) return;
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getDashboard();
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser]);
  
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/');
    }
  };
  
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-dashboard" style={{ width: '100%', margin: 0, padding: 0 }}>
      <div className="admin-sidebar">
        <div className="admin-logo">
          <h2>InvestKaps</h2>
          <span className="admin-badge">Admin</span>
        </div>
        
        <nav className="admin-nav">
          <ul>
            <li className={activeTab === 'overview' ? 'active' : ''}>
              <button onClick={() => setActiveTab('overview')}>Overview</button>
            </li>
            <li className={activeTab === 'users' ? 'active' : ''}>
              <button onClick={() => setActiveTab('users')}>Users</button>
            </li>
            <li className={activeTab === 'kyc' ? 'active' : ''}>
              <button onClick={() => setActiveTab('kyc')}>KYC Verifications</button>
            </li>
            <li className={activeTab === 'subscriptions' ? 'active' : ''}>
              <button onClick={() => setActiveTab('subscriptions')}>Subscriptions</button>
            </li>
            <li className={activeTab === 'strategies' ? 'active' : ''}>
              <button onClick={() => setActiveTab('strategies')}>Strategies</button>
            </li>
            <li className={activeTab === 'recommendations' ? 'active' : ''}>
              <button onClick={() => setActiveTab('recommendations')}>Stock Recommendations</button>
            </li>
            <li className={activeTab === 'payment-approval' ? 'active' : ''}>
              <button onClick={() => setActiveTab('payment-approval')}>Payment Approval</button>
            </li>
            <li className={activeTab === 'documents' ? 'active' : ''}>
              <button onClick={() => setActiveTab('documents')}>📄 Documents</button>
            </li>
            <li className={activeTab === 'testimonials' ? 'active' : ''}>
              <button onClick={() => setActiveTab('testimonials')}>Testimonials</button>
            </li>
            <li className={activeTab === 'questionnaire-management' ? 'active' : ''}>
              <button onClick={() => setActiveTab('questionnaire-management')}>Questionnaires</button>
            </li>
            <li className={activeTab === 'questionnaire-responses' ? 'active' : ''}>
              <button onClick={() => setActiveTab('questionnaire-responses')}>Responses</button>
            </li>
            <li className={activeTab === 'settings' ? 'active' : ''}>
              <button onClick={() => setActiveTab('settings')}>Settings</button>
            </li>
          </ul>
        </nav>
        
        <div className="admin-user-info">
          <div className="admin-user-name">{currentUser?.name}</div>
          <div className="admin-user-email">{currentUser?.email}</div>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      
      <div className="admin-content">
        <div className="admin-header">
          <h1>
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'users' && 'User Management'}
            {activeTab === 'kyc' && 'KYC Verifications'}
            {activeTab === 'subscriptions' && 'Subscription Management'}
            {activeTab === 'strategies' && 'Strategy Management'}
            {activeTab === 'recommendations' && 'Stock Recommendations'}
            {activeTab === 'payment-approval' && 'Payment Approval'}
            {activeTab === 'documents' && '📄 E-Sign Documents'}
            {activeTab === 'questionnaire-management' && 'Questionnaire Management'}
            {activeTab === 'questionnaire-responses' && 'Questionnaire Responses'}
            {activeTab === 'settings' && 'Admin Settings'}
            {activeTab === 'testimonials' && 'Testimonials'}
          </h1>
          <div className="admin-header-actions">
            <span className="admin-date">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}
        
        {activeTab === 'overview' && dashboardData && (
          <div className="admin-overview">
            <div className="admin-stats">
              <div className="admin-stat-card">
                <h3>Total Users</h3>
                <div className="admin-stat-value">{dashboardData.counts.users}</div>
              </div>
              <div className="admin-stat-card">
                <h3>KYC Verifications</h3>
                <div className="admin-stat-value">{dashboardData.counts.kyc}</div>
              </div>
              <div className="admin-stat-card">
                <h3>Documents</h3>
                <div className="admin-stat-value">{dashboardData.counts.documents}</div>
              </div>
            </div>
            
            <div className="admin-recent-section">
              <h2>Recent Users</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>KYC Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentUsers.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`status-badge ${user.kycStatus?.isVerified ? 'verified' : 'pending'}`}>
                            {user.kycStatus?.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="admin-recent-section">
              <h2>Recent KYC Verifications</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>PAN</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentKyc.map((kyc) => (
                      <tr key={kyc._id}>
                        <td>{kyc.user?.name || 'Unknown'}</td>
                        <td>{kyc.pan}</td>
                        <td>
                          <span className={`status-badge ${kyc.status === 'success' ? 'verified' : 'failed'}`}>
                            {kyc.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </td>
                        <td>{new Date(kyc.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'users' && <UserManagement />}
        
        {activeTab === 'kyc' && <KycManagement />}
        
        {activeTab === 'subscriptions' && <SubscriptionManagement />}
        
        {activeTab === 'strategies' && <StrategyManagement />}
        
        {activeTab === 'recommendations' && <StockRecommendationManagement />}
        
        {activeTab === 'payment-approval' && <PaymentApproval />}
        
        {activeTab === 'documents' && <EsignManagement />}
        
        {activeTab === 'questionnaire-management' && <QuestionnaireManagement />}
        
        {activeTab === 'questionnaire-responses' && <QuestionnaireResponses />}
        
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
        {activeTab === 'testimonials' && (
          <TestimonialsManagement />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
