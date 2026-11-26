# Trip profile research brief (2026-11-26)

You are filling in published TRAIL DISTANCES for the waypoints of climbing routes, so the app can show a
leg-by-leg "trip profile" (trailhead -> camp -> pass -> summit, with miles and feet for each leg).

## Input
A batch file `worklist/batch-NNN.json`: an array of routes. Each has `id`, `name`, `where` (area > peak),
`discipline`, `grade`, and `waypoints`: `[{ i, type, name, elev, distMi }]` (elev in FEET, distMi in MILES
from the trailhead; null = unknown).

## The job
For every waypoint whose `distMi` is null (skip Trailhead waypoints: a trailhead is 0 by definition), find
the published trail distance FROM THE ROUTE'S TRAILHEAD to that waypoint, one way, along this route's normal
approach, in MILES. Also find `elev` (feet) for any waypoint whose elev is null.

- Use published sources: guidebook text, land agency pages (USFS, NPS, BLM, Parks Canada, BC Parks),
  Washington Trails Association, The Mountaineers, Peakbagger, SummitPost, Bivouac.com, Mountain Project,
  trip reports on CascadeClimbers / NWHikers / personal blogs that state mileages. Use web search freely.
- Prefer TWO independent sources that agree (within ~10%). One clear source is acceptable. If the sources
  disagree, prefer a guidebook or agency figure and note the disagreement.
- Distances are CUMULATIVE from the trailhead. If a source gives leg distances (TH to lake 4 mi, lake to col
  1.5 mi) add them. If a source gives a round trip, halve it and say so in `note`.
- NEVER estimate from a map, a straight line, or your own arithmetic beyond adding stated legs / halving a
  stated round trip. If nothing published states the distance, leave it out. A blank is fine; a guess is not.
- The trailhead in the waypoint list is the one to measure from. If sources describe a different trailhead
  for this route, leave the distance out and say so in `note`.
- Heights: a published elevation for that named point (summit elevations from Peakbagger/USGS are fine).
- Do not change names, types, coordinates, or any other field. Do not edit any file except your results file.
  Do not touch any database.

## Output
Write `results/batch-NNN.json` (same NNN) as a JSON array, one entry per route in the batch:
```json
[{ "id": "wa_example", "waypoints": [
   { "i": 3, "name": "<exact stored name>", "distMi": 5.2, "elev": 6100,
     "sources": ["https://...", "https://..."], "note": "WTA 5.2 mi; guidebook 5 mi" }
 ], "unresolved": "what you could not find, briefly" }]
```
Include only waypoints you found something for (`distMi` and/or `elev`; omit a key you did not find).
`name` must be copied exactly from the input. `sources` are full URLs you actually read. Then reply with a
3-line summary: routes covered, waypoints filled, anything odd.
