import React, { useState, useEffect, useRef } from 'react';
import './Pricing.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import subscriptionAPI from '../../services/subscriptionAPI';
import userSubscriptionAPI from '../../services/userSubscriptionAPI';
import { referralAPI } from '../../services/api';
import { FaArrowRight, FaTimes as FaClose } from 'react-icons/fa';
import QRPaymentModal from '../../components/QRPaymentModal/QRPaymentModal';
import BookACall from '../../components/BookACall/BookACall';


const PlanCard = ({ plan, idx, totalPlans, active, onSelect, ctaLabel }) => {
  const [selectedOpt, setSelectedOpt] = useState(0);
  const featured = plan.packageCode === 'PRO' || idx === Math.floor(totalPlans / 2);
  const includedFeatures = plan.features?.filter(f => f.included) || [];
  const options = plan.planOptions || [];

  return (
    <div className={`px-card ${featured ? 'px-card--featured' : ''} ${active ? 'px-card--active' : ''}`}>
      <div className="px-card-body">
        {/* Left */}
        <div className="px-card-left">
          <p className="px-card-eyebrow">Subscription</p>
          <h3 className="px-card-name">{plan.name}</h3>
          {plan.description && <p className="px-card-desc">{plan.description}</p>}
          <div className="px-duration-list">
            {options.map((opt, i) => (
              <div
                key={i}
                className={`px-duration-row${selectedOpt === i ? ' px-duration-row--selected' : ''}`}
                onClick={() => setSelectedOpt(i)}
              >
                <span className="px-duration-radio">{selectedOpt === i ? '●' : '○'}</span>
                <span className="px-duration-label">{opt.name || opt.duration}</span>
                <span className="px-duration-price">₹{Number(opt.price).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right */}
        <div className="px-card-right">
          {includedFeatures.length > 0 && (
            <>
              <p className="px-features-heading">What's Included</p>
              <ul className="px-features">
                {includedFeatures.map((f, i) => (
                  <li key={i} className="px-feature"><span className="px-check">✓</span>{f.name}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="px-card-footer">
        <button className={`px-cta ${active ? 'px-cta--active' : ''}`} onClick={e => onSelect(plan, options[selectedOpt], e)}>
          {ctaLabel || (active ? 'Extend Plan' : 'Get Started')}
        </button>
      </div>
    </div>
  );
};

const MpCard = ({ portfolio, active, onSelect }) => {
  const [selectedOpt, setSelectedOpt] = useState(0);
  const sub = portfolio.subscription;
  const options = sub.planOptions || [];
  const includedFeatures = sub.features?.filter(f => f.included) || [];
  const mpFeatures = [
    `Curated basket of ${portfolio.stocks?.length || 0} stocks`,
    'Regular rebalancing with change notes',
    'Buy range, targets & stop loss for each stock',
    'Full rebalance history on your dashboard',
  ];
  const allFeatures = [...mpFeatures.map(f => ({ name: f })), ...includedFeatures];

  return (
    <div className={`px-card ${active ? 'px-card--active' : ''}`}>
      <div className="px-card-body">
        <div className="px-card-left">
          <p className="px-card-eyebrow">Subscription</p>
          <h3 className="px-card-name">{sub.name}</h3>
          {portfolio.description && <p className="px-card-desc">{portfolio.description}</p>}
          <div className="px-duration-list">
            {options.map((opt, i) => (
              <div
                key={i}
                className={`px-duration-row${selectedOpt === i ? ' px-duration-row--selected' : ''}`}
                onClick={() => setSelectedOpt(i)}
              >
                <span className="px-duration-radio">{selectedOpt === i ? '●' : '○'}</span>
                <span className="px-duration-label">{opt.name || opt.duration}</span>
                <span className="px-duration-price">₹{Number(opt.price).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-card-right">
          <p className="px-features-heading">What's Included</p>
          <ul className="px-features">
            {allFeatures.map((f, i) => (
              <li key={i} className="px-feature"><span className="px-check">✓</span>{f.name}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="px-card-footer">
        <button className={`px-cta ${active ? 'px-cta--active' : 'px-cta--mp'}`} onClick={e => onSelect(sub, options[selectedOpt], e)}>
          {active ? 'Extend Plan' : 'Subscribe'}
        </button>
      </div>
    </div>
  );
};

const Pricing = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const durationDialogRef = useRef(null);
  const paymentDialogRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const previouslyOpenRef = useRef(false);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlanOption, setSelectedPlanOption] = useState(null);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingInfo, setBillingInfo] = useState({ name: '', state: '' });
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [userReferralCode, setUserReferralCode] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);
  const [referralPlan, setReferralPlan] = useState(undefined); // undefined = loading, null = none

  const [pricingTab, setPricingTab] = useState('ra');
  const [modelPortfolios, setModelPortfolios] = useState([]);
  const [modelPortfoliosLoading, setModelPortfoliosLoading] = useState(false);
  const [expandedPortfolio, setExpandedPortfolio] = useState(null);

  const anyModalOpen = showDurationModal || showPaymentMethodModal || showQRModal || showBillingModal;

  const LEGACY_DURATION_MAP = {
    monthly: { months: 1, label: 'Monthly' },
    sixMonth: { months: 6, label: '6 Months' },
    yearly: { months: 12, label: 'Yearly' }
  };

  const focusableSelector = [
    'button:not([disabled])', '[href]:not([aria-hidden="true"])',
    'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const getFocusableElements = (container) => {
    if (!container) return [];
    return Array.from(container.querySelectorAll(focusableSelector)).filter(el =>
      el.getAttribute('aria-hidden') !== 'true' && !el.closest('[disabled]')
    );
  };

  const focusFirstElementInDialog = (el) => {
    if (!el) return;
    const focusable = getFocusableElements(el);
    (focusable[0] || el).focus();
  };

  const formatMonths = (m) => `${m} month${m === 1 ? '' : 's'}`;

  const getPlanOptions = (plan) => {
    if (Array.isArray(plan?.planOptions) && plan.planOptions.length > 0) {
      return plan.planOptions.map((o, i) => ({
        _id: o._id || `${plan._id}-opt-${i}`,
        name: o.name || `Plan ${i + 1}`,
        months: Math.min(12, Math.max(1, Number(o.months) || 1)),
        price: Number(o.price) || 0,
        description: o.description || ''
      }));
    }
    return Object.entries(LEGACY_DURATION_MAP).map(([key, opt]) => {
      const price = Number(plan?.pricing?.[key]);
      if (!Number.isFinite(price)) return null;
      return {
        _id: `${plan._id}-${key}`, legacyKey: key,
        name: opt.label, months: opt.months, price,
        description: key === 'monthly' ? 'Pay month-to-month' : key === 'sixMonth' ? '6 month plan' : 'Best value'
      };
    }).filter(Boolean);
  };

  const getCurrentPrice = (plan) => {
    const opts = getPlanOptions(plan);
    return opts[0]?.price || plan?.pricing?.monthly || 0;
  };

  const handleDialogKeyDown = (e, el, onEscape) => {
    if (e.key === 'Escape') { e.preventDefault(); onEscape(); return; }
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements(el);
    if (!focusable.length) { e.preventDefault(); el?.focus(); return; }
    if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === focusable[focusable.length - 1]) { e.preventDefault(); focusable[0].focus(); }
  };

  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Razorpay failed to load'));
    document.body.appendChild(s);
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true); setError('');
      const res = await subscriptionAPI.getAllSubscriptions();
      if (res.success && res.data) {
        setPlans(res.data.sort((a, b) => a.displayOrder !== b.displayOrder ? a.displayOrder - b.displayOrder : a.name.localeCompare(b.name)));
      } else setError('Failed to load plans');
    } catch { setError('Failed to load plans. Please try again.'); }
    finally { setLoading(false); }
  };

  const fetchModelPortfolios = async () => {
    try {
      setModelPortfoliosLoading(true);
      const res = await subscriptionAPI.getPublicModelPortfolios();
      if (res.success && res.data) setModelPortfolios(res.data);
    } catch {}
    finally { setModelPortfoliosLoading(false); }
  };

  const fetchActiveSubscriptions = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await userSubscriptionAPI.getActiveSubscription(currentUser.id);
      if (res.success && res.data) setActiveSubscriptions(Array.isArray(res.data) ? res.data : [res.data]);
    } catch { setActiveSubscriptions([]); }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchSubscriptions();
    fetchModelPortfolios();
    // Fetch referral plan publicly
    fetch(`${import.meta.env.VITE_API_URL}/referrals/plan`)
      .then(r => r.json())
      .then(d => setReferralPlan(d.data || null))
      .catch(() => setReferralPlan(null));
    if (currentUser) {
      fetchActiveSubscriptions();
      referralAPI.getMy().then(res => {
        if (res?.data?.usedCode) setUserReferralCode(res.data.usedCode);
        if (res?.data) setReferralInfo(res.data);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    if (anyModalOpen) {
      if (showDurationModal) requestAnimationFrame(() => focusFirstElementInDialog(durationDialogRef.current));
      else if (showPaymentMethodModal) requestAnimationFrame(() => focusFirstElementInDialog(paymentDialogRef.current));
    } else if (previouslyOpenRef.current) {
      requestAnimationFrame(() => lastTriggerRef.current?.focus());
    }
    previouslyOpenRef.current = anyModalOpen;
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen, showDurationModal, showPaymentMethodModal]);

  const handleSelectPlan = (plan, preSelectedOption, event) => {
    lastTriggerRef.current = event?.currentTarget || null;
    setSelectedPlan(plan);
    const allOptions = getPlanOptions(plan);
    // Match the pre-selected option by _id or index, fall back to first
    const matched = preSelectedOption
      ? allOptions.find(o => o._id === preSelectedOption._id || o.name === preSelectedOption.name) || allOptions[0]
      : allOptions[0];
    setSelectedPlanOption(matched || null);
    // Skip duration modal — user already picked on the card
    setShowDurationModal(false);
    setShowPaymentMethodModal(true);
  };

  const closeDurationModal = () => { setShowDurationModal(false); setSelectedPlan(null); setSelectedPlanOption(null); };
  const proceedToPayment = () => { setShowDurationModal(false); setShowPaymentMethodModal(true); };

  const handleQRPaymentSuccess = () => {
    const name = selectedPlan?.name;
    const dur = selectedPlanOption?.name;
    setShowQRModal(false); setSelectedPlan(null); setSelectedPlanOption(null);
    navigate('/dashboard', { replace: true, state: { paymentSubmitted: true, planName: name, planDuration: dur } });
  };

  const startRazorpayWithBilling = () => {
    setShowPaymentMethodModal(false);
    setShowBillingModal(true);
  };

  const createOrder = async () => {
    if (!selectedPlan || !selectedPlanOption) return;
    setShowBillingModal(false); setError(''); setLoading(true);
    try {
      await loadRazorpayScript();
      const price = Number(selectedPlanOption.price);
      if (!price) throw new Error('No price found.');
      if (!selectedPlan._id) throw new Error('Invalid plan.');
      const data = await subscriptionAPI.createOrder(price, selectedPlan.currency || 'INR', selectedPlan._id, selectedPlanOption._id, selectedPlanOption.name);
      const addBody = () => document.body.classList.add('razorpay-active');
      const removeBody = () => document.body.classList.remove('razorpay-active');
      const options = {
        key: data.key, amount: data.amount, currency: data.currency || 'INR',
        name: 'InvestKaps', description: selectedPlan.name, order_id: data.id,
        handler: (r) => verifyPayment(r, data),
        prefill: { name: data.customerName || '', email: data.customerEmail || '' },
        theme: { color: '#0b73ff' },
        modal: { ondismiss: () => { removeBody(); if (window.__rzpFixInterval) { clearInterval(window.__rzpFixInterval); window.__rzpFixInterval = null; } }, escape: true, backdropclose: true }
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { setError('Payment failed. Please try again.'); options.modal.ondismiss(); });
      addBody(); rzp.open();
      window.__rzpFixInterval = setInterval(() => {
        const iframe = document.querySelector('iframe[name="razorpay-checkout-frame"]');
        if (iframe && iframe.parentElement !== document.body) document.body.appendChild(iframe);
        const backdrop = document.querySelector('.razorpay-container');
        if (backdrop && backdrop.parentElement !== document.body) document.body.appendChild(backdrop);
        if (iframe && iframe.parentElement === document.body) { clearInterval(window.__rzpFixInterval); window.__rzpFixInterval = null; }
      }, 50);
      setTimeout(() => { if (window.__rzpFixInterval) { clearInterval(window.__rzpFixInterval); window.__rzpFixInterval = null; } }, 4000);
    } catch (e) { setError(e.message || 'Could not start payment.'); setLoading(false); }
  };

  const verifyPayment = async (paymentResponse) => {
    setLoading(true); setError('');
    try {
      await subscriptionAPI.verifyPayment({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        planId: selectedPlan._id, duration: selectedPlanOption?.name,
        durationMonths: selectedPlanOption?.months, planOptionId: selectedPlanOption?._id,
        billingName: billingInfo.name,
        billingState: billingInfo.state,
      });
      navigate('/dashboard', { replace: true, state: { justPurchased: true, paymentId: paymentResponse.razorpay_payment_id } });
    } catch (e) { setError(e.response?.data?.message || 'Payment verification failed'); }
    finally { document.body.classList.remove('razorpay-active'); setLoading(false); }
  };

  // Split plans: RA = not IA, not MP, not referral
  const raPlans = plans.filter(p => {
    const st = String(p.serviceType || '').toUpperCase();
    return st !== 'IA' && st !== 'MP' && !p.isReferralPlan;
  });

  const isActive = (plan) => activeSubscriptions.some(s => s.subscription?._id === plan._id || s.subscription?.name === plan.name);

  const TABS = [
    { key: 'ra', label: 'Research Analyst', icon: '📊' },
    { key: 'mp', label: 'Model Portfolios', icon: '🗂️' },
    { key: 'referral', label: 'Referral', icon: '🎁' },
    { key: 'book-meeting', label: 'Book a Meeting', icon: '📞' },
  ];

  return (
    <div className="px-pricing-root">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="px-header">
        <h1 className="px-header-title">Plans</h1>
        {activeSubscriptions.length > 0 && (
          <div className="px-active-pill">
            <span className="px-active-dot" />
            {activeSubscriptions.length} active {activeSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}
          </div>
        )}
      </div>

      {error && <div className="px-error">{error}</div>}

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="px-tabs-wrap">
        <div className="px-tabs" aria-hidden={anyModalOpen ? 'true' : undefined}>
          {TABS.map(t => (
            <button key={t.key} className={`px-tab ${pricingTab === t.key ? 'px-tab--active' : ''}`} onClick={() => setPricingTab(t.key)}>
              <span className="px-tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="px-content" aria-hidden={anyModalOpen ? 'true' : undefined}>

        {/* ══ RA Plans ══════════════════════════════════════════════════════════ */}
        {pricingTab === 'ra' && (
          <section className="px-section">
            {loading && raPlans.length === 0 ? (
              <div className="px-loading"><div className="px-spinner" /><p>Loading plans…</p></div>
            ) : raPlans.length === 0 ? (
              <div className="px-empty">No plans available right now.</div>
            ) : (
              <div className="px-cards">
                {raPlans.map((plan, idx) => (
                  <PlanCard
                    key={plan._id}
                    plan={plan}
                    idx={idx}
                    totalPlans={raPlans.length}
                    active={isActive(plan)}
                    onSelect={handleSelectPlan}
                    getCurrentPrice={getCurrentPrice}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ══ Model Portfolios ══════════════════════════════════════════════════ */}
        {pricingTab === 'mp' && (
          <section className="px-section">
            {modelPortfoliosLoading ? (
              <div className="px-loading"><div className="px-spinner" /><p>Loading…</p></div>
            ) : modelPortfolios.length === 0 ? (
              <div className="px-empty">No model portfolio plans available right now.</div>
            ) : (
              <div className="px-cards">
                {modelPortfolios.filter(p => p.subscription).map((portfolio) => (
                  <MpCard
                    key={portfolio._id}
                    portfolio={portfolio}
                    active={isActive(portfolio.subscription)}
                    onSelect={handleSelectPlan}
                    getCurrentPrice={getCurrentPrice}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ══ Referral ══════════════════════════════════════════════════════════ */}
        {pricingTab === 'referral' && (
          <section className="px-section">
            {referralPlan === undefined ? (
              <div className="px-loading"><div className="px-spinner" /><p>Loading…</p></div>
            ) : referralPlan === null ? (
              <div className="px-empty">
                This plan is being set up — check back soon. Every friend you refer will earn you a free month of access.
              </div>
            ) : (
              <>
                <div className="px-cards">
                  <PlanCard
                    plan={{
                      ...referralPlan,
                      planOptions: [{ name: 'Free — Referral Reward', price: 0, months: 1 }],
                    }}
                    idx={0}
                    totalPlans={1}
                    active={!!(referralInfo?.referralPlanSub && new Date(referralInfo.referralPlanSub.endDate) > new Date())}
                    onSelect={() => {}}
                    ctaLabel={
                      referralInfo?.unclaimedMonths > 0
                        ? `Claim ${referralInfo.unclaimedMonths} Month${referralInfo.unclaimedMonths > 1 ? 's' : ''} — Go to Dashboard`
                        : 'Earn by Referring Friends'
                    }
                  />
                </div>
                <div style={{ marginTop: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>How to earn this plan</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      'Find your referral code in your profile.',
                      'Share it with friends — when they purchase any plan using your code, you earn 1 free month.',
                      'Months accumulate — claim them from your dashboard whenever you want.',
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', fontSize: '0.875rem', color: '#475569' }}>
                        <span style={{ fontWeight: 700, color: '#1e3a5f', minWidth: 18 }}>{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  {referralInfo && (
                    <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Total referred: <strong style={{ color: '#1e293b' }}>{referralInfo.totalReferred || 0}</strong></span>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Months to claim: <strong style={{ color: '#1e293b' }}>{referralInfo.unclaimedMonths || 0}</strong></span>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {pricingTab === 'book-meeting' && (
          <section className="px-section">
            <BookACall />
          </section>
        )}
      </div>

      {/* ── Duration Modal ───────────────────────────────────────────────────── */}
      {showDurationModal && selectedPlan && selectedPlanOption && (
        <div className="duration-modal-overlay" role="presentation">
          <div className="duration-modal" role="dialog" aria-modal="true" aria-labelledby="dur-title" tabIndex={-1}
            ref={durationDialogRef} onKeyDown={e => handleDialogKeyDown(e, durationDialogRef.current, closeDurationModal)}>
            <div className="duration-modal-header">
              <div>
                <h2 id="dur-title">Select duration for {selectedPlan.name}</h2>
                <p className="modal-description">Choose the subscription length that suits you best.</p>
              </div>
              <button className="duration-close-btn" onClick={closeDurationModal} aria-label="Close"><FaClose /></button>
            </div>
            <div className="duration-options">
              {getPlanOptions(selectedPlan).map(opt => (
                <label key={opt._id} className={`duration-option ${selectedPlanOption?._id === opt._id ? 'active' : ''}`}>
                  <input type="radio" name="planOption" value={opt._id} checked={selectedPlanOption?._id === opt._id} onChange={() => setSelectedPlanOption(opt)} />
                  <div className="duration-content">
                    <div className="duration-label">{opt.name}</div>
                    <div className="duration-desc">{opt.description || formatMonths(opt.months)}</div>
                    <div className="duration-price">{selectedPlan.currency || '₹'}{opt.price.toLocaleString('en-IN')}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="duration-actions">
              <button className="modern-select-btn" onClick={proceedToPayment} disabled={loading}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Method Modal ─────────────────────────────────────────────── */}
      {showPaymentMethodModal && selectedPlan && (
        <div className="duration-modal-overlay" role="presentation">
          <div className="duration-modal payment-method-modal" role="dialog" aria-modal="true" aria-labelledby="pay-title" tabIndex={-1}
            ref={paymentDialogRef} onKeyDown={e => handleDialogKeyDown(e, paymentDialogRef.current, () => setShowPaymentMethodModal(false))}>
            <div className="duration-modal-header">
              <div>
                <h2 id="pay-title">Choose Payment Method</h2>
                <p className="modal-description">Select how you'd like to pay for {selectedPlan.name}.</p>
              </div>
              <button className="duration-close-btn" onClick={() => setShowPaymentMethodModal(false)} aria-label="Close"><FaClose /></button>
            </div>
            <div className="payment-method-options">
              <button type="button" className="payment-method-card" onClick={startRazorpayWithBilling}>
                <div className="payment-method-icon">💳</div>
                <span className="payment-method-title">Razorpay</span>
                <span className="payment-method-description">Card, UPI, Net Banking, Wallet</span>
                <span className="payment-method-btn">Continue with Razorpay</span>
              </button>
              <button type="button" className="payment-method-card" onClick={() => { setShowPaymentMethodModal(false); setShowQRModal(true); }}>
                <div className="payment-method-icon">📱</div>
                <span className="payment-method-title">QR Code</span>
                <span className="payment-method-description">Scan QR & upload transaction proof</span>
                <span className="payment-method-btn">Pay via QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Razorpay Billing Info Modal ──────────────────────────────────────── */}
      {showBillingModal && selectedPlan && (
        <div className="duration-modal-overlay" role="presentation">
          <div className="duration-modal" role="dialog" aria-modal="true" aria-labelledby="billing-title" tabIndex={-1}
            style={{ maxWidth: 440 }}>
            <div className="duration-modal-header">
              <div>
                <h2 id="billing-title">Billing Details</h2>
                <p className="modal-description">These details will appear on your invoice.</p>
              </div>
              <button className="duration-close-btn" onClick={() => { setShowBillingModal(false); setShowPaymentMethodModal(true); }} aria-label="Close"><FaClose /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createOrder(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="rzp-billing-name" style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Full Name (for invoice) *</label>
                <input
                  id="rzp-billing-name"
                  type="text"
                  value={billingInfo.name}
                  onChange={e => setBillingInfo(b => ({ ...b, name: e.target.value }))}
                  placeholder="Your legal full name"
                  required
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="rzp-billing-state" style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>State *</label>
                <input
                  id="rzp-billing-state"
                  type="text"
                  value={billingInfo.state}
                  onChange={e => setBillingInfo(b => ({ ...b, state: e.target.value }))}
                  placeholder="e.g. Delhi, Maharashtra, Karnataka"
                  required
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 4, width: '100%', padding: '12px', borderRadius: 8, fontSize: 15, fontWeight: 600 }}>
                Continue to Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── QR Payment Modal ─────────────────────────────────────────────────── */}
      {showQRModal && selectedPlan && selectedPlanOption && (
        <QRPaymentModal
          plan={selectedPlan} planOption={selectedPlanOption} price={selectedPlanOption?.price}
          onClose={() => { setShowQRModal(false); setSelectedPlan(null); setSelectedPlanOption(null); }}
          onSuccess={handleQRPaymentSuccess} currentUser={currentUser} alreadyUsedReferralCode={userReferralCode}
        />
      )}
    </div>
  );
};

export default Pricing;
