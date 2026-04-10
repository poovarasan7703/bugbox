import { AuthProvider } from './context/AuthContext'
import { Routes, Route, Navigate } from 'react-router-dom'

function HomeRedirect() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user) return <Navigate to={user.role === 'tester' ? '/tester' : '/developer'} replace />;
  return <Navigate to="/login" replace />;
}

import Login from './pages/Login'
import Register from './pages/Register'
import TesterDashboard from './pages/TesterDashboard'
import DeveloperDashboard from './pages/DeveloperDashboard'
import BugDetail from './pages/BugDetail'
import Layout from './components/Layout'

function ProtectedRoute({ children, role }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'tester' ? '/tester' : '/developer'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/tester"
          element={
            <ProtectedRoute role="tester">
              <Layout><TesterDashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/developer"
          element={
            <ProtectedRoute role="developer">
              <Layout><DeveloperDashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bug/:id"
          element={
            <ProtectedRoute>
              <Layout><BugDetail /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
