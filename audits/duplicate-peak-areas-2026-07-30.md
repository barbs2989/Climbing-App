# Duplicate peak areas, and the Baker/Goode numeric bleed

Found while working through `npm run audit:identity` check 7 (numeric contamination).
Nothing in this file has been applied except where marked APPLIED.

## 1. The audit was hiding its own findings (fixed in this branch)

Check 7 ranks findings by whether the shared value looks "round", on the theory that
round figures coincide honestly and specific ones travel by contamination. It tested
roundness in the unit the value is *stored* in. But `length_m` and `dist_km` hold metric
values converted from imperial sources, so:

| stored | really is | old verdict | correct verdict |
| --- | --- | --- | --- |
| `length_m` 305 | 1,000 ft | specific | round |
| `length_m` 91 | 300 ft | specific | round |
| `length_m` 610 | 2,000 ft | specific | round |
| `dist_km` 40.23 | 25.0 mi | specific | round |
| `dist_km` 8.85 | 5.5 mi | specific | round |

That put 41 findings in the "non-round, look here first" bucket when only 11 belonged,
and the printout is capped at 12 — so the real findings below were never displayed.
`isRound` now takes the column and gives metric columns a second opinion in feet/miles.
Non-round count drops 41 → 11, and all 11 fit inside the printed window.

Two routes both described as "about 1,000 ft" is a coincidence. That is exactly what the
round bucket is for, and round findings are still reported, just ranked lower.

## 2. Mount Baker's North Ridge bled two fields across six states

`wa_mount_baker_north_ridge` owns `gain_ft` 7150 and `high_point_ft` 10781 (Baker's summit
to the foot). Both values propagated to every other route named "North Ridge" that had no
figures of its own — **29 areas across CA, CO, OR, UT, WA, WY**.

That claimed a 10,781 ft summit for the Grand Teton (13,775), Mount Moran, Mt. Conness and
the Pfeifferhorn.

- **APPLIED** — the three WA rows corrected from same-area sibling consensus:
  `wa_north_ridge` (Steeple Rock) → 5570, gain nulled; `wa_north_ridge_5` (Main Peak) →
  8873 / 6800; `wa_north_ridge_7` (Aiguille de l'M) → 7200 / 4000.
- **PENDING** — `audits/sql/baker-bleed-national.sql` nulls both fields on the 28 non-WA
  rows. They are skeletal stubs (11 of 83 columns populated) whose areas all have
  `elevation_ft = null`, so there is no source to repair from and no number worth
  inventing. Rows are not deleted: whether these routes exist at all is a separate
  question about the deferred out-of-state expansion.

A field-by-field diff against Baker's row confirmed only those two columns travelled;
`grade`, `pitches` and `fa` vary per row and are worth keeping.

Same mechanism, smaller blast radius: `high_point_ft` 9220 is **Mount Goode's** real
elevation and sits on three unrelated CA areas (Flatiron Butte, Mount Cotter, Torre De
Mierda) — which each *also* carry the contaminated `gain_ft` 5800, so again two fields
travelled together. And all three routes on Sherpa Balanced Rock carry Sherpa Peak's 8630
instead of their own area's 8605. Both are in `audits/sql/baker-bleed-batch-2.sql`,
**not applied** — run it after the national one; they are separate pastes because together
they exceed the size at which the SQL editor has silently truncated input before.

## 3. Six findings are duplicate AREAS, not bad numbers

Several check-7 hits are one peak entered twice — once as a `peak` with a real elevation,
once as a `crag` with `elevation_ft = null` under a different parent. The routes split
across the two copies, and the crag copy carries the real peak's numbers, which is why a
name-and-value scan surfaced them.

Likely duplicates — same summit under two ids, one of them elevation-less:

| peak copy | duplicate crag copy | apart |
| --- | --- | --- |
| `wa_little_big_chief_mountain` (7225) | `wa_little_big_chief` | 4 m |
| `wa_remmel_mountain` (8688) | `wa_mt_remmel` | 259 m |
| `wa_chair_peak` (6238) | `wa_summer_fall_rock_3` | 11 m |
| `wa_mcmillan_spire_west` (8038) | `wa_west_mcmillan_spire` | 9 m |
| `wa_garfield_mountain` (5519) | `wa_mount_garfield` | 20 m |
| `wa_mount_fury_west` (8303) | `wa_west_peak` (parent `wa_mt_fury`) | 112 m |
| `wa_baring_mountain` (6127) | `wa_dolomite_tower` (parent `wa_mount_baring`) | 18 m |
| `wa_castle_peak_tatoosh` (6469) | `wa_castle_the` | 30 m |

Some of these pairs have duplicated **parents** too: `wa_pasayten` / `wa_pasayten_wilderness`,
`wa_mount_baring` / `wa_baring_mountain`, `wa_picket_range` / `wa_southern_pickets`.

`wa_gunsight_peak` vs `wa_middle_peak` (under `wa_gunsight_range_the`) is the same class
and was already identified independently, with the stronger evidence of overlapping route
names — see the hierarchy-cleanup notes.

Not acted on. The user deferred hierarchy cleanup on 2026-07-30. Merging areas is
structural, needs a survivor chosen per column rather than per row, and the last time a
duplicate was resolved on suspicion it cost us Triple Couloirs. This is a list, not a patch.

### Proximity flagged these, and they are NOT duplicates

A separate live inventory checked several of these directly. Recording them so the
proximity signal does not get re-litigated into a destructive merge:

- **`wa_main_peak` / `wa_eldorado_peak`** (20 m) — `wa_main_peak` is a correctly-parented
  sub-area of the Eldorado massif holding Tepeh Towers, not a copy of Eldorado Peak.
- **`wa_main_peak_2`, `wa_north_peak_2` / `wa_mount_index`** (2 m) — Mount Index genuinely
  has Main, North and Middle summits. Real sub-peaks.
- **`wa_brothers_south_peak_the` / `wa_the_brothers`** (4 m) — The Brothers has two real
  summits.
- **`wa_ingalls_peak` / `wa_ingalls_peak_east`** — distinct summits, 7662 vs 7480.
- **`wa_sherpa_peak` / `wa_sherpa_balanced_rock`** — distinct formations ~93 m apart. But
  `wa_sherpa_balanced_rock_north_ridge` does wrongly carry Sherpa Peak's 8630 instead of
  its own 8605 — a real numeric bug on a legitimate pair.

That is five of thirteen candidates: **proximity plus a shared name is roughly a coin
flip.** Treat every row above the fold as unverified until its route lists are diffed.

## 4. Two WA areas were built out of the wrong column

`wa_summer_fall_rock_3` is named **"Summer-Fall (rock)"**. Its routes carry
`season = "Summer-Fall (rock)"` — the area name is a copy of the season field, verbatim.
It is not a crag. It sits 11 m from Chair Peak, and two of its three routes duplicate
Chair Peak's, down to the same `gain_ft` 3138 and `high_point_ft` 6238:

| on `wa_summer_fall_rock_3` | duplicates |
| --- | --- |
| `wa_east_face_8` "East Face" | `wa_chair_peak_east_face` |
| `wa_northwest_ridge_3` "Northwest Ridge" | `wa_chair_peak_northwest_ridge` |
| `wa_chair_bryant_traverse` "Chair-Bryant Traverse" | *nothing — a real route with no home* |

The third one matters: the Chair-Bryant traverse is a genuine route that exists **only**
here. Deleting this area wholesale would destroy it. It wants reparenting to
`wa_chair_peak`, not deletion.

`wa_winter_spring_ice_snow_mixed_2` — "Winter-Spring (ice, snow, mixed)" — is the same
construction, 113 m from Guye Peak, but currently holds no routes.

Left alone, on the same deferral. Worth knowing that a scan for areas whose name matches
another column's value is cheap and found these two immediately; the rest of the
season-shaped names across other states ("Winter Wall", "Spring Boulder", the Devil's Lake
`5.1 - …` series) are legitimate and were checked.

### Caveat on the proximity scan

Many Picket Range peaks share one coordinate (East Twin Needle, Frenzel Spitz, Little Mac
Spire, The Pyramid and The Rake are all 0 m apart with different elevations). Those are a
coordinate-precision gap, not duplicates. Proximity is a prompt to look, never a verdict —
a naive version of this scan returned 382,352 "matches" because a parent area sits at its
children's coordinates by construction.
