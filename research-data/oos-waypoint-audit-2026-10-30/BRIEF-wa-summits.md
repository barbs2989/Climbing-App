# WA summit pins, one by one (2026-10-30): batch brief

Read first, and follow:
- `research-data/wa-waypoint-audit-2026-10-30/BRIEF.md` (the rules, the ops and the output format)
- `research-data/oos-waypoint-audit-2026-10-30/BRIEF-summits.md` (how to judge a summit pin)

**Do not touch the database.**

Today's WA audit (#3083) researched only the summit pins more than 300 m from the same-named GNIS
Summit. These batches are the rest:
- pins 100-300 m from GNIS;
- pins whose name matched no GNIS Summit at all. Names like "Summit", a route name or a
  sub-summit are common here.

Your input is `research-data/oos-waypoint-audit-2026-10-30/wa-summits-<N>.json`. Each entry is one
DISTINCT stored coordinate:
`{at:[lat,lng], gnis:{id,name,lat,lng}|null, gnis_m, area, pins:[{id,i,name,elev}], ground_ft, isMax, gap}`.
- `ground_ft` is the 3DEP height at the pin.
- `isMax` says whether the pin is a 3DEP local maximum (8 probes about 70 m out).
- `gap` is the ground minus the pin's stated `elev`.
- `area` is the route's area id. Its name is usually the peak; you can read it off the id.
Entries are sorted worst first.

For each entry:
1. Identify the peak or summit the pin means, from the pin name, the area id and the route id.
2. Find its published coordinate and elevation. Sources:
   - GNIS layer 5 (`gaz_name LIKE '%X%'`, `state_alpha='WA'`);
   - Peakbagger or ListsOfJohn, via search results, since direct fetches answer 403;
   - Wikipedia;
   - SummitPost, the Bulger list pages, and the WA guidebook pages on archive.org.
   Then probe 3DEP around the candidate.
3. Choose the op:
   - **`none`**: the pin is on the true high point, a local max within ~150 ft of the published
     elevation, even when GNIS sits elsewhere. GNIS is often the one that is off.
   - **`move`**: only to a PUBLISHED coordinate that lands on the high point, when the pin is
     clearly off it by more than ~150 m. Give one entry per pin in `pins`, with `from` = `at` and
     `name` copied exactly.
   - **`setElev`**: the pin is on the summit but its `elev` is more than 100 ft off the published
     elevation. The most recent published source wins.
   - **`none` with a reason**: the pin deliberately marks a sub-summit, a false summit, or a
     traverse point.
4. Spend at most about 2 searches per entry. Reuse what you learn across entries.

Output `research-data/oos-waypoint-audit-2026-10-30/decisions-WS<N>.json`. Validate that it parses.

Reply in at most 12 lines:
- the counts: none / move / setElev;
- a table of the changes, with distance moved and source.
