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

## Round 2 (wf_a9789cb6-4b3): 34 more peaks researched + applied live
Re-ran the remaining 44 peaks once the service key started working again. **34/44 succeeded**
(real sources, same rules) and were applied live the same way: 86 routes touched, 634 fields
written, 55 routes got a waypoint merged in. Waypoint-less routes in this batch dropped to 0,
still-missing-Trailhead to 8, still-missing-Summit/Topout to 3, missing-all-stats to 0. Same
type-normalization bug hit again (the underlying research prompt still doesn't specify the
canonical enum) — fixed the same way: 222 waypoints retyped, 59 duplicates dropped across 78
routes. Spot-checked every Summit waypoint's name against its own peak this round — no
cross-peak contamination like the Sharkfin/Torment issue found.

**10/44 still failed on the spend limit again** (`wa_alpine_and_technical_traverses`,
`wa_mount_terror`, `wa_north_gardner_mountain`, `wa_argonaut_peak`, `wa_bear_mountain_chilliwack`,
`wa_mount_chaval`, `wa_guye_peak`, `wa_ed_wood_memorial_buttress`, `wa_lincoln_peak`,
`wa_the_triad`) — saved in `peaks_batch_remaining2.json`. Total across both rounds: **77/87 peaks
done, 10 remain**, blocked on the same account-level spend limit.

Round 2 also flagged 6 more hierarchy notes (`hierarchy_flags_batch2.json`), mostly informational
or already-correct. One genuine, clear mismatch: **Bulls Tooth** was filed under "Snoqualmie
Pass" but every source places it in the Chiwaukum Mountains near Stevens Pass, ~45 miles away.

**Bulls Tooth reparent — DONE, LIVE (2026-07-18):** user ran the SQL directly via the Supabase
SQL editor (Claude's own attempt was blocked by the auto-mode classifier as too structural a
write to make unprompted). Reparented to `wa_chiwaukum_range` with the correct `path`
(`usa.washington.wa_centraleast.wa_chiwaukum_range.wa_bulls_tooth`) and `route_count` adjusted on
all 4 differing ancestors (`wa_snoqualmie_i90_region` 64→63, `wa_centralwest` 2063→2062,
`wa_chiwaukum_range` 0→1, `wa_centraleast` 1957→1958) — verified live, all values match exactly.

## Remaining 3 hierarchy decisions + Ragged Ridge + North Peak — ALL RESOLVED (2026-07-18)
Investigated each directly against live data (not guessing) before writing `hierarchy_fixes_round2.sql`,
which the user ran via the Supabase SQL editor (Claude's own attempts were classifier-blocked as
too structural, same as Bulls Tooth) — verified live afterward, all correct:
- **Sloan Peak** → new `wa_henry_m_jackson_wilderness` area (its own blurb already said Henry M.
  Jackson Wilderness; that wilderness just didn't exist yet as its own area — created as a
  sibling of Glacier Peak Wilderness, same shape).
- **Agnes Mountain** → `wa_stehekin` (real area, already held another real peak).
- **Mount Cruiser, Mount Skokomish, Mount Lincoln** → new `wa_southern_olympics` area. All three
  peaks' own blurbs independently describe the same Sawtooth Ridge/Staircase-entrance location,
  confirming they belong together, not with the Deception-Gray Wolf peaks they were filed under.
- **Ragged Ridge** (route, not an area) → moved from Red Mountain to the existing
  `wa_alpine_and_technical_traverses` bucket (already holds the Ptarmigan Traverse — the right
  home for a multi-peak traverse route with no single owning summit).
- **North Peak vs. Gunsight Peak** → turned out to need NO fix. Investigated the coordinates
  directly: North Peak's coords are ~20-30m from a separate "Gunsight Peak" entry, and Gunsight
  Peak's own blurb describes "several named towers along a gendarmed ridge" — North/Middle/South
  Peak are those towers, already correctly structured as siblings.

One bug surfaced and fixed in the process: the first pass of `hierarchy_fixes_round2.sql`'s
Ragged Ridge section (route_count adjustments only, not the area moves) got applied twice,
doubling those 7 deltas. Caught by re-verifying live rather than trusting the SQL editor's own
success message; corrected with a follow-up relative-delta patch, re-verified exactly correct.

## Still open
- **10/87 peaks not yet researched** — blocked on the account's monthly Claude spend limit across
  two attempts now. List in `peaks_batch_remaining2.json`; re-run `wa-enrich-batch` with that as
  args once the limit resets/is raised. This is the only thing left from the original audit.

## Files in this directory
- `peaks_batch.json` — full 87-peak target list (with all routes per peak)
- `peaks_batch_remaining.json` — the 44 peaks not researched in round 1 (spend limit)
- `peaks_batch_remaining2.json` — the 10 peaks still not researched after round 2 (spend limit)
- `findings_batch1.json` / `findings_batch2.json` — researched peaks, applied live
- `hierarchy_flags_batch1.json` / `hierarchy_flags_batch2.json` — flagged hierarchy/data issues, all resolved
- `hierarchy_fixes_round2.sql` — the 4 hierarchy/reassignment fixes above — run by the user, applied live
- `apply_enrich_merge_waypoints.mjs` — the apply script (waypoint-merge variant) — run twice, successful
- `fix_waypoint_types.mjs` — corrective pass for the type-normalization bug — run twice, successful
- `waypoint_fix_report.json` — full log from round 1's retype/dedup pass
