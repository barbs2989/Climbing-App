# Crowdsource GPS Feature — Implementation Status

**Date:** 2026-07-28  
**Branch:** worktree-alpine-routes-enrichment-audit  
**Status:** Phase A Complete ✓ (Frontend built and integrated)

---

## What Was Built (Phase A: Frontend)

### Components Created

1. **lib/gpxParser.js** (200 lines)
   - `parseGpxXml()` — Extracts coordinates from GPX XML format
   - `parseCoordinateList()` — Parses lat/lng from CSV or comma-separated text
   - `validateGpxQuality()` — Validates track quality (5+ points, bounds, terrain following)
   - `calculateQualityScore()` — Scores GPS 0-100 based on point count, distance, spread
   - `haversineDistance()` — Calculates great-circle distance between coordinates
   - `detectGpxFormat()` — Auto-detects input format (GPX XML vs coordinates)

2. **lib/GpsSubmissionModal.jsx** (550 lines)
   - React modal component with full GPS submission workflow
   - Three tabs: Paste Coordinates, Upload File, Device Instructions
   - Form fields: Device type, climb date, email, name, notes
   - Real-time quality scoring as user pastes coordinates
   - Client-side validation (5+ points minimum, confirmations)
   - Success modal showing quality score
   - Dark theme styling using ClimbMatch's C palette
   - Responsive design for mobile

3. **ClimbMatch.jsx** (updated)
   - Import GpsSubmissionModal component
   - Add state: `const [showGpsModal, setShowGpsModal] = useState(false)`
   - Render GPS modal in portal (after shareOpen modal)
   - Add "Help improve this route" banner to Overview tab
   - Banner shows only when route has `gpx === null` or `gpx.length < 3`
   - Click "Submit Track" opens modal

### Build Status
✓ Fresh production build successful (`npm run build`)  
✓ No TypeScript/syntax errors  
✓ Bundle size: 1,438 KB (expected for large app)  
✓ All imports resolved  
✓ CSS styling integrated into components

---

## How It Works

### User Flow

1. **Discovery** → User opens route detail (e.g., Mount Terror)
2. **Call-to-Action** → Orange banner appears: "📍 Help improve this route"
3. **Action** → User clicks "Submit Track"
4. **Input** → Modal opens with options:
   - Paste GPX coordinates or CSV list
   - Upload .gpx file (device-specific instructions provided)
   - Select device type (Apple Watch, Garmin, Strava, etc.)
   - Confirm climb date + route identity
   - Optional notes
5. **Validation** → Real-time quality score updates (0-100)
   - Shows issues if track needs improvement
   - Minimum 5 waypoints required
6. **Submission** → User clicks "Submit Track"
   - Client validates all required fields
   - Shows success modal with quality score
   - Currently logs to console (backend not wired yet)
7. **Next Steps** → Success modal explains review timeline (24-48 hours)

### Quality Scoring Algorithm

**Starting score:** 50 points

**Bonuses:**
- +2 points per waypoint above 5 (max +30)
- +10 for reasonable route distance (2-20 miles)
- +10 for good geographic spread (>0.05° latitude/longitude)

**Penalties:**
- -5 per mile from expected peak location (if provided)

**Minimum quality:** 70 to be considered "good"  
**Auto-approve threshold:** 90+  

**Validation checks (hard failures):**
- Must have 5+ waypoints
- Coordinates must be within ±0.5° of peak
- No clusters of identical coordinates
- Points must show organic terrain-following (not straight lines)

---

## Next Steps (Phase B: Backend)

### 1. Create Supabase Table

**SQL (user to copy-paste into Supabase console):**

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
```

### 2. Deploy Supabase Edge Function

**Location:** `supabase/functions/validate-gps/index.ts`

**Functionality:**
- Validate submitted GPS data
- Calculate quality score server-side
- Return auto-approve/manual-review/reject decision
- Send notification emails

### 3. Wire Frontend to Backend

**In GpsSubmissionModal.jsx handleSubmit():**
```js
// Replace console.log with:
const response = await fetch('SUPABASE_URL/functions/v1/validate-gps', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routeId: selRoute.id,
    gpxData: parsed,
    climberEmail,
    climberName,
    deviceType,
    climbDate,
    notes
  })
})
const result = await response.json()
// Show success/error based on result
```

### 4. Email Notifications

**To Climber:**
- "Thanks! GPS track under review (24-48 hours)"
- Quality score + feedback if issues found
- Link to track status

**To Admin (routes@climbmatch.app):**
- Route name + climber
- Quality score + recommendation (auto-approve/manual/reject)
- One-click approve/request clarification/reject actions

### 5. Admin Approval Workflow

**Option A (Email-based):**
- Admin receives email with approval links
- Clicks [Approve] to merge GPS into route
- Clicks [Request Info] to ask questions
- Clicks [Reject] if quality too poor

**Option B (Dashboard, future):**
- Web interface listing pending submissions
- Batch approve function
- Track contributor metrics

---

## Remaining 16 Routes

Routes that need crowdsourced GPS:

### Group A: Ambiguous Peak Names (3 routes)
- Mount Seattle – Noyes Basin Route
- Mount Seattle – Seattle Creek Basin Route  
- Mesachie Peak – Standard Route

### Group B: Partial Data Routes (10 routes)
- Lincoln Peak – X Couloir Southwest Face
- Morning Star Peak – Mile High Club
- Guye Peak – North Route
- Little Sister – North Face
- Little Sister – West Face
- Little Tahoma – Cowlitz/Ingraham Glaciers
- Mount Terror – Stoddard Buttress
- Mount Terror – West Ridge
- Mount Maude – East Ridge
- Sherpa Balanced Rock – Northeast Couloir

### Group C: Zero-Data Routes (2 routes)
- Guye Peak – South Gully / South Spur
- Dragontail Peak – Triple Couloirs

**Expected timeline:**
- Week 1-2: Community submissions for high-priority routes
- Month 1: +3-5 additional routes from climbers
- Months 2-6: Ongoing submissions, reach 95%+ coverage by Q4 2026

---

## Testing Checklist (Phase D)

Before launch, verify:

- [ ] Banner appears on routes with `gpx === null` or `gpx.length < 3`
- [ ] Banner does NOT appear on routes with 3+ GPS points
- [ ] Click "Submit Track" → modal opens
- [ ] Paste GPX XML → coordinates parse correctly
- [ ] Paste CSV coordinates → quality score updates
- [ ] Upload .gpx file → coordinates extracted
- [ ] Device instructions tab → shows clear export steps
- [ ] Quality score updates as coordinates added
- [ ] Validation issues display when GPS incomplete
- [ ] Form validation blocks submit without required fields
- [ ] Success modal shows quality score + attribution info
- [ ] Modal closes gracefully on Cancel or success
- [ ] Mobile responsive (test on 390px viewport)
- [ ] Works with/without authentication

---

## Documentation Generated

### For Developers

- **CROWDSOURCE_FEATURE_SPEC.md** — Complete architecture, data structures, API design
- **IMPLEMENTATION_PLAN.md** — Step-by-step build tasks, dependencies, timeline
- **CLIMBMATCH_INTEGRATION_STEPS.md** — How to manually integrate if needed

### For Climbers

- **GPS_CONTRIBUTION_GUIDE.md** — Device-specific export instructions, quality standards, examples

### Strategic Context

- **REMAINING_ROUTES_STRATEGY.md** — Which 16 routes + completion roadmap
- **WA_ALPINE_ENRICHMENT_STATUS.md** — Full project summary (available in memory)

---

## Files Modified

- **ClimbMatch.jsx** — Added import, state, modal portal, banner (3 changes)
- **package.json** — No changes (all dependencies already present)
- **vite.config.js** — No changes needed

---

## Known Limitations (Phase A)

1. **Backend not wired yet** — Modal logs submission to console, doesn't actually submit
2. **No authentication check** — Anyone can submit (OK for beta, add auth layer in Phase C)
3. **No email handler** — Would need Supabase Functions + email service (Resend/SendGrid)
4. **No admin dashboard** — Approvals via email links only (future enhancement)
5. **No rate limiting** — Could be abused by bad actors (add in Phase C)
6. **No GPS editor** — Admin can't hand-edit GPS in dashboard (future enhancement)

**These limitations are intentional for Phase A. Phase C will wire backend.**

---

## Success Metrics

**After all phases complete:**

1. ✓ All 16 routes have GPS data submitted
2. ✓ 3+ submissions per route on average
3. ✓ >80% of submissions meet quality threshold
4. ✓ <48hr average approval time
5. ✓ Coverage reaches 495+/499 (99%+)
6. ✓ Climber NPS score for contribution experience >40

---

## How to Continue

### Immediate Next Steps

1. **User:** Run SQL to create `gps_submissions` table in Supabase
2. **Claude:** Deploy Supabase edge function `validate-gps`
3. **Claude:** Wire frontend modal to validation endpoint
4. **Claude:** Set up email handler

### Review & Testing

1. Test with real GPS data from Garmin/Strava
2. QA on live app (barbs2989.github.io/Climbing-App)
3. Beta invite 5-10 climbers
4. Monitor submissions, iterate on UX

### Launch

1. Deploy to main branch
2. Post on WTA forums + climbing communities
3. Share GPS_CONTRIBUTION_GUIDE with climbers
4. Monitor submissions weekly
5. Review and approve high-quality tracks

---

## Questions & Troubleshooting

**Q: Can climbers edit submissions?**  
A: Not in Phase A. Phase C can add edit/revoke functionality.

**Q: What if GPS quality is poor?**  
A: Modal shows issues, lets user revise before submitting. Admin can reject + ask for resubmission.

**Q: How are climbers credited?**  
A: Once approved, route shows "GPS contributed by [Name] on [date]".

**Q: Can submissions be anonymous?**  
A: Yes, "Anonymous" option in form.

**Q: What if route now HAS GPS?**  
A: Modal can check during submission, thank climber but note route is now complete.

---

## Files Ready for Handoff

All code is committed and buildable. Branch is ready for:

1. Backend development (edge function + email handler)
2. Testing (QA on live app)
3. Community outreach (announce feature)
4. Ongoing monitoring (review submissions weekly)

**Commit:** `3ac1a70` — "Build crowdsource GPS feature for 16 remaining WA alpine routes"

---

**Phase A Complete.** Ready for Phase B (Backend Infrastructure).
