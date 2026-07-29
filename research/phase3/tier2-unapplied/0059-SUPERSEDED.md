# `0059_wa_zone_hazards_area_matched.sql` — merged, then retired unrun

This migration landed on main via #374 and was moved here without ever being applied. It is kept because the SQL is a good template, not because it should run.

## Why it can't run

Every statement is `UPDATE routes ... SET hazard_tags = ...`. **`routes.hazard_tags` no longer exists** — migration `0060` (#369) dropped it, and the drop is applied to the live database (`select=hazard_tags` returns HTTP 400). The first statement fails.

The two PRs crossed: `0060` dropped the column the same afternoon `0059` was written against it.

## Why retargeting it wouldn't help either

Pointing it at `routes.hazards` — the only hazard field the app reads — makes it a no-op, because every route in its scope already has data:

```
WA alpine/mountaineering/ice/mixed total:  616
  ...with routes.hazards populated:        616
  ...hazards empty array:                    0
  ...hazards NULL:                           0
```

The header's "173 previously empty" was measured against `hazard_tags`, the decoy column. Empty there; fully covered in the field that counts.

There is also a format mismatch. `routes.hazards` holds prose, not slugs — "Constant rock and icefall — Liberty Ridge is statistically one of the deadliest routes on the mountain", or at zone level "Rattlesnakes, poison ivy, and spring ticks are recurring hazards across crags in this canyon". A value like `routefinding-whiteout` would render as a bare slug beside full sentences.

## What's genuinely good here, and worth copying

The scoping is the pattern later hazard work should follow:

- joins through `areas` rather than matching peak names against `routes.name` (which holds the line name — the bug behind 0044/0045/0046)
- filters by `r.id LIKE 'wa_%'` **and** discipline, so it can't spray across states — the failure mode that put glacier hazards on Arizona boulder problems
- dedups on write with `array_agg(DISTINCT t ORDER BY t)` instead of bare `||`, so re-runs can't duplicate
- states plainly that its content is zone-level terrain, not per-route verified fact

## The useful next step, if anyone wants it

Invert it: instead of *writing* zone hazards, *audit* whether the existing prose already covers them — flag any route under a glaciated volcano whose `hazards` never mentions crevasse or icefall. That surfaces real gaps across the 616 routes rather than appending to routes that already have data.

## Note on numbering

`0059` was also claimed by `0059_gps_notifications.sql` on the #364 branch. With this file retired, that number is free again.
