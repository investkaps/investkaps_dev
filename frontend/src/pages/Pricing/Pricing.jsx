import React, { useState, useEffect, useRef } from 'react';
import './Pricing.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import subscriptionAPI from '../../services/subscriptionAPI';
import userSubscriptionAPI from '../../services/userSubscriptionAPI';
import { referralAPI } from '../../services/api';
import { FaArrowRight, FaTimes as FaClose } from 'react-icons/fa';
import QRPaymentModal from '../../components/QRPaymentModal/QRPaymentModal';

const SHOW_LIMIT = 4;

const PlanCard = ({ plan, idx, totalPlans, active, onSelect, getCurrentPrice }) => {
  const [expanded, setExpanded] = useState(false);
  const featured = plan.packageCode === 'PRO' || idx === Math.floor(totalPlans / 2);
  const includedFeatures = plan.features?.filter(f => f.included) || [];
  const visibleFeatures = expanded ? includedFeatures : includedFeatures.slice(0, SHOW_LIMIT);
  return (
    <div className={`px-card ${featured ? 'px-card--featured' : ''} ${active ? 'px-card--active' : ''}`}>
      {active && <div className="px-card-ribbon px-card-ribbon--green">Active</div>}
      {!active && featured && <div className="px-card-ribbon px-card-ribbon--gold">Popular</div>}
      <h3 className="px-card-name">{plan.name}</h3>
      {plan.description && <p className="px-card-desc">{plan.description}</p>}
      <div className="px-card-price">
        <span className="px-price-currency">₹</span>
        <span className="px-price-amount">{getCurrentPrice(plan).toLocaleString('en-IN')}</span>
        <span className="px-price-per">/mo</span>
      </div>
      <p className="px-price-note">Starting price</p>
      {includedFeatures.length > 0 && (
        <div className="px-features-wrap">
          <ul className="px-features">
            {visibleFeatures.map((f, i) => (
              <li key={i} className="px-feature"><span className="px-check">✓</span>{f.name}</li>
            ))}
          </ul>
          {includedFeatures.length > SHOW_LIMIT && (
            <button className="px-toggle-features" onClick={() => setExpanded(e => !e)}>
              {expanded ? '▲ Show less' : `▼ +${includedFeatures.length - SHOW_LIMIT} more features`}
            </button>
          )}
        </div>
      )}
      <div className="px-card-actions">
        <button className={`px-cta ${active ? 'px-cta--active' : featured ? 'px-cta--featured' : ''}`} onClick={e => onSelect(plan, e)}>
          {active ? 'Extend Plan' : 'Get Started'} <FaArrowRight />
        </button>
        {active && <p className="px-active-note">Already active — extend for more time</p>}
      </div>
    </div>
  );
};

const MpCard = ({ portfolio, active, onSelect, getCurrentPrice }) => {
  const [expanded, setExpanded] = useState(false);
  const sub = portfolio.subscription;
  const minPrice = sub.planOptions?.length
    ? Math.min(...sub.planOptions.map(o => Number(o.price)))
    : getCurrentPrice(sub);
  const includedFeatures = sub.features?.filter(f => f.included) || [];
  const visibleFeatures = expanded ? includedFeatures : includedFeatures.slice(0, SHOW_LIMIT);
  return (
    <div className={`px-card ${active ? 'px-card--active' : ''}`}>
      {active && <div className="px-card-ribbon px-card-ribbon--green">Active</div>}
      <h3 className="px-card-name">{sub.name}</h3>
      {portfolio.description && <p className="px-card-desc">{portfolio.description}</p>}
      <div className="px-card-price">
        <span className="px-price-currency">₹</span>
        <span className="px-price-amount">{minPrice.toLocaleString('en-IN')}</span>
        <span className="px-price-per">/mo</span>
      </div>
      <p className="px-price-note">Starting price</p>
      <div className="px-features-wrap">
        <ul className="px-features">
          <li className="px-feature"><span className="px-check">✓</span>Curated basket of {portfolio.stocks?.length || 0} stocks</li>
          <li className="px-feature"><span className="px-check">✓</span>Regular rebalancing with change notes</li>
          <li className="px-feature"><span className="px-check">✓</span>Buy range, targets &amp; stop loss for each stock</li>
          <li className="px-feature"><span className="px-check">✓</span>Full rebalance history on your dashboard</li>
          {visibleFeatures.map((f, i) => (
            <li key={i} className="px-feature"><span className="px-check">✓</span>{f.name}</li>
          ))}
        </ul>
        {includedFeatures.length > SHOW_LIMIT && (
          <button className="px-toggle-features" onClick={() => setExpanded(e => !e)}>
            {expanded ? '▲ Show less' : `▼ +${includedFeatures.length - SHOW_LIMIT} more`}
          </button>
        )}
      </div>
      <div className="px-card-actions">
        <button className={`px-cta ${active ? 'px-cta--active' : 'px-cta--mp'}`} onClick={e => onSelect(sub, e)}>
          {active ? 'Extend Plan' : 'Subscribe'} <FaArrowRight />
        </button>
        {active && <p className="px-active-note">Already active — extend for more time</p>}
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
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [userReferralCode, setUserReferralCode] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);

  const [pricingTab, setPricingTab] = useState('ra');
  const [modelPortfolios, setModelPortfolios] = useState([]);
  const [modelPortfoliosLoading, setModelPortfoliosLoading] = useState(false);
  const [expandedPortfolio, setExpandedPortfolio] = useState(null);

  const anyModalOpen = showDurationModal || showPaymentMethodModal || showQRModal;

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

  const handleSelectPlan = (plan, event) => {
    lastTriggerRef.current = event?.currentTarget || null;
    setSelectedPlan(plan);
    setSelectedPlanOption(getPlanOptions(plan)[0] || null);
    setShowDurationModal(true);
  };

  const closeDurationModal = () => { setShowDurationModal(false); setSelectedPlan(null); setSelectedPlanOption(null); };
  const proceedToPayment = () => { setShowDurationModal(false); setShowPaymentMethodModal(true); };

  const handleQRPaymentSuccess = () => {
    const name = selectedPlan?.name;
    const dur = selectedPlanOption?.name;
    setShowQRModal(false); setSelectedPlan(null); setSelectedPlanOption(null);
    navigate('/dashboard', { replace: true, state: { paymentSubmitted: true, planName: name, planDuration: dur } });
  };

  const createOrder = async () => {
    if (!selectedPlan || !selectedPlanOption) return;
    setShowPaymentMethodModal(false); setError(''); setLoading(true);
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
        durationMonths: selectedPlanOption?.months, planOptionId: selectedPlanOption?._id
      });
      navigate('/dashboard', { replace: true, state: { justPurchased: true, paymentId: paymentResponse.razorpay_payment_id } });
    } catch (e) { setError(e.response?.data?.message || 'Payment verification failed'); }
    finally { document.body.classList.remove('razorpay-active'); setLoading(false); }
  };

  // Split plans: RA = not IA, hide IA entirely
  const raPlans = plans.filter(p => {
    const st = String(p.serviceType || '').toUpperCase();
    return st !== 'IA' && st !== 'MP';
  });

  const isActive = (plan) => activeSubscriptions.some(s => s.subscription?._id === plan._id || s.subscription?.name === plan.name);

  const TABS = [
    { key: 'ra', label: 'Research Analyst', icon: '📊' },
    { key: 'mp', label: 'Model Portfolios', icon: '🗂️' },
    { key: 'referral', label: 'Referral', icon: '🎁' },
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
            <div className="px-referral-wrap">
              <div className="px-referral-card">
                <div className="px-referral-icon">🎁</div>
                <h3>Referral Program</h3>
                <div className="px-referral-steps">
                  <div className="px-ref-step">
                    <div className="px-ref-num">1</div>
                    <div>
                      <strong>Get a code</strong>
                      <p>Ask a friend who uses InvestKaps for their referral code.</p>
                    </div>
                  </div>
                  <div className="px-ref-step">
                    <div className="px-ref-num">2</div>
                    <div>
                      <strong>Enter at checkout</strong>
                      <p>When you select any plan, enter the code at the payment step to unlock a discount.</p>
                    </div>
                  </div>
                  <div className="px-ref-step">
                    <div className="px-ref-num">3</div>
                    <div>
                      <strong>Both benefit</strong>
                      <p>You get a discount and your friend gets rewarded too.</p>
                    </div>
                  </div>
                </div>
                {userReferralCode && (
                  <div className="px-ref-used">
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                    You used referral code <strong>{userReferralCode}</strong>
                  </div>
                )}
                <p className="px-ref-cta-label">Pick a plan and enter your referral code at checkout.</p>
                <button className="px-cta px-cta--mp" style={{ display: 'inline-flex', width: 'auto', padding: '.75rem 2rem' }} onClick={() => setPricingTab('ra')}>
                  Browse Plans <FaArrowRight />
                </button>
              </div>
            </div>
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
              <button type="button" className="payment-method-card" onClick={createOrder}>
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
