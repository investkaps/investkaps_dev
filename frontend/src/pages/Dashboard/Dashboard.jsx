import React, { useState, useEffect, useRef } from 'react';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { kycAPI, userAPI, phoneAPI, esignAPI, paymentRequestAPI, questionnaireAPI } from '../../services/api';
import userSubscriptionAPI from '../../services/userSubscriptionAPI';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import OTPInput from '../../components/OTPInput/OTPInput';
import { isValidPhone, sanitizePhone, isValidPAN, formatPAN } from '../../utils/validators';
import Loading from '../../components/Loading/Loading';
import OnboardingFlow from '../../components/OnboardingFlow/OnboardingFlow';
import IAOnboardingFlow from '../../components/OnboardingFlow/IAOnboardingFlow';
import ServiceSelector from '../../components/OnboardingFlow/ServiceSelector';
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
  // Show a banner when user is redirected here after QR payment submission
  const [qrPaymentSubmittedBanner, setQrPaymentSubmittedBanner] = useState(
    () => !!location.state?.paymentSubmitted
  );
  const paymentRequestsRef = useRef(null);
  useEffect(() => {
    if (paymentSuccessBanner) {
      const t = setTimeout(() => setPaymentSuccessBanner(false), 7000);
      // Clear the router state so it doesn't re-appear on refresh
      window.history.replaceState({}, '');
      return () => clearTimeout(t);
    }
  }, [paymentSuccessBanner]);

  // Handle QR payment submission banner and scroll to payment requests
  useEffect(() => {
    if (qrPaymentSubmittedBanner) {
      const t = setTimeout(() => setQrPaymentSubmittedBanner(false), 7000);
      // Scroll to payment requests section
      setTimeout(() => {
        if (paymentRequestsRef.current) {
          paymentRequestsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      // Clear the router state so it doesn't re-appear on refresh
      window.history.replaceState({}, '');
      return () => clearTimeout(t);
    }
  }, [qrPaymentSubmittedBanner]);
  
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

  // IA onboarding steps (separate state from RA steps)
  const [iaSteps, setIaSteps] = useState({
    kyc: { completed: false, active: true, expanded: true },
    phone: { completed: false, active: false, expanded: false },
    questionnaire: { completed: false, active: false, expanded: false },
    signing: { completed: false, active: false, expanded: false },
    payment: { completed: false, active: false, expanded: false }
  });

  // Service selection state
  // 'selecting' | 'onboarding-ra' | 'onboarding-ia' | 'done'
  const [onboardingPhase, setOnboardingPhase] = useState('selecting');
  // Which services the user chose
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [activeRaSubscription, setActiveRaSubscription] = useState(null);
  // Which service tab is currently viewed when both are chosen
  const [activeServiceTab, setActiveServiceTab] = useState('RA');

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
  const [esignStatusChecking, setEsignStatusChecking] = useState(false);
  const [esignStatusMessage, setEsignStatusMessage] = useState('');
  // eSign state - will fetch from MongoDB
  // Subscription and stock recommendations state
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [stockRecommendations, setStockRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);
  // QR / manual payment request statuses
  const [pendingPaymentRequests, setPendingPaymentRequests] = useState([]);
  const esignRetryTimerRef = useRef(null);

  const clearEsignRetryTimer = () => {
    if (esignRetryTimerRef.current) {
      clearTimeout(esignRetryTimerRef.current);
      esignRetryTimerRef.current = null;
    }
  };

  const getStoredEsignServiceType = () => {
    return String(localStorage.getItem('active_esign_service_type') || 'RA').toUpperCase();
  };

  const clearStoredEsignSession = () => {
    setActiveDocumentId(null);
    localStorage.removeItem('active_esign_document_id');
    localStorage.removeItem('active_esign_service_type');
    // remove the stored signer email as well
    localStorage.removeItem('active_esign_signed_email');
  };

  const clearStoredOnboardingSelection = () => {
    localStorage.removeItem('selected_onboarding_service_type');
  };

  const applyCompletedEsignState = (serviceTypeToUpdate) => {
    // Mark signing as completed for the given service. Do NOT auto-complete
    // the payment step for IA — IA requires explicit payment proof submission
    // and admin approval. Only activate the payment step so the user can
    // submit proof.
    if (serviceTypeToUpdate === 'IA') {
      setIaSteps(prev => ({ 
        ...prev, 
        signing: { ...prev.signing, completed: true, active: true },
        payment: { ...prev.payment, active: true } 
      }));
    } else {
      setSteps(prev => ({
        ...prev,
        signing: { ...prev.signing, completed: true, active: true },
        payment: { ...prev.payment, active: true }
      }));
    }
  };

  const checkEsignStatusOnce = async (docId) => {
    const response = await esignAPI.checkDocumentStatus(docId);
    if (!response.success) {
      return { success: false, error: response.error || 'Unknown error' };
    }

    const data = response.data || {};
    const apiStatus = String(data.status || '').toUpperCase();
    const isCompleted = data.isCompleted === true || apiStatus === 'COMPLETED';

    return {
      success: true,
      completed: isCompleted,
      status: data.status,
      data,
    };
  };

  const runEsignStatusCheck = async ({ docId, serviceType, maxAttempts = 10, delayMs = 3000, showErrors = true }) => {
    clearEsignRetryTimer();
    setEsignStatusChecking(true);
    setEsignStatusMessage('Checking e-sign status...');

    let attempt = 0;

    const finishFailure = (message) => {
      clearEsignRetryTimer();
      setEsignStatusChecking(false);
      setEsignStatusMessage('');
      if (showErrors) setError(message);
      return { success: false, completed: false, error: message };
    };

    const runAttempt = async () => {
      attempt += 1;

      try {
        const result = await checkEsignStatusOnce(docId);

        if (result.success && result.completed) {
          applyCompletedEsignState(serviceType);
          clearStoredEsignSession();
          clearEsignRetryTimer();
          setEsignStatusChecking(false);
          setEsignStatusMessage('E-signing completed successfully.');
          return { success: true, completed: true, status: result.status };
        }

        const status = String(result.status || '').toUpperCase();
        if (status === 'EXPIRED' || status === 'REJECTED') {
          return finishFailure(status === 'EXPIRED'
            ? 'E-signing link has expired. Please restart the process.'
            : 'E-signing was rejected. Please restart the process.');
        }

        if (attempt < maxAttempts) {
          setEsignStatusMessage(`Checking e-sign status... (${attempt}/${maxAttempts})`);
          esignRetryTimerRef.current = setTimeout(runAttempt, delayMs);
          return { success: true, completed: false, status: result.status };
        }

        return finishFailure('E-signing is still in progress. You can use Check Status to retry manually.');
      } catch (err) {
        if (attempt < maxAttempts) {
          setEsignStatusMessage(`Checking e-sign status... (${attempt}/${maxAttempts})`);
          esignRetryTimerRef.current = setTimeout(runAttempt, delayMs);
          return { success: true, completed: false, status: 'PENDING' };
        }

        return finishFailure('Unable to verify signing status automatically. Please use Check Status to retry manually.');
      }
    };

    return runAttempt();
  };

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
                applyCompletedEsignState(getStoredEsignServiceType());
                clearStoredEsignSession();
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
              // Mirror phone into IA steps too (carry-over for RA customers)
              setIaSteps(prev => ({ ...prev, phone: { ...prev.phone, completed: true } }));
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
                const raSubscription = subscriptions.find((entry) => {
                  const serviceType = entry.serviceType || entry.subscription?.serviceType;
                  return String(serviceType || '').toUpperCase() === 'RA';
                });
                setActiveRaSubscription(raSubscription || null);
              }
            } else {
              setActiveRaSubscription(null);
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

        // ── 6. Questionnaire response ──────────────────────────────────────────
        (async () => {
          try {
            if (currentUser?.id) {
              const qResponse = await questionnaireAPI.getMyResponse();
              if (qResponse.success && qResponse.data) {
                setIaSteps(prev => ({
                  ...prev,
                  questionnaire: { ...prev.questionnaire, completed: true, active: true },
                  signing: { ...prev.signing, active: true } // unlock signing if questionnaire is done
                }));
              }
            }
          } catch (err) { /* No questionnaire response yet */ }
        })(),

        ]),
        // Fallback so the dashboard never hangs if a check stalls
        new Promise(resolve => setTimeout(resolve, 10_000)),
      ]);

      // ── Determine onboarding phase after all checks ─────────────────────────
      // We read step state via a snapshot inside the setter to get latest values
      setSteps(prev => {
        // Determine phase based on resolved step state
        const kycDone = prev.kyc.completed;
        const paymentDone = prev.payment.completed;
        const signingDone = prev.signing.completed;
        const storedServiceType = String(localStorage.getItem('selected_onboarding_service_type') || '').toUpperCase();
        const preferredServiceType = storedServiceType === 'IA' ? 'IA' : 'RA';
        if (adminStatus || (kycDone && paymentDone && signingDone)) {
          // Setup complete – go straight to dashboard
          setOnboardingPhase('done');
          setSelectedServices(new Set(['RA']));
          clearStoredOnboardingSelection();
        } else {
          // Has KYC done → returning user, send them to their selected onboarding flow
          if (kycDone) {
            if (preferredServiceType === 'IA') {
              setOnboardingPhase('onboarding-ia');
              setSelectedServices(new Set(['IA']));
              setActiveServiceTab('IA');
              setIaSteps(ia => ({ ...ia, kyc: { ...ia.kyc, completed: true } }));
            } else {
              setOnboardingPhase('onboarding-ra');
              setSelectedServices(new Set(['RA']));
            }
          } else {
            // Brand new user – show service selector
            setOnboardingPhase('selecting');
          }
        }
        return prev; // no change to steps itself
      });

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
    const serviceTypeToUpdate = getStoredEsignServiceType();

    if (esignStatus === 'completed' && docIdToCheck) {
      runEsignStatusCheck({
        docId: docIdToCheck,
        serviceType: serviceTypeToUpdate,
        maxAttempts: 10,
        delayMs: 3000,
        showErrors: true,
      }).then((result) => {
        if (result?.success && result.completed) {
          alert('E-signing completed successfully!');
        } else if (result?.error) {
          console.error('Auto e-sign status check failed:', result.error);
        }

        window.history.replaceState({}, document.title, '/dashboard');
      });
    }
    return () => clearEsignRetryTimer();
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

  // ─── Service Selector handlers ────────────────────────────────────────────
  const handleToggleService = (service) => {
    setSelectedServices(new Set([service]));
  };

  const storeSelectedService = (service) => {
    localStorage.setItem('selected_onboarding_service_type', service);
  };

  const handleConfirmServices = () => {
    if (selectedServices.size === 0) return;
    // If RA is selected, go to RA onboarding first
    if (selectedServices.has('RA')) {
      setActiveServiceTab('RA');
      setOnboardingPhase('onboarding-ra');
      storeSelectedService('RA');
    } else {
      // IA only
      setActiveServiceTab('IA');
      setOnboardingPhase('onboarding-ia');
      storeSelectedService('IA');
    }
  };

  // When RA onboarding is done and user also selected IA, switch to IA tab
  const handleRaOnboardingComplete = () => {
    if (selectedServices.has('IA')) {
      // Mirror KYC + phone into IA steps (carry-over)
      setIaSteps(prev => ({
        ...prev,
        kyc: { ...prev.kyc, completed: steps.kyc.completed },
        phone: { ...prev.phone, completed: steps.phone.completed },
      }));
      setActiveServiceTab('IA');
      setOnboardingPhase('onboarding-ia');
      storeSelectedService('IA');
    } else {
      setOnboardingPhase('done');
      clearStoredOnboardingSelection();
    }
  };

  // ─── Phone skip ───────────────────────────────────────────────────────────
  const handlePhoneSkip = () => {
    // No-op for state — just move to next step in sidebar
    // The OnboardingFlow component's internal navigation handles this
  };

  // ─── Admin bypass wrappers ────────────────────────────────────────────────
  const handleKycBypass = async () => {
    setIsLoading(true);
    try {
      const response = await kycAPI.bypassKYC();
      if (response.success || response.isAlreadyVerified) {
        const allActive = { completed: true, active: true, expanded: true };
        setSteps(prev => ({
          ...prev,
          kyc: allActive,
          phone: { ...prev.phone, active: true },
          signing: { ...prev.signing, active: true },
          payment: { ...prev.payment, active: true },
        }));
        setIaSteps(prev => ({ ...prev, kyc: allActive }));
        setKycCheckCompleted(true);
        setKycResult({ success: true, message: response.message || 'KYC bypassed (Admin)', isAlreadyVerified: true });
      } else {
        alert('Failed to bypass KYC: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error bypassing KYC: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneBypass = () => {
    setSteps(prev => ({ ...prev, phone: { ...prev.phone, completed: true } }));
    setIaSteps(prev => ({ ...prev, phone: { ...prev.phone, completed: true } }));
  };

  const handleCheckEsignStatus = async (isAutoPolling = false) => {
    const storedActiveDocId = localStorage.getItem('active_esign_document_id');
    const docIdToCheck = activeDocumentId || storedActiveDocId;
    const serviceTypeToUpdate = getStoredEsignServiceType();
    if (!docIdToCheck || docIdToCheck === 'null' || docIdToCheck === 'undefined') {
      if (!isAutoPolling) alert('No active e-signing session found. Please proceed to e-signing first.');
      return { success: false, error: 'No active e-signing session found.' };
    }
    setIsLoading(true);
    try {
      const result = await checkEsignStatusOnce(docIdToCheck);
      if (!result.success) {
        const message = 'Failed to check status: ' + (result.error || 'Unknown error');
        if (!isAutoPolling) alert(message);
        return { success: false, error: result.error || 'Unknown error' };
      }

      if (result.completed) {
        applyCompletedEsignState(serviceTypeToUpdate);
        clearStoredEsignSession();
        if (!isAutoPolling) alert('E-signing completed successfully!');
        return { success: true, completed: true, status: result.status };
      }

      const status = String(result.status || '').toUpperCase();
      if (status === 'EXPIRED') {
        if (!isAutoPolling) alert('E-signing link has expired. Please restart the process.');
        clearStoredEsignSession();
        return { success: true, completed: false, status: result.status };
      }

      if (status === 'REJECTED') {
        if (!isAutoPolling) alert('E-signing was rejected. Please restart the process.');
        clearStoredEsignSession();
        return { success: true, completed: false, status: result.status };
      }

      const { signed, total } = result.data?.signingDetails || { signed: 0, total: 1 };
      if (!isAutoPolling) alert(`E-signing in progress: ${signed}/${total} signed. Please complete the signing process.`);
      return { success: true, completed: false, status: result.status, signingDetails: { signed, total } };
    } catch (err) {
      if (!isAutoPolling) alert('Error checking status: ' + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const handleEsignBypass = async () => {
    setIsLoading(true);
    try {
      const response = await esignAPI.bypassEsign();
      if (response.success || response.isAlreadySigned) {
        setSteps(prev => ({ ...prev, signing: { ...prev.signing, completed: true }, payment: { ...prev.payment, active: true } }));
        if (response.documentId) { localStorage.setItem('activeDocumentId', response.documentId); setActiveDocumentId(response.documentId); }
        alert(response.message || 'E-signing bypassed successfully');
      } else {
        alert('Failed to bypass e-signing: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error bypassing e-signing: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentBypass = async () => {
    setBypassLoading(true);
    try {
      const response = await userSubscriptionAPI.createTestSubscription();
      if (response.success) {
        setSteps(prev => ({ ...prev, payment: { ...prev.payment, completed: true } }));
        alert(`Test subscription created: ${response.data.planName} (${response.data.duration})`);
      }
    } catch (err) {
      alert('Error creating test subscription: ' + err.message);
    } finally {
      setBypassLoading(false);
    }
  };

  const handleQuestionnaireComplete = (result) => {
    console.log('Questionnaire completed in Dashboard:', result);
    setIaSteps(prev => ({ ...prev, questionnaire: { ...prev.questionnaire, completed: true, active: true }, signing: { ...prev.signing, active: true } }));
  };

  const handleIaPaymentComplete = (result) => {
    console.log('IA payment completed in Dashboard:', result);
    setIaSteps(prev => ({ ...prev, payment: { ...prev.payment, completed: true } }));
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
        setIaSteps(prevSteps => ({
          ...prevSteps,
          kyc: { ...prevSteps.kyc, completed: true, active: true },
          phone: { ...prevSteps.phone, active: true }
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

  // Check if all RA steps are completed
  const isSetupComplete = steps.phone.completed && steps.kyc.completed && steps.signing.completed && steps.payment.completed;

  // An "RA customer" is someone who has KYC + phone already done (existing user)
  // Their KYC and mobile carry over to IA onboarding automatically
  const isRaCustomer = steps.kyc.completed && steps.phone.completed;
  const iaServiceLocked = !isAdminUser && !!activeRaSubscription;

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
    return <Loading message="Loading your dashboard…" />;
  }

  // ─── Build common props for OnboardingFlow ─────────────────────────────────
  const onboardingCommonProps = {
    currentUser,
    isAdminUser,
    isRaCustomer,
    kycForm, kycResult, kycBlocked, kycAttemptsRemaining,
    panStatus, error, isLoading,
    handleKycInputChange, handleKycSubmit, handleKycBypass,
    phoneForm, otpSent, phoneError, phoneLoading, phoneAlreadyExists,
    handlePhoneInputChange, handleOtpChange, handleSendOTP, handleVerifyOTP,
    handlePhoneBypass, handlePhoneSkip,
    handleQuestionnaireComplete,
    activeDocumentId, handleCheckEsignStatus, handleEsignBypass,
    esignStatusChecking, esignStatusMessage,
    bypassLoading, handlePaymentBypass, handleIaPaymentComplete,
  };

  const hasAdminAccess = isAdminUser || isAdmin();

  // ─── Service Selector phase ────────────────────────────────────────────────
  if (!hasAdminAccess && onboardingPhase === 'selecting') {
    return (
      <ServiceSelector
        selectedServices={selectedServices}
        onToggle={handleToggleService}
        onConfirm={handleConfirmServices}
        hasActiveRa={!!activeRaSubscription}
      />
    );
  }

  // ─── Onboarding phases (RA / IA / both) ───────────────────────────────────
  const isOnboarding = !hasAdminAccess && (onboardingPhase === 'onboarding-ra' || onboardingPhase === 'onboarding-ia');
  const bothSelected = selectedServices.has('RA') && selectedServices.has('IA');

  if (isOnboarding) {
    const currentServiceType = onboardingPhase === 'onboarding-ia' ? 'IA' : 'RA';
    const currentSteps = currentServiceType === 'IA' ? iaSteps : steps;
    const currentSetSteps = currentServiceType === 'IA' ? setIaSteps : setSteps;

    // Determine if current service onboarding is fully complete
    const raOnboardingDone = steps.kyc.completed && steps.signing.completed && steps.payment.completed;
    const iaOnboardingDone = iaSteps.kyc.completed && iaSteps.signing.completed && iaSteps.payment.completed;
    const currentOnboardingDone = currentServiceType === 'RA' ? raOnboardingDone : iaOnboardingDone;

    return (
      <div className="dashboard-page">
        {/* Slim top bar */}
        <div className="ob-topbar">
          <div className="ob-topbar-left">
            <img src="/logo.png" alt="InvestKaps" className="ob-topbar-logo" />
            <span className="ob-topbar-title">{currentServiceType} Onboarding</span>
          </div>
          <div className="ob-topbar-right">
            <span className="ob-topbar-user">
              {currentUser?.name || currentUser?.email}
            </span>
            <button onClick={handleLogout} className="ob-topbar-logout">Logout</button>
          </div>
        </div>

        {/* Service tab switcher (shown if both services were selected) */}
        {bothSelected && (
          <div className="ob-service-tabs">
            <button
              className={`ob-service-tab ${onboardingPhase === 'onboarding-ra' ? 'active' : ''}`}
              onClick={() => { setActiveServiceTab('RA'); setOnboardingPhase('onboarding-ra'); }}
            >
              Research Analyst
              {steps.kyc.completed && steps.signing.completed && steps.payment.completed && (
                <span className="ob-tab-done">Done</span>
              )}
            </button>
            <button
              className={`ob-service-tab ob-service-tab-ia ${onboardingPhase === 'onboarding-ia' ? 'active' : ''}`}
              onClick={() => { setActiveServiceTab('IA'); setOnboardingPhase('onboarding-ia'); }}
            >
              Investment Advisor
              {iaSteps.kyc.completed && iaSteps.signing.completed && iaSteps.payment.completed && (
                <span className="ob-tab-done">Done</span>
              )}
            </button>
          </div>
        )}

        {/* Main onboarding shell */}
        <div className="ob-page-wrap">
          {currentServiceType === 'IA' ? (
            <IAOnboardingFlow
              {...onboardingCommonProps}
              steps={currentSteps}
            />
          ) : (
            <OnboardingFlow
              {...onboardingCommonProps}
              serviceType={currentServiceType}
              steps={currentSteps}
            />
          )}

          {/* CTA when current service is done */}
          {currentOnboardingDone && (
            <div className="ob-done-banner">
              <span>Complete</span>
              <div>
                <strong>{currentServiceType} onboarding complete!</strong>
                {bothSelected && currentServiceType === 'RA' && !iaOnboardingDone ? (
                  <button className="ob-btn-link" onClick={handleRaOnboardingComplete}>Continue to IA onboarding →</button>
                ) : (
                  <button className="ob-btn-link" onClick={() => { clearStoredOnboardingSelection(); setOnboardingPhase('done'); }}>Go to dashboard →</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Done phase: full dashboard ────────────────────────────────────────────
  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>Your Dashboard</h1>
            <p>Hello, {currentUser?.name || currentUser?.email}!</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>

        {/* Payment success banner */}
        {paymentSuccessBanner && (
          <div className="payment-success-banner">
            Payment successful. Your subscription has been activated.
            <button className="dismiss-banner" onClick={() => setPaymentSuccessBanner(false)}>&#x2715;</button>
          </div>
        )}

        {/* QR Payment submitted banner */}
        {qrPaymentSubmittedBanner && (
          <div className="payment-success-banner" style={{ backgroundColor: '#e0f2fe', borderColor: '#0284c7', color: '#075985' }}>
            Payment request submitted. We will verify it within 24 hours.
            <button className="dismiss-banner" onClick={() => setQrPaymentSubmittedBanner(false)}>&#x2715;</button>
          </div>
        )}

        {/* ─── IA Upgrade Prompt ── shown to RA customers without active IA sub ── */}
        {isRaCustomer && !isAdminUser && (
          <div className={`ia-upgrade-prompt ${iaServiceLocked ? 'ia-upgrade-locked' : ''}`}>
            <div className="ia-upgrade-body">
              <span className="section-eyebrow">Investment Advisor Access</span>
              <strong>{iaServiceLocked ? 'IA is locked while your RA plan is active' : 'Unlock Investment Advisor Services'}</strong>
              <p>
                {iaServiceLocked
                  ? `You can switch to IA after your current RA subscription ends${activeRaSubscription?.endDate ? ` on ${new Date(activeRaSubscription.endDate).toLocaleDateString()}` : ''}.`
                  : 'Get personalised advisory, portfolio management, and goal-based planning from our SEBI-registered advisors.'}
              </p>
              {iaServiceLocked && activeRaSubscription?.subscription?.name && (
                <div className="locked-plan-pill">
                  Current RA plan: {activeRaSubscription.subscription.name}
                </div>
              )}
            </div>
            {!iaServiceLocked && (
              <button
                className="ia-upgrade-btn"
                onClick={() => {
                  // Mirror existing KYC + phone into IA steps
                  setIaSteps(prev => ({
                    ...prev,
                    kyc:   { ...prev.kyc,   completed: steps.kyc.completed },
                    phone: { ...prev.phone, completed: steps.phone.completed },
                  }));
                  setSelectedServices(new Set(['RA', 'IA']));
                  setOnboardingPhase('onboarding-ia');
                }}
              >
                Sign Up for IA
              </button>
            )}
          </div>
        )}

        {/* QR / Manual Payment Request Status */}
        {qrPaymentSubmittedBanner && (
          <div className="payment-request-confirmation">
            We received your payment request. We will verify it within 24 hours.
          </div>
        )}

        {pendingPaymentRequests.length > 0 && (
          <div className="payment-requests-section" ref={paymentRequestsRef}>
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
                    {req.status === 'pending' ? 'Pending Review' : req.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                  {req.status === 'pending' && (
                    <p className="pr-note">Your payment has been submitted. An admin will review shortly.</p>
                  )}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <p className="pr-note pr-rejected-note">Reason: {req.rejectionReason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setup complete / Admin status box */}
        <div className="setup-status-box">
          <div className="status-icon completed">Ready</div>
          <div className="status-message">
            {isAdminUser ? (
              <>
                <h3>Admin Privileges</h3>
                <p>You have admin privileges. <Link to="/admin" className="admin-link">Visit the Admin Dashboard</Link></p>
              </>
            ) : (
              <>
                <h3>Setup Complete</h3>
                <p>Your account is fully set up and ready to use all features.</p>
              </>
            )}
          </div>
        </div>

        {/* Current Subscription Plan */}
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
                  <span className="detail-value">{new Date(activeSubscription.startDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">End Date:</span>
                  <span className="detail-value">{new Date(activeSubscription.endDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Days Remaining:</span>
                  <span className="detail-value highlight">
                    {Math.max(0, Math.ceil((new Date(activeSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                  </span>
                </div>
              </div>
              <div className="subscription-tip">
                <div className="tip-content">
                  <strong>Maximize your access.</strong> Purchase multiple plans to access more strategies.
                  <Link to="/pricing" className="tip-link">Explore Plans →</Link>
                </div>
              </div>
              <div className="subscription-actions">
                <Link to="/pricing" className="view-plans-btn">View All Plans</Link>
              </div>
            </div>
          </div>
        )}

        {/* No Subscription */}
        {!activeSubscription && !isAdminUser && (
          <div className="no-subscription-section">
            <div className="no-subscription-card">
              <h3>No Active Subscription</h3>
              <p>You don't have an active subscription plan yet. Choose a plan to get started.</p>
              <Link to="/pricing" className="get-started-btn">View Pricing Plans</Link>
            </div>
          </div>
        )}

        {/* Stock Recommendations */}
        {(isAdminUser || activeSubscription) && (
          <div className="stock-recommendations-section">
            <h2>{isAdminUser ? 'All Active Stock Recommendations' : 'Stock Recommendations'}</h2>
            {isAdminUser && <p style={{ color: '#64748b', marginBottom: '1rem' }}>Viewing all active recommendations as admin</p>}
            {loadingRecommendations ? (
              <div className="loading-message">Loading recommendations...</div>
            ) : stockRecommendations.length > 0 ? (
              <div className="recommendations-table-container">
                <table className="recommendations-table">
                  <thead>
                    <tr>
                      <th>Stock</th><th>Type</th><th>Current</th>
                      <th>Target 1</th><th>Target 2</th><th>Target 3</th>
                      <th>Stop Loss</th><th>Timeframe</th><th>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRecommendations.map((rec) => (
                      <tr key={rec._id} className="rec-row">
                        <td className="stock-cell">
                          <span className="stock-symbol">{rec.stockSymbol}</span>
                          <span className="stock-name">{rec.stockName}</span>
                        </td>
                        <td><span className={`rec-badge ${rec.recommendationType}`}>{rec.recommendationType.toUpperCase()}</span></td>
                        <td className="price-cell">₹{rec.currentPrice}</td>
                        <td className="price-cell target">₹{rec.targetPrice}</td>
                        <td className="price-cell target">{rec.targetPrice2 ? `₹${rec.targetPrice2}` : '-'}</td>
                        <td className="price-cell target">{rec.targetPrice3 ? `₹${rec.targetPrice3}` : '-'}</td>
                        <td className="price-cell stoploss">{rec.stopLoss ? `₹${rec.stopLoss}` : '-'}</td>
                        <td className="timeframe-cell">
                          {rec.timeFrame === 'short_term' ? 'Short' : rec.timeFrame === 'medium_term' ? 'Medium' : 'Long'}
                        </td>
                        <td>
                          {rec.pdfReport?.url
                            ? <a href={rec.pdfReport.url} target="_blank" rel="noopener noreferrer" className="pdf-btn">View PDF</a>
                            : '-'}
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
      </div>
    </div>
  );

};

export default Dashboard;
