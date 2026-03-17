import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { registerUser } from '../lib/api'

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('return_to')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerUser(email, password)
      // Store credentials so the consent page can pre-fill them.
      // Same origin → sessionStorage is safe. Cleared immediately after reading.
      sessionStorage.setItem('fa_autofill', JSON.stringify({ email, password }))
      // Pass any PKCE params through to the login page so the OAuth2 flow
      // can complete after registration.
      const queryStr = searchParams.toString()
      if (queryStr) {
        navigate(`/login?${queryStr}&registered=1`)
      } else {
        navigate('/login?registered=1')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent rounded-full opacity-[0.04] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent-dim border border-accent/30 flex items-center justify-center text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-xl tracking-tight text-white leading-none">FastAuth</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">Authorization Server</div>
          </div>
        </div>

        <div className="card p-7 space-y-5">
          <div>
            <h1 className="font-display font-semibold text-lg text-white">Create account</h1>
            <p className="text-xs text-slate-500 mt-0.5">Register a new user</p>
          </div>

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
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field"
                placeholder="min. 8 characters"
                autoComplete="new-password"
              />
              <p className="mt-1.5 text-xs text-slate-600 font-mono">Minimum 8 characters</p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <div className="pt-1 border-t border-navy-500 text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-bright hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
