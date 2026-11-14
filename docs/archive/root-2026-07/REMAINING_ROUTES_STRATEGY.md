# Remaining 16 Routes — Completion Strategy

**Status:** 16 routes (3.2%) lack sufficient public GPS data  
**Target:** Crowdsource climber GPS submissions  
**Timeline:** Ongoing community contribution model

---

## The 16 Routes

### Group A: Ambiguous Peak Names (3 routes)
These peaks don't appear in standard climbing databases; require verification of peak identity.

1. **Mount Seattle – Noyes Basin Route** (wa_mount_seattle_noyes_basin)
   - Issue: "Mount Seattle" not found in Mountain Project, SummitPost, USGS standard databases
   - Possible IDs: Could be Peak 6,246 ft in Snoqualmie Pass area or elsewhere
   - Need: Climber confirmation of exact peak + GPS trace
   - Approach: 1 waypoint (summit estimated)

2. **Mount Seattle – Seattle Creek Basin Route** (wa_mount_seattle_seattle_creek)
   - Same issue as above
   - Need: Trailhead coords + summit coords + route trace

3. **Mesachie Peak – Standard Route** (wa_mesachie_peak_standard)
   - Found: SR 20 near Easy Pass area (coordinates exist)
   - Issue: Route-specific GPS trace not in public sources
   - Need: Climber-submitted GPS from recent ascent

### Group B: Single-Waypoint Routes (8 routes)
Routes have only 1-2 waypoints (typically summit or parking); need complete route trace.

4. **Lincoln Peak – X Couloir Southwest Face** (wa_lincoln_peak_standard)
   - Current: 1 waypoint (approx summit area)
   - Grade: III-IV ice/mixed
   - Need: Trailhead → approach → summit GPS sequence (8+ points)

5. **Morning Star Peak – Mile High Club** (wa_morning_star_peak_mile_high_club)
   - Current: 1 waypoint
   - Grade: IV technical
   - Need: Route trace from Sunrise Mine trail area

6. **Guye Peak – North Route / Hidden Ridge** (wa_guye_peak_north_route)
   - Current: 3 waypoints (partial data)
   - Need: Complete trace with more intermediate points

7. **Little Sister – North Face** (wa_little_sister_north_face)
   - Current: 1 waypoint
   - Need: Trailhead → approach → summit trace

8. **Little Sister – West Face** (wa_little_sister_west_face)
   - Current: 1 waypoint
   - Need: Full route GPS

9. **Little Tahoma – Cowlitz/Ingraham Glaciers** (wa_little_tahoma_cowlitz_ingraham)
   - Current: 1 waypoint (parking)
   - Note: Rainier subpeak; glaciated route
   - Need: Approach + glacier route + descent trace

10. **Mount Terror – Stoddard Buttress** (wa_mount_terror_stoddard_buttress)
    - Current: 1 waypoint (summit estimated)
    - Need: Complete route from approach to summit

11. **Mount Terror – West Ridge** (wa_mount_terror_west_ridge)
    - Current: 1 waypoint
    - Need: Ridge approach + summit trace

### Group C: Zero-Data Routes (2 routes)
No waypoints; requires full research from scratch.

12. **Guye Peak – South Gully / South Spur** (wa_guye_peak_south_gully)
    - Status: No waypoints in database
    - Need: Complete approach + route trace

13. **Dragontail Peak – Triple Couloirs** (wa_dragontail_peak_triple_couloirs)
    - Status: 0 waypoints (though researched, no public GPS coords available)
    - Grade: III ice/alpine
    - Need: Stuart Lake trailhead → approach → route trace

---

## Crowdsource Contribution Model

### In-App "Report Missing Data" Feature
```
For each of the 16 routes, add a banner:
┌─────────────────────────────────────────────┐
│ 📍 Help improve this route                   │
│ GPS data incomplete. Have a GPX track?       │
│ ────────────────────────────────────────────│
│ [ Submit GPS Track ]  [ View submission form]│
└─────────────────────────────────────────────┘
```

### Climber Submission Form
1. **Route confirmation** — "I climbed this exact route on [date]"
2. **GPS source** — Garmin/Apple Watch/Caltopo/.gpx file
3. **File upload** — Paste GPX coordinates or upload .gpx file
4. **Verification** — "My track is accurate and represents the climbing route (not approach)"
5. **Contact** — Optional email for verification questions

### Backend: GPS Track Validation
```
For each submitted track:
1. Check point count (minimum 5 points required)
2. Verify coordinates are within ±0.1° of peak location
3. Validate elevation progression (should match climbing)
4. Check for suspicious patterns (straight lines = bad; organic curves = good)
5. Merge with existing waypoint data if partial
6. Flag for manual review if quality uncertain
```

---

## Prioritization: Quick Wins vs. Long-term

### Quick Wins (Can be solved immediately)
- **Mount Terror Stoddard Buttress** — Summit coords found; just needs approach trace (~4 more points from research)
- **Mount Terror West Ridge** — Same as above
- **Guye Peak North Route** — Already have 3 waypoints; can interpolate 2-3 more via topo maps

### Medium-effort (Requires targeted research)
- **Mount Maude East Ridge** — Found approach coords; need descent trace
- **Dragontail Triple Couloirs** — Found general area; need specific route trace
- **Lincoln Peak X Couloir** — Found summit area; need approach details

### Long-tail (Requires crowdsource)
- **Mount Seattle routes** — Peak identity unclear; must wait for climber verification
- **Little Sister variants** — Obscure peak; no public GPS in databases
- **Mesachie Peak** — Remote location; rarely climbed

---

## Implementation Roadmap

### Phase A: Community Contribution Framework (Week 1)
- [ ] Add "Report Data" button/modal to each route detail page
- [ ] Create simple GPX paste form or .gpx file upload widget
- [ ] Set up Supabase function to validate + merge GPS submissions
- [ ] Email notifications to admins when high-quality track submitted

### Phase B: Quick-Win Research (Week 2)
- [ ] Manually research Mount Terror, Guye Peak routes
- [ ] Extract additional waypoints from topo maps
- [ ] Apply SQL updates for 3-5 low-hanging fruit routes

### Phase C: Community Outreach (Ongoing)
- [ ] Post on WTA forums: "Help complete 16 WA alpine routes GPS data"
- [ ] Share form with climbing communities (Alpinist, climbing.com, local clubs)
- [ ] Feature "contributor spotlight" in app for submitted routes

### Phase D: Maintenance (Ongoing)
- [ ] Review submissions weekly
- [ ] Validate quality + merge high-confidence tracks
- [ ] Reach out to submitters for clarifications if needed

---

## SQL Template: How to Apply Submitted GPS

```sql
-- When climber submits track for route
-- Validate in app/backend first, then apply:

UPDATE routes
SET
  gpx = '[
    [48.xxx, -121.xxx],  -- trailhead parking
    [48.xxx, -121.xxx],  -- intermediate
    [48.xxx, -121.xxx],  -- high camp / crux
    [48.xxx, -121.xxx],  -- summit
    ... more points ...
  ]'::jsonb,
  waypoints = '[
    {"type":"parking", "name":"Trailhead", "lat":48.xxx, "lng":-121.xxx, "elev":xxxx, "distMi":0},
    {"type":"junction", "name":"Trail junction", "lat":48.xxx, "lng":-121.xxx, "elev":xxxx, "distMi":x.x},
    ... more waypoints ...
    {"type":"summit", "name":"Peak name", "lat":48.xxx, "lng":-121.xxx, "elev":xxxx, "distMi":x.x}
  ]'::jsonb,
  source = 'User submission: [climber_name] on [date]'  -- Track attribution
WHERE id = 'wa_route_id';
```

---

## Acceptance Criteria for GPS Submissions

**ACCEPT if:**
- ✓ 5+ waypoints on submitted track
- ✓ Route starts near known trailhead
- ✓ Route ends at peak summit (within 100 ft elevation)
- ✓ Climber confirms they personally climbed this exact route
- ✓ Track shows organic terrain-following (not straight lines)
- ✓ Elevation gain/loss matches expected grade

**REQUEST CLARIFICATION if:**
- ⚠️ Less than 5 waypoints
- ⚠️ Track ends far from summit
- ⚠️ Elevation progression seems off (too little gain for grade)
- ⚠️ Climber unsure of exact route
- ⚠️ Track may include approach variations

**REJECT if:**
- ✗ Climber hasn't personally climbed the route
- ✗ Track quality degraded (GPS dropouts, impossible jumps)
- ✗ Coordinates way off peak location
- ✗ Appears to be auto-generated or not actual climbing

---

## Expected Timeline

| Timeframe | Target | Method |
|-----------|--------|--------|
| Week 1-2 | 3-5 routes | Targeted research |
| Month 1 | +3-5 routes | Community submissions |
| Months 2-6 | +4-8 routes | Ongoing crowdsource |
| 6+ months | Final 0-2 routes | Long-tail or accept as unfillable |

**Realistic Goal:** 490+/499 routes (98%+) with complete data by end of Q3 2026.

---

## Example: How Climber Contributes

**Scenario:** User climbed Mount Terror's Stoddard Buttress via iPhone GPS watch

1. **In app:** Opens Stoddard Buttress route → Sees "Help improve" banner
2. **Clicks:** "Submit GPS Track"
3. **Fills form:**
   - "I climbed this route on July 15, 2026" ✓
   - Pastes GPS coordinates from watch export
   - Confirms: "This is the actual climbing route, not the approach" ✓
   - Optional: Adds note "Winter ascent, snow-filled gully"
4. **Backend validates:**
   - 8 waypoints on track ✓
   - Summit elevation ~8,554 ft ✓
   - Starts near Terror Basin trailhead ✓
5. **Admin reviews:**
   - Approves: "High quality, clear route"
   - Merges GPS + existing 1 waypoint
6. **Updates live:**
   - Route now shows complete GPX trace on map ✓
   - Climber credited: "GPS contributed by [name] on 7/15/26"

---

## Getting the Word Out

### Social Posts (To share with WTA, climbing.com, etc.)
```
🏔️ Help complete WA alpine GPS mapping!

The ClimbMatch climbing app has enriched 483/499 WA alpine routes 
with GPS data, descent info, hazards, and beta — but 16 specialty 
routes still need climber-submitted GPS tracks.

If you've climbed any of these routes with a GPS watch or device, 
we'd love your track:

• Mount Terror (Stoddard Buttress, West Ridge)
• Guye Peak (South Gully)
• Little Sister (North Face, West Face)  
• Lincoln Peak (X Couloir)
• Dragontail Peak (Triple Couloirs)
• + 6 more

📱 Submit at: [app link] → Route page → "Report Missing Data"

Your contribution helps climbers plan safer routes. Attribution 
included in every submission.
```

---

## Files for Community

- `GPS_SUBMISSION_GUIDE.md` — How to export GPX from various devices
- `ROUTE_PRIORITY_LIST.md` — Which 16 routes + why they need data
- `QUALITY_STANDARDS.md` — What makes a good GPS submission

---

## Summary

**16 routes represent only 3.2% of total coverage.** Instead of manually researching each (which would be slow and potentially inaccurate), activate the climbing community. Climbers have GPS watches. A simple submission form + clear instructions will organically fill the gap over time.

**Expected result:** 95%+ coverage by Q4 2026 via crowdsourcing.
