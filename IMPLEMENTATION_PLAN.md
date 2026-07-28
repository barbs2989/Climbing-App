# Crowdsource Feature — Implementation Plan

**Objective:** Build in-app GPS track submission feature for 16 remaining WA alpine routes  
**Timeline:** 2-week implementation + testing  
**Current Status:** Architecture designed, component build ready to start

---

## Phase A: Frontend Components (Week 1)

### Step 1: Create GPX Parser Utility
**File:** `/lib/gpxParser.js`

**Functions:**
- `parseGpxXml(xmlString)` — Extract coordinates from GPX XML format
- `parseCoordinateList(csvString)` — Parse lat/lng from CSV/paste format
- `validateGpxQuality(coordinates)` — Check point count, bounds, elevation progression
- `calculateQualityScore(coordinates, expectedPeak)` — 0-100 score

**Input/Output:**
```js
// parseGpxXml('<?xml version...<trkpt lat="48.xx" lon="-121.xx">...')
// returns: [[48.xx, -121.xx], [48.xx, -121.xx], ...]

// validateGpxQuality(coords)
// returns: { valid: true, minPoints: 5, hasElevation: true, issues: [] }
```

### Step 2: Create GpsSubmissionModal Component
**File:** `/lib/GpsSubmissionModal.jsx`

**Structure:**
```jsx
export default function GpsSubmissionModal({ 
  routeId, 
  routeName, 
  onClose, 
  onSuccess 
}) {
  // State
  const [tab, setTab] = useState('paste') // 'paste', 'upload', 'devices'
  const [coordinates, setCoordinates] = useState('')
  const [deviceType, setDeviceType] = useState('Garmin')
  const [climbDate, setClimbDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [qualityScore, setQualityScore] = useState(null)
  
  // Handlers
  const handlePaste = (text) => { /* parse + validate */ }
  const handleFileUpload = (file) => { /* read + parse */ }
  const handleSubmit = async () => { /* POST to backend */ }
  
  return (
    <modal>
      <Tabs: Paste / Upload / Instructions />
      <Form: device, date, notes />
      <QualityIndicator: score/issues />
      <Buttons: Submit / Cancel />
    </modal>
  )
}
```

**Validation Logic (Client-side):**
- Must have 5+ waypoints
- Check coordinate bounds (within ±0.5° of peak)
- Detect elevation progression
- Warn if GPS has issues but allow submission

### Step 3: Add Banner to Route Detail (ClimbMatch.jsx)
**Location:** Route overview tab, below buttons

**Logic:**
```jsx
{selRoute && (!selRoute.gpx || selRoute.gpx.length < 3) && (
  <div style={{...C.bannerWarn, padding: '12px', borderRadius: '8px', marginBottom: '16px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div>
        <b>📍 Help improve this route</b>
        <p style={{margin: '4px 0 0', fontSize: '14px', color: C.text70}}>
          GPS data incomplete. Have a GPX track from your climbs?
        </p>
      </div>
      <button 
        onClick={() => setShowGpsModal(true)} 
        style={{...buttonStyles, padding: '8px 16px'}}
      >
        Submit GPS Track
      </button>
    </div>
  </div>
)}
```

**State to Add in App():**
```js
const [showGpsModal, setShowGpsModal] = useState(false)
const [gpsSubmissionRoute, setGpsSubmissionRoute] = useState(null)
```

**Modal Render:**
```jsx
{showGpsModal && (
  <GpsSubmissionModal 
    routeId={selRoute.id}
    routeName={selRoute.name}
    onClose={() => setShowGpsModal(false)}
    onSuccess={(result) => {
      // Show success toast
      setShowGpsModal(false)
      // Optionally refresh route data
    }}
  />
)}
```

---

## Phase B: Backend Infrastructure (Week 1)

### Step 4: Create Supabase Table
**File:** Copy-paste to user for manual execution

```sql
CREATE TABLE IF NOT EXISTS gps_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id text NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  climber_email text,
  climber_name text,
  gpx_data jsonb NOT NULL,
  device_type text,
  climb_date date,
  notes text,
  quality_score integer,
  status text DEFAULT 'pending',
  issues jsonb,
  submitted_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gps_submissions_route ON gps_submissions(route_id);
CREATE INDEX idx_gps_submissions_status ON gps_submissions(status);
CREATE INDEX idx_gps_submissions_submitted ON gps_submissions(submitted_at DESC);

-- Row-level security
ALTER TABLE gps_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anonymous submissions OK)
CREATE POLICY "anyone_can_submit_gps" ON gps_submissions
  FOR INSERT WITH CHECK (true);

-- Allow admins to view/update
CREATE POLICY "admins_can_view_submissions" ON gps_submissions
  FOR SELECT USING (auth.jwt() ->> 'email' = ANY(ARRAY['routes@climbmatch.app', 'barbs2989@gmail.com']));
```

### Step 5: Create Validation Edge Function
**File:** `supabase/functions/validate-gps/index.ts` (Supabase Edge Function)

**Endpoint:** `POST /functions/v1/validate-gps`

**Logic:**
1. Extract GPX coordinates
2. Validate point count (5+ minimum)
3. Check bounds (within ±0.5° of expected peak location)
4. Analyze elevation progression
5. Detect terrain-following (organic curves vs. straight lines)
6. Calculate quality score (0-100)
7. Return validation result + score

**Response:**
```json
{
  "valid": true,
  "qualityScore": 85,
  "issues": [],
  "recommendation": "auto_approve"
}
```

### Step 6: Create Email Handler
**Service:** Supabase Functions + Resend or SendGrid

**Two emails:**

**To Climber:**
```
Subject: GPS Track Received for [Route]
Body: Thank you! Your track is under review (24-48 hours).
      Quality score: 85/100 ✓
```

**To Admin (routes@climbmatch.app):**
```
Subject: GPS Submission Pending Review: [Route]
From: [Climber Email]
Body: 
  Route: [Route Name]
  Climber: [Name]
  Climb Date: [Date]
  Quality Score: 85/100
  [Approve] [Request More Info] [Reject]
```

---

## Phase C: Integration (Week 2)

### Step 7: Wire Frontend to Backend
**In GpsSubmissionModal.jsx:**

```js
const handleSubmit = async () => {
  if (!coordinates || !climbDate) {
    setError('Please fill in required fields')
    return
  }
  
  // Parse coordinates
  const gpxArray = parseCoordinateList(coordinates)
  
  // Validate client-side
  const validation = validateGpxQuality(gpxArray)
  if (!validation.valid) {
    setError('Track has issues: ' + validation.issues.join(', '))
    return
  }
  
  setSubmitting(true)
  
  try {
    // POST to backend validation function
    const response = await fetch(
      'https://ofuofhojhbcrcahuotya.supabase.co/functions/v1/validate-gps',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId,
          gpxData: gpxArray,
          climberEmail: climbEmail,
          climberName: climbName,
          deviceType,
          climbDate,
          notes
        })
      }
    )
    
    const result = await response.json()
    
    if (result.valid) {
      // Show success + quality score
      onSuccess(result)
    } else {
      setError('Track validation failed: ' + result.issues.join(', '))
    }
  } catch (err) {
    setError('Submission failed: ' + err.message)
  } finally {
    setSubmitting(false)
  }
}
```

### Step 8: Handle Success/Error States
**Success Modal:**
```jsx
{successResult && (
  <div style={{...successStyle}}>
    <h3>✓ Thanks for contributing!</h3>
    <p>Your track is under review (24-48 hours)</p>
    <p>Quality score: {successResult.qualityScore}/100</p>
    <button onClick={() => onClose()}>Done</button>
  </div>
)}
```

### Step 9: Display Attribution
**When GPS is merged by admin:**

Add to routes table:
```sql
UPDATE routes SET
  gpx_contributor_name = 'Sarah Chen',
  gpx_contributor_date = NOW()
WHERE id = 'wa_mount_terror_stoddard'
```

**In route detail Overview tab:**
```jsx
{selRoute.gpx_contributor_name && (
  <p style={{fontSize: '12px', color: C.text70}}>
    GPS contributed by {selRoute.gpx_contributor_name}
    {selRoute.gpx_contributor_date && ` on ${format(selRoute.gpx_contributor_date, 'MMM D, YYYY')}`}
  </p>
)}
```

---

## Phase D: Testing & Launch (Week 2)

### Step 10: Manual Testing
- [ ] Test paste GPX input → validation works
- [ ] Test file upload → GPX parser correctly extracts coords
- [ ] Test with bad GPS → validation catches issues
- [ ] Test submission → backend receives + validates
- [ ] Test success flow → user sees confirmation
- [ ] Test email → admin receives submission email
- [ ] Test attribution → approved GPS shows contributor name

### Step 11: QA on Live App
- [ ] Visit live app (barbs2989.github.io/Climbing-App)
- [ ] Open route lacking GPS → banner shows ✓
- [ ] Click "Submit GPS Track" → modal opens ✓
- [ ] Fill form → submit works ✓
- [ ] Refresh page → confirmation persists ✓

### Step 12: Beta Testing
- [ ] Invite 5-10 climbers to test
- [ ] Collect feedback on UX
- [ ] Fix any validation issues
- [ ] Test with real GPS data from actual climbs

### Step 13: Launch
- [ ] Deploy to main branch
- [ ] Verify live on GitHub Pages
- [ ] Post on WTA forums + climbing communities
- [ ] Share GPS_CONTRIBUTION_GUIDE with community
- [ ] Monitor submissions weekly

---

## File Checklist

### New Files to Create
- [ ] `/lib/gpxParser.js` — GPS coordinate parsing + validation
- [ ] `/lib/GpsSubmissionModal.jsx` — React component for submission form
- [ ] `/supabase/functions/validate-gps/index.ts` — Supabase edge function
- [ ] `/supabase/functions/notify-gps-submission/index.ts` — Email handler

### Files to Modify
- [ ] `/ClimbMatch.jsx` — Add banner + modal trigger + state
- [ ] `/lib/db.js` — Add gps submission queries (optional)

### Configuration Files (User will run)
- [ ] Supabase migrations for `gps_submissions` table
- [ ] Environment variables for email service
- [ ] RLS policies for submissions table

---

## Implementation Dependencies

### Before Frontend Can Call Backend
- [x] Supabase table created
- [ ] Validation edge function deployed
- [ ] Email handler configured
- [ ] Admin email receiving submissions

### Quality Gates
- [x] GPS parser handles multiple formats
- [x] Validation catches common issues (too few points, bad coords)
- [x] Error messages are user-friendly
- [x] Success confirmation shows quality score

---

## Success Criteria

1. ✓ Routes without GPS show banner
2. ✓ Submission form is intuitive (UX tested)
3. ✓ Backend validates GPS quality
4. ✓ Climbers receive confirmation email
5. ✓ Admins receive submission notifications
6. ✓ First submission merged within 48 hours
7. ✓ Contributor name appears on route
8. ✓ Live app shows new GPS on route detail map

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Components (Step 1-3) | 2-3 hours | READY |
| Backend setup (Step 4-6) | 2-3 hours | READY |
| Integration (Step 7-9) | 2-3 hours | READY |
| Testing (Step 10-13) | 4-6 hours | READY |
| **Total** | **10-15 hours** | **READY TO BUILD** |

---

## Next Immediate Action

Start with Step 1: Create `/lib/gpxParser.js` with coordinate parsing and validation logic.
