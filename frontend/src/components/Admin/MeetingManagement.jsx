import React, { useState, useEffect, useCallback } from 'react';
import { callAPI } from '../../services/api';

/* ── tiny helpers ──────────────────────────────────────────────── */
const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const STATUS_LABEL = {
  awaiting_payment: { label: 'Awaiting Payment', color: '#64748b', bg: '#f1f5f9' },
  payment_submitted: { label: 'Payment Submitted', color: '#d97706', bg: '#fef3c7' },
  confirmed: { label: 'Confirmed', color: '#059669', bg: '#d1fae5' },
  completed: { label: 'Completed', color: '#2563eb', bg: '#dbeafe' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: '#64748b', bg: '#f1f5f9' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, color: s.color, background: s.bg,
    }}>{s.label}</span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: Bookings
═══════════════════════════════════════════════════════════════ */
function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPI.adminGetBookings(filter ? { status: filter } : {});
      setBookings(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (id) => {
    try {
      await callAPI.adminConfirm(id, notes);
      setConfirming(null); setNotes('');
      load();
      alert('Booking confirmed and Google Meet link sent!');
    } catch (e) { alert(e.message); }
  };

  const handleCancel = async (id) => {
    try {
      await callAPI.adminCancel(id, cancelReason);
      setCancelling(null); setCancelReason('');
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'payment_submitted', 'confirmed', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', cursor: 'pointer',
              background: filter === s ? '#2563eb' : '#fff', color: filter === s ? '#fff' : '#334155',
              fontWeight: 600, fontSize: 13,
            }}>
            {s === '' ? 'All' : STATUS_LABEL[s]?.label || s}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Loading…</p> : bookings.length === 0 ? (
        <p style={{ color: '#64748b' }}>No bookings found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['User', 'Plan', 'Slot', 'Amount', 'Status', 'Meet Link', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{b.user?.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{b.user?.email}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div>{b.callPlan?.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{b.callPlan?.durationMinutes} min</div>
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <div>{b.slot?.date}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{b.slot?.startTime}–{b.slot?.endTime}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                    {b.isFreeCall
                      ? <span style={{ background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 12, padding: '3px 8px', borderRadius: 10 }}>FREE</span>
                      : `₹${b.amount}`
                    }
                  </td>
                  <td style={{ padding: '10px 12px' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding: '10px 12px' }}>
                    {b.meetLink
                      ? <a href={b.meetLink} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600, fontSize: 12 }}>Join</a>
                      : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {b.status === 'payment_submitted' && (
                        <button onClick={() => { setConfirming(b._id); setNotes(''); }}
                          style={{ padding: '5px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Confirm
                        </button>
                      )}
                      {!['cancelled', 'completed'].includes(b.status) && (
                        <button onClick={() => { setCancelling(b._id); setCancelReason(''); }}
                          style={{ padding: '5px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Cancel
                        </button>
                      )}
                      {b.paymentRequest?.transactionImageUrl && (
                        <a href={b.paymentRequest.transactionImageUrl} target="_blank" rel="noopener noreferrer"
                          style={{ padding: '5px 12px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          Receipt
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 12px', color: '#0f172a' }}>Confirm Booking</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>
              {bookings.find(b => b._id === confirming)?.isFreeCall
                ? 'This is a FREE CALL. No payment was taken. Confirming will create a Google Meet event and email the user.'
                : 'This will approve the payment, create a Google Meet event, and email the user.'
              }
            </p>
            <textarea
              placeholder="Optional admin notes"
              value={notes} onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirming(null)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => handleConfirm(confirming)} style={{ padding: '8px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Confirm & Send Meet Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelling && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 400, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 12px', color: '#0f172a' }}>Cancel Booking</h3>
            <textarea
              placeholder="Reason for cancellation (sent to user)"
              value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelling(null)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Back</button>
              <button onClick={() => handleCancel(cancelling)} style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: Call Plans
═══════════════════════════════════════════════════════════════ */
function PlansTab() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | planObj
  const [form, setForm] = useState({ name: '', description: '', durationMinutes: 30, price: 0, features: '' });

  const load = async () => {
    setLoading(true);
    try { const r = await callAPI.adminGetPlans(); setPlans(r.data || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: '', description: '', durationMinutes: 30, price: 0, features: '' }); setEditing('new'); };
  const openEdit = (p) => { setForm({ ...p, features: (p.features || []).join('\n') }); setEditing(p); };

  const save = async () => {
    const data = { ...form, durationMinutes: Number(form.durationMinutes), price: Number(form.price), features: form.features.split('\n').map(s => s.trim()).filter(Boolean) };
    try {
      if (editing === 'new') await callAPI.adminCreatePlan(data);
      else await callAPI.adminUpdatePlan(editing._id, data);
      setEditing(null); load();
    } catch (e) { alert(e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    try { await callAPI.adminDeletePlan(id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <button onClick={openNew} style={{ marginBottom: 16, padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
        + New Call Plan
      </button>

      {loading ? <p style={{ color: '#64748b' }}>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {plans.map(p => (
            <div key={p._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h4 style={{ margin: 0, color: '#0f172a' }}>{p.name}</h4>
                <span style={{ fontWeight: 700, color: '#2563eb', fontSize: 18 }}>₹{p.price}</span>
              </div>
              <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 13 }}>{p.description}</p>
              <p style={{ margin: '0 0 12px', color: '#334155', fontSize: 13 }}><strong>{p.durationMinutes} min</strong> call</p>
              {p.features?.length > 0 && (
                <ul style={{ margin: '0 0 12px', paddingLeft: 16 }}>
                  {p.features.map((f, i) => <li key={i} style={{ fontSize: 13, color: '#475569' }}>{f}</li>)}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(p)} style={{ padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit</button>
                <button onClick={() => del(p._id)} style={{ padding: '5px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
              </div>
            </div>
          ))}
          {plans.length === 0 && <p style={{ color: '#64748b' }}>No plans yet. Create one above.</p>}
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', color: '#0f172a' }}>{editing === 'new' ? 'New Call Plan' : 'Edit Call Plan'}</h3>
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Description', key: 'description', type: 'textarea' },
              { label: 'Duration (minutes)', key: 'durationMinutes', type: 'number' },
              { label: 'Price (₹)', key: 'price', type: 'number' },
              { label: 'Features (one per line)', key: 'features', type: 'textarea' },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
                {type === 'textarea'
                  ? <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: '100%', minHeight: 80, padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
                  : <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                }
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={save} style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB: Slot Calendar — bulk scheduling
═══════════════════════════════════════════════════════════════ */

/* Generate HH:MM options every 15 min */
const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
})();

/* Add N minutes to HH:MM */
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/* Enumerate all dates in [from, to] */
function dateRange(from, to) {
  const dates = [];
  const cur = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function SlotsTab() {
  const today = new Date().toISOString().slice(0, 10);

  /* ── template state ── */
  const [templateSlots, setTemplateSlots] = useState([
    { id: 1, startTime: '10:00', endTime: '10:30' },
  ]);
  const [slotDuration, setSlotDuration] = useState(30);
  const [autoFillStart, setAutoFillStart] = useState('09:00');
  const [autoFillEnd, setAutoFillEnd] = useState('17:00');

  /* ── apply-to-dates state ── */
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [activeDays, setActiveDays] = useState([]); // auto-derived from date range
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  /* Days that actually exist in the selected range */
  const daysInRange = React.useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return [];
    const seen = new Set();
    dateRange(fromDate, toDate).forEach(d => seen.add(new Date(d + 'T00:00:00').getDay()));
    return [...seen].sort();
  }, [fromDate, toDate]);

  /* Clamp toDate so it never falls behind fromDate */
  useEffect(() => {
    if (toDate < fromDate) setToDate(fromDate);
  }, [fromDate]);

  /* When the range changes, select all days in that range by default */
  useEffect(() => {
    setActiveDays(daysInRange);
    setApplyResult(null);
  }, [fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── view state ── */
  const [viewDate, setViewDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [viewDayId, setViewDayId] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const r = await callAPI.adminGetSlots(viewDate);
      setSlots(r.data || []);
      // backend returns { data: slots[], date } for date-scoped queries
      // we need the dayId — fetch it from a separate field or keep it in state
      // The GET /admin/slots?date=X returns slots array directly; we need dayId for delete.
      // Re-fetch the day doc to get its _id via a workaround: store it from the response if available.
      setViewDayId(r.dayId || null);
    }
    catch (e) { console.error(e); } finally { setLoadingSlots(false); }
  }, [viewDate]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  /* ── template helpers ── */
  const addTemplateSlot = () => {
    const last = templateSlots[templateSlots.length - 1];
    const start = last ? last.endTime : '10:00';
    const end = addMinutes(start, slotDuration);
    setTemplateSlots(prev => [...prev, { id: Date.now(), startTime: start, endTime: end }]);
  };

  const removeTemplateSlot = (id) => setTemplateSlots(prev => prev.filter(s => s.id !== id));

  const updateSlot = (id, field, val) => {
    setTemplateSlots(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: val };
      if (field === 'startTime') updated.endTime = addMinutes(val, slotDuration);
      return updated;
    }));
  };

  const autoFill = () => {
    const slots = [];
    let cur = autoFillStart;
    let id = 1;
    while (true) {
      const end = addMinutes(cur, slotDuration);
      const [eh, em] = end.split(':').map(Number);
      const [lh, lm] = autoFillEnd.split(':').map(Number);
      if (eh > lh || (eh === lh && em > lm)) break;
      slots.push({ id: id++, startTime: cur, endTime: end });
      cur = end;
    }
    setTemplateSlots(slots.length ? slots : [{ id: 1, startTime: autoFillStart, endTime: addMinutes(autoFillStart, slotDuration) }]);
  };

  /* ── apply template to date range ── */
  const applyTemplate = async () => {
    if (!templateSlots.length) { alert('Add at least one time slot to the template.'); return; }
    if (fromDate > toDate) { alert('From date must be before or equal to To date.'); return; }
    setApplying(true);
    setApplyResult(null);
    try {
      const dates = dateRange(fromDate, toDate).filter(d => {
        const dow = new Date(d + 'T00:00:00').getDay();
        return activeDays.includes(dow);
      });
      const payload = [];
      dates.forEach(date => {
        templateSlots.forEach(s => payload.push({ date, startTime: s.startTime, endTime: s.endTime }));
      });
      const r = await callAPI.adminBulkCreateSlots(payload);
      setApplyResult({ created: r.data?.created ?? payload.length, skipped: r.data?.skipped ?? 0, dates: dates.length });
      loadSlots();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally { setApplying(false); }
  };

  const delSlot = async (slotId) => {
    if (!viewDayId) { alert('Day ID not loaded yet. Please wait and try again.'); return; }
    try { await callAPI.adminDeleteSlot(viewDayId, slotId); loadSlots(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const clearDay = async () => {
    if (!viewDayId) { alert('No slots found for this date.'); return; }
    const unbookedCount = slots.filter(s => !s.isBooked).length;
    if (unbookedCount === 0) { alert('No unbooked slots to clear.'); return; }
    if (!window.confirm(`Delete all ${unbookedCount} unbooked slot${unbookedCount > 1 ? 's' : ''} for ${viewDate}?`)) return;
    try { await callAPI.adminClearDay(viewDayId, viewDate); loadSlots(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const toggleDay = (d) => setActiveDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const inputStyle = { padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 13 };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 3 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

      {/* ── LEFT: Template builder ── */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, background: '#fff' }}>
        <h4 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: 15 }}>1. Build Your Time Slot Template</h4>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>Define a reusable set of time slots. You'll apply this to any date range in Step 2.</p>

        {/* Auto-fill bar */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Auto-generate slots</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>From</label>
              <select value={autoFillStart} onChange={e => setAutoFillStart(e.target.value)} style={inputStyle}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <select value={autoFillEnd} onChange={e => setAutoFillEnd(e.target.value)} style={inputStyle}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Duration (min)</label>
              <select value={slotDuration} onChange={e => setSlotDuration(Number(e.target.value))} style={inputStyle}>
                {[15, 20, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <button onClick={autoFill}
              style={{ padding: '7px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Generate
            </button>
          </div>
        </div>

        {/* Manual slot list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {templateSlots.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 18, fontWeight: 700 }}>{i + 1}</span>
              <select value={s.startTime} onChange={e => updateSlot(s.id, 'startTime', e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>→</span>
              <select value={s.endTime} onChange={e => updateSlot(s.id, 'endTime', e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={() => removeTemplateSlot(s.id)}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={addTemplateSlot}
          style={{ width: '100%', padding: '8px', border: '2px dashed #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          + Add Slot
        </button>

        {templateSlots.length > 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1d4ed8' }}>
            {templateSlots.length} slots in template — {templateSlots[0]?.startTime} to {templateSlots[templateSlots.length - 1]?.endTime}
          </div>
        )}
      </div>

      {/* ── RIGHT: Apply to dates + view ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Apply panel */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, background: '#fff' }}>
          <h4 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: 15 }}>2. Apply to Date Range</h4>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>Choose which dates to create these slots on.</p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <label style={labelStyle}>From Date</label>
              <input type="date" value={fromDate} min={today} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To Date</label>
              <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 8 }}>Apply on days</label>
            {daysInRange.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Select a valid date range above to see available days.</p>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {daysInRange.map(i => (
                  <button key={i} onClick={() => toggleDay(i)}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: '2px solid',
                      borderColor: activeDays.includes(i) ? '#2563eb' : '#e2e8f0',
                      background: activeDays.includes(i) ? '#2563eb' : '#fff',
                      color: activeDays.includes(i) ? '#fff' : '#64748b',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {DAY_NAMES[i]}
                  </button>
                ))}
                <button onClick={() => setActiveDays(daysInRange)}
                  style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  All
                </button>
                <button onClick={() => setActiveDays([])}
                  style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  None
                </button>
              </div>
            )}
          </div>

          {fromDate && toDate && fromDate <= toDate && activeDays.length > 0 && templateSlots.length > 0 && (() => {
            const matchingDates = dateRange(fromDate, toDate).filter(d => activeDays.includes(new Date(d + 'T00:00:00').getDay()));
            return (
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                <strong style={{ color: '#0f172a' }}>{matchingDates.length} days</strong> selected
                {' '}× <strong style={{ color: '#0f172a' }}>{templateSlots.length} slots</strong> = <strong style={{ color: '#2563eb' }}>{matchingDates.length * templateSlots.length} total slots</strong>
                <span style={{ color: '#94a3b8' }}> (duplicates skipped)</span>
              </div>
            );
          })()}

          <button onClick={applyTemplate} disabled={applying || !templateSlots.length}
            style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: applying ? 0.7 : 1 }}>
            {applying ? 'Creating slots…' : 'Apply Template to Dates'}
          </button>

          {applyResult && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#d1fae5', borderRadius: 8, fontSize: 13, color: '#065f46', fontWeight: 600 }}>
              ✓ Created {applyResult.created} slots across {applyResult.dates} days{applyResult.skipped > 0 ? ` (${applyResult.skipped} duplicates skipped)` : ''}
            </div>
          )}
        </div>

        {/* View slots by date */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 20, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, color: '#0f172a', fontSize: 15 }}>View / Delete Slots</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} style={inputStyle} />
              {slots.some(s => !s.isBooked) && (
                <button onClick={clearDay} style={{ padding: '7px 12px', background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                  Clear All
                </button>
              )}
            </div>
          </div>
          {loadingSlots ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Loading…</p>
          ) : slots.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No slots for {viewDate}.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map(s => (
                <div key={s._id} style={{
                  padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                  border: `1.5px solid ${s.isBooked ? '#fca5a5' : '#86efac'}`,
                  background: s.isBooked ? '#fef2f2' : '#f0fdf4',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{s.startTime}–{s.endTime}</span>
                  {s.isBooked
                    ? <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>BOOKED</span>
                    : <button onClick={() => delSlot(s._id)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>✕</button>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT: MeetingManagement
═══════════════════════════════════════════════════════════════ */
export default function MeetingManagement() {
  const [tab, setTab] = useState('bookings');

  const tabs = [
    { key: 'bookings', label: 'Booking Requests' },
    { key: 'plans', label: 'Call Plans' },
    { key: 'slots', label: 'Slot Calendar' },
  ];

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 14, color: tab === t.key ? '#2563eb' : '#64748b',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.2s',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'plans' && <PlansTab />}
      {tab === 'slots' && <SlotsTab />}
    </div>
  );
}
