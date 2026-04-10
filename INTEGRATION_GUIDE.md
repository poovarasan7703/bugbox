// Integration Guide for New Features

// ============================================
// 1. LOG COLLECTOR INTEGRATION
// ============================================

// In your main.jsx or App.jsx initialization:
// Add this at the top level of your app

import LogCollector from './services/logCollector.js';

// Initialize once at app startup
let logCollector = null;

// Initialize in your main App component or root component:
useEffect(() => {
  // Initialize log collector globally
  window.logCollector = new LogCollector({
    apiUrl: 'http://localhost:5000',
    enableConsole: true,
    enableNetwork: true,
    enableUserInteractions: true,
    enablePerformance: true,
    maxLogs: 1000
  });
  
  console.log('LogCollector initialized');
}, []);

// ============================================
// 2. NOTIFICATION PANEL INTEGRATION
// ============================================

// In your Layout component (components/Layout.jsx):
// Add NotificationPanel to your header

import NotificationPanel from './NotificationPanel.jsx';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

function Layout({ children }) {
  const { user } = useContext(AuthContext);
  
  return (
    <div className="layout">
      <header className="header">
        <h1>BugBox</h1>
        <div className="header-right">
          {user && <NotificationPanel userId={user._id} />}
          <span>{user?.name}</span>
        </div>
      </header>
      <main className="content">
        {children}
      </main>
    </div>
  );
}

// ============================================
// 3. SUBMIT LOGS WHEN REPORTING BUG
// ============================================

// In your bug report form (pages/TesterDashboard.jsx or similar):

async function submitBugReport(formData) {
  try {
    // Submit bug first
    const bugResponse = await axios.post(
      'http://localhost:5000/api/bugs/report-bug',
      formData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    const bugId = bugResponse.data._id;
    
    // Then submit collected logs
    if (window.logCollector) {
      const logResult = await window.logCollector.submitLogs(bugId);
      if (logResult.success) {
        console.log('Logs submitted successfully:', logResult.data);
      }
    }
    
    // Clear logs for next bug report
    if (window.logCollector) {
      window.logCollector.clearLogs();
    }
    
    return bugResponse.data;
  } catch (error) {
    console.error('Error reporting bug:', error);
    throw error;
  }
}

// ============================================
// 4. DISPLAY LOGS AND AI ANALYSIS IN BUG DETAILS
// ============================================

// In your BugDetail component (pages/BugDetail.jsx):

import { useState, useEffect } from 'react';
import axios from 'axios';

function BugDetail({ bugId }) {
  const [bug, setBug] = useState(null);
  const [logs, setLogs] = useState(null);
  const [logSummary, setLogSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchBugDetails();
  }, [bugId]);
  
  async function fetchBugDetails() {
    try {
      // Fetch bug details
      const bugResponse = await axios.get(
        `http://localhost:5000/api/bugs/${bugId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      setBug(bugResponse.data);
      
      // Fetch logs and summary
      try {
        const logSummaryResponse = await axios.get(
          `http://localhost:5000/api/logs/${bugId}/summary`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
        );
        setLogSummary(logSummaryResponse.data);
      } catch (error) {
        console.log('No logs available for this bug');
      }
    } catch (error) {
      console.error('Error fetching bug details:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="bug-detail">
      <h1>{bug.title}</h1>
      <p>{bug.description}</p>
      
      {/* AI Analysis Section */}
      {bug.aiAnalysis && (
        <section className="ai-analysis">
          <h3>AI Analysis</h3>
          <div className="analysis-grid">
            <div className="analysis-item">
              <label>Severity</label>
              <span className={`severity-${bug.aiAnalysis.severity.toLowerCase()}`}>
                {bug.aiAnalysis.severity}
              </span>
            </div>
            <div className="analysis-item">
              <label>Category</label>
              <span>{bug.aiAnalysis.category}</span>
            </div>
            <div className="analysis-item">
              <label>Confidence</label>
              <span>{Math.round(bug.aiAnalysis.confidenceScore * 100)}%</span>
            </div>
          </div>
          
          {bug.aiAnalysis.keywords.length > 0 && (
            <div className="analysis-item">
              <label>Keywords</label>
              <div className="keywords">
                {bug.aiAnalysis.keywords.map(kw => (
                  <span key={kw} className="keyword">{kw}</span>
                ))}
              </div>
            </div>
          )}
          
          {bug.aiAnalysis.suggestions.length > 0 && (
            <div className="analysis-item">
              <label>Suggested Fixes</label>
              <ul>
                {bug.aiAnalysis.suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          {bug.aiAnalysis.relatedBugs.length > 0 && (
            <div className="analysis-item">
              <label>Related Bugs</label>
              <ul>
                {bug.aiAnalysis.relatedBugs.map(relatedBug => (
                  <li key={relatedBug._id}>
                    <a href={`/bug/${relatedBug._id}`}>
                      {relatedBug.bugId}: {relatedBug.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      
      {/* Logs Summary Section */}
      {logSummary && (
        <section className="logs-summary">
          <h3>Session Logs</h3>
          <div className="logs-grid">
            <div className="log-stat">
              <div className="stat-value">{logSummary.totalConsoleLogs}</div>
              <div className="stat-label">Console Logs</div>
            </div>
            <div className="log-stat">
              <div className="stat-value">{logSummary.errorCount}</div>
              <div className="stat-label">Errors</div>
            </div>
            <div className="log-stat">
              <div className="stat-value">{logSummary.totalNetworkRequests}</div>
              <div className="stat-label">Network Requests</div>
            </div>
            <div className="log-stat">
              <div className="stat-value">{logSummary.successRate}%</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="log-stat">
              <div className="stat-value">{logSummary.totalUserInteractions}</div>
              <div className="stat-label">User Interactions</div>
            </div>
            <div className="log-stat">
              <div className="stat-value">{logSummary.sessionDuration}s</div>
              <div className="stat-label">Session Duration</div>
            </div>
          </div>
          
          {logSummary.topErrors.length > 0 && (
            <div className="logs-detail">
              <h4>Top Errors</h4>
              <ul>
                {logSummary.topErrors.slice(0, 5).map((error, i) => (
                  <li key={i}>
                    <code>{error.message}</code>
                    <small>{new Date(error.timestamp).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {logSummary.slowRequests.length > 0 && (
            <div className="logs-detail">
              <h4>Slow Network Requests</h4>
              <ul>
                {logSummary.slowRequests.slice(0, 5).map((req, i) => (
                  <li key={i}>
                    <code>{req.method} {req.url}</code>
                    <span>{req.responseTime}ms</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      
      {/* Video Section */}
      {bug.videoStorageUrl && (
        <section className="video-section">
          <h3>Recording</h3>
          <video width="100%" controls>
            <source src={bug.videoStorageUrl} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </section>
      )}
    </div>
  );
}

export default BugDetail;

// ============================================
// 5. CSS STYLES
// ============================================

// Add to your CSS file:

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ai-analysis {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.analysis-item {
  margin-bottom: 12px;
}

.analysis-item label {
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
  color: #333;
}

.severity-critical {
  background: #dc3545;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
}

.severity-high {
  background: #fd7e14;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
}

.severity-medium {
  background: #ffc107;
  color: #333;
  padding: 4px 8px;
  border-radius: 4px;
}

.severity-low {
  background: #28a745;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword {
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.logs-summary {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.logs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.log-stat {
  background: white;
  padding: 16px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #dee2e6;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #0066cc;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.logs-detail {
  margin-top: 16px;
}

.logs-detail h4 {
  margin-bottom: 8px;
}

.logs-detail ul {
  list-style: none;
  padding: 0;
}

.logs-detail li {
  background: white;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
}

.logs-detail code {
  font-family: monospace;
  font-size: 12px;
  color: #666;
}
