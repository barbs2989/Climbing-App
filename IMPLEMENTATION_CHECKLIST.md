# Watch_out Population Implementation Checklist

## Phase 1: Data Collection & Research

- [ ] Research agent completes initial ice route hazard research
- [ ] Gather Mountain Project data for 30+ routes
- [ ] Extract AAJ and guide company beta
- [ ] Create initial JSON data files
- [ ] Document research sources and dates

## Phase 2: Data Validation & QA

- [ ] Validate JSON structure with verify_watch_out_data.mjs
  ```bash
  cat ice_route_watch_out_data.json | node verify_watch_out_data.mjs
  ```
- [ ] Cross-check hazard descriptions with multiple sources
- [ ] Verify climbing grades and terminology
- [ ] Validate seasonal hazard accuracy (2026 conditions)
- [ ] Review incident history references
- [ ] Document any data conflicts or uncertainties

## Phase 3: Database Import (Dry Run)

- [ ] Test batch import with example data
  ```bash
  cat ice_route_watch_out_examples.json | node batch_update_watch_out.mjs --dry-run --verbose
  ```
- [ ] Verify output without making changes
- [ ] Check for any validation errors
- [ ] Review SQL migration file generation
  ```bash
  cat ice_route_watch_out_data.json | node generate_watch_out_migration.mjs > migrations/0028_watch_out_ice.sql
  ```

## Phase 4: Production Import

- [ ] Create Supabase migration file (0028_watch_out_ice.sql)
- [ ] Execute import with live data
  ```bash
  cat ice_route_watch_out_data.json | node batch_update_watch_out.mjs --verbose
  ```
- [ ] Verify database updates
  ```sql
  SELECT COUNT(*) FROM routes WHERE watch_out IS NOT NULL AND discipline='ice';
  SELECT id, name, watch_out FROM routes WHERE watch_out IS NOT NULL LIMIT 20;
  ```
- [ ] Update coverage metrics

## Phase 5: UI Testing & Verification

- [ ] Test watch_out display on route detail page
- [ ] Verify hazard warnings render correctly
- [ ] Test with ice routes (watch for UI overflow with long text)
- [ ] Verify hazard formatting and readability
- [ ] Test on mobile (390px width)
- [ ] Check dark/light theme compatibility

## Phase 6: Quality Assurance

- [ ] Spot-check 10+ random routes for accuracy
- [ ] Verify hazard descriptions match Mountain Project
- [ ] Cross-reference with AAJ/guide sources
- [ ] Test all grade levels (AI2 through WI6)
- [ ] Verify all major peaks have adequate coverage
- [ ] Check for any missing high-grade routes

## Phase 7: High-Grade Alpine Routes

- [ ] Research IV+/V technical routes
- [ ] Document serac/avalanche hazards
- [ ] Identify missing Mount Rainier routes
- [ ] Research Mount Stuart mixed/ice routes
- [ ] Research Mount Baker technical routes
- [ ] Create watch_out JSON for alpine routes

## Phase 8: Missing Major Peaks

- [ ] Audit Mount Rainier (expect 15-20 routes, currently 16)
- [ ] Audit Mount Adams (need 2-3 additional routes)
- [ ] Audit Mount Stuart (need 2-4 mixed/ice routes)
- [ ] Add missing routes to database
- [ ] Document new routes with watch_out hazards

## Phase 9: Final Verification

- [ ] Query coverage metrics
  ```bash
  node query_watch_out_comprehensive.mjs
  ```
- [ ] Generate coverage report
- [ ] Document any remaining gaps
- [ ] Identify routes that need manual research

## Phase 10: Documentation & Handoff

- [ ] Document all sources used for each route
- [ ] Create update procedure for seasonal changes
- [ ] Document incident history references
- [ ] Create climber feedback loop for accuracy improvement
- [ ] Archive research data for future updates

## Files & Resources

### Scripts
- `batch_update_watch_out.mjs` — batch import from JSON
- `generate_watch_out_migration.mjs` — generate SQL migrations
- `verify_watch_out_data.mjs` — validate data quality
- `extract_and_migrate_watch_out.mjs` — migrate existing hazard data
- `query_watch_out_comprehensive.mjs` — analyze coverage

### Data Files
- `ice_route_watch_out_examples.json` — 9 example routes
- `ice_route_watch_out_data.json` — primary research data (in progress)
- `alpine_route_watch_out_data.json` — high-grade alpine routes (pending)
- `missing_peaks_watch_out_data.json` — newly discovered routes (pending)

### Documentation
- `WATCH_OUT_RESEARCH_PLAN.md` — comprehensive research strategy
- `WA_ICE_ROUTE_HAZARD_GUIDE.md` — known hazard patterns
- `IMPLEMENTATION_CHECKLIST.md` — this file

## Success Metrics

### PRIORITY 1: Ice Routes
- Target: 159/159 routes with watch_out (100%)
- Minimum: 100/159 routes with watch_out (63%)
- Quality: 4-8 specific hazard entries per route
- Coverage: All grades (AI2-AI5, WI1-WI6)

### PRIORITY 2: High-Grade Alpine
- Target: 100+ routes with watch_out (100%)
- Minimum: 50+ routes with watch_out (50%)
- Quality: Grade IV+/V with detailed hazards
- Coverage: All major peaks (Rainier, Baker, Stuart, etc.)

### PRIORITY 3: Missing Peaks
- Mount Rainier: +2-4 routes added
- Mount Adams: +1-2 routes added
- Mount Stuart: +2-3 mixed/ice routes added

## Known Risks & Mitigation

### Risk: Incomplete Mountain Project Coverage
- **Mitigation**: Use AAJ, guide companies, and recent trip reports as cross-references

### Risk: Seasonal Hazard Changes
- **Mitigation**: Document research date, prioritize recent (2024-2026) data, plan for seasonal updates

### Risk: Route Name Mismatches
- **Mitigation**: Cross-reference with database IDs, use variant names and aliases

### Risk: Data Quality Variations
- **Mitigation**: Require multiple source verification, use confidence levels, flag uncertain entries

### Risk: Database Import Failures
- **Mitigation**: Test with dry-run first, use batch processing, validate before and after

## Timeline

- **Day 1**: Research & collection (research agent)
- **Day 2**: Validation & refinement
- **Day 3**: Database import & QA
- **Day 4**: High-grade alpine routes research
- **Day 5**: UI testing & final verification

## Notes

- All hazard descriptions should use present tense ("is", not "was")
- Include specific locations, times, and conditions when known
- Use consistent terminology (serac vs. icefall, bergschrund vs. crevasse)
- Document source (Mountain Project, AAJ, guide company, etc.)
- Include seasonal context when relevant
- Err on side of caution (list more hazards, not fewer)

## Approval & Deployment

- [ ] Data reviewed by climbing safety expert
- [ ] JSON validated against schema
- [ ] Database import tested in staging
- [ ] Production migration reviewed
- [ ] Coverage metrics verified
- [ ] UI testing passed
- [ ] Ready for production deployment

---

**Last Updated**: 2026-07-15  
**Status**: In Progress — Awaiting Research Agent Results
