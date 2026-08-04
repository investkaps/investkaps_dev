import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';

const STATUSES = ['queued', 'sent', 'delivered', 'read', 'failed'];

const STATUS_COLORS = {
  queued: { bg: '#f3f4f6', color: '#4b5563' },
  sent: { bg: '#dbeafe', color: '#1d4ed8' },
  delivered: { bg: '#dcfce7', color: '#166534' },
  read: { bg: '#e0e7ff', color: '#3730a3' },
  failed: { bg: '#fee2e2', color: '#991b1b' },
};

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.queued;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: '0.2rem 0.65rem',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {status || '—'}
    </span>
  );
};

const TypeLabel = ({ type }) => (
  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
    {type?.replace(/_/g, ' ') || '—'}
  </span>
);

export default function WhatsAppManagement() {
  const [view, setView] = useState('messages'); // messages | templates | test
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const LIMIT = 20;

  const [testType, setTestType] = useState('welcome');
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.notificationType = typeFilter;
      if (phoneFilter) params.to = phoneFilter;
      const res = await adminAPI.getWhatsAppMessages(params);
      setMessages(res.data || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, phoneFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAPI.getWhatsAppTemplates();
        if (cancelled) return;
        const list = res.data || [];
        setTemplates(list);
        if (list.length) {
          setTestType((prev) => (list.some((t) => t.key === prev) ? prev : list[0].key));
        }
      } catch {
        if (!cancelled) setTemplates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (view === 'messages') fetchMessages();
  }, [view, fetchMessages]);

  const applyPhoneSearch = (e) => {
    e.preventDefault();
    setPhoneFilter(phoneInput.trim());
    setPage(1);
  };

  const handleTestSend = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      setTestError('Enter a phone number (with country code, e.g. 9198XXXXXXXX)');
      return;
    }
    setTestSending(true);
    setTestError('');
    setTestResult(null);
    try {
      const res = await adminAPI.sendWhatsAppTest({
        notificationType: testType,
        phone: testPhone.trim(),
      });
      setTestResult(res);
      if (view === 'messages') fetchMessages();
    } catch (err) {
      setTestError(err.message || 'Send failed');
    } finally {
      setTestSending(false);
    }
  };

  const notificationTypes =
    templates.length > 0
      ? templates.map((t) => t.key)
      : [
          'welcome',
          'subscription_activated',
          'payment_successful',
          'payment_failed',
          'subscription_expiring',
          'subscription_renewal',
          'recommendation_new',
          'recommendation_update',
        ];

  return (
    <div style={{ padding: '0 0 2rem', maxWidth: 1200 }}>
      <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: 14 }}>
        Outbound WhatsApp delivery log, registered templates, and a test sender for Meta template validation.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 0,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          marginBottom: '1.25rem',
          width: 'fit-content',
        }}
      >
        {[
          ['messages', 'Message log'],
          ['templates', 'Templates'],
          ['test', 'Test send'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            style={{
              padding: '0.55rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              background: view === key ? '#0f172a' : '#fff',
              color: view === key ? '#fff' : '#374151',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'messages' && (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
              alignItems: 'center',
            }}
          >
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={selectStyle}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              style={selectStyle}
            >
              <option value="">All types</option>
              {notificationTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <form onSubmit={applyPhoneSearch} style={{ display: 'flex', gap: 8, flex: '1 1 220px' }}>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Filter by phone…"
                style={inputStyle}
              />
              <button type="submit" style={btnSecondary}>
                Search
              </button>
              {(phoneFilter || statusFilter || typeFilter) && (
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => {
                    setPhoneInput('');
                    setPhoneFilter('');
                    setStatusFilter('');
                    setTypeFilter('');
                    setPage(1);
                  }}
                >
                  Clear
                </button>
              )}
            </form>

            <button type="button" onClick={fetchMessages} style={btnSecondary}>
              Refresh
            </button>
          </div>

          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            {total} message{total !== 1 ? 's' : ''}
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading…</div>
          ) : (
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                overflow: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['When', 'To', 'User', 'Type', 'Template', 'Status', 'Details'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: '#374151',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                        No WhatsApp messages found
                      </td>
                    </tr>
                  ) : (
                    messages.map((m) => {
                      const open = expandedId === m._id;
                      return (
                        <React.Fragment key={m._id}>
                          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                              {fmt(m.createdAt)}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'ui-monospace, monospace' }}>
                              {m.to}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {m.user ? (
                                <>
                                  <div style={{ fontWeight: 600 }}>{m.user.name || '—'}</div>
                                  <div style={{ fontSize: 12, color: '#6b7280' }}>{m.user.email}</div>
                                </>
                              ) : (
                                <span style={{ color: '#9ca3af' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <TypeLabel type={m.notificationType} />
                            </td>
                            <td
                              style={{
                                padding: '0.75rem 1rem',
                                fontFamily: 'ui-monospace, monospace',
                                fontSize: '0.8rem',
                              }}
                            >
                              {m.templateName}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <StatusBadge status={m.status} />
                              {m.failureReason && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: 11,
                                    color: '#991b1b',
                                    maxWidth: 180,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={m.failureReason}
                                >
                                  {m.failureReason}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <button
                                type="button"
                                onClick={() => setExpandedId(open ? null : m._id)}
                                style={btnGhost}
                              >
                                {open ? 'Hide' : 'View'}
                              </button>
                            </td>
                          </tr>
                          {open && (
                            <tr style={{ background: '#f8fafc' }}>
                              <td colSpan={7} style={{ padding: '1rem 1.25rem', fontSize: 13 }}>
                                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                                  <div>
                                    <strong>Message ID (wamid)</strong>
                                    <div style={{ fontFamily: 'ui-monospace, monospace', marginTop: 4, wordBreak: 'break-all' }}>
                                      {m.messageId || '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>Failure</strong>
                                    <div style={{ marginTop: 4, color: m.failureReason ? '#991b1b' : '#6b7280' }}>
                                      {m.failureReason || '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <strong>Body params</strong>
                                    <pre
                                      style={{
                                        margin: '4px 0 0',
                                        background: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 6,
                                        padding: 8,
                                        fontSize: 12,
                                        overflow: 'auto',
                                      }}
                                    >
                                      {JSON.stringify(m.params || [], null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <strong>Status history</strong>
                                    {m.statusHistory?.length ? (
                                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                                        {m.statusHistory.map((h, i) => (
                                          <li key={i} style={{ marginBottom: 2 }}>
                                            <StatusBadge status={h.status} />{' '}
                                            <span style={{ color: '#6b7280' }}>{fmt(h.timestamp)}</span>
                                            {(h.errorTitle || h.errorMessage) && (
                                              <span style={{ color: '#991b1b', marginLeft: 6 }}>
                                                {[h.errorTitle, h.errorMessage].filter(Boolean).join(' — ')}
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <div style={{ marginTop: 4, color: '#9ca3af' }}>No history yet</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={btnSecondary}
              >
                Prev
              </button>
              <span style={{ fontSize: 14, color: '#374151' }}>
                Page {page} of {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                style={btnSecondary}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {view === 'templates' && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            overflow: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Key', 'Meta template name', 'Language', 'Category', 'Enabled'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                    No templates registered
                  </td>
                </tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'ui-monospace, monospace' }}>
                      {t.key}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                      {t.templateName}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{t.language}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{t.category}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          background: t.enabled ? '#dcfce7' : '#f3f4f6',
                          color: t.enabled ? '#166534' : '#6b7280',
                          padding: '0.2rem 0.65rem',
                          borderRadius: 999,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {t.enabled ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'test' && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
            maxWidth: 480,
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem', fontSize: 16 }}>Send test template</h3>
          <p style={{ margin: '0 0 1.25rem', fontSize: 13, color: '#64748b' }}>
            Uses sample context values. In Meta Dev mode, the number must be a registered test recipient.
          </p>
          <form onSubmit={handleTestSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Notification type
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                style={{ ...selectStyle, fontWeight: 400 }}
              >
                {notificationTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                    {templates.find((x) => x.key === t)
                      ? ` → ${templates.find((x) => x.key === t).templateName}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Phone (E.164 digits, no +)
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="9198XXXXXXXX"
                style={{ ...inputStyle, fontWeight: 400 }}
              />
            </label>
            {testError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: 8, fontSize: 13 }}>
                {testError}
              </div>
            )}
            {testResult && (
              <div
                style={{
                  background: testResult.success ? '#f0fdf4' : '#fff7ed',
                  color: testResult.success ? '#166534' : '#9a3412',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {testResult.success ? 'Accepted by API' : 'Send did not succeed'}
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {JSON.stringify(testResult.data || testResult, null, 2)}
                </pre>
              </div>
            )}
            <button
              type="submit"
              disabled={testSending}
              style={{
                ...btnPrimary,
                opacity: testSending ? 0.7 : 1,
                cursor: testSending ? 'wait' : 'pointer',
              }}
            >
              {testSending ? 'Sending…' : 'Send test'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  flex: 1,
  padding: '0.55rem 0.9rem',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: '0.875rem',
};

const selectStyle = {
  padding: '0.55rem 0.75rem',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: '0.875rem',
  background: '#fff',
};

const btnSecondary = {
  padding: '0.55rem 0.9rem',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  color: '#374151',
};

const btnGhost = {
  padding: '0.35rem 0.65rem',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  color: '#0b73ff',
};

const btnPrimary = {
  padding: '0.7rem 1.1rem',
  borderRadius: 8,
  border: 'none',
  background: '#0f172a',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
};
