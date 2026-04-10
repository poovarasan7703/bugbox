import { useState } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import Recorder from './components/Recorder'
import ReplayViewer from './components/ReplayViewer'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [selectedReport, setSelectedReport] = useState(null)

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1 className="logo">
            <span className="logo-icon">📦</span>
            BugBox
          </h1>
          <p className="tagline">Real-Time Bug Reproduction Logger</p>
          <nav className="nav">
            <button
              className={view === 'dashboard' ? 'active' : ''}
              onClick={() => { setView('dashboard'); setSelectedReport(null) }}
            >
              Dashboard
            </button>
            <button
              className={view === 'recorder' ? 'active' : ''}
              onClick={() => setView('recorder')}
            >
              New Report
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {view === 'dashboard' && (
          <Dashboard
            onSelectReport={(r) => {
              setSelectedReport(r)
              setView('replay')
            }}
          />
        )}
        {view === 'recorder' && <Recorder onDone={() => setView('dashboard')} />}
        {view === 'replay' && selectedReport && (
          <ReplayViewer
            report={selectedReport}
            onBack={() => { setView('dashboard'); setSelectedReport(null) }}
          />
        )}
      </main>
    </div>
  )
}
