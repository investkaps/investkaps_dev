import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/Loading/Loading';
import OTPInput from '../../components/OTPInput/OTPInput';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'otp', 'success'
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  
  const { sendOTP, verifyOTP, loading, error, currentUser } = useAuth();
  const navigate = useNavigate();

  // A small local token validation used only to avoid redirecting on 'ghost' states.
  const isTokenPresentAndLooksValid = () => {
    try {
      const token = localStorage.getItem('clerk_jwt');
      if (!token) return false;
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) return false;
      return true;
    } catch (err) {
      return false;
    }
  };

  // Redirect if user is already logged in — only when both currentUser is populated AND token present
  useEffect(() => {
    const hasValidToken = isTokenPresentAndLooksValid();
    if (currentUser && hasValidToken) {
      navigate('/dashboard');
    }
    // If currentUser exists but no token, we don't redirect (we wait for proper session/Clerk population)
  }, [currentUser, navigate]);

  // Handle countdown for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
  };
  
  const handleOtpChange = (value) => {
    setOtp(value);
    if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
  };
  
  const validateEmail = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email address is invalid';
    return newErrors;
  };
  
  const validateOtp = () => {
    const newErrors = {};
    if (!otp) newErrors.otp = 'OTP is required';
    else if (otp.length !== 6) newErrors.otp = 'OTP must be 6 digits';
    return newErrors;
  };
  
  const handleSendOTP = async (e) => {
    e.preventDefault();
    const formErrors = validateEmail();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    const result = await sendOTP(email);
    if (result.success) {
      setStep('otp');
      setCountdown(60);
    } else {
      setErrors({ email: result.error || 'Failed to send OTP' });
    }
  };
  
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const formErrors = validateOtp();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    const result = await verifyOTP(otp);
    if (result.success) {
      setStep('success');

      // After successful verify, give Clerk/useAuth a little time to populate currentUser
      // Then redirect based on user role
      setTimeout(() => {
        const token = localStorage.getItem('clerk_jwt');
        
        // Check if currentUser is populated with role information
        if (currentUser?.role) {
          // If user is admin, redirect to admin dashboard
          if (currentUser.role === 'admin') {
            navigate('/admin/dashboard');
            return;
          }
          
          // For regular users, redirect to user dashboard
          navigate('/dashboard');
        } else if (token) {
          // If we have a token but role is not yet populated, wait a bit longer
          setTimeout(() => {
            if (currentUser?.role === 'admin') {
              navigate('/admin/dashboard');
            } else {
              navigate('/dashboard');
            }
          }, 500);
        } else {
          // Fallback navigation if no token is found
          setTimeout(() => navigate('/dashboard'), 800);
        }
      }, 800);
    } else {
      setErrors({ otp: result.error || 'Invalid OTP' });
    }
  };
  
  const handleResendOTP = async () => {
    if (countdown > 0 || loading || resendLoading) return;
    
    try {
      setResendLoading(true);
      const result = await sendOTP(email);
      
      if (result.success) {
        setCountdown(60);
        // Show success message
        setErrors({}); // Clear any previous errors
      } else {
        setErrors({ email: result.error || 'Failed to resend OTP' });
      }
    } catch (err) {
      setErrors({ email: err.message || 'An error occurred while resending OTP' });
    } finally {
      setResendLoading(false);
    }
  };
  
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Log in to access your InvestKaps account</p>
          </div>
          
          {loading ? (
            <Loading message="Processing your request..." />
          ) : step === 'success' ? (
            <div className="login-success">
              <div className="success-icon">✓</div>
              <h2>Login Successful!</h2>
              <p>Redirecting you to {currentUser?.role === 'admin' ? 'admin dashboard' : 'your dashboard'}...</p>
            </div>
          ) : step === 'email' ? (
            <form className="login-form" onSubmit={handleSendOTP}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter your email"
                  disabled={loading}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <button 
                type="submit" 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
              
              <div className="login-info">
                <p>We'll send a one-time password to your email</p>
              </div>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleVerifyOTP}>
              <div className="otp-header">
                <h3>Enter Verification Code</h3>
                <p>We've sent a 6-digit code to <strong>{email}</strong></p>
              </div>
              
              <div className="form-group">
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={loading}
                  error={!!errors.otp}
                />
                {errors.otp && <span className="error-message">{errors.otp}</span>}
              </div>
              
              <button 
                type="submit" 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              
              <div className="resend-otp">
                {countdown > 0 ? (
                  <p>Resend OTP in {countdown} seconds</p>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleResendOTP} 
                    className="resend-button"
                    disabled={loading || resendLoading}
                  >
                    {resendLoading ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>
              
              <button 
                type="button" 
                className="back-button"
                onClick={() => setStep('email')}
                disabled={loading}
              >
                Back to Email
              </button>
            </form>
          )}
          
          <div className="login-footer">
            <p>Don't have an account? <Link to="/register">Sign Up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
