import React, { useState, useEffect, useCallback } from 'react';
import { referralAPI } from '../../services/api';

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatCard = ({ label, value, sub }) => (
  <div style={{
    background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e5e7eb)',
    borderRadius: '12px', padding: '1.25rem 1.5rem', flex: '1 1 160px', minWidth: 0
  }}>
    <div style={{ fontSize: '0.78rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary, #0b73ff)' }}>{value ?? '—'}</div>
    {sub && <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.25rem' }}>{sub}</div>}
  </div>
);

const Badge = ({ label, variant }) => {
  const colors = {
    rewarded: { bg: '#dcfce7', color: '#166534' },
    pending:  { bg: '#fef9c3', color: '#854d0e' },
    active:   { bg: '#dbeafe', color: '#1d4ed8' },
    expired:  { bg: '#f3f4f6', color: '#6b7280' },
  };
  const c = colors[variant] || colors.pending;
  return (
    <span style={{ ...c, padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
  );
};

export default function ReferralManagement() {
  const [tab, setTab] = useState('records'); // 'records' | 'users'
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;

  const fetchStats = useCallback(async () => {
    try { const r = await referralAPI.adminGetStats(); setStats(r.data); } catch {}
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const r = await referralAPI.adminGetAll({ search, status: statusFilter, page, limit: LIMIT });
      setRecords(r.data || []);
      setTotal(r.total || 0);
    } catch { setRecords([]); } finally { setLoading(false); }
  }, [search, statusFilter, page]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await referralAPI.adminGetUsers({ search, page, limit: LIMIT });
      setUsers(r.data || []);
      setTotal(r.total || 0);
    } catch { setUsers([]); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === 'records') fetchRecords(); else fetchUsers(); }, [tab, fetchRecords, fetchUsers]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px' }}>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <StatCard label="Total Referrals"    value={stats.totalReferrals} />
          <StatCard label="Rewarded"           value={stats.totalRewarded} />
          <StatCard label="Conversion Rate"    value={`${stats.conversionRate}%`} />
          <StatCard label="Active Referral Plans" value={stats.activeReferralPlans}
            sub={stats.referralPlanName ? `Plan: ${stats.referralPlanName}` : 'No referral plan set'} />
        </div>
      )}

      {/* Top Referrers */}
      {stats?.topReferrers?.length > 0 && (
        <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem' }}>🏆 Top Referrers</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {stats.topReferrers.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f9fafb', borderRadius: '8px', padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: '#0b73ff' }}>#{i + 1}</span>
                <span>{r.name}</span>
                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>({r.email})</span>
                <Badge label={`${r.count} referral${r.count !== 1 ? 's' : ''}`} variant="rewarded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border,#e5e7eb)' }}>
          {[['records', 'Referral Records'], ['users', 'Per-User View']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setPage(1); }} style={{
              padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, border: 'none',
              background: tab === key ? 'var(--primary,#0b73ff)' : '#fff',
              color: tab === key ? '#fff' : '#374151', cursor: 'pointer'
            }}>{label}</button>
          ))}
        </div>

        <input
          type="text" value={search} onChange={handleSearch}
          placeholder="Search name, email, code…"
          style={{ flex: '1 1 220px', padding: '0.55rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border,#e5e7eb)', fontSize: '0.875rem' }}
        />

        {tab === 'records' && (
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border,#e5e7eb)', fontSize: '0.875rem' }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="rewarded">Rewarded</option>
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading…</div>
      ) : tab === 'records' ? (

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--border,#e5e7eb)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Referrer', 'Code', 'Referred User', 'Status', 'Rewarded At', 'Plan Expiry'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No referrals found</td></tr>
              ) : records.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.referrer?.name || '—'}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>{r.referrer?.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#0b73ff' }}>{r.referralCode}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.referred?.name || '—'}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>{r.referred?.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge label={r.status === 'rewarded' ? '✓ Rewarded' : '⏳ Pending'} variant={r.status} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{fmt(r.rewardedAt)}</td>
                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                    {r.referrer?.referral?.referralPlanSub
                      ? fmt(r.referrer.referral.referralPlanSub.endDate)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (

        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--border,#e5e7eb)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['User', 'Referral Code', 'Referred By', 'Referrals', 'Rewarded', 'Plan Status', 'Plan Expiry'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No users found</td></tr>
              ) : users.map(u => {
                const planSub = u.referral?.referralPlanSub;
                const planActive = planSub?.status === 'active' && new Date(planSub?.endDate) > new Date();
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#0b73ff' }}>
                      {u.referral?.code || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                      {u.referral?.referredBy ? (
                        <><div style={{ fontWeight: 600 }}>{u.referral.referredBy.name}</div>
                        <div style={{ color: '#6b7280' }}>{u.referral.referredBy.email}</div></>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{u.referralStats?.total || 0}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{u.referralStats?.rewarded || 0}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {planSub ? (
                        <Badge label={planActive ? 'Active' : 'Expired'} variant={planActive ? 'active' : 'expired'} />
                      ) : <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Not earned</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      {planSub ? fmt(planSub.endDate) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', cursor: page === 1 ? 'default' : 'pointer' }}>
            ←
          </button>
          <span style={{ padding: '0.4rem 0.9rem', fontSize: '0.875rem' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.4rem 0.9rem', borderRadius: '6px', border: '1px solid #e5e7eb', background: page >= totalPages ? '#f9fafb' : '#fff', cursor: page >= totalPages ? 'default' : 'pointer' }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
