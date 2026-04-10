import { useState, useRef, useEffect } from 'react'

const API = '/api'
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`

export default function Recorder({ onDone }) {
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [events, setEvents] = useState([])
  const [stream, setStream] = useState(null)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const wsRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording, isPaused])

  const createSession = async () => {
    try {
      const res = await fetch(`${API}/sessions`, { method: 'POST' })
      const { sessionId } = await res.json()
      setSessionId(sessionId)
      setStep(2)
      setError('')
    } catch (e) {
      setError('Failed to create session')
    }
  }

  const startScreenCapture = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor', frameRate: 15 },
        audio: false,
      })
      setStream(displayStream)

      const recorder = new MediaRecorder(displayStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      })
      chunksRef.current = []
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      recorder.onstop = () => {
        displayStream.getTracks().forEach((t) => t.stop())
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder

      const ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}&role=dashboard`)
      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data)
          setEvents((prev) => [...prev, ev])
        } catch (_) {}
      }
      wsRef.current = ws

      setIsRecording(true)
      setStep(3)

      if (targetUrl) {
        const url = new URL(targetUrl)
        url.searchParams.set('bugbox_session', sessionId)
        window.open(url.toString(), '_blank', 'noopener')
      }
    } catch (e) {
      setError(e.message || 'Screen capture failed')
    }
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    wsRef.current?.close()
    setIsRecording(false)

    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onloadend = async () => {
      try {
        await fetch(`${API}/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            title: title || 'Untitled Bug Report',
            description,
            events,
            videoBlob: reader.result,
            duration,
          }),
        })
        onDone()
      } catch (e) {
        setError('Failed to save report')
      }
    }
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="recorder">
      {step === 1 && (
        <div className="recorder-step card">
          <h2>Start Bug Report</h2>
          <p>Enter details and the URL of the app where the bug occurs.</p>
          <div className="form-group">
            <label>Bug Title</label>
            <input
              type="text"
              placeholder="e.g. Button does not submit form"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              placeholder="What were you doing when the bug occurred?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>App URL (optional – for event capture)</label>
            <input
              type="url"
              placeholder="http://localhost:3001/demo.html"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <small>Use demo: http://localhost:3001/demo.html — or add &lt;script src="http://localhost:3001/capture-sdk.js"&gt;&lt;/script&gt; to your app</small>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" onClick={createSession}>
            Next: Create Session
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="recorder-step card">
          <h2>Ready to Record</h2>
          <p>Session ID: <code>{sessionId}</code></p>
          <p>Click below to share your screen. You can also open your app and add the capture script for full event logging.</p>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" onClick={startScreenCapture}>
            Share Screen & Start Recording
          </button>
        </div>
      )}

      {step === 3 && isRecording && (
        <div className="recorder-step card recorder-active">
          <div className="recording-header">
            <span className="rec-dot" />
            <span>Recording</span>
            <span className="duration">{formatTime(duration)}</span>
          </div>
          <p>Capturing screen and events. Reproduce the bug now.</p>
          <div className="events-preview">
            {events.length > 0 && (
              <details>
                <summary>{events.length} events captured</summary>
                <ul>
                  {events.slice(-10).reverse().map((e, i) => (
                    <li key={i}>
                      <span className="ev-type">{e.type}</span>
                      {e.action && ` ${e.action}`}
                      {e.level && ` [${e.level}]`}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <button className="btn btn-danger" onClick={stopRecording}>
            Stop & Save Report
          </button>
        </div>
      )}

      <button className="btn btn-ghost" onClick={onDone} style={{ marginTop: 16 }}>
        ← Back to Dashboard
      </button>
    </div>
  )
}
