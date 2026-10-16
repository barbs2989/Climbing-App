# The waypoint ordering guarantee does not apply to half the catalog

2026-08-19. First triage of `audit:waypoint-order`, which had no triage doc. Its two questions
are the *list* ones — is the order sensible, and is the same place listed twice — as distinct
from the three pin-position audits.

## The duplicate half is small and real

**10 WA routes list the same place twice, 11 duplicate pins.** None has two summit pins. These
are genuine and the numbers are the numbers.

## The ordering half was reporting 0 by construction

`audit:waypoint-order` printed:

> routes whose waypoints render out of order: **0**

which reads as a clean catalog, and is not what it measured. `orderWaypoints` in
`lib/waypoints.js` sorts by `distMi` — but only if **every** pin has a finite numeric one:

```js
const all = wps.every(w => … typeof w.distMi === "number" && Number.isFinite(w.distMi));
if (!all) return wps;   // untouched
```

So a route missing a single distance is returned unsorted, **the app renders its stored order
however wrong**, and the audit compares that stored order against itself and finds no
difference. The verdict was true and its scope was unstated.

| | routes |
|---|---|
| WA routes with waypoints | 1,012 |
| every pin has `distMi` — orderable | **482** |
| cannot be ordered at all | **530** |

So the "0" covered 48% of the catalog. Same shape as the terrain classifier being blind to two
columns: the answer is correct about what it could see, and silent about the rest.

*(The probe reports 470 / 435 / 107 rather than 482 / 530 — it dedupes first and excludes lists
of fewer than 2 pins, which cannot be mis-ordered. 470 + 435 + 107 = 1,012. The two are
consistent; do not read them as a disagreement.)*

## What is sitting in the gap

**64 of the 435 unsortable routes list an approach marker AFTER the summit** — a trail
junction, a water source, a campsite or a climbing area appearing below the summit in a list a
climber reads top to bottom.

The clearest is a cluster of five routes on Amphitheater Mountain, all identical:

```
Trailhead, Summit, Topout, Junction, Climbing area
```

The climbing area is listed **last**, after the summit, on all five. `wa_mount_lago_south_slope_south_face`
reads `Trailhead, Summit, Water, Campsite, Junction` — the camp you sleep at, listed after the
top — and carries **no `distMi` at all**, so nothing can reorder it.

### A summit that is not last is NOT automatically wrong

Two exclusions, both measured rather than assumed:

- **A descent route legitimately starts at the summit.** `wa_forbidden_peak_east_ledges` is
  Forbidden's standard way *down*, so `Summit → ledges → gully → basin` is the correct reading
  order, and flagging it would be the detector manufacturing a finding. Judged by what the pins
  *after* the summit are called, not by the route's name — a descent line is rarely named one.
  2 of the 66 are this.
- **A loop legitimately returns to the trailhead**, so a single trailhead as the very last pin
  is not evidence.

## What was changed — the instrument, not the data

`scripts/audit-waypoint-order.mjs` now states the denominator with the verdict:

```
routes whose waypoints render out of order: 0 — of the 482 this can order at all
  530 more cannot be ordered (a pin is missing distMi), so they render in STORED order
  and are counted as in-order here whatever that order is.
```

An unqualified zero over a population half of which the check cannot see is the vacuous-pass
shape, and this is the third instance found today — after the terrain classifier's blind
columns and `audit:approach-scope`'s stale advice. **The pattern is worth naming: when an audit
reports zero, ask what its denominator is before believing it.**

## Deliberately not swept

The 64 are **reported, not reordered.** Fixing one means asserting a sequence, and the
information that would justify it — `distMi` — is exactly what these routes are missing. Most
carry no distances at all, so there is nothing to derive an order *from*; a reordering would be
me deciding what order the climber walks in, which is research rather than repair.

The real fix is to populate `distMi`, which is per-route research. Reordering without it
replaces an order nobody chose with an order I chose, and only one of those is honest about
what it knows.
