import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bugAPI } from '../services/api'
import ScreenRecorder from '../components/ScreenRecorder'
import VideoAnalyzer from '../components/VideoAnalyzer'
import BugTable from '../components/BugTable'
import './TesterDashboard.css'

export default function TesterDashboard() {
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoBlob, setVideoBlob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState(null)

  const navigate = useNavigate()

  const fetchBugs = async () => {
    try {
      const { data } = await bugAPI.getBugs()
      setBugs(data)
    } catch (err) {
      showToast('Failed to load bugs', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBugs()
  }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleRecordingReady = (blob) => {
    setVideoBlob(blob)
    setShowForm(true)
    showToast('Recording completed! Ready to submit.', 'success')
  }

  const handleDescriptionGenerated = (generatedDescription) => {
    setDescription(generatedDescription)
    showToast('✨ Description auto-filled from video analysis!', 'success')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required')
      return
    }
    if (!videoBlob) {
      setError('Please record a video first')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('video', videoBlob, 'recording.webm')

      await bugAPI.reportBug(formData)
      setTitle('')
      setDescription('')
      setVideoBlob(null)
      setShowForm(false)
      setSuccess(true)
      showToast('Bug report submitted successfully!', 'success')
      fetchBugs()

      // Reset success state after animation
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit bug report')
      showToast('Failed to submit bug report', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setTitle('')
    setDescription('')
    setVideoBlob(null)
    setError('')
  }

  return (
    <div className="tester-dashboard">
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

      {/* Success Animation Overlay */}
      {success && (
        <div className="success-overlay">
          <div className="success-animation">
            <div className="success-checkmark">✓</div>
            <h3>Bug Report Submitted!</h3>
            <p>Your bug report has been successfully submitted.</p>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>Tester Dashboard</h1>
        <p>Record and submit bug reports with screen recordings</p>
      </div>

      {!showForm ? (
        <div className="report-section">
          <h2>Report a Bug</h2>
          <ScreenRecorder onRecordingReady={handleRecordingReady} />
        </div>
      ) : (
        <div className="report-section">
          <h2>Submit Bug Report</h2>
          <form onSubmit={handleSubmit} className="report-form">
            {error && <div className="form-error">{error}</div>}
            <div className="form-group">
              <label>Bug Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief bug title"
                required
                className={title.trim() ? 'input-valid' : ''}
              />
            </div>

            {/* Video Analyzer - Auto-fills description */}
            <VideoAnalyzer 
              videoBlob={videoBlob}
              title={title}
              onDescriptionGenerated={handleDescriptionGenerated}
            />
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the bug and steps to reproduce..."
                rows={4}
                required
                className={description.trim() ? 'input-valid' : ''}
              />
            </div>
            <p className="video-ready">✓ Video recorded and ready to upload</p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={handleCancel} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <span className="btn-loading">
                    <span className="spinner"></span>
                    Submitting...
                  </span>
                ) : (
                  'Submit Bug Report'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bugs-section">
        <h2>My Submitted Bugs</h2>
        {loading ? (
          <div className="loading-skeleton">
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
            <div className="skeleton-row"></div>
          </div>
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
