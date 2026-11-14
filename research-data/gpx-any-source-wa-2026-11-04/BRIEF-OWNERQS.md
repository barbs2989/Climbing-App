# Brief: deep research on the open owner questions (WA, 2026-11-04)

The owner asked for deep online research on every open question from the WA track/facts pass, so they
can decide (or so we can act where research settles it). **You write nothing to any database, run no
script that touches Supabase, and edit no file except your own output file(s).** Paths are relative
to `C:\Users\nate_\dev\wt-gpx-any-source-wa`.

## What you have
- `research-data/gpx-any-source-wa-2026-11-04/packets-all/<area_id>.json` (or `packets/`, `packets-w3/`,
  `packets-sp/` — use whichever exists): `allRoutesOnPeak` = every route we hold on that peak with its
  stored text, `routes[]`, and `tracks[]` (logged ascents: logged route name, date, trip report, track).
- `research-data/gpx-any-source-wa-2026-11-04/holds.json`, `dupes-read.json`, `same-climb-read.json`,
  `missing-route-claims.txt`, `fill-shells/*.json` — what earlier passes found and why each item was held.
  Read the entries for your questions first, so you do not redo what was already established; your job
  is to go DEEPER than they did.

## How to research
Search widely, and fetch the pages: Mountaineers routes-places, WTA trip reports + hike pages,
SummitPost (route pages, climbers' logs), Mountain Project, Peakbagger, CascadeClimbers / NWHikers
trip reports and forums, AAJ (publications.americanalpineclub.org), USFS/NPS pages, OSM Nominatim
(`https://nominatim.openstreetmap.org/search?format=json&q=...`) for coordinates, and guidebook-derived
pages (Beckey's Cascade Alpine Guide is the authority; archive.org may hold scans). Guidebooks win
where sources disagree; for elevations, the most recent source wins. Try several spellings and
alternate route names. Record every query and what it showed, including dead ends.

## Owner rules that bind any recommendation
- A route row is one climb on one peak; two rows that are one climb should become one (say which to
  keep and why). Different first ascents or a named variant that leaves the line = distinct.
- Discipline: `mountaineering` = non-technical walk-up only; `scrambling` is never roped; any roped
  rock or 5.x = `alpine`.
- No source, site, book or person is ever named in text meant for the app. Any wording you propose is
  your own (no run of 6+ words from a page).
- The route map line is a recorded track or nothing. A Trailhead pin needs a coordinate confirmed by a
  fetched official/mapped page.
- Seasonal facts name their months.

## Output
One JSON file per question at `research-data/gpx-any-source-wa-2026-11-04/owner-qs/<key>.json`:
```json
{ "key": "...", "question": "the question in one sentence",
  "answer": "what the research shows, plainly",
  "recommendation": "the concrete action: merge X into Y / keep both / fill row Z with ... / add route ... / move pin to lat,lng / no change",
  "confidence": "high|medium|low",
  "proposed": { "optional: field values or pin coordinates to write, in our own words" },
  "evidence": ["URL — what it confirmed"],
  "searched": ["query or URL — what it showed"] }
```
Return to the parent a 2-3 line summary per question: answer, recommendation, confidence.
