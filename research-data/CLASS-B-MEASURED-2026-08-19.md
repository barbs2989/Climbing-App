# Class B measured — every pair checked against the live database

**Nothing here is written.** The Triple Couloirs precedent: a real route was destroyed by a
delete whose "duplicate" twin did not exist. So the first question is never *which do we keep*
but *do both ids return a row at all* — and then *what would be lost either way*.

## What the measurement says

**All 12 pairs return both rows, and all 5 suspected phantoms still exist.** So no delete here is the
Triple Couloirs shape — but that is the *only* reassuring result, and three findings complicate it:

**Three pairs would lose data whichever way a plain delete goes**, because each side holds fields the
other lacks:

- `wa_east_ridge_7` vs `wa_lundin_peak_east_ridge` — the first has `grade`, `descent_text`, `rappels`,
  `approach_variants`, `hazards`, `fa`; the second has `dist_km`, `pitch_detail`. **Neither is a superset.**
- `wa_ottohorn_west_ridge` vs `wa_ottohorn_southeast_route`
- `wa_liberty_cap_ptarmigan_ridge_finish` vs `wa_mount_rainier_ptarmigan_ridge`

For these, the operation is a **merge then delete**, not a delete. Deleting either side alone silently
drops what only it held, and that loss is invisible afterwards.

**Six pairs sit in different areas**, so they are re-home questions as much as delete questions —
including both Liberty Cap rows against their Rainier twins, and `wa_east_ridge_7`, which is filed under
Red Mountain while being Lundin's route.

**One number settles the Red Mountain direction on its own:** `wa_east_ridge_7` stores
`high_point_ft` **5890** — Red Mountain's elevation — while the Lundin row stores **6057**, Lundin's true
height. The row is filed on the wrong peak *and* carries that peak's elevation.

## Duplicate pairs

### `wa_east_ridge_7`  vs  `wa_lundin_peak_east_ridge`
*found 2026-08-19: the whole row is Lundin's East Ridge*

| | `wa_east_ridge_7` | `wa_lundin_peak_east_ridge` |
|---|---|---|
| name | East Ridge | East Ridge |
| area | `wa_red_mountain_snoqualmie` | `wa_lundin_peak` |
| grade / pitches | Easy 5th / 1 | — / 1 |
| high point | 5890 | 6057 |
| populated fields | 19 | 15 |
| **only this side has** | `grade`, `descent_text`, `rappels`, `approach_variants`, `hazards`, `fa` | `dist_km`, `pitch_detail` |

> **Different areas** — so this is a re-home question, not only a delete.

> **Both sides hold something the other lacks — a plain delete loses data whichever way it goes.**

### `wa_sherpa_balanced_rock_north_ridge`  vs  `wa_sherpa_peak_north_ridge`
*same FA party, date, pitch count*

| | `wa_sherpa_balanced_rock_north_ridge` | `wa_sherpa_peak_north_ridge` |
|---|---|---|
| name | North Ridge | North Ridge |
| area | `wa_sherpa_balanced_rock` | `wa_sherpa_peak` |
| grade / pitches | — / 13 | 5.8 / 13 |
| high point | 8605 | 8630 |
| populated fields | 19 | 26 |
| **only this side has** | — | `grade`, `gain_ft`, `dist_km`, `rappel_detail`, `approach_variants`, `bivy`, `approach_logistics` |

> **Different areas** — so this is a re-home question, not only a delete.

### `wa_stanley_burgner`  vs  `wa_prusik_peak_south_face_burgner_stanley`
*same route*

| | `wa_stanley_burgner` | `wa_prusik_peak_south_face_burgner_stanley` |
|---|---|---|
| name | Stanley-Burgner | South Face (Burgner-Stanley) |
| area | `wa_prusik_peak` | `wa_prusik_peak` |
| grade / pitches | 5.10a / 6 | III, 5.9+ / 6 |
| high point | 8008 | 8008 |
| populated fields | 26 | 26 |
| **only this side has** | — | — |

### `wa_the_direct_north_ridge_w_gendarme`  vs  `wa_mount_stuart_north_ridge`
*same route*

| | `wa_the_direct_north_ridge_w_gendarme` | `wa_mount_stuart_north_ridge` |
|---|---|---|
| name | The Direct North Ridge w/ Gendarme | North Ridge (Complete) |
| area | `wa_mount_stuart` | `wa_mount_stuart` |
| grade / pitches | 5.9+ / 20 | Grade IV, 5.9 / 20 |
| high point | 9415 | 9415 |
| populated fields | 24 | 25 |
| **only this side has** | — | `dist_km` |

### `wa_lincoln_peak_wilkes_booth`  vs  `wa_lincoln_peak_north_ridge`
*identical FA party AND date*

| | `wa_lincoln_peak_wilkes_booth` | `wa_lincoln_peak_north_ridge` |
|---|---|---|
| name | Wilkes-Booth (Northwest Face) | North Ridge / Standard |
| area | `wa_lincoln_peak` | `wa_lincoln_peak` |
| grade / pitches | — / 4 | IV WI4 (AI4+) / 5 |
| high point | 9085 | 9101 |
| populated fields | 19 | 26 |
| **only this side has** | — | `grade`, `dist_km`, `rappels`, `rappel_detail`, `approach_variants`, `bivy`, `pitch_detail` |

### `wa_ruth_icy_traverse`  vs  `wa_icy_peak_ruth_icy_traverse`
*same traverse*

| | `wa_ruth_icy_traverse` | `wa_icy_peak_ruth_icy_traverse` |
|---|---|---|
| name | Ruth-Icy Traverse | Ruth-Icy Traverse (Northwest Ridge, via Ruth Mountain) |
| area | `wa_ruth_mountain` | `wa_icy_peak` |
| grade / pitches | Grade II, 4th class / 1 | — / — |
| high point | 7115 | 7073 |
| populated fields | 26 | 18 |
| **only this side has** | `grade`, `pitches`, `dist_km`, `rappels`, `approach_variants`, `climbing_route`, `pitch_detail`, `fa` | — |

> **Different areas** — so this is a re-home question, not only a delete.

### `wa_mount_stone_lake_of_angels`  vs  `wa_mount_stone_putvin`
*same approach and summit*

| | `wa_mount_stone_lake_of_angels` | `wa_mount_stone_putvin` |
|---|---|---|
| name | South Route via Lake of the Angels | Putvin Trail / Lake of the Angels Scramble |
| area | `wa_mount_stone` | `wa_mount_stone` |
| grade / pitches | Class 3 / — | Class 3-4 / — |
| high point | 6612 | 6612 |
| populated fields | 24 | 24 |
| **only this side has** | — | — |

### `wa_ottohorn_west_ridge`  vs  `wa_ottohorn_southeast_route`
*same peak, contradictory aspects*

| | `wa_ottohorn_west_ridge` | `wa_ottohorn_southeast_route` |
|---|---|---|
| name | West Ridge | Southeast Route |
| area | `wa_ottohorn` | `wa_ottohorn` |
| grade / pitches | — / 4 | Grade III-IV, 5.7 / — |
| high point | 7840 | 7840 |
| populated fields | 24 | 24 |
| **only this side has** | `pitches`, `length_m` | `grade`, `approach_variants` |

> **Both sides hold something the other lacks — a plain delete loses data whichever way it goes.**

### `wa_poltergeist_pinnacle`  vs  `wa_poltergeist_pinnacle_north_route`
*same pinnacle*

| | `wa_poltergeist_pinnacle` | `wa_poltergeist_pinnacle_north_route` |
|---|---|---|
| name | Poltergeist Pinnacle | East Face |
| area | `wa_mount_challenger` | `wa_poltergeist_pinnacle` |
| grade / pitches | 5.9 / 6 | Grade IV, 5.9 / 4 |
| high point | 8200 | 8198 |
| populated fields | 25 | 25 |
| **only this side has** | — | — |

> **Different areas** — so this is a re-home question, not only a delete.

### `wa_little_tahoma_east_shoulder`  vs  `wa_frying_pan_whitman_glaciers`
*found 2026-08-19: identical FA party AND date, gain, dist, grade, season, hazards, both pitch_detail entries*

| | `wa_little_tahoma_east_shoulder` | `wa_frying_pan_whitman_glaciers` |
|---|---|---|
| name | East Shoulder | Frying Pan / Whitman Glaciers |
| area | `wa_little_tahoma` | `wa_little_tahoma` |
| grade / pitches | Grade II+, Class 3-4 / 0 | Grade II+, Class 3-4 / 0 |
| high point | 11138 | 11138 |
| populated fields | 25 | 26 |
| **only this side has** | — | `approach_variants` |

### `wa_liberty_cap_liberty_ridge_finish`  vs  `wa_mount_rainier_liberty_ridge`
*found 2026-08-19: same 14,112 ft, same 1935 FA party*

| | `wa_liberty_cap_liberty_ridge_finish` | `wa_mount_rainier_liberty_ridge` |
|---|---|---|
| name | Liberty Cap via Liberty Ridge | Liberty Ridge |
| area | `wa_liberty_cap` | `wa_mount_rainier` |
| grade / pitches | Grade IV-V, AI3+ / 6 | Grade IV–V, steep snow/ice to ~60–70° / 6 |
| high point | 14112 | 14112 |
| populated fields | 24 | 25 |
| **only this side has** | — | `approach_variants` |

> **Different areas** — so this is a re-home question, not only a delete.

### `wa_liberty_cap_ptarmigan_ridge_finish`  vs  `wa_mount_rainier_ptarmigan_ridge`
*found 2026-08-19: same summit and FA*

| | `wa_liberty_cap_ptarmigan_ridge_finish` | `wa_mount_rainier_ptarmigan_ridge` |
|---|---|---|
| name | Liberty Cap via Ptarmigan Ridge | Ptarmigan Ridge |
| area | `wa_liberty_cap` | `wa_mount_rainier` |
| grade / pitches | Grade IV, 5.6, AI2-3 / 6 | IV / — |
| high point | 14112 | 14112 |
| populated fields | 22 | 23 |
| **only this side has** | `pitches`, `rappels` | `dist_km`, `approach_variants`, `bivy` |

> **Different areas** — so this is a re-home question, not only a delete.

> **Both sides hold something the other lacks — a plain delete loses data whichever way it goes.**

## Suspected phantoms — a row for something that may not be a route

### `wa_mount_stuart_north_face`
*its own beta says no such route is described anywhere*

- name: **North Face**, area `wa_mount_stuart`, 15 populated fields
- has: `discipline`, `high_point_ft`, `aspect`, `approach`, `beta`, `overview`, `waypoints`, `bivy`, `hazards`, `gear`, `season`, `approach_logistics`

### `wa_south_ridge_4`
*Eldorado — only guide marketing carries the name*

- name: **South Ridge**, area `wa_main_peak`, 23 populated fields
- has: `discipline`, `grade`, `pitches`, `length_m`, `high_point_ft`, `gain_ft`, `aspect`, `approach`, `beta`, `overview`, `descent_text`, `rappels`, `waypoints`, `bivy`, `pitch_detail`, `hazards`, `gear`, `fa`, `season`, `approach_logistics`

### `wa_bears_breast_mountain_se_mega_slab`
*a formation, not a route*

- name: **SE Mega Slab**, area `wa_bears_breast_mountain`, 18 populated fields
- has: `discipline`, `length_m`, `high_point_ft`, `dist_km`, `aspect`, `approach`, `beta`, `overview`, `descent_text`, `waypoints`, `pitch_detail`, `hazards`, `gear`, `fa`, `season`

### `wa_american_border_peak_northeast_face`
*a placeholder: name, aspect, season, high point, nothing else*

- name: **Northeast Face**, area `wa_american_border_peak`, 12 populated fields
- has: `discipline`, `high_point_ft`, `aspect`, `beta`, `overview`, `bivy`, `hazards`, `gear`, `season`

### `wa_chimney_rock_west_face`
*an IDAHO route filed on a WA peak*

- name: **West Face / South Summit (Standard)**, area `wa_chimney_rock`, 26 populated fields
- has: `discipline`, `grade`, `pitches`, `length_m`, `high_point_ft`, `gain_ft`, `dist_km`, `aspect`, `approach`, `beta`, `overview`, `descent_text`, `rappels`, `rappel_detail`, `waypoints`, `climbing_route`, `bivy`, `pitch_detail`, `hazards`, `gear`, `fa`, `season`, `approach_logistics`

