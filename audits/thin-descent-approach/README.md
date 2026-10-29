# Thin descent and approach on Washington alpine routes (2026-10-24)

Owner's note: *"Descent is still thin on many routes. Also thicken up approach for thin routes."*

## Scope, measured on the live catalog

"Thin" means the descent a climber reads is under 150 characters. `descentBeta()` shows the longer of
`descent` and `descent_text`. For the approach it means `approach` is under 150 characters and there are no
`approach_variants`. Disciplines counted: alpine, mountaineering and scrambling.

| | routes | thin descent | thin approach |
|---|---|---|---|
| Washington, before | 1,023 | 214 | 154 |
| Washington, after | 1,023 | **166** | **132** |
| Every other state/province | 5,185 | ~5,150 | ~5,170 |

**Out-of-state rows were not touched.** Nearly every one is a bare import with no descent, approach,
location or beta text at all. Researching them is a ~5,000-route job. At the yield measured here (about 25%)
and ~130k tokens per 20 routes, that is roughly 34M tokens. Out-of-state route work also stands paused
by the owner (memory `phase1-marquee-alpine-progress`). That needs its own go-ahead and its own plan,
most likely the marquee peaks first.

## What was done

- 219 WA routes in 12 batches (`context-NN.json` → `batch-NN.json`), researched by Sonnet agents
  under `BRIEF.md`.
- Each batch was read by the lead session before writing. Four entries were refused in that review,
  for an assumed top-out or a grade that didn't match. Source-naming and testimony phrasing ("as the guidebook suggests",
  "one party took…") was reworded.
- Applied with `node scripts/enrich-approach-rappel-bivy.mjs --from batch-NN.json`. That asserts each row's
  `area_id`, refuses any 8-word run copied from a listed source and any ALL-CAPS text, and patches one row at a time.
  It re-reads every row afterwards. All 54 printed "verified on re-read".
- **54 routes written: 48 descents and 22 approaches.** 164 skipped, every one with a `skip_reason`
  in its batch file. The prior values are in `rollback/` (the applier's rollback files).

## Why most were skipped

Most of the thin rows are obscure lines: secondary faces and ridges of minor peaks. Their names come from an
old guidebook import, and no reachable source describes them separately. SummitPost and Mountaineers.org block
scripted fetches and are not in the Wayback Machine. The archive.org guidebook search is broken (memory
`wa-guidebooks-on-archive-org`). A blank stays a contribute prompt, which is better than invented prose.

## Catalog findings for review (nothing changed; removals are owner-reviewed)

### Duplicates
- `wa_lane_peak_fly_the`: same climb as `wa_lane_peak_r2` (The Fly couloir).
- `wa_mount_rainier_emmons_glacier_2`: same as `wa_mount_rainier_emmons_glacier`.
- `wa_mount_rainier_ingraham_glacier_direct`: same as `wa_mount_rainier_ingraham_direct`.
- `wa_mount_roosevelt_southeast_route`: same as `wa_mount_roosevelt_standard` (the southeast gully).
- `wa_nooksack_tower_beckey_schmidtke_route`: same as `wa_nooksack_tower_beckey_route`.
- `wa_glacier_peak_gerdine_ridge_cool_glacier`: same as `wa_glacier_peak_cool_glacier_gerdine`, the Disappointment
  Peak Cleaver route. The batch called it a misfiled Rainier route, but Gerdine Ridge and the Cool Glacier ARE on
  Glacier Peak, so it is a duplicate.
- Possible, unconfirmed: `wa_summit_chief_mountain_southeast_face` vs `wa_summit_chief_mountain_south_route`;
  `wa_mount_hinman_west_route` vs `wa_mount_hinman_west_ridge`; the Hibox rows other than the East Route vs its
  standard scramble.

### Misfiled, or not a route
- `wa_glacier_peak_tahoma_cleaver`, `wa_glacier_peak_south_tahoma_headwall`: Tahoma features are on Mount Rainier,
  but these rows are filed under Glacier Peak.
- `wa_lichen_rock_*` (4 rows): Lichen Rock is a Spokane-area crag (Minnehaha), filed as alpine.
- `wa_east_gully` on "Agathla Tower" and the two "Amphitheater, The" gullies: their places couldn't be confirmed (one reading
  puts them at Frenchman Coulee and Cape Disappointment).
- `wa_comb_the_*`: "The Comb" sits at 48.15, -121.62, but Toketie and Nada Lakes are in the Enchantments.
- `wa_comb_the_toketie_lake_area`, `wa_three_queens_approach_routes`: area entries filed as routes.
- `wa_mount_queets_south`: named south, but its stored approach describes the north ridge.
- `wa_snoqualmie_mountain_west_ridge`: the only matching "West Ridge" found online is Lundin Peak's.

## Follow-up, 2026-10-29 (the owner approved the session's recommendations in advance)

### Catalog findings settled (`catalog-fixes-2026-10-29.sql`, full rows in `rollback/catalog-fixes-2026-10-29.json`)
The SQL counted every table that names a route (`climb_logs`, `contributions`, `topos`, `objectives`, `user_lists` and 14
more) and refused to run unless all were zero. All were zero. It then ran in one transaction:
- **Deleted, the thin copy of a richer row:** `wa_lane_peak_fly_the` (→ `wa_lane_peak_r2`), `wa_mount_rainier_emmons_glacier_2`
  (→ `_emmons_glacier`), `wa_mount_rainier_ingraham_glacier_direct` (→ `_ingraham_direct`), `wa_mount_roosevelt_southeast_route`
  (→ `_standard`; the peak's only non-technical route is the SE gully, confirmed on its SummitPost page and Wikipedia),
  `wa_nooksack_tower_beckey_schmidtke_route` (→ `_beckey_route`), `wa_glacier_peak_gerdine_ridge_cool_glacier`
  (→ `_cool_glacier_gerdine`).
- **Deleted, an area filed as a route (empty row):** `wa_comb_the_toketie_lake_area`, `wa_three_queens_approach_routes`.
- **Moved to `wa_mount_rainier`:** `wa_glacier_peak_tahoma_cleaver`, `wa_glacier_peak_south_tahoma_headwall` (both are Rainier
  routes; Rainier had neither). The ids keep their old prefix, because changing a primary key would orphan the text references.
- `areas.route_count` re-read afterwards: all seven affected areas match their real counts.
- **Left as they are:** `wa_lichen_rock_*` is correctly filed under Minnehaha (Spokane). It entered the census only because
  its disciplines are empty, and that is outside this item. Possible duplicates (Summit Chief, Hinman, Hibox) were not confirmed by a
  source, so they were not touched.

### Washington retry with browser reads: the sources are dry
The 145 remaining skipped WA rows were batched again (`retry/context-r01..r08.json`), this time reading SummitPost in the
real browser (`retry/RETRY-BRIEF.md`). The first two batches (35 rows) yielded **one** entry. `wa_dome_peak_indian_summer`
gained a descent, built from its first-ascent report. The browser extension refuses Mountaineers.org page text, and
SummitPost's peak pages name these Beckey-guide lines without describing them. At 1 in 35, batches r03–r08 were not run.
Those rows stay blank, which keeps the contribute prompt. Don't retry them by web research again.

`scripts/lib/source-overlap.mjs` now accepts `review.source_texts` (URL → saved page text), so text drawn from a page
read only in a browser is still copy-checked.
