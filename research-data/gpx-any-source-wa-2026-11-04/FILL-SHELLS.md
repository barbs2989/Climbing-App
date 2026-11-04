# Brief: research and fill an EMPTY route record (WA, 2026-11-04)

Some routes in our catalog are empty shells: a name on a peak and nothing else. The owner asked to
research and fill them. You research the routes you are given and write one JSON file per route.
**You write nothing to any database and edit no other file.** Paths are relative to
`C:\Users\nate_\dev\wt-gpx-any-source-wa`.

Read `research-data/gpx-any-source-wa-2026-11-04/BRIEF.md` first: the owner's rules (same route,
summited, in season, trailhead confirmed by research, our own unique wording, no sources/people named)
and the Files section (unique helper-script names only). Your peak's packet is
`research-data/gpx-any-source-wa-2026-11-04/packets/<area_id>.json`: `allRoutesOnPeak` (every route we
hold there), `routes[]` (stored text of the routes that need tracks), and `tracks[]` (Peakbagger ascents
with logged route, stats, trip report, track). House style of a complete row:
`scripts/oneoff/data/wa-fkt-gap-climbs.json` -> `routes[0]`.

## First question: is this a real, distinct route?

Search the web (Mountaineers routes-places, WTA, SummitPost via search results, guidebook-derived pages,
USFS). Decide one of:
- `real`: a named route that exists on THIS peak and is not the same line as another route in
  `allRoutesOnPeak` (if it duplicates one, say `duplicate_of` and fill nothing);
- `unconfirmed`: you could not establish it exists. Fill nothing; explain what you searched.

## If real: research the row

Grade (class for walk-ups/scrambles, YDS for roped rock), discipline, season, approach (trailhead name +
coordinate confirmed from a fetched official/mapped page: USFS/NPS/WTA/OSM Nominatim
`https://nominatim.openstreetmap.org/search?format=json&q=...`), the climb, descent, hazards, gear,
passes. Guidebooks win where sources disagree. Fresh wording only: no run of 6+ words from any page or
report, no source/site/book/person named. Seasonal facts name their months.
Discipline rule (database-enforced): `mountaineering` = non-technical walk-up only; `scrambling` is never
roped; any roped rock or 5.x = `alpine`.
Track: one packet track only if it is this route (logged route or report names/describes it), summited,
in season ±1 month, not a multi-peak link-up, starts within 300 m of the confirmed trailhead, reaches
within 300 m of the summit. Else `track_aid: null`.

## Output: `research-data/gpx-any-source-wa-2026-11-04/fill-shells/<route_id>.json`

```json
{
  "route_id": "...", "verdict": "real|unconfirmed|duplicate", "duplicate_of": null,
  "searched": ["queries / URLs and what each showed"],
  "evidence": ["URL — what it confirmed"],
  "track_aid": null, "track_why": "...",
  "fill": {
    "discipline": "...", "disciplines": ["..."], "grade": "...", "grade_system": "class|yds",
    "rock_grade": "...", "season": "Jul-Sep", "best_season": "...", "overview": "...", "beta": "...",
    "approach": "...", "descent_text": "...", "turnaround": "...", "bail": "...", "high_point_ft": 0,
    "outing_shape": "outback|loop", "gear": ["..."], "what_to_bring": ["..."], "hazards": ["..."],
    "obj_haz": ["..."], "watch_out": ["..."], "pro_tips": ["..."], "features": ["..."],
    "road": {"name": "...", "status": "open|seasonal", "driveNote": "..."},
    "access": {"land_manager": "...", "parking_pass": "..."},
    "waypoints": [{"type": "Trailhead", "name": "...", "lat": 0, "lng": 0}],
    "approach_logistics": {"trailhead": "...", "trailheadLat": 0, "trailheadLng": 0}
  }
}
```
No list item twice, and none repeating what the row or another field already says. Omit any field you could not research. Leave out gpx/elev_pts/gain_ft/dist_km/grade_num/timing. A
Summit pin already stored stays; add a Trailhead pin only with a confirmed coordinate. Return a 3-line
summary per route.
