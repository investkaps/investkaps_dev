import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userAPI, setupAPI } from '../../services/api';
import Loading from '../Loading/Loading';

const DashboardRoute = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('checking'); // 'checking' | 'allow' | 'block'
  const [missingSteps, setMissingSteps] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setStatus('allow'); return; } // ProtectedRoute handles auth

    const check = async () => {
      try {
        // Admins always get through
        const adminRes = await setupAPI.getAdminStatus().catch(() => null);
        if (adminRes?.data?.isAdmin) { setStatus('allow'); return; }

        const res = await userAPI.getOnboardingStatus(currentUser.id);
        if (!res?.success) { setStatus('allow'); return; } // fail open if API errors

        const vs = res.verificationStatus || {};
        const missing = [];
        if (!vs.panKyc) missing.push('KYC (PAN)');
        if (!vs.phone)  missing.push('Mobile Number');
        if (!vs.esign)  missing.push('Agreement signing');

        if (missing.length > 0) {
          setMissingSteps(missing);
          setStatus('block');
        } else {
          setStatus('allow');
        }
      } catch {
        setStatus('allow'); // fail open
      }
    };

    check();
  }, [currentUser, authLoading]);

  if (authLoading || status === 'checking') {
    return <Loading message="Loading your dashboard…" />;
  }

  if (status === 'block') {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#f8fafc',
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.4rem' }}>
            Complete your onboarding first
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Your dashboard will be unlocked once you complete all required steps. Please contact support or wait for your account to be set up.
          </p>
          <div style={{
            background: '#fef9ec',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', marginBottom: '0.5rem' }}>
              Pending steps:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {missingSteps.map(step => (
                <li key={step} style={{ fontSize: '0.88rem', color: '#78350f', marginBottom: '0.25rem' }}>
                  {step}
                </li>
              ))}
            </ul>
          </div>
          <a
            href="mailto:investkaps@gmail.com"
            style={{
              display: 'inline-block',
              padding: '0.7rem 1.5rem',
              background: 'linear-gradient(135deg, #1e3a5f, #155d8e)',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default DashboardRoute;
