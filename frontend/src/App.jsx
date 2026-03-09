import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AdminProvider, useAdmin } from './context/AdminContext'
import { UserProvider, useUser } from './context/UserContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UserDashboard from './pages/UserDashboard'

// Placeholder pages for now
function PlaceholderPage({ title }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display font-semibold text-2xl text-white mb-1">{title}</h1>
      <p className="text-sm text-slate-500 font-mono">Coming soon — unit in progress.</p>
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

function ProtectedUserRoute({ children }) {
  const { isLoggedIn } = useUser()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminProvider>
        <UserProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={<ProtectedUserRoute><UserDashboard /></ProtectedUserRoute>}
              />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </AdminProvider>
    </ThemeProvider>
  )
}
