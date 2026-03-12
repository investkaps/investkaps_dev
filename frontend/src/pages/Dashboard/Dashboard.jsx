import React, { useState, useEffect, useRef } from 'react';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { kycAPI, userAPI, phoneAPI, esignAPI, paymentRequestAPI } from '../../services/api';
import userSubscriptionAPI from '../../services/userSubscriptionAPI';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import OTPInput from '../../components/OTPInput/OTPInput';
import { isValidPhone, sanitizePhone, isValidPAN, formatPAN } from '../../utils/validators';
import './Dashboard.css';


const Dashboard = () => {
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Show a success banner when user is redirected here after a completed payment
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState(
    () => !!location.state?.justPurchased
  );
  useEffect(() => {
    if (paymentSuccessBanner) {
      const t = setTimeout(() => setPaymentSuccessBanner(false), 7000);
      // Clear the router state so it doesn't re-appear on refresh
      window.history.replaceState({}, '');
      return () => clearTimeout(t);
    }
  }, [paymentSuccessBanner]);
  
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
  const [phoneAlreadyExists, setPhoneAlreadyExists] = useState(false);
  // KYC form state
  const [kycForm, setKycForm] = useState({
    pan: '',
    dob: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [kycResult, setKycResult] = useState(null);
  const [kycAttemptsRemaining, setKycAttemptsRemaining] = useState(null);
  const [kycBlocked, setKycBlocked] = useState(false);
  const [panStatus, setPanStatus] = useState({
    checking: false,
    verified: false,
    validated: false, // PAN checked and doesn't exist for another user
    existsForOther: false, // PAN already exists for another user
    message: ''
  });
  
  // eSign state - will fetch from MongoDB
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  
  // Subscription and stock recommendations state
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [stockRecommendations, setStockRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);
  // QR / manual payment request statuses
  const [pendingPaymentRequests, setPendingPaymentRequests] = useState([]);

  // ─── Dashboard Initialization ────────────────────────────────────────────────
  // All four initial API checks run in parallel before the dashboard renders.
  // This prevents the "flash of stale state" where completed steps appear
  // unchecked for a moment then snap into place.
  const initRef = useRef(false);
  const [dashboardReady, setDashboardReady] = useState(false);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    if (initRef.current) return;
    initRef.current = true;

    // Compute admin status synchronously from currentUser.role
    // (avoids timing gap with isAdminUser state setter)
    const adminStatus = currentUser.role === 'admin';

    const initDashboard = async () => {
      // 10 s failsafe – if any check hangs we still open the dashboard
      await Promise.race([
        Promise.allSettled([

        // ── 1. Esign: active document ─────────────────────────────────────────
        (async () => {
          try {
            const response = await esignAPI.getActiveDocument();
            if (response.success && response.data.documentId) {
              const status = response.data.status;
              const isCompleted = status === 'COMPLETED' || status === 'completed';
              if (isCompleted) {
                setSteps(prev => ({
                  ...prev,
                  signing: { ...prev.signing, completed: true },
                  payment: { ...prev.payment, active: true }
                }));
                setActiveDocumentId(null);
                localStorage.removeItem('active_esign_document_id');
              } else {
                setActiveDocumentId(response.data.documentId);
                localStorage.setItem('active_esign_document_id', response.data.documentId);
              }
            }
          } catch (err) {
            console.log('No active document found:', err.message);
          }
        })(),

        // ── 2. KYC status ─────────────────────────────────────────────────────
        (async () => {
          try {
            setIsLoading(true);
            if (adminStatus) {
              setKycResult({
                success: true,
                message: 'As an admin, KYC verification is optional',
                data: { fullName: currentUser.name, isVerified: true },
                isAlreadyVerified: true,
                isAdminBypass: true
              });
              setSteps(prev => ({
                phone: { ...prev.phone, completed: true },
                kyc: { ...prev.kyc, completed: true, active: true },
                signing: { ...prev.signing, completed: true, active: true },
                payment: { ...prev.payment, completed: true, active: true }
              }));
              setKycCheckCompleted(true);
              return;
            }
            let isVerified = false;
            if (currentUser.id && !isVerified) {
              try {
                const response = await userAPI.getKYCStatusByClerkId(currentUser.id);
                if (response.success && response.kycStatus?.isVerified) {
                  setKycResult({ success: true, message: 'KYC verification already completed', data: response.kycStatus, isAlreadyVerified: true });
                  if (response.kycStatus.panNumber) {
                    setKycForm(prev => ({ ...prev, pan: response.kycStatus.panNumber }));
                    setPanStatus({ checking: false, verified: true, validated: true, existsForOther: false, message: 'PAN already verified for your account' });
                  }
                  setSteps(prev => ({ ...prev, kyc: { ...prev.kyc, completed: true, active: true }, phone: { ...prev.phone, active: true }, signing: { ...prev.signing, active: true }, payment: { ...prev.payment, active: true } }));
                  isVerified = true;
                }
              } catch (err) { /* No KYC status by clerkId */ }
            }
            if (currentUser.email && !isVerified) {
              try {
                const response = await userAPI.getKYCStatusByEmail(currentUser.email);
                if (response.success && response.kycStatus?.isVerified) {
                  setKycResult({ success: true, message: 'KYC verification already completed', data: response.kycStatus, isAlreadyVerified: true });
                  if (response.kycStatus.panNumber) {
                    setKycForm(prev => ({ ...prev, pan: response.kycStatus.panNumber }));
                    setPanStatus({ checking: false, verified: true, validated: true, existsForOther: false, message: 'PAN already verified for your account' });
                  }
                  setSteps(prev => ({ ...prev, kyc: { ...prev.kyc, completed: true, active: true }, phone: { ...prev.phone, active: true }, signing: { ...prev.signing, active: true }, payment: { ...prev.payment, active: true } }));
                  isVerified = true;
                }
              } catch (err) { /* No KYC status by email */ }
            }
            setKycCheckCompleted(true);
          } catch (err) {
            console.error('Error checking KYC status:', err);
          } finally {
            setIsLoading(false);
          }
        })(),

        // ── 3. Phone verification ──────────────────────────────────────────────
        (async () => {
          if (adminStatus) return;
          try {
            const response = await phoneAPI.checkPhoneStatus();
            if (response.success && response.phoneVerified) {
              setSteps(prev => ({ ...prev, phone: { ...prev.phone, completed: true } }));
              setPhoneForm({ phone: response.phone || '', otp: '' });
            }
          } catch (err) { /* Phone not verified yet */ }
        })(),

        // ── 4. Active subscription ─────────────────────────────────────────────
        (async () => {
          try {
            const subResponse = await userSubscriptionAPI.getActiveSubscription(currentUser.id);
            if (subResponse.success && subResponse.data) {
              const subscriptions = Array.isArray(subResponse.data) ? subResponse.data : [subResponse.data];
              if (subscriptions.length > 0) {
                setActiveSubscription(subscriptions[0]);
                setSteps(prev => ({ ...prev, payment: { ...prev.payment, completed: true, active: true } }));
              }
            }
          } catch (err) { /* No active subscription */ }
        })(),

        // ── 5. QR / manual payment request statuses ───────────────────────────
        (async () => {
          try {
            const prResponse = await paymentRequestAPI.getMyRequests();
            if (prResponse?.data) {
              const requests = Array.isArray(prResponse.data) ? prResponse.data : prResponse.data?.data || [];
              setPendingPaymentRequests(requests);
            }
          } catch (err) { /* No payment requests yet */ }
        })(),

        ]),
        // Fallback so the dashboard never hangs if a check stalls
        new Promise(resolve => setTimeout(resolve, 10_000)),
      ]);

      setDashboardReady(true);
    };

    initDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, currentUser]);

  // Handle e-sign completion redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const esignStatus = urlParams.get('esign');
    
    const storedActiveDocId = localStorage.getItem('active_esign_document_id');
    const docIdToCheck = activeDocumentId || storedActiveDocId;

    if (esignStatus === 'completed' && docIdToCheck) {
      // User returned from e-signing, check status
      const checkCompletionStatus = async () => {
        try {
          const response = await esignAPI.checkDocumentStatus(docIdToCheck);
          const apiStatus = response.data?.status;
          const isCompleted = response.data?.isCompleted === true || apiStatus === 'COMPLETED' || apiStatus === 'completed';

          if (response.success && isCompleted) {
            setSteps(prevSteps => ({
              ...prevSteps,
              signing: { ...prevSteps.signing, completed: true }
            }));
            
            // Show success message
            alert('E-signing completed successfully! ✓');

            // Clear stored active doc id once completed
            localStorage.removeItem('active_esign_document_id');
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
  
  // KYC, phone, esign, and subscription checks are all handled by
  // the consolidated initDashboard effect above.
  
  // E-sign status is checked manually via button click
  // Removed automatic polling to prevent loops and unnecessary API calls

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/');
    }
  };

  // Handle phone form input changes
  const handlePhoneInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const sanitized = sanitizePhone(value);
      setPhoneForm(prev => ({ ...prev, phone: sanitized }));
      setPhoneAlreadyExists(false);
      setPhoneError(null);
      // Pre-check DB when 10 digits are entered
      if (sanitized.length === 10) {
        (async () => {
          try {
            const result = await phoneAPI.checkPhoneExists(sanitized);
            if (result.exists) {
              setPhoneAlreadyExists(true);
              setPhoneError('This phone number is already registered with another account.');
            }
          } catch { /* silently ignore check errors */ }
        })();
      }
      return;
    }
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
    
    if (!isValidPhone(phoneForm.phone)) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    if (phoneAlreadyExists) {
      setPhoneError('This phone number is already registered with another account.');
      return;
    }
    
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
    
    if (name === 'pan') {
      // Auto-uppercase PAN input
      const formatted = formatPAN(value);
      setKycForm(prev => ({ ...prev, pan: formatted }));
    } else {
      setKycForm(prev => ({ ...prev, [name]: value }));
    }
    
    // If PAN field is changed and has a valid format, check if it already exists
    const panValue = name === 'pan' ? formatPAN(value) : kycForm.pan;
    if (name === 'pan' && isValidPAN(panValue)) {
      try {
        // Show checking status
        setPanStatus({ checking: true, verified: false, validated: false, existsForOther: false, message: 'Checking PAN...' });
        
        const panCheckResult = await kycAPI.checkPANExists(value);
        
        if (panCheckResult.exists && panCheckResult.isVerified) {
          // Check if this PAN belongs to the current user
          const isCurrentUser = panCheckResult.user && 
            (panCheckResult.user.clerkId === currentUser?.id || 
             panCheckResult.user.email === currentUser?.email);
          
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
              kyc: { ...prevSteps.kyc, completed: true, active: true },
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
          // PAN not verified yet - user can proceed; show no message for available PANs
          setPanStatus({ 
            checking: false, 
            verified: false,
            validated: true,
            existsForOther: false,
            message: ''
          });
        }
      } catch (error) {
        // Silently handle errors - we'll do the full verification later
        setPanStatus({ checking: false, verified: false, validated: false, existsForOther: false, message: '' });
      }
    } else if (name === 'pan') {
      setPanStatus({ checking: false, verified: false, validated: false, existsForOther: false, message: '' });
    }
  };
  
  // Handle KYC verification submission
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    
    if (!isValidPAN(kycForm.pan)) {
      setError('Please enter a valid PAN number (e.g. ABCDE1234F)');
      return;
    }
    if (panStatus.validated && !panStatus.verified && !kycForm.dob) {
      setError('Please enter your date of birth');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const kycData = {
        pan: formatPAN(kycForm.pan),
        dob: kycForm.dob,
        email: currentUser?.email
      };
      
      const data = await kycAPI.verifyKYC(kycData);
      
      if (data.success) {
        // Verified — unlock all other steps
        if (data.isDuplicate || data.isAlreadyVerified) {
          setKycResult({ ...data, message: 'Your KYC verification has already been completed successfully' });
        } else {
          setKycResult(data);
        }
        setSteps(prevSteps => ({
          ...prevSteps,
          kyc: { ...prevSteps.kyc, completed: true, active: true },
          phone: { ...prevSteps.phone, active: true },
          signing: { ...prevSteps.signing, active: true },
          payment: { ...prevSteps.payment, active: true }
        }));
        setKycCheckCompleted(true);
      } else {
        // Non-verified informational statuses (under process, on hold, rejected, etc.)
        if (data.code === 'KYC_BLOCKED') {
          setKycBlocked(true);
          setError(null);
        } else {
          if (typeof data.attemptsRemaining === 'number') {
            setKycAttemptsRemaining(data.attemptsRemaining);
          }
          setError(data.message || data.error || 'KYC verification failed');
        }
      }
    } catch (err) {
      // Only genuine network failures reach here now (verifyKYC returns payloads on API errors)
      setError('Failed to connect to KYC service. Please try again later.');
      console.error('KYC verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if all steps are completed
  const isSetupComplete = steps.phone.completed && steps.kyc.completed && steps.signing.completed && steps.payment.completed;

  // Active subscription check is handled by the consolidated initDashboard effect above.
  
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
  
  // Block render until all initial checks have resolved
  if (authLoading || !dashboardReady) {
    return (
      <div className="dashboard-init-loading">
        <div className="init-loading-card">
          <div className="init-spinner"></div>
          <h2>Loading your dashboard</h2>
          <p>Checking your account status&hellip;</p>
          <ul className="init-checklist">
            <li>KYC verification</li>
            <li>Phone verification</li>
            <li>Agreement &amp; signing</li>
            <li>Subscription</li>
          </ul>
        </div>
      </div>
    );
  }

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

        {/* Payment success banner – shown when redirected from Razorpay checkout */}
        {paymentSuccessBanner && (
          <div className="payment-success-banner">
            ✅ Payment successful! Your subscription has been activated.
            <button className="dismiss-banner" onClick={() => setPaymentSuccessBanner(false)}>&#x2715;</button>
          </div>
        )}

        {/* Persistent banner: subscription is active but setup steps not all done */}
        {activeSubscription && !isSetupComplete && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            marginBottom: '16px',
            borderRadius: '10px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            fontWeight: 500,
            fontSize: '0.95rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)'
          }}>
            <span style={{ fontSize: '1.3rem' }}>🎉</span>
            <span>
              <strong>Payment received — your subscription is active!</strong>
              &nbsp;Please complete the remaining steps below to fully activate your account and access all features.
            </span>
          </div>
        )}

        {/* ── QR / Manual Payment Request Status ─── visible regardless of setup state */}
        {pendingPaymentRequests.length > 0 && (
          <div className="payment-requests-section">
            <h2>QR / Manual Payment Status</h2>
            <div className="payment-requests-list">
              {pendingPaymentRequests.map(req => (
                <div key={req._id} className="payment-request-card">
                  <div className="pr-info">
                    <span className="pr-plan">{req.planName || 'Plan'}</span>
                    {req.amount && <span className="pr-amount">₹{req.amount}</span>}
                    <span className="pr-date">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`pr-status-badge pr-status-${req.status}`}>
                    {req.status === 'pending' ? '⏳ Pending Review' : req.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                  </span>
                  {req.status === 'pending' && (
                    <p className="pr-note">Your payment has been submitted. An admin will review and activate your subscription shortly.</p>
                  )}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <p className="pr-note pr-rejected-note">Reason: {req.rejectionReason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Subscription active but onboarding not complete ── */}
        {activeSubscription && !isSetupComplete && !isAdminUser && (
          <div className="subscription-pending-notice">
            <span className="notice-icon">ℹ️</span>
            <div className="notice-body">
              <strong>Subscription purchased!</strong> You have an active <em>{activeSubscription.subscription?.name || 'plan'}</em> subscription.
              Complete the onboarding steps below to start receiving recommendations.
            </div>
          </div>
        )}

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
                  <div className="recommendations-table-container">
                    <table className="recommendations-table">
                      <thead>
                        <tr>
                          <th>Stock</th>
                          <th>Type</th>
                          <th>Current</th>
                          <th>Target 1</th>
                          <th>Target 2</th>
                          <th>Target 3</th>
                          <th>Stop Loss</th>
                          <th>Timeframe</th>
                          <th>Report</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockRecommendations.map((rec) => (
                          <tr key={rec._id} className="rec-row">
                            <td className="stock-cell">
                              <span className="stock-symbol">{rec.stockSymbol}</span>
                              <span className="stock-name">{rec.stockName}</span>
                            </td>
                            <td>
                              <span className={`rec-badge ${rec.recommendationType}`}>
                                {rec.recommendationType.toUpperCase()}
                              </span>
                            </td>
                            <td className="price-cell">₹{rec.currentPrice}</td>
                            <td className="price-cell target">₹{rec.targetPrice}</td>
                            <td className="price-cell target">{rec.targetPrice2 ? `₹${rec.targetPrice2}` : '-'}</td>
                            <td className="price-cell target">{rec.targetPrice3 ? `₹${rec.targetPrice3}` : '-'}</td>
                            <td className="price-cell stoploss">{rec.stopLoss ? `₹${rec.stopLoss}` : '-'}</td>
                            <td className="timeframe-cell">
                              {rec.timeFrame === 'short_term' ? 'Short' : rec.timeFrame === 'medium_term' ? 'Medium' : 'Long'}
                            </td>
                            <td>
                              {rec.pdfReport && rec.pdfReport.url ? (
                                <a 
                                  href={rec.pdfReport.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="pdf-btn"
                                >
                                  📄 View
                                </a>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                        {/* Attempts remaining info */}
                        {kycAttemptsRemaining !== null && (
                          <div className="info-message" style={{ marginBottom: '12px' }}>
                            ⚠️ {kycAttemptsRemaining} attempt{kycAttemptsRemaining !== 1 ? 's' : ''} remaining before your account is blocked.
                          </div>
                        )}

                        {/* Any backend-provided message or generic error */}
                        {error && (
                          <div className="error-message" style={{ marginBottom: '12px' }}>
                            <p>{error}</p>
                          </div>
                        )}

                        {/* If account is actually blocked (backend returned KYC_BLOCKED), show a concise inline notice and disable the form */}
                        {kycBlocked && (
                          <div className="error-message" style={{ marginBottom: '12px' }}>
                            <p>Your KYC option is currently blocked. Please contact support to unblock your account.</p>
                          </div>
                        )}

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
                                        kyc: { ...prevSteps.kyc, completed: true, active: true },
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
                            onClick={async () => {
                              const storedActiveDocId = localStorage.getItem('active_esign_document_id');
                              const docIdToCheck = activeDocumentId || storedActiveDocId;

                              // Validate activeDocumentId
                              if (!docIdToCheck || docIdToCheck === 'null' || docIdToCheck === 'undefined') {
                                alert('No active e-signing session found. Please proceed to e-signing first.');
                                return;
                              }
                              
                              setIsLoading(true);
                              try {
                                // Use backend endpoint - it handles Leegality API call and file downloads
                                const response = await esignAPI.checkDocumentStatus(docIdToCheck);
                                
                                if (!response.success) {
                                  alert('Failed to check status: ' + (response.error || 'Unknown error'));
                                  setIsLoading(false);
                                  return;
                                }
                                
                                const data = response.data;
                                
                                // Check completion status
                                if (data.isCompleted) {
                                  // Update UI
                                  setSteps(prevSteps => ({
                                    ...prevSteps,
                                    signing: { ...prevSteps.signing, completed: true },
                                    payment: { ...prevSteps.payment, active: true }
                                  }));
                                  
                                  // Clear active document
                                  setActiveDocumentId(null);
                                  localStorage.removeItem('active_esign_document_id');
                                  
                                  alert('✓ E-signing completed successfully!');
                                } else if (data.status === 'EXPIRED') {
                                  alert('E-signing link has expired. Please restart the process.');
                                  setActiveDocumentId(null);
                                } else if (data.status === 'REJECTED') {
                                  alert('E-signing was rejected. Please restart the process.');
                                  setActiveDocumentId(null);
                                } else {
                                  // Show progress
                                  const { signed, total } = data.signingDetails;
                                  alert(`E-signing in progress: ${signed}/${total} have signed. Please complete the signing process.`);
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
