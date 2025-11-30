// src/components/Auth/ProtectedRoute.jsx
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../Loading/Loading'; // adjust path if needed

/**
 * Protects any route that requires authentication.
 * Usage:
 * <ProtectedRoute><Dashboard /></ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show spinner while auth is still initializing
  if (loading) {
    return <Loading message="Checking authentication..." />;
  }

  // If user is not authenticated, redirect to external login
  useEffect(() => {
    if (!currentUser) {
      window.location.href = 'https://trade.investkaps.com';
    }
  }, [currentUser]);

  if (!currentUser) {
    return <Loading message="Redirecting to login..." />;
  }

  // If authenticated, render the child component
  return children;
};

export default ProtectedRoute;
