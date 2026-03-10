import { useState, useEffect, useRef } from 'react'
import { introspectToken } from '../../lib/api'
import { useAdmin } from '../../context/AdminContext'

// Helpers 
function formatDatetime(unix) {
  return new Date(unix * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function useCountdown(expUnix) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!expUnix) return
    function tick() {
      setRemaining(Math.floor(expUnix - Date.now() / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expUnix])

  return remaining
}

function formatCountdown(secs) {
  if (secs === null) return null
  const abs = Math.abs(secs)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0 || h > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

function ScopePill({ label }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
      style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
      {label}
    </span>
  )
}

// Expiry Countdown 
function ExpiryDisplay({ exp }) {
  const remaining = useCountdown(exp)

  const expired = remaining !== null && remaining <= 0
  const urgent = remaining !== null && remaining > 0 && remaining <= 60

  const countdownColor = expired
    ? '#f87171'
    : urgent
      ? '#f59e0b'
      : '#4ade80'

  const countdownBg = expired
    ? 'rgba(239,68,68,0.08)'
    : urgent
      ? 'rgba(245,158,11,0.08)'
      : 'rgba(34,197,94,0.08)'

  const countdownBorder = expired
    ? 'rgba(239,68,68,0.2)'
    : urgent
      ? 'rgba(245,158,11,0.2)'
      : 'rgba(34,197,94,0.2)'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-slate-400 font-mono">{formatDatetime(exp)}</span>
      {remaining !== null && (
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded"
          style={{ color: countdownColor, background: countdownBg, border: `1px solid ${countdownBorder}` }}>
          {expired
            ? `Expired ${formatCountdown(remaining)} ago`
            : `in ${formatCountdown(remaining)}`}
        </span>
      )}
    </div>
  )
}

// Result Field Row 
function FieldRow({ label, children }) {
  return (
    <div className="flex items-start gap-4 py-3" style={{ borderBottom: '1px solid var(--border-sub)' }}>
      <span className="w-24 flex-shrink-0 text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wider pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// Result Panel
function ResultPanel({ result }) {
  const scopes = result.scope ? result.scope.split(' ').filter(Boolean) : []
  const aud = result.aud
    ? Array.isArray(result.aud) ? result.aud : [result.aud]
    : []

  return (
    <div className="card overflow-hidden animate-fade-in">
      {/* Active / Inactive banner */}
      {result.active ? (
        <div className="flex items-center gap-3 px-5 py-3.5"
          style={{
            background: 'rgba(34,197,94,0.07)',
            borderBottom: '1px solid rgba(34,197,94,0.2)',
          }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
            style={{ boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
          <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>Token is active</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3.5"
          style={{
            background: 'rgba(239,68,68,0.07)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
          }}>
          <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          <span className="text-sm font-semibold" style={{ color: '#f87171' }}>Token is expired or invalid</span>
        </div>
      )}

      {/* Claims */}
      {result.active && (
        <div className="px-5">
          {result.sub && (
            <FieldRow label="Subject">
              <span className="text-xs font-mono text-white">{result.sub}</span>
            </FieldRow>
          )}

          {result.client_id && (
            <FieldRow label="Client">
              <span className="text-xs font-mono" style={{ color: '#60a5fa' }}>{result.client_id}</span>
            </FieldRow>
          )}

          {scopes.length > 0 && (
            <FieldRow label="Scopes">
              <div className="flex flex-wrap gap-1">
                {scopes.map(s => <ScopePill key={s} label={s} />)}
              </div>
            </FieldRow>
          )}

          {result.exp && (
            <FieldRow label="Expires">
              <ExpiryDisplay exp={result.exp} />
            </FieldRow>
          )}

          {result.iat && (
            <FieldRow label="Issued at">
              <span className="text-xs font-mono text-slate-400">{formatDatetime(result.iat)}</span>
            </FieldRow>
          )}

          {result.iss && (
            <FieldRow label="Issuer">
              <span className="text-xs font-mono text-slate-400">{result.iss}</span>
            </FieldRow>
          )}

          {aud.length > 0 && (
            <FieldRow label="Audience">
              <div className="flex flex-wrap gap-1">
                {aud.map(a => (
                  <span key={a} className="text-xs font-mono text-slate-400">{a}</span>
                ))}
              </div>
            </FieldRow>
          )}

          {result.token_type && (
            <FieldRow label="Type">
              <span className="text-xs font-mono text-slate-500">{result.token_type}</span>
            </FieldRow>
          )}
        </div>
      )}
    </div>
  )
}

// Main Page
export default function TokenInspectorPage() {
  const { adminKey } = useAdmin()
  const [token, setToken] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef(null)

  async function handleInspect(e) {
    e.preventDefault()
    if (!token.trim()) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await introspectToken(token.trim(), adminKey)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    setToken(e.target.value)
    if (result) setResult(null)
    if (error) setError('')
  }

  return (
    <div className="animate-fade-up space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-semibold text-2xl text-white">Token Inspector</h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Paste a JWT to introspect its claims and validity
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleInspect} className="space-y-3">
        <textarea
          ref={textareaRef}
          value={token}
          onChange={handleChange}
          rows={5}
          spellCheck={false}
          className="w-full px-4 py-3 rounded-lg font-mono text-xs resize-none outline-none transition-all duration-200"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-sub)',
            color: '#60a5fa',
            lineHeight: '1.7',
          }}
          placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
          onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="btn-primary"
            style={{ width: 'auto', paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Inspecting…
              </span>
            ) : 'Inspect token'}
          </button>

          {(result || error) && (
            <button
              type="button"
              onClick={() => { setToken(''); setResult(null); setError(''); textareaRef.current?.focus() }}
              className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors">
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-3 text-xs font-mono animate-fade-in"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          ✗ {error}
        </div>
      )}

      {/* Result */}
      {result && <ResultPanel result={result} />}
    </div>
  )
}
