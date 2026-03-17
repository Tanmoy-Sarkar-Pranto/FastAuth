import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { tokenRequest } from '../lib/api'
import { useUser } from '../context/UserContext'

function ShieldIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

const SCOPE_META = {
  read:  { label: 'Read your profile and ride history', icon: EyeIcon },
  write: { label: 'Create and update data on your behalf', icon: EditIcon },
}

function getAppDisplayName(clientId) {
  const overrides = { rideshare: 'RideShare' }
  return overrides[clientId] ?? (clientId.charAt(0).toUpperCase() + clientId.slice(1))
}

export default function LoginPage() {
  const { saveTokens } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'

  // Detect OAuth2 Authorization Code flow params
  const [oauthParams, setOauthParams] = useState(null)
  useEffect(() => {
    if (searchParams.get('response_type') === 'code') {
      setOauthParams({
        response_type: searchParams.get('response_type') ?? '',
        client_id:     searchParams.get('client_id') ?? '',
        redirect_uri:  searchParams.get('redirect_uri') ?? '',
        code_challenge:        searchParams.get('code_challenge') ?? '',
        code_challenge_method: searchParams.get('code_challenge_method') ?? '',
        scope: searchParams.get('scope') ?? '',
        state: searchParams.get('state') ?? '',
      })

      // Pre-fill credentials when arriving from registration
      if (searchParams.get('registered') === '1') {
        const stored = sessionStorage.getItem('fa_autofill')
        if (stored) {
          try {
            const { email: e, password: p } = JSON.parse(stored)
            setEmail(e)
            setPassword(p)
          } catch { /* ignore malformed data */ }
          sessionStorage.removeItem('fa_autofill')
        }
      }
    }
  }, [searchParams])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Normal FastAuth login (password grant)
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await tokenRequest({ grant_type: 'password', username: email, password })
      saveTokens(data.access_token, data.refresh_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // OAuth2 consent — POST all params + credentials, let browser follow the 302 redirect naturally
  function handleOAuthSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/v1/authorize'

    const fields = {
      ...oauthParams,
      username: email,
      password: password,
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined && value !== '') {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      }
    }
    document.body.appendChild(form)
    form.submit()
  }

  if (oauthParams) {
    return <ConsentPage
      oauthParams={oauthParams}
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
      error={error}
      loading={loading}
      onSubmit={handleOAuthSubmit}
    />
  }

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient glow behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent rounded-full opacity-[0.04] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent-dim border border-accent/30 flex items-center justify-center text-accent">
            <ShieldIcon />
          </div>
          <div>
            <div className="font-display font-bold text-xl tracking-tight text-white leading-none">FastAuth</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">Authorization Server</div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-7 space-y-5 relative">
          <div>
            <h1 className="font-display font-semibold text-lg text-white">Sign in</h1>
            <p className="text-xs text-slate-500 mt-0.5">Access your account</p>
          </div>

          {justRegistered && (
            <div className="rounded-md bg-emerald-950/60 border border-emerald-800/50 px-3.5 py-2.5 text-xs text-emerald-400 font-mono animate-fade-in">
              ✓ Account created — sign in below.
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-950/60 border border-red-800/50 px-3.5 py-2.5 text-xs text-red-400 font-mono animate-fade-in">
              ✗ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="pt-1 border-t border-navy-500 flex items-center justify-between text-xs text-slate-500">
            <span>No account?{' '}
              <Link to="/register" className="text-accent-bright hover:text-white transition-colors">Register</Link>
            </span>
            <Link to="/admin/login" className="text-slate-600 hover:text-slate-400 transition-colors font-mono">
              Admin →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConsentPage({ oauthParams, email, setEmail, password, setPassword, error, loading, onSubmit }) {
  const appName = getAppDisplayName(oauthParams.client_id)
  const scopes = oauthParams.scope ? oauthParams.scope.split(/\s+/).filter(Boolean) : []

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Dual ambient glow */}
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-blue-500 rounded-full opacity-[0.03] blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-accent rounded-full opacity-[0.04] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-up">
        {/* Dual logo bridge */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {/* App icon */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/25 flex items-center justify-center text-blue-400">
              <CarIcon />
            </div>
            <span className="text-[10px] font-mono text-slate-500">{appName}</span>
          </div>

          {/* Animated connector */}
          <div className="flex items-center gap-1 pb-4">
            <div className="w-2 h-2 rounded-full bg-slate-600" style={{ animation: 'connectorPulse 2s ease-in-out infinite' }} />
            <div className="w-6 h-px bg-slate-700" />
            <div className="w-2 h-2 rounded-full bg-slate-500" style={{ animation: 'connectorPulse 2s ease-in-out 0.4s infinite' }} />
            <div className="w-6 h-px bg-slate-700" />
            <div className="w-2 h-2 rounded-full bg-slate-600" style={{ animation: 'connectorPulse 2s ease-in-out 0.8s infinite' }} />
          </div>

          {/* FastAuth icon */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-xl bg-accent-dim border border-accent/30 flex items-center justify-center text-accent">
              <ShieldIcon size={22} />
            </div>
            <span className="text-[10px] font-mono text-slate-500">FastAuth</span>
          </div>
        </div>

        {/* Card */}
        <div className="card p-7 space-y-5 relative">
          {/* Header */}
          <div>
            <h1 className="font-display font-semibold text-lg text-white leading-snug">
              {appName} wants access
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to grant <span className="text-slate-400 font-medium">{appName}</span> permission to access your FastAuth account.
            </p>
          </div>

          {/* Scope list */}
          {scopes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-600">Permissions requested</p>
              {scopes.map(scope => {
                const meta = SCOPE_META[scope]
                const Icon = meta?.icon
                return (
                  <div key={scope} className="flex items-center gap-3 px-3 py-2 rounded-md border border-slate-700/40 bg-slate-800/20">
                    <div className="flex-shrink-0 w-6 h-6 rounded bg-accent-dim border border-accent/20 flex items-center justify-center text-accent">
                      {Icon ? <Icon /> : null}
                    </div>
                    <div>
                      <div className="text-xs text-slate-300">{meta?.label ?? scope}</div>
                    </div>
                    <div className="ml-auto">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">{scope}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-700/50" />

          {/* Error */}
          {error && (
            <div className="rounded-md bg-red-950/60 border border-red-800/50 px-3.5 py-2.5 text-xs text-red-400 font-mono animate-fade-in">
              ✗ {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Authorizing…
                </span>
              ) : `Sign in & allow access`}
            </button>
          </form>

          <p className="text-[11px] text-slate-600 text-center leading-relaxed">
            You are authorizing <span className="text-slate-500">{appName}</span> to act on your behalf.
            You can revoke access at any time.
          </p>
        </div>
      </div>

      {/* Keyframe for connector animation */}
      <style>{`
        @keyframes connectorPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
