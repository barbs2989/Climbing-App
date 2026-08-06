import { useState } from 'react'
import { parseGpxXml, parseCoordinateList, validateGpxQuality, calculateQualityScore, detectGpxFormat, formatCoordinatesForDisplay } from './gpxParser'

const C = {
  bg: '#1a1a1a',
  bg70: '#2a2a2a',
  text: '#fff',
  text70: '#999',
  accent: '#4a9eff',
  warning: '#ff9500',
  error: '#ff3b30',
  success: '#34c759',
  border: '#333'
}

export default function GpsSubmissionModal({ routeId, routeName, onClose, onSuccess }) {
  const [tab, setTab] = useState('paste') // 'paste', 'upload', 'devices'
  const [coordinates, setCoordinates] = useState('')
  const [deviceType, setDeviceType] = useState('Garmin')
  const [climbDate, setClimbDate] = useState('')
  const [climbEmail, setClimbEmail] = useState('')
  const [climbName, setClimbName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [qualityScore, setQualityScore] = useState(null)
  const [validationIssues, setValidationIssues] = useState([])
  const [confirmations, setConfirmations] = useState({ climbed: false, isRoute: false })
  const [showSuccess, setShowSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // Whether a receipt email actually reached the climber. Starts false and is only
  // set true if notify-gps-climber reports a real send, so the success screen never
  // promises an email that a missing/failing mail provider will not deliver.
  const [emailed, setEmailed] = useState(false)

  const handlePaste = (e) => {
    const text = e.target.value
    setCoordinates(text)
    setError('')

    if (text.trim().length === 0) {
      setQualityScore(null)
      setValidationIssues([])
      return
    }

    // Auto-detect format and parse
    const format = detectGpxFormat(text)
    let parsed = []

    if (format === 'gpx') {
      parsed = parseGpxXml(text)
    } else if (format === 'coordinates') {
      parsed = parseCoordinateList(text)
    }

    if (parsed.length === 0) {
      setError('Could not parse coordinates. Try pasting GPX XML or coordinate list (lat, lng per line).')
      setQualityScore(null)
      return
    }

    // Validate
    const validation = validateGpxQuality(parsed)
    setValidationIssues(validation.issues)

    // Calculate quality score
    const score = calculateQualityScore(parsed)
    setQualityScore(score)
  }

  // Shared by the file picker and the drop zone. The UI has always said "or drag
  // and drop", but nothing listened for a drop -- dropping a .gpx just navigated
  // the tab away to the file. Both paths now land here.
  const readGpxFile = (file) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result
      if (!text || typeof text !== 'string') {
        setError('Could not read file')
        return
      }

      setCoordinates(text)
      setError('')

      const format = detectGpxFormat(text)
      let parsed = []

      if (format === 'gpx') {
        parsed = parseGpxXml(text)
      } else if (format === 'coordinates') {
        parsed = parseCoordinateList(text)
      }

      if (parsed.length === 0) {
        setError('Could not parse coordinates from file.')
        setQualityScore(null)
        return
      }

      const validation = validateGpxQuality(parsed)
      setValidationIssues(validation.issues)
      const score = calculateQualityScore(parsed)
      setQualityScore(score)
    }

    reader.readAsText(file)
  }

  const handleFileUpload = (e) => readGpxFile(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    if (!/\.gpx$/i.test(file.name)) { setError('That file is not a .gpx track'); return }
    readGpxFile(file)
  }

  const handleSubmit = async () => {
    setError('')

    // Client-side validation
    if (coordinates.trim().length === 0) {
      setError('Please paste or upload GPS coordinates')
      return
    }

    if (!climbDate) {
      setError('Please select the climb date')
      return
    }

    if (!confirmations.climbed) {
      setError('Please confirm you personally climbed this route')
      return
    }

    if (!confirmations.isRoute) {
      setError('Please confirm this is the climbing route, not the approach')
      return
    }

    // Parse coordinates
    const format = detectGpxFormat(coordinates)
    let parsed = []

    if (format === 'gpx') {
      parsed = parseGpxXml(coordinates)
    } else if (format === 'coordinates') {
      parsed = parseCoordinateList(coordinates)
    }

    if (parsed.length < 5) {
      setError('Track needs at least 5 waypoints')
      return
    }

    setSubmitting(true)

    try {
      // Call Supabase edge function for validation
      // Read the same env var lib/supabase.js does. This was hardcoded to the
      // production project, so a local or staging build still posted GPS tracks
      // straight into prod.
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      if (!SUPABASE_URL) {
        setError('GPS submission is not configured in this build (VITE_SUPABASE_URL is unset).')
        return // the finally below clears `submitting`
      }
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-gps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId,
          gpxData: parsed,
          climberEmail: climbEmail || undefined,
          climberName: climbName || undefined,
          deviceType,
          climbDate,
          notes: notes || undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Submission failed')
        return
      }

      if (!result.success) {
        setError(result.message || 'GPS validation failed')
        return
      }

      // Trigger Phase C notifications asynchronously
      const submissionId = result.submissionId
      const qualityScore = result.qualityScore

      // Notify climber. Email is optional on this form, and the function rejects a
      // blank one — skip the round-trip rather than fire a request that 400s.
      if (climbEmail) fetch(`${SUPABASE_URL}/functions/v1/notify-gps-climber`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          climberEmail: climbEmail,
          climberName: climbName || 'Climber',
          routeName,
          qualityScore
        })
      }).then(r => r.json())
        .then(d => { if (d && d.emailed) setEmailed(true) })
        .catch(err => console.error('Climber notification failed:', err))

      // Notify admin
      fetch(`${SUPABASE_URL}/functions/v1/notify-gps-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          routeName,
          qualityScore,
          climberName: climbName,
          climberEmail: climbEmail
        })
      }).catch(err => console.error('Admin notification failed:', err))

      // Success - update modal with actual quality score from server
      setQualityScore(qualityScore)
      setShowSuccess(true)
      if (onSuccess) {
        onSuccess({
          valid: result.valid,
          qualityScore: qualityScore,
          message: result.message,
          submissionId: submissionId
        })
      }
    } catch (err) {
      setError('Submission failed: ' + (err instanceof Error ? err.message : 'Network error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (showSuccess) {
    return (
      <div style={{...styles.overlay}} onClick={onClose}>
        <div style={{...styles.modal}} onClick={(e) => e.stopPropagation()}>
          <div style={{...styles.successContent}}>
            <div style={{fontSize: '32px', marginBottom: '12px'}}>✓</div>
            <h2 style={{...styles.heading, color: C.success}}>Thanks for contributing!</h2>
            <p style={{...styles.text}}>Your GPS track is under review (24-48 hours)</p>
            <div style={{...styles.scoreBox}}>
              <div style={{fontSize: '18px', fontWeight: 'bold', color: C.accent}}>
                Quality Score: {qualityScore}/100
              </div>
            </div>
            <p style={{...styles.textSmall, color: C.text70}}>
              Once it's approved your track shows up on this route's page. Thank you for helping the climbing community!
              {emailed ? " We've emailed you a receipt." : ""}
            </p>
            <button style={{...styles.button, ...styles.buttonPrimary}} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{...styles.overlay}} onClick={onClose}>
      <div style={{...styles.modal}} onClick={(e) => e.stopPropagation()}>
        <div style={{...styles.header}}>
          <h2 style={{...styles.heading}}>Submit GPS Track</h2>
          <p style={{...styles.subheading}}>{routeName}</p>
          <button aria-label="Close" style={{...styles.closeButton}} onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{...styles.errorBox}}>
            <div style={{color: C.error, fontSize: '14px'}}>{error}</div>
          </div>
        )}

        {/* Tabs */}
        <div style={{...styles.tabs}}>
          {['paste', 'upload', 'devices'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...styles.tab,
                borderBottom: tab === t ? `2px solid ${C.accent}` : '1px solid ' + C.border,
                color: tab === t ? C.accent : C.text70
              }}
            >
              {t === 'paste' && 'Paste Coordinates'}
              {t === 'upload' && 'Upload File'}
              {t === 'devices' && 'Device Instructions'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{...styles.tabContent}}>
          {tab === 'paste' && (
            <div>
              <label style={{...styles.label}}>Paste GPX XML or Coordinates</label>
              <p style={{...styles.helpText}}>
                Paste your GPS data. Format: GPX XML or one coordinate per line (lat, lng)
              </p>
              <textarea aria-label="Paste coordinates or GPX"
                value={coordinates}
                onChange={handlePaste}
                placeholder="48.123, -121.456&#10;48.124, -121.457&#10;...&#10;&#10;or paste GPX XML starting with &lt;?xml..."
                style={{...styles.textarea}}
              />
            </div>
          )}

          {tab === 'upload' && (
            <div>
              <label style={{...styles.label}}>Upload GPX File</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{...styles.uploadBox, ...(dragOver ? {borderColor: C.accent, background: C.accent + '18'} : {})}}
              >
                <input aria-label="Upload GPX file"
                  type="file"
                  accept=".gpx"
                  onChange={handleFileUpload}
                  style={{display: 'none'}}
                  id="gpxFileInput"
                />
                <label htmlFor="gpxFileInput" style={{...styles.uploadLabel}}>
                  <div style={{fontSize: '24px', marginBottom: '8px'}}>📁</div>
                  <div>Click to select .gpx file</div>
                  <div style={{fontSize: '12px', color: C.text70}}>{dragOver ? 'Drop the .gpx to load it' : 'or drag and drop'}</div>
                </label>
              </div>
            </div>
          )}

          {tab === 'devices' && (
            <div style={{...styles.deviceGuide}}>
              <h4>How to Export from Your Device:</h4>

              <div style={{marginBottom: '16px'}}>
                <strong>Apple Watch:</strong>
                <p style={{fontSize: '14px', color: C.text70}}>
                  1. Open Health app on iPhone<br/>
                  2. Activity → Segment → [your climb]<br/>
                  3. Share → Save to Files → Select format as GPX
                </p>
              </div>

              <div style={{marginBottom: '16px'}}>
                <strong>Garmin Connect:</strong>
                <p style={{fontSize: '14px', color: C.text70}}>
                  1. Visit garmin.com/connect<br/>
                  2. Find activity from climb date<br/>
                  3. Menu → Export → GPX
                </p>
              </div>

              <div style={{marginBottom: '16px'}}>
                <strong>Strava:</strong>
                <p style={{fontSize: '14px', color: C.text70}}>
                  1. Open activity in Strava app<br/>
                  2. Tap menu (⋮) → Export GPX
                </p>
              </div>

              <div style={{marginBottom: '16px'}}>
                <strong>Komoot or AllTrails:</strong>
                <p style={{fontSize: '14px', color: C.text70}}>
                  1. Find your recorded activity<br/>
                  2. Tap Share → Export as GPX
                </p>
              </div>

              <p style={{fontSize: '13px', color: C.text70, fontStyle: 'italic'}}>
                ℹ️ Most devices auto-save GPS tracks. Check if you have a file from your climb date.
              </p>
            </div>
          )}
        </div>

        {/* Quality Indicator */}
        {qualityScore !== null && coordinates.trim().length > 0 && (
          <div style={{...styles.qualityBox, borderColor: qualityScore >= 70 ? C.success : C.warning}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
              <span>Quality Score</span>
              <span style={{fontSize: '18px', fontWeight: 'bold', color: qualityScore >= 70 ? C.success : C.warning}}>
                {qualityScore}/100
              </span>
            </div>

            {validationIssues.length > 0 && (
              <div style={{fontSize: '13px', color: C.text70}}>
                {validationIssues.map((issue, i) => (
                  <div key={i} style={{marginBottom: '4px', paddingLeft: '4px'}}>
                    ⚠ {issue}
                  </div>
                ))}
              </div>
            )}

            {qualityScore >= 90 && (
              <p style={{fontSize: '13px', color: C.success, marginTop: '4px'}}>
                ✓ High quality - will likely be auto-approved
              </p>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div style={{...styles.formSection}}>
          <label style={{...styles.label}}>
            <input
              type="checkbox"
              checked={confirmations.climbed}
              onChange={(e) => setConfirmations({...confirmations, climbed: e.target.checked})}
              style={{marginRight: '8px'}}
            />
            I personally climbed this exact route on:
          </label>
          <input aria-label="Climb date"
            type="date"
            value={climbDate}
            onChange={(e) => setClimbDate(e.target.value)}
            style={{...styles.input, marginLeft: '16px', marginBottom: '12px'}}
          />

          <label style={{...styles.label}}>
            <input
              type="checkbox"
              checked={confirmations.isRoute}
              onChange={(e) => setConfirmations({...confirmations, isRoute: e.target.checked})}
              style={{marginRight: '8px'}}
            />
            This is the climbing route, not the approach
          </label>

          <label style={{...styles.label, marginTop: '16px'}}>GPS Device Type</label>
          <select aria-label="GPS device type"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            style={{...styles.input}}
          >
            <option>Apple Watch</option>
            <option>Garmin</option>
            <option>Strava</option>
            <option>Komoot</option>
            <option>AllTrails</option>
            <option>Caltopo</option>
            <option>Manual GPS Logger</option>
            <option>Other</option>
          </select>

          <label htmlFor="gps-email" style={{...styles.label}}>Email (optional)</label>
          <input
            id="gps-email"
            type="email"
            value={climbEmail}
            onChange={(e) => setClimbEmail(e.target.value)}
            placeholder="your.email@example.com"
            style={{...styles.input}}
          />

          <label htmlFor="gps-name" style={{...styles.label}}>Your name (optional, for attribution)</label>
          <input
            id="gps-name"
            type="text"
            value={climbName}
            onChange={(e) => setClimbName(e.target.value)}
            placeholder="Anonymous"
            style={{...styles.input}}
          />

          <label htmlFor="gps-notes" style={{...styles.label}}>Additional notes</label>
          <textarea
            id="gps-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Early season snow / Late season dry / Took West Ridge variant"
            style={{...styles.textarea, height: '80px'}}
          />
        </div>

        {/* Buttons */}
        <div style={{...styles.buttonGroup}}>
          <button
            onClick={onClose}
            style={{...styles.button}}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{...styles.button, ...styles.buttonPrimary}}
            disabled={submitting || !coordinates.trim() || !climbDate}
          >
            {submitting ? 'Submitting...' : 'Submit Track'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    backgroundColor: C.bg,
    borderRadius: '12px',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid ' + C.border,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid ' + C.border,
    position: 'relative'
  },
  heading: {
    margin: '0 0 4px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: C.text
  },
  subheading: {
    margin: '0',
    fontSize: '14px',
    color: C.text70
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    color: C.text70,
    fontSize: '20px',
    cursor: 'pointer'
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderLeft: '3px solid ' + C.error,
    margin: '0'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid ' + C.border,
    padding: '0'
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid ' + C.border,
    color: C.text70,
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'center'
  },
  tabContent: {
    padding: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: C.text
  },
  helpText: {
    margin: '0 0 8px',
    fontSize: '13px',
    color: C.text70
  },
  textarea: {
    width: '100%',
    minHeight: '150px',
    padding: '12px',
    backgroundColor: C.bg70,
    border: '1px solid ' + C.border,
    borderRadius: '8px',
    color: C.text,
    fontFamily: 'monospace',
    fontSize: '12px',
    resize: 'vertical'
  },
  uploadBox: {
    padding: '24px',
    border: '2px dashed ' + C.border,
    borderRadius: '8px',
    textAlign: 'center',
    backgroundColor: C.bg70
  },
  uploadLabel: {
    cursor: 'pointer',
    display: 'block',
    color: C.accent
  },
  deviceGuide: {
    fontSize: '14px',
    color: C.text70
  },
  qualityBox: {
    margin: '16px',
    padding: '12px',
    backgroundColor: C.bg70,
    border: '1px solid ' + C.border,
    borderRadius: '8px',
    fontSize: '14px'
  },
  formSection: {
    padding: '16px'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '12px',
    backgroundColor: C.bg70,
    border: '1px solid ' + C.border,
    borderRadius: '6px',
    color: C.text,
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderTop: '1px solid ' + C.border
  },
  button: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: C.bg70,
    color: C.text,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  buttonPrimary: {
    backgroundColor: C.accent,
    color: '#000'
  },
  successContent: {
    padding: '32px',
    textAlign: 'center'
  },
  scoreBox: {
    padding: '16px',
    backgroundColor: C.bg70,
    borderRadius: '8px',
    marginBottom: '12px'
  },
  text: {
    margin: '0 0 12px',
    fontSize: '14px',
    color: C.text
  },
  textSmall: {
    margin: '12px 0 0',
    fontSize: '13px',
    color: C.text70
  }
}
