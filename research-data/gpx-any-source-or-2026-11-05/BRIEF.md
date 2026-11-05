# Research brief: Peakbagger tracks, seasons, pins and trip-report facts (Oregon, 2026-11-05)

You are researching for ClimbMatch, a climbing app. The owner licenses Peakbagger and SummitPost.
For each peak you are given, read its packet and write ONE verdict file. **You write nothing to any
database and edit no other file.** A later script applies only what your verdict supports.

Inputs: `research-data/gpx-any-source-or-2026-11-05/packets/<area_id>.json` (paths are relative to
`C:\Users\nate_\dev\wt-gpx-any-source-or`). A packet holds:
- `routes[]`: OUR routes on this peak as stored (name, discipline, grade, face, aspect, season,
  best_season, approach/descent/overview text, waypoints with type Trailhead/Summit/..., and
  `trackChecks[]`: for each harvested track, mechanical distances in metres — `startThM` (track start
  to our nearest Trailhead pin), `endThM`, `summitM` (closest the track comes to our Summit pin),
  `complete`/`oneway` (passes the 300 m rule), `summited` (Peakbagger logged a successful summit),
  plus `pinEvidence`).
- `peakbagger`: the matched Peakbagger peak, its surveyed coordinate and elevation info.
- `ascentMonthsAllRoutes` / `ascentMonthsByLoggedRoute`: month -> count of SUCCESSFUL logged ascents.
- `tracks[]`: each harvested ascent: `aid`, `date`, `loggedRoute` (the climber's own route name),
  `stats` ([section, key, value] rows: Ascent Type, gain, distance, route conditions, gear, start
  trailhead elevation...), track `start`/`end`/`highest`/`shape` ([lat,lng,eleMetres]), GPX
  `gpxWaypoints`, and `tripReport` text.
Packets have long lines; if Read truncates, use `node -e` to print what you need, e.g.
`node -e "const p=require('./research-data/.../packets/X.json'); console.log(p.tracks.find(t=>t.aid==='123').tripReport)"`.

## The owner's rules (all binding)

1. **Same route on the same peak.** A track may be assigned to one of our routes only if the
   evidence shows it climbs THAT route: the logged route name, the trip report's description, and the
   track's line (which face/ridge/couloir it ascends, where it leaves the trail) agree with our
   route's own text and pins. On formations with many technical routes (e.g. Smith Rock-style formations, the Limpy Rocks, Rabbit Ears or the
   Menagerie spires) the approach and summit are shared, so passing the pins proves nothing: the logged
   route / trip report must name our route (or an unambiguous synonym). If unsure, verdict `unsure`.
   Never assign one track to two different climbing routes unless they genuinely share the line.
2. **The person summited.** Only tracks with `summited: true` (Ascent Type "Successful Summit
   Attained") and that reach our summit (or Peakbagger's summit coordinate) within ~300 m.
3. **Season first.** Research when THIS route is typically climbed: use `ascentMonthsByLoggedRoute`
   for this route's name(s), the all-routes histogram, the route's discipline (snow/glacier vs rock),
   the stored season/best_season, and web research (guidebook-derived pages, NPS/USFS, Mountaineers,
   Oregon Hikers field guide, USFS/Deschutes/Willamette/Wallowa-Whitman NF pages, SummitPost). Guidebooks win where sources disagree. Then **use only ascents IN that season or
   within about one month of it** — for tracks AND for facts. Off-season ascents are dropped.
4. **Pins.** If a good track fails only because OUR pin is wrong, propose a fix:
   - Summit: move only when Peakbagger's surveyed coordinate and the tracks' highest points agree
     (within ~100 m) and ours is clearly off.
   - Trailhead: the recordings only NOMINATE a spot. You must CONFIRM by research that the named
     trailhead (as our route text names it, or as the guidebook/USFS/Oregon Hikers names it) is at that location:
     find its coordinate from an official or mapped source (USFS/NPS page, Oregon Hikers field-guide page, OpenStreetMap
     via https://nominatim.openstreetmap.org/search?format=json&q=... ). Give the confirmed coordinate
     and say where it came from in `evidence`. If you cannot confirm it, do not propose the move.
   - A route with NO trailhead pin whose round-trip tracks share a start: propose `add` only with the
     same confirmation.
5. **Facts from trip reports (in-season only), in OUR OWN UNIQUE WORDING.** Extract specific, useful,
   route-level facts our stored text lacks: hazards, route-finding cues, water, snow/ice conditions by
   month, gear actually needed by month, road/trailhead conditions, where people camp, descent tips,
   typical gain and distance. Rules:
   - Every fact that depends on time of year names its month(s) or season ("in early July...", "by
     late August..."). Never state a seasonal condition as year-round.
   - Write fresh sentences. Do NOT copy any run of 6+ words from a trip report; do not imitate its
     phrasing. No names of climbers, sites, books or sources; no "according to", no "trip reports say".
   - Only facts at least one in-season report states plainly; prefer facts two reports agree on. Note
     the supporting `aids`. Skip anything that contradicts our stored text unless you explain why ours
     is wrong.
   - Allowed targets: `watch_out` (short hazard phrases), `pro_tips` (one-sentence tips),
     `what_to_bring` (short gear phrases, seasonal qualifier in parentheses), `monthBreakdown`
     (one sentence for a given month), `approach_note` / `descent_note` (one or two sentences to add).
     Keep list items short (under ~120 characters). Do not repeat what the route already says.
   - Never use a party's elapsed time as a time estimate.

## Missing routes

`routes[]` holds only the routes that still NEED a track. `allRoutesOnPeak` lists every route we hold
on the peak. Before you call a route "missing", check it is not in `allRoutesOnPeak` under any name
(wave 1 reported five "missing" standard routes that were all stored, with tracks).

## Files

Write ONLY your own peaks' verdict files. Other agents run at the same time: never run, reuse or
overwrite a script you did not write this session, and give any helper script a unique name that
includes your first area_id (e.g. `verdicts/.tmp-or_mt_jefferson.js`), and delete it when done. Never
write to `$TEMP/w.js` or any shared generic name.

## Required, not optional

- **Web research is REQUIRED.** For every route: at least one WebSearch for when it is climbed (e.g.
  `"<peak> <route name>" season OR "best time"`, Mazamas, Oregon Hikers, USFS, guidebook-derived pages),
  and record in `season.evidence` what you found and where. For every trailhead pin you propose, the
  confirmed coordinate must come from a fetched page (`confirmedBy` = its URL).
- **Identity needs POSITIVE evidence.** `verdict: "same"` requires the logged route name or the trip
  report to name or unmistakably describe OUR route (its face/ridge/couloir), AND the line to agree.
  "It is probably the standard line" is `unsure`, never `same` — unless our catalog has exactly one
  route on the peak and the track follows that route's described line (say so in `why`).

## Output

Write `research-data/gpx-any-source-or-2026-11-05/verdicts/<area_id>.json`:

```json
{
  "area_id": "...",
  "routes": [
    {
      "route_id": "...",
      "season": { "months": [7,8,9], "window": "Jul-Sep", "evidence": "short: what decided it" },
      "track": { "aid": "123", "verdict": "same", "kind": "complete|oneway", "inSeason": true,
                 "why": "logged route + line + report agree that ..." },
      "otherTracksConsidered": [ { "aid": "456", "verdict": "different|unsure|offseason|not-summited", "why": "..." } ],
      "pins": [ { "type": "Summit|Trailhead", "action": "move|add", "lat": 0, "lng": 0, "name": "...",
                  "evidence": "...", "confirmedBy": "URL or source of the confirmed coordinate" } ],
      "facts": [ { "field": "watch_out|pro_tips|what_to_bring|monthBreakdown|approach_note|descent_note",
                   "month": 7, "text": "our own words", "aids": ["123"] } ]
    }
  ],
  "notes": "anything the owner should know (e.g. a route that seems misfiled on this peak)"
}
```
Set `track` to null when no track qualifies. Choose the best qualifying track per route: same route,
in season, summited, complete round trip over one-way, then the denser/more recent one. Include every
route of the packet. Return a 3-line summary when done: peaks done, tracks assigned, pins proposed.

## No duplicates (owner, 2026-11-04)
- Never propose a fact that the route already says (in watch_out, pro_tips, what_to_bring, approach,
  descent_text or seasonal_guidance), even in other words. Read the stored row in the packet first.
- One Peakbagger ascent goes to ONE route. If the same ascent fits two of our routes, those routes may be
  one line filed twice: say so in `notes` and pick neither.
- A pin you add must not repeat a pin already stored (same type within 50 m, or same name).
- A "missing route" is only missing after you checked every route in `allRoutesOnPeak` under every
  spelling and alias.


## Oregon specifics
- Many Oregon packets are CRAG-like areas (Menagerie spires, Limpy Rocks, Wallowa granite crags) with
  single- or few-pitch climbs filed as alpine. Peakbagger may hold NO record for them; then write a verdict
  with `track: null` per route and still record the season research. Do not invent tracks for crags.
- Mount Hood areas `or_north_side`, `or_south_side`, `or_east_side_2` were all matched to the one Mount Hood
  Peakbagger record: the logged route name (Hogsback/Pearly Gates/Old Chute, Sunshine, Cooper Spur, Newton
  Clark, West Crater Rim, Leuthold...) decides which of our routes a track is, never the shared summit.
- `or_ice_lake_peaks` was searched as Matterhorn, `or_aneroid_lake_peaks` as Pete's Point,
  `or_wallowa_mountains_traverses` as Krag Peak: check the Peakbagger match is the peak our route climbs.

## Missing peaks and routes (owner, 2026-11-05: "if you find peaks or routes that we don't have, add them")
If the logged ascents or your research show a commonly climbed route on your peak that is NOT in
`allRoutesOnPeak` under any name or alias, list it in a top-level `missing` array. Do not add anything
yourself; the parent checks the whole Oregon catalog under every spelling before inserting.
```json
"missing": [ { "kind": "route|peak", "peak": "...", "name": "the usual name", "alt_names": ["..."],
  "discipline": "alpine|mountaineering|scrambling", "grade": "e.g. Class 3 / 5.4 / AI2",
  "face": "N|NE|...", "season": "Jul-Sep", "overview": "two or three sentences in OUR OWN words",
  "loggedAscents": 12, "aids": ["best in-season summited GPS ascent of this line, if any"],
  "evidence": ["URL — what it confirmed"] } ]
```
Only lines with real evidence (logged ascents naming it, plus at least one fetched page describing it).
