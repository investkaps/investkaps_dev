import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../services/api';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('clerk_jwt') || localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:         { padding: '1.5rem', background: '#f8fafc', minHeight: '100vh', fontFamily: 'inherit' },
  card:         { background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', padding: '1.5rem', marginBottom: '1.5rem' },
  hdr:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  h2:           { margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' },
  h3:           { margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' },
  h4:           { margin: '0 0 .5rem', fontSize: '.95rem', fontWeight: 600, color: '#1e293b' },
  primaryBtn:   { background: '#155d8e', color: '#fff', border: 'none', borderRadius: 7, padding: '.55rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '.875rem' },
  secondaryBtn: { background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: 7, padding: '.55rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '.875rem' },
  dangerBtn:    { background: '#dc3545', color: '#fff', border: 'none', borderRadius: 7, padding: '.45rem .9rem', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem' },
  warningBtn:   { background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 7, padding: '.45rem .9rem', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem' },
  editBtn:      { background: '#155d8e', color: '#fff', border: 'none', borderRadius: 7, padding: '.45rem .9rem', cursor: 'pointer', fontWeight: 600, fontSize: '.8rem' },
  btnRow:       { display: 'flex', gap: '.5rem', flexWrap: 'wrap' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  th:           { padding: '.7rem 1rem', textAlign: 'left', fontSize: '.8rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' },
  td:           { padding: '.75rem 1rem', fontSize: '.875rem', color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  badge:        (a) => ({ display: 'inline-block', padding: '.2rem .55rem', borderRadius: 12, fontSize: '.75rem', fontWeight: 600, background: a ? '#dcfce7' : '#fee2e2', color: a ? '#166534' : '#991b1b' }),
  fg:           { marginBottom: '1rem' },
  label:        { display: 'block', marginBottom: '.35rem', fontSize: '.85rem', fontWeight: 600, color: '#475569' },
  input:        { width: '100%', border: '1px solid #cbd5e1', borderRadius: 7, padding: '.55rem .75rem', fontSize: '.875rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box' },
  textarea:     { width: '100%', border: '1px solid #cbd5e1', borderRadius: 7, padding: '.55rem .75rem', fontSize: '.875rem', color: '#1e293b', outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' },
  select:       { width: '100%', border: '1px solid #cbd5e1', borderRadius: 7, padding: '.55rem .75rem', fontSize: '.875rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', background: '#fff' },
  row2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  row3:         { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' },
  stockCard:    { border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem 1rem 0.5rem', marginBottom: '.75rem', background: '#f8fafc', position: 'relative' },
  removeBtn:    { position: 'absolute', top: '.6rem', right: '.6rem', background: '#fee2e2', color: '#dc3545', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontWeight: 700, fontSize: '.9rem', lineHeight: '24px', textAlign: 'center', padding: 0 },
  alert:        (t) => ({ padding: '.75rem 1rem', borderRadius: 7, marginBottom: '1rem', fontSize: '.875rem', fontWeight: 500, background: t === 'error' ? '#fee2e2' : '#dcfce7', color: t === 'error' ? '#991b1b' : '#166534', border: `1px solid ${t === 'error' ? '#fca5a5' : '#86efac'}` }),
  histItem:     { padding: '.6rem .75rem', borderRadius: 6, background: '#f1f5f9', marginBottom: '.4rem', fontSize: '.82rem', color: '#475569' },
  divider:      { borderTop: '1px solid #e2e8f0', margin: '1.25rem 0' },
  checkRow:     { display: 'flex', alignItems: 'center', gap: '.5rem' },
};

const emptyStock = () => ({
  stockSymbol: '', stockName: '', exchange: 'NSE',
  buyRange: { min: '', max: '' },
  targetPrice1: '', targetPrice2: '', targetPrice3: '',
  stopLoss: '', allocation: '', notes: '',
});

const emptyForm = () => ({
  name: '', description: '', subscription: '', displayOrder: 0, isActive: true, stocks: [],
});

const normalizeStock = (st) => ({
  stockSymbol: (st.stockSymbol || '').toUpperCase(),
  stockName:   st.stockName  || '',
  exchange:    st.exchange   || 'NSE',
  buyRange:    { min: Number(st.buyRange?.min) || 0, max: Number(st.buyRange?.max) || 0 },
  targetPrice1: Number(st.targetPrice1) || 0,
  targetPrice2: Number(st.targetPrice2) || 0,
  targetPrice3: Number(st.targetPrice3) || 0,
  stopLoss:     Number(st.stopLoss)     || 0,
  allocation:   Number(st.allocation)   || 0,
  notes:        st.notes || '',
});

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

// ── Symbol autocomplete — standalone, stable component defined at module level ─
// Key rule: this must NOT be defined inside another component or it will remount on every render.
const SymbolInput = ({ initialValue, onSelect }) => {
  const [query, setQuery]   = useState(initialValue || '');
  const [results, setResults] = useState([]);
  const [open, setOpen]     = useState(false);
  const [busy, setBusy]     = useState(false);
  const [cursor, setCursor] = useState(-1);
  const timer               = useRef(null);
  const wrapRef             = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = (q) => {
    clearTimeout(timer.current);
    if (!q) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await adminAPI.searchSymbols(q, 50);
        if (res.success) { setResults(res.symbols || []); setOpen(true); }
        else setResults([]);
      } catch { setResults([]); }
      finally { setBusy(false); }
    }, 300);
  };

  const handleChange = (e) => {
    const v = e.target.value.toUpperCase();
    setQuery(v);
    setCursor(-1);
    doSearch(v);
  };

  const pick = (item) => {
    setQuery(item.symbol);
    setResults([]);
    setOpen(false);
    setCursor(-1);
    onSelect(item);
  };

  const handleKey = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); pick(results[cursor]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        style={s.input}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder="Search symbol e.g. RELIANCE"
        autoComplete="off"
        spellCheck="false"
      />
      {open && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
          listStyle: 'none', padding: 0, margin: 0,
          background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8,
          boxShadow: '0 6px 20px rgba(0,0,0,0.13)', zIndex: 9999,
          maxHeight: 260, overflowY: 'auto',
        }}>
          {busy ? (
            <li style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '.82rem' }}>Searching…</li>
          ) : results.length === 0 ? (
            <li style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '.82rem' }}>No results found</li>
          ) : results.map((item, i) => (
            <li
              key={`${item.exchange}:${item.symbol}`}
              onMouseDown={(e) => { e.preventDefault(); pick(item); }}
              style={{
                padding: '8px 14px', cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                background: i === cursor ? '#eff6ff' : '#fff',
              }}
            >
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.85rem', color: '#1e293b' }}>
                {item.symbol}
                <span style={{ marginLeft: 8, fontFamily: 'inherit', fontWeight: 600, fontSize: '.7rem', background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '1px 6px' }}>
                  {item.exchange}
                </span>
              </div>
              <div style={{ fontSize: '.78rem', color: '#64748b', marginTop: 1 }}>{item.name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── StockRow — also at module level so it's never re-created ──────────────────
const StockRow = ({ stock, index, onField, onRemove }) => {
  const [ltp, setLtp]         = useState(null);
  const [ltpBusy, setLtpBusy] = useState(false);
  const [ltpErr, setLtpErr]   = useState(null);

  const fetchLtp = async (exchange, symbol) => {
    setLtpBusy(true); setLtpErr(null); setLtp(null);
    try {
      const res = await adminAPI.fetchSinglePrice(exchange, symbol);
      if (res.success && res.data?.ltp != null) setLtp(res.data.ltp);
      else setLtpErr('Price unavailable');
    } catch { setLtpErr('Price fetch failed'); }
    finally { setLtpBusy(false); }
  };

  const handleSelect = (item) => {
    onField(index, 'stockSymbol', item.symbol);
    onField(index, 'stockName',   item.name     || '');
    onField(index, 'exchange',    item.exchange || 'NSE');
    fetchLtp(item.exchange || 'NSE', item.symbol);
  };

  return (
    <div style={s.stockCard}>
      <button style={s.removeBtn} onMouseDown={(e) => { e.preventDefault(); onRemove(index); }} title="Remove">×</button>
      <div style={{ fontWeight: 600, fontSize: '.78rem', color: '#94a3b8', marginBottom: '.75rem' }}>Stock #{index + 1}</div>

      <div style={s.fg}>
        <label style={s.label}>Symbol *</label>
        <SymbolInput initialValue={stock.stockSymbol} onSelect={handleSelect} />
      </div>

      <div style={s.row2}>
        <div style={s.fg}>
          <label style={s.label}>Stock Name</label>
          <input style={s.input} value={stock.stockName} onChange={e => onField(index, 'stockName', e.target.value)} placeholder="Auto-filled on select" />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Exchange</label>
          <select style={s.select} value={stock.exchange} onChange={e => onField(index, 'exchange', e.target.value)}>
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
            <option value="NFO">NFO</option>
            <option value="MCX">MCX</option>
          </select>
        </div>
      </div>

      {/* LTP banner */}
      {(ltpBusy || ltp != null || ltpErr) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.6rem',
          background: ltpErr ? '#fff7ed' : '#f0fdf4',
          border: `1px solid ${ltpErr ? '#fed7aa' : '#bbf7d0'}`,
          borderRadius: 7, padding: '.45rem .75rem', marginBottom: '.75rem', fontSize: '.85rem',
        }}>
          {ltpBusy && <span style={{ color: '#94a3b8' }}>Fetching LTP…</span>}
          {!ltpBusy && ltp != null && (
            <>
              <span style={{ color: '#475569', fontWeight: 500 }}>LTP</span>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#15803d' }}>₹{ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span style={{ color: '#94a3b8', fontSize: '.75rem', marginLeft: 'auto' }}>Use as reference for buy range below</span>
            </>
          )}
          {!ltpBusy && ltpErr && <span style={{ color: '#c2410c' }}>{ltpErr}</span>}
        </div>
      )}

      <div style={s.row2}>
        <div style={s.fg}>
          <label style={s.label}>Buy Min{ltp != null && <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>(LTP: ₹{ltp.toLocaleString('en-IN')})</span>}</label>
          <input style={s.input} type="number" value={stock.buyRange.min} onChange={e => onField(index, 'buyRange.min', e.target.value)} placeholder="0" />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Buy Max</label>
          <input style={s.input} type="number" value={stock.buyRange.max} onChange={e => onField(index, 'buyRange.max', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div style={s.row3}>
        <div style={s.fg}>
          <label style={s.label}>Target 1</label>
          <input style={s.input} type="number" value={stock.targetPrice1} onChange={e => onField(index, 'targetPrice1', e.target.value)} placeholder="0" />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Target 2</label>
          <input style={s.input} type="number" value={stock.targetPrice2} onChange={e => onField(index, 'targetPrice2', e.target.value)} placeholder="0" />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Target 3</label>
          <input style={s.input} type="number" value={stock.targetPrice3} onChange={e => onField(index, 'targetPrice3', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div style={s.row2}>
        <div style={s.fg}>
          <label style={s.label}>Stop Loss</label>
          <input style={s.input} type="number" value={stock.stopLoss} onChange={e => onField(index, 'stopLoss', e.target.value)} placeholder="0" />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Allocation %</label>
          <input style={s.input} type="number" min="0" max="100" value={stock.allocation} onChange={e => onField(index, 'allocation', e.target.value)} placeholder="0" />
        </div>
      </div>

      <div style={s.fg}>
        <label style={s.label}>Notes</label>
        <input style={s.input} value={stock.notes} onChange={e => onField(index, 'notes', e.target.value)} placeholder="Optional" />
      </div>
    </div>
  );
};

// ── StockEditor — also at module level ────────────────────────────────────────
const StockEditor = ({ stocks, onField, onAdd, onRemove }) => (
  <div>
    <div style={{ ...s.hdr, marginBottom: '.75rem' }}>
      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '.9rem' }}>Stocks ({stocks.length}/15)</span>
      <button style={{ ...s.primaryBtn, opacity: stocks.length >= 15 ? .5 : 1 }} onClick={onAdd} disabled={stocks.length >= 15}>
        + Add Stock
      </button>
    </div>
    {stocks.length === 0 && (
      <div style={{ color: '#94a3b8', fontSize: '.875rem', padding: '.75rem', textAlign: 'center', background: '#f8fafc', borderRadius: 7, border: '1px dashed #cbd5e1' }}>
        No stocks added yet. Click "Add Stock" to begin.
      </div>
    )}
    {stocks.map((stock, i) => (
      <StockRow key={i} stock={stock} index={i} onField={onField} onRemove={onRemove} />
    ))}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const ModelPortfolioManagement = () => {
  const [portfolios,    setPortfolios]    = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);
  const [success,       setSuccess]       = useState(null);
  const [view,          setView]          = useState('list'); // 'list' | 'form' | 'rebalance'
  const [editingId,     setEditingId]     = useState(null);
  const [rebalancePf,   setRebalancePf]   = useState(null);
  const [expandedId,    setExpandedId]    = useState(null);
  const [formData,      setFormData]      = useState(emptyForm());
  const [rbStocks,      setRbStocks]      = useState([]);
  const [rbNotes,       setRbNotes]       = useState('');
  const [rbError,       setRbError]       = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pfRes, subRes] = await Promise.all([
        fetch(`${API}/admin/model-portfolios`,     { headers: getHeaders() }),
        fetch(`${API}/admin/subscriptions/list`,   { headers: getHeaders() }),
      ]);
      const pfJson  = await pfRes.json();
      const subJson = subRes.ok ? await subRes.json() : {};
      setPortfolios(Array.isArray(pfJson)       ? pfJson       : pfJson.data  ?? []);
      setSubscriptions(Array.isArray(subJson)   ? subJson      : subJson.data ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const flash = (msg, type = 'success') => {
    type === 'success' ? setSuccess(msg) : setError(msg);
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  };

  // ── Stock field updater (works for both form and rebalance) ──────────────────
  const formOnField = (index, key, value) => {
    setFormData(fd => {
      const stocks = fd.stocks.map((st, i) => {
        if (i !== index) return st;
        if (key === 'buyRange.min') return { ...st, buyRange: { ...st.buyRange, min: value } };
        if (key === 'buyRange.max') return { ...st, buyRange: { ...st.buyRange, max: value } };
        return { ...st, [key]: value };
      });
      return { ...fd, stocks };
    });
  };

  const rbOnField = (index, key, value) => {
    setRbStocks(prev => prev.map((st, i) => {
      if (i !== index) return st;
      if (key === 'buyRange.min') return { ...st, buyRange: { ...st.buyRange, min: value } };
      if (key === 'buyRange.max') return { ...st, buyRange: { ...st.buyRange, max: value } };
      return { ...st, [key]: value };
    }));
  };

  // ── Open views ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null); setFormData(emptyForm());
    setError(null); setSuccess(null); setView('form');
  };

  const openEdit = (pf) => {
    setEditingId(pf._id);
    setFormData({
      name: pf.name || '', description: pf.description || '',
      subscription: pf.subscription?._id || pf.subscription || '',
      displayOrder: pf.displayOrder ?? 0, isActive: pf.isActive ?? true,
      stocks: (pf.stocks || []).map(st => ({
        stockSymbol: st.stockSymbol || '', stockName: st.stockName || '',
        exchange: st.exchange || 'NSE',
        buyRange: { min: st.buyRange?.min ?? '', max: st.buyRange?.max ?? '' },
        targetPrice1: st.targetPrice1 ?? '', targetPrice2: st.targetPrice2 ?? '',
        targetPrice3: st.targetPrice3 ?? '', stopLoss: st.stopLoss ?? '',
        allocation: st.allocation ?? '', notes: st.notes || '',
      })),
    });
    setError(null); setSuccess(null); setView('form');
  };

  const openRebalance = (pf) => {
    setRebalancePf(pf);
    setRbStocks((pf.stocks || []).map(st => ({
      stockSymbol: st.stockSymbol || '', stockName: st.stockName || '',
      exchange: st.exchange || 'NSE',
      buyRange: { min: st.buyRange?.min ?? '', max: st.buyRange?.max ?? '' },
      targetPrice1: st.targetPrice1 ?? '', targetPrice2: st.targetPrice2 ?? '',
      targetPrice3: st.targetPrice3 ?? '', stopLoss: st.stopLoss ?? '',
      allocation: st.allocation ?? '', notes: st.notes || '',
    })));
    setRbNotes(''); setRbError(null); setError(null); setSuccess(null); setView('rebalance');
  };

  // ── Save / delete ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name.trim()) { setError('Portfolio name is required.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = { ...formData, displayOrder: Number(formData.displayOrder) || 0, stocks: formData.stocks.map(normalizeStock) };
      const url    = editingId ? `${API}/admin/model-portfolios/${editingId}` : `${API}/admin/model-portfolios`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || j.message || 'Save failed'); }
      await fetchAll();
      flash(editingId ? 'Portfolio updated.' : 'Portfolio created.');
      setView('list');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this portfolio? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/admin/model-portfolios/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      await fetchAll(); flash('Portfolio deleted.');
    } catch (e) { flash(e.message, 'error'); }
  };

  const handleRebalanceSave = async () => {
    if (!rbNotes.trim()) { setRbError('Change notes are required.'); return; }
    setSaving(true); setRbError(null);
    try {
      const payload = { changes: rbNotes, stocks: rbStocks.map(normalizeStock) };
      const res = await fetch(`${API}/admin/model-portfolios/${rebalancePf._id}/rebalance`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(payload),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || j.message || 'Rebalance failed'); }
      await fetchAll(); flash('Portfolio rebalanced.'); setView('list');
    } catch (e) { setRbError(e.message); }
    finally { setSaving(false); }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(fd => ({ ...fd, [name]: type === 'checkbox' ? checked : value }));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {success && <div style={s.alert('success')}>{success}</div>}
      {error && view === 'list' && <div style={s.alert('error')}>{error}</div>}

      {/* ══ LIST ══════════════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div style={s.card}>
          <div style={s.hdr}>
            <h2 style={s.h2}>Model Portfolios</h2>
            <button style={s.primaryBtn} onClick={openCreate}>+ Create Portfolio</button>
          </div>

          {loading ? (
            <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Loading…</div>
          ) : portfolios.length === 0 ? (
            <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>No portfolios yet. Create one to get started.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>{['Name', 'Subscription', 'Stocks', 'Status', 'Last Rebalanced', 'Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {portfolios.map(pf => (
                    <React.Fragment key={pf._id}>
                      <tr>
                        <td style={s.td}>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#155d8e', fontWeight: 600, fontSize: '.875rem', padding: 0 }}
                            onClick={() => setExpandedId(expandedId === pf._id ? null : pf._id)}
                          >
                            {expandedId === pf._id ? '▾' : '▸'} {pf.name}
                          </button>
                        </td>
                        <td style={s.td}>{pf.subscription?.name || '—'}</td>
                        <td style={s.td}>{(pf.stocks || []).length}</td>
                        <td style={s.td}><span style={s.badge(pf.isActive)}>{pf.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td style={s.td}>{pf.rebalanceHistory?.length ? fmtDate(pf.rebalanceHistory.at(-1).rebalancedAt) : '—'}</td>
                        <td style={s.td}>
                          <div style={s.btnRow}>
                            <button style={s.editBtn}    onClick={() => openEdit(pf)}>Edit</button>
                            <button style={s.warningBtn} onClick={() => openRebalance(pf)}>Rebalance</button>
                            <button style={s.dangerBtn}  onClick={() => handleDelete(pf._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === pf._id && (
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan={6} style={{ ...s.td, paddingTop: '.25rem', paddingBottom: '1rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '.8rem', color: '#475569', marginBottom: '.4rem' }}>Rebalance History</div>
                            {!pf.rebalanceHistory?.length
                              ? <div style={{ color: '#94a3b8', fontSize: '.82rem' }}>No rebalance history yet.</div>
                              : [...pf.rebalanceHistory].reverse().map((h, i) => (
                                  <div key={i} style={s.histItem}><strong>{fmtDate(h.rebalancedAt)}</strong> — {h.changes}</div>
                                ))
                            }
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ FORM ══════════════════════════════════════════════════════════════ */}
      {view === 'form' && (
        <div style={s.card}>
          <div style={s.hdr}>
            <h2 style={s.h2}>{editingId ? 'Edit Portfolio' : 'Create Portfolio'}</h2>
            <button style={s.secondaryBtn} onClick={() => setView('list')}>← Back</button>
          </div>

          {error && <div style={s.alert('error')}>{error}</div>}

          <div style={s.row2}>
            <div style={s.fg}>
              <label style={s.label}>Portfolio Name *</label>
              <input style={s.input} name="name" value={formData.name} onChange={handleFormChange} placeholder="e.g. Growth Portfolio" />
            </div>
            <div style={s.fg}>
              <label style={s.label}>Display Order</label>
              <input style={s.input} type="number" name="displayOrder" value={formData.displayOrder} onChange={handleFormChange} />
            </div>
          </div>

          <div style={s.fg}>
            <label style={s.label}>Description</label>
            <textarea style={s.textarea} name="description" value={formData.description} onChange={handleFormChange} placeholder="Brief description of this portfolio's strategy…" />
          </div>

          <div style={s.row2}>
            <div style={s.fg}>
              <label style={s.label}>Linked Subscription</label>
              <select style={s.select} name="subscription" value={formData.subscription} onChange={handleFormChange}>
                <option value="">— None —</option>
                {subscriptions.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
              </select>
            </div>
            <div style={s.fg}>
              <label style={s.label}>Status</label>
              <div style={{ ...s.checkRow, marginTop: '.6rem' }}>
                <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleFormChange} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="isActive" style={{ ...s.label, margin: 0, cursor: 'pointer' }}>Active</label>
              </div>
            </div>
          </div>

          <div style={s.divider} />

          <StockEditor
            stocks={formData.stocks}
            onField={formOnField}
            onAdd={() => { if (formData.stocks.length < 15) setFormData(fd => ({ ...fd, stocks: [...fd.stocks, emptyStock()] })); }}
            onRemove={(i) => setFormData(fd => ({ ...fd, stocks: fd.stocks.filter((_, idx) => idx !== i) }))}
          />

          <div style={s.divider} />
          <div style={s.btnRow}>
            <button style={s.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Portfolio' : 'Create Portfolio'}
            </button>
            <button style={s.secondaryBtn} onClick={() => setView('list')} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {/* ══ REBALANCE ═════════════════════════════════════════════════════════ */}
      {view === 'rebalance' && rebalancePf && (
        <div style={s.card}>
          <div style={s.hdr}>
            <h2 style={s.h2}>Rebalance — {rebalancePf.name}</h2>
            <button style={s.secondaryBtn} onClick={() => setView('list')}>← Back</button>
          </div>

          {rbError && <div style={s.alert('error')}>{rbError}</div>}

          {rebalancePf.stocks?.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={s.h4}>Current Holdings (snapshot)</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Symbol', 'Exchange', 'Buy Range', 'T1', 'T2', 'T3', 'SL', 'Alloc %'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rebalancePf.stocks.map((st, i) => (
                      <tr key={i}>
                        <td style={s.td}><strong>{st.stockSymbol}</strong><br /><span style={{ color: '#94a3b8', fontSize: '.78rem' }}>{st.stockName}</span></td>
                        <td style={s.td}>{st.exchange}</td>
                        <td style={s.td}>{st.buyRange?.min}–{st.buyRange?.max}</td>
                        <td style={s.td}>{st.targetPrice1}</td>
                        <td style={s.td}>{st.targetPrice2}</td>
                        <td style={s.td}>{st.targetPrice3}</td>
                        <td style={s.td}>{st.stopLoss}</td>
                        <td style={s.td}>{st.allocation}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={s.divider} />
            </div>
          )}

          <div style={s.fg}>
            <label style={s.label}>Change Notes * <span style={{ color: '#94a3b8', fontWeight: 400 }}>(required)</span></label>
            <textarea
              style={{ ...s.textarea, minHeight: 100, borderColor: rbError && !rbNotes.trim() ? '#dc3545' : '#cbd5e1' }}
              value={rbNotes}
              onChange={e => setRbNotes(e.target.value)}
              placeholder="e.g. Added INFY, removed WIPRO. Increased tech allocation due to strong earnings…"
            />
          </div>

          <div style={s.divider} />
          <h3 style={s.h3}>New Stock List</h3>

          <StockEditor
            stocks={rbStocks}
            onField={rbOnField}
            onAdd={() => { if (rbStocks.length < 15) setRbStocks(prev => [...prev, emptyStock()]); }}
            onRemove={(i) => setRbStocks(prev => prev.filter((_, idx) => idx !== i))}
          />

          <div style={s.divider} />
          <div style={s.btnRow}>
            <button style={s.primaryBtn} onClick={handleRebalanceSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Rebalance'}
            </button>
            <button style={s.secondaryBtn} onClick={() => setView('list')} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelPortfolioManagement;
