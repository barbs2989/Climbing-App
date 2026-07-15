# Washington Climbing Routes: Hazard Documentation Project

## Project Status

### Current Coverage
- **Total WA routes:** 2,159 (alpine + ice + high-grade rock)
- **With watch_out documentation:** 110 (5.1%)
- **Missing documentation:** 2,049 (94.9%)

### By Discipline
| Discipline | Total | With docs | Coverage | Priority |
|---|---|---|---|---|
| Ice | 159 | 0 | 0% | PHASE 2 |
| Alpine | 1,000 | 110 | 11% | PHASE 2 |
| Rock (high-grade) | 343 | 0 | 0% | Extended |
| Other | 657 | 0 | 0% | Extended |

## Project Phases

### PHASE 1: ICE CLIMBING ROUTES (159 routes, 0% coverage)
**Status:** In Progress - Research Agent Active

#### Priority Areas:
1. **Icicle Creek ice climbing** (30-40 routes) - highest concentration
2. **Tumwater Canyon** (15-20 routes)
3. **Banks Lake area** (10-15 routes)
4. **North Cascades winter routes** (25-30 routes)
5. **Snoqualmie Pass area** (15-20 routes)
6. **Other WA ice routes** (remaining)

#### Hazard Documentation for Each Route:
- Avalanche terrain (angle, aspect, trigger patterns)
- Serac/icefall zones (location, time-of-day exposure)
- Crevasse hazards (field type, seasonal variation)
- Ice quality (conditions, seasonal reliability)
- Weather/wind patterns
- Descent hazards
- Seasonal windows

### PHASE 2: HIGH-GRADE ALPINE ROUTES (95 routes IV+/V, ~890 missing docs)
**Status:** In Progress - Research Agent Active

#### Target Routes:
- North Cascades alpine grades IV-V
- Mount Goode area routes
- Liberty Bell and Washington Pass peaks
- Mount Triumph, Formidable, alternatives to Mount Shuksan
- High-grade mixed climbing (M4-M5)

#### Hazard Documentation:
- Serac/avalanche exposure (specific locations, angles)
- Mixed terrain transitions (ice-to-rock, tool changes)
- Pitch-specific exposure analysis
- Route-finding hazards (whiteout navigation, descent)
- Descent hazards (anchor quality, avalanche exposure)
- Weather/wind patterns
- Altitude effects

### PHASE 3: MISSING MAJOR PEAK ROUTES (4-6 routes)
**Status:** Pending Analysis

#### Identified Gaps:
- Mount Rainier: 0 routes (expected 15+) - research Willis Wall variant, glacier variations
- Mount Adams: 0 routes (expected 10+) - research south side routes
- Mount Stuart: 0 routes (expected 5+) - focus on ice/mixed routes
- Other major peaks may have additional routes not yet cataloged

#### Approach:
1. Research Mountain Project for routes missing from database
2. Cross-reference with Beckey guides
3. Verify with recent trip reports
4. Create full route entries with complete hazard documentation

## Data Collection Strategy

### Research Sources (Priority Order)
1. **Mountain Project** - route descriptions, user comments, recent trip reports
2. **Beckey Cascade Alpine Guide** - authoritative hazard documentation
3. **Mountaineers Guidebooks** - regional climbing guides
4. **NWAC Archives** - avalanche forecasts, historical patterns
5. **Recent Trip Reports** - conditions from 2024-2026
6. **Climbing Forums** - supertopo, cascadeclimbers.com

### Verification Method
- Cross-verify hazard claims across minimum 2 sources
- Prefer recent trip reports (2024+) for current conditions
- Note seasonal variations for ice/snow routes
- Document source reliability

### Data Quality Standards
- Specific, actionable hazards (not generic warnings)
- 4-8 detailed hazards per route
- Include location details (pitch #, terrain type)
- Seasonal/weather specifics
- Source verification

## Import Process

### Step 1: Research Data Collection
Research agents produce JSON arrays with format:
```json
[
  {
    "name": "Route Name",
    "area": "Area Name",
    "grade": "grade",
    "discipline": "ice/alpine/rock",
    "watch_out": [
      "Specific hazard 1",
      "Specific hazard 2",
      ...
    ]
  }
]
```

### Step 2: Data Consolidation
- Place research JSON files in: `research-data/` directory
- Run: `node final-hazard-import.mjs`
- Automatically matches routes to database IDs
- Generates unmatched routes report for manual review

### Step 3: Database Import
- Validated JSON ready for Supabase import
- Import script: `import-watch-out.mjs`
- Automatically handles duplicates and validation
- Generates coverage report

### Step 4: Verification & Analysis
- Run: `node query_ice_routes.mjs` - check ice coverage
- Run: `node query_watch_out_comprehensive.mjs` - full analysis
- Run: `node verify-hazard-import.mjs` - detailed coverage breakdown

## Expected Output

### When Complete:
1. **159 ice routes** with comprehensive watch_out documentation
2. **890+ alpine routes** with IV+ grade priority
3. **4-6 missing peak routes** fully documented
4. **Coverage increase** from 5.1% to 75%+ for target disciplines

### Output Formats:
- JSON for direct database import
- Detailed reports by area and discipline
- Gap analysis for remaining work
- Route-by-route hazard documentation

## Scripts & Tools

### Research & Analysis
- `query_ice_routes.mjs` - Query all ice routes, check coverage
- `query_watch_out_comprehensive.mjs` - Full analysis by discipline
- `research-missing-peaks.mjs` - Identify missing peak routes
- `check-peak-areas.mjs` - Analyze peak area organization

### Data Processing
- `prepare-watch-out-import.mjs` - Transform research → import format
- `consolidate-hazard-research.mjs` - Combine multiple research files
- `final-hazard-import.mjs` - Main import workflow
- `import-watch-out.mjs` - Database import with Supabase

### Verification
- `verify-hazard-import.mjs` - Post-import coverage analysis
- `watch_out_import_structure.mjs` - Show expected data structures

## Next Steps

1. **Wait for research agents to complete**
   - Ice routes agent (ae5b4b9a047ec3d9f)
   - Alpine routes agent (ad7deb725d204de21)
   - Original area research agents

2. **Place research JSON in `research-data/` directory**

3. **Run consolidation and import**
   ```bash
   node final-hazard-import.mjs
   ```

4. **Verify coverage**
   ```bash
   node query_ice_routes.mjs
   node query_watch_out_comprehensive.mjs
   ```

5. **Handle unmatched routes**
   - Review `unmatched-routes.json`
   - Research remaining gaps
   - Manual database updates if needed

## Success Criteria

- Ice routes: ≥90% watch_out coverage (144/159)
- Alpine routes: ≥50% watch_out coverage (500+/1000)
- All IV+ alpine routes documented
- Major peak gaps identified and researched
- Verification reports show completion status

## Notes

- Routes are matched to database by name (fuzzy matching with area preference)
- watch_out is JSONB array of strings (hazard call-outs)
- Existing hazards field (array) is separate; watch_out is more detailed
- All imports are idempotent (safe to re-run)
- Unmatched routes save to JSON for manual review
