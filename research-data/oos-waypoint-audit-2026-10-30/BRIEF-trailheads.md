# Out-of-state waypoint audit, 2026-10-30: trailhead batch brief

Owner note: "Way points markers are still way off for many routes. Start with just researching
trailhead location and audit the map. Do summit then do each 1 by 1 in smaller batches to assure
quality." Washington was done earlier today (#3083, #3088). This pass covers every route OUTSIDE
Washington that has waypoints. The general rules are the WA brief's:
`research-data/wa-waypoint-audit-2026-10-30/BRIEF.md` (read it: ops, output format, the
never-compute-a-coordinate rule). **Do not touch the database.** Reads come only from the files and
the web.

Your input is `research-data/oos-waypoint-audit-2026-10-30/trailheads-<N>.json`. Each entry is one
distinct stored trailhead coordinate:
`{lat, lng, state, ground_ft, pins:[{id, i, name, elev}], route_names, text}`.
`text` is the route's driving directions (`approach_logistics`), which tell you which trailhead
it means. `ground_ft` is USGS 3DEP at the stored coordinate. It is null in Canada, where 3DEP does
not reach.

For EACH entry:
1. Identify the trailhead from its name and the directions. Then find its PUBLISHED coordinate.
   Good sources:
   - USFS recreation-site pages (fs.usda.gov `recarea`, which print Latitude/Longitude).
   - NPS pages and NPS "places" pages.
   - Recreation.gov, BLM, and state park pages.
   - Hiking-club and trail pages that print coordinates: SummitPost "Getting There", Peakbagger
     route pages, 14ers.com trailhead pages (they print the trailhead lat/long), Oregon Hikers
     Field Guide, hikingproject.com, AllTrails trailhead coordinates.
   - Canada: BC Parks, Parks Canada, ACC hut pages, bivouac.com.
   - OpenStreetMap: a node tagged `highway=trailhead`, or a named parking lot. Query it with
     `curl -s 'https://nominatim.openstreetmap.org/search?q=<name>&format=json&limit=5' -A 'climbmatch-audit'`,
     or with Overpass. OSM counts as a published coordinate; quote the node/way id.
   Use two sources when you can.
2. Measure the stored coordinate's distance from the published one (haversine):
   - Within 150 m: `none`. Put the published coordinate and the distance in `reason`.
   - Further off and clearly the same trailhead: `move` to the published coordinate, with `source`
     and `quote`. Check the 3DEP ground there
     (`curl -s "https://epqs.nationalmap.gov/v1/json?x=<lng>&y=<lat>&units=Feet&wkid=4326"`)
     against the pin's `elev`. It must be within 300 ft, or say why. Give one decision entry PER
     PIN (route id + pin index), each with `from` = the stored [lat, lng] and `name` copied exactly.
   - If the published point is the DESTINATION or a trail junction, not the parking, do not use it.
     (Some sites' "geo" points sit on the summit or a lake.) Probe the ground: a trailhead is on a
     road.
   - Winter, washout and road-closure parking, climbers' pullouts, and other spots no source
     publishes: `none` with "no published coordinate". Do the same when the route text means a
     different spot from the one the published coordinate marks.
   - No source found in reasonable time: `none`, with "unverified" in `reason`.
3. Spend at most about 3 searches per trailhead, and reuse what you find across entries.

Output `research-data/oos-waypoint-audit-2026-10-30/decisions-T<N>.json`, an array of decision
entries in the WA BRIEF.md format. Give one `none` entry per distinct coordinate, using the first
pin's id and i plus `"coordinate_key": "lat,lng"`. Every `move` needs one entry PER PIN.

Reply in at most 15 lines:
- counts: verified within 150 m / moved / unpublished / unverified;
- a table of the moves only, with the distance moved.
