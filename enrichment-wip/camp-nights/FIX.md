# Camp nights FIX PASS

Read BRIEF.md first: every rule there applies. This pass re-researches routes the first pass could
not settle. Each entry in `fix-input/fN.json` is the original input plus `refused_because` (why the
applier refused it) and `previous_research` (the first pass's answer, often low confidence).

Your job per route: research harder than the first pass and either settle it or say honestly that
it cannot be settled.

- Search differently from the first pass: the APPROACH (trail name, valley, pass, basin) rather
  than the route; the neighbouring peaks that share the approach; Peakbagger trip logs; NWHikers;
  personal blogs (stephabegg, sverdina, lemkeclimbs, cloche-dor, turns-all-year, yellowleaf,
  climberkyle, alpinedave); NPS/USFS wilderness camp lists; AAJ reports for big walls.
  SummitPost, CascadeClimbers, WTA and Mountaineers 403 on fetch — use their search snippets only as
  leads.
- A night spent ON THE CLIMB (a wall ledge, a ridge bivy) is a valid camp: add it in `new_camps`
  with `"type": "bivy"`, a name that says where it is ("Ledge atop pitch 10", "Ridge crest bivy below
  the gendarme"), `elev_ft` if a source gives one (else null — allowed ONLY for a bivy on the climb itself; a lake, creek, meadow, basin, tarn or flat camp is NOT one and always needs a researched height).
- Any other new camp still needs a researched elevation (a map, an agency page, or one of the
  route's own pins / camps-on-file figures for the same place).
- `confidence`: `medium` if one good source (a trip report of THIS route or of the same approach
  that names where it slept) supports each night; `high` if two. `low` if you still could not find
  where parties sleep — then the route stays as it is, and that is a fine, honest answer.
- Output: `fix-output/fN.json`, same format as BRIEF.md's output. Check one main per night 1..days-1
  before writing (unless low).
