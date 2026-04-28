// src/components/Auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../Loading/Loading'; // adjust path if needed

/**
 * Protects any route that requires authentication.
 * Usage:
 * <ProtectedRoute><Dashboard /></ProtectedRoute>
 */
const ProtectedRoute = ({ children, redirectTo = '/login' }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show spinner while auth is still initializing
  if (loading) {
    return <Loading message="Checking authentication..." />;
  }

  // If user is not authenticated, redirect to the configured destination
  if (!currentUser) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If authenticated, render the child component
  return children;
};

export default ProtectedRoute;
