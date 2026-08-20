# 17 routes gained computed distances, and the estimate that got there was too optimistic

2026-08-19. Implementation of the method measured in `DISTMI-IS-PARTLY-COMPUTABLE-2026-08-19.md`.

## The honest arithmetic, at each stage

| stage | routes |
|---|---|
| WA routes carrying waypoints | 1,012 |
| missing a `distMi`, so unsortable | 435 |
| have a **genuine** (non-synthetic) track — "computable" | 115 |
| **every** pin within 100 m of that track | 22 |
| …and the track is oriented trailhead → summit, and is over 200 m long | **17** |
| of the 64 ordering findings, actually resolved | **2** |

The headline in the previous doc was *"20 of the 64 are computable"*. That was measured before
the per-route gate existed and it was **too optimistic by an order of magnitude** for the thing
that matters. Two effects narrowed it, and both are the gates working rather than a
disappointment:

- **The gate is per-ROUTE, not per-pin.** `orderWaypoints` needs *every* pin to carry a
  distance, so one pin 3 km off the line disqualifies the whole route. A per-pin acceptance rate
  (62% at 100 m) badly overstates fixability; per-route it is 22 of 115.
- **Five routes were refused for a reversed track**, and that gate earns its place: a
  descent-direction track inverts every derived distance and therefore inverts the order. It is
  the one failure mode that would have looked like a successful fix.

## Where the 100 m came from

Measured, not chosen — 2,098 pins across 376 routes with a genuine track:

| type | n | median | p75 | p90 | max |
|---|---|---|---|---|---|
| Junction | 610 | 44 m | 372 m | 1.3 km | 18.2 km |
| **Trailhead** | 375 | 51 m | **1.2 km** | **7.4 km** | 23.0 km |
| Summit | 368 | 11 m | 55 m | 523 m | 16.9 km |
| Campsite | 262 | 83 m | 604 m | 1.8 km | 14.9 km |
| ALL | 2,098 | 30 m | 341 m | 1.6 km | 23.0 km |

Trailhead pins are the worst by a wide margin, which is the predicted failure confirmed: tracks
frequently start at the climb rather than at the car. 100 m is where the distribution breaks —
50 m qualifies 14 routes, 100 m qualifies 22, and 200 m adds only 5 more while admitting pins
that are plainly not on the line.

## What the writes did

Four routes now render in a different order, and every one starts at the Trailhead and ends at
or one descent-junction past the Summit:

```
wa_dragontail_peak_r3
  was  Trailhead, Campsite, Junction, Junction, Hazard, Summit, Junction
  now  Trailhead, Campsite, Junction, Junction, Junction, Hazard, Summit

wa_little_tahoma_east_shoulder
  was  Water, Campsite, Junction, Junction, Hazard, Junction, Trailhead, Summit
  now  Trailhead, Water, Campsite, Junction, Junction, Hazard, Summit, Junction
```

Little Tahoma's Trailhead was the **seventh** pin in a list read top to bottom.

The other 13 keep their order and still gained something: they move from *unsortable* — where
the audit counted them as in-order by construction — to *auditable*. Sortable routes went
482 → 499.

## Provenance, because this column now holds two kinds of number

Every derived pin is stamped **`distFrom: "track"`**. `distMi` elsewhere holds researched
values, and without the stamp no later audit could tell a computed distance from a measured one.
An existing `distMi` is **never overwritten** — only absent ones are filled.

## A wording bug the write exposed

`audit:waypoint-order` printed *"routes whose waypoints render out of order"*, and that count
went 0 → 4 the moment these distances landed. It reads as a regression and is the opposite: the
audit compares the **stored** array against what `orderWaypoints` produces, so a non-zero count
means the app is now **correcting** those routes at render time. They render in order; the
stored order is what differs. The line now says so.

That is the third wording defect found in this audit family today, after the missing denominator
and `audit:approach-scope`'s stale instruction. **An audit's label is a claim, and it ages.**

## Remaining

**62 genuine ordering findings** (down from 64), **418 unsortable routes** (down from 435). Of
the rest, 226 have no usable track and genuinely need research, and 88 have a track that is the
pins joined up — where computing from it would confirm the stored order by construction.
