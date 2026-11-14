# Phase 3 Tier 2 - Alpine Traverses QA Checklist

## Research Data Validation

Before importing alpine traverse research into the database, verify against this checklist.

### Data Structure Validation

- [ ] All routes are JSON objects in an array
- [ ] Each route has required fields: `name`, `area`, `discipline`, `hazards` (array)
- [ ] `hazards` field is a string array (not objects)
- [ ] All hazard entries are non-empty strings
- [ ] Route names are capitalized consistently
- [ ] Discipline is one of: `alpine_rock`, `alpine_ice`, `mountaineering`

### Route Coverage

- [ ] High Route / Cascade Crest Traverse documented
- [ ] Enchantments Loop documented
- [ ] Ptarmigan Traverse documented
- [ ] Cascade Crest Traverse documented
- [ ] Picket Range Traverse documented
- [ ] Baker-Snoqualmie Traverse documented
- [ ] Total routes: 10-12 (6 high priority + 4-6 secondary)

### Hazard Quality Per Route

For EACH route, verify:

**Hazard Quantity**
- [ ] Minimum 6 hazards documented
- [ ] Maximum 15 hazards (avoid over-documentation)
- [ ] Typical range: 7-10 hazards per traverse

**Hazard Specificity**
- [ ] No generic warnings (e.g., "weather is dangerous")
- [ ] All hazards name specific locations (glacier names, pass names, camp areas)
- [ ] Seasonal timing explicit (e.g., "Jun-Aug" not "warm months")
- [ ] Consequence clear (e.g., "navigation error = lost 2-3 hours" not "bad navigation")
- [ ] Mitigation actionable (e.g., "rope rescue training required" not "be careful")

**Multi-Day Expedition Focus**
- [ ] Crevasse hazards emphasize rope rescue proficiency (not just "rope required")
- [ ] Navigation hazards emphasize remote terrain and escape options
- [ ] Weather hazards include weather windows and turnaround strategy
- [ ] Camp hazards specific to exposed alpine sites
- [ ] Water hazards seasonal (morning vs. afternoon melt timing)
- [ ] Rescue logistics include evacuation difficulty
- [ ] Self-sufficiency emphasized (party size, skills required)

### Hazard Detail Examples

**GOOD Example** (specific, multi-day focused):
```
Colchuck Glacier crevasse field — bergschrund crossing critical early season; 
rope rescue proficiency and probe technique essential; June-August most hazardous 
with bridge collapse risk; party must support crevasse rescue systems
```

**POOR Example** (generic, single-climb focused):
```
Crevasses are dangerous, use rope
```

**GOOD Example** (water hazard with timing):
```
Glacial meltwater stream crossings increase dramatically in afternoon — 
melt intensity varies by time of day; early morning crossing essential; 
rope belay required for major water hazards
```

**POOR Example**:
```
Watch out for water crossings
```

### Source Verification

For EACH route, check:
- [ ] Minimum 2 sources cited
- [ ] At least one primary source (Beckey, Mountain Project, NWAC)
- [ ] At least one recent source (2024-2026 trip report or current data)
- [ ] Sources are specific (not just "climbing forums")
- [ ] No fabricated sources
- [ ] Source dates explicit where available

### Seasonal Accuracy

For EACH route:
- [ ] Seasonal window specified (e.g., "Aug-Sep optimal")
- [ ] Early season conditions described (Jun-Jul snow/ice state)
- [ ] Late season conditions described (Aug-Sep conditions)
- [ ] 2026 conditions noted (not historical-only data)
- [ ] Avalanche risk seasons match NWAC patterns
- [ ] Ice/snow conditions realistic for year-round research

### Expedition Profile Accuracy

For EACH route, verify:
- [ ] Duration in days is reasonable (3-7 days for traverses)
- [ ] Mileage makes sense relative to duration
- [ ] Elevation gain is cumulative, not per-day
- [ ] Altitude range appropriate for Washington (7,000-11,000 ft typical)
- [ ] Approach hours reasonable
- [ ] Climb hours (total) not per-pitch

### Hazard Redundancy Check

- [ ] No duplicate hazards within a single route
- [ ] No near-duplicate hazards with slightly different wording
- [ ] Hazards addressing different aspects (crevasse vs. navigation vs. camp, etc.)
- [ ] Hazard array is deduplicated (no repeats)

### Database Compatibility

- [ ] All hazard strings under 300 characters
- [ ] All hazard strings over 50 characters (detail level)
- [ ] Special characters properly escaped for JSON
- [ ] No control characters or invalid UTF-8
- [ ] No SQL injection attempts or weird characters

### Naming & Lookup

- [ ] Route names match database entries (exact case and spelling)
- [ ] If route not found in database, list in unmatched for manual review
- [ ] Area names are informative (not just "Washington")
- [ ] Region names specific (North Cascades, Central Cascades, etc.)

### Hazard Length Distribution

- [ ] Hazards not consistently too short (< 50 chars) or too long (> 300 chars)
- [ ] Average hazard length 100-200 characters
- [ ] Distribution: 60% at 100-200 chars, 20% at 50-100 chars, 20% at 200-300 chars

## Pre-Import Checklist

Before running import script:

- [ ] JSON file is valid (can parse with `node -e "JSON.parse(require('fs').readFileSync(...))"`)
- [ ] File saved to: `research-data/alpine-traverses-tier2-agent1.json`
- [ ] All 10-12 routes present
- [ ] Total hazard count 60-100
- [ ] QA checklist 95%+ passes
- [ ] Spot-check: read 3 random hazards, verify they pass specificity test
- [ ] Backup original research data before import

## Post-Import Verification

After running import script:

- [ ] Zero import errors
- [ ] All matched routes show "new hazards" count
- [ ] Unmatched routes (if any) logged for manual review
- [ ] Total hazards added = expected count
- [ ] Database query shows routes have populated watch_out arrays

### In-App Verification

1. Open app in browser (`npm run dev`)
2. Select 3-5 traverse routes
3. Click to route detail page → "Safety" tab
4. Verify `watch_out` hazards display correctly
5. Check hazard text rendering (special characters, line breaks)
6. Confirm no duplicates in displayed hazards
7. Verify seasonal notes match research data

## Red Flags (Stop & Review)

If any of these occur, halt import and investigate:
- [ ] JSON parsing errors
- [ ] Database connection failures
- [ ] Zero matches (all routes unmatched)
- [ ] Hazard text truncated or corrupted in display
- [ ] Duplicate hazards across routes (exact same text)
- [ ] Hazards below 50 characters or above 300 characters
- [ ] Missing sources or uncertain data
- [ ] Seasonal windows contradicting NWAC/meteorological data
- [ ] Generic warnings instead of specific hazards
- [ ] Missing multi-day expedition context

## Sign-Off

Research Quality Verified: _________________ (date)
Researcher: _________________________________
Verifier: __________________________________
Database Import Completed: _________________ (date)
In-App Verification Passed: ________________ (date)
