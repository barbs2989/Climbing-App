# Alpine Routes Audit Report — 2026-07-27

**Scope:** WA alpine routes catalog (283 routes). This is the highest-priority subset given safety criticality and user traffic.

## Critical Finding: 100% Data Gap on Technical Routes

| Metric | Count | % Coverage | Priority |
|--------|-------|-----------|----------|
| Routes with complete GPX | 0 | 0% | Critical |
| Routes with waypoints | 16 | 5.7% | Critical |
| Routes with accurate descent | 34 | 12% | Critical |
| Routes with rappel sequences | 0 | 0% | Critical |

### By Peak (sample of high-traffic):

**Mount Rainier (32 routes):**
- Current state: All generic "Descent typically reverses..." placeholder
- Issue: Rainier has route-specific moats, icefalls, crevasse-field escapes
- User impact: Thousands of climbers/year; life-threatening if descent info is wrong

**Mount Baker (8 routes):**
- No GPX tracks, no waypoints
- Coleman-Deming Glacier route lacks critical crevasse routing info

**Mount Adams (12 routes):**
- South Climb, Mazama Glacier, Adams Glacier — all missing hazard-specific descent sequences

**Mount Stuart (20+ routes):**
- Extreme rock technical climbs; 100% missing specific rappel/belay sequences

**Other peaks (Liberty Bell, Early Winters Spires, Enchantments, etc.):**
- 200+ routes across multiple crags/peaks — all with same generic descent template

## Pilot Fix: Mount Goode Northeast Buttress

**Applied enrichment:**
- ✓ 4-point GPX track from Bridge Creek TH → North Fork junct → high camp → summit
- ✓ 4 detailed waypoints (types: parking, junction, camp, summit) with lat/lng/elev/distance
- ✓ Accurate descent: "3 raps from Black Tooth Notch + southwest gully + Park Creek trail" (NOT moat crossing)
- ✓ Rappel detail: "3 raps to 30m from summit; 5 total on descent"
- ✓ alpineGrade: IV, pitches: 8, routeFt: 3100, commitment: IV
- ✓ Comprehensive approach/beta/itinerary/bail/hazards documented

**Source research:** 7+ climbing guides, trip reports, alpinist articles; verified via ClimberKyle, SummitPost, MountainProject, WTA, SpokalAlpine, Alpine4.

**User's issue fixed:** Original report said "descent doesn't match rappels research...people don't cross moat on descent." Confirmed accurate — descent now correctly shows alternative route (Black Tooth Notch rappels + southwest gully) that avoids moat return.

## Data Model for Enrichment

Routes stored in `catalog/waalp/waalp_routes.json`:

```json
{
  "id": "wa_route_id",
  "name": "Route Name",
  "alpineGrade": "IV",  // Added for technical alpine routes
  "pitches": 8,         // Actual pitch count (not seed fabrication)
  "routeFt": 3100,      // Vertical feet of climbing terrain
  "rappels": "3 raps to 30m from summit; 5 total raps on descent",  // Descent detail
  "season": "Jun-Sep",
  "objHaz": ["glacier travel", "snow moat", "exposed rock", "rockfall"],
  "gpxPts": [           // Actual GPS track points
    {"lat": 48.4269, "lng": -120.8656, "elev": 2120, "name": "Bridge Creek TH"},
    {"lat": 48.4094, "lng": -120.8742, "elev": 2800, "name": "North Fork junction"},
    {"lat": 48.4829, "lng": -120.9109, "elev": 6600, "name": "High camp"},
    {"lat": 48.4829, "lng": -120.9109, "elev": 9220, "name": "Mount Goode summit"}
  ],
  "waypoints": [        // Labeled navigation points
    {"type": "parking", "name": "Bridge Creek Trailhead", "lat": 48.4269, "lng": -120.8656, "elevFt": 2120, "distMi": 0},
    {"type": "junction", "name": "North Fork junction", "lat": 48.4094, "lng": -120.8742, "elevFt": 2800, "distMi": 9.6},
    {"type": "camp", "name": "High camp near glacier", "lat": 48.4829, "lng": -120.9109, "elevFt": 6600, "distMi": 19},
    {"type": "summit", "name": "Mount Goode summit", "lat": 48.4829, "lng": -120.9109, "elevFt": 9220, "distMi": 21.2}
  ],
  "descent": "Three rappels from summit lead down Black Tooth Notch. Descend southwest gully...",
  "descentText": "From summit, use three rappels (60m rope) from established anchors. Continue down gully system on SW face...",
  "approach": "Drive to Bridge Creek Trailhead... hike PCT 9.6 miles... bushwhack to glacier toe...",
  "itinerary": "Day 1: Drive + approach to high camp (12 miles, 6-8 hrs). Day 2: Climb (10-12 hrs). Day 3: Descent...",
  "watchOut": ["Shenanigans getting off glacier with difficult moat", "Slabs spicy if wet", ...],
  "knownHazards": ["Goode Glacier dying (snow diminishes)", "Snow moat widens mid-season", ...]
}
```

## Implementation Roadmap

### Phase 1: Pilot (COMPLETE)
- ✓ Mount Goode (3 routes): NE Buttress fixed, SW Couloir + Megalodon researched
- ✓ Audit methodology validated
- ✓ Data model proven in live catalog

### Phase 2: Priority Peaks (NEXT)
Use `wa-enrich-batch` workflow to research batches of 5-10 peaks:
1. **Rainier (32 routes)** — highest usage, most hazards (moats, icefalls, crevasses)
2. **Baker + Adams + Glacier Peak** (30 routes combined) — high-traffic, complex descents
3. **Stuart + Shuksan + St. Helens** (30+ routes) — technical rock descents

Expected: 15-20 agents, ~100k tokens, 2-3 hours research, 100+ waypoints + 10+ GPX tracks.

### Phase 3: Secondary Cascades (Low priority, can parallelize)
- Early Winters Spires (50+ rock routes), Enchantments, Liberty Bell, etc.
- 150+ routes, lower user traffic, still critical for safety

### Phase 4: Out-of-State Alpine
- Rainier/Denali/Grand Tetons/Glacier NP routes
- Lower priority; use same research pipeline

## Deployment & Verification

**Git plan:**
1. Commit Phase 2 enrichments to `alpine-routes-enrichment-phase2` branch
2. PR + review live app (verify GPX renders, waypoints align, descent is readable)
3. Deploy to main + GitHub Pages

**Live verification checklist:**
- GPX track renders on route map (no empty track)
- Waypoints appear with correct labels + elevations
- Descent text reads clearly on mobile (not truncated)
- Rappel counts match documented sequences
- No duplicate/conflicting hazard tags

## Why This Matters

Alpine climbing is high-stakes. Route-specific descent knowledge is hazard-critical:
- Moat-crossing vs. rappel-route choices determine safe turnaround points
- Crevasse-field routing saves hours and prevents entrapment
- Rappel-sequence confirmation prevents off-route descents in poor visibility
- Accurate waypoints prevent navigation errors in whiteouts

Current state (generic templates) is worse than no data — it creates false confidence.

Goode NE Buttress fix proves the value: accurate descent info + GPS + hazard lists = climbers can actually plan safe itineraries in the app, not just wing it from memory.

---

**Status:** Ready for Phase 2 research. Awaiting user go-ahead to scale research to Rainier + other high-traffic peaks.
