import { createContext, useContext, useState } from 'react'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [tokens, setTokens] = useState(() => {
    const access = localStorage.getItem('access_token')
    const refresh = localStorage.getItem('refresh_token')
    return access ? { access, refresh } : null
  })

  function saveTokens(access, refresh) {
    localStorage.setItem('access_token', access)
    if (refresh) localStorage.setItem('refresh_token', refresh)
    setTokens({ access, refresh })
  }

  function clearTokens() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setTokens(null)
  }

  return (
    <UserContext.Provider value={{ tokens, isLoggedIn: !!tokens, saveTokens, clearTokens }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
