import { useState, useEffect } from 'react'
import { bugAPI } from '../services/api'
import './VideoAnalyzer.css'

export default function VideoAnalyzer({ videoBlob, title, onDescriptionGenerated }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (videoBlob && title.trim()) {
      analyzeVideo()
    }
  }, [videoBlob, title])

  const getVideoDuration = (blob) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob)
      const video = document.createElement('video')
      video.addEventListener(
        'loadedmetadata',
        () => {
          resolve(Math.round(video.duration))
          URL.revokeObjectURL(url)
        },
        { once: true }
      )
      video.src = url
    })
  }

  const analyzeVideo = async () => {
    if (!videoBlob || !title.trim()) return

    setAnalyzing(true)
    setError('')
    
    try {
      const videoDuration = await getVideoDuration(videoBlob)
      const videoSizeMB = (videoBlob.size / (1024 * 1024)).toFixed(2)

      setDuration(videoDuration)

      // Call backend API to generate description using AI
      const response = await bugAPI.generateBugDescription(
        title,
        videoDuration,
        videoSizeMB
      )

      const data = response.data

      // Check if we got a successful response
      if (data && data.generatedDescription) {
        setAnalysis(data)
        onDescriptionGenerated(data.generatedDescription)
        
        // Show warning if AI wasn't used
        if (!data.usedAI) {
          setError('Description filled in. You can edit if needed.')
        }
      } else {
        throw new Error('Invalid response structure')
      }
    } catch (err) {
      console.error('Video analysis error:', err)
      setError('Creating simple description...')
      
      // Generate a fallback description locally
      const titleLower = title.toLowerCase();
      let errorArea = 'this feature';
      let codeSection = 'the related code';

      if (titleLower.includes('login')) {
        errorArea = 'login';
        codeSection = 'the login/authentication module';
      } else if (titleLower.includes('button')) {
        errorArea = 'button click';
        codeSection = 'the button handler';
      } else if (titleLower.includes('form')) {
        errorArea = 'form submission';
        codeSection = 'the form code';
      } else if (titleLower.includes('email')) {
        errorArea = 'email';
        codeSection = 'the email module';
      } else if (titleLower.includes('upload')) {
        errorArea = 'file upload';
        codeSection = 'the upload handler';
      } else if (titleLower.includes('delete')) {
        errorArea = 'delete';
        codeSection = 'the delete code';
      } else if (titleLower.includes('search')) {
        errorArea = 'search';
        codeSection = 'the search code';
      }

      const fallbackDescription = `There is an error in ${errorArea} and check ${codeSection} in the code.`;

      const fallbackAnalysis = {
        generatedDescription: fallbackDescription,
        suggestions: [
          'Find and open the code',
          'Look for the error or broken logic',
          'Fix it and test',
        ],
        videoMetadata: {
          duration,
          size: (videoBlob.size / (1024 * 1024)).toFixed(2),
        },
        usedAI: false,
      }

      setAnalysis(fallbackAnalysis)
      onDescriptionGenerated(fallbackDescription)
    } finally {
      setAnalyzing(false)
    }
  }

  if (!videoBlob) return null

  return (
    <div className="video-analyzer">
      <div className="analyzer-header">
        <h3>📹 Video Analysis</h3>
        {analyzing && <span className="analyzing-badge">Analyzing...</span>}
      </div>

      {error && (
        <div className="analyzer-error">
          <span className="warn-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {analysis && (
        <div className="analyzer-content">
          <div className="video-info">
            <div className="info-item">
              <span className="info-label">Duration:</span>
              <span className="info-value">{duration}s</span>
            </div>
            <div className="info-item">
              <span className="info-label">Size:</span>
              <span className="info-value">{(videoBlob.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          </div>

          {analysis.generatedDescription && (
            <div className="generated-description">
              <h4>💡 AI-Generated Description</h4>
              <p className="description-text">{analysis.generatedDescription}</p>
            </div>
          )}

          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div className="suggestions">
              <h4>✅ How to Fix It</h4>
              <ul>
                {analysis.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {analyzing && (
        <div className="analyzer-loading">
          <div className="spinner"></div>
          <p>Analyzing video and generating description...</p>
        </div>
      )}

      {analysis && (
        <button
          type="button"
          className="btn-reanalyze"
          onClick={analyzeVideo}
          disabled={analyzing}
        >
          {analyzing ? 'Analyzing...' : '🔄 Re-analyze Video'}
        </button>
      )}
    </div>
  )
}
