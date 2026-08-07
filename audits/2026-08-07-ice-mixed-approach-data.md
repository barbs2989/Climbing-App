# WA ice/mixed approach data — 2026-08-07

All **21** WA ice/mixed routes were reviewed. These sit outside PR #468's `wa-alpine-audit`,
whose scope filter is `discipline IN ('alpine','mountaineering')`, so they are uncontended —
but only at **route** level. #468's batches write `areas.lat` / `areas.prominence_ft`, and 17
of these routes sit on peaks it is actively processing, so **nothing here touches an `areas`
row.**

## The gap

Narrative enrichment is complete on all 21 (`gear`, `hazards`, `beta`, `approach`). The
missing data is numeric: **17 of 21 lacked at least one of `dist_km` / `gain_ft` / `loss_ft`.**
That is what feeds `scarfHrs`, so those routes showed only the `≥` lower-bound estimate
introduced in #666 rather than a real time.

## The rule I held to

**Only write a number the row itself proves.** No figure is derived from a peak's other routes
(different trailheads on one mountain are legitimately different approaches), and no figure is
estimated from a map. Per the project's enrichment gates, wasted research and bad data are worse
than sparse data.

### `loss_ft` is not arithmetic — it is a semantic claim

This is the trap worth recording. `gainCoversWholeOuting()` returns true when
`|loss - gain| / gain <= 0.03`, and the app keys three pieces of user-facing copy off it: the
stat tile label flips from **"Approach gain"** to **"Total ascent"**, the explanatory note under
the stats is rewritten, and the planner tile flips from **"Approach"** to **"On foot"**.

So `loss_ft = gain_ft` cannot be applied just because a route returns to its trailhead. It is
only correct where `gain_ft` *already* covers the whole outing. The test used: `gain_ft` must
match (summit elevation − trailhead elevation) drawn from the route's own waypoints or its own
`approach_logistics`, within 8%.

## Writes — 9 across 8 routes

### `dist_km` (5) — from a cumulative one-way distance already recorded on the route's far waypoint

| route | area | dist_km | evidence |
|---|---|---:|---|
| Early Winter Couloir | North Early Winters Spire | 1.61 | Summit waypoint recorded at 1 mi one-way |
| East Face Variation | The Tooth | 3.22 | Summit waypoint recorded at 2 mi one-way |
| Excavation, AKA The Crack | Shuksan Crag | 0.08 | Topout waypoint recorded at 0.05 mi one-way |
| Last Chance for Gas, AKA Tricky Start | Shuksan Crag | 0.08 | Topout waypoint recorded at 0.05 mi one-way |
| SW Couloir and Face | Mount Shuksan | 10.46 | Summit waypoint recorded at 6.5 mi one-way |

### `loss_ft` (4) — only where `gain_ft` is proven to be a whole-outing ascent

| route | area | loss_ft | evidence |
|---|---:|---:|---|
| Early Winter Couloir | North Early Winters Spire | 2400 | gain_ft 2400 matches trailhead→summit net 2560 ft within 6.3% (trailhead waypoint), so it already covers the whole outing |
| East Face Variation | The Tooth | 2500 | gain_ft 2500 matches trailhead→summit net 2506 ft within 0.2% (trailhead waypoint), so it already covers the whole outing |
| Excavation, AKA The Crack | Shuksan Crag | 50 | same crag and identical gain_ft (50) as wa_last_chance_for_gas_aka_tricky_start, which already records loss_ft 50 |
| Wilkes-Booth (Northwest Face) | Lincoln Peak | 5385 | gain_ft 5385 matches trailhead→summit net 5385 ft within 0.0% (trailhead elevation stated in this row's approach_logistics), so it already covers the whole outing |

## Deliberately left empty — 11

| route | area | why |
|---|---|---|
| Borrowed Time | Sloan Peak | no gain, no distance, no usable waypoint elevations — needs outside research |
| West Face of Boston | Boston Peak | no gain, no distance, no usable waypoint elevations — needs outside research |
| Ford's Theatre | Colfax Peak | gain_ft 5790 but nothing in the row establishes whether it covers the whole outing |
| Cauthorn-Wilson | Cutthroat Peak | no gain, no distance, no usable waypoint elevations — needs outside research |
| Kendall Cliff – North Face | Kendall Peak | no gain, no distance, no usable waypoint elevations — needs outside research |
| North Face | North Peak | gain_ft 4250 vs trailhead→summit net 4757 ft — 11% apart, so whether it is approach-only or whole-outing is unresolved |
| Northwest Face | Silver Star Mountain | no gain, no distance, no usable waypoint elevations — needs outside research |
| West Face Couloir | Silver Star Mountain | no gain, no distance, no usable waypoint elevations — needs outside research |
| The Snostril | Snoqualmie Mountain | no gain, no distance, no usable waypoint elevations — needs outside research |
| North Face | Summit Chief Mountain | no gain, no distance, no usable waypoint elevations — needs outside research |
| Superalpine | Sloan Peak | no gain, no distance, no usable waypoint elevations — needs outside research |

Two of these deserve a note. **Ford's Theatre** (Colfax) carries `gain_ft` 5790 and
**North Face** (Mount Index North Peak) carries 4250, but neither row contains the pair of
elevations needed to establish whether that figure is the approach alone or the whole day.
Guessing would set the wrong label on a safety-adjacent number, so both keep the honest
lower-bound treatment until someone researches them properly.

## Verification

- `npm run check:sql` — every target id exists, no destructive statement, no paste-size warning.
- Dry-run of each predicate against the live DB before running, and a re-read of all 21 rows
  after. **A 200 is not evidence the data changed.**
