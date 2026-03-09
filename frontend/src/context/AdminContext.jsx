import { createContext, useContext, useState } from 'react'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [adminKey, setAdminKey] = useState(() => {
    return sessionStorage.getItem('adminKey') || ''
  })

  function login(key) {
    setAdminKey(key)
    sessionStorage.setItem('adminKey', key)
  }

  function logout() {
    setAdminKey('')
    sessionStorage.removeItem('adminKey')
  }

  return (
    <AdminContext.Provider value={{ adminKey, isAuthenticated: !!adminKey, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
