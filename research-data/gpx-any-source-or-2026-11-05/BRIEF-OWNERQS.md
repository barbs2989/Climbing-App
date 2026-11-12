# Brief: deep research on the open owner questions (OR, 2026-11-05)

The owner asked for deep online research on every open question from the Oregon track/facts pass, so they
can decide (or so we can act where research settles it). **You write nothing to any database, run no
script that touches Supabase, and edit no file except your own output file(s).** Paths are relative
to `C:\Users\nate_\dev\wt-gpx-any-source-or`.

## What you have
- `research-data/gpx-any-source-or-2026-11-05/owner-qs/QUESTIONS.md`: every question, with where to start. Read its header first.
- `owner-qs/catalog-or-mountains.json`: every mountain route we hold in Oregon. A route is only missing if it is absent there under every spelling.
- `packets/<area_id>.json`: `allRoutesOnPeak` (stored text of every route on that area), `routes[]`, `tracks[]` (logged Peakbagger ascents with trip reports).
- `verdicts-frozen/<area_id>.json`: what the track research found (`notes`, `missing`, season evidence).
- `dupes/pairs.json` + `dupes/verdicts/`: the duplicate-pair research (stored rows only, NOT web-researched: go deeper).

## How to research
Search widely, and fetch the pages: Oregon Hikers field guide + trip reports, Mazamas,
SummitPost (route pages, climbers' logs), Mountain Project, Peakbagger, CascadeClimbers / NWHikers / Oregon Hikers forum
trip reports and forums, AAJ (publications.americanalpineclub.org), USFS/NPS pages, OSM Nominatim
(`https://nominatim.openstreetmap.org/search?format=json&q=...`) for coordinates, and guidebook-derived
pages (Smoot's and Bond's Oregon climbing guides and Beckey's Cascade Alpine Guide are the authorities; archive.org may hold scans). Guidebooks win
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
One JSON file per question at `research-data/gpx-any-source-or-2026-11-05/owner-qs/<key>.json`:
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
