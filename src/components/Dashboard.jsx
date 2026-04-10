import { useState, useEffect } from 'react'

const API = '/api'

export default function Dashboard({ onSelectReport }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/reports`)
      .then((r) => r.json())
      .then(setReports)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Bug Reports</h2>
        <p>{reports.length} report{reports.length !== 1 ? 's' : ''} captured</p>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">📦</div>
          <h3>No bug reports yet</h3>
          <p>Create your first report to capture screen activity, logs, and user actions.</p>
          <p className="hint">Click "New Report" to get started.</p>
        </div>
      ) : (
        <div className="report-grid">
          {reports.map((r) => (
            <div
              key={r.id}
              className="report-card card"
              onClick={() => onSelectReport(r)}
            >
              <div className="report-thumb">
                {r.videoBlob ? (
                  <video
                    src={r.videoBlob}
                    muted
                    preload="metadata"
                    onLoadedMetadata={(e) => e.target.currentTime = 1}
                  />
                ) : (
                  <div className="no-video">No video</div>
                )}
              </div>
              <div className="report-meta">
                <h3>{r.title || 'Untitled'}</h3>
                <p className="report-desc">{r.description || 'No description'}</p>
                <div className="report-footer">
                  <span>{r.events?.length || 0} events</span>
                  <span>{r.duration ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, '0')}` : '—'}</span>
                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
