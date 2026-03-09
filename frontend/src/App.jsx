import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AdminProvider, useAdmin } from './context/AdminContext'
import Layout from './components/Layout'

// Placeholder pages for now
function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400">Coming soon — unit in progress.</p>
    </div>
  )
}

function AdminLoginPage() {
  return <PlaceholderPage title="Admin Login" />
}

function ProtectedLayout() {
  const { isAuthenticated } = useAdmin()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return (
    <Layout>
      <Routes>
        <Route index element={<Navigate to="/admin/clients" replace />} />
        <Route path="clients" element={<PlaceholderPage title="Client Management" />} />
        <Route path="scopes" element={<PlaceholderPage title="Scope Management" />} />
        <Route path="users" element={<PlaceholderPage title="User Management" />} />
        <Route path="tokens" element={<PlaceholderPage title="Token Inspector" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AdminProvider>
    </ThemeProvider>
  )
}
