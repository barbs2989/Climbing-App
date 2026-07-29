# Mount Adams duplicate audit — 2026-07-29

Mount Adams is one of the most-climbed peaks in the state, and its standard route appeared
in the live catalogue **three times**. This resolves that, and corrects a wrong entry on the
existing dedup list.

Area `wa_mount_adams` held 12 routes with a cached `route_count` of 12.

## The real duplicate: one route, three rows

| id | name | dist_km | gain_ft | fields | gpx |
|---|---|---|---|---|---|
| `wa_mount_adams_south_climb` | South Climb (South Spur) | **19.3** | 6700 | 17/22 | **166 pts** |
| `wa_mount_adams_south_spur` | South Spur Route | 9.2 | 6676 | 18/22 | 5 pts |
| `wa_mount_adams_south_side` | Mount Adams - South Side | null | null | **3/22** | none |

`south_spur`'s own overview says *"The South Spur (also called the South Climb) is Mount
Adams' standard, non-technical route"* — the same line under its other name. `south_side`
had no discipline, grade, distance, gain, hazards or track: a stub.

**Keeper: `south_climb`** — but on the GPX track, not on the distance. It carries a genuine
166-point track against `south_spur`'s 5, and after the merge it holds every field
`south_spur` had.

> **Correction.** An earlier version of this file argued for `south_climb` because "19.3 km
> matches the real ~12.5 mi round trip, where `south_spur`'s 9.2 km is a one-way figure".
> That reasoning was wrong, and backwards. `dist_km` **is** the one-way distance: the route
> page derives round trip from it with `roundTripKm = distKm * 2` (`ClimbMatch.jsx`). So
> 9.2 km one-way renders as 11.4 mi round trip, which is right for a climb guidebooks put at
> 12.5–14 mi; 19.3 km would render as 12 mi one-way and **24 mi round trip**, nearly double
> the real thing. `dist_km` on the surviving row is 9.2 and should stay there. I changed it
> to 19.3 at one point — that introduced the error rather than fixing one, and it has since
> been set back.

### Done: the merge (applied)

`scripts/adams-merge-south.mjs` copied across the 18 fields `south_climb` was missing and
unioned the two array fields. Verified: **20 fields now populated**, hazards 3 → 5, gear
3 → 7, with `dist_km` 19.3 and the 166-point track untouched.

It only fills empty fields and never overwrites, so it cannot lose the keeper's content, and
it is safe to re-run. **Waypoints were deliberately not merged** — `south_spur`'s five were
built against its own 5-point track, and dropping them onto a different 166-point GPX risks
markers that sit off the line.

### Left for a human: the deletes

`adams-dedup.sql` removes `south_spur` and `south_side` and recomputes the area's
`route_count` (12 → 10). It opens with a SELECT of the three rows so they can be eyeballed
first. Deliberately not run automatically — a wrong DELETE in this table destroyed Triple
Couloirs once already.

## Correction: the Northwest Ridge pair is NOT a duplicate

The existing dedup list flags `adams_northwest_ridge` against
`wa_mount_adams_northwest_ridge`. That is wrong — these are two different climbs:

- **Northwest Ridge** — mellow to start, ramping to 40–45° snow.
- **North Face of Northwest Ridge** — 2,000–2,500 ft of sustained 45° snow and ice, usually
  inaccessible at its base thanks to a large bergschrund, so parties climb the Adams Glacier
  and traverse in after crossing crevasses on its west side.

Deleting either would lose a real route. Both stay.

What *is* wrong is the naming: `adams_northwest_ridge` is called
"Northwest Ridge (North Face of Northwest Ridge)", a compound of both names sitting right
next to a sibling called plain "Northwest Ridge". Its 3 pitches and 8 km suggest it is the
North Face variation, but that is inference — I did not rename it, because mislabelling a
route is worse than an awkward label. Someone with the Beckey guide should decide.

## Also checked

`adams_avalanche_glacier` still uses the old id convention, but no `wa_mount_adams_avalanche_glacier`
exists any more, so that pair from the dedup list is already resolved. It is a distinct
route (Avalanche Glacier) and should stay.

The `nh_*` rows that match "adams" — King Ravine, Madison Gulf, Adams Point — are New
Hampshire crags on a different Mount Adams. Correctly separate; nothing to do.
