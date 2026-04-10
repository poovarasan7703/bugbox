import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Layout.css'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to={user?.role === 'tester' ? '/tester' : '/developer'} className="logo">
          <span className="logo-icon">📦</span>
          BugBox
        </Link>
        <nav className="nav">
          <span className="user-info">
            {user?.name} ({user?.role})
          </span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>
      <main className="layout-main">
        <div className="layout-inner">{children}</div>
      </main>
    </div>
  )
}
