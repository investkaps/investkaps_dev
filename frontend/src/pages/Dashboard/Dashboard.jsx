import React, { useState, useEffect, useRef } from 'react';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../hooks/useRole';
import { kycAPI, userAPI, phoneAPI, esignAPI, paymentRequestAPI, questionnaireAPI, setupAPI } from '../../services/api';
import userSubscriptionAPI from '../../services/userSubscriptionAPI';
import stockRecommendationAPI from '../../services/stockRecommendationAPI';
import subscriptionAPI from '../../services/subscriptionAPI';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import OTPInput from '../../components/OTPInput/OTPInput';
import { isValidPhone, sanitizePhone, isValidPAN, formatPAN } from '../../utils/validators';
import Loading from '../../components/Loading/Loading';
import OnboardingFlow from '../../components/OnboardingFlow/OnboardingFlow';
import IAOnboardingFlow from '../../components/OnboardingFlow/IAOnboardingFlow';
import ServiceSelector from '../../components/OnboardingFlow/ServiceSelector';
import './Dashboard.css';
import UserTestimonial from '../../components/UserTestimonial/UserTestimonial';

const Dashboard = () => {
  const { currentUser, logout, loading: authLoading, userReady } = useAuth();
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
  const [roleResolved, setRoleResolved] = useState(false);
  
  // Set admin status once when component mounts or user changes
  useEffect(() => {
    if (currentUser) {
      const adminStatus = isAdmin();
      if (adminStatus !== isAdminUser) {
        setIsAdminUser(adminStatus);
      }
    }
  }, [currentUser, isAdmin, isAdminUser]);

  useEffect(() => {
    let mounted = true;

    const resolveRole = async () => {
      // Wait until the backend user (with role) is fully synced before making
      // any API calls. Using authLoading alone is not sufficient — it becomes
      // false the moment Clerk's hooks finish, but the DB sync may still be
      // in-flight and currentUser.role may not be set yet.
      if (authLoading || !userReady) return;

      if (!currentUser) {
        if (mounted) setRoleResolved(true);
        return;
      }

      // currentUser.role is already set by AuthContext's backend sync.
      // Only fall through to a live API call if role is somehow missing.
      if (currentUser.role) {
        const currentRole = currentUser.role;
        if (mounted) {
          setIsAdminUser(currentRole === 'admin');
          setRoleResolved(true);
        }
        if (currentRole === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        }
        return;
      }

      try {
        const adminStatusResponse = await setupAPI.getAdminStatus();
        if (!mounted) return;
        if (adminStatusResponse?.data?.isAdmin) {
          setIsAdminUser(true);
          setRoleResolved(true);
          navigate('/admin/dashboard', { replace: true });
          return;
        }
      } catch (err) {
        // Fall through to user-based lookup below.
      }

      try {
        let response = null;
        if (currentUser.id) {
          response = await userAPI.getUserByClerkId(currentUser.id);
        } else if (currentUser.email) {
          response = await userAPI.getUserByEmail(currentUser.email);
        }

        const resolvedRole = response?.user?.role || 'customer';
        if (!mounted) return;

        setIsAdminUser(resolvedRole === 'admin');
        setRoleResolved(true);

        if (resolvedRole === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        }
      } catch (err) {
        if (!mounted) return;
        setIsAdminUser(false);
        setRoleResolved(true);
      }
    };

    resolveRole();

    return () => {
      mounted = false;
    };
  }, [authLoading, userReady, currentUser, navigate]);
  
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
  const [modelPortfolio, setModelPortfolio] = useState(null);
  const [showBasketModal, setShowBasketModal] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);
  // QR / manual payment request statuses
  const [pendingPaymentRequests, setPendingPaymentRequests] = useState([]);
  // Referral reward state
  const [referralData, setReferralData] = useState(null);
  const [claimingReferral, setClaimingReferral] = useState(false);
  const esignRetryTimerRef = useRef(null);

  const clearEsignRetryTimer = () => {
    if (esignRetryTimerRef.current) {
      clearTimeout(esignRetryTimerRef.current);
      esignRetryTimerRef.current = null;
    }
  };

  // Persist IA payment completed state when an approved payment request is present
  useEffect(() => {
    try {
      const approvedIa = pendingPaymentRequests.some(r => String(r.serviceType || '').toUpperCase() === 'IA' && String(r.status || '').toLowerCase() === 'approved');
      if (approvedIa) {
        setIaSteps(prev => ({ ...prev, payment: { ...prev.payment, completed: true } }));
      }
    } catch (err) { /* ignore */ }
  }, [pendingPaymentRequests]);

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

  const tryActivatePendingSubscription = async () => {
    try {
      const clerkId = currentUser?.clerkId || currentUser?.id;
      if (!clerkId) return;
      const token = localStorage.getItem('clerk_jwt');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/payment-requests/activate-pending/${clerkId}`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.activated) {
        // Refresh the dashboard so the subscription shows as active
        window.location.reload();
      }
    } catch (e) {
      console.warn('tryActivatePendingSubscription failed silently:', e);
    }
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
          // Try to activate any pending subscription now that esign is done
          tryActivatePendingSubscription();
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
    // Wait for both the loading state AND the backend user sync to complete.
    // `authLoading` alone is not sufficient — it becomes false as soon as
    // Clerk's hooks settle, but currentUser.role (and the JWT in localStorage)
    // may not be set until the DB fetch in AuthContext finishes.
    if (authLoading || !userReady || !currentUser) return;
    if (initRef.current) return;
    initRef.current = true;

    // Compute admin status synchronously from currentUser.role
    const adminStatus = currentUser.role === 'admin';

    const initDashboard = async () => {
      // ── Step 1: Fetch all onboarding boolean flags in a single lean call ────
      // This replaces the old multi-call waterfall (KYC by clerkId, KYC by email,
      // phone status) with one server-computed, PII-free response.
      let panKycDone = false;
      let phoneDone  = false;
      let esignDone  = false;

      if (adminStatus) {
        // Admin: treat everything as complete
        panKycDone = true;
        phoneDone  = true;
        esignDone  = true;
        setKycResult({
          success: true,
          message: 'As an admin, KYC verification is optional',
          data: { fullName: currentUser.name, isVerified: true },
          isAlreadyVerified: true,
          isAdminBypass: true
        });
      } else if (currentUser.id) {
        try {
          const statusResp = await userAPI.getOnboardingStatus(currentUser.id);
          if (statusResp?.success) {
            const vs = statusResp.verificationStatus || {};
            panKycDone = vs.panKyc === true;
            phoneDone  = vs.phone  === true;
            esignDone  = vs.esign  === true;

            if (panKycDone) {
              setKycResult({ success: true, message: 'KYC verification already completed', isAlreadyVerified: true });
              setPanStatus({ checking: false, verified: true, validated: true, existsForOther: false, message: 'PAN already verified for your account' });
            }
          }
        } catch (err) {
          console.error('[Dashboard] onboarding-status fetch failed:', err.message);
        }
      }

      // Apply the KYC/phone/esign step state immediately before other checks run
      setKycCheckCompleted(panKycDone || !currentUser.id);
      setIsLoading(false);

      if (panKycDone) {
        setSteps(prev => ({
          ...prev,
          kyc:     { ...prev.kyc,     completed: true, active: true },
          phone:   { ...prev.phone,   active: true, completed: phoneDone },
          signing: { ...prev.signing, active: true, completed: esignDone },
          payment: { ...prev.payment, active: true }
        }));
        setIaSteps(prev => ({
          ...prev,
          kyc:   { ...prev.kyc,   completed: true, active: true },
          phone: { ...prev.phone, completed: phoneDone, active: true }
        }));
      }

      if (esignDone) {
        // Signing step is complete — apply via the helper so IA/RA is handled correctly
        const storedSvcType = getStoredEsignServiceType();
        applyCompletedEsignState(storedSvcType);
        clearStoredEsignSession();
      }

      // ── Step 2: Remaining parallel checks (not PII-sensitive) ──────────────
      await Promise.race([
        Promise.allSettled([

          // ── Active esign document (for in-progress sessions) ──────────────
          (async () => {
            if (adminStatus || esignDone) return; // already handled
            try {
              const response = await esignAPI.getActiveDocument();
              if (response.success && response.data.documentId) {
                const status = response.data.status;
                const isCompleted = status === 'COMPLETED' || status === 'completed';
                const serviceTypeFromResp = response.data.serviceType || getStoredEsignServiceType();
                if (isCompleted) {
                  applyCompletedEsignState(serviceTypeFromResp);
                  clearStoredEsignSession();
                } else {
                  setActiveDocumentId(response.data.documentId);
                  localStorage.setItem('active_esign_document_id', response.data.documentId);
                  if (response.data.serviceType) {
                    localStorage.setItem('active_esign_service_type', response.data.serviceType);
                  }
                }
              }
            } catch (err) {
              console.log('No active document found:', err.message);
            }
          })(),

          // ── Active subscription ───────────────────────────────────────────
          (async () => {
            try {
              const token = localStorage.getItem('clerk_jwt');
              // Also check for pending subscriptions (payment approved but onboarding incomplete)
              let pendingSub = null;
              try {
                const pendingRes = await fetch(
                  `${import.meta.env.VITE_API_URL}/payment-requests/pending-subscription/${currentUser.id}`,
                  { headers: { 'Authorization': `Bearer ${token}` } }
                );
                const pendingData = await pendingRes.json();
                if (pendingData.success && pendingData.data) pendingSub = pendingData.data;
              } catch { /* ignore */ }

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
                  // Fetch model portfolio — backend returns 404 if none linked
                  try {
                    const pfRes = await subscriptionAPI.getMyModelPortfolio();
                    if (pfRes.success && pfRes.data) setModelPortfolio(pfRes.data);
                  } catch { /* no portfolio linked to this subscription */ }
                }
              } else if (pendingSub) {
                // Payment approved but onboarding incomplete — show pending state
                setActiveSubscription(pendingSub);
                setSteps(prev => ({ ...prev, payment: { ...prev.payment, completed: true, active: true } }));
              } else {
                setActiveRaSubscription(null);
              }
            } catch (err) { /* No active subscription */ }
          })(),

          // ── Referral info ─────────────────────────────────────────────────
          (async () => {
            try {
              const token = localStorage.getItem('clerk_jwt');
              const refRes = await fetch(
                `${import.meta.env.VITE_API_URL}/referrals/my`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );
              const refData = await refRes.json();
              if (refData.success) setReferralData(refData.data);
            } catch { /* ignore */ }
          })(),

          // ── QR / manual payment request statuses ─────────────────────────
          (async () => {
            try {
              const prResponse = await paymentRequestAPI.getMyRequests();
              if (prResponse?.data) {
                const requests = Array.isArray(prResponse.data) ? prResponse.data : prResponse.data?.data || [];
                setPendingPaymentRequests(requests);
                const approvedIa = requests.some(r => String(r.serviceType || '').toUpperCase() === 'IA' && String(r.status || '').toLowerCase() === 'approved');
                if (approvedIa) {
                  setIaSteps(prev => ({ ...prev, payment: { ...prev.payment, completed: true } }));
                }
              }
            } catch (err) { /* No payment requests yet */ }
          })(),

          // ── Questionnaire response ────────────────────────────────────────
          (async () => {
            try {
              if (currentUser?.id) {
                const qResponse = await questionnaireAPI.getMyResponse();
                if (qResponse.success && qResponse.data) {
                  setIaSteps(prev => ({
                    ...prev,
                    questionnaire: { ...prev.questionnaire, completed: true, active: true },
                    signing: { ...prev.signing, active: true }
                  }));
                }
              }
            } catch (err) { /* No questionnaire response yet */ }
          })(),

        ]),
        // Failsafe — dashboard never hangs if a check stalls
        new Promise(resolve => setTimeout(resolve, 10_000)),
      ]);

      // ── Determine onboarding phase after all checks ─────────────────────────
      setSteps(prev => {
        const kycDone     = prev.kyc.completed;
        const paymentDone = prev.payment.completed;
        const signingDone = prev.signing.completed;
        const storedServiceType = String(localStorage.getItem('selected_onboarding_service_type') || '').toUpperCase();
        const preferredServiceType = storedServiceType === 'IA' ? 'IA' : 'RA';
        if (adminStatus || (kycDone && paymentDone && signingDone)) {
          setOnboardingPhase('done');
          setSelectedServices(new Set(['RA']));
          clearStoredOnboardingSelection();
        } else {
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
            setOnboardingPhase('selecting');
          }
        }
        return prev;
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

  const handleClaimReferralReward = async () => {
    setClaimingReferral(true);
    try {
      const token = localStorage.getItem('clerk_jwt');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/referrals/claim`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        window.location.reload();
      } else {
        alert(data.error || 'Failed to claim reward.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setClaimingReferral(false);
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
        setIaSteps(prev => ({ ...prev, phone: { ...prev.phone, completed: true } }));
        setOtpSent(false);
        tryActivatePendingSubscription();
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
    const isExpired = activeSubscription?.endDate && new Date(activeSubscription.endDate) < new Date();
    if (!isAdminUser && (!isSetupComplete || !activeSubscription || activeSubscription.status !== 'active' || isExpired)) return;
    
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
  
  // ─── Greeting helper ──────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ─── Setup-complete box: hide once user has dismissed it ─────────────────
  const setupDismissKey = `setup_dismissed_${currentUser?.id || currentUser?.email}`;
  const [setupDismissed, setSetupDismissed] = useState(() => !!localStorage.getItem(setupDismissKey));
  const dismissSetup = () => {
    localStorage.setItem(setupDismissKey, '1');
    setSetupDismissed(true);
  };

  // ─── Testimonial modal state ──────────────────────────────────────────────
  const [testimonialModalOpen, setTestimonialModalOpen] = useState(false);

  // Block render until all initial checks have resolved
  if (authLoading || !dashboardReady || !roleResolved) {
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

        {/* Greeting header — no logout button */}
        <div className="dashboard-greeting">
          <div>
            <h1 className="greeting-text">
              {getGreeting()}, {(currentUser?.name || currentUser?.email || '').split(' ')[0]}!
            </h1>
            <p className="greeting-sub">Here's what's happening with your account today.</p>
          </div>
        </div>

        {/* Referral reward banner */}
        {!isAdminUser && referralData?.unclaimedMonths > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: 12,
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎁</span>
              <div>
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                  You have {referralData.unclaimedMonths} free month{referralData.unclaimedMonths > 1 ? 's' : ''} to claim!
                </div>
                <div style={{ color: '#78350f', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                  {referralData.unclaimedMonths} friend{referralData.unclaimedMonths > 1 ? 's' : ''} joined using your referral code. Claim your free access anytime.
                </div>
              </div>
            </div>
            <button
              onClick={handleClaimReferralReward}
              disabled={claimingReferral}
              style={{
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0.6rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: claimingReferral ? 'not-allowed' : 'pointer',
                opacity: claimingReferral ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {claimingReferral ? 'Claiming...' : 'Claim Free Plan'}
            </button>
          </div>
        )}

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

        {/* Setup complete box — dismissible, hidden after first dismiss */}
        {!setupDismissed && (
          <div className="setup-status-box">
            <div className="status-icon completed">✓</div>
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
            <button className="setup-dismiss-btn" onClick={dismissSetup} title="Dismiss">&#x2715;</button>
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

        {/* Current Subscription Plan */}
        {activeSubscription && (
          <div className="current-subscription-section">
            <h2>Your Current Plan</h2>

            {activeSubscription.status === 'pending' && (
              <div style={{
                marginBottom: '1rem',
                padding: '1rem 1.2rem',
                background: '#fffbeb',
                border: '2px solid #fcd34d',
                borderRadius: '12px',
                color: '#92400e',
                fontSize: '0.875rem',
                lineHeight: '1.6',
              }}>
                <strong>Subscription On Hold</strong><br />
                Your payment has been received and verified. Your subscription will start automatically as soon as you complete all remaining onboarding steps below.
              </div>
            )}

            <div className="subscription-card">
              <div className="subscription-header">
                <div className="plan-info">
                  <h3>{activeSubscription.subscription?.name || 'N/A'}</h3>
                  <span className="plan-badge">{activeSubscription.subscription?.packageCode || 'PLAN'}</span>
                </div>
                <div className="plan-status">
                  <span className={`status-badge ${activeSubscription.status}`}>
                    {activeSubscription.status === 'active' ? 'Active' : activeSubscription.status === 'pending' ? 'On Hold' : activeSubscription.status}
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
                  <span className="detail-value">{activeSubscription.startDate ? new Date(activeSubscription.startDate).toLocaleDateString() : 'Pending activation'}</span>
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

        {/* Model Portfolio Basket Modal */}
        {showBasketModal && modelPortfolio && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}
            onClick={e => { if (e.target === e.currentTarget) setShowBasketModal(false); }}
          >
            <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 860, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #155d8e 100%)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.25rem' }}>Model Portfolio</div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{modelPortfolio.name}</h2>
                </div>
                <button onClick={() => setShowBasketModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              <div style={{ padding: '1.5rem 2rem' }}>
                {/* Description */}
                {modelPortfolio.description && (
                  <p style={{ color: '#475569', fontSize: '.9rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>{modelPortfolio.description}</p>
                )}

                {/* Stats bar */}
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Stocks', value: (modelPortfolio.stocks || []).length },
                    { label: 'Rebalances', value: (modelPortfolio.rebalanceHistory || []).length },
                    { label: 'Last Rebalanced', value: modelPortfolio.rebalanceHistory?.length ? new Date(modelPortfolio.rebalanceHistory.at(-1).rebalancedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '.75rem 1.25rem', minWidth: 110 }}>
                      <div style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{stat.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginTop: '.2rem' }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Stock Basket Table */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .75rem' }}>Current Basket</h3>
                {modelPortfolio.stocks?.length > 0 ? (
                  <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)' }}>
                          {['Symbol', 'Name', 'Exchange', 'Buy Range', 'Target 1', 'Target 2', 'Target 3', 'Stop Loss', 'Alloc %'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', color: '#fff', textAlign: 'left', fontWeight: 600, fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modelPortfolio.stocks.map((st, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={{ padding: '11px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#1e293b' }}>{st.stockSymbol}</td>
                            <td style={{ padding: '11px 12px', color: '#475569', fontSize: '.82rem' }}>{st.stockName}</td>
                            <td style={{ padding: '11px 12px' }}><span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 6, padding: '2px 8px', fontSize: '.75rem', fontWeight: 600 }}>{st.exchange}</span></td>
                            <td style={{ padding: '11px 12px', color: '#334155', whiteSpace: 'nowrap' }}>
                              {st.buyRange?.min && st.buyRange?.max ? `₹${st.buyRange.min} – ₹${st.buyRange.max}` : st.buyRange?.min ? `₹${st.buyRange.min}+` : '—'}
                            </td>
                            <td style={{ padding: '11px 12px', color: '#15803d', fontWeight: 600 }}>{st.targetPrice1 ? `₹${st.targetPrice1}` : '—'}</td>
                            <td style={{ padding: '11px 12px', color: '#15803d' }}>{st.targetPrice2 ? `₹${st.targetPrice2}` : '—'}</td>
                            <td style={{ padding: '11px 12px', color: '#15803d' }}>{st.targetPrice3 ? `₹${st.targetPrice3}` : '—'}</td>
                            <td style={{ padding: '11px 12px', color: '#dc2626', fontWeight: 600 }}>{st.stopLoss ? `₹${st.stopLoss}` : '—'}</td>
                            <td style={{ padding: '11px 12px', color: '#334155' }}>{st.allocation ? `${st.allocation}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', padding: '1rem', textAlign: 'center', marginBottom: '1.5rem' }}>No stocks in this basket yet.</div>
                )}

                {/* Rebalance History */}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 .75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>Rebalance History</h3>
                {modelPortfolio.rebalanceHistory?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {[...modelPortfolio.rebalanceHistory].reverse().map((entry, i) => (
                      <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', background: i === 0 ? '#f0fdf4' : '#f8fafc', borderLeft: `4px solid ${i === 0 ? '#22c55e' : '#cbd5e1'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.4rem' }}>
                          {i === 0 && <span style={{ background: '#dcfce7', color: '#166534', fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Latest</span>}
                          <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#1e293b' }}>
                            {new Date(entry.rebalancedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                          <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>
                            {new Date(entry.rebalancedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '.875rem', color: '#475569', lineHeight: 1.6 }}>{entry.changes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', padding: '.75rem', textAlign: 'center', fontSize: '.875rem' }}>No rebalance history yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expired plan notice — replaces recommendations when plan has lapsed */}
        {!isAdminUser && activeSubscription && activeSubscription.status !== 'pending' && activeSubscription.endDate && new Date(activeSubscription.endDate) < new Date() && (
          <div style={{
            background: '#fff',
            border: '1.5px solid #fca5a5',
            borderRadius: 14,
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏰</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#991b1b', fontSize: '1.2rem', fontWeight: 700 }}>Your Plan Has Expired</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              Your <strong>{activeSubscription.subscription?.name || 'subscription'}</strong> expired on{' '}
              {new Date(activeSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Renew or choose a new plan to continue receiving stock recommendations.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/pricing" style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #155d8e 100%)',
                color: '#fff',
                padding: '0.65rem 1.5rem',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}>
                Choose a Plan
              </a>
              {referralData?.unclaimedMonths > 0 && (
                <button
                  onClick={handleClaimReferralReward}
                  disabled={claimingReferral}
                  style={{
                    background: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.65rem 1.5rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: claimingReferral ? 'not-allowed' : 'pointer',
                    opacity: claimingReferral ? 0.7 : 1,
                  }}
                >
                  {claimingReferral ? 'Claiming...' : `Claim ${referralData.unclaimedMonths} Free Month${referralData.unclaimedMonths > 1 ? 's' : ''}`}
                </button>
              )}
              {referralData?.referralPlanSub && new Date(referralData.referralPlanSub.endDate) > new Date() && (
                <a href="/pricing" style={{
                  background: '#10b981',
                  color: '#fff',
                  padding: '0.65rem 1.5rem',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}>
                  Use Referral Plan
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stock Recommendations */}
        {(isAdminUser || (activeSubscription && !(activeSubscription.endDate && new Date(activeSubscription.endDate) < new Date()))) && (
          <div className="stock-recommendations-section">
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 .75rem' }}>{isAdminUser ? 'All Active Stock Recommendations' : 'Stock Recommendations'}</h2>
              {modelPortfolio && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0f7ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '.75rem 1.1rem', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <div>
                      <div style={{ fontSize: '.72rem', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '.05em' }}>Your Model Portfolio</div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '.95rem' }}>{modelPortfolio.name}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBasketModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: 'linear-gradient(135deg, #1e3a5f 0%, #155d8e 100%)', color: '#fff', border: 'none', borderRadius: 7, padding: '.5rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '.825rem', boxShadow: '0 2px 8px rgba(21,93,142,0.2)', whiteSpace: 'nowrap' }}
                  >
                    View Basket →
                  </button>
                </div>
              )}
            </div>
            {isAdminUser && <p style={{ color: '#64748b', marginBottom: '1rem' }}>Viewing all active recommendations as admin</p>}
            {loadingRecommendations ? (
              <div className="loading-message">Loading recommendations...</div>
            ) : stockRecommendations.length > 0 ? (
              <div className="recommendations-table-container">
                <table className="recommendations-table">
                  <thead>
                    <tr>
                      <th>Stock</th><th>Type</th><th>Current</th>
                      <th>Buy Range</th>
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
                        <td className="price-cell buy-range">
                          {rec.buyingRangeLow && rec.buyingRangeHigh
                            ? <span className="buy-range-badge">₹{rec.buyingRangeLow} – ₹{rec.buyingRangeHigh}</span>
                            : rec.buyingRangeLow
                            ? <span className="buy-range-badge">≥ ₹{rec.buyingRangeLow}</span>
                            : rec.buyingRangeHigh
                            ? <span className="buy-range-badge">≤ ₹{rec.buyingRangeHigh}</span>
                            : '-'}
                        </td>
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
            ) : !modelPortfolio ? (
              <div className="no-recommendations">
                <p>No stock recommendations available at the moment.</p>
              </div>
            ) : null}
          </div>
        )}

      </div>{/* end dashboard-container */}

      {/* ── IA locked notice — bottom marquee ─────────────────────────────── */}
      {isRaCustomer && !isAdminUser && iaServiceLocked && (
        <div className="db-bottom-marquee">
          <span className="db-marquee-label">NOTICE</span>
          <div className="db-marquee-track">
            <span className="db-marquee-content">
              IA services are currently locked while your RA plan is active
              {activeRaSubscription?.endDate ? ` — your RA plan expires on ${new Date(activeRaSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              IA services are currently locked while your RA plan is active
              {activeRaSubscription?.endDate ? ` — your RA plan expires on ${new Date(activeRaSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
            </span>
          </div>
        </div>
      )}

      {/* ── IA upgrade CTA (not locked, no active IA) ─────────────────────── */}
      {isRaCustomer && !isAdminUser && !iaServiceLocked && (
        <div className="db-bottom-marquee db-bottom-marquee--upgrade">
          <span className="db-marquee-label">UPGRADE</span>
          <div className="db-marquee-track">
            <span className="db-marquee-content">
              Unlock Investment Advisor services — get personalised advisory, portfolio management and goal-based planning from our SEBI-registered advisors.&nbsp;&nbsp;
              <button className="db-marquee-cta" onClick={() => {
                setIaSteps(prev => ({
                  ...prev,
                  kyc:   { ...prev.kyc,   completed: steps.kyc.completed },
                  phone: { ...prev.phone, completed: steps.phone.completed },
                }));
                setSelectedServices(new Set(['RA', 'IA']));
                setOnboardingPhase('onboarding-ia');
              }}>Sign Up for IA →</button>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              Unlock Investment Advisor services — get personalised advisory, portfolio management and goal-based planning from our SEBI-registered advisors.&nbsp;&nbsp;
              <button className="db-marquee-cta" onClick={() => {
                setIaSteps(prev => ({
                  ...prev,
                  kyc:   { ...prev.kyc,   completed: steps.kyc.completed },
                  phone: { ...prev.phone, completed: steps.phone.completed },
                }));
                setSelectedServices(new Set(['RA', 'IA']));
                setOnboardingPhase('onboarding-ia');
              }}>Sign Up for IA →</button>
            </span>
          </div>
        </div>
      )}

      {/* ── Review CTA chip + modal (non-admin only) ──────────────────────── */}
      {!isAdminUser && (
        <>
          <div className="db-review-chip" onClick={() => setTestimonialModalOpen(true)}>
            <span className="db-review-chip-icon">★</span>
            <div>
              <div className="db-review-chip-title">Loving our service?</div>
              <div className="db-review-chip-sub">Share your review — we may feature it on our site</div>
            </div>
            <span className="db-review-chip-arrow">Leave a review →</span>
          </div>

          {testimonialModalOpen && (
            <div className="db-modal-backdrop" onClick={() => setTestimonialModalOpen(false)}>
              <div className="db-modal-box" onClick={e => e.stopPropagation()}>
                <div className="db-modal-header">
                  <h3>Share Your Review</h3>
                  <button className="db-modal-close" onClick={() => setTestimonialModalOpen(false)}>&#x2715;</button>
                </div>
                <div className="db-modal-body">
                  <UserTestimonial />
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );

};

export default Dashboard;
