import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';

const AdminCheck = () => {
  const { currentUser } = useAuth();
  const { isAdmin, userRole } = useRole();
  const [adminStatus, setAdminStatus] = useState(null);

  useEffect(() => {
    // Check admin status on component mount
    checkAdminStatus();
  }, []);

  const checkAdminStatus = () => {
    setAdminStatus({
      isAdmin: isAdmin(),
      userRole,
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        mongoId: currentUser.mongoId
      } : null
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Status Check</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={checkAdminStatus}
          style={{
            padding: '10px 15px',
            backgroundColor: '#0b73ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh Status
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '5px',
        whiteSpace: 'pre-wrap'
      }}>
        <h2>Current Status:</h2>
        <pre>{JSON.stringify(adminStatus, null, 2)}</pre>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <h2>How to Set Admin Role:</h2>
        <p>To set your account as admin, visit the following URL in your browser:</p>
        <code style={{ 
          display: 'block', 
          padding: '10px', 
          backgroundColor: '#eee', 
          marginTop: '10px' 
        }}>
          {`${window.location.origin.replace('3000', '5000')}/api/admin/set-admin/${currentUser?.email || 'your-email@example.com'}`}
        </code>
        <p style={{ marginTop: '10px' }}>After setting the admin role, refresh this page to see the updated status.</p>
      </div>
    </div>
  );
};

export default AdminCheck;
