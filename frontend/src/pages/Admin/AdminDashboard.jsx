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
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Check if user is admin, redirect to home if not
  useEffect(() => {
    if (!currentUser) {
      // Wait for currentUser to be populated
      return;
    }
    
    if (currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Only fetch dashboard data if user is admin
    if (!currentUser || currentUser.role !== 'admin') return;
    
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
            {activeTab === 'settings' && 'Admin Settings'}
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
        
        {activeTab === 'settings' && (
          <div className="admin-section">
            <h2>Admin Settings</h2>
            <p>Admin settings functionality will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
