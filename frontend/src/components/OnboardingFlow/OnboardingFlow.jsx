import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OTPInput from '../OTPInput/OTPInput';
import RiskQuestionnaire from '../RiskQuestionnaire/RiskQuestionnaire';
import IAPaymentStep from './IAPaymentStep';
import { esignAPI } from '../../services/api';
import { loadAgreementBase64 } from '../../pages/AadhaarESign/agreementBase64Loader';
import './OnboardingFlow.css';

/**
 * OnboardingFlow
 * ──────────────
 * Razorpay-style left-sidebar + main-panel onboarding.
 *
 * Props (all forwarded from Dashboard):
 *  serviceType        – 'RA' | 'IA'
 *  steps              – { kyc, phone, signing, payment }
 *  isAdminUser
 *  isRaCustomer       – existing RA customer (skip KYC+phone for IA)
 *
 * KYC props:
 *  kycForm, kycResult, kycBlocked, kycAttemptsRemaining
 *  panStatus, error, isLoading
 *  handleKycInputChange, handleKycSubmit, handleKycBypass
 *
 * Phone props:
 *  phoneForm, otpSent, phoneError, phoneLoading, phoneAlreadyExists
 *  handlePhoneInputChange, handleOtpChange, handleSendOTP, handleVerifyOTP, handlePhoneBypass
 *
 * Signing props:
 *  activeDocumentId, handleCheckEsignStatus, handleEsignBypass
 *
 * Payment props:
 *  bypassLoading, handlePaymentBypass, handleIaPaymentComplete
 */
const OnboardingFlow = ({
  serviceType = 'RA',
  steps,
  isAdminUser,
  isRaCustomer,
  // KYC
  kycForm,
  kycResult,
  kycBlocked,
  kycAttemptsRemaining,
  panStatus,
  error,
  isLoading,
  handleKycInputChange,
  handleKycSubmit,
  handleKycBypass,
  // Phone
  phoneForm,
  otpSent,
  phoneError,
  phoneLoading,
  phoneAlreadyExists,
  handlePhoneInputChange,
  handleOtpChange,
  handleSendOTP,
  handleVerifyOTP,
  handlePhoneBypass,
  handlePhoneSkip,
  currentUser,
  // Questionnaire
  handleQuestionnaireComplete,
  // Signing
  activeDocumentId,
  handleCheckEsignStatus,
  handleEsignBypass,
  esignStatusChecking,
  esignStatusMessage,
  // Payment
  bypassLoading,
  handlePaymentBypass,
  handleIaPaymentComplete,
}) => {
  const navigate = useNavigate();

  // IA flow: PAN KYC → Mobile → Legal → [TBD step]
  // RA flow: PAN KYC → Mobile → Legal → Payment
  const buildStepList = () => {
    const base = [
      {
        id: 'kyc',
        label: 'PAN KYC',
        subtitle: 'Identity verification',
        icon: '🪪',
        mandatory: true,
        completed: steps.kyc.completed,
        skippedForRa: serviceType === 'IA' && isRaCustomer && steps.kyc.completed,
      },
      {
        id: 'phone',
        label: 'Mobile Verification',
        subtitle: 'OTP confirmation',
        icon: '📱',
        mandatory: false,
        completed: steps.phone.completed,
        skippedForRa: serviceType === 'IA' && isRaCustomer && steps.phone.completed,
      },
    ];

    // Add questionnaire step for IA only (before signing)
    if (serviceType === 'IA') {
      base.push({
        id: 'questionnaire',
        label: 'Risk Profiling',
        subtitle: 'Complete risk assessment',
        icon: '📊',
        mandatory: true,
        completed: steps.questionnaire?.completed || false,
        skippedForRa: false,
      });
    }

    // Add signing step
    base.push({
      id: 'signing',
      label: serviceType === 'IA' ? 'IA Agreement' : 'RA Agreement',
      subtitle: 'E-sign your service agreement',
      icon: '📄',
      mandatory: true,
      completed: steps.signing.completed,
      skippedForRa: false,
    });

    // Add payment step for both IA and RA (with different labels)
    base.push({
      id: 'payment',
      label: serviceType === 'IA' ? 'Payment' : 'Subscription',
      subtitle: serviceType === 'IA' ? 'Activate your IA service' : 'Choose your plan',
      icon: '💳',
      mandatory: true,
      completed: steps.payment.completed,
      skippedForRa: false,
    });

    return base;
  };

  const stepList = buildStepList();
  const [activeStep, setActiveStep] = useState(() => {
    // Auto-focus first incomplete step
    const first = stepList.find((s) => !s.completed);
    return first ? first.id : stepList[stepList.length - 1].id;
  });
  const [esignForm, setEsignForm] = useState({
    name: '',
    email: currentUser?.email || '',
  });
  const [esignRequestSent, setEsignRequestSent] = useState(() =>
    Boolean(activeDocumentId || localStorage.getItem('active_esign_document_id'))
  );
  const [esignSubmitting, setEsignSubmitting] = useState(false);
  const [esignFormError, setEsignFormError] = useState('');
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);

  useEffect(() => {
    setEsignForm({
      name: '',
      email: currentUser?.email || '',
    });
  }, [currentUser?.name, currentUser?.email]);

  useEffect(() => {
    // Initialize esign polling flag from activeDocumentId or localStorage
    // but only if the stored service type matches the current flow. This
    // prevents leftover RA sessions from triggering IA polling.
    const storedId = localStorage.getItem('active_esign_document_id');
    const storedType = localStorage.getItem('active_esign_service_type');
    const shouldUseStored = storedId && storedType === serviceType;
    setEsignRequestSent(Boolean(activeDocumentId || shouldUseStored));
  }, [activeDocumentId, serviceType]);

  // If a sign request is active, ensure the signing step is focused so polling runs.
  useEffect(() => {
    if (esignRequestSent && activeStep !== 'signing') {
      setActiveStep('signing');
    }
  }, [esignRequestSent, activeStep]);

  useEffect(() => {
    if (steps.signing.completed && activeStep === 'signing') {
      const currentIndex = stepList.findIndex((step) => step.id === activeStep);
      const nextStep = stepList[currentIndex + 1];
      if (nextStep && canNavigateTo(nextStep.id)) {
        setActiveStep(nextStep.id);
      }
    }
  }, [steps.signing.completed, activeStep, stepList]);

  // Auto-advance when KYC is verified successfully
  useEffect(() => {
    if (steps.kyc.completed && activeStep === 'kyc') {
      const currentIndex = stepList.findIndex((step) => step.id === 'kyc');
      const nextStep = stepList[currentIndex + 1];
      if (nextStep) {
        setActiveStep(nextStep.id);
      }
    }
  }, [steps.kyc.completed]);

  // Auto-advance when phone is verified
  useEffect(() => {
    if (steps.phone.completed && activeStep === 'phone') {
      const currentIndex = stepList.findIndex((step) => step.id === 'phone');
      const nextStep = stepList[currentIndex + 1];
      if (nextStep) {
        setActiveStep(nextStep.id);
      }
    }
  }, [steps.phone.completed]);

  // Auto-polling for e-sign status
  const secondsPassedRef = useRef(0);
  
  useEffect(() => {
    let intervalId;
    if (esignRequestSent && !steps.signing.completed && activeStep === 'signing') {
      secondsPassedRef.current = 0; // reset on new start
      intervalId = setInterval(async () => {
        secondsPassedRef.current += 10;
        if (secondsPassedRef.current >= 180) {
          clearInterval(intervalId);
          setEsignFormError('Polling timed out. Please check status manually.');
          return;
        }
        
        if (handleCheckEsignStatus) {
          const result = await handleCheckEsignStatus(true);
          if (result && result.success && result.completed) {
            setEsignRequestSent(true);
            setEsignFormError('');
            clearInterval(intervalId);
          }
        }
      }, 10000);
    }
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esignRequestSent, steps.signing.completed, activeStep]);

  const completedCount = stepList.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / stepList.length) * 100);

  const canNavigateTo = (stepId) => {
    // KYC must be done first before navigating to anything else
    if (stepId !== 'kyc' && !steps.kyc.completed && !isAdminUser) return false;
    return true;
  };

  const getStepStatus = (step) => {
    if (step.completed) return 'completed';
    if (step.id === activeStep) return 'active';
    if (!canNavigateTo(step.id)) return 'locked';
    return 'pending';
  };

  const handleStepClick = (stepId) => {
    if (canNavigateTo(stepId)) setActiveStep(stepId);
  };

  const handleSkipPhone = () => {
    if (typeof handlePhoneSkip === 'function') handlePhoneSkip();
    const currentIndex = stepList.findIndex((step) => step.id === activeStep);
    const nextStep = stepList[currentIndex + 1];
    if (nextStep && canNavigateTo(nextStep.id)) setActiveStep(nextStep.id);
  };

  const handleEsignFieldChange = (event) => {
    const { name, value } = event.target;
    setEsignForm((prev) => ({ ...prev, [name]: value }));
    if (esignFormError) setEsignFormError('');
  };

  const handleInlineEsignSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = esignForm.name.trim();
    const trimmedEmail = esignForm.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setEsignFormError('Full name and email are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEsignFormError('Enter a valid email address.');
      return;
    }

    setEsignSubmitting(true);
    setEsignFormError('');

    try {
      const profileId = serviceType === 'IA' ? 'sJRIpdu' : 'TNbM5NR';
      const fileBase64 = await loadAgreementBase64(serviceType);

      const response = await esignAPI.createSignRequest({
        serviceType,
        name: trimmedName,
        profileId,
        fileName: serviceType === 'IA' ? 'investkaps Investment Advisory Agreement' : 'investkaps_Research_Analyst_Agreement_MITC',
        invitees: [{ name: trimmedName, email: trimmedEmail }],
        file: {
          name: serviceType === 'IA' ? 'investkaps Investment Advisory Agreement' : 'investkaps_Research_Analyst_Agreement_MITC',
          file: fileBase64,
          fields: [{}],
        },
        irn: `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      });

      const signUrl = response?.data?.invitees?.[0]?.signUrl;
      const mongoDocumentId = response?.data?.mongoDocumentId;

      if (!response?.success || !signUrl) {
        throw new Error(response?.error || 'Could not start signing');
      }

      if (mongoDocumentId) localStorage.setItem('active_esign_document_id', mongoDocumentId);
      // persist the service type and the email used for signing so we can
      // show a confirmation mentioning the email after the user returns.
      localStorage.setItem('active_esign_service_type', serviceType);
      localStorage.setItem('active_esign_signed_email', trimmedEmail);
      setEsignRequestSent(true);
      window.location.href = signUrl;
    } catch (error) {
      setEsignFormError(error.message || 'Failed to start e-sign.');
    } finally {
      setEsignSubmitting(false);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const renderKycStep = () => {
    if (steps.kyc.completed) {
      return (
        <div className="ob-step-success">
          <span className="ob-success-icon">✓</span>
          <h3>
            {kycResult?.isAdminBypass
              ? 'Admin Bypass Active'
              : kycResult?.isAlreadyVerified
              ? 'KYC Already Verified'
              : 'KYC Verified Successfully'}
          </h3>
          <p>{kycResult?.message || 'Your identity has been confirmed.'}</p>
          {serviceType === 'IA' && isRaCustomer && (
            <div className="ob-ra-skip-badge">
              <span>⚡</span> Carried over from your RA account
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="ob-step-body">
        <p className="ob-step-desc">
          PAN KYC is <strong>mandatory</strong> and must be completed before any service can be activated.
        </p>

        {kycAttemptsRemaining !== null && (
          <div className="ob-alert ob-alert-warning">
            ⚠️ {kycAttemptsRemaining} attempt{kycAttemptsRemaining !== 1 ? 's' : ''} remaining before your account is blocked.
          </div>
        )}
        {error && <div className="ob-alert ob-alert-error">{error}</div>}
        {kycBlocked && (
          <div className="ob-alert ob-alert-error">
            Your KYC is currently blocked. Please contact support to unblock your account.
          </div>
        )}

        <form onSubmit={handleKycSubmit} className="ob-form">
          <div className="ob-field">
            <label htmlFor="ob-pan">PAN Card Number</label>
            <div className="ob-input-wrap">
              <input
                id="ob-pan"
                type="text"
                name="pan"
                value={kycForm.pan}
                onChange={handleKycInputChange}
                placeholder="ABCDE1234F"
                required
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                title="Valid PAN format: ABCDE1234F"
                className={panStatus.verified ? 'input-verified' : panStatus.existsForOther ? 'input-error' : ''}
                disabled={kycBlocked}
              />
              {panStatus.checking && (
                <span className="ob-field-status checking">
                  <span className="ob-spinner-mini" /> Checking…
                </span>
              )}
              {!panStatus.checking && panStatus.verified && (
                <span className="ob-field-status verified">✓ PAN verified</span>
              )}
              {!panStatus.checking && panStatus.existsForOther && (
                <span className="ob-field-status error">✕ Already registered</span>
              )}
              {!panStatus.checking && panStatus.validated && !panStatus.verified && !panStatus.existsForOther && (
                <span className="ob-field-status valid">✓ PAN available</span>
              )}
            </div>
          </div>

          {panStatus.validated && !panStatus.verified && (
            <div className="ob-field">
              <label htmlFor="ob-dob">Date of Birth</label>
              <input
                id="ob-dob"
                type="text"
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

          <div className="ob-actions">
            <button
              type="submit"
              className="ob-btn ob-btn-primary"
              disabled={isLoading || panStatus.existsForOther || kycBlocked || (!panStatus.validated && !panStatus.verified)}
            >
              {isLoading ? <><span className="ob-spinner-mini" /> Verifying…</> : 'Verify KYC'}
            </button>
            {isAdminUser && (
              <button type="button" className="ob-btn ob-btn-bypass" onClick={handleKycBypass} disabled={isLoading}>
                ⚡ Bypass (Admin)
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  const renderPhoneStep = () => {
    if (steps.phone.completed) {
      return (
        <div className="ob-step-success">
          <span className="ob-success-icon">✓</span>
          <h3>Mobile Verified</h3>
          <p>
            {phoneForm.phone
              ? `+91 ${phoneForm.phone} has been verified.`
              : 'Your mobile number has been verified.'}
          </p>
          {serviceType === 'IA' && isRaCustomer && (
            <div className="ob-ra-skip-badge">
              <span>⚡</span> Carried over from your RA account
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="ob-step-body">
        <p className="ob-step-desc">
          Verify your mobile number with a one-time password. You can skip this step and complete it later.
        </p>
        {phoneError && <div className="ob-alert ob-alert-error">{phoneError}</div>}

        {!otpSent ? (
          <form onSubmit={handleSendOTP} className="ob-form">
            <div className="ob-field">
              <label htmlFor="ob-phone">Mobile Number</label>
              <div className="ob-input-wrap">
                <span className="ob-input-prefix">+91</span>
                <input
                  id="ob-phone"
                  type="text"
                  name="phone"
                  value={phoneForm.phone}
                  onChange={handlePhoneInputChange}
                  placeholder="10-digit mobile number"
                  required
                  pattern="\d{10}"
                  maxLength="10"
                  className={phoneAlreadyExists ? 'input-error' : ''}
                />
              </div>
            </div>
            <div className="ob-actions">
              <button type="submit" className="ob-btn ob-btn-primary" disabled={phoneLoading || phoneAlreadyExists}>
                {phoneLoading ? <><span className="ob-spinner-mini" /> Sending…</> : 'Send OTP'}
              </button>
              <button type="button" className="ob-btn ob-btn-ghost" onClick={handleSkipPhone}>
                Skip for now
              </button>
              {isAdminUser && (
                <button type="button" className="ob-btn ob-btn-bypass" onClick={handlePhoneBypass}>
                  ⚡ Bypass (Admin)
                </button>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="ob-form">
            <div className="ob-field ob-field-center">
              <label>Enter OTP sent to +91 {phoneForm.phone}</label>
              <OTPInput
                length={4}
                value={phoneForm.otp}
                onChange={handleOtpChange}
                disabled={phoneLoading}
                error={!!phoneError}
              />
            </div>
            <div className="ob-actions ob-actions-center">
              <button type="submit" className="ob-btn ob-btn-primary" disabled={phoneLoading}>
                {phoneLoading ? <><span className="ob-spinner-mini" /> Verifying…</> : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="ob-btn ob-btn-ghost"
                onClick={() => {
                  /* reset OTP – handled by parent, but we call the inline reset */
                  window.__ob_resetOtp?.();
                }}
                disabled={phoneLoading}
              >
                Change Number
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  const renderQuestionnaireStep = () => {
    return (
      <RiskQuestionnaire
        onComplete={(result) => {
          // Update parent DB state (marks questionnaire.completed = true in iaSteps)
          if (handleQuestionnaireComplete) {
            handleQuestionnaireComplete(result);
          }
          // Advance sidebar to IA Agreement — user explicitly clicked "Proceed"
          const currentIndex = stepList.findIndex((step) => step.id === activeStep);
          const nextStep = stepList[currentIndex + 1];
          if (nextStep && canNavigateTo(nextStep.id)) {
            setActiveStep(nextStep.id);
          }
        }}
        onSkip={() => {
          const currentIndex = stepList.findIndex((step) => step.id === activeStep);
          const nextStep = stepList[currentIndex + 1];
          if (nextStep && canNavigateTo(nextStep.id)) {
            setActiveStep(nextStep.id);
          }
        }}
      />
    );
  };

  const renderSigningStep = () => {
    if (steps.signing.completed) {
      if (serviceType === 'IA') {
        return (
          <div className="ob-step-success">
            <span className="ob-success-icon" style={{fontSize: '48px'}}>✓</span>
            <h3>Agreement Signed</h3>
            <p>Your Investment Advisor agreement has been signed successfully.</p>
            <p style={{ color: '#64748b' }}>
              A signed copy will be emailed to <strong>{localStorage.getItem('active_esign_signed_email') || currentUser?.email || esignForm.email}</strong> shortly.
            </p>
            <p style={{ marginTop: '8px' }}>
              Our team will contact you soon to activate your IA service. If you'd prefer, you can book a meeting with us now.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <a
                href="https://calendly.com/investkaps/15min?month=2026-01"
                target="_blank"
                rel="noopener noreferrer"
                className="ob-btn ob-btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Book a Meeting
              </a>
              <button
                type="button"
                className="ob-btn ob-btn-ghost"
                onClick={() => setActiveStep('payment')}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="ob-step-success">
          <span className="ob-success-icon">✓</span>
          <h3>Agreement Signed</h3>
          <p>All required documents have been successfully signed.</p>
        </div>
      );
    }

    if (esignRequestSent) {
      return (
        <div className="ob-step-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="ob-spinner" style={{ margin: '0 auto 20px auto', width: '48px', height: '48px', border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <h3>Checking signing status...</h3>
          <p style={{ color: '#64748b', marginTop: '10px' }}>
            Please complete the e-signing process in the new tab.<br />
            We are automatically checking your status.
          </p>
          {esignFormError && <div className="ob-alert ob-alert-error" style={{ marginTop: '20px' }}>{esignFormError}</div>}
          <div style={{ marginTop: '30px' }}>
            <button
              type="button"
              className="ob-btn ob-btn-ghost"
              onClick={async () => {
                const result = await handleCheckEsignStatus?.(false);
                if (!result) return;
                if (result.success && result.completed) {
                  setEsignRequestSent(true);
                  setEsignFormError('');
                  return;
                }
                if (result.success && !result.completed) {
                  setEsignFormError('Signing is not complete yet. Please finish the signature.');
                  return;
                }
                setEsignFormError(result.error || 'Unable to verify signing status right now.');
              }}
              disabled={isLoading}
            >
              Check Status Manually
            </button>
            {isAdminUser && (
              <button type="button" className="ob-btn ob-btn-bypass" onClick={handleEsignBypass} disabled={isLoading} style={{ marginLeft: '10px' }}>
                ⚡ Bypass (Admin)
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="ob-step-body">
        <p className="ob-step-desc">
          {serviceType === 'IA'
            ? 'Review and e-sign the Investment Advisor service agreement to proceed.'
            : 'Review and e-sign the Research Analyst agreement to proceed.'}
        </p>
        <form className="ob-form" onSubmit={handleInlineEsignSubmit}>
          <div className="ob-field">
            <label htmlFor="ob-esign-name">Full Name</label>
            <input
              id="ob-esign-name"
              type="text"
              name="name"
              value={esignForm.name}
              onChange={handleEsignFieldChange}
              placeholder="As per Aadhaar card"
              required
              disabled={esignSubmitting}
            />
          </div>

          <div className="ob-field">
            <label htmlFor="ob-esign-email">Email Address</label>
            <input
              id="ob-esign-email"
              type="email"
              name="email"
              value={esignForm.email}
              onChange={handleEsignFieldChange}
              placeholder="Enter email for signed copy"
              required
              disabled={esignSubmitting}
            />
          </div>

          {esignFormError && <div className="ob-alert ob-alert-error">{esignFormError}</div>}

          <div className="ob-doc-preview">
            <span className="ob-doc-icon">📋</span>
            <div>
              <strong>{serviceType === 'IA' ? 'investkaps Investment Advisory Agreement' : 'investkaps_Research_Analyst_Agreement_MITC'}</strong>
              <p>Your signed copy will be sent to the email above.</p>
            </div>
          </div>

          <div className="ob-actions">
            <button type="submit" className="ob-btn ob-btn-primary" disabled={esignSubmitting}>
              {esignSubmitting ? 'Starting E-Sign…' : 'Proceed to E-Sign'}
            </button>
            {isAdminUser && (
              <button type="button" className="ob-btn ob-btn-bypass" onClick={handleEsignBypass} disabled={isLoading}>
                ⚡ Bypass (Admin)
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  const renderPaymentStep = () => {
    if (steps.payment.completed) {
      return (
        <div className="ob-step-success">
          <span className="ob-success-icon">✓</span>
          <h3>{serviceType === 'IA' ? 'IA Service Activated' : 'Subscription Active'}</h3>
          <p>Your plan is active. You can now access all features.</p>
        </div>
      );
    }

    if (serviceType === 'IA') {
      return (
        <IAPaymentStep 
          currentUser={currentUser} 
          onPaymentComplete={handleIaPaymentComplete}
        />
      );
    }

    return (
      <div className="ob-step-body">
        <p className="ob-step-desc">
          Choose your investment plan and complete payment to start receiving stock recommendations.
        </p>
        <div className="ob-actions">
          <button className="ob-btn ob-btn-primary" onClick={() => navigate('/pricing')}>
            Choose Plan & Pay
          </button>
          {isAdminUser && (
            <button
              type="button"
              className="ob-btn ob-btn-bypass"
              onClick={handlePaymentBypass}
              disabled={bypassLoading}
            >
              {bypassLoading ? 'Creating…' : '⚡ Bypass (Admin)'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    if (!steps.kyc.completed && activeStep !== 'kyc' && !isAdminUser) {
      return (
        <div className="ob-step-locked">
          <span className="ob-lock-icon">🔒</span>
          <h3>Complete PAN KYC First</h3>
          <p>PAN KYC verification is required before you can proceed to other steps.</p>
          <button className="ob-btn ob-btn-primary" onClick={() => setActiveStep('kyc')}>
            Go to KYC →
          </button>
        </div>
      );
    }

    switch (activeStep) {
      case 'kyc':           return renderKycStep();
      case 'phone':         return renderPhoneStep();
      case 'questionnaire': return renderQuestionnaireStep();
      case 'signing':       return renderSigningStep();
      case 'payment':       return renderPaymentStep();
      default:              return null;
    }
  };

  const activeStepMeta = stepList.find((s) => s.id === activeStep);

  return (
    <div className="ob-shell">
      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <aside className="ob-sidebar">
        <div className="ob-sidebar-header">
          <div className="ob-progress-wrap">
            <div className="ob-progress-bar">
              <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="ob-progress-label">{completedCount} / {stepList.length} steps done</span>
          </div>
        </div>

        <nav className="ob-step-nav" aria-label="Onboarding steps">
          {stepList.map((step, idx) => {
            const status = getStepStatus(step);
            return (
              <button
                key={step.id}
                className={`ob-nav-item ob-nav-${status}`}
                onClick={() => handleStepClick(step.id)}
                disabled={status === 'locked'}
                aria-current={step.id === activeStep ? 'step' : undefined}
              >
                <span className="ob-nav-indicator">
                  {step.completed ? (
                    <span className="ob-nav-check">✓</span>
                  ) : (
                    <span className="ob-nav-num">{idx + 1}</span>
                  )}
                </span>
                <span className="ob-nav-text">
                  <span className="ob-nav-label">{step.label}</span>
                  <span className="ob-nav-sub">{step.subtitle}</span>
                </span>
                {step.mandatory && !step.completed && (
                  <span className="ob-nav-required" title="Required">*</span>
                )}
                {step.skippedForRa && (
                  <span className="ob-nav-skip-tag">Carried</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="ob-sidebar-footer">
          <span className="ob-lock-note">🔒 PAN KYC is required for activation</span>
        </div>
      </aside>

      {/* ── Main Panel ───────────────────────────────────────────── */}
      <main className="ob-main">
        <div className="ob-main-header">
          <div>
            <div className="ob-flow-badge" style={{ marginBottom: '0.5rem' }}>
              {serviceType} Onboarding
            </div>
            <div className="ob-step-meta">
              <span className="ob-step-icon">{activeStepMeta?.icon}</span>
              <div>
                <h2 className="ob-step-title">{activeStepMeta?.label}</h2>
                <p className="ob-step-subtitle">{activeStepMeta?.subtitle}</p>
              </div>
            </div>
          </div>
          {activeStepMeta?.mandatory && (
            <span className="ob-mandatory-tag">Required</span>
          )}
        </div>

        <div className="ob-main-content">
          {renderStepContent()}
        </div>

        {/* Step navigation footer */}
        <div className="ob-main-footer">
          {stepList.findIndex((s) => s.id === activeStep) > 0 && (
            <button
              className="ob-btn ob-btn-ghost ob-btn-sm"
              onClick={() => {
                const idx = stepList.findIndex((s) => s.id === activeStep);
                if (idx > 0) setActiveStep(stepList[idx - 1].id);
              }}
            >
              ← Back
            </button>
          )}
          <span />
          {stepList.findIndex((s) => s.id === activeStep) < stepList.length - 1 && (
            <button
              className="ob-btn ob-btn-ghost ob-btn-sm"
              onClick={() => {
                const idx = stepList.findIndex((s) => s.id === activeStep);
                const next = stepList[idx + 1];
                if (next && canNavigateTo(next.id)) setActiveStep(next.id);
              }}
              disabled={!canNavigateTo(stepList[stepList.findIndex((s) => s.id === activeStep) + 1]?.id)}
            >
              Next →
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default OnboardingFlow;
