import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { tokenRequest } from '../lib/api'
import { useUser } from '../context/UserContext'

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

export default function LoginPage() {
  const { saveTokens } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
