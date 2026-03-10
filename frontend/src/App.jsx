import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AdminProvider, useAdmin } from './context/AdminContext'
import { UserProvider, useUser } from './context/UserContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UserDashboard from './pages/UserDashboard'
import AdminLoginPage from './pages/AdminLoginPage'
import ClientsPage from './pages/admin/ClientsPage'
import ScopesPage from './pages/admin/ScopesPage'
import UsersPage from './pages/admin/UsersPage'
import TokenInspectorPage from './pages/admin/TokenInspectorPage'

// Placeholder pages for now
function PlaceholderPage({ title }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display font-semibold text-2xl text-white mb-1">{title}</h1>
      <p className="text-sm text-slate-500 font-mono">Coming soon — unit in progress.</p>
    </div>
  )
}


function ProtectedLayout() {
  const { isAuthenticated } = useAdmin()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return (
    <Layout>
      <Routes>
        <Route index element={<Navigate to="/admin/clients" replace />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="scopes" element={<ScopesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="tokens" element={<TokenInspectorPage />} />
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
