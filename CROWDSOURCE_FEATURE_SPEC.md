# Crowdsource GPS Feature — Implementation Spec

**Objective:** Enable climbers to submit GPS tracks for the 16 WA alpine routes lacking sufficient public data.

**Target:** 16 routes (3.2% of 499) that need community GPS contributions

---

## Feature Overview

### User Journey

1. **Discovery:** Climber opens route detail (e.g., "Mount Terror - Stoddard Buttress")
2. **Call-to-Action:** Banner appears: "📍 Help improve this route — GPS data incomplete. Have a GPX track?"
3. **Action:** User clicks "Submit GPS Track"
4. **Modal:** GPS submission form appears with options:
   - Paste coordinates (textarea)
   - Upload .gpx file (file input)
   - Select device type (Apple Watch, Garmin, Strava, etc.)
   - Confirm route identity
   - Optional notes
5. **Submission:** User submits
6. **Backend:** System validates GPS quality
7. **Result:** 
   - If valid: "Thanks! Your track is under review"
   - If invalid: "Your track needs X more points — here's how to improve it"
8. **Attribution:** Once approved, route shows "GPS contributed by [Name]" + date

---

## Component Architecture

### 1. GPS Submission Banner (Route Detail Page)

**Location:** Route overview tab, below "Save route to objectives" button

**Visibility:** Show only on routes where `gpx IS NULL OR array_length(gpx) < 3`

**HTML/JSX:**
```jsx
{selRoute && (!selRoute.gpx || selRoute.gpx.length < 3) && (
  <div style={{...styles.banner, backgroundColor: C.warning}}>
    <div style={{...styles.bannerContent}}>
      <span>📍 Help improve this route</span>
      <p>GPS data incomplete. Have a GPX track?</p>
    </div>
    <button 
      onClick={() => setShowGpsModal(true)}
      style={{...styles.button, ...styles.primaryButton}}
    >
      Submit GPS Track
    </button>
  </div>
)}
```

### 2. GPS Submission Modal

**Component:** `GpsSubmissionModal.jsx` (new file in lib/)

**Props:**
- `routeId` (string)
- `routeName` (string)
- `onClose` (function)
- `onSuccess` (function — callback after successful submission)

**State:**
- `gpxData` — raw GPS coordinates
- `deviceType` — Apple Watch / Garmin / Strava / Other
- `climbDate` — when user climbed the route
- `notes` — optional additional info
- `submitting` — loading state
- `error` — error message

**Tabs/Sections:**
1. **Coordinates Input**
   - Paste GPX XML or CSV format
   - Examples provided
   - Format detection (auto-detect GPX vs. lat/lng list)

2. **File Upload**
   - `.gpx` file drag-and-drop
   - Parse GPX and extract coordinates

3. **Device Selection**
   - Dropdown: Apple Watch, Garmin Connect, Strava, Komoot, AllTrails, Caltopo, Manual GPS, Other
   - Show device-specific export instructions

4. **Route Confirmation**
   - "I personally climbed this route on [date]" checkbox
   - "This is the climbing route, not the approach" checkbox

5. **Optional Notes**
   - Conditions (early season / mid-season / late season)
   - Variations taken
   - Any issues with the track

### 3. Backend: GPS Validation Function

**Supabase Edge Function:** `validate_gps_submission`

**Input:**
```json
{
  "routeId": "wa_route_id",
  "gpxData": [[48.xxx, -121.xxx], ...],
  "climberEmail": "user@example.com",
  "deviceType": "Garmin",
  "climbDate": "2026-07-15",
  "notes": "..."
}
```

**Validation Steps:**
1. **Point Count:** ✓ Minimum 5 waypoints
2. **Coordinate Bounds:** ✓ Within ±0.5° of route's known peak location
3. **Elevation Progression:** ✓ Gains then loses elevation (realistic climbing)
4. **Terrain Following:** ✓ Points don't form straight lines (organic curves)
5. **No GPS Dropouts:** ✓ Points evenly distributed (not clustered at start/end)
6. **Matches Route Type:** ✓ Alpine routes should start low, end high (gain/loss ratio)

**Validation Output:**
```json
{
  "valid": true/false,
  "score": 95,  // 0-100 quality score
  "issues": ["needs 2 more points", "coordinates outside expected range"],
  "submissionId": "sub_xxxxx"  // for tracking
}
```

**Quality Tiers:**
- **Score 90+:** Auto-approve, merge immediately
- **Score 70-89:** Queue for manual review
- **Score <70:** Reject, provide feedback to climber

### 4. Email Handler

**Trigger:** When submission received

**To Climber:**
- "Thanks! Your GPS track is under review"
- Estimated review time: 24-48 hours
- Quality score + feedback if issues found

**To Admin (routes@climbmatch.app):**
- Route name + climber
- GPS quality score
- Submission ID for approval/rejection

---

## Database Schema

### New Table: `gps_submissions`

```sql
CREATE TABLE gps_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id text NOT NULL REFERENCES routes(id),
  climber_email text,
  climber_name text,
  gpx_data jsonb NOT NULL,  -- [[lat, lng], ...]
  device_type text,
  climb_date date,
  notes text,
  quality_score integer,
  status text DEFAULT 'pending',  -- pending/approved/rejected
  submitted_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gps_submissions_route ON gps_submissions(route_id);
CREATE INDEX idx_gps_submissions_status ON gps_submissions(status);
```

### Update Table: `routes`

Add column (already exists):
```sql
-- gps_submission_id uuid REFERENCES gps_submissions(id)
-- gps_contributor_name text
-- gps_contributor_date date
```

---

## Implementation Steps

### Phase A: Frontend (Week 1)
- [ ] Create `GpsSubmissionModal.jsx` component
- [ ] Add banner + modal trigger to route detail overview
- [ ] GPX parser utility (convert GPX XML / CSV to coordinate array)
- [ ] File upload + drag-drop handler
- [ ] Form validation (client-side)
- [ ] Toast notifications for submission status

### Phase B: Backend (Week 1)
- [ ] Create `gps_submissions` table in Supabase
- [ ] Write GPS validation function (points, bounds, elevation)
- [ ] Email handler (Supabase Functions + SendGrid/Resend)
- [ ] Admin approval workflow (simple dashboard or email-based)

### Phase C: Integration (Week 2)
- [ ] Wire frontend to backend (submit endpoint)
- [ ] Handle success/error states
- [ ] Display attribution on approved routes ("GPS by [Name]")
- [ ] Update route display if GPS was just contributed

### Phase D: Testing & Launch (Week 2)
- [ ] Manual testing with test submissions
- [ ] QA: verify validation catches bad data
- [ ] Beta: invite 5-10 climbers to test
- [ ] Launch: enable for all 16 routes

---

## UI/UX Details

### Banner Styling
```
backgroundColor: C.warning (yellow/orange)
borderRadius: 8px
padding: 16px
display: flex
justify-content: space-between
align-items: center
```

### Modal Structure
```
Title: "Submit GPS Track for [Route Name]"
Tabs:
  - Paste Coordinates
  - Upload File
  - Device Instructions

Form Fields:
  - Device dropdown
  - Climb date picker
  - Route confirmation checkboxes
  - Notes textarea

Buttons:
  - Submit (primary)
  - Cancel (secondary)
```

### After Submission
```
Success Modal:
  ✓ "Thanks for contributing!"
  - "Your track is under review (24-48 hours)"
  - Track quality score: 94/100
  - [Close]

Error Modal:
  ⚠ "Your track needs improvement"
  - "Needs 2 more waypoints"
  - "Coordinates outside expected range"
  - [Try Again] [Cancel]
```

---

## API Endpoint

### POST /api/submit-gps-track

**Request:**
```json
{
  "routeId": "wa_mount_terror_stoddard_buttress",
  "gpxCoordinates": [[48.77473, -121.29923], ...],
  "deviceType": "Apple Watch",
  "climbDate": "2026-07-20",
  "climbEmail": "climber@example.com",
  "climbName": "Optional Name",
  "notes": "Early season, firm snow"
}
```

**Response (Valid):**
```json
{
  "success": true,
  "submissionId": "sub_xxxxx",
  "qualityScore": 94,
  "message": "Track submitted successfully",
  "estimatedReviewTime": "24-48 hours"
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "errors": [
    "Needs 2 more waypoints (5 minimum)",
    "Coordinates outside expected bounds"
  ],
  "qualityScore": 45
}
```

---

## Quality Thresholds

| Metric | Minimum | Target |
|--------|---------|--------|
| Waypoint count | 5 | 8-10 |
| Coordinate precision | ±0.5° | ±0.1° |
| Elevation gain/loss | Realistic | 90%+ of expected |
| Point distribution | Even | No clusters |
| Terrain following | Organic curves | No straight lines |
| **Quality Score** | **70** | **90+** |

---

## Success Metrics

1. **Submissions:** Target 3-5 per route for the 16 routes (48-80 total)
2. **Approval Rate:** >80% of submissions meet quality threshold
3. **Time to Approval:** <48 hours average
4. **Climber Satisfaction:** NPS score for contribution experience
5. **Coverage Impact:** Expected to raise to 495+/499 (99%+) within 3 months

---

## Edge Cases

**What if climber submits for a route that now HAS GPS?**
- Check if recent route updates already included their climb
- Thank them but note route now has data
- Store submission anyway for attribution

**What if multiple climbers submit for the same route?**
- Accept highest quality score
- Display most recent or earliest (user preference)
- Credit all contributors

**What if GPS is good but climber didn't actually climb it?**
- No way to verify without manual review
- Trust-based system: assume good faith
- Flag suspicious patterns (same person, many routes, perfect data)

**What if climber revokes permission to use their GPS?**
- Allow one-click "Remove my contribution"
- Restore route to pre-contribution state
- Log in audit trail

---

## Future Enhancements

- Leaderboard: "Top GPS Contributors"
- Badge: "GPS Contributor" on climber profiles
- Feedback loop: "Your submission helped X climbers plan safely"
- Batch approvals: dashboard for admins to review 10 at once
- Automated re-checking: monthly validate live GPS coordinates against current conditions
