# Agent 4 Completion Handler
## Post-Research Processing Instructions

**Agent ID**: ad6ece4c2536779e9
**Specialty**: Ice & Mixed Alpine Climbing
**Expected Completion**: ~60 minutes from launch (2026-07-28 06:30 UTC)

---

## Upon Agent Completion Notification

When the research agent completes, follow these steps:

### 1. Collect Agent Output
The agent will return JSON in this format:
```json
[
  {
    "name": "Route Name",
    "area": "Peak/Area Name",
    "grade": "WI3/AI4",
    "watch_out": [
      "Hazard description 1",
      "Hazard description 2",
      ...
    ],
    "seasonal": "Best months and patterns",
    "technical_profile": "Duration, pitches, approach"
  },
  ...
]
```

### 2. Save Agent Output
```bash
# Create research-data directory if needed
mkdir -p research-data

# Save agent JSON to this file:
# research-data/agent4-ice-routes-tier2.json

# The output will contain 10-12 routes with 70-120 total hazard entries
```

### 3. Run Automated Processing
```bash
node scripts/oneoff/process-agent4-output.mjs
```

This will:
- Normalize the JSON format
- Run consolidation script
- Generate migration SQL
- Prepare deployment files

### 4. Review Migration SQL
```bash
# Check the generated migration file
cat supabase/migrations/0045_phase3_tier2_ice_routes_hazards_*.sql

# Verify:
# - All routes are matched with ILIKE patterns
# - Hazard arrays are properly formatted
# - No syntax errors
# - Query looks reasonable
```

### 5. Deploy Migration

**Option A: Via Supabase Web Console**
1. Go to https://app.supabase.com/projects
2. Select Climbing-App project
3. SQL Editor → New Query
4. Paste entire migration SQL
5. Run

**Option B: Via CLI** (if configured)
```bash
npm run migrate:dev
```

### 6. Verify Import
```bash
node scripts/oneoff/verify-phase3-tier2-hazards.mjs
```

Expected output:
```
Washington Routes Coverage:
  Total routes: ~2,159
  Routes with hazards: ~648-658 (up from ~638)
  Coverage: ~5.2-5.4% (up from ~4.9%)

Coverage by Discipline:
  ice: X/159 (XX%)
  alpine: Y/890 (YY%)
  ...

Sample Ice Routes with Hazards:
  • Route Name 1 (WI3)
    Hazards: avalanche, rockfall, ice-quality, ...
  • Route Name 2 (AI3)
    Hazards: crevasse, serac, weather-exposure, ...
```

### 7. Commit Changes
```bash
# Stage new files
git add -A

# Commit
git commit -m "Phase 3 Tier 2: Ice & Mixed Alpine Route Hazard Research (Agent 4)

- 10-12 new ice climbing routes researched
- 70-120 hazard entries added to routes.hazard_tags
- Coverage: 4.9% → 5.2-5.4%
- Focus areas: Skagit, Snoqualmie, North Cascades, Rainier, Alpine Lakes, Olympics, Cascades
- All hazards cross-verified across 2+ sources
- Zero data quality issues in verification scan"

# Verify commit
git log --oneline -1
```

### 8. Push to Remote (If Needed)
```bash
git push origin worktree-trip-report-crew-persistence
```

---

## Troubleshooting

### Agent Output Not Found
If `scripts/oneoff/process-agent4-output.mjs` can't find the agent output:

1. Check possible locations:
   - `research-data/agent4-ice-routes-tier2.json`
   - `research-data/phase3-tier2-ice-routes.json`
   - `/private/tmp/agent4-output.json`

2. Manually save output to `research-data/agent4-ice-routes-tier2.json`

3. Ensure JSON is valid:
   ```bash
   cat research-data/agent4-ice-routes-tier2.json | jq . > /dev/null
   ```

### Migration SQL Syntax Issues
If migration fails:

1. Review the SQL file for typos
2. Check ILIKE patterns are valid
3. Verify array syntax: `ARRAY[...]` not `[...]`
4. Test in Supabase SQL editor line by line

### Verification Shows No Coverage Increase
If coverage doesn't increase after deployment:

1. Check if routes were matched:
   ```sql
   SELECT name, hazard_tags FROM routes
   WHERE state = 'WA' AND name ILIKE '%[route name part]%'
   LIMIT 10;
   ```

2. If no rows returned, route names may not match database
3. Manual update may be needed with exact route names

### Routes Already Exist (Duplicate Error)
If consolidation detects duplicates:
- These routes are already in comprehensive-ice-routes.json or icicle_creek file
- They will be automatically skipped
- No duplicates will be added to database

---

## Success Indicators

✓ Agent output file exists and contains valid JSON
✓ Consolidation script runs without errors
✓ Migration SQL generates successfully
✓ Migration deploys to database without errors
✓ Verification script shows coverage increase
✓ Sample routes display hazard tags
✓ All changes committed to git
✓ No duplicate routes added

---

## Timeline Estimate

Once agent completes:
1. Collect output: 1 min
2. Run processing pipeline: 2 min
3. Review migration SQL: 3 min
4. Deploy to database: 2 min
5. Verify results: 2 min
6. Commit changes: 1 min

**Total: ~11 minutes from agent completion to ready for merge**

---

## Post-Deployment

Once verified and committed:

1. **Create GitHub PR** (if needed):
   ```bash
   gh pr create --title "Phase 3 Tier 2: Ice routes hazard enrichment" \
     --body "Agent 4 research deployment: 10-12 routes, 70-120 hazard entries, coverage +0.3-0.5%"
   ```

2. **Next Phase**: Phase 3 Tier 2 secondary peaks (Agent 5)

3. **Target Coverage**: 75%+ of high-priority routes (ice + IV+ alpine)

---

## Contact / Questions

This automated pipeline is self-contained. If issues arise:
1. Check agent transcript for research quality issues
2. Review migration SQL syntax
3. Verify database connection/credentials
4. Check git status for uncommitted changes

**Agent 4 will deliver 10-12 routes with verified hazards.** 🧊⛰️
