import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { adminAPI } from '../../services/api';
import UserManagement from './UserManagement';
import SubscriptionManagement from './SubscriptionManagement';
import StrategyManagement from './StrategyManagement';
import KycManagement from '../../components/Admin/KycManagement';
import StockRecommendationManagement from '../../components/Admin/StockRecommendationManagement';
import PaymentApproval from './PaymentApproval';
import QuestionnaireManagement from './QuestionnaireManagement';
import QuestionnaireResponses from './QuestionnaireResponses';
import EsignManagement from './EsignManagement';
import TestimonialsManagement from '../../components/Admin/TestimonialsManagement';
import ModelPortfolioManagement from './ModelPortfolioManagement';
import './AdminDashboard.css';

/* ─────────────────────────── Settings / Maintenance tab ─── */
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Chandigarh','Puducherry',
];


const EMPTY_FORM = {
  billingName: '', billingState: '', email: '', phone: '', pan: '',
  packageName: '', duration: '', amount: '', coupon: '0',
  serviceType: 'RA', transactionId: '',
};

const SettingsTab = () => {
  /* ── Mail center state ── */
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [mailTypes, setMailTypes] = useState([]);
  const [mailTypesLoading, setMailTypesLoading] = useState(false);
  const [mailTypesError, setMailTypesError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMailType, setSelectedMailType] = useState('test-email');
  const [selectedServiceType, setSelectedServiceType] = useState('RA');
  const [mailSending, setMailSending] = useState(false);
  const [mailResult, setMailResult] = useState(null);
  const [mailError, setMailError] = useState(null);

  /* ── Invoice generator state ── */
  const [invUserId, setInvUserId] = useState('');
  const [invUserLoading, setInvUserLoading] = useState(false);
  const [invForm, setInvForm] = useState({ ...EMPTY_FORM });
  const [invBusy, setInvBusy] = useState(false);
  const [invError, setInvError] = useState('');
  const [invSuccess, setInvSuccess] = useState('');
  const [invPdfUrl, setInvPdfUrl] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await adminAPI.getAllUsers();
        const payload = response?.data ?? response;
        setUsers(Array.isArray(payload) ? payload : []);
        setUsersError(null);
      } catch (err) {
        setUsersError(err.message || 'Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    };
    const fetchMailTypes = async () => {
      try {
        setMailTypesLoading(true);
        const response = await adminAPI.getMailTypes();
        const payload = response?.data ?? response;
        setMailTypes(Array.isArray(payload) ? payload : []);
        setMailTypesError(null);
      } catch (err) {
        setMailTypesError(err.message || 'Failed to load mail types');
      } finally {
        setMailTypesLoading(false);
      }
    };
    fetchUsers();
    fetchMailTypes();
  }, []);

  /* Auto-fill invoice form when user is selected */
  const handleInvUserChange = async (e) => {
    const uid = e.target.value;
    setInvUserId(uid);
    setInvError(''); setInvSuccess(''); setInvPdfUrl('');
    if (!uid) { setInvForm({ ...EMPTY_FORM }); return; }
    setInvUserLoading(true);
    try {
      const res = await adminAPI.getUserById(uid);
      const u = res?.data ?? res;
      const pan = u?.kycVerifications?.find(k => k.pan)?.pan || '';
      setInvForm(f => ({
        ...f,
        billingName: u?.name || '',
        email: u?.email || '',
        phone: u?.profile?.phone || '',
        pan,
      }));
    } catch {}
    setInvUserLoading(false);
  };

  const invField = (key, val) => setInvForm(f => ({ ...f, [key]: val }));

  const buildInvPayload = () => ({
    ...invForm,
    amount: Number(invForm.amount),
    coupon: Number(invForm.coupon || 0),
  });

  const handlePreview = async () => {
    if (!invForm.billingName || !invForm.billingState || !invForm.packageName || !invForm.amount) {
      setInvError('Fill in Billing Name, State, Package Name and Amount to preview.'); return;
    }
    setInvBusy(true); setInvError('');
    try {
      const res = await api.post('/admin/invoices/preview', buildInvPayload(), { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      const msg = err.response?.data instanceof Blob
        ? await err.response.data.text().then(t => { try { return JSON.parse(t).message; } catch { return t; } })
        : err.response?.data?.message || err.message;
      setInvError(msg || 'Preview failed');
    }
    setInvBusy(false);
  };

  const handleSave = async (sendMail) => {
    if (!invForm.billingName || !invForm.billingState || !invForm.packageName || !invForm.amount) {
      setInvError('Fill in Billing Name, State, Package Name and Amount.'); return;
    }
    if (sendMail && !invForm.email) { setInvError('Email is required to send the invoice.'); return; }
    setInvBusy(true); setInvError(''); setInvSuccess(''); setInvPdfUrl('');
    try {
      const { data } = await api.post('/admin/invoices/create', { ...buildInvPayload(), sendEmail: sendMail });
      setInvSuccess(`Invoice ${data.invoiceNumber} saved.${sendMail ? ' Sent to ' + invForm.email + '.' : ''}`);
      setInvPdfUrl(data.pdfUrl || '');
    } catch (err) {
      setInvError(err.response?.data?.message || err.message || 'Failed');
    }
    setInvBusy(false);
  };

  const handleSendMail = async () => {
    if (!selectedUserId) { setMailError('Please select a user first.'); return; }
    const selectedUser = users.find(u => u._id === selectedUserId);
    if (!selectedUser?.email) { setMailError('Selected user does not have an email address.'); return; }
    const selectedMail = mailTypes.find(m => m.value === selectedMailType);
    const actionLabel = selectedMail?.label || selectedMailType;
    const serviceForMail = selectedMailType === 'questionnaire-results' ? 'IA' : selectedServiceType;
    if (!window.confirm(`Send ${actionLabel} to ${selectedUser.name || selectedUser.email} using ${serviceForMail} mail?`)) return;
    setMailSending(true); setMailError(null); setMailResult(null);
    try {
      const response = await adminAPI.sendAdminMail({ userId: selectedUserId, mailType: selectedMailType, serviceType: serviceForMail });
      setMailResult([response?.message, response?.warning].filter(Boolean).join(' ') || `${actionLabel} sent to ${selectedUser.email}`);
    } catch (err) { setMailError(err.message || 'Failed to send mail'); }
    finally { setMailSending(false); }
  };

  const card = (children, extra = {}) => ({
    background: '#fff', borderRadius: '12px', border: '1px solid #e9ecef',
    padding: '1.75rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    ...extra,
  });

  const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' };
  const inputStyle = { width: '100%', padding: '0.7rem 0.8rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box' };

  return (
    <div className="admin-section">

      {/* ── Mail Center ────────────────────────────────────────────────── */}
      <div style={card()}>
        <h3 style={{ margin: '0 0 0.4rem', color: '#1e293b', fontSize: '1.05rem' }}>📧 Mail Center</h3>
        <p style={{ color: '#6c757d', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>Send any supported mail template from one place.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Recipient</label>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} disabled={usersLoading} style={inputStyle}>
              <option value="">Select a user</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email} {u.email ? `(${u.email})` : ''}</option>)}
            </select>
            {usersLoading && <div style={{ fontSize: '0.78rem', color: '#6c757d', marginTop: '0.35rem' }}>Loading users…</div>}
            {usersError && <div style={{ fontSize: '0.78rem', color: '#dc3545', marginTop: '0.35rem' }}>{usersError}</div>}
          </div>
          <div>
            <label style={labelStyle}>Mail Type</label>
            <select value={selectedMailType} onChange={e => setSelectedMailType(e.target.value)} disabled={mailTypesLoading} style={inputStyle}>
              {mailTypes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {mailTypesLoading && <div style={{ fontSize: '0.78rem', color: '#6c757d', marginTop: '0.35rem' }}>Loading mail types…</div>}
            {mailTypesError && <div style={{ fontSize: '0.78rem', color: '#dc3545', marginTop: '0.35rem' }}>{mailTypesError}</div>}
          </div>
          <div>
            <label style={labelStyle}>Service Type</label>
            <select value={selectedServiceType} onChange={e => setSelectedServiceType(e.target.value)} disabled={selectedMailType === 'questionnaire-results'} style={inputStyle}>
              <option value="RA">RA</option>
              <option value="IA">IA</option>
            </select>
            {selectedMailType === 'questionnaire-results' && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>Questionnaire results always use IA mail.</div>}
          </div>
          <div>
            <button onClick={handleSendMail} disabled={mailSending || !selectedUserId} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: mailSending ? '#94a3b8' : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)', color: '#fff', fontWeight: 700, cursor: mailSending ? 'not-allowed' : 'pointer' }}>
              {mailSending ? 'Sending…' : 'Send Mail'}
            </button>
          </div>
        </div>
        {mailError && <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f8d7da', color: '#721c24', borderRadius: '8px', fontSize: '0.85rem' }}>⚠ {mailError}</div>}
        {mailResult && <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#d4edda', color: '#155724', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>✓ {mailResult}</div>}
      </div>

      {/* ── Invoice Generator ───────────────────────────────────────────── */}
      <div style={card()}>
        <h3 style={{ margin: '0 0 0.4rem', color: '#1e293b', fontSize: '1.05rem' }}>🧾 Invoice Generator</h3>
        <p style={{ color: '#6c757d', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
          Select a user to auto-fill details, adjust any field, then preview, save, or send the invoice.
        </p>

        {/* User picker */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Select User (auto-fill)</label>
          <select value={invUserId} onChange={handleInvUserChange} disabled={usersLoading} style={inputStyle}>
            <option value="">— select a user or fill manually —</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name || u.email} {u.email ? `(${u.email})` : ''}</option>)}
          </select>
          {invUserLoading && <div style={{ fontSize: '0.78rem', color: '#6c757d', marginTop: '0.35rem' }}>Loading user details…</div>}
        </div>

        {/* Service type toggle */}
        <div style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
          {['RA', 'IA'].map(t => (
            <label key={t} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${invForm.serviceType === t ? '#2563eb' : '#e2e8f0'}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: invForm.serviceType === t ? '#2563eb' : '#64748b', background: invForm.serviceType === t ? '#eff6ff' : '#fff' }}>
              <input type="radio" name="inv-serviceType" value={t} checked={invForm.serviceType === t} onChange={e => invField('serviceType', e.target.value)} style={{ accentColor: '#2563eb' }} />
              {t === 'RA' ? 'Research Analyst (RA)' : 'Investment Advisor (IA)'}
            </label>
          ))}
        </div>

        {/* Fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          {[
            { key: 'billingName', label: 'Billing Name *', ph: 'Full legal name' },
            { key: 'email', label: 'Email', ph: 'user@example.com', type: 'email' },
            { key: 'phone', label: 'Phone', ph: '+91 98765 43210' },
            { key: 'pan', label: 'PAN', ph: 'ABCDE1234F' },
            { key: 'packageName', label: 'Package Name *', ph: 'e.g. Research Pro' },
            { key: 'duration', label: 'Duration', ph: 'e.g. 1 Month' },
            { key: 'transactionId', label: 'Transaction ID', ph: 'Razorpay ID or UTR' },
            { key: 'amount', label: 'Amount (₹) *', ph: '0', type: 'number' },
            { key: 'coupon', label: 'Coupon Discount (₹)', ph: '0', type: 'number' },
          ].map(({ key, label, ph, type = 'text' }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input type={type} value={invForm[key]} onChange={e => invField(key, e.target.value)} placeholder={ph} style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>State *</label>
            <select value={invForm.billingState} onChange={e => invField('billingState', e.target.value)} style={inputStyle}>
              <option value="">Select state</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Error / Success banners */}
        {invError && <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: '1rem' }}>⚠ {invError}</div>}
        {invSuccess && (
          <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontSize: 13, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>✓ {invSuccess}</span>
            {invPdfUrl && <a href={invPdfUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>View Saved PDF →</a>}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handlePreview} disabled={invBusy}
            style={{ padding: '0.7rem 1.2rem', borderRadius: 8, border: '1.5px solid #6366f1', background: '#fff', color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: invBusy ? 'not-allowed' : 'pointer', opacity: invBusy ? 0.6 : 1 }}>
            👁 Preview PDF
          </button>
          <button onClick={() => handleSave(false)} disabled={invBusy}
            style={{ padding: '0.7rem 1.2rem', borderRadius: 8, border: '1.5px solid #0f172a', background: '#fff', color: '#0f172a', fontWeight: 700, fontSize: 13, cursor: invBusy ? 'not-allowed' : 'pointer', opacity: invBusy ? 0.6 : 1 }}>
            {invBusy ? 'Working…' : '💾 Save Invoice'}
          </button>
          <button onClick={() => handleSave(true)} disabled={invBusy}
            style={{ padding: '0.7rem 1.2rem', borderRadius: 8, border: 'none', background: invBusy ? '#94a3b8' : 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: invBusy ? 'not-allowed' : 'pointer' }}>
            {invBusy ? 'Working…' : '📨 Save & Send to Email'}
          </button>
        </div>
      </div>

    </div>
  );
};


const AdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // AdminRoute already verified the user is admin, so no need to redirect here.
  // Just fetch dashboard data if user is available.

  useEffect(() => {
    // Fetch dashboard data when component mounts and currentUser is available
    if (!currentUser) return;
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getDashboard();
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser]);
  
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/');
    }
  };
  
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-dashboard" style={{ width: '100%', margin: 0, padding: 0 }}>
      <div className="admin-sidebar">
        <div className="admin-logo">
          <h2>InvestKaps</h2>
          <span className="admin-badge">Admin</span>
        </div>
        
        <nav className="admin-nav">
          <ul>
            <li className={activeTab === 'overview' ? 'active' : ''}>
              <button onClick={() => setActiveTab('overview')}>Overview</button>
            </li>
            <li className={activeTab === 'users' ? 'active' : ''}>
              <button onClick={() => setActiveTab('users')}>Users</button>
            </li>
            <li className={activeTab === 'kyc' ? 'active' : ''}>
              <button onClick={() => setActiveTab('kyc')}>KYC Verifications</button>
            </li>
            <li className={activeTab === 'subscriptions' ? 'active' : ''}>
              <button onClick={() => setActiveTab('subscriptions')}>Subscriptions</button>
            </li>
            <li className={activeTab === 'strategies' ? 'active' : ''}>
              <button onClick={() => setActiveTab('strategies')}>Strategies</button>
            </li>
            <li className={activeTab === 'recommendations' ? 'active' : ''}>
              <button onClick={() => setActiveTab('recommendations')}>Stock Recommendations</button>
            </li>
            <li className={activeTab === 'payment-approval' ? 'active' : ''}>
              <button onClick={() => setActiveTab('payment-approval')}>Payment Approval</button>
            </li>
            <li className={activeTab === 'documents' ? 'active' : ''}>
              <button onClick={() => setActiveTab('documents')}>📄 Documents</button>
            </li>
            <li className={activeTab === 'testimonials' ? 'active' : ''}>
              <button onClick={() => setActiveTab('testimonials')}>Testimonials</button>
            </li>
            <li className={activeTab === 'questionnaire-management' ? 'active' : ''}>
              <button onClick={() => setActiveTab('questionnaire-management')}>Questionnaires</button>
            </li>
            <li className={activeTab === 'questionnaire-responses' ? 'active' : ''}>
              <button onClick={() => setActiveTab('questionnaire-responses')}>Responses</button>
            </li>
            <li className={activeTab === 'model-portfolios' ? 'active' : ''}>
              <button onClick={() => setActiveTab('model-portfolios')}>Model Portfolios</button>
            </li>
            <li className={activeTab === 'settings' ? 'active' : ''}>
              <button onClick={() => setActiveTab('settings')}>Settings</button>
            </li>
          </ul>
        </nav>
        
        <div className="admin-user-info">
          <div className="admin-user-name">{currentUser?.name}</div>
          <div className="admin-user-email">{currentUser?.email}</div>
          <button className="admin-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      
      <div className="admin-content">
        <div className="admin-header">
          <h1>
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'users' && 'User Management'}
            {activeTab === 'kyc' && 'KYC Verifications'}
            {activeTab === 'subscriptions' && 'Subscription Management'}
            {activeTab === 'strategies' && 'Strategy Management'}
            {activeTab === 'recommendations' && 'Stock Recommendations'}
            {activeTab === 'payment-approval' && 'Payment Approval'}
            {activeTab === 'documents' && '📄 E-Sign Documents'}
            {activeTab === 'questionnaire-management' && 'Questionnaire Management'}
            {activeTab === 'questionnaire-responses' && 'Questionnaire Responses'}
            {activeTab === 'settings' && 'Admin Settings'}
            {activeTab === 'testimonials' && 'Testimonials'}
            {activeTab === 'model-portfolios' && 'Model Portfolios'}
          </h1>
          <div className="admin-header-actions">
            <span className="admin-date">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}
        
        {activeTab === 'overview' && dashboardData && (
          <div className="admin-overview">
            <div className="admin-stats">
              <div className="admin-stat-card">
                <h3>Total Users</h3>
                <div className="admin-stat-value">{dashboardData.counts.users}</div>
              </div>
              <div className="admin-stat-card">
                <h3>KYC Verifications</h3>
                <div className="admin-stat-value">{dashboardData.counts.kyc}</div>
              </div>
              <div className="admin-stat-card">
                <h3>Documents</h3>
                <div className="admin-stat-value">{dashboardData.counts.documents}</div>
              </div>
            </div>
            
            <div className="admin-recent-section">
              <h2>Recent Users</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>KYC Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentUsers.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`status-badge ${user.kycStatus?.isVerified ? 'verified' : 'pending'}`}>
                            {user.kycStatus?.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="admin-recent-section">
              <h2>Recent KYC Verifications</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>PAN</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentKyc.map((kyc) => (
                      <tr key={kyc._id}>
                        <td>{kyc.user?.name || 'Unknown'}</td>
                        <td>{kyc.pan}</td>
                        <td>
                          <span className={`status-badge ${kyc.status === 'success' ? 'verified' : 'failed'}`}>
                            {kyc.status === 'success' ? 'Success' : 'Failed'}
                          </span>
                        </td>
                        <td>{new Date(kyc.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'users' && <UserManagement />}
        
        {activeTab === 'kyc' && <KycManagement />}
        
        {activeTab === 'subscriptions' && <SubscriptionManagement />}
        
        {activeTab === 'strategies' && <StrategyManagement />}
        
        {activeTab === 'recommendations' && <StockRecommendationManagement />}
        
        {activeTab === 'payment-approval' && <PaymentApproval />}
        
        {activeTab === 'documents' && <EsignManagement />}
        
        {activeTab === 'questionnaire-management' && <QuestionnaireManagement />}
        
        {activeTab === 'questionnaire-responses' && <QuestionnaireResponses />}
        
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
        {activeTab === 'testimonials' && (
          <TestimonialsManagement />
        )}
        {activeTab === 'model-portfolios' && (
          <ModelPortfolioManagement />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
