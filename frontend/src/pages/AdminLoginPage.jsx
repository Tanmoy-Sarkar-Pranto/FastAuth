import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminGet } from '../lib/api'
import { useAdmin } from '../context/AdminContext'

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  )
}

export default function AdminLoginPage() {
  const { login } = useAdmin()
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminGet('/admin/clients', adminKey)
      login(adminKey)
      navigate('/admin/clients')
    } catch {
      setError('Invalid admin key. Check your X-Admin-Key and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Amber ambient glow — visually distinct from user login's blue glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(245,158,11,0.05)' }}
      />

      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo — amber tint to signal admin context */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#f59e0b',
            }}
          >
            <KeyIcon />
          </div>
          <div>
            <div className="font-display font-bold text-xl tracking-tight text-white leading-none">
              FastAuth
            </div>
            <div className="text-xs font-mono mt-0.5" style={{ color: '#f59e0b99' }}>
              Admin Access
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-7 space-y-5">
          <div>
            <h1 className="font-display font-semibold text-lg text-white">Admin sign in</h1>
            <p className="text-xs text-slate-500 mt-0.5">Enter your X-Admin-Key to continue</p>
          </div>

          {error && (
            <div className="rounded-md px-3.5 py-2.5 text-xs font-mono animate-fade-in"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#fbbf24',
              }}
            >
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Admin Key
              </label>
              <input
                type="password"
                required
                value={adminKey}
                onChange={e => setAdminKey(e.target.value)}
                className="field"
                placeholder="••••••••••••••••"
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-md text-sm font-semibold text-navy-900 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
              style={{ background: loading ? '#d97706' : '#f59e0b', color: '#080c14' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#fbbf24' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#f59e0b' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Verifying…
                </span>
              ) : 'Enter admin panel'}
            </button>
          </form>

          <div className="pt-1 border-t border-navy-500 flex items-center justify-between text-xs text-slate-600">
            <span className="font-mono">Admin access only</span>
            <Link to="/login" className="text-slate-500 hover:text-slate-300 transition-colors">
              ← User login
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs font-mono text-slate-700">
          X-Admin-Key is set in your server <span className="text-slate-500">.env</span>
        </p>
      </div>
    </div>
  )
}
