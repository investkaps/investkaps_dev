import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setupAPI } from '../../services/api';
import './AdminSetup.css';

const AdminSetup = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [adminStatus, setAdminStatus] = useState(null);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const response = await setupAPI.getAdminStatus();
        setAdminStatus(response.data);
        
        // If user is already admin, redirect to admin dashboard
        if (response.data.isAdmin) {
          navigate('/admin');
        }
        
        // If there are already admins and current user is not admin, show error
        if (response.data.hasAdmins && !response.data.isAdmin) {
          setError('Admin users already exist. You do not have permission to access this page.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Failed to check admin status. Please try again later.');
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !adminSecret) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await setupAPI.setInitialAdmin(email, adminSecret);
      
      setSuccess(`User ${response.user.email} has been set as admin successfully!`);
      setLoading(false);
      
      // Redirect to admin dashboard after 3 seconds
      setTimeout(() => {
        navigate('/admin');
      }, 3000);
    } catch (err) {
      console.error('Error setting admin:', err);
      setError(err.message || 'Failed to set admin. Please check your credentials and try again.');
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="admin-setup-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-setup-container">
      <div className="admin-setup-card">
        <h1>Admin Setup</h1>
        
        {error && (
          <div className="admin-setup-error">
            {error}
          </div>
        )}
        
        {success && (
          <div className="admin-setup-success">
            {success}
            <p>Redirecting to admin dashboard...</p>
          </div>
        )}
        
        {!error && !success && adminStatus && !adminStatus.hasAdmins && (
          <>
            <p className="admin-setup-info">
              No admin users found. Set up the initial admin user by providing your email and the admin secret.
            </p>
            
            <form onSubmit={handleSubmit} className="admin-setup-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email || (currentUser?.email || '')}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="adminSecret">Admin Secret</label>
                <input
                  type="password"
                  id="adminSecret"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Enter admin secret"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="admin-setup-button"
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Set as Admin'}
              </button>
            </form>
          </>
        )}
        
        <div className="admin-setup-footer">
          <button
            onClick={() => navigate('/')}
            className="admin-setup-back-button"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
