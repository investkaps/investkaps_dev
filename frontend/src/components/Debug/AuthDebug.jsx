import React from 'react';
import { useAuth } from '../../context/AuthContext';

const AuthDebug = () => {
  const { currentUser, clearAuthData } = useAuth();
  
  const handleClearAuth = () => {
    clearAuthData();
    window.location.reload(); // Force a page reload to reset all state
  };
  
  const tokenInfo = () => {
    const token = localStorage.getItem('clerk_jwt');
    if (!token) return 'No token found';
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return 'Invalid token format';
      
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp && payload.exp < currentTime;
      
      return {
        hasToken: true,
        isExpired,
        expiresAt: new Date(payload.exp * 1000).toLocaleString(),
        subject: payload.sub
      };
    } catch (error) {
      return 'Error parsing token';
    }
  };
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Auth Debug Info</h4>
      <p><strong>Current User:</strong> {currentUser ? 'Yes' : 'No'}</p>
      <p><strong>User ID:</strong> {currentUser?.id || 'None'}</p>
      <p><strong>Email:</strong> {currentUser?.email || 'None'}</p>
      <p><strong>Token Info:</strong></p>
      <pre style={{ fontSize: '10px', background: '#f5f5f5', padding: '5px' }}>
        {JSON.stringify(tokenInfo(), null, 2)}
      </pre>
      <button 
        onClick={handleClearAuth}
        style={{
          background: '#e74c3c',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '3px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Clear All Auth Data
      </button>
    </div>
  );
};

export default AuthDebug;
