import { useEffect, useState } from 'react'
import { adminGet, adminPost, adminPatch } from '../../lib/api'
import { useAdmin } from '../../context/AdminContext'

// Helpers
function splitTokens(str) {
  return str ? str.split(' ').filter(Boolean) : []
}

function ScopePill({ label }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
      style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
      {label}
    </span>
  )
}

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

// Secret Reveal Box
function SecretBox({ secret, onDone }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg p-4 space-y-3 animate-fade-in"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}>
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>Copy now — never shown again</p>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono px-3 py-2 rounded break-all"
          style={{ background: 'var(--bg-elevated)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
          {secret}
        </code>
        <button onClick={copy}
          className="flex-shrink-0 px-3 py-2 rounded text-xs font-medium transition-all"
          style={{
            background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
            color: copied ? '#4ade80' : '#f59e0b',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
          }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <button onClick={onDone}
        className="w-full py-1.5 rounded text-xs font-medium text-slate-400 transition-all hover:text-white"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
        I've saved it — close
      </button>
    </div>
  )
}

// Register Modal
function RegisterModal({ adminKey, onClose, onCreated }) {
  const [clientId, setClientId] = useState('')
  const [scopes, setScopes] = useState('')
  const [uris, setUris] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [secret, setSecret] = useState(null)
  const [newClient, setNewClient] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await adminPost('/admin/clients', {
        ...(clientId.trim() ? { client_id: clientId.trim() } : {}),
        allowed_scopes: scopes.trim(),
        redirect_uris: uris.trim(),
      }, adminKey)
      setSecret(data.client_secret)
      setNewClient(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleDone() {
    onCreated(newClient)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(5,8,15,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget && !secret) onClose() }}>
      <div className="w-full max-w-md rounded-xl shadow-2xl animate-fade-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-sub)' }}>
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-sub)' }}>
          <div>
            <h2 className="font-display font-semibold text-base text-white">Register client</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">New OAuth2 client application</p>
          </div>
          {!secret && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              style={{ background: 'var(--bg-elevated)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div className="px-6 py-5 space-y-4">
          {secret ? (
            <SecretBox secret={secret} onDone={handleDone} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md px-3.5 py-2.5 text-xs font-mono animate-fade-in"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  ✗ {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                  Client ID <span className="normal-case text-slate-600">(optional)</span>
                </label>
                <input value={clientId} onChange={e => setClientId(e.target.value)}
                  className="field" placeholder="Auto-generated" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Allowed Scopes</label>
                <input value={scopes} onChange={e => setScopes(e.target.value)}
                  className="field" placeholder="read write admin" />
                <p className="mt-1 text-[10px] text-slate-600 font-mono">Space-separated</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Redirect URIs</label>
                <input value={uris} onChange={e => setUris(e.target.value)}
                  className="field" placeholder="https://app.example.com/callback" />
                <p className="mt-1 text-[10px] text-slate-600 font-mono">Space-separated</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2 rounded-md text-sm font-medium text-slate-400 transition-all"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 btn-primary">
                  {loading ? 'Registering…' : 'Register'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// Edit Modal
function EditModal({ client, adminKey, onClose, onUpdated }) {
  const [scopes, setScopes] = useState(client.allowed_scopes)
  const [uris, setUris] = useState(client.redirect_uris)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const updated = await adminPatch(`/admin/clients/${client.client_id}`, adminKey, {
        allowed_scopes: scopes.trim(),
        redirect_uris: uris.trim(),
      })
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
            <h2 className="font-display font-semibold text-base text-white">Edit client</h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: '#60a5fa' }}>{client.client_id}</p>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Allowed Scopes</label>
              <input value={scopes} onChange={e => setScopes(e.target.value)}
                className="field" placeholder="read write admin" />
              <p className="mt-1 text-[10px] text-slate-600 font-mono">Space-separated</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Redirect URIs</label>
              <input value={uris} onChange={e => setUris(e.target.value)}
                className="field" placeholder="https://app.example.com/callback" />
              <p className="mt-1 text-[10px] text-slate-600 font-mono">Space-separated</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-md text-sm font-medium text-slate-400 transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary">
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Client Row
function ClientRow({ client, adminKey, onToggle, onEdit, index }) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    try {
      const updated = await adminPatch(`/admin/clients/${client.client_id}/active`, adminKey)
      onToggle(client.client_id, updated.is_active)
    } catch {}
    finally { setToggling(false) }
  }

  const btnBase = 'text-xs font-mono px-2.5 py-1 rounded transition-all disabled:opacity-40'

  return (
    <tr className="border-b transition-colors"
      style={{ borderColor: 'var(--border-sub)' }}>
      <td className="px-4 py-3 align-middle">
        <span className="font-mono text-xs text-white">{client.client_id}</span>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-wrap gap-1">
          {splitTokens(client.allowed_scopes).length > 0
            ? splitTokens(client.allowed_scopes).map(s => <ScopePill key={s} label={s} />)
            : <span className="text-[10px] text-slate-600 font-mono">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 align-middle max-w-[180px]">
        <div className="space-y-0.5">
          {splitTokens(client.redirect_uris).length > 0
            ? splitTokens(client.redirect_uris).map(u => (
              <div key={u} className="text-[10px] font-mono text-slate-500 truncate" title={u}>{u}</div>
            ))
            : <span className="text-[10px] text-slate-600 font-mono">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <StatusBadge active={client.is_active} />
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onEdit(client)}
            className={btnBase}
            style={{
              color: '#60a5fa',
              background: 'rgba(59,130,246,0.07)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}>
            Edit
          </button>
          <button onClick={handleToggle} disabled={toggling}
            className={btnBase}
            style={{
              color: client.is_active ? '#f87171' : '#4ade80',
              background: client.is_active ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.07)',
              border: client.is_active ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(34,197,94,0.15)',
            }}>
            {toggling ? '…' : client.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </td>
    </tr>
  )
}

// Main Page
export default function ClientsPage() {
  const { adminKey } = useAdmin()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [editingClient, setEditingClient] = useState(null)

  useEffect(() => {
    adminGet('/admin/clients', adminKey)
      .then(setClients)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [adminKey])

  function handleCreated(newClient) {
    setClients(prev => [{ ...newClient }, ...prev])
  }

  function handleToggle(clientId, newActive) {
    setClients(prev => prev.map(c =>
      c.client_id === clientId ? { ...c, is_active: newActive } : c
    ))
  }

  function handleUpdated(updated) {
    setClients(prev => prev.map(c =>
      c.client_id === updated.client_id ? { ...c, ...updated } : c
    ))
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl text-white">Clients</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {loading ? 'Loading…' : `${clients.length} registered`}
          </p>
        </div>
        <button onClick={() => setShowRegister(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-all"
          style={{ background: '#3b82f6' }}
          onMouseEnter={e => e.currentTarget.style.background = '#60a5fa'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Register client
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-600 text-sm font-mono">Loading clients…</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-400 text-sm font-mono">✗ {error}</div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-sub)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <p className="text-sm text-slate-500">No clients registered yet</p>
            <button onClick={() => setShowRegister(true)}
              className="text-xs text-accent hover:text-accent-bright transition-colors font-mono">
              Register your first client →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-sub)' }}>
                {['Client ID', 'Scopes', 'Redirect URIs', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => (
                <ClientRow
                  key={client.client_id}
                  client={client}
                  adminKey={adminKey}
                  onToggle={handleToggle}
                  onEdit={setEditingClient}
                  index={i}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showRegister && (
        <RegisterModal
          adminKey={adminKey}
          onClose={() => setShowRegister(false)}
          onCreated={handleCreated}
        />
      )}

      {editingClient && (
        <EditModal
          client={editingClient}
          adminKey={adminKey}
          onClose={() => setEditingClient(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
