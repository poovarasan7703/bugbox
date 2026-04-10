import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { bugAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './BugDetail.css'

const statusColors = {
  Open: 'status-open',
  'In Progress': 'status-progress',
  Fixed: 'status-fixed',
}

export default function BugDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [bug, setBug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [newComment, setNewComment] = useState('')
  const [updating, setUpdating] = useState(false)
  const [toast, setToast] = useState(null)
  const [videoLoading, setVideoLoading] = useState(true)

  const fetchBug = async () => {
    try {
      const { data } = await bugAPI.getBug(id)
      setBug(data)
      setNewStatus(data.status)
    } catch (err) {
      showToast('Failed to load bug details', 'error')
      navigate(user?.role === 'tester' ? '/tester' : '/developer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBug()
  }, [id])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleUpdateStatus = async () => {
    if (!bug || newStatus === bug.status) return
    setUpdating(true)
    try {
      const { data } = await bugAPI.updateStatus(bug._id, newStatus)
      setBug(data)
      showToast(`Status updated to ${newStatus}`, 'success')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setUpdating(true)
    try {
      const { data } = await bugAPI.addComment(bug._id, newComment)
      setBug(data)
      setNewComment('')
      showToast('Comment added successfully', 'success')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add comment', 'error')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="bug-detail-loading">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-content"></div>
          <div className="skeleton-sidebar"></div>
        </div>
      </div>
    )
  }

  if (!bug) return null

  const videoUrl = bug.videoFile ? `/uploads/${bug.videoFile}` : null
  const isDeveloper = user?.role === 'developer'

  return (
    <div className="bug-detail">
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

      <button className="btn btn-ghost back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="bug-detail-header">
        <div>
          <span className="bug-id mono">{bug.bugId}</span>
          <h1>{bug.title}</h1>
          <span className={`status-badge ${statusColors[bug.status]}`}>
            {bug.status}
          </span>
        </div>
      </div>

      <div className="bug-detail-grid">
        <div className="bug-main">
          {videoUrl && (
            <div className="video-section">
              <h3>Recording</h3>
              <div className="video-container">
                {videoLoading && (
                  <div className="video-loading">
                    <div className="spinner"></div>
                    <p>Loading video...</p>
                  </div>
                )}
                <video
                  controls
                  src={videoUrl}
                  className="bug-video"
                  onLoadedData={() => setVideoLoading(false)}
                  onError={() => {
                    setVideoLoading(false)
                    showToast('Failed to load video', 'error')
                  }}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            </div>
          )}

          <div className="description-section">
            <h3>Description</h3>
            <p>{bug.description}</p>
          </div>

          {isDeveloper && bug.developerComments?.length > 0 && (
            <div className="comments-section">
              <h3>Developer Comments</h3>
              <ul className="comment-list">
                {bug.developerComments.map((c) => (
                  <li key={c._id}>
                    <div className="comment-header">
                      <strong className="comment-author">{c.author?.name}</strong>
                      <span className="comment-date">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bug-sidebar">
          <div className="meta-card">
            <h4>Details</h4>
            <div className="meta-item">
              <span className="meta-label">Reported by:</span>
              <span className="meta-value">{bug.reportedBy?.name}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Created:</span>
              <span className="meta-value">{new Date(bug.createdAt).toLocaleString()}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status:</span>
              <span className={`status-badge ${statusColors[bug.status]}`}>
                {bug.status}
              </span>
            </div>
          </div>

          {isDeveloper && (
            <>
              <div className="meta-card">
                <h4>Update Status</h4>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className={newStatus !== bug.status ? 'status-changed' : ''}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Fixed">Fixed</option>
                </select>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleUpdateStatus}
                  disabled={updating || newStatus === bug.status}
                >
                  {updating ? (
                    <span className="btn-loading">
                      <span className="spinner"></span>
                      Updating...
                    </span>
                  ) : (
                    'Update Status'
                  )}
                </button>
              </div>

              <div className="meta-card">
                <h4>Add Comment</h4>
                <form onSubmit={handleAddComment}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className={newComment.trim() ? 'input-valid' : ''}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={updating || !newComment.trim()}
                  >
                    {updating ? (
                      <span className="btn-loading">
                        <span className="spinner"></span>
                        Adding...
                      </span>
                    ) : (
                      'Add Comment'
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
