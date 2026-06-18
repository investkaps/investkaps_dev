import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../services/api';

const card = {
  background: '#fff',
  borderRadius: '12px',
  border: '1px solid #e9ecef',
  padding: '1.5rem',
  marginBottom: '1.25rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#475569',
  marginBottom: '0.35rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
};

const btn = (color, disabled) => ({
  padding: '0.65rem 1.4rem',
  borderRadius: '8px',
  border: 'none',
  background: disabled ? '#94a3b8' : color,
  color: '#fff',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.875rem',
  whiteSpace: 'nowrap',
});

const StatusMsg = ({ ok, msg }) =>
  msg ? (
    <div style={{
      marginTop: '0.75rem',
      padding: '0.65rem 1rem',
      borderRadius: '8px',
      background: ok ? '#d4edda' : '#f8d7da',
      color: ok ? '#155724' : '#721c24',
      fontSize: '0.85rem',
      fontWeight: 600,
    }}>
      {ok ? '✓' : '⚠'} {msg}
    </div>
  ) : null;

// ─── Collapsible existing-records panel ───────────────────────────────────────
const ExistingRecords = ({ title, children, count }) => {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <div style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.65rem 1rem', background: '#f8fafc', border: 'none', cursor: 'pointer',
          fontSize: '0.82rem', fontWeight: 700, color: '#334155',
        }}
      >
        <span>{title} <span style={{ background: '#e2e8f0', borderRadius: '10px', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>{count}</span></span>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{open ? '▲ hide' : '▼ show'}</span>
      </button>
      {open && <div style={{ padding: '0.75rem 1rem', background: '#fff' }}>{children}</div>}
    </div>
  );
};

const Row = ({ label, value }) => value ? (
  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
    <span style={{ color: '#94a3b8', minWidth: '110px', flexShrink: 0 }}>{label}</span>
    <span style={{ color: '#1e293b', wordBreak: 'break-all' }}>{value}</span>
  </div>
) : null;

// ─── KYC Override ─────────────────────────────────────────────────────────────
const KycOverride = ({ userId, kycVerifications }) => {
  const [mode, setMode] = useState('upload');
  const [file, setFile] = useState(null);
  const [pan, setPan] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleUpload = async () => {
    if (!file) return setResult({ ok: false, msg: 'Please select a file' });
    setLoading(true); setResult(null);
    try {
      const res = await adminAPI.overrideKycUpload(userId, file);
      setResult({ ok: res.success, msg: res.message || 'Done' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setLoading(false); }
  };

  const handlePan = async () => {
    if (!pan || !dob) return setResult({ ok: false, msg: 'PAN and DOB are required' });
    setLoading(true); setResult(null);
    try {
      const res = await adminAPI.overrideKycPan(userId, { pan, dob });
      setResult({ ok: res.success, msg: res.message || (res.isVerified ? 'KYC verified' : 'Not verified by CAMS') });
      if (res.success) { setPan(''); setDob(''); }
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={card}>
      <h4 style={{ margin: '0 0 0.75rem', color: '#1e293b', fontSize: '1rem' }}>PAN KYC Override</h4>

      <ExistingRecords title="Existing KYC records" count={kycVerifications.length}>
        {kycVerifications.map((k, i) => (
          <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < kycVerifications.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <Row label="PAN" value={k.pan} />
            <Row label="Status" value={k.kycStatus} />
            <Row label="CAMS Code" value={k.camsStatusCode} />
            <Row label="Full Name" value={k.fullName} />
            <Row label="Date" value={k.createdAt ? new Date(k.createdAt).toLocaleString() : null} />
            {k.camsDownloadData?.adminUploadUrl && (
              <a href={k.camsDownloadData.adminUploadUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: '#1a6fa8', textDecoration: 'underline' }}>
                View uploaded document
              </a>
            )}
          </div>
        ))}
      </ExistingRecords>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        {['upload', 'pan'].map(m => (
          <button key={m} onClick={() => { setMode(m); setResult(null); }} style={{
            padding: '0.45rem 1rem', borderRadius: '6px',
            border: `2px solid ${mode === m ? '#155d8e' : '#d1d5db'}`,
            background: mode === m ? '#eef4fb' : '#fff',
            color: mode === m ? '#155d8e' : '#475569',
            fontWeight: mode === m ? 700 : 400, cursor: 'pointer', fontSize: '0.85rem',
          }}>
            {m === 'upload' ? 'Upload Document' : 'PAN + DOB (API)'}
          </button>
        ))}
      </div>

      {mode === 'upload' ? (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={labelStyle}>KYC Document (image or PDF)</label>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={inputStyle}
              onChange={e => setFile(e.target.files[0] || null)} />
          </div>
          <button onClick={handleUpload} disabled={loading || !file} style={btn('linear-gradient(135deg,#155d8e,#1a6fa8)', loading || !file)}>
            {loading ? 'Uploading…' : 'Mark KYC Done'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>PAN Number</label>
            <input style={inputStyle} value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
          </div>
          <div>
            <label style={labelStyle}>Date of Birth (DD-MM-YYYY)</label>
            <input style={inputStyle} value={dob} onChange={e => setDob(e.target.value)} placeholder="01-01-1990" />
          </div>
          <button onClick={handlePan} disabled={loading} style={btn('linear-gradient(135deg,#155d8e,#1a6fa8)', loading)}>
            {loading ? 'Verifying…' : 'Verify via CAMS'}
          </button>
        </div>
      )}

      <StatusMsg ok={result?.ok} msg={result?.msg} />
    </div>
  );
};

// ─── Phone Override ────────────────────────────────────────────────────────────
const PhoneOverride = ({ userId, currentPhone, phoneVerified }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handle = async () => {
    if (!phone) return setResult({ ok: false, msg: 'Phone number is required' });
    setLoading(true); setResult(null);
    try {
      const res = await adminAPI.overridePhone(userId, phone);
      setResult({ ok: res.success, msg: res.message || 'Done' });
      if (res.success) setPhone('');
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={card}>
      <h4 style={{ margin: '0 0 0.75rem', color: '#1e293b', fontSize: '1rem' }}>Mobile Override</h4>

      {currentPhone && (
        <div style={{ marginBottom: '1rem', padding: '0.65rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
          <Row label="Current phone" value={currentPhone} />
          <Row label="Verified" value={phoneVerified ? 'Yes' : 'No'} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={labelStyle}>New Phone Number</label>
          <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="10-digit mobile number" maxLength={15} />
        </div>
        <button onClick={handle} disabled={loading || !phone} style={btn('linear-gradient(135deg,#0f766e,#14b8a6)', loading || !phone)}>
          {loading ? 'Saving…' : 'Set Phone'}
        </button>
      </div>
      <StatusMsg ok={result?.ok} msg={result?.msg} />
    </div>
  );
};

// ─── E-Sign Override ──────────────────────────────────────────────────────────
const EsignOverride = ({ userId, documents }) => {
  const [file, setFile] = useState(null);
  const [serviceType, setServiceType] = useState('RA');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handle = async () => {
    if (!file) return setResult({ ok: false, msg: 'Please select a file' });
    setLoading(true); setResult(null);
    try {
      const res = await adminAPI.overrideEsign(userId, file, serviceType);
      setResult({ ok: res.success, msg: res.message || 'Done' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={card}>
      <h4 style={{ margin: '0 0 0.75rem', color: '#1e293b', fontSize: '1rem' }}>Document / E-Sign Override</h4>

      <ExistingRecords title="Existing documents" count={documents.length}>
        {documents.map((doc, i) => {
          const es = doc.esign || {};
          const pdfUrl = es.signedPdfUrl;
          return (
            <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < documents.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <Row label="Name" value={doc.name} />
              <Row label="Service" value={doc.serviceType} />
              <Row label="Status" value={es.status || es.currentStatus} />
              <Row label="Created" value={doc.createdAt ? new Date(doc.createdAt).toLocaleString() : null} />
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.8rem', color: '#1a6fa8', textDecoration: 'underline' }}>
                  View signed document
                </a>
              )}
              {!pdfUrl && doc.filePath && (
                <a href={doc.filePath} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.8rem', color: '#1a6fa8', textDecoration: 'underline' }}>
                  View document
                </a>
              )}
            </div>
          );
        })}
      </ExistingRecords>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Service Type</label>
          <select value={serviceType} onChange={e => setServiceType(e.target.value)} style={inputStyle}>
            <option value="RA">RA</option>
            <option value="IA">IA</option>
          </select>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Signed Document (image or PDF)</label>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={inputStyle}
            onChange={e => setFile(e.target.files[0] || null)} />
        </div>
        <button onClick={handle} disabled={loading || !file} style={btn('linear-gradient(135deg,#7c3aed,#a78bfa)', loading || !file)}>
          {loading ? 'Uploading…' : 'Complete E-Sign'}
        </button>
      </div>
      <StatusMsg ok={result?.ok} msg={result?.msg} />
    </div>
  );
};

// ─── Plan Assignment ───────────────────────────────────────────────────────────
const PlanAssignment = ({ userId, userSubscriptions }) => {
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adjustSubId, setAdjustSubId] = useState('');
  const [adjustDays, setAdjustDays] = useState('');
  const [adjustMode, setAdjustMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const activeSubs = userSubscriptions.filter(s => s.status === 'active' && new Date(s.endDate) > new Date());
  const hasActiveSub = activeSubs.length > 0;

  useEffect(() => {
    adminAPI.getSubscriptionsList()
      .then(res => setPlans(res.data || []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  // When entering adjust mode, auto-select the first active sub and pre-fill its end date
  useEffect(() => {
    if (!adjustMode) return;
    const first = activeSubs[0];
    if (first && !adjustSubId) {
      setAdjustSubId(first._id);
      if (first.endDate) setAdjustDays(new Date(first.endDate).toISOString().slice(0, 10));
    }
  }, [adjustMode]);

  // When user picks a different subscription to adjust, update the date field
  const handleAdjustSubChange = (id) => {
    setAdjustSubId(id);
    const sub = activeSubs.find(s => s._id === id);
    if (sub?.endDate) setAdjustDays(new Date(sub.endDate).toISOString().slice(0, 10));
    else setAdjustDays('');
  };

  const selectedAdjustSub = activeSubs.find(s => s._id === adjustSubId);

  const currentPlan = plans.find(p => p._id === selectedPlan);
  const planOptions = currentPlan?.planOptions || [];

  const handleAssign = async () => {
    if (!selectedPlan) return setResult({ ok: false, msg: 'Select a plan' });
    if (!startDate) return setResult({ ok: false, msg: 'Start date is required' });
    if (!endDate) return setResult({ ok: false, msg: 'End date is required' });
    if (new Date(endDate) <= new Date(startDate)) return setResult({ ok: false, msg: 'End date must be after start date' });
    setLoading(true); setResult(null);
    try {
      const res = await adminAPI.assignPlan(userId, {
        subscriptionId: selectedPlan,
        planOptionId: selectedOption || undefined,
        startDate,
        endDate,
      });
      setResult({ ok: res.success, msg: res.message || 'Plan assigned' });
      if (res.success) { setSelectedPlan(''); setSelectedOption(''); setStartDate(''); setEndDate(''); }
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setLoading(false); }
  };

  const handleAdjust = async () => {
    if (!adjustSubId) return setResult({ ok: false, msg: 'Select a subscription to adjust' });
    if (!adjustDays) return setResult({ ok: false, msg: 'New end date is required' });
    setLoading(true); setResult(null);
    try {
      const res = await adminAPI.assignPlan(userId, { newEndDate: adjustDays, subscriptionId: adjustSubId });
      setResult({ ok: res.success, msg: res.message || 'Done' });
    } catch (e) { setResult({ ok: false, msg: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={card}>
      <h4 style={{ margin: '0 0 0.75rem', color: '#1e293b', fontSize: '1rem' }}>Plan Assignment</h4>

      <ExistingRecords title="Existing subscriptions" count={userSubscriptions.length}>
        {userSubscriptions.map((s, i) => (
          <div key={i} style={{ padding: '0.6rem 0', borderBottom: i < userSubscriptions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <Row label="Plan" value={s.subscription?.name || s.planOptionName} />
            <Row label="Service" value={s.serviceType} />
            <Row label="Status" value={s.status} />
            <Row label="Start" value={s.startDate ? new Date(s.startDate).toLocaleDateString() : null} />
            <Row label="End" value={s.endDate ? new Date(s.endDate).toLocaleDateString() : null} />
            <Row label="Duration" value={s.duration} />
          </div>
        ))}
      </ExistingRecords>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button onClick={() => { setAdjustMode(false); setResult(null); }} style={{
          padding: '0.45rem 1rem', borderRadius: '6px',
          border: `2px solid ${!adjustMode ? '#e86c00' : '#d1d5db'}`,
          background: !adjustMode ? '#fff7ed' : '#fff',
          color: !adjustMode ? '#e86c00' : '#475569',
          fontWeight: !adjustMode ? 700 : 400, cursor: 'pointer', fontSize: '0.85rem',
        }}>
          Assign New Plan
        </button>
        {hasActiveSub && (
          <button onClick={() => { setAdjustMode(true); setResult(null); }} style={{
            padding: '0.45rem 1rem', borderRadius: '6px',
            border: `2px solid ${adjustMode ? '#e86c00' : '#d1d5db'}`,
            background: adjustMode ? '#fff7ed' : '#fff',
            color: adjustMode ? '#e86c00' : '#475569',
            fontWeight: adjustMode ? 700 : 400, cursor: 'pointer', fontSize: '0.85rem',
          }}>
            Adjust Active Subscription
          </button>
        )}
      </div>

      {adjustMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Subscription picker — always shown so admin knows what they're editing */}
          <div>
            <label style={labelStyle}>Subscription to adjust</label>
            <select style={inputStyle} value={adjustSubId} onChange={e => handleAdjustSubChange(e.target.value)}>
              {activeSubs.map(s => (
                <option key={s._id} value={s._id}>
                  {s.subscription?.name || s.planOptionName || 'Plan'} · {s.serviceType} · expires {s.endDate ? new Date(s.endDate).toLocaleDateString() : '?'}
                </option>
              ))}
            </select>
          </div>

          {/* Current end date info box */}
          {selectedAdjustSub?.endDate && (
            <div style={{
              padding: '0.7rem 1rem', background: '#fff7ed',
              border: '1px solid #fed7aa', borderRadius: '8px',
              fontSize: '0.85rem', color: '#92400e',
            }}>
              Currently ends on <strong>{new Date(selectedAdjustSub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>. Pick a new end date below.
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={labelStyle}>New end date *</label>
              <input
                type="date"
                style={inputStyle}
                value={adjustDays}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setAdjustDays(e.target.value)}
              />
            </div>
            <button onClick={handleAdjust} disabled={loading || !adjustDays || !adjustSubId}
              style={btn('linear-gradient(135deg,#c2410c,#f97316)', loading || !adjustDays || !adjustSubId)}>
              {loading ? 'Updating…' : 'Update End Date'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Plan *</label>
            {plansLoading ? (
              <div style={{ fontSize: '0.82rem', color: '#6c757d' }}>Loading plans…</div>
            ) : (
              <select style={inputStyle} value={selectedPlan} onChange={e => { setSelectedPlan(e.target.value); setSelectedOption(''); }}>
                <option value="">Select a plan</option>
                {plans.map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.serviceType})</option>
                ))}
              </select>
            )}
          </div>
          {planOptions.length > 0 && (
            <div>
              <label style={labelStyle}>Duration Option</label>
              <select style={inputStyle} value={selectedOption} onChange={e => setSelectedOption(e.target.value)}>
                <option value="">Select option</option>
                {planOptions.map(o => (
                  <option key={o._id} value={o._id}>{o.name} — {o.months}mo — ₹{o.price}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Start Date *</label>
            <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>End Date *</label>
            <input type="date" style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={handleAssign} disabled={loading || !selectedPlan || !startDate || !endDate}
            style={btn('linear-gradient(135deg,#c2410c,#f97316)', loading || !selectedPlan || !startDate || !endDate)}>
            {loading ? 'Assigning…' : 'Assign Plan'}
          </button>
        </div>
      )}

      <StatusMsg ok={result?.ok} msg={result?.msg} />
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const OnboardingOverride = ({ userId, userName, kycVerifications = [], documents = [], userSubscriptions = [], currentPhone = null, phoneVerified = false }) => {
  if (!userId) return null;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Onboarding Override</h3>
        <p style={{ color: '#6c757d', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Manually complete onboarding steps for <strong>{userName || userId}</strong>.
        </p>
      </div>

      <KycOverride userId={userId} kycVerifications={kycVerifications} />
      <PhoneOverride userId={userId} currentPhone={currentPhone} phoneVerified={phoneVerified} />
      <EsignOverride userId={userId} documents={documents} />
      <PlanAssignment userId={userId} userSubscriptions={userSubscriptions} />
    </div>
  );
};

export default OnboardingOverride;
