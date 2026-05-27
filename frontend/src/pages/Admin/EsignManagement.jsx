import React, { useState, useEffect, useCallback } from 'react';
import { esignAPI } from '../../services/api';
import './AdminDashboard.css';

/* ─────────────────────────── helpers ──────────────────────────── */
const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

const STATUS_META = {
  COMPLETED : { label: 'Completed',  bg: '#d4edda', color: '#155724' },
  SIGNED    : { label: 'Signed',     bg: '#d4edda', color: '#155724' },
  SENT      : { label: 'Sent',       bg: '#cce5ff', color: '#004085' },
  REJECTED  : { label: 'Rejected',   bg: '#f8d7da', color: '#721c24' },
  EXPIRED   : { label: 'Expired',    bg: '#e9ecef', color: '#495057' },
  INACTIVE  : { label: 'Inactive',   bg: '#e9ecef', color: '#495057' },
  pending   : { label: 'Pending',    bg: '#fff3cd', color: '#856404' },
  completed : { label: 'Completed',  bg: '#d4edda', color: '#155724' },
  failed    : { label: 'Failed',     bg: '#f8d7da', color: '#721c24' },
};

function StatusBadge({ status }) {
  const s = String(status || '').toUpperCase();
  const meta = STATUS_META[s] || STATUS_META[status] || { label: status || 'Unknown', bg: '#e9ecef', color: '#495057' };
  return (
    <span style={{
      background: meta.bg, color: meta.color,
      padding: '0.2rem 0.65rem', borderRadius: '12px',
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

/* ─────────────────────────── component ────────────────────────── */
const EsignManagement = () => {
  const [documents, setDocuments]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [fetchingId, setFetchingId]   = useState(null);
  const [fetchMsgMap, setFetchMsgMap] = useState({});   // docId → { type: 'ok'|'err', text }
  const [expanded, setExpanded]       = useState(null); // expanded doc _id

  // Filters
  const [filterStatus, setFilterStatus]           = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterPdf, setFilterPdf]                 = useState('');
  const [search, setSearch]                       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (filterStatus)      filters.status      = filterStatus;
      if (filterServiceType) filters.serviceType = filterServiceType;
      if (filterPdf)         filters.hasPdf      = filterPdf === 'yes';

      const res = await esignAPI.adminGetAllDocuments(filters);
      setDocuments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterServiceType, filterPdf]);

  useEffect(() => { load(); }, [load]);

  /* ── fetch PDF action ── */
  const handleFetchPdf = async (doc) => {
    setFetchingId(doc._id);
    setFetchMsgMap(m => ({ ...m, [doc._id]: null }));
    try {
      const res = await esignAPI.adminFetchSignedPdf(doc._id);
      if (res.success) {
        setDocuments(prev => prev.map(d =>
          d._id === doc._id
            ? { ...d, esign: { ...d.esign, signedPdfUrl: res.url, signedPdfFetchedBy: res.fetchedBy, signedPdfFetchedAt: new Date().toISOString() } }
            : d
        ));
        setFetchMsgMap(m => ({ ...m, [doc._id]: { type: 'ok', text: 'PDF fetched and stored successfully.' } }));
      } else {
        setFetchMsgMap(m => ({ ...m, [doc._id]: { type: 'err', text: res.error || 'Fetch failed.' } }));
      }
    } catch (err) {
      setFetchMsgMap(m => ({ ...m, [doc._id]: { type: 'err', text: err.message || 'Fetch failed.' } }));
    } finally {
      setFetchingId(null);
    }
  };

  /* ── filtered list ── */
  const filtered = documents.filter(doc => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      doc.user?.name?.toLowerCase().includes(q) ||
      doc.user?.email?.toLowerCase().includes(q) ||
      doc.esign?.documentId?.toLowerCase().includes(q) ||
      doc.esign?.irn?.toLowerCase().includes(q) ||
      doc.name?.toLowerCase().includes(q)
    );
  });

  /* ── stats ── */
  const totalDocs      = documents.length;
  const completed      = documents.filter(d => ['COMPLETED', 'completed'].includes(d.esign?.status)).length;
  const pdfFetched     = documents.filter(d => d.esign?.signedPdfUrl).length;
  const pendingFetch   = documents.filter(d => ['COMPLETED', 'completed'].includes(d.esign?.status) && !d.esign?.signedPdfUrl).length;

  /* ═══════════════════════════ render ══════════════════════════ */
  return (
    <div className="admin-section">

      {/* ── Stats strip ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Documents', value: totalDocs,    color: '#3c4fe0', bg: '#e8f0fe' },
          { label: 'Completed',       value: completed,    color: '#155724', bg: '#d4edda' },
          { label: 'PDF Fetched',     value: pdfFetched,   color: '#0a6640', bg: '#e6f9f0' },
          { label: 'Pending Fetch',   value: pendingFetch, color: '#7c5700', bg: '#fff8e1' },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1 1 140px', background: s.bg, borderRadius: '10px',
            padding: '0.9rem 1.2rem', border: `1px solid ${s.bg}`,
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: s.color, opacity: 0.8, marginTop: '0.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="admin-filters" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="admin-search" style={{ flex: '1 1 200px' }}>
          <input
            type="text"
            placeholder="Search by user name, email, doc ID, IRN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div className="admin-filter-group" style={{ flex: '0 0 auto', display: 'flex', gap: '0.5rem' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="SIGNED">Signed</option>
            <option value="SENT">Sent</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
            <option value="pending">Pending</option>
          </select>

          <select value={filterServiceType} onChange={e => setFilterServiceType(e.target.value)}>
            <option value="">All Types</option>
            <option value="RA">RA</option>
            <option value="IA">IA</option>
          </select>

          <select value={filterPdf} onChange={e => setFilterPdf(e.target.value)}>
            <option value="">PDF: Any</option>
            <option value="yes">PDF: Fetched</option>
            <option value="no">PDF: Not Fetched</option>
          </select>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '0.4rem 1rem', borderRadius: '6px',
              background: '#3c4fe0', color: '#fff', border: 'none',
              fontWeight: 600, fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '↻' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="admin-error" style={{ marginBottom: '1rem' }}>⚠ {error}</div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="admin-loading-inline">
          <div className="spinner-small" /><span>Loading documents…</span>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && filtered.length === 0 && (
        <div className="admin-empty-state">
          <p>No documents match your filters.</p>
        </div>
      )}

      {/* ── Document cards ── */}
      {!loading && filtered.map(doc => {
        const es          = doc.esign || {};
        const rawStatus   = es.status || es.currentStatus || 'Unknown';
        const isCompleted = ['COMPLETED', 'completed'].includes(rawStatus);
        const hasPdf      = !!es.signedPdfUrl;
        const isFetching  = fetchingId === doc._id;
        const isExpanded  = expanded === doc._id;
        const msg         = fetchMsgMap[doc._id];

        return (
          <div key={doc._id} style={{
            background: '#fff',
            border: '1px solid #e9ecef',
            borderLeft: `4px solid ${hasPdf ? '#28a745' : isCompleted ? '#ffc107' : '#dee2e6'}`,
            borderRadius: '10px',
            marginBottom: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>

            {/* ── Card header (always visible) ── */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.9rem 1.25rem', cursor: 'pointer', flexWrap: 'wrap',
              }}
              onClick={() => setExpanded(isExpanded ? null : doc._id)}
            >
              {/* Expand arrow */}
              <span style={{ color: '#adb5bd', fontSize: '0.75rem', flexShrink: 0 }}>
                {isExpanded ? '▼' : '▶'}
              </span>

              {/* User */}
              <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.93rem', color: '#2c3e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.user?.name || '—'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6c757d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.user?.email || '—'}
                </div>
              </div>

              {/* Doc name */}
              <div style={{ flex: '2 1 200px', minWidth: 0, fontSize: '0.87rem', color: '#495057', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.name}
              </div>

              {/* Service type pill */}
              {doc.serviceType && (
                <span style={{
                  flexShrink: 0, background: '#e8f0fe', color: '#3c4fe0',
                  fontSize: '0.68rem', fontWeight: 700,
                  padding: '0.15rem 0.55rem', borderRadius: '10px',
                }}>
                  {doc.serviceType}
                </span>
              )}

              {/* Status */}
              <div style={{ flexShrink: 0 }}>
                <StatusBadge status={rawStatus} />
              </div>

              {/* PDF status */}
              <div style={{ flexShrink: 0 }}>
                {hasPdf ? (
                  <span style={{
                    background: '#e6f9f0', color: '#0a6640',
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '0.15rem 0.55rem', borderRadius: '10px',
                  }}>
                    📄 PDF Ready
                  </span>
                ) : isCompleted ? (
                  <span style={{
                    background: '#fff8e1', color: '#7c5700',
                    fontSize: '0.68rem', fontWeight: 700,
                    padding: '0.15rem 0.55rem', borderRadius: '10px',
                  }}>
                    ⏳ PDF Pending
                  </span>
                ) : null}
              </div>

              {/* Date */}
              <div style={{ flexShrink: 0, fontSize: '0.78rem', color: '#adb5bd' }}>
                {fmtDate(doc.createdAt)}
              </div>
            </div>

            {/* ── Expanded detail ── */}
            {isExpanded && (
              <div style={{
                borderTop: '1px solid #f0f0f0',
                padding: '1rem 1.25rem',
                background: '#fafbfc',
              }}>

                {/* Detail grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '0.75rem 1.5rem',
                  fontSize: '0.83rem',
                  color: '#495057',
                  marginBottom: '1rem',
                }}>
                  <Detail label="Created"          value={fmt(doc.createdAt)} />
                  <Detail label="Leegality Doc ID" value={es.documentId} mono />
                  <Detail label="IRN"              value={es.irn} mono />
                  {es.signedAt    && <Detail label="Signed At"    value={fmt(es.signedAt)} />}
                  {es.completedAt && <Detail label="Completed At" value={fmt(es.completedAt)} />}
                  {es.signingDetails && (
                    <Detail label="Signers"
                      value={`${es.signingDetails.signed}/${es.signingDetails.total} signed`}
                    />
                  )}
                  {hasPdf && <Detail label="PDF Fetched By" value={es.signedPdfFetchedBy} />}
                  {hasPdf && <Detail label="PDF Fetched At" value={fmt(es.signedPdfFetchedAt)} />}
                </div>

                {/* Invitees */}
                {es.invitees?.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Signatories
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {es.invitees.map((inv, i) => (
                        <span key={i} style={{
                          fontSize: '0.8rem', padding: '0.25rem 0.7rem',
                          borderRadius: '6px', border: '1px solid #dee2e6',
                          background: inv.signed ? '#d4edda' : '#fff3cd',
                          color: inv.signed ? '#155724' : '#856404',
                        }}>
                          {inv.name || inv.email} {inv.signed ? '✓' : '⏳'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fetch / View / Download actions */}
                {msg && (
                  <div style={{
                    marginBottom: '0.75rem', padding: '0.5rem 0.85rem',
                    borderRadius: '6px', fontSize: '0.82rem', fontWeight: 500,
                    background: msg.type === 'ok' ? '#d4edda' : '#f8d7da',
                    color:      msg.type === 'ok' ? '#155724' : '#721c24',
                  }}>
                    {msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {hasPdf ? (
                    <>
                      <a
                        href={es.signedPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={actionBtn('#e8f4fd', '#1a73c8')}
                      >
                        👁 View Agreement
                      </a>
                      <a
                        href={`${es.signedPdfUrl}?fl_attachment=1`}
                        download
                        style={actionBtn('#e6f9f0', '#0a6640')}
                      >
                        ⬇ Download PDF
                      </a>
                    </>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleFetchPdf(doc)}
                      disabled={isFetching}
                      style={{
                        ...actionBtn('#fff8e1', '#7c5700'),
                        border: '1px solid #ffe082',
                        cursor: isFetching ? 'not-allowed' : 'pointer',
                        opacity: isFetching ? 0.7 : 1,
                        background: isFetching ? '#f5f5f5' : '#fff8e1',
                      }}
                    >
                      {isFetching ? (
                        <>
                          <InlineSpinner />Fetching…
                        </>
                      ) : '📥 Fetch Signed PDF'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: '#6c757d' }}>
                      PDF available once e-signing is completed
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Result count */}
      {!loading && filtered.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#adb5bd', marginTop: '0.5rem' }}>
          Showing {filtered.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

/* ─── tiny helpers ─── */
const actionBtn = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
  padding: '0.35rem 0.9rem', borderRadius: '6px',
  background: bg, color, fontSize: '0.82rem', fontWeight: 600,
  textDecoration: 'none', border: 'none', fontFamily: 'inherit',
  cursor: 'pointer',
});

const Detail = ({ label, value, mono }) => (
  <div>
    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
      {label}
    </div>
    <div style={{
      color: '#2c3e50',
      fontFamily: mono ? "'Courier New', monospace" : 'inherit',
      fontSize: mono ? '0.8rem' : '0.85rem',
      wordBreak: 'break-all',
    }}>
      {value || '—'}
    </div>
  </div>
);

const InlineSpinner = () => (
  <span style={{
    display: 'inline-block', width: 11, height: 11, marginRight: '0.35rem',
    border: '2px solid #ffe082', borderTopColor: '#7c5700',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    verticalAlign: 'middle',
  }} />
);

export default EsignManagement;
