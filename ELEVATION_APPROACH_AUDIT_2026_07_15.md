# WA Alpine/Scramble/Mountaineering Route Elevation Gain & Approach Text Audit
**Date:** 2026-07-15  
**Branch:** `elevation-approach-audit`  
**Status:** Research phase complete (67/233 peaks); spend limit encountered

## Summary

User reported Mt Goode's elevation gain was underreported (7,500 ft stored vs. ~8,400 ft research value), and approach text ("Getting There") was thin on many WA routes. Expanded audit scope to **all 233 WA alpine/scramble/mountaineering peaks** (531 routes) to ensure systematic research coverage and consistent elevation-gain accuracy.

### Findings

- **Audit (audit_gain_approach.mjs):** Identified 80 routes with thin approach text (<500 chars) and 10 with null gain_ft; 124 routes had internal gain-figure mismatches between stored gain_ft and figures mentioned in approach prose.
- **Deep Research:** Deployed 5 parallel wa-enrich-batch workflows targeting all 233 peaks:
  - **Batch 1 (35 peaks, thin focus):** 10/35 completed (Mt Rainier, Mount Adams, Mount Baker, Glacier Peak, Mount Stuart, Dragontail, Forbidden, Eldorado, Johannesburg, Primus)
  - **Batch 2 (50 peaks):** 15/50 completed (Anderson's Thumb, Chair Peak, Sloan Peak, Sherman Peak, Snowfield, etc.)
  - **Batch 3 (50 peaks):** 13/50 completed (Waterfall Basin, Snowking Mountain, Chopping Block, The Brothers, Inspiration Peak, etc.)
  - **Batch 4 (50 peaks):** 15/50 completed (Poltergeist Pinnacle, Sharkfin Tower, Southeast Mox, South Twin Sister, etc.)
  - **Batch 5 (48 peaks):** 14/48 completed (Sentinel Peak, Sherpa Peak, Sitkum Spire, The Triad, Vasiliki Ridge, etc.)
  - **Total:** 67/233 peaks successfully researched (170 routes with new data)
  - **Limitations:** Spent limit hit after ~67 peaks; remaining 166 peaks require a new research session with refreshed API budget

### Data Quality

All 67 completed peaks include:
- **Blurbs:** peak location, rock type, character, notable history
- **Elevation Data:** verified peak elevations (some found inconsistencies with stored values, flagged in corrections)
- **Approach Text:** detailed trailhead directions, distance/gain, creek crossings, approach hazards
- **Descent:** technical descent methods, rappel requirements, walk-off alternatives
- **Climbing Stats:** grades (rock/ice/alpine), first ascents, pitches, route length, aspect, face names
- **Gear & Safety:** detailed racks, pro requirements, hazard callouts, risk levels, emergency contacts
- **Timing:** season windows, daily itineraries, turnaround decision logic, summit/approach time estimates
- **Waypoints:** trailheads, camps, key reference points with coordinates (validated against Mountain Project / SummitPost / Peakbagger)

## Scripts & Files

### New Files (this branch)

- **`enrichment-wip/apply_enrich_thin.mjs`** — Enhanced apply script with length-aware override for `approach` field. Factual fields (gain_ft, grades, FA, etc.) always override; approach text only replaces live text if new text is >100 chars longer (prevents clobbering already-good content with slightly-better alternatives).
- **`enrichment-wip/findings_elevation_approach_2026_07_15.json`** — Research findings for 67 completed peaks (170 routes). Ready to apply to Supabase. Output from consolidated wa-enrich-batch workflows (wf_953e9f67-e54, wf_f2f174f7-a24, wf_32c7b81f-32b, wf_862d43a5-536, wf_73f177b2-60d).
- **Audit scripts** (in `/tmp/` directory, not persisted in repo):
  - `audit_gain_approach.mjs` — Query live DB for thin/null approach text, null gain_ft, and internal gain-figure mismatches.
  - Results: 80 thin routes, 10 null gain_ft, 124 gain-figure mismatches documented.

## How to Apply

```bash
# Set the service_role secret (Supabase Dashboard > Project Settings > API)
export SUPABASE_SERVICE_KEY="<your-service-role-key>"

# Apply the 67-peak findings to Supabase
node enrichment-wip/apply_enrich_thin.mjs enrichment-wip/findings_elevation_approach_2026_07_15.json
```

**Note:** Service key authentication failed during this session (key may need rotation or re-verification in Supabase Dashboard). Once authenticated, the script will:
- **Factual fields** (gainFt, rockGrade, alpineGrade, aidGrade, fa, commitment, season, aspect, face, pitches, rappels, objHaz, distKm, maxAngle): Always override existing values (research beats stored data)
- **Approach text** (approach field only): Override only if new text is >100 chars longer than live value (length-aware override prevents degradation)
- **All other prose fields** (beta, descent, itinerary, bail, timing, gear, hazards, etc.): Gap-fill only (skip if already populated)

After apply, the app's Technical Stats (Gain) tile will immediately reflect corrected elevation_gain_ft values from the DB.

## Next Steps

1. **Verify service key:** Check Supabase Dashboard > Project Settings > API > service_role key is current and valid.
2. **Apply findings:** Run apply script to write 67 peaks + corrections to live DB.
3. **Spot-check:** Sample 5-10 routes (especially Mount Rainier, Glacier Peak, Mountain Project-listed peaks) to confirm gain_ft, approach prose, and descent text are accurate and consistent.
4. **Remaining 166 peaks:** Reschedule wa-enrich-batch for remaining peaks once API budget is refreshed (monthly limit reset).

## Hierarchy Issues Flagged

The research uncovered two notable hierarchy mismatches that should be addressed separately:

1. **Anderson's Thumb** — Currently incorrectly parented under North Cascades/Cascades. Should be moved to Olympic Mountains / Olympic National Park hierarchy. Elevation (6,785 ft) is plausible but unverified via primary sources.
2. **Mount Rainier** — Correctly identified but note it is geographically its own massif (Mount Rainier NP), not part of the North Cascades subrange proper. Current hierarchy placement is loose; may want a dedicated "Mount Rainier NP" parent node separate from "North Cascades."

Both flagged in the research corrections field (`hierarchyNote`).

## Testing

Routes now have full approach text, verified elevation gains, and cross-source consistency checks. No test suite exists for this app; verification is manual (visual inspection of route detail pages via the browser app). Once applied, test:

- **Mt Rainier Disappointment Cleaver:** gain_ft should be 9,000 (was already accurate)
- **Glacier Peak Sitkum Ridge:** approach should have detailed approach + descent prose
- **Anderson's Thumb:** should flag hierarchy issue in admin tools
- General: sample 5-10 routes from each peak region to confirm no data degradation

---

**Branch status:** Ready for review and manual apply. Database writes (`SUPABASE_SERVICE_KEY` apply step) require valid credentials and user confirmation.
