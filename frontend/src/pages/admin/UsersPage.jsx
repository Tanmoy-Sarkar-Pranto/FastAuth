import { useEffect, useState } from 'react'
import { adminGet, adminPost, adminPatch } from '../../lib/api'
import { useAdmin } from '../../context/AdminContext'

// Helpers 
function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const btnBase = 'text-xs font-mono px-2.5 py-1 rounded transition-all disabled:opacity-40'

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
      style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
      <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
      style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
      <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />Inactive
    </span>
  )
}

// Create User Modal
function CreateUserModal({ adminKey, onClose, onCreated }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await adminPost('/admin/users', { email, password }, adminKey)
      onCreated(user)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(5,8,15,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-xl shadow-2xl animate-fade-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-sub)' }}>

        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-sub)' }}>
          <div>
            <h2 className="font-display font-semibold text-base text-white">Create user</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">Add a new user account</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-white transition-colors"
            style={{ background: 'var(--bg-elevated)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md px-3.5 py-2.5 text-xs font-mono animate-fade-in"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                ✗ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field"
                placeholder="user@example.com"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field"
                placeholder="min. 8 characters"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-md text-sm font-medium text-slate-400 transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary">
                {loading ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// User Row 
function UserRow({ user, adminKey, onToggle }) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    try {
      const updated = await adminPatch(`/admin/users/${user.id}/active`, adminKey)
      onToggle(user.id, updated.is_active)
    } catch {}
    finally { setToggling(false) }
  }

  return (
    <tr className="border-b transition-colors" style={{ borderColor: 'var(--border-sub)' }}>
      {/* Email */}
      <td className="px-4 py-3 align-middle">
        <span className="text-sm font-medium text-white">{user.email}</span>
      </td>

      {/* ID */}
      <td className="px-4 py-3 align-middle">
        <span
          className="mono-tag"
          title={user.id}
        >
          {user.id.slice(0, 8)}…
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 align-middle">
        <StatusBadge active={user.is_active} />
      </td>

      {/* Created */}
      <td className="px-4 py-3 align-middle">
        <span className="text-[10px] font-mono text-slate-600">{formatDate(user.created_at)}</span>
      </td>

      {/* Action */}
      <td className="px-4 py-3 align-middle text-right">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={btnBase}
          style={{
            color: user.is_active ? '#f87171' : '#4ade80',
            background: user.is_active ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.07)',
            border: user.is_active ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(34,197,94,0.15)',
          }}>
          {toggling ? '…' : user.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  )
}

// Main Page
export default function UsersPage() {
  const { adminKey } = useAdmin()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    adminGet('/admin/users', adminKey)
      .then(setUsers)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [adminKey])

  function handleCreated(user) {
    setUsers(prev => [user, ...prev])
  }

  function handleToggle(id, newActive) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: newActive } : u))
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl text-white">Users</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {loading ? 'Loading…' : `${users.length} registered`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-all"
          style={{ background: '#3b82f6' }}
          onMouseEnter={e => e.currentTarget.style.background = '#60a5fa'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Create user
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600 text-sm font-mono">
            Loading users…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-400 text-sm font-mono">
            ✗ {error}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <p className="text-sm text-slate-500">No users yet</p>
            <button onClick={() => setShowCreate(true)}
              className="text-xs text-accent hover:text-accent-bright transition-colors font-mono">
              Create your first user →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-sub)' }}>
                {['Email', 'ID', 'Status', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  adminKey={adminKey}
                  onToggle={handleToggle}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          adminKey={adminKey}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
