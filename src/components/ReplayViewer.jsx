import { useState, useRef, useEffect } from 'react'

export default function ReplayViewer({ report, onBack }) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const videoRef = useRef(null)

  const events = report.events || []
  const duration = report.duration || 0

  useEffect(() => {
    const video = videoRef.current
    if (!video || !report.videoBlob) return

    const onTimeUpdate = () => setCurrentTime(Math.floor(video.currentTime))
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [report.videoBlob])

  const handleSeek = (e) => {
    const video = videoRef.current
    if (!video) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    video.currentTime = pct * (report.duration || video.duration || 60)
    setCurrentTime(Math.floor(video.currentTime))
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const eventIcon = (type) => {
    if (type === 'console') return '📋'
    if (type === 'user') return '👆'
    return '•'
  }

  return (
    <div className="replay-viewer">
      <div className="replay-header">
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <h2>{report.title || 'Untitled Bug Report'}</h2>
        {report.description && <p className="replay-desc">{report.description}</p>}
      </div>

      <div className="replay-layout">
        <div className="replay-video-section card">
          {report.videoBlob ? (
            <>
              <video
                ref={videoRef}
                src={report.videoBlob}
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <div className="timeline">
                <div
                  className="timeline-bar"
                  onClick={handleSeek}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className="timeline-progress"
                    style={{
                      width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="timeline-labels">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="no-video-placeholder">No screen recording</div>
          )}
        </div>

        <div className="replay-events-section card">
          <h3>Captured Events</h3>
          {events.length === 0 ? (
            <p className="muted">No events captured. Add the capture SDK to your app for console & user action logging.</p>
          ) : (
            <ul className="event-list">
              {events.map((e, i) => (
                <li
                  key={i}
                  className={`event-item ${selectedEvent === i ? 'selected' : ''}`}
                  onClick={() => setSelectedEvent(i)}
                >
                  <span className="ev-icon">{eventIcon(e.type)}</span>
                  <span className="ev-time">{formatTime(Math.floor((e.timestamp || 0) / 1000))}</span>
                  <span className="ev-detail">
                    {e.type === 'console' && `[${e.level}] ${(e.args || []).join(' ')}`}
                    {e.type === 'user' && `${e.action} ${e.selector || e.key || ''}`}
                    {e.type === 'session_start' && `Session started: ${e.url}`}
                    {!['console', 'user', 'session_start'].includes(e.type) && JSON.stringify(e)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="export-hint">
        <p>💡 To export: use browser DevTools → right-click video → Save video as</p>
      </div>
    </div>
  )
}
