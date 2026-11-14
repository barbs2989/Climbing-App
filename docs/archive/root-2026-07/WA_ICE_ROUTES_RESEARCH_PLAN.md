# Washington Ice Climbing Routes: Hazard Research Plan

**Objective:** Document watch_out hazards for 155 remaining Washington ice climbing routes across 5 geographic clusters.

**Status:** 55 routes already documented; 100 routes remaining.

## Geographic Breakdown

### 1. Banks Lake (Central WA) — 25-29 Routes
**Current coverage:** 1 route documented
**Gap:** 24-28 routes remaining
**Priority:** HIGH (highest-concentration ice climbing area)
**Sources:** Mountain Project Banks Lake ice section, theCrag, NWAC patterns
**Characteristics:**
- Visible ice flows from SR-155 near Dam
- Grades WI2-WI5+
- Reliable seasonal conditions (Feb-Mar peak)
- Easy approach accessibility
- Consistent avalanche and rockfall hazards

### 2. Snoqualmie Pass Region (I-90 Corridor) — 20-25 Routes
**Current coverage:** 0 routes documented
**Gap:** 20-25 routes remaining
**Priority:** HIGH (closest to Seattle, urban-adjacent)
**Key sub-areas:**
- Franklin Falls (WI2-3)
- Denny Creek Ice (WI3-4)
- Alpental area flows
- Unnamed waterfalls along access creeks
**Characteristics:**
- Elevation 3,000-4,000 ft
- Weather-driven (rapid freeze/thaw cycles)
- Approach avalanche hazards common
- Afternoon sun exposure significant
- Dense cloud cover, poor visibility risk

### 3. Icicle Creek / Leavenworth (US-2 Corridor) — 10-15 Routes
**Current coverage:** 8 routes documented (Hubba Hubba, Eightmile Buttress, Icicle Buttress, etc.)
**Gap:** 2-7 additional routes
**Priority:** MEDIUM (beginner-friendly, intermittent conditions)
**Characteristics:**
- Elevation 2,000-5,500 ft
- Mixed rock/ice/alpine terrain
- Snowmelt-dependent, seasonal variability
- Raptor closure (Jan 1 - Aug 15, Bridge Creek Wall 1/2-mile buffer)
- Christmas crust layer hazard (25-35 cm deep up to 4,500 ft)

### 4. North Cascades Alpine Ice (Mount Shuksan, Mount Baker, Price Glacier, etc.) — 15+ Routes
**Current coverage:** 5 routes documented (partial coverage)
**Gap:** 10+ additional routes
**Priority:** HIGH (serious alpine terrain, high-consequence climbing)
**Key peaks:**
- Mount Shuksan (North Face, Sulphide Glacier)
- Mount Baker area (various routes)
- Price Glacier routes
- Mount Formidable
- Forbidden Peak and surrounding ice
**Characteristics:**
- Elevation 8,000-10,000+ ft
- Glaciated terrain (crevasse fields, bergschrund)
- Extended alpine commitment (multiday, base camps)
- Serac and avalanche terrain common
- Permit requirements (NPS), access closures
- Guide service information available (AAI, IMG, RMI)

### 5. Tumwater Canyon + Other WA Ice (30+ Routes)
**Current coverage:** 2 routes documented
**Gap:** 28+ additional routes remaining
**Priority:** MEDIUM (smaller areas, less established)
**Sub-clusters:**
- Tumwater Canyon proper (Drury Falls variants)
- Stevens Pass area ice flows
- Chiwawa River valley tributaries
- Baker Lake approach waterfalls
- Entiat area ice
- Wenatchee National Forest scattered flows
- Other miscellaneous WA ice routes

## Research Methodology

### Primary Sources (in priority order)
1. **Mountain Project** — route pages, trip reports, photos
2. **theCrag** — route listings, beta, crowd-sourced hazard tags
3. **Cascade Climbers Forums** — archived trip reports (2018-2026)
4. **NWAC (Northwest Avalanche Center)** — seasonal avalanche forecasts, patterns
5. **Guide Services** (AAI, IMG, RMI, local guides) — route guides, hazard summaries
6. **Published Guidebooks** — "Washington Ice: A Climbing Guide" and region guides

### Per-Route Data Collection

For each route, document:

```json
{
  "id": "wa_route_slug",
  "name": "Route Name",
  "area": "Geographic area cluster",
  "grade": "WI3 or AI2-3 or M2-3 format",
  "height": "300 ft" or "300 ft, 2 pitches",
  "elevation_range": "2000-3500 ft",
  "aspect": "North-facing" or cardinal direction,
  "slope_angle": "35-45 degrees",
  "watch_out": [
    "Specific hazard: avalanche terrain 35-45 degrees, north-facing aspect, soft slab formation in Christmas crust layer",
    "Specific hazard: icefall/serac risk from upper flows, April-June worst during afternoon warmth",
    "Specific hazard: ice quality variable—thin sections on lower pitch require delicate tool placement",
    "Specific hazard: descent via 2-pitch rappel to fixed anchors on rock ledge (inspect anchor quality before committing)",
    "Specific hazard: approach avalanche hazard on snowfield access (probe and belay crossing)",
    "Seasonal window: best Jan-Feb when frozen; March becomes unreliable as days warm up"
  ],
  "sources": [
    "Mountain Project trip reports (2024-2026)",
    "NWAC seasonal observations",
    "Cascade Climbers forum posts"
  ],
  "confidence": "high/medium/low",
  "date_researched": "2026-07-15"
}
```

### Hazard Categories to Document

1. **Avalanche Terrain**
   - Slope angle (degrees)
   - Aspect (cardinal direction)
   - Seasonal triggers (wind slab, sun warming, freeze-thaw)
   - Historical activity from NWAC or incident reports

2. **Serac / Icefall Hazards**
   - Specific location on route (upper/lower pitch, approach)
   - Frequency (daily, only during warm spells, rare)
   - Time-of-day risk (afternoon sun worst, morning safe)
   - Warming sensitivity

3. **Crevasse Fields** (glaciated routes)
   - Type (random crevasses, transverse bands, etc.)
   - Seasonal change (open mid-late season)
   - Bergschrund crossing difficulty
   - Required safety (roped travel, probing)

4. **Ice Quality**
   - Formation seasons (when does it consistently form?)
   - Melt susceptibility (water-dependent, sun-driven, temp threshold)
   - Bonding characteristics (well-bonded, detached, hollow)
   - Year-to-year variability

5. **Weather / Wind**
   - Wind exposure (summit winds 60-80 mph typical)
   - Afternoon storm exposure
   - Wind slab development in surrounding terrain
   - Visibility hazards (whiteout, cloud cover common)

6. **Descent Hazards**
   - Rappel anchor quality and locations
   - Route-finding difficulty in winter conditions
   - Alternative descent options
   - Escape route complexity

7. **Seasonal Windows**
   - Best climbing months
   - Shoulder season risks
   - Approach accessibility (road closures, permit requirements)
   - Closure windows (e.g., raptor closures)

## Quality Gates

- **Only include routes with 2+ independent sources** confirming hazards
- **Use specific, actionable language** (not vague warnings)
- **Cite data:** elevation, aspect, slope angles, documented incident counts where available
- **Confidence levels:** High (3+ sources, multiple trip reports), Medium (2 sources, some recent data), Low (1 source, older data)

## Estimated Geographic Coverage After Research

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Banks Lake | 1 | 25-29 | 24-28 |
| Snoqualmie Pass | 0 | 20-25 | 20-25 |
| Icicle Creek | 8 | 10-15 | 2-7 |
| North Cascades Alpine | 5 | 15+ | 10+ |
| Tumwater + Other | 2 | 30+ | 28+ |
| **TOTAL** | **16** | **100-109** | **84-93** |

Note: Some overlap in counting; final dedup by unique route names will reduce count.

## Next Steps

1. **Parallel research agents** launched for each geographic cluster
2. **Deep-research skill** executing multi-source verification workflows
3. **JSON compilation** merging all findings into database-ready format
4. **Deduplication** checking for route name aliases and variants
5. **Final QA** spot-checking confidence levels and source citations
6. **Database import** inserting into Supabase `routes` table with watch_out field
