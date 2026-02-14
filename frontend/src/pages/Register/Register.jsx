import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useClerk, useSignUp } from '@clerk/clerk-react';
import OTPInput from '../../components/OTPInput/OTPInput';
import { isValidEmail } from '../../utils/validators';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    agreeTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Now only step 1 (email+terms) and step 2 (OTP)
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  
  const { register, completeRegistration, loading, error, currentUser } = useAuth();
  const { isLoaded: clerkLoaded } = useSignUp();
  const navigate = useNavigate();
  
  // Redirect if user is already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  // Handle countdown for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const validateStep1 = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Terms agreement validation
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
    }
    
    return newErrors;
  };
  
  const handleNextStep = async () => {
    const stepErrors = validateStep1();
    
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    
    try {
      // Use Clerk's actual sign-up process with Cloudflare verification
      const result = await register({
        email: formData.email.trim().toLowerCase()
      });
      
      if (result.success) {
        setCurrentStep(2); // Move to OTP verification step
        setCountdown(60); // Set countdown for resend OTP (60 seconds)
      } else {
        setErrors({ email: result.error || 'Registration failed. Please try again.' });
      }
    } catch (err) {
      setErrors({ email: err.message || 'Registration failed. Please try again.' });
    }
  };
  
  const handlePrevStep = () => {
    setCurrentStep(1);
  };
  
  const handleOtpChange = (value) => {
    setOtp(value);
    
    // Clear error when user starts typing
    if (errors.otp) {
      setErrors({
        ...errors,
        otp: ''
      });
    }
  };

  const validateOtp = () => {
    const newErrors = {};
    
    // OTP validation
    if (!otp) {
      newErrors.otp = 'OTP is required';
    } else if (otp.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits';
    }
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // This is now just a wrapper for the next step button
    handleNextStep();
  };
  
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    const otpErrors = validateOtp();
    if (Object.keys(otpErrors).length > 0) {
      setErrors(otpErrors);
      return;
    }
    
    try {
      // Complete registration with Clerk's actual verification
      const result = await completeRegistration(otp);
      
      if (result.success) {
        setRegisterSuccess(true);
        
        // Redirect after successful registration
        setTimeout(() => {
          navigate('/dashboard'); // Redirect to dashboard since user is now logged in
        }, 2000);
      } else {
        setErrors({ otp: result.error || 'Invalid OTP' });
      }
    } catch (err) {
      setErrors({ otp: err.message || 'Invalid OTP' });
    }
  };
  
  const handleResendOTP = async () => {
    if (countdown > 0 || loading || resendLoading) return;
    
    try {
      setResendLoading(true);
      setErrors({}); // Clear any previous errors
      
      // Resend OTP using Clerk's actual API
      const result = await register({
        email: formData.email
      });
      
      if (result.success) {
        setCountdown(60); // Reset countdown
        // Show success message or toast notification here if needed
      } else {
        setErrors({ email: result.error || 'Failed to resend OTP' });
      }
    } catch (err) {
      setErrors({ email: err.message || 'Failed to resend OTP' });
    } finally {
      setResendLoading(false);
    }
  };
  
  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-content">
          <div className="register-header">
            <h1>Create Your Account</h1>
            <p>Join InvestKaps and start your investment journey</p>
          </div>
          
          {registerSuccess ? (
            <div className="register-success">
              <div className="success-icon">✓</div>
              <h2>Registration Successful!</h2>
              <p>Your account has been created. You will be redirected to the login page shortly.</p>
            </div>
          ) : (
            <>
              <div className="register-steps">
                <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                  <div className="step-number">1</div>
                  <div className="step-text">Account Info</div>
                </div>
                <div className="step-connector"></div>
                <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                  <div className="step-number">2</div>
                  <div className="step-text">Verification</div>
                </div>
              </div>
              
              <form className="register-form" onSubmit={currentStep === 2 ? handleVerifyOTP : handleSubmit}>
                {currentStep === 1 && (
                  <div className="form-step">
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={errors.email ? 'error' : ''}
                        placeholder="Enter your email"
                      />
                      {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>
                    
                    <div className="form-checkbox">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className={errors.agreeTerms ? 'error' : ''}
                      />
                      <label htmlFor="agreeTerms">
                        I agree to the <Link to="/terms-and-conditions" target="_blank" rel="noopener noreferrer">Terms and Conditions</Link>
                      </label>
                      {errors.agreeTerms && <span className="error-message">{errors.agreeTerms}</span>}
                    </div>
                    
                    <button 
                      type="submit" 
                      className="next-button"
                      disabled={loading || !clerkLoaded}
                    >
                      {!clerkLoaded ? 'Loading...' : loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                )}
                
                {currentStep === 2 && (
                  <div className="form-step">
                    <div className="otp-header">
                      <h3>Verify Your Email</h3>
                      <p>We've sent a 6-digit code to <strong>{formData.email}</strong></p>
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
                      className="register-button"
                      disabled={loading}
                    >
                      {loading ? 'Verifying...' : 'Complete Registration'}
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
                      onClick={() => setCurrentStep(1)}
                      disabled={loading}
                    >
                      Back
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
          
          <div className="register-footer">
            <p>Already have an account? <Link to="/login">Log In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

// Commented-out redirect code - kept for future use
// import React, { useEffect } from 'react';

// const Register = () => {
//   useEffect(() => {
//     // Temporary redirect to trade.investkaps.com
//     window.location.href = 'https://trade.investkaps.com';
//   }, []);

//   return (
//     <div style={{ 
//       display: 'flex', 
//       justifyContent: 'center', 
//       alignItems: 'center', 
//       height: '100vh',
//       fontSize: '18px'
//     }}>
//       Redirecting to trade.investkaps.com...
//     </div>
//   );
// };

// export default Register;