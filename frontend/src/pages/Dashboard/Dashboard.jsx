import React, { useState, useEffect } from 'react';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { kycAPI, userAPI, phoneAPI, esignAPI } from '../../services/api';
import userSubscriptionAPI from '../../services/userSubscriptionAPI';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';
import { useNavigate, Link } from 'react-router-dom';
import OTPInput from '../../components/OTPInput/OTPInput';
import './Dashboard.css';

// Development mode flag - set to false in production
const DEV_MODE = true;

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  
  // Memoize admin status to prevent continuous checks
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  // Set admin status once when component mounts or user changes
  useEffect(() => {
    if (currentUser) {
      const adminStatus = isAdmin();
      if (adminStatus !== isAdminUser) {
        setIsAdminUser(adminStatus);
      }
    }
  }, [currentUser, isAdmin, isAdminUser]);
  
  const [steps, setSteps] = useState({
    kyc: { completed: false, active: true, expanded: true },
    phone: { completed: false, active: false, expanded: false },
    signing: { completed: false, active: false, expanded: false },
    payment: { completed: false, active: false, expanded: false }
  });
  
  // Flag to prevent multiple KYC status checks
  const [kycCheckCompleted, setKycCheckCompleted] = useState(false);
  
  // Phone verification state
  const [phoneForm, setPhoneForm] = useState({ phone: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [phoneError, setPhoneError] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  // KYC form state
  const [kycForm, setKycForm] = useState({
    pan: '',
    dob: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kycResult, setKycResult] = useState(null);
  const [panStatus, setPanStatus] = useState({
    checking: false,
    verified: false,
    validated: false, // PAN checked and doesn't exist for another user
    existsForOther: false, // PAN already exists for another user
    message: ''
  });
  
  // eSign state
  const [activeDocumentId, setActiveDocumentId] = useState(() => {
    // Try to get active document ID from localStorage on component mount
    return localStorage.getItem('activeDocumentId') || null;
  });
  
  // Subscription and stock recommendations state
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [stockRecommendations, setStockRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);
  
  // Update localStorage when activeDocumentId changes
  useEffect(() => {
    if (activeDocumentId) {
      localStorage.setItem('activeDocumentId', activeDocumentId);
    } else {
      localStorage.removeItem('activeDocumentId');
    }
  }, [activeDocumentId]);
  
  // Handle e-sign completion redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const esignStatus = urlParams.get('esign');
    
    if (esignStatus === 'completed' && activeDocumentId) {
      // User returned from e-signing, check status
      const checkCompletionStatus = async () => {
        try {
          const response = await esignAPI.checkDocumentStatus(activeDocumentId);
          if (response.success && response.data?.status === 'completed') {
            setSteps(prevSteps => ({
              ...prevSteps,
              signing: { ...prevSteps.signing, completed: true }
            }));
            
            // Show success message
            alert('E-signing completed successfully! ✓');
          }
        } catch (err) {
          console.error('Error checking e-sign status:', err);
        }
      };
      
      checkCompletionStatus();
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/dashboard');
    }
  }, [activeDocumentId]);
  
  // Check if user is already KYC verified or is admin
  useEffect(() => {
    // Skip if user is not available
    if (!currentUser) return;
    
    const checkKycStatus = async () => {      
      try {
        setIsLoading(true);
        
        // If user is admin, auto-complete all steps (optional for admins)
        if (isAdminUser) {
          setKycResult({
            success: true,
            message: 'As an admin, KYC verification is optional',
            data: {
              fullName: currentUser.name,
              isVerified: true
            },
            isAlreadyVerified: true,
            isAdminBypass: true
          });
          
          // Update steps all at once to avoid multiple re-renders
          setSteps(prevSteps => ({
            phone: { ...prevSteps.phone, completed: true },
            kyc: { ...prevSteps.kyc, completed: true, active: true },
            signing: { ...prevSteps.signing, completed: true, active: true },
            payment: { ...prevSteps.payment, completed: true, active: true }
          }));
          
          setKycCheckCompleted(true);
          return;
        }
        
        // For regular users, check KYC status
        let isVerified = false;
        
        // Try to get KYC status by clerkId
        if (currentUser.id && !isVerified) {
          try {
            const response = await userAPI.getKYCStatusByClerkId(currentUser.id);
            if (response.success && response.kycStatus?.isVerified) {
              setKycResult({
                success: true,
                message: 'KYC verification already completed',
                data: response.kycStatus,
                isAlreadyVerified: true
              });
              
              // KYC done - unlock all other steps
              setSteps(prevSteps => ({
                ...prevSteps,
                kyc: { ...prevSteps.kyc, completed: true },
                phone: { ...prevSteps.phone, active: true },
                signing: { ...prevSteps.signing, active: true },
                payment: { ...prevSteps.payment, active: true }
              }));
              
              isVerified = true;
            }
          } catch (err) {
            // No KYC status found by clerkId
          }
        }
        
        // Try by email if clerkId didn't work and not verified yet
        if (currentUser.email && !isVerified) {
          try {
            const response = await userAPI.getKYCStatusByEmail(currentUser.email);
            if (response.success && response.kycStatus?.isVerified) {
              setKycResult({
                success: true,
                message: 'KYC verification already completed',
                data: response.kycStatus,
                isAlreadyVerified: true
              });
              
              // KYC done - unlock all other steps
              setSteps(prevSteps => ({
                ...prevSteps,
                kyc: { ...prevSteps.kyc, completed: true },
                phone: { ...prevSteps.phone, active: true },
                signing: { ...prevSteps.signing, active: true },
                payment: { ...prevSteps.payment, active: true }
              }));
              
              isVerified = true;
            }
          } catch (err) {
            // No KYC status found by email
          }
        }
        
        // Mark check as completed regardless of result
        setKycCheckCompleted(true);
        
      } catch (err) {
        console.error('Error checking KYC status:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkKycStatus();
  }, [currentUser, isAdminUser]);
  
  // Check phone verification status
  useEffect(() => {
    if (!currentUser || isAdminUser) return;
    
    const checkPhoneStatus = async () => {
      try {
        const response = await phoneAPI.checkPhoneStatus();
        if (response.success && response.phoneVerified) {
          setSteps(prevSteps => ({
            ...prevSteps,
            phone: { ...prevSteps.phone, completed: true }
          }));
          setPhoneForm({ phone: response.phone || '', otp: '' });
        }
      } catch (err) {
        // Phone not verified yet
      }
    };
    
    checkPhoneStatus();
  }, [currentUser, isAdminUser]);
  
  // Check e-signing status
  useEffect(() => {
    if (!currentUser || isAdminUser || !activeDocumentId) return;
    
    const checkEsignStatus = async () => {
      try {
        const response = await esignAPI.checkDocumentStatus(activeDocumentId);
        if (response.success && response.data?.status === 'completed') {
          setSteps(prevSteps => ({
            ...prevSteps,
            signing: { ...prevSteps.signing, completed: true },
            payment: { ...prevSteps.payment, active: true }
          }));
        }
      } catch (err) {
        // E-signing not completed yet or document not found
      }
    };
    
    checkEsignStatus();
  }, [currentUser, isAdminUser, activeDocumentId]);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/');
    }
  };

  // This function is deprecated and should not be used directly
  // It has been replaced with direct state updates to avoid re-render loops
  const completeStep = (step) => {
    console.warn('completeStep is deprecated, use direct state updates instead');
    setSteps(prevSteps => {
      const newSteps = { ...prevSteps };
      newSteps[step].completed = true;
      
      // Activate and expand next step if available
      if (step === 'kyc' && !newSteps.signing.active) {
        newSteps.signing.active = true;
        newSteps.signing.expanded = true;
        newSteps.kyc.expanded = false;
      } else if (step === 'signing' && !newSteps.payment.active) {
        newSteps.payment.active = true;
        newSteps.payment.expanded = true;
        newSteps.signing.expanded = false;
      }
      
      return newSteps;
    });
  };
  
  // Toggle functionality removed - all sections always expanded
  
  // Handle phone form input changes
  const handlePhoneInputChange = (e) => {
    const { name, value } = e.target;
    setPhoneForm(prev => ({ ...prev, [name]: value }));
    setPhoneError(null);
  };

  // Handle OTP input change
  const handleOtpChange = (value) => {
    setPhoneForm(prev => ({ ...prev, otp: value }));
    setPhoneError(null);
  };
  
  // Send OTP to phone number
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setPhoneLoading(true);
    setPhoneError(null);
    
    try {
      const response = await phoneAPI.sendOTP(phoneForm.phone);
      if (response.success) {
        setOtpSent(true);
        setSessionId(response.sessionId);
      } else {
        setPhoneError('Failed to send OTP. Please try again.');
      }
    } catch (err) {
      setPhoneError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setPhoneLoading(false);
    }
  };
  
  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setPhoneLoading(true);
    setPhoneError(null);
    
    try {
      const response = await phoneAPI.verifyOTP(phoneForm.phone, phoneForm.otp);
      if (response.success) {
        setSteps(prevSteps => ({
          ...prevSteps,
          phone: { ...prevSteps.phone, completed: true },
          kyc: { ...prevSteps.kyc, active: true, expanded: true }
        }));
        setOtpSent(false);
      } else {
        setPhoneError(response.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setPhoneError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setPhoneLoading(false);
    }
  };
  
  // Handle KYC form input changes
  const handleKycInputChange = async (e) => {
    const { name, value } = e.target;
    setKycForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If PAN field is changed and has a valid format, check if it already exists
    if (name === 'pan' && value.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)) {
      try {
        // Show checking status
        setPanStatus({ checking: true, verified: false, validated: false, existsForOther: false, message: 'Checking PAN...' });
        
        const panCheckResult = await kycAPI.checkPANExists(value);
        
        if (panCheckResult.exists && panCheckResult.isVerified) {
          // Check if this PAN belongs to the current user
          const isCurrentUser = panCheckResult.user && 
            (panCheckResult.user.email === currentUser?.email || 
             panCheckResult.user.id === currentUser?.id);
          
          if (isCurrentUser) {
            // PAN belongs to current user - mark as verified
            setPanStatus({ 
              checking: false, 
              verified: true,
              validated: true,
              existsForOther: false,
              message: 'PAN already verified for your account' 
            });
            
            setKycResult({
              success: true,
              message: panCheckResult.message,
              isAlreadyVerified: true,
              data: null
            });
            
            // Update steps to mark KYC as completed
            setSteps(prevSteps => ({
              ...prevSteps,
              kyc: { ...prevSteps.kyc, completed: true },
              signing: { ...prevSteps.signing, active: true }
            }));
          } else {
            // PAN belongs to another user - show error
            setPanStatus({ 
              checking: false, 
              verified: false,
              validated: false,
              existsForOther: true,
              message: 'This PAN number is already registered with another account' 
            });
          }
        } else {
          // PAN not verified yet - user can proceed
          setPanStatus({ 
            checking: false, 
            verified: false,
            validated: true, // PAN is available, user can proceed
            existsForOther: false,
            message: 'PAN available - please enter your date of birth' 
          });
        }
      } catch (error) {
        // Silently handle errors - we'll do the full verification later
        setPanStatus({ checking: false, verified: false, validated: false, existsForOther: false, message: '' });
      }
    } else if (name === 'pan') {
      // Reset PAN status if input doesn't match pattern
      setPanStatus({ checking: false, verified: false, validated: false, existsForOther: false, message: '' });
    }
  };
  
  // Handle KYC verification submission
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // If PAN doesn't exist or isn't verified, proceed with verification
      // Add email to the KYC form data if available
      const kycData = {
        ...kycForm,
        email: currentUser?.email // Include email for better matching
      };
      
      const data = await kycAPI.verifyKYC(kycData);
      
      if (data.success) {
        // Check if user is already verified
        if (data.isDuplicate || data.isAlreadyVerified) {
          setKycResult({
            ...data,
            message: 'Your KYC verification has already been completed successfully'
          });
        } else {
          setKycResult(data);
        }
        
        // KYC done - unlock all other steps
        setSteps(prevSteps => ({
          ...prevSteps,
          kyc: { ...prevSteps.kyc, completed: true },
          phone: { ...prevSteps.phone, active: true },
          signing: { ...prevSteps.signing, active: true },
          payment: { ...prevSteps.payment, active: true }
        }));
        
        // Mark KYC check as completed
        setKycCheckCompleted(true);
      } else {
        setError(data.error || 'KYC verification failed');
      }
    } catch (err) {
      setError('Failed to connect to KYC service. Please try again later.');
      console.error('KYC verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if all steps are completed
  const isSetupComplete = steps.phone.completed && steps.kyc.completed && steps.signing.completed && steps.payment.completed;

  // Check active subscription - run this independently of setup completion
  useEffect(() => {
    if (!currentUser) return;
    
    const checkActiveSubscription = async () => {
      try {
        const subResponse = await userSubscriptionAPI.getActiveSubscription(currentUser.id);
        if (subResponse.success && subResponse.data) {
          // Backend now returns an array of subscriptions
          const subscriptions = Array.isArray(subResponse.data) ? subResponse.data : [subResponse.data];
          
          // Display the most recent subscription (first in array since sorted by createdAt desc)
          if (subscriptions.length > 0) {
            setActiveSubscription(subscriptions[0]);
            
            // Mark payment step as both completed AND active if user has active subscription
            setSteps(prevSteps => ({
              ...prevSteps,
              payment: { 
                ...prevSteps.payment, 
                completed: true, 
                active: true 
              }
            }));
          }
        }
      } catch (err) {
        // No active subscription found
      }
    };
    
    checkActiveSubscription();
  }, [currentUser]);
  
  // Re-check payment completion when activeSubscription changes
  useEffect(() => {
    if (activeSubscription && !steps.payment.completed) {
      setSteps(prevSteps => ({
        ...prevSteps,
        payment: { 
          ...prevSteps.payment, 
          completed: true, 
          active: true 
        }
      }));
    }
  }, [activeSubscription, steps.payment.completed]);
  
  // Fetch stock recommendations when setup is complete and subscription is active
  // For admins, fetch all recommendations regardless of subscription
  useEffect(() => {
    if (!currentUser) return;
    
    // For admins, always fetch recommendations
    // For regular users, only fetch if setup is complete and they have a subscription
    if (!isAdminUser && (!isSetupComplete || !activeSubscription)) return;
    
    const fetchRecommendations = async () => {
      try {
        setLoadingRecommendations(true);
        
        // First, refresh prices if they're stale (>10 minutes old)
        try {
          await stockRecommendationAPI.refreshPrices();
        } catch (refreshErr) {
          // Continue even if refresh fails - we'll still show cached prices
        }
        
        // Fetch recommendations based on user role
        let recResponse;
        if (isAdminUser) {
          // Admin: fetch all published recommendations
          recResponse = await stockRecommendationAPI.getAllRecommendations({ status: 'published' }, 1, 50);
        } else {
          // Regular user: fetch user-specific recommendations
          recResponse = await stockRecommendationAPI.getUserRecommendations(1, 10);
        }
        
        if (recResponse.success) {
          setStockRecommendations(recResponse.data || []);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoadingRecommendations(false);
      }
    };
    
    fetchRecommendations();
  }, [currentUser, isSetupComplete, activeSubscription, isAdminUser]);
  
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>{isSetupComplete ? 'Your Dashboard' : 'Complete Your Setup'}</h1>
            <p>Hello, {currentUser?.name || currentUser?.email}!</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        {/* Show simplified status box for completed setup or admin users */}
        {(isSetupComplete || isAdminUser) && (
          <>
            <div className="setup-status-box">
              <div className="status-icon completed">✓</div>
              <div className="status-message">
                {isAdminUser ? (
                  <>
                    <h3>Admin Privileges</h3>
                    <p>You have admin privileges. <Link to="/admin" className="admin-link">Visit the Admin Dashboard</Link> for management features.</p>
                  </>
                ) : (
                  <>
                    <h3>Setup Complete</h3>
                    <p>Your account is fully set up and ready to use all features.</p>
                  </>
                )}
              </div>
            </div>
            
            {/* Current Subscription Plan Section */}
            {activeSubscription && (
              <div className="current-subscription-section">
                <h2>Your Current Plan</h2>
                <div className="subscription-card">
                  <div className="subscription-header">
                    <div className="plan-info">
                      <h3>{activeSubscription.subscription?.name || 'N/A'}</h3>
                      <span className="plan-badge">{activeSubscription.subscription?.packageCode || 'PLAN'}</span>
                    </div>
                    <div className="plan-status">
                      <span className={`status-badge ${activeSubscription.status}`}>
                        {activeSubscription.status === 'active' ? 'Active' : activeSubscription.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="subscription-details">
                    <div className="detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">
                        {activeSubscription.duration === 'monthly' ? 'Monthly' : 
                         activeSubscription.duration === 'sixMonth' ? '6 Months' : 
                         activeSubscription.duration === 'yearly' ? 'Yearly' : activeSubscription.duration}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Start Date:</span>
                      <span className="detail-value">
                        {new Date(activeSubscription.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">End Date:</span>
                      <span className="detail-value">
                        {new Date(activeSubscription.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Days Remaining:</span>
                      <span className="detail-value highlight">
                        {Math.max(0, Math.ceil((new Date(activeSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                      </span>
                    </div>
                  </div>
                  
                  {/* Multi-Plan Benefits - Compact Version */}
                  <div className="subscription-tip">
                    <span className="tip-icon">💡</span>
                    <div className="tip-content">
                      <strong>Maximize Your Potential!</strong> Purchase multiple plans to access more strategies.
                      <Link to="/pricing" className="tip-link">Explore Plans →</Link>
                    </div>
                  </div>
                  
                  <div className="subscription-actions">
                    <Link to="/pricing" className="view-plans-btn">
                      View All Plans
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {/* No Subscription Message */}
            {!activeSubscription && !isAdminUser && (
              <div className="no-subscription-section">
                <div className="no-subscription-card">
                  <h3>No Active Subscription</h3>
                  <p>You don't have an active subscription plan yet. Choose a plan to get started with our investment recommendations.</p>
                  <Link to="/pricing" className="get-started-btn">
                    View Pricing Plans
                  </Link>
                </div>
              </div>
            )}
            
            {/* Stock Recommendations Section - Show for admins or users with subscription */}
            {(isAdminUser || activeSubscription) && (
              <div className="stock-recommendations-section">
                <h2>{isAdminUser ? 'All Active Stock Recommendations' : 'Stock Recommendations'}</h2>
                {isAdminUser && (
                  <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                    Viewing all active recommendations as admin
                  </p>
                )}
                {loadingRecommendations ? (
                  <div className="loading-message">Loading recommendations...</div>
                ) : stockRecommendations.length > 0 ? (
                  <div className="recommendations-grid">
                    {stockRecommendations.map((rec) => (
                      <div key={rec._id} className="recommendation-card">
                        <div className="rec-header">
                          <h3>{rec.stockSymbol}</h3>
                          <span className={`rec-type ${rec.recommendationType}`}>
                            {rec.recommendationType}
                          </span>
                        </div>
                        <div className="rec-body">
                          <p className="stock-name">{rec.stockName}</p>
                          <div className="price-info">
                            <div className="price-item">
                              <span className="label">Current:</span>
                              <span className="value">₹{rec.currentPrice}</span>
                            </div>
                            <div className="price-item">
                              <span className="label">Target:</span>
                              <span className="value target">₹{rec.targetPrice}</span>
                            </div>
                            <div className="price-item">
                              <span className="label">Stop Loss:</span>
                              <span className="value stoploss">₹{rec.stopLoss}</span>
                            </div>
                          </div>
                          {rec.description && (
                            <p className="rec-description">{rec.description}</p>
                          )}
                          <div className="rec-footer">
                            <span className="timeframe">{rec.timeFrame}</span>
                            {rec.pdfReport && rec.pdfReport.url && (
                              <a 
                                href={rec.pdfReport.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="pdf-link"
                                style={{
                                  color: '#dc2626',
                                  textDecoration: 'none',
                                  fontWeight: '600',
                                  fontSize: '0.9rem'
                                }}
                              >
                                📄 PDF Report
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-recommendations">
                    <p>No stock recommendations available at the moment.</p>
                    <p>Check back later for new opportunities!</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Only show the checklist if setup is not complete and user is not admin */}
        {!isSetupComplete && !isAdminUser && (
          <div className="dashboard-content">
          {/* Progress indicator */}
          <div className="progress-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{
                  width: `${(Object.values(steps).filter(step => step.completed).length / 4) * 100}%`
                }}
              ></div>
            </div>
            <div className="progress-text">
              {Object.values(steps).filter(step => step.completed).length} of 4 steps completed
            </div>
          </div>
          
          {/* Checklist */}
          <div className="checklist-container">
            <h2>Setup Checklist</h2>
            <div className="checklist">
              {/* KYC Verification Step - Now Step 1 */}
              <div className={`checklist-item ${steps.kyc.completed ? 'completed' : ''} expanded`}>
                <div className="checklist-header">
                  <div className="checklist-status">
                    {steps.kyc.completed ? (
                      <span className="status-icon completed">✓</span>
                    ) : (
                      <span className="status-icon pending">1</span>
                    )}
                  </div>
                  <div className="checklist-title">
                    <h3>KYC Verification</h3>
                    <p>Complete your Know Your Customer verification</p>
                  </div>
                </div>
                
                <div className="checklist-content">
                    {!steps.kyc.completed ? (
                      <div className="step-form">
                        {error && <div className="error-message">{error}</div>}
                        
                        <form onSubmit={handleKycSubmit} className="kyc-form">
                          <div className="form-group">
                            <label htmlFor="pan">PAN Card Number</label>
                            <div className="input-with-status">
                              <input
                                type="text"
                                id="pan"
                                name="pan"
                                value={kycForm.pan}
                                onChange={handleKycInputChange}
                                placeholder="Enter your PAN number"
                                required
                                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                                title="Valid PAN format: ABCDE1234F"
                                className={panStatus.verified ? 'verified' : ''}
                              />
                              {panStatus.checking && (
                                <div className="input-status checking">
                                  <span className="status-spinner"></span>
                                  {panStatus.message}
                                </div>
                              )}
                              {!panStatus.checking && panStatus.verified && (
                                <div className="input-status verified">
                                  <span className="status-icon">✓</span>
                                  {panStatus.message}
                                </div>
                              )}
                              {!panStatus.checking && panStatus.existsForOther && (
                                <div className="input-status error">
                                  <span className="status-icon">✕</span>
                                  {panStatus.message}
                                </div>
                              )}
                              {!panStatus.checking && panStatus.validated && !panStatus.verified && (
                                <div className="input-status success">
                                  <span className="status-icon">✓</span>
                                  {panStatus.message}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Only show DOB field after PAN is validated */}
                          {panStatus.validated && !panStatus.verified && (
                            <div className="form-group">
                              <label htmlFor="dob">Date of Birth</label>
                              <input
                                type="text"
                                id="dob"
                                name="dob"
                                value={kycForm.dob}
                                onChange={handleKycInputChange}
                                placeholder="DD-MM-YYYY"
                                required
                                pattern="\d{2}-\d{2}-\d{4}"
                                title="Format: DD-MM-YYYY"
                              />
                            </div>
                          )}
                          
                          <div className="button-group">
                            <button 
                              type="submit" 
                              className="primary-btn" 
                              disabled={isLoading || panStatus.existsForOther || (!panStatus.validated && !panStatus.verified)}
                            >
                              {isLoading ? 'Verifying...' : 'Verify KYC'}
                            </button>
                            
                            {isAdminUser && (
                              <button
                                type="button"
                                className="secondary-btn bypass-btn"
                                onClick={async () => {
                                  setIsLoading(true);
                                  try {
                                    // Call the dedicated bypass endpoint
                                    const response = await kycAPI.bypassKYC();
                                    
                                    if (response.success || response.isAlreadyVerified) {
                                      // KYC done - unlock all other steps
                                      setSteps(prevSteps => ({
                                        ...prevSteps,
                                        kyc: { ...prevSteps.kyc, completed: true },
                                        phone: { ...prevSteps.phone, active: true },
                                        signing: { ...prevSteps.signing, active: true },
                                        payment: { ...prevSteps.payment, active: true }
                                      }));
                                      setKycCheckCompleted(true);
                                      setKycResult({
                                        success: true,
                                        message: response.message || 'KYC verification bypassed (Admin)',
                                        data: response.data,
                                        isAlreadyVerified: true
                                      });
                                    } else {
                                      alert('Failed to bypass KYC: ' + (response.error || 'Unknown error'));
                                    }
                                  } catch (err) {
                                    console.error('Error bypassing KYC:', err);
                                    alert('Error bypassing KYC: ' + err.message);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }}
                                disabled={isLoading}
                              >
                                {isLoading ? 'Processing...' : 'Bypass KYC (Admin)'}
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="step-result">
                        <div className="success-message">
                          <h4>
                            {kycResult?.isAdminBypass ? 'Admin Verification Bypass' : 
                              kycResult?.isAlreadyVerified ? 'KYC Already Verified' : 
                              'KYC Verification Successful'}
                          </h4>
                          {kycResult?.message && <p>{kycResult.message}</p>}
                          {kycResult?.isAdminBypass && (
                            <p className="admin-note">
                              As an admin, you can skip the verification process. You can still complete it if needed.
                            </p>
                          )}
                        </div>
                        
                        {/* KYC Details section removed */}
                      </div>
                    )}
                </div>
              </div>
              
              {/* Phone Verification Step - Now Step 2 */}
              <div className={`checklist-item ${steps.phone.completed ? 'completed' : ''} expanded ${!steps.kyc.completed ? 'disabled' : ''}`}>
                <div className="checklist-header">
                  <div className="checklist-status">
                    {steps.phone.completed ? (
                      <span className="status-icon completed">✓</span>
                    ) : (
                      <span className="status-icon pending">2</span>
                    )}
                  </div>
                  <div className="checklist-title">
                    <h3>Mobile Number Verification</h3>
                    <p>Verify your mobile number with OTP</p>
                  </div>
                </div>
                
                <div className="checklist-content">
                  {!steps.phone.completed ? (
                    <div className="step-form">
                      {phoneError && <div className="error-message">{phoneError}</div>}
                      
                      {!otpSent ? (
                        <form onSubmit={handleSendOTP} className="phone-form">
                          <div className="form-group">
                            <label htmlFor="phone">Mobile Number</label>
                            <input
                              type="text"
                              id="phone"
                              name="phone"
                              value={phoneForm.phone}
                              onChange={handlePhoneInputChange}
                              placeholder="Enter 10-digit mobile number"
                              required
                              pattern="\d{10}"
                              title="Please enter a valid 10-digit mobile number"
                              maxLength="10"
                            />
                          </div>
                          
                          <div className="button-group">
                            <button 
                              type="submit" 
                              className="primary-btn" 
                              disabled={phoneLoading}
                            >
                              {phoneLoading ? 'Sending OTP...' : 'Send OTP'}
                            </button>
                            
                            {isAdminUser && (
                              <button 
                                type="button" 
                                className="secondary-btn bypass-btn" 
                                onClick={() => {
                                  setSteps(prevSteps => ({
                                    ...prevSteps,
                                    phone: { ...prevSteps.phone, completed: true }
                                  }));
                                }}
                                disabled={phoneLoading}
                              >
                                Bypass Phone (Admin)
                              </button>
                            )}
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyOTP} className="otp-form">
                          <div className="form-group">
                            <label htmlFor="otp">Enter OTP</label>
                            <OTPInput
                              length={4}
                              value={phoneForm.otp}
                              onChange={handleOtpChange}
                              disabled={phoneLoading}
                              error={!!phoneError}
                            />
                            <p className="otp-info">4-digit OTP sent to {phoneForm.phone}</p>
                          </div>
                          
                          <div className="button-group">
                            <button 
                              type="submit" 
                              className="primary-btn" 
                              disabled={phoneLoading}
                            >
                              {phoneLoading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                            <button 
                              type="button" 
                              className="secondary-btn" 
                              onClick={() => {
                                setOtpSent(false);
                                setPhoneForm({ ...phoneForm, otp: '' });
                              }}
                              disabled={phoneLoading}
                            >
                              Change Number
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="step-result">
                      <div className="success-message">
                        <h4>Mobile Number Verified</h4>
                        <p>Your mobile number {phoneForm.phone} has been verified successfully.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* E-Signing Step - Now Step 3 */}
              <div className={`checklist-item ${steps.signing.completed ? 'completed' : ''} expanded ${!steps.kyc.completed ? 'disabled' : ''}`}>
                <div className="checklist-header">
                  <div className="checklist-status">
                    {steps.signing.completed ? (
                      <span className="status-icon completed">✓</span>
                    ) : (
                      <span className="status-icon pending">3</span>
                    )}
                  </div>
                  <div className="checklist-title">
                    <h3>E-Signing</h3>
                    <p>Sign your investment documents electronically</p>
                  </div>
                </div>
                
                <div className="checklist-content">
                    <div className="step-form">
                      <p>Review and sign all required documents to finalize your investment.</p>
                      
                      {!steps.signing.completed ? (
                        <div className="button-group">
                          <Link 
                            to="/esign" 
                            className="primary-btn"
                          >
                            Proceed to E-Signing
                          </Link>
                          
                          <button 
                            type="button" 
                            className="secondary-btn" 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to skip e-signing for now? You can complete it later.')) {
                                setSteps(prevSteps => ({
                                  ...prevSteps,
                                  signing: { ...prevSteps.signing, completed: true },
                                  payment: { ...prevSteps.payment, active: true }
                                }));
                                alert('✓ E-signing skipped. You can complete it later from your profile.');
                              }
                            }}
                          >
                            Skip for Now
                          </button>
                          
                          <button 
                            type="button" 
                            className="secondary-btn" 
                            onClick={async () => {
                              // Validate activeDocumentId
                              if (!activeDocumentId || activeDocumentId === 'null' || activeDocumentId === 'undefined') {
                                alert('No active e-signing session found. Please proceed to e-signing first.');
                                return;
                              }
                              
                              setIsLoading(true);
                              try {
                                console.log('Checking status for documentId:', activeDocumentId);
                                
                                // First, get the requestId from our database
                                const dbResponse = await esignAPI.checkDocumentStatus(activeDocumentId);
                                
                                if (!dbResponse.success || !dbResponse.data?.requestId) {
                                  alert('No active e-signing session found. Please proceed to e-signing first.');
                                  setIsLoading(false);
                                  return;
                                }
                                
                                const requestId = dbResponse.data.requestId;
                                console.log('Checking status for requestId:', requestId);
                                
                                // Call Leegality API directly to check status
                                const response = await fetch(`https://app1.leegality.com/api/v2.2/sign/request?documentId=${requestId}`, {
                                  method: 'GET',
                                  headers: {
                                    'X-Auth-Token': 'SZ4WMvKmP4ZNWMNDRsanQ52m0sCOYLCI',
                                    'Accept': 'application/json'
                                  }
                                });
                                
                                if (response.ok) {
                                  const result = await response.json();
                                  console.log('Leegality status response:', result);
                                  
                                  // Check if all invitees have signed
                                  const allSigned = result.data?.invitees?.every(invitee => invitee.status === 'signed');
                                  
                                  if (allSigned) {
                                    // Update our database
                                    await fetch(`${API_URL}/esign/update-status`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({
                                        documentId: activeDocumentId,
                                        status: 'completed'
                                      })
                                    });
                                    
                                    setSteps(prevSteps => ({
                                      ...prevSteps,
                                      signing: { ...prevSteps.signing, completed: true },
                                      payment: { ...prevSteps.payment, active: true }
                                    }));
                                    alert('✓ E-signing completed successfully!');
                                  } else {
                                    const status = result.data?.invitees?.[0]?.status || 'pending';
                                    alert(`E-signing status: ${status}. Please complete the signing process.`);
                                  }
                                } else {
                                  const errorData = await response.json();
                                  alert('Failed to check status: ' + (errorData.message || 'Unknown error'));
                                }
                              } catch (err) {
                                console.error('Error checking e-sign status:', err);
                                alert('Error checking status: ' + err.message);
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Checking...' : 'Check Status'}
                          </button>
                          
                          {isAdminUser && (
                            <button 
                              type="button" 
                              className="secondary-btn bypass-btn" 
                              onClick={async () => {
                                setIsLoading(true);
                                try {
                                  const response = await esignAPI.bypassEsign();
                                  
                                  if (response.success || response.isAlreadySigned) {
                                    setSteps(prevSteps => ({
                                      ...prevSteps,
                                      signing: { ...prevSteps.signing, completed: true },
                                      payment: { ...prevSteps.payment, active: true }
                                    }));
                                    
                                    // Store the document ID for reference
                                    if (response.documentId) {
                                      localStorage.setItem('activeDocumentId', response.documentId);
                                      setActiveDocumentId(response.documentId);
                                    }
                                    
                                    alert(response.message || 'E-signing bypassed successfully');
                                  } else {
                                    alert('Failed to bypass e-signing: ' + (response.error || 'Unknown error'));
                                  }
                                } catch (err) {
                                  console.error('Error bypassing e-signing:', err);
                                  alert('Error bypassing e-signing: ' + err.message);
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              disabled={isLoading}
                            >
                              {isLoading ? 'Processing...' : 'Bypass E-Signing (Admin)'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="success-message">
                          <h4>E-Signing Completed</h4>
                          <p>All documents have been successfully signed.</p>
                        </div>
                      )}
                    </div>
                </div>
              </div>
              
              {/* Payment Step - Now Step 4 */}
              <div className={`checklist-item ${steps.payment.completed ? 'completed' : ''} expanded ${!steps.kyc.completed ? 'disabled' : ''}`}>
                <div className="checklist-header">
                  <div className="checklist-status">
                    {steps.payment.completed ? (
                      <span className="status-icon completed">✓</span>
                    ) : (
                      <span className="status-icon pending">4</span>
                    )}
                  </div>
                  <div className="checklist-title">
                    <h3>Payment</h3>
                    <p>Make your investment payment to secure your position</p>
                  </div>
                </div>
                
                <div className="checklist-content">
                  <div className="step-form">
                    <p>Choose your investment plan and complete your payment securely using Razorpay.</p>
                    
                    {!steps.payment.completed ? (
                      <div className="button-group">
                        <button 
                          className="primary-btn" 
                          onClick={() => navigate('/pricing')}
                        >
                          Choose Plan & Pay
                        </button>
                        
                        {isAdminUser && (
                          <button 
                            type="button" 
                            className="secondary-btn bypass-btn" 
                            onClick={async () => {
                              setBypassLoading(true);
                              try {
                                const response = await userSubscriptionAPI.createTestSubscription();
                                if (response.success) {
                                  setSteps(prevSteps => ({
                                    ...prevSteps,
                                    payment: { ...prevSteps.payment, completed: true }
                                  }));
                                  alert(`Test subscription created: ${response.data.planName} (${response.data.duration})`);
                                }
                              } catch (err) {
                                alert('Error creating test subscription: ' + err.message);
                              } finally {
                                setBypassLoading(false);
                              }
                            }}
                            disabled={bypassLoading}
                          >
                            {bypassLoading ? 'Creating...' : 'Bypass Payment (Admin)'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="success-message">
                        <h4>Payment Completed</h4>
                        <p>Your investment payment has been processed successfully.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Complete Button */}
            {steps.phone.completed && steps.kyc.completed && steps.payment.completed && steps.signing.completed && (
              <div className="complete-container">
                <button className="complete-btn">
                  Complete Setup Process
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
