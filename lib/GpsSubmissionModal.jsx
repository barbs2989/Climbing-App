import { useState } from 'react'
import { parseGpxXml, parseCoordinateList, validateGpxQuality, calculateQualityScore, detectGpxFormat } from './gpxParser'
import { POP_CLOSE } from "./popupChrome.js";
import TrailDrawMap from './TrailDrawMap'
import { MIN_RECORDED_PTS } from './track'
import { supabase } from './supabase'
import { tx } from './tapWords.js'
import ActionIcon from '../src/components/ActionIcon.tsx'
import { C } from '../ClimbMatchCore.jsx'

export default function GpsSubmissionModal({ routeId, routeName, crag, parkAt, cragAt, onClose, onSuccess, initialPts, initialShape }) {
  // A crag's trail can be TRACED on the map ('draw') as well as recorded. It opens first on a crag
  // whenever the map has somewhere to open: the parking pin or the crag's own coordinate.
  // ...or when a line drawn in the desktop tool is handed over: it drew without a pin, so this can show it.
  const canDraw = !!(crag && (parkAt || cragAt || (initialPts && initialPts.length)))
  const [tab, setTab] = useState(canDraw ? 'draw' : 'paste') // 'draw', 'paste', 'upload', 'devices'
  // A line already drawn in the desktop drawing tool (lib/DrawRoute.jsx) arrives here to be submitted.
  const [drawPts, setDrawPts] = useState(() => (canDraw && initialPts && initialPts.length ? initialPts : []))
  const drawing = tab === 'draw'
  // A leg still being routed: what is on screen is about to change, so it is not yet a line to submit.
  const [drawPending, setDrawPending] = useState(false) // a handed-over line never carries a pending leg: the desktop tool waits for routing before it hands over
  const [coordinates, setCoordinates] = useState('')
  const [deviceType, setDeviceType] = useState('Garmin')
  const [climbDate, setClimbDate] = useState('')
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
    // MIN_RECORDED_PTS: the map draws no line under 10 points (lib/track.js), and review_gps_submission
    // (0397) refuses one, so a shorter trace is stopped here rather than approved into nothing.
    if (drawing && drawPending) { setError('A leg of the trail is still being followed. Wait a moment, then submit.'); return }
    if (drawing ? drawPts.length < MIN_RECORDED_PTS : coordinates.trim().length === 0) {
      setError(drawing ? tx('Tap at least ' + MIN_RECORDED_PTS + ' points along the trail, one at every bend and fork (you have ' + drawPts.length + ')') : 'Please paste or upload GPS coordinates')
      return
    }

    if (!climbDate) {
      setError(crag ? 'Please select when you last walked it' : 'Please select the climb date')
      return
    }

    if (!confirmations.climbed) {
      setError(crag ? 'Please confirm you have walked this trail yourself' : 'Please confirm you personally climbed this route')
      return
    }

    if (!confirmations.isRoute) {
      setError(crag ? 'Please confirm this is the walk in, not the climb' : 'Please confirm this is the climbing route, not the approach')
      return
    }

    // Parse coordinates
    const format = drawing ? null : detectGpxFormat(coordinates)
    let parsed = drawing ? drawPts : []

    if (format === 'gpx') {
      parsed = parseGpxXml(coordinates)
    } else if (format === 'coordinates') {
      parsed = parseCoordinateList(coordinates)
    }

    if (!drawing && parsed.length < MIN_RECORDED_PTS) {
      setError('Track needs at least ' + MIN_RECORDED_PTS + ' points')
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
      // The Edge Functions gateway runs with verify_jwt on and rejects a request that
      // carries no key — these three calls sent none, so every live submission got a
      // 401. The publishable key is public by design; the functions do their own
      // rate limiting and never trust a recipient or text from this request.
      // Signed in, the bearer is the climber's own session token: the functions read the
      // receipt address from it (never from this body), so a receipt can only go to the
      // account that submitted. Signed out it is the public key, and no email is sent.
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
      let accessToken = null
      try {
        const { data } = supabase ? await supabase.auth.getSession() : { data: null }
        accessToken = (data && data.session && data.session.access_token) || null
      } catch (_e) { accessToken = null }
      const fnHeaders = { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${accessToken || ANON_KEY}` }
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-gps`, {
        method: 'POST',
        headers: fnHeaders,
        body: JSON.stringify({
          routeId,
          gpxData: parsed,
          climberName: climbName || undefined,
          // A traced line is said to be one, so a reviewer never reads it as a recording.
          deviceType: drawing ? 'Traced on the map' : deviceType,
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

      // Notify climber: only when signed in, since only then is there an address (the
      // account's own). Only the id: the function reads the address, name and route
      // from the submission row and checks it against the caller's session.
      if (accessToken) fetch(`${SUPABASE_URL}/functions/v1/notify-gps-climber`, {
        method: 'POST',
        headers: fnHeaders,
        body: JSON.stringify({ submissionId })
      }).then(r => r.json())
        .then(d => { if (d && d.emailed) setEmailed(true) })
        .catch(err => console.error('Climber notification failed:', err))

      // Notify admin
      fetch(`${SUPABASE_URL}/functions/v1/notify-gps-admin`, {
        method: 'POST',
        headers: fnHeaders,
        body: JSON.stringify({ submissionId })
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

  // ---- Presentation -------------------------------------------------------------------------
  // Drawn in the app's own sheet chrome (ReportContentSheet, AreaSuggestFix): C.surface card, a
  // header ROW with the title on the left and the shared ✕ on the right, small caps section labels,
  // C.card fields and one full-width primary action in a footer. It used to carry a private
  // palette and put the ✕ in the header's flow, so the close button landed under the description,
  // on the left, wherever the copy happened to end ("in a terrible place", owner 2026-11-11).
  const S = sheetStyles()
  const title = crag ? 'Add the trail to the crag' : 'Submit a GPS track'
  const dismiss = submitting ? undefined : onClose
  // TrailDrawMap draws with the keys this file's old palette used; feed it the app's colours.
  const mapC = { accent: C.blue, warning: C.orange, bg: C.bg, bg70: C.card, border: C.border, text: C.text, text70: C.textMuted }

  const shell = (body) => (
    <div onClick={dismiss} tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape' && !submitting) onClose() }} role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, background: C.scrimStrong, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 12px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
      <div onClick={(e) => e.stopPropagation()} style={S.card}>
        <div style={S.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.title}>{showSuccess ? 'Thanks for contributing' : title}</div>
            {routeName ? <div style={S.subtitle}>{routeName}</div> : null}
          </div>
          <button aria-label="Close" style={POP_CLOSE} onClick={onClose}>✕</button>
        </div>
        {body}
      </div>
    </div>
  )

  if (showSuccess) {
    return shell(
      <div style={{ padding: '22px 16px 16px', textAlign: 'center' }}>
        <div aria-hidden="true" style={S.successMark}>✓</div>
        {/* No turnaround is promised: a person reviews tracks when they can, and nothing measures or enforces 24-48 hours. */}<p style={{ margin: '0 0 12px', fontSize: 14, color: C.text, lineHeight: 1.5 }}>{crag ? 'Your trail to the crag is waiting for a person to review it.' : 'Your GPS track is waiting for a person to review it.'}</p>
        {/* The score rates a RECORDING (point density, spread); a traced line has neither, so it shows none. */}{drawing ? null : <div style={{ ...S.box, marginBottom: 12, fontSize: 15, fontWeight: 700, color: C.blue }}>Quality score: {qualityScore}/100</div>}
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
          {crag ? "Once it's approved the trail shows on the crag map of every climb at this crag." : "Once it's approved your track shows up on this route's page."} Thank you for helping the climbing community!
          {emailed ? " We've emailed you a receipt." : ''}
        </p>
        <button style={S.primary} onClick={onClose}>Done</button>
      </div>
    )
  }

  const tabs = canDraw ? ['draw', 'paste', 'upload', 'devices'] : ['paste', 'upload', 'devices']
  const tabLabel = { draw: 'Draw on map', paste: 'Paste', upload: 'Upload file', devices: 'How to export' }
  const check = (on, label, set) => (
    <button role="checkbox" aria-checked={on} onClick={() => set(!on)} style={{ ...S.checkRow, border: '1px solid ' + (on ? C.blue : C.border), background: on ? C.blueBg : C.card }}>
      <span aria-hidden="true" style={{ ...S.checkBox, border: '1px solid ' + (on ? C.blue : C.borderHi), background: on ? C.blueSolid : 'transparent' }}>{on ? '✓' : ''}</span>
      <span style={{ minWidth: 0, fontSize: 13.5, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{label}</span>
    </button>
  )
  const devices = [
    ['Apple Watch', ['Open the Health app on your iPhone', 'Activity → Segment → your climb', 'Share → Save to Files → choose GPX']],
    ['Garmin Connect', ['Go to garmin.com/connect', 'Find the activity from your climb date', 'Menu → Export → GPX']],
    ['Strava', ['Open the activity in the Strava app', 'Tap the menu (⋮) → Export GPX']],
    ['Komoot or AllTrails', ['Find your recorded activity', 'Tap Share → Export as GPX']],
  ]

  return shell(
    <>
      <div style={{ padding: 16 }}>
        {/* A crag climb summits nothing, so its track is the walk in: say where to start and stop the recording. */}
        {crag && <p style={{ margin: '0 0 14px', fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>From where you park to the base of the crag, or on to this climb if it sits away from the main wall. Stop at the base: the climb itself is not part of it. Trace it on the map, or add a recording from your phone or watch.</p>}

        <div style={S.section}>{crag ? 'THE TRAIL' : 'THE TRACK'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-current={tab === t ? 'true' : undefined} style={{ ...S.pill, border: '1px solid ' + (tab === t ? C.blue : C.border), background: tab === t ? C.blueBg : C.card, color: tab === t ? C.blue : C.textSub }}>
              {tabLabel[t]}
            </button>
          ))}
        </div>

        {/* Kept MOUNTED behind the other tabs: unmounting it would turn a routed line back into one anchor per point and lose Undo. */}
        {canDraw && <div style={{ display: tab === 'draw' ? 'block' : 'none' }}><TrailDrawMap start={parkAt} end={cragAt} pts={drawPts} setPts={setDrawPts} C={mapC} active={tab === 'draw'} onShape={(s) => setDrawPending(s.some((x) => x.pending))} initialShape={initialShape && initialShape.length ? initialShape : null} /></div>}

        {tab === 'paste' && (
          <div>
            <p style={S.help}>Paste GPX XML, or one coordinate per line (lat, lng).</p>
            <textarea aria-label="Paste coordinates or GPX"
              value={coordinates}
              onChange={handlePaste}
              placeholder="48.123, -121.456&#10;48.124, -121.457&#10;...&#10;&#10;or paste GPX XML starting with &lt;?xml..."
              style={{ ...S.field, minHeight: 150, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, resize: 'vertical' }}
            />
          </div>
        )}

        {tab === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{ ...S.drop, ...(dragOver ? { borderColor: C.blue, background: C.blueBg } : {}) }}
          >
            <input aria-label="Upload GPX file"
              type="file"
              accept=".gpx"
              onChange={handleFileUpload}
              className="cm-file-input"
              id="gpxFileInput"
            />
            <label htmlFor="gpxFileInput" style={{ cursor: 'pointer', display: 'block' }}>
              <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><ActionIcon name="doc" size={24} color={C.blue} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>Choose a .gpx file</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{dragOver ? 'Drop the .gpx to load it' : 'or drag and drop it here'}</div>
            </label>
          </div>
        )}

        {tab === 'devices' && (
          <div>
            {devices.map(([name, steps]) => (
              <div key={name} style={{ ...S.box, marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>{name}</div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.textSub, lineHeight: 1.55 }}>
                  {steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
              </div>
            ))}
            <p style={{ ...S.help, margin: '4px 0 0' }}>Most devices save a track automatically. Look for one from the day you climbed.</p>
          </div>
        )}

        {/* Quality Indicator */}
        {!drawing && qualityScore !== null && coordinates.trim().length > 0 && (
          <div style={{ ...S.box, marginTop: 12, borderColor: qualityScore >= 70 ? C.green : C.amber }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.textSub }}>Quality score</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: qualityScore >= 70 ? C.green : C.amber }}>{qualityScore}/100</span>
            </div>
            {validationIssues.length > 0 && (
              <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>
                {validationIssues.map((issue, i) => <div key={i} style={{ marginBottom: 3 }}>{issue}</div>)}
              </div>
            )}
            {qualityScore >= 90 && <div style={{ fontSize: 12.5, color: C.green, marginTop: 6 }}>High quality: likely to be approved quickly</div>}
          </div>
        )}

        <div style={{ ...S.section, marginTop: 18 }}>{crag ? 'WHEN YOU WALKED IT' : 'WHEN YOU CLIMBED IT'}</div>
        <input aria-label={crag ? 'Date you last walked it' : 'Climb date'}
          type="date"
          value={climbDate}
          onChange={(e) => setClimbDate(e.target.value)}
          style={{ ...S.field, colorScheme: 'dark', marginBottom: 10 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {check(confirmations.climbed, crag ? "I've walked this trail myself" : 'I personally climbed this exact route', (v) => setConfirmations({ ...confirmations, climbed: v }))}
          {check(confirmations.isRoute, crag ? 'This is the walk in from parking, not the climb' : 'This is the climbing route, not the approach', (v) => setConfirmations({ ...confirmations, isRoute: v }))}
        </div>

        {!drawing && <>
          <label htmlFor="gps-device" style={{ ...S.section, display: 'block', marginTop: 18 }}>RECORDED WITH</label>
          <select id="gps-device" aria-label="GPS device type"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value)}
            style={{ ...S.field, colorScheme: 'dark' }}
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
        </>}

        <div style={{ ...S.section, marginTop: 18 }}>ABOUT YOU <span style={{ fontWeight: 500 }}>(optional)</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input id="gps-name" aria-label="Your name (optional)" type="text" value={climbName} onChange={(e) => setClimbName(e.target.value)} placeholder="Your name" style={{ ...S.field, flex: '1 1 150px', minWidth: 0 }} />
        </div>

        <label htmlFor="gps-notes" style={{ ...S.section, display: 'block', marginTop: 18 }}>NOTES <span style={{ fontWeight: 500 }}>(optional)</span></label>
        <textarea
          id="gps-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={crag ? 'e.g., Keep right at the fork by the big boulder / Muddy in spring' : 'e.g., Early season snow / Late season dry / Took West Ridge variant'}
          rows={3}
          style={{ ...S.field, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {/* The footer holds the one way forward, and the reason a submit was refused sits right on top
          of it, where the climber's eye already is, rather than at the head of a long form. */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid ' + C.border }}>
        {error && <div role="alert" style={S.error}>{error}</div>}
        {/* WHY Submit is off, in words on the sheet: a tooltip on a disabled button is shown by no phone and read by no screen reader. */}
        {drawing && !submitting && (drawPts.length < MIN_RECORDED_PTS || drawPending) ? <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 8, textAlign: 'right' }}>{drawPts.length < MIN_RECORDED_PTS ? tx('Tap at least ' + MIN_RECORDED_PTS + ' points along the trail to submit it (you have ' + drawPts.length + ').') : 'Still following the trail for a leg.'}</div> : null}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={submitting} style={S.secondary}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || (drawing && (drawPts.length < MIN_RECORDED_PTS || drawPending))} title={drawing && drawPts.length < MIN_RECORDED_PTS ? tx('Tap at least ' + MIN_RECORDED_PTS + ' points along the trail') : drawing && drawPending ? 'Still following the trail for a leg' : undefined} style={{ ...S.primary, flex: 2, ...(submitting || (drawing && (drawPts.length < MIN_RECORDED_PTS || drawPending)) ? { background: C.border, color: C.textMuted, cursor: 'default' } : {}) }}>
            {submitting ? 'Submitting…' : crag ? 'Submit trail' : 'Submit track'}
          </button>
        </div>
      </div>
    </>
  )
}

// Built at render, not at module scope: C comes from core (check:no-module-scope-core-reads).
function sheetStyles() {
  const field = { width: '100%', boxSizing: 'border-box', padding: '10px 11px', borderRadius: 9, border: '1px solid ' + C.border, background: C.card, color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none' }
  const btn = { boxSizing: 'border-box', padding: 12, borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
  return {
    card: { background: C.surface, borderRadius: 18, width: '100%', maxWidth: 500, border: '1px solid ' + C.border, overflow: 'hidden', color: C.text },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid ' + C.border },
    title: { fontSize: 16, fontWeight: 700, color: C.text },
    subtitle: { fontSize: 12, color: C.textMuted, marginTop: 2, overflowWrap: 'anywhere' },
    section: { fontSize: 12, color: C.textMuted, fontWeight: 700, letterSpacing: 0.3, marginBottom: 8 },
    help: { margin: '0 0 8px', fontSize: 12.5, color: C.textMuted, lineHeight: 1.45 },
    pill: { padding: '7px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
    field,
    box: { background: C.card, border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px', textAlign: 'left' },
    drop: { padding: 24, border: '2px dashed ' + C.borderHi, borderRadius: 12, textAlign: 'center', background: C.card },
    checkRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '11px 12px', borderRadius: 11, cursor: 'pointer', boxSizing: 'border-box', fontFamily: 'inherit' },
    checkBox: { flexShrink: 0, width: 18, height: 18, borderRadius: 5, color: C.onSolid, fontSize: 12, lineHeight: '16px', textAlign: 'center', fontWeight: 700 },
    error: { background: C.redBg, border: '1px solid ' + C.red, borderRadius: 10, padding: '9px 12px', marginBottom: 10, fontSize: 13, color: C.text, lineHeight: 1.45 },
    successMark: { width: 44, height: 44, margin: '0 auto 12px', borderRadius: 22, background: C.greenBg, border: '1px solid ' + C.green, color: C.green, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    primary: { ...btn, width: '100%', flex: 1, background: C.blueSolid, color: C.onSolid, border: '1px solid rgba(0,0,0,0.22)' },
    secondary: { ...btn, flex: 1, background: C.card, color: C.text, border: '1px solid ' + C.border },
  }
}
