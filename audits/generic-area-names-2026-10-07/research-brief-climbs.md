# Research brief: put each climb in its real, specifically named area

You are helping restructure a climbing app's area tree (USA/Canada; data originally from a large climbing
database export). Some areas are named only by discipline or as a catch-all — "Bouldering", "Other Climbs",
"Misc", "Routes", "Boulders, The", "Ice", "Other problems". The owner: "these are too generic. The climbs
need to be in specific named areas." Your job: for each such GENERIC AREA, find where each of its climbs
really is.

Input: a JSON file (path given in your task) — an array of packets. Each packet has:
- `generic_area` (id, name, breadcrumb, coords),
- `parent` (the named place it sits under),
- `sibling_areas` — the parent's OTHER sub-areas (id, name, coords, climb count, sub_areas). These are the
  real named walls / boulders / sectors the climbs might belong to,
- `climbs` (id, name, grade, discipline, FA, coords, location, description — often empty).

For EACH climb decide its target:
- `{"existing": "<sibling area id>"}` — it is on that named wall/boulder/sector. Many are clear from the
  climb's name or description ("Route 1 Lower Wall" → Lower Wall), others need a lookup.
- `{"new_area": "<real name>"}` — it is on a specific named feature that has no area yet (e.g. a boulder
  or wall the climbing community names). Use the REAL name used by climbers/guidebooks — never invent one.
  Several climbs may share one new_area name (spell it identically).
- `"unknown"` — you could not establish it with evidence. That is an acceptable answer; a wrong placement
  is worse than an unknown one.

Then, for the generic area itself, give `leaf_name`: if any climbs stay (unknown), the most specific REAL
name for the spot they are at — e.g. the name climbers use for that boulderfield, talus, or wall section
(it must say WHERE, never only a discipline word like "Bouldering"/"Misc"/"Other"). If nothing specific
can be established, use null and I will fall back to "<parent name> + the feature type".

Research: WebSearch / WebFetch the crag on climbing guide sites (the area page usually lists its walls and
boulders and each climb's page states its location), local climbing org pages, guidebook previews. Look up
the AREA page first — it often lists which climbs are on which boulder/wall in one fetch. Location facts
only; do not copy prose. Budget roughly 2–8 fetches per generic area.
- For a CATCH-ALL of roped climbs ("Other Climbs", "Other Routes", "Misc", "Roped", "Sport Routes") under a
  parent with named walls: open a few individual climb pages — the location note often says "left of X on
  the Main Wall" or "the first route on the Lower Tier". If the climbs are listed left-to-right in order and
  a sibling wall's climbs are interleaved, that is evidence too.
- Boulder problems at a crag whose siblings are cliffs/walls usually sit on boulders below the cliff. Do
  not force a problem onto a wall; if a source names the boulder, use `new_area` with that boulder's name.
- Search tip: search "<climb name>" "<crag name>" climbing; and the crag's page on several sites — a
  site that lists the crag by sector often places the climbs the first one did not.

MINIMUM EFFORT (required — the owner asked for deep research): for EVERY generic area make at least 3
distinct lookups (e.g. the crag's page on one site, the crag on a second site, and a search for two or three
of its climb names), and record them in a `searched` array on that area's output object (query or URL +
one word: "useful"/"empty"/"no-info"). An area with fewer than 3 recorded lookups is not finished. If a
climbing-database page fetches EMPTY, try its printable/mobile variant, WebSearch snippets, theCrag,
27crags, local climbing-coalition pages and guidebook previews before giving up. Do not create a new area
from a name coincidence alone (a climb called X near a feature called X is not evidence).

Output: write a JSON array to the output path given in your task, one object per generic area:
`{"generic_area_id": "...", "leaf_name": "... or null", "leaf_name_evidence": "...", "climbs": [{"id": "...",
"name": "...", "target": {"existing": "..."} | {"new_area": "..."} | "unknown", "confidence": "high|medium",
"evidence": "one line + source URL"}]}`. Every climb must appear exactly once. Only use `existing` ids from
that packet's `sibling_areas`. Then reply with a 3-line summary (climbs placed / new areas / unknown).
