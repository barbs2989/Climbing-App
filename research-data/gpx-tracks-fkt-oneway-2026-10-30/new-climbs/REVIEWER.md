# Reviewer instructions: NEW climbs from FKT summit tracks, 2026-10-30

The owner wants a summit route that FastestKnownTime has and our catalog lacks added as a new climb
("if they can be added as new climbs for the catalog, then add them"). We have FKT's permission to use
its tracks. **Never use or record an FKT time** (record pace, not a normal party's), and **nothing a
climber reads may name a source** (no "per SummitPost", no "FKT", no guidebook names).

The catalog has already been searched for each peak (by name across the whole province/state, and every
area within 3 km of the track's top): none holds this peak. If you learn the peak has ANOTHER NAME
(e.g. an Indigenous name, a former name, "X Mountain" vs "Mount X"), report it in `aliases` so it is
checked again; do not guess that it is new under that name.

For each item (one FKT track):
1. **Is it a CLIMB?** Read the FKT page (`fktUrl`) and at least one independent source on the peak's
   usual route (bivouac.com, SummitPost, Peakbagger, clubtread, Alpine Club of Canada, NPS/Parks
   Canada, trip reports, guidebook excerpts). If a site answers 403, use another; never get around a block.
   - ADD only when the line the track follows needs **Class 3 or harder scrambling, glacier travel,
     or technical (5th class / steep snow or ice) climbing**.
   - A walk-up or trail hike (Class 1-2, no glacier) is NOT added: `verdict: "walkup"`.
   - A multi-peak link-up, a road or a lift-assisted line: `verdict: "skip"`.
   - The FKT track must follow THAT route (same trailhead, same way up). If the track's line is not the
     route you would describe, `verdict: "skip"` and say why.
2. **For an ADD, write the climb in your own words.** Facts may come from sources; sentences may not:
   never repeat 8 or more consecutive words from any page you read. Use the field shapes in
   `example-row.json` (same keys; leave out what you cannot support; never invent a number).
   - `discipline`: `scrambling` (Class 3-4, unroped), `mountaineering` (glacier or steep snow, no 5th
     class), `alpine` (any 5th class rock or technical ice). Grade like the example: scrambling/
     mountaineering `grade` "3rd"/"4th" with `grade_system` "class"; alpine "5.x" with "yds".
   - `name`: the route's common name ("Southwest Ridge", "Standard Route via Abbot Pass").
   - `overview`, `beta`, `approach`, `descent_text`, `best_season`, `season` (a short window like
     "July-September"), `rock_grade` (a short phrase), `hazards` (array of short strings), `gear` (array),
     `outing_shape` ("outback" for up-and-down the same way, "loop" for a loop).
   - `high_point_ft` = the summit elevation; `gain_ft` only if a source states it.
3. **The peak area.** `name`, `lat`/`lng` (the summit, from a source; the track's top `trackTop` should
   be within ~150 m — say if not), `elevation_ft`, `prominence_ft` if stated, a 1-2 sentence `blurb` in
   your own words, and `parent_id`: choose from `area-tree.txt` the area the peak belongs under (its
   park / range / region). Pick an area that is NOT itself a crag holding routes (type `crag` with
   routes>0 is a leaf); a `region` is right. If nothing in the tree fits, say so in `parentNote`.
4. **Trailhead**: name the trailhead the track starts at and whether a source puts it there.

Output a JSON array, one entry per item:
`{"slug", "verdict": "add"|"walkup"|"skip", "reason": "one sentence, your own words", "aliases": [],
  "area": {...}|null, "route": {...}|null, "parentNote": null|"...", "trailhead": "<name>"|null,
  "trailheadConfirmed": bool, "sources": ["urls you actually opened"]}`
