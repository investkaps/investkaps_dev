import React, { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL;

const authHeaders = () => {
  const t = localStorage.getItem('clerk_jwt');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
];

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Custom invoice form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [form, setForm] = useState({
    billingName: '', billingState: '', email: '', phone: '', pan: '',
    packageName: '', duration: '', amount: '', coupon: '0',
    serviceType: 'RA', sendEmail: true,
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, ...(search ? { search } : {}) });
      const res = await fetch(`${API}/admin/invoices?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) { setInvoices(data.data || []); setTotal(data.total || 0); }
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchInvoices(); };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.billingName || !form.billingState || !form.email || !form.packageName || !form.amount) {
      setCreateError('Please fill all required fields.');
      return;
    }
    setCreating(true); setCreateError(''); setCreateSuccess('');
    try {
      const res = await fetch(`${API}/admin/invoices/create`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...form, amount: Number(form.amount), coupon: Number(form.coupon || 0) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create invoice');
      setCreateSuccess(`Invoice ${data.invoiceNumber} created successfully.${form.sendEmail ? ' Sent to email.' : ''}`);
      setForm({ billingName: '', billingState: '', email: '', phone: '', pan: '', packageName: '', duration: '', amount: '', coupon: '0', serviceType: 'RA', sendEmail: true });
      fetchInvoices();
    } catch (err) {
      setCreateError(err.message);
    }
    setCreating(false);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Invoice Management</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>View and generate invoices for all transactions.</p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); }}
          style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          + Create Invoice
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text" placeholder="Search by invoice #, name, email…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14 }}
        />
        <button type="submit" style={{ padding: '9px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#f8fafc', borderRadius: 10 }}>
          No invoices found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Invoice #', 'Billed To', 'Amount', 'Type', 'Date', 'Method', 'PDF'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv._id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>{inv.invoiceNumber || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 500 }}>{inv.billingName || inv.senderName || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.user?.email || inv.user?.name || ''}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: inv.serviceType === 'IA' ? '#ede9fe' : '#dbeafe', color: inv.serviceType === 'IA' ? '#7c3aed' : '#2563eb' }}>
                      {inv.serviceType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b', textTransform: 'capitalize' }}>{inv.paymentMethod || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {inv.invoicePdfUrl ? (
                      <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer"
                        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
                        View PDF
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'default' : 'pointer' }}>
            ← Prev
          </button>
          <span style={{ padding: '6px 14px', color: '#64748b', fontSize: 13 }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === totalPages ? '#f1f5f9' : '#fff', cursor: page === totalPages ? 'default' : 'pointer' }}>
            Next →
          </button>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create Custom Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            {createError && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', marginBottom: 14, fontSize: 13 }}>{createError}</div>}
            {createSuccess && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#16a34a', marginBottom: 14, fontSize: 13 }}>{createSuccess}</div>}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Service Type */}
              <div style={{ display: 'flex', gap: 10 }}>
                {['RA', 'IA'].map(t => (
                  <label key={t} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${form.serviceType === t ? '#2563eb' : '#e2e8f0'}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: form.serviceType === t ? '#2563eb' : '#64748b' }}>
                    <input type="radio" name="serviceType" value={t} checked={form.serviceType === t} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))} style={{ accentColor: '#2563eb' }} />
                    {t === 'RA' ? 'Research Analyst (RA)' : 'Investment Advisor (IA)'}
                  </label>
                ))}
              </div>

              {[
                { key: 'billingName', label: 'Billing Name *', ph: 'Full legal name' },
                { key: 'email', label: 'Email *', ph: 'recipient@example.com', type: 'email' },
                { key: 'phone', label: 'Phone', ph: '+91 98765 43210' },
                { key: 'pan', label: 'PAN', ph: 'ABCDE1234F' },
                { key: 'packageName', label: 'Package Name *', ph: 'e.g. Research Pro - 1 Month' },
                { key: 'duration', label: 'Duration', ph: 'e.g. 1 Month' },
                { key: 'amount', label: 'Amount (₹) *', ph: '0', type: 'number' },
                { key: 'coupon', label: 'Coupon Discount (₹)', ph: '0', type: 'number' },
              ].map(({ key, label, ph, type = 'text' }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{label}</label>
                  <input
                    type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              {/* State select */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>State *</label>
                <select value={form.billingState} onChange={e => setForm(f => ({ ...f, billingState: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 13 }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Send email toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', color: '#334155' }}>
                <input type="checkbox" checked={form.sendEmail} onChange={e => setForm(f => ({ ...f, sendEmail: e.target.checked }))} style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
                Send invoice to email
              </label>

              <button type="submit" disabled={creating}
                style={{ padding: '12px', background: creating ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: creating ? 'default' : 'pointer', marginTop: 4 }}>
                {creating ? 'Generating…' : 'Generate & Save Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
