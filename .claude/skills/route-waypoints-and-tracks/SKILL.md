---
name: route-waypoints-and-tracks
description: Place ClimbMatch route waypoints on the exact map spot (summit, trailhead parking, junctions, water, camps, base of climb) and decide which GPX tracks are usable and complete trailhead-to-summit. Use when adding or checking pins or tracks on any route, any state.
---

# Waypoints and tracks: exact pins, honest lines

> **DRAFT (2026-11-14), decided with the owner.** Part of the `route-research` system: a pin
> or track fact locks under that skill's ledger rules. Existing guards and their history:
> `docs/guards/waypoints-and-tracks.md`; map behaviour: `docs/features/route-page.md`.

## Tracks

### Usable sources (store and show)
1. **The app's own climber recordings** (trip-report GPX, *Add a track*, approved
   submissions) — best source; it grows as climbers log.
2. **USFS / NPS trail lines** — public domain; end where the maintained trail ends.
3. **OpenStreetMap** trails and climbers' paths — credit "© OpenStreetMap contributors".

**Not usable — and agents do not even open them to compare:** AllTrails, Gaia GPS, CalTopo,
Strava, Wikiloc, Peakbagger tracks, Mountain Project / Hiking Project.

### What may be drawn
- A **recorded track** draws as today (ascent blue, descent orange). It must: have ≥10 points
  with timestamps, reach within 300 m of the summit pin, start within **200 m** of the
  trailhead (parking) pin, have no gap over 500 m, and agree with the USGS elevation model.
  **An ascent-only recording that reaches the summit counts as complete.**
- With no recording, the **approach may be drawn from USFS/NPS/OSM trail lines**, in its own
  style and labelled *mapped trail*. The off-trail upper part stays blank until a climber
  records it. Never draw a line from the pins, never move track points onto pins.

## Waypoints

A pin locks when **two placement methods agree within 50 m**, and (if a track exists) it
sits within 50 m of the track. Elevation comes from official data, never a website.

| pin type | placed at | second check |
|---|---|---|
| `Summit` | the **USGS official summit point, exactly** (not moved to the DEM high point); elevation = USGS published figure | the route's summit named in a source; track reaches it |
| `Trailhead` | the **parking lot** (the *Drive here* button's target), from an OSM parking/trailhead node | USFS / recreation.gov trailhead point |
| `Junction` | the exact OSM node where the two mapped trails meet | the junction named in the route text |
| `Water` | where the named creek crosses the track, or the lake shore nearest it (`scripts/oneoff/add-water-pins.mjs`) | named in the route text |
| `Campsite` | OSM / USFS designated site, or the named lake / meadow feature | named in a source |
| `Base` (start of climbing) | the mapped feature a source names (col, notch, glacier edge, end of trail); crags use the base check-in consensus | named in a source |
| `Hazard`, `Topout` | only on a named, mappable feature | named in a source |

**Every WA alpine route aims for:** Trailhead, Summit, every trail Junction, Water, Camps,
Base. Missing ones stay missing until a real placement exists.

**Vague description ("a gully on the left after the lake") → no pin.** Keep it in the text.

Types are exactly: `Trailhead`, `Junction`, `Water`, `Campsite`, `Summit`, `Topout`,
`Hazard`, `Base` — at most one Trailhead and one Summit per route.

## Checks to run after any pin or track change
`audit:waypoints`, `audit:waypoint-distances`, `audit:waypoint-geometry`, `audit:water-pins`,
`check:track-caveat`, `check:gpx-caveats`.
