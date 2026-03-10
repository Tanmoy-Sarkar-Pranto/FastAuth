const BASE = '/api/v1'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      const raw = body.detail ?? body.error_description ?? body.error
      if (raw !== undefined && raw !== null) {
        if (typeof raw === 'string') {
          detail = raw
        } else if (typeof raw === 'object' && !Array.isArray(raw)) {
          // FastAPI raises HTTPException with a dict as detail
          detail = raw.error_description || raw.error || JSON.stringify(raw)
        } else if (Array.isArray(raw)) {
          // Pydantic validation errors: [{msg: "...", loc: [...]}]
          detail = raw.map(e => e.msg || JSON.stringify(e)).join('; ')
        }
      }
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

// OAuth2 token endpoint uses application/x-www-form-urlencoded
export function tokenRequest(params) {
  return request('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
}

export function registerUser(email, password) {
  return request('/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export function introspectToken(token, adminKey) {
  return request('/introspect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Admin-Key': adminKey,
    },
    body: new URLSearchParams({ token }).toString(),
  })
}

export function adminGet(path, adminKey) {
  return request(path, {
    headers: { 'X-Admin-Key': adminKey },
  })
}

export function adminPatch(path, adminKey, body = null) {
  return request(path, {
    method: 'PATCH',
    headers: {
      'X-Admin-Key': adminKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

export function adminPost(path, body, adminKey) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify(body),
  })
}
