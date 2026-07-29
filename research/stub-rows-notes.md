# Empty stub rows on Rainier, Baker and Glacier Peak — 2026-07-29

Found by `scripts/audit-duplicate-routes.mjs`. Eight rows, each holding exactly five values:
`id`, `area_id`, `name`, `auto_generated=false`, `classic=false`. No discipline, grade,
distance, gain, hazards, gear, track, approach or overview.

They aren't thin data — they're **empty**. In the app each renders as a route entry that opens
a page with nothing on it. All eight share the `"Peak - Route"` naming that
`wa_mount_adams_south_side` used, so they look like the residue of one bad import.

`research/stub-rows.sql` deletes all eight, guarded, for a human to run.

## Why deleting all eight is the right call

An empty row is worse than an absent one: it advertises a route and then shows nothing. For
the four that do correspond to real terrain, the fix isn't to keep the shell — it's to add the
route properly, with data. Those names are recorded below so that work is possible.

## Three duplicate a richer row that already exists

| stub | already covered by |
|---|---|
| `wa_mount_rainier_camp_muir_standard` "Camp Muir Standard" | Camp Muir is the **camp** on the DC route, not a route. `wa_mount_rainier_disappointment_cleaver`, 11/12 fields |
| `wa_mount_rainier_gibraltar_ledge` (singular) | `wa_mount_rainier_gibraltar_ledges` "Gibraltar Ledges", 12/12 |
| `wa_mount_rainier_winthrop_glacier` | Emmons–Winthrop is one route: `wa_mount_rainier_emmons_glacier` is named "Emmons–Winthrop Glacier", 11/12 |

## One names a glacier that doesn't exist

`wa_mount_baker_crevasse_glacier_route` — Baker's glaciers are Coleman, Deming, Easton, Squak,
Boulder, Park, Rainbow, Mazama, Roosevelt, Talum and Sherman. There is no Crevasse Glacier.
Baker's real glacier routes are all already present as rich rows.

## Four to re-add properly, once someone has the data

These correspond to real terrain but contribute nothing while empty.

- **`wa_mount_rainier_puyallup_glacier`** — the **Puyallup Cleaver** is a genuine,
  rarely-climbed west-side route and **no other row covers it**. The strongest candidate for
  a proper addition.
- **`wa_glacier_peak_white_chuck`** — the **White Chuck Glacier** route is real and has **no
  other row**. Also worth adding properly.
- `wa_mount_rainier_nisqually_glacier` — the named lines on that glacier are the Nisqually
  Icefall (already present, 11/12), Cleaver and Chute. "Nisqually Glacier" alone isn't one of
  them, so this is a naming artefact rather than a missing route.
- `wa_mount_baker_southwest_ridge` — Baker's southwest aspect is the Easton and Squak glacier
  terrain, both present as rich rows. "Southwest Ridge" doesn't appear as a route in the guide
  listings.

## Expected counts after the deletes

| area | before | after |
|---|---|---|
| Mount Rainier | 25 | 20 |
| Mount Baker | 11 | 9 |
| Glacier Peak | 8 | 7 |

## Also seen while checking these areas, not acted on

Rainier and Glacier Peak carry more of the same duplicate-shape problem than the sweep's
strict test flagged, and each needs a judgement the sweep can't make:

- `rainier_central_mowich_face` "Central Mowich Face" (9/12) beside
  `wa_mount_rainier_mowich_face` "Mowich Face" (11/12) — the Central line may be a genuine
  distinct variation.
- `rainier_north_mowich_headwall` "North Mowich Headwall (Edmunds Headwall)" (9/12) beside
  `wa_mount_rainier_edmunds_headwall` "Edmunds Headwall" (9/12) — the compound name suggests
  these are the same feature under two names.
- `wa_glacier_peak_disappointment_cleaver` "Disappointment Cleaver / Sitkum Glacier" (10/12)
  sits between `wa_glacier_peak_sitkum_glacier` "Sitkum Glacier" (11/12) and
  `wa_glacier_peak_disappointment_peak_cleaver` "Disappointment Peak Cleaver (Cool Glacier)"
  (12/12) — its compound name overlaps both, and one of the three is probably redundant.
