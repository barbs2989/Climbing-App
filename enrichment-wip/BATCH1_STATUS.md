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

## Apply (BLOCKED — dead service key)
`enrichment-wip/apply_enrich_merge_waypoints.mjs` is written and ready — it's a variant of the
existing `apply_enrich.mjs` that MERGES waypoints (adds a missing Trailhead/Summit into an
existing non-empty array) instead of skip-if-non-empty gap-fill, since that's what this batch
specifically needs. All other fields use the same factual-override / prose-gap-fill rules as
the existing script.

Running it against the live DB fails with `401 Unregistered API key` — the `.env`
`SUPABASE_SERVICE_KEY` is stale/revoked (already flagged in memory `pending-user-actions.md` on
2026-07-16, reconfirmed here). **Zero writes have been made to the live database this session.**
Anon/read access still works fine (that's how the audit numbers above were gathered).

## To finish this once a valid service key is available
```
cd enrichment-wip
SUPABASE_SERVICE_KEY="<current service_role key>" node apply_enrich_merge_waypoints.mjs findings_batch1.json
```
Then, once the monthly spend limit resets/is raised, re-run wa-enrich-batch with
`peaks_batch_remaining.json` as args for the other 44 peaks, and apply those findings the same
way.

## Files in this directory
- `peaks_batch.json` — full 87-peak target list (with all routes per peak)
- `peaks_batch_remaining.json` — the 44 peaks NOT yet researched (spend limit)
- `findings_batch1.json` — 43 researched peaks, ready to apply
- `hierarchy_flags_batch1.json` — 14 flagged hierarchy/data issues for manual review
- `apply_enrich_merge_waypoints.mjs` — the apply script (waypoint-merge variant), not yet run successfully
