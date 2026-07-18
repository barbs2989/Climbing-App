# WA tech-stats / waypoint audit — batch 1 status

## Trigger
User reported North Twin Sister missing technical stats and a trailhead waypoint. That specific
route turned out to already be fixed by a prior session. Broadened to a full audit of all WA
alpine/mountaineering/scrambling/ice routes (742 total).

## Audit result
163 routes across 87 peaks are missing a trailhead waypoint, a summit waypoint, or basic stats
(gain_ft/dist_km/high_point_ft). Full target list: `peaks_batch.json` (87 peaks, 293 routes —
includes every route on each flagged peak, not just the flagged ones, per the wa-enrich-batch
skill's full-page-enrichment convention).

## Research (wa-enrich-batch workflow, run wf_c586220f-9ed)
- 43/87 peaks researched successfully — real sources only (Mountain Project, SummitPost,
  Peakbagger, CalTopo, etc.), no fabricated coordinates. Saved in `findings_batch1.json`.
- 44/87 failed mid-run: **"You've hit your monthly spend limit"**. These were NOT researched.
  Remaining peak list (ready to re-run once the limit resets/is raised) is in
  `peaks_batch_remaining.json`.
- 14 peaks flagged a hierarchy issue during research (wrong parent area, wrong elevation, name
  conflated with a different peak, etc.) — NOT auto-applied, needs manual review. See
  `hierarchy_flags_batch1.json`.

## Apply — DONE, LIVE (as of 2026-07-17)
The `.env` service key was refreshed by the user mid-session; `apply_enrich_merge_waypoints.mjs`
ran successfully against the live DB:
- 172/175 routes touched, 1,825 fields written, 85 routes got a waypoint merged in.
- Of the 175 routes in this batch: waypoint-less routes dropped from ~most to 10, routes still
  missing a Trailhead dropped to 16, still missing a Summit/Topout dropped to 28, missing-all-stats
  dropped to **0**. (The remaining gaps are largely crag/dike sub-areas and traverse routes where
  a single trailhead/summit concept doesn't cleanly apply — see per-route notes in the apply log.)

### Bug found + fixed: waypoint type mismatch
The wa-enrich-batch research prompt never specified the app's canonical waypoint `type` enum
(`Trailhead`/`Junction`/`Water`/`Campsite`/`Summit`/`Topout`/`Hazard` — see `WP_TYPES` in
ClimbMatch.jsx), so agents wrote freeform lowercase strings (`"trailhead"`, `"summit"`,
`"trailhead_turnoff"`, `"waypoint"`, etc.). The merge script's single-type dedup check was
case-sensitive, so on routes that already had a canonical `"Trailhead"`/`"Summit"` it failed to
recognize the match and wrote a second, differently-cased duplicate instead of skipping it.

Fixed with `fix_waypoint_types.mjs` (run against the live DB, see `waypoint_fix_report.json`):
normalized 278 waypoint types to the canonical enum and dropped 59 duplicate Trailhead/Summit
entries (kept whichever twin had richer data — a `note`, elevation, etc.), across 120 routes.

### Known issue found — FIXED
`wa_southeast_face` (Sharkfin Tower's "Southeast Face" route) had a Summit waypoint pointing to
"Mount Torment summit" — a different, neighboring peak, contradicted by the route's own
overview/beta/approach/FA text (all clearly describe Sharkfin Tower, matching the real documented
1990 FA by Nelson/Martin/Lewis/Liddell/Bale). Corrected live to the same "Sharkfin Tower summit"
coordinates already used by the route's sibling "Southeast Ridge".

## Hierarchy flags — reviewed, 2 fixed, 3 left for manual review
Of the 14 flags in `hierarchy_flags_batch1.json`, most were either false positives (research
double-checked itself and found no issue) or informational-only. Two were clear, single-field,
low-risk corrections and are now live:
- **Amphitheater Mountain elevation**: 8,374 ft → 8,358 ft (Wikipedia/Mountain Project/Mazamas/
  Peakbagger all converge on 8,358).
- **Mount Pulitzer name**: dropped the incorrect "(Wellesley Peak)" alias — Wellesley Peak is a
  separate, real peak ~14 miles away; Mount Pulitzer's actual alternate name is "Snagtooth".

Three flags are genuine hierarchy (parent-area) mismatches that were **deliberately left
unfixed** — reparenting an area is a bigger structural change than a field correction (past WA
hierarchy audits treated this as its own dedicated pass, since it affects `route_count` caches
and breadcrumbs), and in two of the three cases the "correct" target area doesn't exist yet in
the DB, so fixing it means creating new hierarchy nodes, not just repointing `parent_id`:
- **Sloan Peak** — filed under "Glacier Peak Wilderness"; should be "Henry M. Jackson Wilderness"
  per USFS/PeakVisor, but that wilderness area doesn't exist in the DB yet.
- **Agnes Mountain** — filed under "Darrington and Mountain Loop Hwy" (a west-side Snohomish
  County region); every source places it in the Stehekin/Lake Chelan drainage on the east side,
  50+ miles away. A `wa_stehekin` area already exists — this one may just need repointing, but
  wasn't touched without confirming that's the intended bucket.
- **Mount Cruiser** — filed under "North-Central Olympic Mountains (Deception–Gray Wolf)"; every
  source places it in the southern Olympics (Mount Skokomish Wilderness / Sawtooth Range,
  Staircase entrance). Notably, `wa_mount_skokomish` — a real, distinct peak — is filed under the
  *same* wrong-sounding parent, suggesting this may be a broader, pre-existing miscategorization
  rather than a one-off, so a single reparent might not be the right fix on its own.

Also flagged but not touched: **Red Mountain's "Ragged Ridge" route** doesn't belong to that peak
at all (Ragged Ridge is a distinct North Cascades traverse 50+ miles north) — but no single
correct target peak was identified (Ragged Ridge spans Katsuk/Kimtah/Cosho Peaks), so this needs
a human call on where it should actually live rather than a guessed reassignment.

## Still open
- **44/87 peaks not yet researched** — blocked on the account's monthly Claude spend limit as of
  the first attempt; a second attempt was launched after the key started working again (see
  `wf_a9789cb6-4b3`). Check `/workflows` or this file's next revision for the outcome.
- **The 3 hierarchy reparenting decisions and the Ragged Ridge reassignment** above — need a
  human call, not a guess.

## Files in this directory
- `peaks_batch.json` — full 87-peak target list (with all routes per peak)
- `peaks_batch_remaining.json` — the 44 peaks NOT yet researched (spend limit)
- `findings_batch1.json` — 43 researched peaks (applied live)
- `hierarchy_flags_batch1.json` — 14 flagged hierarchy/data issues for manual review
- `apply_enrich_merge_waypoints.mjs` — the apply script (waypoint-merge variant) — run, successful
- `fix_waypoint_types.mjs` — corrective pass for the type-normalization bug — run, successful
- `waypoint_fix_report.json` — full log of every retype and every duplicate dropped
