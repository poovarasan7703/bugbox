import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const [role, setRole] = useState('tester')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const { data } = await authAPI.login({ email, password })
      if (data.role !== role) {
        setError(
          role === 'tester'
            ? 'This account is for Developers. Please use the Developer login.'
            : 'This account is for Testers. Please use the Tester login.'
        )
        showToast('Wrong account type selected', 'error')
        setLoading(false)
        return
      }
      login({ _id: data._id, name: data.name, email: data.email, role: data.role }, data.token)
      showToast(`Welcome back, ${data.name}!`, 'success')
      navigate(data.role === 'tester' ? '/tester' : '/developer')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      showToast('Login failed. Please check your credentials.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (newRole) => {
    setRole(newRole)
    setError('')
  }

  return (
    <div className="auth-page">
      {/* Toast Notifications */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      <div className="auth-card auth-card-wide">
        <h1>BugBox</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${role === 'tester' ? 'active' : ''}`}
            onClick={() => handleRoleChange('tester')}
            disabled={loading}
          >
            <span className="tab-icon">🐛</span>
            Tester Login
          </button>
          <button
            type="button"
            className={`login-tab ${role === 'developer' ? 'active' : ''}`}
            onClick={() => handleRoleChange('developer')}
            disabled={loading}
          >
            <span className="tab-icon">👨‍💻</span>
            Developer Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className={email.includes('@') ? 'input-valid' : ''}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className={password.length >= 6 ? 'input-valid' : ''}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner"></span>
                Signing in...
              </span>
            ) : (
              `Sign in as ${role === 'tester' ? 'Tester' : 'Developer'}`
            )}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
