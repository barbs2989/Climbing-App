# The off-track waypoint backlog, read rather than counted: ~4% is safely mechanical

CLAUDE.md already records that this backlog needs *reading* rather than a bulk pass. This is the
reading. Against a headline of roughly 195 off-track pins, **7 pins across 6 routes can be fixed
safely today**. Most of the rest would instruct the wrong repair.

## The two audits still disagree, and the disagreement is the useful part

| | `audit:waypoint-track` | `audit:waypoints` |
|---|---|---|
| routes flagged | 253 | 634 "warrant a look" |
| blame column | WRONG TRACK 0 · **PARTIAL 38** · **PIN 215** | no blame column |
| off-line pin findings | — | 334 across 162 routes (median **1,244 m**; 89 over 2 km) |

160 of 162 off-line routes are common to both, so they agree on *which routes*. **They contradict
each other on blame for 53 routes**: 25 that `audit:waypoints` files as off-line pins, the track
audit calls PARTIAL (not a defect); and of the 62 `audit:waypoints` files as `truncatedTrack`
(informational), the track audit calls 28 actionable PIN.

**Neither found a WRONG TRACK this run** — the Curtis Ridge–class foreign track appears to be gone.

The real limit is coverage, not either count: **564 of ~1,018 waypoint-carrying routes cannot be
judged at all** (126 placeholder gpx + 438 with no track). Any headline is a statement about the
~40% that have a measurable track.

## Safely fixable — 7 pins, 6 routes

Every one clears the `wa_ragged_edge` bar: **two or more peer rows on the same peak carrying the
same feature at the same coordinate.**

| route | pin | wrong by | re-homed from |
|---|---|---|---|
| `wa_mount_rainier_liberty_ridge` | Liberty Cap | 2,103 m | 5 peers, all identical |
| `wa_primus_peak_south_ridge` | trailhead | 21.5 km | 2 peers **and its own gpx** |
| `wa_mount_rainier_edmunds_headwall` | Mowich Lake TH | 640 m, elev 2900 vs 4,929 ft | 1 peer corroborating coordinate **and** elevation |
| `wa_prusik_peak_solid_gold` | Stuart Lake TH | 597 m | 7 agreeing peers |
| `wa_prusik_peak_west_ridge` | duplicate Aasgard Pass | 890 m apart | drop the outlier |
| `wa_southwest_buttress` (Dorado Needle) | Inspiration Glacier camp; McAllister col | 474 m; 548 m | 2 agreeing peers |

`wa_primus_peak_south_ridge` is the only decisive *odd-one-out trailhead* in the set, and only
because **its own track agrees with the peers against its own pin**. Peer disagreement alone
justifies nothing — Shuksan's Price Glacier really does start at Nooksack Cirque.

## Proven wrong but NOT re-homeable — ~20 pins, 8 routes

These are established by **internal contradiction**, needing no gpx and no DEM: thousands of feet of
elevation across tens of metres, or a pin claiming 0.5 mi to go while sitting 12 km out.

- `wa_preacher_mountain_scramble` ×3 — a "5,200 ft tarn" **34 m from a 1,200 ft pin**
- `wa_lemah_mountain_east_route` ×2 — pins at `distMi` 7.0/7.5 of 7.7 landing ~1 km from the trailhead
- `wa_south_face_12` (Argonaut) ×3 — last 3 pins 6.7–8.1 km south of the summit
- `wa_klawatti_peak_southeast_face` ×3 — closes to 1,204 m then runs back out to 6,432 m
- `wa_mount_olson_standard` ×2 — 2,675 ft of elevation across 163 m
- `wa_chimney_rock_west_face` ×3 · `wa_mount_rainier_emmons_glacier` ×1 (6,800 ft pin 169 m from 4,600 ft parking)
- `wa_mount_larrabee_south_ridge` ×1 — High Pass (5,940 ft) 60 m from a 3,700 ft trailhead
- `wa_mount_rainier_liberty_ridge` ×3 — west-side Mowich pins on an east-side (White River) route

**No peer row carries these features**, so the correct coordinate must be surveyed. Inventing one for
a bergschrund or a col is worse than leaving a known-bad pin visible, so none of them are written.

## Findings that would instruct the WRONG repair — do not "fix" these

1. **38 PARTIAL routes + the 25 the two audits disagree on.** Cathedral Peak's trailhead at 23,024 m,
   Fury's Ross Dam at 18,838 m — **the pins are right**; the gpx starts at the base of the climb.
   Moving them destroys correct data.
2. **62 `truncatedTrack`, where the 2,000 m threshold is a cliff.**
   `wa_glacier_peak_kennedy_glacier` misses it by 122 m and so appears under *"TRAILHEAD IS NOT ON
   THE TRACK"*, which reads as a pin defect. Its track just starts 2.9 km in, at a junction the
   route itself carries a pin for.
3. **`summitOffLine` where the summit pin is exactly on its peak** — `wa_copper_peak_south_route`
   is 1,878 m off the line and **0 m** from the peak. The track stops short; the pin is right.
   (`wa_gunsight_peak_standard` is here too, and CLAUDE.md records Gunsight as settled.)
4. **`outOfOrder` (143) is mostly an out-and-back projection artifact.** `alongTrack` projects a pin
   onto the nearest leg, so an approach pin can land on the *return* leg and read as "later" than the
   summit. 49 of 143 show the reflection signature; 52 name a summit as the "later" pin.
5. **Two cases where the AREA coordinate is the likelier defect** — `wa_massie_peak_west_route` and
   `wa_gray_wolf_ridge_se_slopes`. In both, the pins and the track agree with each other, disagree
   with `areas.lat/lng`, and the pin elevation matches `areas.elevation_ft` to within 1 ft. Moving
   the pins would break two internally consistent rows to match a single suspect field.
6. **17 `noCoordinate` waypoints carry real itinerary text** ("Headlee Pass", "Custer–Spickard
   Saddle"). Deleting them to clear the finding destroys sourced beta.

## Unresolved — a contradiction between two consistent sources, not a stray pin

`wa_beckey_tate` + `wa_big_kangaroo_west_face` (the two rows agree with each other; either 5 approach
pins or the peak coordinate is wrong), `wa_massie_peak_west_route`, `wa_gray_wolf_ridge_se_slopes`,
`wa_mount_barnes_scramble` (pins describe the Bailey Range traverse, track and route name say Elwha
Basin), `wa_colfax_peak_cosley_houston` + `_polish_route` (track starts Schriebers Meadow, trailhead
pin is Heliotrope Ridge — opposite sides of the mountain).

## Tally

**6 routes fixable today · ~8 needing a survey · ~5 needing a judgement call · ~130 that should be
closed as "fix the track, not the pin".**

One correction to an earlier note: `wa_vesper_peak_north_face_ragged_edge` still carries two
`noCoordinate` waypoints *after* the precedent fix. That repair replaced the two displaced pins and
did not source these.
