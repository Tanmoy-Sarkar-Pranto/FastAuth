import { useEffect, useState } from 'react'
import { adminGet, adminPost, adminPatch, adminDelete } from '../../lib/api'
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

// Add Scope Modal 
function AddScopeModal({ adminKey, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)

  function validateName(val) {
    if (/\s/.test(val)) {
      setNameError('Scope name cannot contain spaces')
      return false
    }
    setNameError('')
    return true
  }

  function handleNameChange(e) {
    setName(e.target.value)
    if (nameError) validateName(e.target.value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateName(name)) return
    setError('')
    setLoading(true)
    try {
      const created = await adminPost('/admin/scopes', { name: name.trim(), description: description.trim() }, adminKey)
      onCreated(created)
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
            <h2 className="font-display font-semibold text-base text-white">Add scope</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">Register a new OAuth2 scope</p>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={handleNameChange}
                onBlur={() => validateName(name)}
                required
                className="field"
                placeholder="read:users"
                autoFocus
              />
              {nameError && (
                <p className="mt-1 text-[10px] font-mono" style={{ color: '#f87171' }}>{nameError}</p>
              )}
              {!nameError && (
                <p className="mt-1 text-[10px] text-slate-600 font-mono">No spaces — use colons or underscores</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Description <span className="text-slate-600 normal-case">(optional)</span>
              </label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="field"
                placeholder="Read access to user profiles"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-md text-sm font-medium text-slate-400 transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading || !!nameError} className="flex-1 btn-primary">
                {loading ? 'Adding…' : 'Add scope'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Edit Modal
function EditModal({ scope, adminKey, onClose, onUpdated }) {
  const [description, setDescription] = useState(scope.description)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const updated = await adminPatch(`/admin/scopes/${scope.name}`, adminKey, { description: description.trim() })
      onUpdated(updated)
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
            <h2 className="font-display font-semibold text-base text-white">Edit scope</h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#60a5fa' }}>{scope.name}</p>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="field"
                placeholder="Describe what this scope grants access to"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-md text-sm font-medium text-slate-400 transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary">
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Scope Row
function ScopeRow({ scope, adminKey, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      // auto-reset after 3s if user doesn't confirm
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    setDeleting(true)
    try {
      await adminDelete(`/admin/scopes/${scope.name}`, adminKey)
      onDelete(scope.name)
    } catch {}
    finally { setDeleting(false) }
  }

  return (
    <tr className="border-b transition-colors"
      style={{ borderColor: 'var(--border-sub)' }}>

      {/* Name */}
      <td className="px-4 py-3 align-middle">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium"
          style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
          {scope.name}
        </span>
      </td>

      {/* Description */}
      <td className="px-4 py-3 align-middle">
        {scope.description
          ? <span className="text-xs text-slate-400">{scope.description}</span>
          : <span className="text-xs text-slate-600 font-mono italic">No description</span>}
      </td>

      {/* Created at */}
      <td className="px-4 py-3 align-middle">
        <span className="text-[10px] font-mono text-slate-600">{formatDate(scope.created_at)}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onEdit(scope)}
            className={btnBase}
            style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={btnBase}
            style={confirmDelete
              ? { color: '#fbbf24', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }
              : { color: '#f87171', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }
            }>
            {deleting ? '…' : confirmDelete ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  )
}

// Main Page
export default function ScopesPage() {
  const { adminKey } = useAdmin()
  const [scopes, setScopes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingScope, setEditingScope] = useState(null)

  useEffect(() => {
    adminGet('/admin/scopes', adminKey)
      .then(setScopes)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [adminKey])

  function handleCreated(scope) {
    setScopes(prev => [scope, ...prev])
  }

  function handleUpdated(updated) {
    setScopes(prev => prev.map(s => s.name === updated.name ? updated : s))
  }

  function handleDeleted(name) {
    setScopes(prev => prev.filter(s => s.name !== name))
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl text-white">Scopes</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {loading ? 'Loading…' : `${scopes.length} registered`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-all"
          style={{ background: '#3b82f6' }}
          onMouseEnter={e => e.currentTarget.style.background = '#60a5fa'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add scope
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600 text-sm font-mono">
            Loading scopes…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-400 text-sm font-mono">
            ✗ {error}
          </div>
        ) : scopes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
              </svg>
            </div>
            <p className="text-sm text-slate-500">No scopes registered yet</p>
            <button onClick={() => setShowAdd(true)}
              className="text-xs text-accent hover:text-accent-bright transition-colors font-mono">
              Add your first scope →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-sub)' }}>
                {['Name', 'Description', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scopes.map(scope => (
                <ScopeRow
                  key={scope.name}
                  scope={scope}
                  adminKey={adminKey}
                  onEdit={setEditingScope}
                  onDelete={handleDeleted}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <AddScopeModal
          adminKey={adminKey}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}

      {editingScope && (
        <EditModal
          scope={editingScope}
          adminKey={adminKey}
          onClose={() => setEditingScope(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
