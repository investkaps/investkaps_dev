import React, { useState, useEffect } from 'react';
import { callAPI } from '../../services/api';
import { useUser } from '@clerk/clerk-react';
import './BookACall.css';

const QR_CODE_URL = '/qrcode.png';

function StepIndicator({ step, labels }) {
  const steps = labels || ['Select Plan', 'Choose Slot', 'Pay & Confirm'];
  return (
    <div className="bac-steps">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className={`bac-step ${step > i ? 'bac-step--done' : ''} ${step === i ? 'bac-step--active' : ''}`}>
            <div className="bac-step__circle">{step > i ? '✓' : i + 1}</div>
            <div className="bac-step__label">{label}</div>
          </div>
          {i < steps.length - 1 && <div className={`bac-step__line ${step > i ? 'bac-step__line--done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }) {
  return (
    <div className={`bac-plan-card ${selected ? 'bac-plan-card--selected' : ''}`} onClick={() => onSelect(plan)}>
      <div className="bac-plan-card__header">
        <h3 className="bac-plan-card__name">{plan.name}</h3>
        <div className="bac-plan-card__price">₹{plan.price}</div>
      </div>
      <div className="bac-plan-card__duration">{plan.durationMinutes} minute consultation</div>
      <p className="bac-plan-card__desc">{plan.description}</p>
      {plan.features?.length > 0 && (
        <ul className="bac-plan-card__features">
          {plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}
        </ul>
      )}
      <button className={`bac-plan-card__btn ${selected ? 'bac-plan-card__btn--selected' : ''}`}>
        {selected ? 'Selected ✓' : 'Select'}
      </button>
    </div>
  );
}

function SlotPicker({ selectedPlan, onBack, onSlotSelect }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [dayId, setDayId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    setLoading(true);
    setSelectedSlot(null);
    callAPI.getSlots(date)
      .then(r => { setSlots(r.data || []); setDayId(r.dayId || null); })
      .catch(() => { setSlots([]); setDayId(null); })
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="bac-slot-picker">
      <div className="bac-slot-picker__summary">
        <strong>{selectedPlan.name}</strong> — {selectedPlan.durationMinutes} min — ₹{selectedPlan.price}
      </div>
      <div className="bac-slot-picker__date-row">
        <label>Select Date:</label>
        <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
          className="bac-slot-picker__date-input" />
      </div>
      {loading ? <p className="bac-hint">Loading available slots…</p> : (
        slots.length === 0
          ? <p className="bac-hint">No slots available for this date. Try another date.</p>
          : (
            <div className="bac-slot-grid">
              {slots.map(s => (
                <button key={s._id}
                  className={`bac-slot ${selectedSlot?._id === s._id ? 'bac-slot--selected' : ''}`}
                  onClick={() => setSelectedSlot(s)}>
                  {s.startTime} – {s.endTime}
                </button>
              ))}
            </div>
          )
      )}
      <div className="bac-nav-row">
        <button className="bac-btn bac-btn--secondary" onClick={onBack}>← Back</button>
        <button className="bac-btn bac-btn--primary" disabled={!selectedSlot}
          onClick={() => onSlotSelect(selectedSlot, date, dayId)}>
          Continue →
        </button>
      </div>
    </div>
  );
}

function PaymentStep({ selectedPlan, selectedSlot, selectedDate, selectedDayId, onBack, onDone }) {
  const { user: clerkUser } = useUser();
  const [form, setForm] = useState({ senderName: clerkUser?.fullName || '', transactionId: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.senderName || !form.transactionId || !file) {
      setError('Please fill all fields and upload your payment screenshot.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('planId', selectedPlan._id);
      fd.append('dayId', selectedDayId);
      fd.append('slotId', selectedSlot._id);
      fd.append('senderName', form.senderName);
      fd.append('transactionId', form.transactionId);
      fd.append('amount', selectedPlan.price);
      fd.append('screenshot', file);
      await callAPI.book(fd);
      onDone();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bac-payment">
      <div className="bac-payment__summary-box">
        <h4>Booking Summary</h4>
        <div className="bac-payment__summary-row"><span>Plan</span><span>{selectedPlan.name}</span></div>
        <div className="bac-payment__summary-row"><span>Duration</span><span>{selectedPlan.durationMinutes} minutes</span></div>
        <div className="bac-payment__summary-row"><span>Date</span><span>{selectedDate}</span></div>
        <div className="bac-payment__summary-row"><span>Time (IST)</span><span>{selectedSlot.startTime} – {selectedSlot.endTime}</span></div>
        <div className="bac-payment__summary-row bac-payment__summary-row--total"><span>Amount</span><span>₹{selectedPlan.price}</span></div>
      </div>

      <div className="bac-payment__qr-section">
        <p className="bac-payment__qr-label">Scan & Pay via UPI</p>
        <img src={QR_CODE_URL} alt="UPI QR Code" className="bac-payment__qr-img"
          onError={e => { e.target.style.display = 'none'; }} />
        <p className="bac-payment__qr-note">Pay <strong>₹{selectedPlan.price}</strong> to <strong>investkaps@upi</strong> and upload screenshot below.</p>
      </div>

      <div className="bac-payment__form">
        <div className="bac-field">
          <label>Your Name</label>
          <input type="text" value={form.senderName} onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))}
            placeholder="Name as per payment" />
        </div>
        <div className="bac-field">
          <label>Transaction / UTR ID</label>
          <input type="text" value={form.transactionId} onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))}
            placeholder="12-digit UTR or transaction ID" />
        </div>
        <div className="bac-field">
          <label>Payment Screenshot</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
        </div>
      </div>

      {error && <p className="bac-error">{error}</p>}

      <div className="bac-nav-row">
        <button className="bac-btn bac-btn--secondary" onClick={onBack} disabled={submitting}>← Back</button>
        <button className="bac-btn bac-btn--primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Booking'}
        </button>
      </div>
    </div>
  );
}

function SuccessScreen({ onReset, isFree }) {
  return (
    <div className="bac-success">
      <div className="bac-success__icon">{isFree ? '🎁' : '✅'}</div>
      <h3>{isFree ? 'Free Call Claimed!' : 'Booking Submitted!'}</h3>
      <p>
        {isFree
          ? 'Your free consultation request has been submitted. Our team will review and send you a Google Meet link on your email after approval.'
          : 'Your payment is under review. Once approved, you\'ll receive a Google Meet link and calendar invite on your email.'
        }
      </p>
      <button className="bac-btn bac-btn--primary" onClick={onReset}>Book Another Call</button>
    </div>
  );
}

/* ── Free Call confirmation step ── */
function FreeCallConfirmStep({ selectedPlan, selectedSlot, selectedDate, selectedDayId, onBack, onDone }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await callAPI.claimFreeCall({ planId: selectedPlan._id, dayId: selectedDayId, slotId: selectedSlot._id });
      onDone();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to claim free call. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bac-payment">
      <div className="bac-free-banner">
        <span className="bac-free-banner__icon">🎁</span>
        <div>
          <div className="bac-free-banner__title">Your First Call is FREE!</div>
          <div className="bac-free-banner__sub">No payment needed. Our team will review and confirm your slot.</div>
        </div>
      </div>

      <div className="bac-payment__summary-box">
        <h4>Booking Summary</h4>
        <div className="bac-payment__summary-row"><span>Plan</span><span>{selectedPlan.name}</span></div>
        <div className="bac-payment__summary-row"><span>Duration</span><span>{selectedPlan.durationMinutes} minutes</span></div>
        <div className="bac-payment__summary-row"><span>Date</span><span>{selectedDate}</span></div>
        <div className="bac-payment__summary-row"><span>Time (IST)</span><span>{selectedSlot.startTime} – {selectedSlot.endTime}</span></div>
        <div className="bac-payment__summary-row bac-payment__summary-row--total" style={{ color: '#16a34a' }}>
          <span>Amount</span><span>FREE</span>
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
        Once you submit, our team will review your request and send you a Google Meet link on your email after approval. This offer can only be claimed once per account.
      </p>

      {error && <p className="bac-error">{error}</p>}

      <div className="bac-nav-row">
        <button className="bac-btn bac-btn--secondary" onClick={onBack} disabled={submitting}>← Back</button>
        <button className="bac-btn bac-btn--primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Claim Free Call'}
        </button>
      </div>
    </div>
  );
}

export default function BookACall() {
  const [plans, setPlans] = useState([]);
  const [freeEligible, setFreeEligible] = useState(null); // null = loading
  const [pendingBooking, setPendingBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([
      callAPI.getPlans().then(r => r.data || []),
      callAPI.getFreeCallStatus().catch(() => ({ eligible: false, pendingBooking: null })),
    ]).then(([p, status]) => {
      setPlans(p);
      setFreeEligible(status.eligible ?? false);
      setPendingBooking(status.pendingBooking || null);
    }).finally(() => setLoading(false));
  }, []);

  const startFree = () => { setIsFreeMode(true); setStep(1); };
  const startPaid = () => { setIsFreeMode(false); setStep(0); };
  const reset = () => { setStep(0); setSelectedPlan(null); setSelectedSlot(null); setDone(false); setIsFreeMode(false); };

  if (loading) return <div className="bac-loading">Loading call plans…</div>;
  if (done) return <SuccessScreen onReset={reset} isFree={isFreeMode} />;

  if (pendingBooking) {
    const isConfirmed = pendingBooking.status === 'confirmed';
    return (
      <div className="bac-container">
        <div className="bac-header">
          <h2 className="bac-title">Book a Consultation Call</h2>
        </div>
        {isConfirmed ? (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '1.5rem 1.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#15803d', fontSize: '1.1rem', fontWeight: 700 }}>Your call is confirmed!</h3>
            <p style={{ color: '#166534', fontSize: '0.9rem', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
              Scheduled for <strong>{pendingBooking.slotDate}</strong> at <strong>{pendingBooking.slotStartTime}–{pendingBooking.slotEndTime} IST</strong>.
            </p>
            {pendingBooking.meetLink ? (
              <a
                href={pendingBooking.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: '0.25rem', background: '#16a34a', color: '#fff', padding: '0.55rem 1.25rem', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}
              >
                Join Google Meet →
              </a>
            ) : (
              <p style={{ color: '#15803d', fontSize: '0.85rem', margin: 0 }}>
                A Google Meet link will be emailed to you shortly.
              </p>
            )}
          </div>
        ) : (
          <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 14, padding: '1.5rem 1.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#92400e', fontSize: '1.1rem', fontWeight: 700 }}>Booking under review</h3>
            <p style={{ color: '#78350f', fontSize: '0.9rem', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
              Your booking for <strong>{pendingBooking.slotDate}</strong> at <strong>{pendingBooking.slotStartTime}–{pendingBooking.slotEndTime}</strong> is being reviewed.
            </p>
            <p style={{ color: '#92400e', fontSize: '0.85rem', margin: 0 }}>
              Once approved you'll receive a confirmation email with the Google Meet link.
            </p>
          </div>
        )}
      </div>
    );
  }

  const stepLabels = isFreeMode
    ? ['Choose Slot', 'Confirm']
    : freeEligible
    ? []
    : ['Select Plan', 'Choose Slot', 'Pay & Confirm'];

  return (
    <div className="bac-container">
      <div className="bac-header">
        <h2 className="bac-title">Book a Consultation Call</h2>
        <p className="bac-subtitle">Schedule a one-on-one session with our SEBI-registered research analysts.</p>
      </div>

      {/* ── FREE ELIGIBLE: only show claim banner, no plans ── */}
      {freeEligible && !isFreeMode && step === 0 && (
        <div className="bac-free-callout">
          <div className="bac-free-callout__left">
            <span className="bac-free-callout__gift">🎁</span>
            <div>
              <div className="bac-free-callout__title">You have a FREE consultation call!</div>
              <div className="bac-free-callout__desc">Every new member gets one free call with our analysts. No payment required.</div>
            </div>
          </div>
          <button className="bac-free-callout__btn" onClick={startFree}>
            Claim Free Call →
          </button>
        </div>
      )}

      <StepIndicator step={isFreeMode ? step - 1 : step} labels={stepLabels} />

      {/* ── PAID flow: only shown once free call has been claimed ── */}
      {!freeEligible && !isFreeMode && step === 0 && (
        <>
          {plans.length === 0
            ? <p className="bac-hint" style={{ textAlign: 'center' }}>No call plans available right now. Check back soon!</p>
            : (
              <div className="bac-plans-grid">
                {plans.map(p => (
                  <PlanCard key={p._id} plan={p} selected={selectedPlan?._id === p._id} onSelect={setSelectedPlan} />
                ))}
              </div>
            )
          }
          {selectedPlan && (
            <div className="bac-nav-row" style={{ justifyContent: 'center' }}>
              <button className="bac-btn bac-btn--primary" onClick={() => setStep(1)}>Continue →</button>
            </div>
          )}
        </>
      )}

      {/* ── Slot picker (shared by both flows) ── */}
      {((isFreeMode && step === 1) || (!isFreeMode && step === 1)) && (
        <SlotPicker
          selectedPlan={isFreeMode ? (plans[0] || { name: 'Consultation Call', durationMinutes: 30, price: 0 }) : selectedPlan}
          onBack={() => isFreeMode ? (setIsFreeMode(false), setStep(0)) : setStep(0)}
          onSlotSelect={(slot, date, dayId) => {
            setSelectedSlot(slot);
            setSelectedDate(date);
            setSelectedDayId(dayId);
            if (isFreeMode) setSelectedPlan(plans[0] || { name: 'Free Consultation', durationMinutes: 30, price: 0, _id: null });
            setStep(2);
          }}
        />
      )}

      {/* ── Free call confirm ── */}
      {isFreeMode && step === 2 && (
        <FreeCallConfirmStep
          selectedPlan={selectedPlan}
          selectedSlot={selectedSlot}
          selectedDate={selectedDate}
          selectedDayId={selectedDayId}
          onBack={() => setStep(1)}
          onDone={() => setDone(true)}
        />
      )}

      {/* ── Paid payment step ── */}
      {!isFreeMode && step === 2 && (
        <PaymentStep
          selectedPlan={selectedPlan}
          selectedSlot={selectedSlot}
          selectedDate={selectedDate}
          selectedDayId={selectedDayId}
          onBack={() => setStep(1)}
          onDone={() => setDone(true)}
        />
      )}
    </div>
  );
}
