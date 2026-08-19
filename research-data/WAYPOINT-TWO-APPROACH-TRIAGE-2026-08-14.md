# One formation, two approaches, one track: 35% of the trailhead findings are not pin errors

`audit:waypoints` currently reports **603 exclusive findings** over WA. This is a reading of the
trailhead half of them, and the headline is that **a large minority cannot be repaired by moving a
pin, because the pin is already right.**

Read [[waypoint-traps-index]] first. This note adds one trap to it.

## The shape, proven on Liberty Bell

Fifteen Liberty Bell routes share **one identical 491-point track** (md5 `ceebd9da…`). All fifteen
are in the same area, which is normal — routes on a formation share an approach. But the fifteen
split into **two genuinely different approaches**:

| approach | routes |
|---|---|
| **Blue Lake Trailhead** (west/northwest side) | Liberty Traverse, Serpentine Crack, The Independence Route, Overexposure, Rapple Grapple, NW Face Var. (Remsberg), Northwest Face |
| **SR-20 Hairpin / Pond Pullout** (east face) | Liberty Crack, Liberty Crack (Free), East Face, Thin Red Line, A Servant To Liberty, Liberty and Injustice for All |

The shared track starts at `48.51913,-120.67427` — Blue Lake. So it matches the seven west-side
routes and misses the six east-face ones by **~2.3 km**, which `audit:waypoints` reports as
`trailheadNotAtStart` / `trailheadOffLine` against the six.

**The six pins are correct, and the audit finding would instruct the wrong repair.** Sourced: for
the East Face routes — Liberty Crack and Thin Red Line — you park at the hairpin curve east of
Washington Pass, walk back toward the pass to a pond, and pick up the cairned climbers' trail at
the east end of the pond. That is exactly what the stored pin says.

- https://www.summitpost.org/liberty-bell-mountain/150250
- https://www.mountainproject.com/route/106512297/liberty-crack

Both stored copies agree here (`waypoints[]` pin and `approach_logistics.trailheadLat/Lng`), so
the trailhead-agreement audit is clean on them too. Agreement is not correctness, but in this case
both are right and the *third* record — the track — is the one that cannot serve every route.

## How common: measured, not guessed

Over the 235 routes named in the current `audit:waypoints` run:

    in an area with 2+ DISTINCT trailhead pins (two-approach formation):   83   (35%)
    in an area with a single trailhead:                                   152
    WA areas carrying 2+ distinct trailhead pins:                          98 of 447

So roughly a third of the flagged routes sit on formations that genuinely have more than one
approach. Those are the ones where "move the pin onto the track" is the wrong instruction. It does
**not** follow that all 83 are benign — only that each needs the approach question answered before
anything is written.

## The rule

**Before moving a trailhead pin to match a track, ask whether the formation has more than one
approach.** If it does, the mismatch is expected and the pin is probably right. Prefer fixing the
*track*, or accept the finding as structural — never "repair" the pin to silence it.

There is no safe bulk transform here, and there is no correct track to promote: the east-face
approach track does not exist in the data, and inventing one is the failure mode
[[waypoint-findings-that-tell-you-to-break-data]] already records.

## Two data-shape traps found while doing this

- **`routes.gpx` is `[lat,lng]`.** Measured across 300 WA rows: 300 `[lat,lng]`, 0 `[lng,lat]`,
  which matches the 580/0 already recorded in [[waypoint-pin-backlog-six-routes-applied]]. The
  MEMORY.md index line summarised that note backwards and has been corrected. **A swapped read
  gives a ~12,000,000 m distance** — that number is the fingerprint, and I produced it myself
  before catching it.
- **`waypoints[].lat` / `.lng` are not always numbers.** `Number(v)` coercion is required;
  `w.lat.toFixed()` throws on live data.

## Not a defect, checked and dismissed

Shared tracks are **not** themselves a fault. 116 of 581 WA routes with a track share it with at
least one other, across 37 groups — and **every group is inside a single area**. That is routes on
one formation sharing one approach, which is correct. The Liberty Bell case is only a problem
because that one formation has two approaches, not because the track is shared.
