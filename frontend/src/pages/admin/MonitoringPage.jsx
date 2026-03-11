import { useCallback, useEffect, useRef, useState } from 'react'
import { adminGetStats, adminGetAuditLogs } from '../../lib/api'
import { useAdmin } from '../../context/AdminContext'

// Helpers 

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const OUTCOME_STYLES = {
  success:  { color: '#4ade80', bg: 'rgba(34,197,94,0.09)',  border: 'rgba(34,197,94,0.2)'  },
  failure:  { color: '#f87171', bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.2)'  },
  inactive: { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.2)' },
}

const EVENT_OPTIONS = [
  'login_success', 'login_failure', 'account_locked',
  'token_issued', 'client_auth_failure',
  'refresh_token_rotated', 'refresh_token_invalid',
  'introspection_called',
]

// Subcomponents

function StatCard({ label, primary, breakdown, icon, accentColor = '#3b82f6' }) {
  return (
    <div className="card p-5 flex flex-col gap-3 relative overflow-hidden group">
      {/* Subtle glow corner */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}22, transparent 70%)` }} />

      <div className="flex items-start justify-between">
        <div className="text-[10px] font-mono tracking-widest uppercase"
          style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: accentColor }}>//</span> {label}
        </div>
        <div className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: `${accentColor}18`, color: accentColor }}>
          {icon}
        </div>
      </div>

      <div className="font-display font-bold text-4xl text-white tabular-nums leading-none">
        {primary ?? <span className="text-slate-700 animate-pulse">—</span>}
      </div>

      <div className="space-y-0.5">
        {breakdown.map((line, i) => (
          <div key={i} className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}

function HealthBadge({ label, healthy, loading }) {
  const style = loading
    ? { color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)', dot: '#64748b' }
    : healthy
    ? { color: '#4ade80', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.15)',  dot: '#4ade80' }
    : { color: '#f87171', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.15)',  dot: '#f87171' }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <span className="relative flex items-center justify-center w-2 h-2">
        <span className="absolute inset-0 rounded-full animate-ping opacity-40"
          style={{ background: style.dot }} />
        <span className="relative w-2 h-2 rounded-full" style={{ background: style.dot }} />
      </span>
      <span className="text-xs font-mono font-medium" style={{ color: style.color }}>
        {label}
      </span>
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {loading ? 'checking…' : healthy ? 'operational' : 'degraded'}
      </span>
    </div>
  )
}

function OutcomePill({ outcome }) {
  const s = OUTCOME_STYLES[outcome] ?? OUTCOME_STYLES.inactive
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
      {outcome}
    </span>
  )
}

function AuditRow({ log }) {
  return (
    <tr className="border-b group transition-colors hover:bg-[rgba(255,255,255,0.01)]"
      style={{ borderColor: 'var(--border-sub)' }}>
      <td className="px-4 py-2.5 align-middle">
        <span className="text-xs font-mono" style={{ color: 'var(--text-pri)' }}>{log.event}</span>
      </td>
      <td className="px-4 py-2.5 align-middle">
        <OutcomePill outcome={log.outcome} />
      </td>
      <td className="px-4 py-2.5 align-middle max-w-[160px]">
        {log.user_id ? (
          <span className="mono-tag truncate block" title={log.user_id}>
            {log.user_id.slice(0, 8)}…
          </span>
        ) : log.client_id ? (
          <span className="mono-tag truncate block" title={log.client_id}>{log.client_id}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 align-middle">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {log.ip ?? '—'}
        </span>
      </td>
      <td className="px-4 py-2.5 align-middle text-right">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {timeAgo(log.timestamp)}
        </span>
      </td>
    </tr>
  )
}

// Main Page

export default function MonitoringPage() {
  const { adminKey } = useAdmin()

  // Stats
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')

  // Audit log
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState('')
  const [logsOffset, setLogsOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Filters
  const [filterEvent, setFilterEvent] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('')

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const intervalRef = useRef(null)

  const LIMIT = 50

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminGetStats(adminKey)
      setStats(data)
      setStatsError('')
    } catch (err) {
      setStatsError(err.message)
    } finally {
      setStatsLoading(false)
    }
  }, [adminKey])

  const fetchLogs = useCallback(async (reset = false) => {
    const offset = reset ? 0 : logsOffset
    if (reset) {
      setLogsLoading(true)
      setLogsOffset(0)
      setHasMore(true)
    }
    try {
      const data = await adminGetAuditLogs(adminKey, {
        event: filterEvent || undefined,
        outcome: filterOutcome || undefined,
        limit: LIMIT,
        offset,
      })
      if (reset) {
        setLogs(data)
      } else {
        setLogs(prev => [...prev, ...data])
      }
      setHasMore(data.length === LIMIT)
      setLogsOffset(offset + data.length)
      setLogsError('')
    } catch (err) {
      setLogsError(err.message)
    } finally {
      setLogsLoading(false)
      setLoadingMore(false)
    }
  }, [adminKey, filterEvent, filterOutcome, logsOffset])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchLogs(true)])
    setLastFetched(new Date())
  }, [fetchStats, fetchLogs])

  // Initial load
  useEffect(() => {
    fetchStats().then(() => setLastFetched(new Date()))
  }, [adminKey])

  useEffect(() => {
    setLogsOffset(0)
    setHasMore(true)
    setLogs([])
    setLogsLoading(true)
    adminGetAuditLogs(adminKey, {
      event: filterEvent || undefined,
      outcome: filterOutcome || undefined,
      limit: LIMIT,
      offset: 0,
    }).then(data => {
      setLogs(data)
      setHasMore(data.length === LIMIT)
      setLogsOffset(data.length)
      setLogsError('')
    }).catch(err => setLogsError(err.message))
      .finally(() => setLogsLoading(false))
  }, [adminKey, filterEvent, filterOutcome])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchStats()
        adminGetAuditLogs(adminKey, {
          event: filterEvent || undefined,
          outcome: filterOutcome || undefined,
          limit: LIMIT,
          offset: 0,
        }).then(data => {
          setLogs(data)
          setHasMore(data.length === LIMIT)
          setLogsOffset(data.length)
        }).catch(() => {})
        setLastFetched(new Date())
      }, 30_000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh, adminKey, filterEvent, filterOutcome, fetchStats])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await adminGetAuditLogs(adminKey, {
        event: filterEvent || undefined,
        outcome: filterOutcome || undefined,
        limit: LIMIT,
        offset: logsOffset,
      })
      setLogs(prev => [...prev, ...data])
      setHasMore(data.length === LIMIT)
      setLogsOffset(prev => prev + data.length)
    } catch (err) {
      setLogsError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const u = stats?.users
  const c = stats?.clients
  const rt = stats?.refresh_tokens

  const selectStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-sub)',
    color: 'var(--text-pri)',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    fontFamily: 'JetBrains Mono, monospace',
    padding: '0.375rem 0.625rem',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div className="animate-fade-up space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl text-white">System Monitor</h1>
          <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {lastFetched ? `Last updated ${timeAgo(lastFetched)}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Manual refresh */}
          <button
            onClick={() => { fetchStats(); setLastFetched(new Date()) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)', color: 'var(--text-muted)' }}
            title="Refresh now"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(r => !r)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all"
            style={{
              background: autoRefresh ? 'rgba(34,197,94,0.09)' : 'var(--bg-elevated)',
              border: autoRefresh ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border-sub)',
              color: autoRefresh ? '#4ade80' : 'var(--text-muted)',
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${autoRefresh ? 'animate-pulse' : ''}`}
              style={{ background: autoRefresh ? '#4ade80' : 'var(--text-muted)' }} />
            {autoRefresh ? 'Live · 30s' : 'Auto-refresh'}
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="users"
          primary={u?.total}
          accentColor="#3b82f6"
          icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          breakdown={statsLoading ? ['loading…'] : statsError ? [`error: ${statsError}`] : [
            `${u?.active ?? 0} active · ${u?.inactive ?? 0} inactive`,
            `${u?.new_last_7d ?? 0} new this week`,
          ]}
        />
        <StatCard
          label="clients"
          primary={c?.total}
          accentColor="#8b5cf6"
          icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
          breakdown={statsLoading ? ['loading…'] : statsError ? [`error`] : [
            `${c?.active ?? 0} active · ${c?.inactive ?? 0} inactive`,
          ]}
        />
        <StatCard
          label="scopes"
          primary={stats?.scopes?.total}
          accentColor="#f59e0b"
          icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
          breakdown={statsLoading ? ['loading…'] : statsError ? ['error'] : ['registered scopes']}
        />
        <StatCard
          label="refresh tokens"
          primary={rt?.active}
          accentColor="#10b981"
          icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>}
          breakdown={statsLoading ? ['loading…'] : statsError ? ['error'] : [
            `${rt?.revoked ?? 0} revoked · ${rt?.expired ?? 0} expired`,
          ]}
        />
      </div>

      {/* ── System Health ── */}
      <div className="card px-5 py-4">
        <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: '#3b82f6' }}>//</span> system health
        </div>
        <div className="flex flex-wrap gap-3">
          <HealthBadge label="Database" healthy={stats?.system?.db_healthy} loading={statsLoading} />
          <HealthBadge label="Redis" healthy={stats?.system?.redis_healthy} loading={statsLoading} />
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div className="card overflow-hidden">
        {/* Log header + filters */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-sub)' }}>
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: '#3b82f6' }}>//</span> activity log
            {logs.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
                {logs.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Event filter */}
            <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} style={selectStyle}>
              <option value="">All events</option>
              {EVENT_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>

            {/* Outcome filter */}
            <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} style={selectStyle}>
              <option value="">All outcomes</option>
              <option value="success">success</option>
              <option value="failure">failure</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {logsLoading ? (
          <div className="flex items-center justify-center py-12 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            Loading events…
          </div>
        ) : logsError ? (
          <div className="flex items-center justify-center py-12 text-xs font-mono" style={{ color: '#f87171' }}>
            ✗ {logsError}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ color: 'var(--text-muted)' }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No events found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-sub)' }}>
                  {['Event', 'Outcome', 'Subject', 'IP', 'When'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono font-medium uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => <AuditRow key={log.id} log={log} />)}
              </tbody>
            </table>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center px-4 py-3" style={{ borderTop: '1px solid var(--border-sub)' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-xs font-mono px-4 py-1.5 rounded-md transition-all disabled:opacity-40"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)', color: 'var(--text-muted)' }}>
                  {loadingMore ? 'Loading…' : `Load more`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
