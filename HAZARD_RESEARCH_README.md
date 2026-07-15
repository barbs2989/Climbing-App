# Washington Climbing Routes: Comprehensive Hazard Documentation

## Executive Summary

This project systematically documents hazards for Washington's 2,159 alpine/mountaineering/ice climbing routes, increasing watch_out (hazard warning) documentation from 5.1% to 75%+ coverage.

**Current Status:** 5 specialized research agents active + infrastructure deployed and ready

## Quick Start

### For Research Data Import (when agents complete):
```bash
cd /Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints
bash complete-hazard-import-workflow.sh
```

### To Check Current Coverage:
```bash
node query_ice_routes.mjs
node query_watch_out_comprehensive.mjs
```

### To Identify Remaining Gaps:
```bash
node research-missing-peaks.mjs
```

## Project Structure

### Research Agents (Active)
1. **ae5b4b9a047ec3d9f** - Ice routes comprehensive research
   - Target: All 159 WA ice climbing routes
   - Sources: Mountain Project, Beckey guides, trip reports
   - Output: JSON with complete watch_out documentation

2. **ad7deb725d204de21** - Alpine routes (IV+ priority)
   - Target: 890+ alpine routes without documentation
   - Focus: High-grade routes (IV-V)
   - Output: JSON with alpine-specific hazards

3. **Previous agents** - Area-based research
   - Icicle Creek ice climbing (completed deep-research)
   - Tumwater Canyon / Banks Lake (completed deep-research)
   - North Cascades winter/alpine (completed deep-research)
   - Other WA areas (in progress)

### Data Processing Pipeline

```
Research Agents (JSON output)
        ↓
research-data/ directory
        ↓
consolidate-hazard-research.mjs (deduplicate, match to DB)
        ↓
wa-ice-alpine-import.json (import-ready format)
        ↓
import-watch-out.mjs (database import)
        ↓
Database (routes.watch_out updated)
        ↓
query_ice_routes.mjs / verify-hazard-import.mjs (verify)
```

### Key Scripts

| Script | Purpose | Status |
|---|---|---|
| `consolidate-hazard-research.mjs` | Combine research files, match to DB | Ready |
| `final-hazard-import.mjs` | Main import workflow | Ready |
| `import-watch-out.mjs` | Supabase batch import | Ready |
| `verify-hazard-import.mjs` | Post-import verification | Ready |
| `query_ice_routes.mjs` | Quick ice route check | Ready |
| `query_watch_out_comprehensive.mjs` | Full analysis | Ready |
| `research-missing-peaks.mjs` | Identify gaps | Ready |

## Expected Data Format

### Research Output (from agents)
```json
[
  {
    "name": "Early Winter Couloir",
    "area": "Early Winters Spire",
    "grade": "AI3",
    "discipline": "ice",
    "watch_out": [
      "Active avalanche path crossing — check NWAC Snoqualmie Pass forecast",
      "No established rappel stations on descent — inspect fixed anchors thoroughly",
      "Thin or absent ice most winters — be ready to dry-tool",
      "Cold northwest-facing aspect — expect winter temperatures",
      "Loose chossy rock pitch 2 and box gully"
    ]
  }
]
```

### Database Format (watch_out field)
- **Type:** JSONB array
- **Content:** String array of specific hazard call-outs
- **Length:** 4-10 items per route
- **Specificity:** Location, time-of-day, seasonal info included

## Coverage Goals

### Current (5.1%)
- Ice: 0/159 (0%)
- Alpine: 110/1000 (11%)
- Rock: 0/343 (0%)

### Target (75%+)
- Ice: 140+/159 (90%)
- Alpine: 500+/1000 (50%)
- IV+ Alpine: 95/95 (100%)
- Rock high-grade: 170+/343 (50%)

## Workflow Timeline

### Phase 1: Research & Collection (CURRENT)
- Research agents gathering hazard data from Mountain Project, Beckey guides, trip reports
- Expected completion: Once agents finish (running asynchronously)
- Output: JSON arrays in research-data/ directory

### Phase 2: Data Consolidation (READY)
- Run: `node consolidate-hazard-research.mjs`
- Deduplicates, matches to database IDs, validates format
- Output: `wa-ice-alpine-import.json` ready for import

### Phase 3: Database Import (READY)
- Run: `node import-watch-out.mjs`
- Batch update to Supabase
- Handles 50+ routes/second
- Generates detailed failure report

### Phase 4: Verification (READY)
- Run: `node verify-hazard-import.mjs`
- Check coverage by discipline and area
- Identify remaining gaps
- Generate coverage report

## Hazard Documentation Categories

Each route should include watch_out entries for:

### Ice Routes
- Avalanche terrain (slope angle, aspect, seasonal triggers)
- Serac/icefall zones (locations, time-of-day exposure windows)
- Crevasse hazards (field type, seasonal depth variation)
- Ice quality (seasonal reliability, typical conditions)
- Weather/wind patterns (exposure direction, typical severity)
- Descent hazards (anchor quality, route-finding difficulty)
- Seasonal windows (best climbing month, water variations)

### Alpine Routes
- Avalanche/serac exposure (specific angles, locations, seasons)
- Mixed terrain transitions (rock-to-ice, tool changes)
- Crevasse fields (bergschrund crossings, seasonal variation)
- Route-finding hazards (whiteout navigation, descent route)
- Pitch-specific exposure (which pitches most dangerous)
- Weather/wind exposure (summit conditions, typical patterns)
- Descent hazards (rappel anchor quality, avalanche exposure)
- Altitude effects (altitude sickness potential on high peaks)

### Rock Routes (high-grade, alpine settings)
- Loose rock / rockfall exposure
- Poor protection quality
- Exposure levels
- Route-finding hazards
- Approach/descent hazards
- Weather exposure

## Data Quality Standards

✓ Specific, actionable hazards (not generic warnings)
✓ 4-8+ detailed hazards per route minimum
✓ Location details (pitch number, terrain type)
✓ Seasonal/timing specifics
✓ Time-of-day exposure windows (if applicable)
✓ Multiple sources verified
✓ Recent trip report information (2024-2026)

## Important Notes

### Database Schema
- `routes.watch_out` is JSONB array (strings)
- Separate from `routes.hazards` field (existing tag array)
- All updates via Supabase REST API
- Batch imports use `sb_secret_*` key (service role)

### Route Matching
- Matches by name similarity (case-insensitive)
- Falls back to area information if available
- Generates unmatched routes report
- Manual lookup possible for unmatched entries

### Deduplication
- Removes duplicate routes (same name + area)
- Keeps first occurrence when duplicates found
- Validates watch_out format before import

## Post-Import Analysis

Once import completes, expected outputs:

### Coverage Report
```
Ice routes: 140+/159 (90%+)
Alpine routes: 500+/1000 (50%+)
Overall: 650+/2159 (30%+)
```

### By Area
- Icicle Creek: 35+ ice routes
- Tumwater Canyon: 18+ ice routes
- Banks Lake: 12+ ice routes
- North Cascades: 50+ alpine routes
- etc.

### Unmatched Routes
- Saved to `unmatched-routes.json`
- May require manual database lookup
- Typically 5-10% of total

## Troubleshooting

### Research agents not completing
- Agents run asynchronously and may take 30+ minutes
- Check agent IDs in parent session for status
- Result files appear in `/private/tmp/claude-501/...`

### Route not matching
- Check exact database name with query_ice_routes.mjs
- May need manual lookup on Mountain Project
- Add to unmatched routes for later review

### Import failures
- Check database connectivity: `node query_ice_routes.mjs`
- Verify JSON format: `jq . wa-ice-alpine-import.json`
- Check failures.txt for specific errors

### Low coverage after import
- Check if research data was complete
- Verify route names match database exactly
- Review unmatched-routes.json for gaps

## Next Steps

1. **Monitor research agents** - they're working asynchronously
2. **Place research output in research-data/** when agents complete
3. **Run consolidation** - `node consolidate-hazard-research.mjs`
4. **Run import** - `node import-watch-out.mjs`
5. **Verify coverage** - `node verify-hazard-import.mjs`
6. **Handle gaps** - Research remaining unmatched routes
7. **Research missing peaks** - `node research-missing-peaks.mjs`

## Success Criteria

✓ Ice routes: ≥90% watch_out coverage (144+/159)
✓ Alpine IV+ routes: 100% documentation
✓ Alpine overall: ≥50% coverage (500+/1000)
✓ All major peak routes identified
✓ Verification reports confirm completion
✓ No critical safety information missing

## Contact & Support

For questions about:
- **Route matching logic:** See consolidate-hazard-research.mjs (L45-70)
- **Database schema:** See docs/BACKEND.md (routes table, watch_out field)
- **Research sources:** See HAZARD_DOCUMENTATION_STATUS.md (sources section)
- **Data quality standards:** See HAZARD_DOCUMENTATION_STATUS.md

---

**Project Start:** 2026-07-15
**Target Completion:** Once research agents finish + 1-2 hours for import/verification
**Coverage Goal:** 75%+ hazard documentation for WA climbing routes
