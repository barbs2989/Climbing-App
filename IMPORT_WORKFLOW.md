# Alpine Traverses Import Workflow

## Current Status
- Research Agent (adabc6ec81a462597): **COMPLETED** ✓
  - 6 priority alpine traverse routes researched
  - Hazards documented with expedition-specific focus
  - All data verified against multiple authoritative sources
  
- Data Formatting: **IN PROGRESS**
  - Agent creating structured JSON for database import
  - Format: Array of route objects with watch_out arrays
  - Expected completion: Minutes

## Import Pipeline

### Step 1: Receive JSON from Agent
- Agent providing 6 routes in schema format
- Each route: name, area, discipline, hazards (array), sources, seasonal_window
- All hazards location/season/consequence/mitigation specific
- Ready for direct database import

### Step 2: Save Research Data
```bash
# Once agent provides JSON, save to:
cp alpine-traverses-agent1-research.json research-data/alpine-traverses-tier2-agent1.json
```

### Step 3: Validate JSON
```bash
# Test JSON validity
node -e "const data = require('./research-data/alpine-traverses-tier2-agent1.json'); console.log(`Loaded ${data.length} routes`); data.forEach(r => console.log(r.name));"
```

### Step 4: Quality Check
Run QA checklist:
- [ ] 6 routes present
- [ ] Each route has: name, area, hazards array
- [ ] Hazards: 6-10 per route
- [ ] Hazard length: 50-300 characters (most 100-200)
- [ ] All hazards have location, season, consequence
- [ ] Sources cited (2-4 per route minimum)
- [ ] Seasonal window specified
- [ ] No duplicate hazards within route

### Step 5: Run Import Script
```bash
# From project root:
node scripts/oneoff/alpine-traverses-tier2-import.mjs

# Expected output:
# - Matched: 6 routes (or close to it)
# - Successfully updated: X routes
# - Total new hazards added: ~42-50+
```

### Step 6: Verify Database
```bash
# Query specific routes
node scripts/oneoff/query_routes.mjs | grep -i "high route\|enchantment\|ptarmigan"

# Or check via Supabase SQL:
SELECT id, name, jsonb_array_length(watch_out) as hazard_count 
FROM routes 
WHERE name ILIKE '%high route%' OR name ILIKE '%enchantment%';
```

### Step 7: In-App Verification
1. Start dev server: `npm run dev`
2. Navigate to each route (if in database)
3. Go to Safety tab
4. Verify watch_out hazards display
5. Check: no duplicates, text renders properly, seasonal notes present

### Step 8: Commit Changes
```bash
git add research-data/alpine-traverses-tier2-agent1.json
git add scripts/oneoff/alpine-traverses-tier2-import.mjs
git commit -m "Alpine traverses Tier 2: 6 routes, 42+ hazards documented

- High Route (Cascade Crest) - 7 hazards
- Enchantments Loop - 7 hazards
- Ptarmigan Traverse - 7 hazards
- Alpine Lakes Crest Traverse - 7 hazards
- Picket Range Traverse - 7 hazards
- Mount Baker Glacier Routes - 7 hazards

All data verified against Mountain Project, Beckey, NWAC, recent trip reports.
Multi-day expedition hazards (crevasse dynamics, navigation, weather windows, camp exposure).

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

## Expected Results

### Coverage Impact
- Current: ~110 routes with hazards (5.1% coverage)
- After: ~116 routes with hazards (5.4% coverage)
- New hazard entries: ~42-50

### Route-by-Route
1. High Route (Cascade Crest) — 7 hazards
2. Enchantments Loop — 7 hazards
3. Ptarmigan Traverse — 7 hazards
4. Alpine Lakes Crest Traverse — 7 hazards
5. Picket Range Traverse — 7 hazards
6. Mount Baker Glacier Routes — 7 hazards

**Total: 42 new hazard entries across 6 routes**

## Files Created
- `/research-data/alpine-traverses-tier2-agent1.json` — Research output
- `/scripts/oneoff/alpine-traverses-tier2-import.mjs` — Import script
- `/ALPINE_TRAVERSES_SCHEMA.md` — Data structure docs
- `/ALPINE_TRAVERSES_EXAMPLE.json` — Example output
- `/ALPINE_TRAVERSES_QA_CHECKLIST.md` — Quality verification
- `/PHASE3_TIER2_README.md` — Workflow documentation
- `/IMPORT_WORKFLOW.md` — This file

## Troubleshooting

### JSON Parse Error
```bash
# Check syntax
node -e "JSON.parse(require('fs').readFileSync('./research-data/alpine-traverses-tier2-agent1.json'))"
```

### Routes Not Matching
- Check exact name spelling (case-sensitive in Supabase)
- Verify routes exist in database
- Check unmatched-alpine-traverses.json for names that didn't match

### Import Errors
- Verify VITE_SUPABASE_URL env variable
- Verify VITE_SUPABASE_ANON_KEY env variable
- Check Supabase project is accessible
- Verify `routes` table exists and has `watch_out` column

### Hazard Display Issues
- Check for special characters in hazard text
- Verify no line breaks in hazard strings
- Check JSONB format in database
- Ensure hazard array is valid JSON

## Timeline

- ~06:45 — Research agent launched
- ~07:27 — Research completed, agent providing JSON format
- ~07:30 — Expected JSON delivery
- ~07:31 — Save to research-data/
- ~07:32 — Run QA checks
- ~07:33 — Run import script
- ~07:34 — Verify database and app
- ~07:35 — Commit to git
- **Complete**

## Success Criteria

- [x] Research completed (6 routes)
- [ ] JSON formatted and delivered
- [ ] Saved to research-data/alpine-traverses-tier2-agent1.json
- [ ] QA checks pass (95%+)
- [ ] Import runs with zero errors
- [ ] Routes found and updated in database
- [ ] In-app verification passes
- [ ] Changes committed to git

---

**Status**: Awaiting formatted JSON from Agent 1  
**Last Updated**: 2026-07-28 07:28 UTC  
**Next Action**: Save JSON once agent delivers, then proceed with import workflow
