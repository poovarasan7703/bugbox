import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bugAPI } from '../services/api'
import BugTable from '../components/BugTable'
import './DeveloperDashboard.css'

export default function DeveloperDashboard() {
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    bugAPI
      .getBugs()
      .then(({ data }) => setBugs(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="developer-dashboard">
      <div className="page-header">
        <h1>Developer Dashboard</h1>
        <p>View and manage bug reports from testers</p>
      </div>

      <div className="bugs-section">
        <h2>Bug Reports</h2>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : (
          <BugTable
            bugs={bugs}
            onRowClick={(bug) => navigate(`/bug/${bug._id}`)}
          />
        )}
      </div>
    </div>
  )
}
