import React, { useState, useEffect, useRef } from 'react';
import './Pricing.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import subscriptionAPI from '../../services/subscriptionAPI';
import userSubscriptionAPI from '../../services/userSubscriptionAPI';
import { FaArrowRight, FaTimes as FaClose } from 'react-icons/fa';
import QRPaymentModal from '../../components/QRPaymentModal/QRPaymentModal';

const Pricing = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('monthly');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);

  // ---- Duration options shown in the modal
  const durationOptions = [
    { key: 'monthly', label: 'Monthly', description: 'Pay month-to-month' },
    { key: 'sixMonth', label: '6 Months', description: 'Save up to 10%' },
    { key: 'yearly', label: 'Yearly', description: 'Best value, save up to 20%' }
  ];

  // ---- Load Razorpay script if needed
  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Razorpay script failed to load'));
      document.body.appendChild(script);
    });

  // ---- Fetch plans
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await subscriptionAPI.getAllSubscriptions();
      if (response.success && response.data) {
        const sorted = response.data.sort((a, b) => {
          if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
          return a.name.localeCompare(b.name);
        });
        setPlans(sorted);
      } else {
        setError('Failed to load subscription plans');
      }
    } catch (e) {
      console.error('Error fetching subscriptions:', e);
      setError('Failed to load subscription plans. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Fetch active subscriptions (if any)
  const fetchActiveSubscriptions = async () => {
    if (!currentUser?.id) return;
    try {
      const resp = await userSubscriptionAPI.getActiveSubscription(currentUser.id);
      if (resp.success && resp.data) {
        // Backend now returns an array
        setActiveSubscriptions(Array.isArray(resp.data) ? resp.data : [resp.data]);
      }
    } catch (e) {
      // no active subs, ignore
      setActiveSubscriptions([]);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    setShowDurationModal(false);
    setSelectedPlan(null);
    fetchSubscriptions();
    if (currentUser) {
      fetchActiveSubscriptions();
    }
  }, []);

  // ---- Helpers
  const getCurrentPrice = (plan, duration = 'monthly') =>
    plan?.pricing?.[duration] || 0;

  const handleSelectPlan = (plan) => {
    // Allow multiple subscriptions - users can purchase any plan
    setSelectedPlan(plan);
    setSelectedDuration('monthly');
    setShowDurationModal(true);
  };

  const closeDurationModal = () => {
    setShowDurationModal(false);
    setSelectedPlan(null);
  };

  // ---- Show payment method selection
  const proceedToPayment = () => {
    setShowDurationModal(false);
    setShowPaymentMethodModal(true);
  };

  // ---- Create order & open Razorpay
  const createOrder = async () => {
    if (!selectedPlan) return;

    setShowPaymentMethodModal(false);
    setError('');
    setLoading(true);

    try {
      await loadRazorpayScript();

      const price = Number(getCurrentPrice(selectedPlan, selectedDuration));
      if (!price) throw new Error(`No price found for ${selectedDuration} duration.`);

      if (!selectedPlan._id) throw new Error('Invalid subscription plan selected.');

      const data = await subscriptionAPI.createOrder(
        price,
        selectedPlan.currency || 'INR',
        selectedPlan._id,
        selectedDuration
      );

      // ---- RAZORPAY FIX #1: add/remove a class on <body> to keep layout clean
      const addBodyClass = () => document.body.classList.add('razorpay-active');
      const removeBodyClass = () => document.body.classList.remove('razorpay-active');

      const options = {
        key: data.key,
        amount: data.amount, // paise
        currency: data.currency || 'INR',
        name: 'InvestKaps',
        description: selectedPlan.description || selectedPlan.name,
        order_id: data.id,
        handler: (response) => verifyPayment(response, data),
        prefill: {
          name: data.customerName || '',
          email: data.customerEmail || ''
        },
        theme: { color: '#0b73ff' },
        modal: {
          ondismiss: () => {
            removeBodyClass();
            // also clear any intervals we might set below
            if (window.__rzpFixInterval) {
              clearInterval(window.__rzpFixInterval);
              window.__rzpFixInterval = null;
            }
          },
          escape: true,
          backdropclose: true
        }
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', () => {
        setError('Payment failed or was cancelled. Please try again.');
        // cleanup
        if (options?.modal?.ondismiss) options.modal.ondismiss();
      });

      addBodyClass();
      rzp.open();

      // ---- RAZORPAY FIX #2: ensure the iframe/backdrop sit directly under <body>
      // and aren’t constrained by your React containers (prevents white margins).
      const reparentOnce = () => {
        const iframe = document.querySelector('iframe[name="razorpay-checkout-frame"]');
        if (iframe && iframe.parentElement !== document.body) {
          document.body.appendChild(iframe);
        }
        // Razorpay also injects a container/backdrop; move those too if needed
        const backdrop = document.querySelector('.razorpay-container');
        if (backdrop && backdrop.parentElement !== document.body) {
          document.body.appendChild(backdrop);
        }
      };

      // Poll briefly after open to catch when Razorpay inserts its nodes
      window.__rzpFixInterval = setInterval(() => {
        reparentOnce();
        // once iframe exists and is correctly reparented, stop polling
        const ok = document.querySelector('iframe[name="razorpay-checkout-frame"]');
        if (ok && ok.parentElement === document.body) {
          clearInterval(window.__rzpFixInterval);
          window.__rzpFixInterval = null;
        }
      }, 50);
      // safety stop after a few seconds
      setTimeout(() => {
        if (window.__rzpFixInterval) {
          clearInterval(window.__rzpFixInterval);
          window.__rzpFixInterval = null;
        }
      }, 4000);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Could not start payment. Please try again later.');
      setLoading(false);
    }
  };

  // ---- Verify payment on server and route to success page
  const verifyPayment = async (paymentResponse) => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        planId: selectedPlan._id,
        duration: selectedDuration
      };
      await subscriptionAPI.verifyPayment(payload);
      navigate(
        `/payment-success?payment_id=${paymentResponse.razorpay_payment_id}&order_id=${paymentResponse.razorpay_order_id}`
      );
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Payment verification failed');
    } finally {
      // cleanup body class in case modal stayed around
      document.body.classList.remove('razorpay-active');
      setLoading(false);
    }
  };

  return (
    <div className="pricing-container page-container">
      <h1 className="page-title">Choose Your Investment Plan</h1>
      <p className="page-subtitle">Select the plan that works best for your trading needs</p>

      {/* Active Subscriptions Banner */}
      {activeSubscriptions.length > 0 && (
        <div className="active-subscription-banner">
          <div className="banner-content">
            <div className="banner-icon">✓</div>
            <div className="banner-text">
              <h3>
                You have <strong>{activeSubscriptions.length}</strong> active {activeSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}
              </h3>
              <p>
                You can purchase additional plans to access more features and strategies.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {loading && plans.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading subscription plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="no-plans">
          <p>No subscription plans are currently available. Please check back later.</p>
        </div>
      ) : (
        <div className="modern-plans-grid">
          {plans.map((plan) => {
            // Check if user has this plan in their active subscriptions
            const isCurrentPlan = activeSubscriptions.some(
              sub => sub.subscription?._id === plan._id || sub.subscription?.name === plan.name
            );
            return (
              <div
                key={plan._id}
                className={`modern-plan-card ${plan.packageCode === 'PRO' ? 'featured' : ''} ${
                  isCurrentPlan ? 'current-plan' : ''
                }`}
              >
                {isCurrentPlan ? (
                  <div className="current-plan-badge">Active</div>
                ) : plan.packageCode === 'PRO' ? (
                  <div className="featured-badge">Most Popular</div>
                ) : null}

                <div className="modern-plan-header">
                  <h3>{plan.name}</h3>
                </div>

                <div className="modern-plan-pricing">
                  <p className="modern-price">
                    <span className="currency">{plan.currency || '₹'}</span>
                    {getCurrentPrice(plan)}
                    <span className="price-duration">/month</span>
                  </p>
                  <p className="price-note">Starting price</p>
                </div>

                {plan.description && <p className="modern-plan-description">{plan.description}</p>}

                {/* Features */}
                {Array.isArray(plan.features) && plan.features.filter(f => f.included).length > 0 && (
                  <div className="modern-features-section">
                    <ul className="modern-plan-features">
                      {plan.features
                        .filter(f => f.included)
                        .map((feature, idx) => (
                          <li
                            key={idx}
                            className="modern-feature-item"
                          >
                            <span className="feature-icon">✓</span>
                            <span className="feature-text">{feature.name}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <div className="modern-plan-actions">
                  <button
                    className={`modern-select-btn ${isCurrentPlan ? 'active-plan-btn' : ''}`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isCurrentPlan ? 'Active - Add More Time' : 'Select Plan'}
                    {!isCurrentPlan && <FaArrowRight className="arrow-icon" />}
                  </button>
                  {isCurrentPlan && (
                    <p className="plan-active-note">You already have this plan active.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Duration Modal */}
      {showDurationModal && selectedPlan && (
        <div className="duration-modal-overlay" role="dialog" aria-modal="true">
          <div className="duration-modal">
            <div className="duration-modal-header">
              <h3>Select Duration for {selectedPlan.name}</h3>
              <button className="duration-close-btn" onClick={closeDurationModal} aria-label="Close">
                <FaClose />
              </button>
            </div>

            <div className="duration-options">
              {durationOptions.map((opt) => {
                const price = getCurrentPrice(selectedPlan, opt.key);
                const monthlyPrice = getCurrentPrice(selectedPlan, 'monthly');
                let savings = '';
                
                if (opt.key === 'sixMonth' && monthlyPrice) {
                  const discount = Math.round((1 - (price / 6) / monthlyPrice) * 100);
                  if (discount > 0) savings = `SAVE ${discount}%`;
                } else if (opt.key === 'yearly' && monthlyPrice) {
                  const discount = Math.round((1 - (price / 12) / monthlyPrice) * 100);
                  if (discount > 0) savings = `SAVE ${discount}%`;
                }
                
                return (
                  <label 
                    key={opt.key} 
                    className={`duration-option ${selectedDuration === opt.key ? 'active' : ''}`}
                    data-savings={savings}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={opt.key}
                      checked={selectedDuration === opt.key}
                      onChange={() => setSelectedDuration(opt.key)}
                    />
                    <div className="duration-content">
                      <div className="duration-label">{opt.label}</div>
                      <div className="duration-desc">{opt.description}</div>
                      <div className="duration-price">
                        {selectedPlan.currency || '₹'}
                        {price}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="duration-actions">
              <button className="modern-select-btn" onClick={proceedToPayment} disabled={loading}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selection Modal */}
      {showPaymentMethodModal && selectedPlan && (
        <div className="duration-modal-overlay" role="dialog" aria-modal="true">
          <div className="duration-modal">
            <div className="duration-modal-header">
              <h3>Choose Payment Method</h3>
              <button className="duration-close-btn" onClick={() => setShowPaymentMethodModal(false)} aria-label="Close">
                <FaClose />
              </button>
            </div>

            <div className="payment-method-options">
              <div className="payment-method-card" onClick={createOrder}>
                <div className="payment-method-icon">💳</div>
                <h4>Razorpay</h4>
                <p>Pay with Card, UPI, Net Banking, Wallet</p>
                <button className="payment-method-btn">Continue with Razorpay</button>
              </div>

              <div className="payment-method-card" onClick={() => {
                setShowPaymentMethodModal(false);
                setShowQRModal(true);
              }}>
                <div className="payment-method-icon">📱</div>
                <h4>QR Code Payment</h4>
                <p>Scan QR & upload transaction proof</p>
                <button className="payment-method-btn">Pay via QR Code</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment Modal */}
      {showQRModal && selectedPlan && (
        <QRPaymentModal
          plan={selectedPlan}
          duration={selectedDuration}
          price={getCurrentPrice(selectedPlan, selectedDuration)}
          onClose={() => {
            setShowQRModal(false);
            setSelectedPlan(null);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default Pricing;
