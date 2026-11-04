You are auditing climbing-route records (routes OUTSIDE Washington: other US states and Canada) for INTERNAL CONTRADICTIONS. Read-only job: no web access, do not modify any file except your own output file.

## The product
ClimbMatch's route page shows fields of ONE database row. The owner's requirement: **every field on the route page must agree with every other field.** Find every place where two fields (or two parts of one field) of the same route state incompatible things.

Each row in your batch files carries: header stats (`grade`, `rock_grade`, `ice_grade`, `alpine_grade`, `commitment`, `aid_grade`, `pitches`, `length_m` (metres), `gain_ft`, `dist_km`, `high_point_ft`, `season`, `aspect`, `fa`, `discipline`/`disciplines`), prose (`overview`, `beta`, `approach`, `descent`, `descent_text` — the page shows the LONGER of descent/descent_text, `rappels` (prose), `hazards`, `gear`, `permit`, `access`, `road`), and the area it is filed on (`area_name`, `area_type`, `area_elev` = peak elevation in the page header, `area_path`).

## Report these
- approach or descent text naming a DIFFERENT peak, crag, trailhead, road or state than the overview/area (copied from a sibling route)
- descent says walk-off/downclimb while `rappels`/descent_text says rappel (or vice versa) for the SAME line, with no "or" option framing
- rappel count/length or rope length in descent/rappels vs `rope_length_m` (e.g. "two 60 m rappels" with a single 50 m rope)
- pitch count stated in overview/beta/approach/descent for THIS line vs `pitches`; length in prose vs `length_m` (convert ft↔m; >30% off)
- grade stated in prose for THIS line vs `grade`/`rock_grade`/`ice_grade` (more than a letter grade apart); commitment numeral in `grade` vs `commitment`
- a 5.x grade on a route whose discipline is mountaineering or scrambling
- summit/peak elevation in prose vs `area_elev` (>250 ft) when the area is that peak; `high_point_ft` above the summit
- approach distance/gain/time in prose vs `dist_km`/`gain_ft` when clearly the same quantity (dist_km is ONE-WAY)
- season in `season` vs a season window stated in prose (a best window inside a wider season is fine)
- aspect vs a face named in prose, only when clearly the same face
- fa vs a first-ascent party/year in prose for THIS route (low priority)

## NOT contradictions
Rounding; "~" within ~10%; a range containing the other value; two options both offered; history framed as history; missing data; high_point_ft equal to the base of the climb (settled convention on crags); a link-up/variation note mentioning a neighbouring route by name as a landmark.

## Output
Write ONE JSON file to the output path in your task message:
```
{"batches": [...], "routes_read": <int>, "routes": [
  {"id": "...", "name": "...", "area": "<area_id>",
   "contradictions": [
     {"fact": "...", "severity": "high|medium|low",
      "claims": [ {"field": "exact column, e.g. descent", "says": "short VERBATIM quote"} ],
      "why": "one sentence",
      "internal_resolution": "which claim the row itself shows is right, or null",
      "needs_research": true|false } ] } ]}
```
To keep the file small, list in `routes` ONLY routes with at least one contradiction, but set `routes_read` to the exact number of rows you read and add `"ids_read": [every id you read]`. Quote values exactly. Be precise; do not report style.
