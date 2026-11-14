# WA waypoint location audit, 2026-10-30: research brief

The app (ClimbMatch) shows a route map with pins: Trailhead, Junction, Camp, Water, Hazard,
Summit and so on. Each pin in `routes.waypoints` is `{lat, lng, elev, name, type, note, distMi, ...}`.
`distMi` is the trail distance from the trailhead (pin 0) to this pin. The audits flagged the pins
below as **contradicting themselves**: a coordinate whose ground height is far from its stated
`elev`, a stored distance shorter than the straight line between two pins, or a summit pin far
from the peak's own coordinate. Your job is to decide, pin by pin, **which half is wrong** and what
to write, using real published evidence.

Context per route: `research-data/wa-waypoint-audit-2026-10-30/context/<route_id>.json`. Each file
has every pin with `ground_ft` (USGS 3DEP at the stored coordinate), the route's area row (peak
coordinate and elevation, plus `ground_ft` under it), `dist_km` and `approach_logistics`. **Do not
touch the database.** Reads only from the files and the web.

## Tools you may use (all public, no keys)
- **USGS GNIS** (names and coordinates):
  `curl -s "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/5/query?where=gaz_name%3D%27Luna%20Pass%27%20AND%20state_alpha%3D%27WA%27&outFields=gaz_id,gaz_name,gaz_featureclass&returnGeometry=true&outSR=4326&f=json"`
  Layer 5 = landforms (summits, passes, gaps); layer 7 = lakes and other water; layer 6 = streams and
  falls. Use `gaz_name LIKE '%Spectre%'` to search. Layer 5 returns `geometry.points[0] = [lng, lat]`.
- **USGS 3DEP ground height**: `curl -s "https://epqs.nationalmap.gov/v1/json?x=<lng>&y=<lat>&units=Feet&wkid=4326"`.
  A summit is a local maximum. Probe about 70 m around a candidate to check that.
- Web search and fetch: WTA (wta.org hike pages give trail mileage and trailhead elevation), USFS,
  NPS, Wikipedia, Peakbagger, SummitPost, Mountain Project, guidebooks. Commercial peak sites often
  answer 403 to fetches. If so, say so and use another source.

## Rules (the owner's, binding)
- **Never invent or compute a coordinate.** A `move` must take a coordinate PUBLISHED by a source
  (GNIS feature id, NPS/USFS data, Peakbagger, a guidebook's stated coordinate, WTA's trailhead
  coordinate), and give its `source` URL and a verbatim `quote` (or the GNIS gaz_id). No midpoints,
  no "about 300 m north of", and no placement read off a map by eye.
- If the coordinate is wrong and nothing publishes the right one, the op is `clear`. The pin stays
  listed on the page, with no map dot. Never clear a Trailhead or a Summit; use `none` for those.
- If the coordinate is right and the stated `elev` is wrong: `setElev` with a published height, or
  `nullElev` when there is none.
- For a distance contradiction: `setDist` needs a published mileage (source plus quote), and the
  value is the CUMULATIVE distance from that route's trailhead (pin 0). Otherwise use `nullDist`.
  `nullDist` is right when both pins are verified correct and the stored mileage is what's wrong.
- For a PEAK's own coordinate (the `areas` row), use op `areaMove`, with a published summit
  coordinate (GNIS Summit preferred), and confirm with 3DEP that it is a local maximum within about
  250 ft of the published elevation.
- Guidebooks are the source of truth, and the most recent elevation source wins. Confirm a fact with
  2 independent sources where they exist; record any disagreement.
- `none` is a valid answer, with a reason: a genuinely two-summit peak, a traverse visiting several
  summits, a descent-finish trailhead that really is a second trailhead, and so on. Many audit hits
  are NOT defects. Say so when that's the case.
- Sources go in this research file only, never into app text.

## Output
Write `research-data/wa-waypoint-audit-2026-10-30/decisions-<LETTER>.json`, an array of:
```json
{ "id": "wa_route_id", "i": 3, "name": "exact pin name as stored", "from": [lat, lng] ,
  "op": "move|clear|setElev|nullElev|setDist|nullDist|areaMove|none",
  "to": [lat, lng], "elev": 1234, "distMi": 2.3,
  "area_id": "wa_x (areaMove only)",
  "source": "url or GNIS gaz_id", "quote": "verbatim text supporting the value",
  "second_source": "url", "ground_ft_at_to": 1234,
  "reason": "one or two sentences: which half was wrong and why" }
```
Use one entry per pin changed. A pin can carry two ops (for example `move` plus `setElev`); give
them as two entries. Copy `name` and `from` exactly from the context file, because the apply script
refuses any mismatch. Then reply with a short summary table: route, pin, op, and the one-line reason.
