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
  const [patchLoading, setPatchLoading] = useState(false);
  const [patchResult, setPatchResult]   = useState(null);
  const [patchError, setPatchError]     = useState(null);

  const [debugLoading, setDebugLoading] = useState(false);
  const [debugResult, setDebugResult]   = useState(null);
  const [debugError, setDebugError]     = useState(null);

  const handleDebug = async () => {
    setDebugLoading(true);
    setDebugResult(null);
    setDebugError(null);
    try {
      const res = await adminAPI.debugClientTypes();
      setDebugResult(res);
    } catch (err) {
      setDebugError(err.message || 'Debug failed.');
    } finally {
      setDebugLoading(false);
    }
  };

  const handlePatch = async () => {
    if (!window.confirm(
      'This will scan all users with verificationStatus.esign=true and backfill any missing RA/IA client type flags.\n\nIt is safe to run multiple times. Proceed?'
    )) return;

    setPatchLoading(true);
    setPatchResult(null);
    setPatchError(null);
    try {
      const res = await adminAPI.patchClientTypes();
      if (res.success) {
        setPatchResult(res);
      } else {
        setPatchError(res.error || 'Patch failed.');
      }
    } catch (err) {
      setPatchError(err.message || 'Patch failed.');
    } finally {
      setPatchLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div style={{
        background: '#fff', borderRadius: '12px',
        border: '1px solid #e9ecef', padding: '1.75rem',
        marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <h3 style={{ margin: '0 0 0.4rem', color: '#1e293b', fontSize: '1.05rem' }}>
          🔧 Database Maintenance
        </h3>
        <p style={{ color: '#6c757d', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
          One-off migration scripts to correct data inconsistencies.
        </p>

        {/* ── Patch Client Types ── */}
        <div style={{
          border: '1px solid #e9ecef', borderRadius: '10px',
          padding: '1.25rem 1.5rem', marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#1e293b', fontSize: '0.95rem' }}>
                Backfill RA / IA Client Types
              </strong>
              <p style={{ color: '#6c757d', fontSize: '0.83rem', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                Users who completed onboarding (e-sign verified) before the
                <code> clientTypes</code> field was introduced will show <strong>None</strong>
                in the user table. Run <strong>Debug</strong> first to preview issues,
                then <strong>Run Patch</strong> to fix them.
                <br /><strong style={{ color: '#856404' }}>Safe to run multiple times — already-correct users are skipped.</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {/* Debug button */}
              <button
                onClick={handleDebug}
                disabled={debugLoading || patchLoading}
                style={{
                  padding: '0.55rem 1.1rem', borderRadius: '8px',
                  background: '#e8f0fe', color: '#3c4fe0',
                  border: '1px solid #c5d4f8', fontWeight: 700, fontSize: '0.88rem',
                  cursor: (debugLoading || patchLoading) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  opacity: (debugLoading || patchLoading) ? 0.7 : 1,
                }}
              >
                {debugLoading && <span style={{
                  width: 12, height: 12,
                  border: '2px solid #c5d4f8', borderTopColor: '#3c4fe0',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />}
                {debugLoading ? 'Checking…' : '🔍 Debug'}
              </button>
              {/* Patch button */}
              <button
                onClick={handlePatch}
                disabled={patchLoading || debugLoading}
                style={{
                  padding: '0.55rem 1.4rem', borderRadius: '8px',
                  background: (patchLoading || debugLoading) ? '#e9ecef' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: (patchLoading || debugLoading) ? '#6c757d' : '#fff',
                  border: 'none', fontWeight: 700, fontSize: '0.88rem',
                  cursor: (patchLoading || debugLoading) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  boxShadow: (patchLoading || debugLoading) ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
                }}
              >
                {patchLoading && <span style={{
                  width: 14, height: 14,
                  border: '2px solid #aaa', borderTopColor: '#6366f1',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />}
                {patchLoading ? 'Running…' : '▶ Run Patch'}
              </button>
            </div>
          </div>

          {/* Debug result */}
          {debugError && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8d7da', color: '#721c24', borderRadius: '8px', fontSize: '0.85rem' }}>
              ⚠ {debugError}
            </div>
          )}
          {debugResult && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600,
                background: debugResult.summary.usersWithIssues > 0 ? '#fff3cd' : '#d4edda',
                color:      debugResult.summary.usersWithIssues > 0 ? '#856404' : '#155724',
                marginBottom: debugResult.issues?.length ? '0.75rem' : 0,
              }}>
                Found <strong>{debugResult.summary.usersWithIssues}</strong> user(s) with missing flags
                · <strong>{debugResult.summary.usersOk}</strong> already correct
                · <strong>{debugResult.summary.totalEsignedUsers}</strong> total e-sign verified
              </div>
              {debugResult.issues?.length > 0 && (
                <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: 700 }}>Name</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: 700 }}>Email</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: 700 }}>Issue</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: 700 }}>Docs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugResult.issues.map((u, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f4f4f4' }}>
                          <td style={{ padding: '0.45rem 0.75rem', color: '#2c3e50' }}>{u.name}</td>
                          <td style={{ padding: '0.45rem 0.75rem', color: '#2c3e50' }}>{u.email}</td>
                          <td style={{ padding: '0.45rem 0.75rem' }}>
                            <span style={{ background: '#fff3cd', color: '#856404', padding: '0.15rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {u.issue}
                            </span>
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', color: '#6c757d', fontSize: '0.78rem' }}>
                            {u.documents?.length
                              ? u.documents.map(d => `${d.serviceType||'?'}(${d.status||'?'})`).join(', ')
                              : 'none'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Patch error */}
          {patchError && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8d7da', color: '#721c24', borderRadius: '8px', fontSize: '0.85rem' }}>
              ⚠ {patchError}
            </div>
          )}

          {/* Patch result */}
          {patchResult && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                padding: '0.85rem 1rem',
                background: patchResult.data.usersPatched > 0 ? '#d4edda' : '#e8f4fd',
                color:      patchResult.data.usersPatched > 0 ? '#155724' : '#004085',
                borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600,
                marginBottom: patchResult.data.details?.length ? '0.75rem' : 0,
              }}>
                ✓ {patchResult.message}
                {patchResult.data.errors?.length > 0 && (
                  <span style={{ color: '#721c24', marginLeft: '0.5rem' }}>
                    ⚠ {patchResult.data.errors.length} error(s) — check server logs.
                  </span>
                )}
              </div>
              {patchResult.data.details?.length > 0 && (
                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                        <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: 700 }}>Email</th>
                        <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#6c757d', fontWeight: 700 }}>Patched Types</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patchResult.data.details.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '0.4rem 0.75rem', color: '#2c3e50' }}>{d.email}</td>
                          <td style={{ padding: '0.4rem 0.75rem' }}>
                            {d.patchedTypes.map(t => (
                              <span key={t} style={{
                                background: '#e8f0fe', color: '#3c4fe0',
                                padding: '0.15rem 0.5rem', borderRadius: '10px',
                                fontSize: '0.72rem', fontWeight: 700, marginRight: '0.25rem',
                              }}>{t}</span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
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
