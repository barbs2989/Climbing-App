# Watch_out Hazard Population Research Plan

## Mission: Critical Safety Data

Populate hazard warnings (watch_out field) for Washington ice and high-grade alpine routes to improve climber safety through in-app hazard awareness.

## Current Status

### Database State
- **Total routes in WA database**: 2,159 (alpine/mountaineering/high-grade)
- **Ice routes (WI1-WI6, AI2-AI5)**: 159 routes, **0% with watch_out**
- **Alpine routes**: 1,000 routes, **11.2% with watch_out**
- **High-grade rock routes (IV+/V)**: 100+ routes, **mostly missing watch_out**

### Coverage by Discipline
- `alpine`: 1000 routes | 112 with watch_out (11.2%) | 888 without
- `ice`: 159 routes | **0 with watch_out (0%)** | 159 without
- `rock`: 26 routes | 0 with watch_out | 26 without
- `sport`: 611 routes | 0 with watch_out | 611 without
- `trad`: 343 routes | 0 with watch_out | 343 without
- `bouldering`: 19 routes | 0 with watch_out | 19 without

## Priority Sequence

### PRIORITY 1: Ice Routes (159 routes, 0% coverage)

**Scope**: All WA ice routes WI1-WI6, AI2-AI5  
**Hazards to document**:
- Serac/icefall zones (location, time-of-day risk, seasonal timing)
- Avalanche exposure (terrain angle, seasonal triggers, aspect)
- Crevasse fields (type, location, seasonal change, bergschrund technique)
- Ice quality variations (blue ice, snow ice, verglas, microspikes/tools)
- Weather patterns (typical conditions, wind exposure)
- Altitude/commitment hazards
- Route-finding complexity and descent hazards
- Rockfall/rock quality on mixed sections

**Target**: Research and document hazards for all 159 ice routes

### PRIORITY 2: High-Grade Alpine Routes (100+ routes, IV+/V, AI3+)

**Geographic focus**:
- North Cascades technical peaks (Dragontail, Le Conte, Formidable, etc.)
- Mount Stuart area (5.9+, mixed/alpine routes)
- Mount Rainier technical routes (IV+/V)
- Mount Baker technical routes
- Glacier Peak technical routes

**Hazards to document**:
- Serac/avalanche exposure on specific routes
- Mixed terrain transitions
- Exposure on specific pitches
- Route-finding complexity
- Descent hazards
- Commitment level and time requirements

**Target**: Research and document 100+ high-grade routes

### PRIORITY 3: Missing Major Peaks

**Audit and complete**:
- Mount Rainier: expect ~15-20 climbing routes (currently 16)
- Mount Adams: additional routes beyond current 7
- Mount Stuart: ice/mixed routes IV-V not in database

**Sources to check**:
- Mountain Project climbing databases
- AAJ (American Alpine Journal) archives
- Recent guidebooks (2024-2025)
- Guide company beta (RMI, IMG, AAC)

## Research Sources (in priority order)

1. **Mountain Project** (mountainproject.com)
   - Search by route name and grade
   - Extract hazard information from descriptions and comments
   - Use recent trip reports for conditions updates

2. **American Alpine Journal** (AAJ)
   - Historical trip reports
   - Documented hazards and incidents
   - Route-specific beta

3. **Cascade Alpine Guides** (Beckey's guides, Mountaineers Press)
   - Comprehensive hazard documentation
   - Historical context
   - Route variants and conditions

4. **Guide Company Reports**
   - RMI (Rainier Mountaineering Inc.) guides
   - IMG (International Mountain Guides)
   - AAC (American Alpine Club) reports
   - Current conditions and seasonal updates

5. **NWAC** (Northwest Avalanche Center)
   - Avalanche hazard research
   - Seasonal forecasts and patterns
   - Historical incident data

6. **Recent Trip Reports** (2023-2026)
   - Current conditions
   - Recent hazard documentation
   - Updates on glacial/seasonal changes

## Data Format

### Watch_out Field Structure

```json
{
  "id": "route_slug",
  "watch_out": [
    "Hazard type 1: Specific location/timing details",
    "Hazard type 2: Specific location/timing details",
    "Environmental factor: Specific details",
    "Commitment/Complexity: Specific details"
  ]
}
```

### Example: Early Winter Couloir (AI3)

```json
{
  "id": "wa_early_winter_couloir",
  "route_name": "Early Winter Couloir",
  "area": "Snoqualmie Pass",
  "discipline": "ice",
  "grade": "AI3",
  "watch_out": [
    "Active avalanche path crossing (Phantom Slide approach) — check NWAC Snoqualmie Pass forecast",
    "Thin or absent ice most winters — be ready to dry-tool",
    "Loose chossy rock on pitch 2 — protection challenging",
    "No established rappel stations on descent — inspect anchors thoroughly, fatal failure recorded 2025",
    "Cold northwest-facing aspect — expect winter temperatures at belays",
    "Avalanche patrol explosives nearby — stay clear of ski boundary"
  ]
}
```

## Processing Pipeline

### Step 1: Research & Collection (CURRENT)
- Research agent gathering hazard data from Mountain Project and authoritative sources
- Target: 20-30 routes with complete documentation to start
- Output: JSON files with watch_out arrays

### Step 2: Data Validation (NEXT)
- Review hazard descriptions for accuracy
- Cross-reference with multiple sources
- Validate climbing grade and hazard terminology
- Ensure seasonal accuracy (2026 conditions)

### Step 3: Database Import (AFTER VALIDATION)
- Use batch_update_watch_out.mjs to import JSON data
- Process in batches of 10-20 routes
- Verify updates with database queries

### Step 4: Quality Assurance
- Query database to verify coverage
- Spot-check hazard descriptions in UI
- Gather climber feedback
- Iterate for accuracy and completeness

## Tools & Scripts Available

### Data Processing
- `batch_update_watch_out.mjs` — batch update routes from JSON input
- `generate_watch_out_migration.mjs` — generate SQL migration files
- `extract_and_migrate_watch_out.mjs` — migrate existing hazard data
- `query_ice_routes.mjs` — query ice routes and coverage

### Example Data
- `ice_route_watch_out_examples.json` — 9 example routes with complete watch_out data

### Documentation
- `WA_ICE_ROUTE_HAZARD_GUIDE.md` — comprehensive hazard patterns by area
- `WATCH_OUT_RESEARCH_PLAN.md` — this file

## Known Gaps & Challenges

### Data Coverage
- 156/159 ice routes need hazard documentation
- Many high-grade alpine routes lack specific watch_out entries
- Seasonal hazard evolution (glacial retreat, climate change effects)
- Mountain Project may not have complete hazard documentation for all routes

### Route Identification
- Some routes in database may not match Mountain Project exactly (different names)
- Variant routes (same peak, different lines) need disambiguation
- Historical vs. current route names

### Seasonal Context
- Hazards change seasonally (crevasse fields, icefall activity, avalanche risk)
- 2026 conditions may differ from historical data
- Need to validate against current NWAC forecasts and recent reports

## Success Criteria

### PRIORITY 1 (Ice Routes)
- Minimum: 100/159 ice routes with watch_out (63% coverage)
- Target: 159/159 ice routes with watch_out (100% coverage)
- Quality: Each route has 4-8 specific hazard entries

### PRIORITY 2 (High-Grade Alpine)
- Minimum: 50/100+ routes with watch_out (50% coverage)
- Target: 100/100+ routes with watch_out (100% coverage)
- Quality: Technical grades IV+/V with detailed hazard documentation

### PRIORITY 3 (Missing Peaks)
- Mount Rainier: identify and add 2-4 missing routes
- Mount Adams: identify and add 1-2 missing routes
- Mount Stuart: identify and add 2-3 missing mixed routes

## Timeline Estimate

- **Phase 1** (Current): Research & collection — 1-2 days
- **Phase 2**: Validation & refinement — 1 day
- **Phase 3**: Database import & QA — 1 day
- **Total**: 3-4 days to 100% ice route coverage + high-grade alpine

## Risk Mitigation

### Safety First
- All hazard descriptions reviewed by climbing safety experts
- Cross-reference multiple authoritative sources
- Err on side of caution (list more hazards, not fewer)
- Include incident history when documented

### Data Quality
- Validate climbing grades and hazard terminology
- Test import scripts with example data
- Spot-check random database entries after import
- Allow for iterative refinement based on climber feedback

### Source Reliability
- Prioritize recent (2024-2026) data over older sources
- Use Mountain Project as primary source with Wikipedia/guide verification
- Document source for each hazard entry (for user trust)
- Include date of last verification

## Next Steps

1. Wait for research agent to complete initial data gathering
2. Validate collected hazard data against multiple sources
3. Generate SQL migration and JSON import files
4. Batch import data to Supabase
5. Verify coverage metrics in database
6. Test UI display of watch_out hazards
7. Gather climber feedback and iterate

---

## Related Tasks

- Task #6: Research accurate permit info for all WA alpine/mountaineering peaks
- Coverage audit: ensure all major peaks have adequate hazard documentation
- UI testing: verify hazard warnings display correctly in route detail screens
