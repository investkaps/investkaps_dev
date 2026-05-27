import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { setupAPI, userAPI, esignAPI } from '../../services/api';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentRequests, setPaymentRequests] = useState([]);
  // Tracks which document is currently being fetched (by _id) to show spinner
  const [fetchingDocId, setFetchingDocId] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    let mounted = true;

    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        let resolvedUser = null;

        try {
          const response = await userAPI.getUserByClerkId(currentUser.id);
          if (response.success && response.user) {
            resolvedUser = response.user;
          }
        } catch (_) { /* try email fallback */ }

        if (!resolvedUser && currentUser.email) {
          const response = await userAPI.getUserByEmail(currentUser.email);
          if (response.success && response.user) {
            resolvedUser = response.user;
          }
        }

        // Backend admin-status is the final source of truth for the role label.
        let isAdminUser = false;
        try {
          const adminResponse = await setupAPI.getAdminStatus();
          isAdminUser = !!adminResponse?.data?.isAdmin;
        } catch (_) {
          isAdminUser = String(resolvedUser?.role || currentUser?.role || '').toLowerCase() === 'admin';
        }

        const finalUser = resolvedUser || currentUser;
        if (finalUser && mounted) {
          setUserDetails({
            ...finalUser,
            role: isAdminUser ? 'admin' : (finalUser.role || 'customer')
          });
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
        // If we have basic Clerk data, use it silently instead of showing an error
        if (currentUser && mounted) {
          setUserDetails(currentUser);
        } else {
          setError('Could not load your profile information. Please try again later.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchPaymentRequests = async () => {
      try {
        const token = await window.Clerk?.session?.getToken();
        if (!token) return;
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/payment-requests/my-requests`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success) setPaymentRequests(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching payment requests:', err);
      }
    };

    fetchUserDetails();
    fetchPaymentRequests();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  /**
   * One-time fetch: pulls the signed PDF from Leegality → Cloudinary.
   * On success, patches the local documents state so the UI switches to
   * View/Download without requiring a full page reload.
   */
  const handleFetchPdf = async (docId) => {
    setFetchingDocId(docId);
    setFetchError(null);
    try {
      const result = await esignAPI.fetchSignedPdf(docId);
      if (result.success && result.url) {
        // Patch local state — find the document and update its signedPdfUrl
        setUserDetails(prev => ({
          ...prev,
          documents: (prev.documents || []).map(d =>
            String(d._id) === String(docId)
              ? { ...d, esign: { ...d.esign, signedPdfUrl: result.url, signedPdfFetchedBy: result.fetchedBy } }
              : d
          )
        }));
      } else {
        setFetchError(result.error || 'Failed to fetch document. Please try again.');
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to fetch document. Please try again.');
    } finally {
      setFetchingDocId(null);
    }
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  const daysLeft = (end) => Math.max(0, Math.ceil((new Date(end) - new Date()) / 86_400_000));

  if (loading) {
    return (
      <div className="pf-page pf-loading">
        <div className="pf-spinner"></div>
        <p>Loading your profile…</p>
      </div>
    );
  }

  if (error && !userDetails) {
    return (
      <div className="pf-page pf-loading">
        <p className="pf-error-msg">{error}</p>
      </div>
    );
  }

  const kyc = userDetails?.kycStatus;
  const activeSub = userDetails?.userSubscriptions?.find(s => s.status === 'active');
  const pendingRequests = paymentRequests.filter(r => r.status !== 'approved');
  const esignDocs = (userDetails?.documents || []).filter(d => d.esign);

  const esignStatusLabel = (status) => {
    const map = { SIGNED: 'Signed', COMPLETED: 'Completed', SENT: 'Awaiting Signature',
      REJECTED: 'Rejected', EXPIRED: 'Expired', INACTIVE: 'Inactive',
      completed: 'Completed', pending: 'Pending', failed: 'Failed', expired: 'Expired' };
    return map[status] || status || 'Unknown';
  };
  const esignStatusClass = (status) => {
    if (!status) return 'pending';
    const s = status.toLowerCase();
    if (s === 'signed' || s === 'completed') return 'active';
    if (s === 'rejected' || s === 'failed') return 'rejected';
    if (s === 'expired' || s === 'inactive') return 'expired';
    return 'pending';
  };

  return (
    <div className="pf-page">
      <div className="pf-container">

        {/* Hero header */}
        <div className="pf-hero">
          <div className="pf-avatar">
            {userDetails?.name ? userDetails.name[0].toUpperCase() : 'U'}
          </div>
          <div className="pf-hero-info">
            <h1>{userDetails?.name || 'User'}</h1>
            <p className="pf-hero-email">{userDetails?.email}</p>
            <div className="pf-badges">
              <span className="pf-badge role">{String(userDetails?.role || 'customer').toLowerCase() === 'admin' ? 'Admin' : 'Customer'}</span>
              {kyc?.isVerified && <span className="pf-badge kyc-ok">KYC Verified</span>}
              {activeSub && <span className="pf-badge sub-active">Active Plan</span>}
            </div>
          </div>
        </div>

        <div className="pf-body">

          {/* Account Details */}
          <section className="pf-section">
            <h2 className="pf-section-title">Account Details</h2>
            <div className="pf-card pf-grid-2">
              <Row label="Full Name"      value={userDetails?.name} />
              <Row label="Email"          value={userDetails?.email} />
              <Row label="Phone"          value={userDetails?.profile?.phone} />
              <Row label="Role"           value={String(userDetails?.role || 'customer').toLowerCase() === 'admin' ? 'Admin' : 'Customer'} />
              <Row label="Member Since"   value={fmt(userDetails?.createdAt)} />
              <Row label="Email Verified" value="Yes" className="ok" />
            </div>
          </section>

          {/* KYC Status */}
          <section className="pf-section">
            <h2 className="pf-section-title">KYC Status</h2>
            <div className="pf-card">
              <div className="pf-kyc-status-row">
                <span className={`pf-kyc-pill ${kyc?.isVerified ? 'ok' : 'pending'}`}>
                  {kyc?.isVerified ? '✓ Verified' : '○ Not Verified'}
                </span>
                {kyc?.isVerified && kyc?.verifiedAt && (
                  <span className="pf-muted">Verified on {fmt(kyc.verifiedAt)}</span>
                )}
              </div>

              {kyc?.isVerified && (
                <div className="pf-grid-2 pf-mt">
                  <Row label="Full Name"     value={kyc.fullName} />
                  <Row label="PAN Number"    value={kyc.panNumber} />
                  <Row label="Father's Name" value={kyc.fatherName} />
                  <Row label="Date of Birth" value={kyc.dob} />
                  <Row label="Gender"        value={kyc.gender} />
                  <Row label="Nationality"   value={kyc.nationality} />
                  <Row label="KYC Mode"      value={kyc.camsData?.kycMode} />
                  <Row label="IPV Status"    value={kyc.camsData?.ipvFlag === 'Y' ? 'Completed' : 'Pending'} />
                  {kyc.address && (
                    <div className="pf-row pf-full-width">
                      <span className="pf-label">Registered Address</span>
                      <span className="pf-value">{kyc.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Subscription */}
          <section className="pf-section">
            <h2 className="pf-section-title">Subscription</h2>

            {!activeSub && pendingRequests.length === 0 && !userDetails?.userSubscriptions?.length && (
              <div className="pf-card pf-no-sub">
                <span className="pf-no-sub-icon">📋</span>
                <p>No active subscription. <a href="/#pricing" className="pf-link">View plans →</a></p>
              </div>
            )}

              {activeSub && (
                <div className="pf-card pf-card-green pf-mb">
                  <div className="pf-sub-header">
                    <div>
                      <h3 className="pf-sub-name">{activeSub.subscription?.name || 'Active Plan'}</h3>
                      <span className="pf-badge sub-active">Active</span>
                    </div>
                    <div className="pf-days-left">
                      <span className="pf-days-num">{daysLeft(activeSub.endDate)}</span>
                      <span className="pf-days-label">days left</span>
                    </div>
                  </div>
                  <div className="pf-grid-2 pf-mt">
                    <Row label="Duration"   value={activeSub.duration === 'sixMonth' ? '6 Months' : activeSub.duration} />
                    <Row label="Amount"     value={`₹${activeSub.price?.toLocaleString()}`} />
                    <Row label="Start Date" value={fmt(activeSub.startDate)} />
                    <Row label="End Date"   value={fmt(activeSub.endDate)} />
                  </div>
                </div>
              )}

              {pendingRequests.length > 0 && (
                <div className="pf-card pf-mb">
                  <h3 className="pf-card-sub-title">Payment Requests</h3>
                  {pendingRequests.map((req) => (
                    <div key={req._id} className="pf-pay-req">
                      <div className="pf-pay-req-top">
                        <div>
                          <strong>{req.planName}</strong>
                          <span className="pf-muted pf-ml">
                            {req.duration === 'sixMonth' ? '6 Months' : req.duration}
                          </span>
                        </div>
                        <span className={`pf-badge ${req.status}`}>
                          {req.status === 'pending' ? '⏳ Pending' : '✕ Rejected'}
                        </span>
                      </div>
                      <div className="pf-grid-2 pf-mt-sm">
                        <Row label="Amount"    value={`₹${req.amount?.toLocaleString()}`} />
                        <Row label="Txn ID"    value={req.transactionId} mono />
                        <Row label="Submitted" value={fmt(req.createdAt)} />
                      </div>
                      {req.status === 'pending' && (
                        <p className="pf-info-note">Payment verification usually takes 24–48 hours.</p>
                      )}
                      {req.status === 'rejected' && req.adminNotes && (
                        <p className="pf-reject-note">Reason: {req.adminNotes}</p>
                      )}
                      {req.transactionImageUrl && (
                        <a href={req.transactionImageUrl} target="_blank" rel="noopener noreferrer" className="pf-proof-link">
                          View Payment Screenshot →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {userDetails?.userSubscriptions?.length > 0 && (
                <div className="pf-card">
                  <h3 className="pf-card-sub-title">History</h3>
                  <div className="pf-table-wrap">
                    <table className="pf-table">
                      <thead>
                        <tr><th>Plan</th><th>Duration</th><th>Status</th><th>Start</th><th>End</th><th>Amount</th></tr>
                      </thead>
                      <tbody>
                        {userDetails.userSubscriptions.map((sub, i) => (
                          <tr key={i}>
                            <td><strong>{sub.subscription?.name || 'N/A'}</strong></td>
                            <td>{sub.duration === 'sixMonth' ? '6 Mo.' : sub.duration}</td>
                            <td><span className={`pf-badge ${sub.status}`}>{sub.status}</span></td>
                            <td>{fmt(sub.startDate)}</td>
                            <td>{fmt(sub.endDate)}</td>
                            <td>₹{sub.price?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

          {/* E-Signing */}
          <section className="pf-section">
            <h2 className="pf-section-title">E-Signing</h2>

            {fetchError && (
              <div className="pf-error-msg" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                ⚠ {fetchError}
              </div>
            )}

            {esignDocs.length === 0 ? (
              <div className="pf-card pf-no-sub">
                <span className="pf-no-sub-icon">✍️</span>
                <p>No e-signed documents yet.</p>
              </div>
            ) : (
              esignDocs.map((doc, i) => {
                const es = doc.esign;
                const statusClass = esignStatusClass(es.currentStatus || es.status);
                const signedAt = es.signedAt || es.invitees?.find(inv => inv.signedAt)?.signedAt;
                const completedAt = es.completedAt;
                const isCompleted =
                  ['completed', 'COMPLETED'].includes(es.status) ||
                  ['completed', 'COMPLETED'].includes(es.currentStatus);
                const hasPdf = !!es.signedPdfUrl;
                const isFetching = fetchingDocId === String(doc._id);

                return (
                  <div key={i} className={`pf-card pf-esign-card pf-mb`}>
                    <div className="pf-esign-header">
                      <div className="pf-esign-title-row">
                        <span className="pf-esign-icon">📄</span>
                        <div>
                          <strong className="pf-esign-name">{doc.name}</strong>
                          <span className="pf-muted pf-ml" style={{ textTransform: 'capitalize' }}>{doc.type}</span>
                          {doc.serviceType && (
                            <span className="pf-badge pf-ml" style={{ fontSize: '0.7rem' }}>{doc.serviceType}</span>
                          )}
                        </div>
                      </div>
                      <span className={`pf-badge ${statusClass}`}>
                        {esignStatusLabel(es.currentStatus || es.status)}
                      </span>
                    </div>

                    <div className="pf-grid-2 pf-mt-sm">
                      <Row label="Document Sent"  value={fmt(es.createdAt || doc.createdAt)} />
                      {signedAt   && <Row label="Signed On"    value={fmt(signedAt)} />}
                      {completedAt && <Row label="Completed On" value={fmt(completedAt)} />}
                      {es.documentId && <Row label="Document ID" value={es.documentId} mono />}
                      {es.irn        && <Row label="IRN"         value={es.irn} mono />}
                    </div>

                    {/* Signed PDF actions */}
                    <div className="pf-esign-links" style={{ marginTop: '0.875rem' }}>
                      {hasPdf ? (
                        // PDF already fetched — show View + Download
                        <>
                          <a
                            href={es.signedPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pf-esign-link pf-esign-link--doc"
                          >
                            👁 View Signed Agreement
                          </a>
                          <a
                            href={`${es.signedPdfUrl}?fl_attachment=1`}
                            download
                            className="pf-esign-link pf-esign-link--download"
                            style={{ marginLeft: '0.5rem' }}
                          >
                            ⬇ Download PDF
                          </a>
                          {es.signedPdfFetchedBy === 'admin' && (
                            <span className="pf-muted" style={{ display: 'block', marginTop: '0.4rem', fontSize: '0.8rem' }}>
                              Retrieved by admin
                            </span>
                          )}
                        </>
                      ) : isCompleted ? (
                        // Completed but PDF not yet fetched — show Fetch button
                        <button
                          className="pf-esign-link pf-esign-link--fetch"
                          onClick={() => handleFetchPdf(doc._id)}
                          disabled={isFetching}
                          style={{
                            cursor: isFetching ? 'not-allowed' : 'pointer',
                            opacity: isFetching ? 0.7 : 1,
                          }}
                        >
                          {isFetching ? (
                            <><span className="pf-spinner-inline" /> Fetching…</>
                          ) : (
                            '📥 Fetch Signed PDF'
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, className = '', mono = false }) => (
  <div className="pf-row">
    <span className="pf-label">{label}</span>
    <span className={`pf-value ${className} ${mono ? 'pf-mono' : ''}`}>
      {value || <span className="pf-empty">—</span>}
    </span>
  </div>
);

export default Profile;
