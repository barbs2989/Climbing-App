# Phase 3 Tier 2 — quarantined, do not run

These two migrations were sitting uncommitted in the main checkout. They are preserved here as reference and deliberately **moved out of `supabase/migrations/`** so no one applies them by reflex. Verified against the live database on 2026-07-29.

## `0056_phase3_tier2_routes.sql` — broken three ways

It INSERTs ~60 "new" alpine routes. Its own header says the goal was "to resolve FK constraint blocking hazard deployment" — that is, hazard inserts were failing because the route ids didn't exist, and the response was to invent the routes rather than find the real ids.

1. **9 of its 14 columns do not exist on `routes`.** Checked one by one against the live schema:

   | column | live |
   |---|---|
   | `route_type`, `grade_text`, `class`, `distance_mi`, `elevation_gain_ft`, `approach_hours`, `climbing_hours`, `descent_hours`, `rock_type`, `gear_required` | **missing** |
   | `best_season`, `hazards`, `discipline`, `pitches` | exists |

   The statement fails outright.

2. **`area_id = 'north_cascades'` does not exist** in `areas`.

3. **The routes it adds are already in the database**, under the real id convention. It uses `shuksan_fisher_chimneys`; live is `wa_mount_shuksan_fisher_chimneys` ("Fisher Chimneys"). Same for `formidable_south_route` vs the live `wa_mount_formidable_south_face`. Had the columns matched, this would have created a parallel set of duplicate routes.

## `0057_phase3_tier2_hazards.sql` — right idea, wrong target

INSERTs ~80 hazard rows into `route_hazard_research`, keyed by the fabricated ids above (so it is FK-dependent on 0056).

Two problems beyond the ids:

- **`route_hazard_research` no longer exists.** It was never read by the application (no `.jsx`/`.js` reference) and was live but empty. Migration `0060` dropped it, along with the other decoy, `routes.hazard_tags` — see `research/phase3/hazard_tags-README.md`. So 0057 now targets a table that isn't there at all.
- The field the app actually reads is **`routes.hazards`** — `dbRouteToCamel` maps `hazards: toArr(r.hazards)` (`lib/db.js:870`).

**And the gap this work was meant to close is largely already closed.** `routes.hazards` is populated on **4,211 of 8,392 WA routes** — alpine **447/453 (98.7%)**. The alpine hazard mission is effectively done; the real remaining gap is crag rock (trad and sport), which is different work from alpine peak research.

## What is salvageable

The *research content* in 0057 — hazard type, severity, location, season, mitigation, source — is plausibly good and cites Beckey, NWAC, and ranger data. It is only the plumbing that is wrong. To use it:

1. Resolve each route to a **real id**, via `areas.name` (peak) joined to `routes` — never by matching a peak name against `routes.name`, which holds the line name ("North Ridge"). See the repo history around PR #351.
2. Write to **`routes.hazards`**. It is now the only hazard field on `routes`; the two decoys were dropped in `0060`.
3. **Check the route actually lacks hazards first.** Most don't: only ~12 WA alpine/mountaineering routes still have none. Re-running enrichment over already-covered routes is how `wa_mount_formidable_north_ptarmigan` accumulated `crevasse` x4 and `serac` x4 (in the since-dropped `hazard_tags`, from `COALESCE(...) || ARRAY[...]` re-runs). Dedup on write with `array(select distinct unnest(...))` regardless.
