import { useState, useRef, useEffect } from 'react'
import './ScreenRecorder.css'

export default function ScreenRecorder({ onRecordingReady }) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [toast, setToast] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording])

  const startRecording = async () => {
    setError('')
    setIsStarting(true)
    showToast('Preparing to record...', 'info')

    // Countdown before starting
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setCountdown(0)

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor', frameRate: 15 },
        audio: false,
      })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      })

      chunksRef.current = []
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        onRecordingReady(blob)
        showToast('Recording saved! Ready to submit.', 'success')
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setIsStarting(false)
      showToast('Recording started! Click stop when done.', 'success')
    } catch (err) {
      setError(err.message || 'Failed to start recording. Please allow screen share.')
      setIsStarting(false)
      showToast('Recording failed. Please try again.', 'error')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setDuration(0)
    clearInterval(timerRef.current)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="screen-recorder">
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

      {/* Countdown Overlay */}
      {countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-circle">
            <span className="countdown-number">{countdown}</span>
          </div>
          <p>Starting recording in...</p>
        </div>
      )}

      {!isRecording && !isStarting ? (
        <div className="recorder-idle">
          <button className="btn btn-primary btn-record" onClick={startRecording}>
            <span className="record-icon">●</span>
            Start Screen Recording
          </button>
          <p className="recorder-hint">
            🎥 Click to share your screen and record the bug reproduction steps
          </p>
        </div>
      ) : isStarting ? (
        <div className="recorder-starting">
          <div className="starting-animation">
            <div className="spinner-large"></div>
            <h3>Preparing Recording</h3>
            <p>Please select a screen/window to share</p>
          </div>
        </div>
      ) : (
        <div className="recorder-active">
          <div className="recorder-status">
            <span className="rec-dot" />
            <div className="status-info">
              <span className="status-text">Recording in progress</span>
              <span className="rec-duration">{formatTime(duration)}</span>
            </div>
          </div>
          <div className="recording-controls">
            <button className="btn btn-danger btn-stop" onClick={stopRecording}>
              <span className="stop-icon">⏹️</span>
              Stop Recording
            </button>
            <div className="recording-indicator">
              <div className="pulse-ring"></div>
              <div className="pulse-ring pulse-ring-delay"></div>
            </div>
          </div>
        </div>
      )}
      {error && <p className="recorder-error">{error}</p>}
    </div>
  )
}
