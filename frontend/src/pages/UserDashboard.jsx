import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

export default function UserDashboard() {
  const { clearTokens } = useUser()
  const navigate = useNavigate()

  function handleLogout() {
    clearTokens()
    navigate('/login')
  }

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500 rounded-full opacity-[0.04] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-up text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-display font-semibold text-xl text-white mb-1">Authenticated</h1>
        <p className="text-sm text-slate-500 font-mono mb-6">Access token stored in localStorage</p>
        <button
          onClick={handleLogout}
          className="px-5 py-2 rounded-md text-sm font-medium text-slate-400 border border-navy-500 hover:border-red-800/60 hover:text-red-400 hover:bg-red-950/20 transition-all"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
