import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setupAPI } from '../../services/api';

/**
 * Route guard for admin-only routes
 * Checks backend admin-status endpoint to verify admin access
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if user is admin
 * @returns {React.ReactNode} Protected route
 */
const AdminRoute = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [adminStatus, setAdminStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    const checkAdminStatus = async () => {
      if (!currentUser) {
        if (mounted) setStatusLoading(false);
        return;
      }
      
      try {
        const response = await setupAPI.getAdminStatus();
        if (mounted) {
          const isAdmin = !!response?.data?.isAdmin;
          setAdminStatus(isAdmin);
        }
      } catch (err) {
        if (mounted) {
          const isAdmin = currentUser?.role === 'admin';
          setAdminStatus(isAdmin);
        }
      } finally {
        if (mounted) setStatusLoading(false);
      }
    };
    
    checkAdminStatus();
    
    return () => {
      mounted = false;
    };
  }, [currentUser]);
  
  // Show loading state while checking authentication or admin status
  if (authLoading || statusLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to dashboard if not admin (only after status is loaded)
  if (adminStatus === false) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Render children if user is confirmed admin
  return children;
};

export default AdminRoute;
