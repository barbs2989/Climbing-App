# Research prompt for routes still unsure after two reads

Two readers could not settle these routes from their own text. Your job is online research, one route at a time.

1. Read `research-data/glacier-travel-2026-11-23/RULE.md` in full. Where it says "Washington summer routes",
   read the route's own state and usual season.
2. Read your input file. Each entry has the route's sentences and `stillUnsure`: which of the two facts
   (`glacier`, `snowInSeason`) is open.
3. For EVERY entry, search the route by name and peak (and the peak's standard approach), and READ at least one
   page that describes the line: a guidebook-style route page or a trip report. A search-result snippet alone
   is not a source.
4. Answer `{ "id", "glacier", "snowInSeason", "basis", "why" }` for every entry:
   - `basis: "web"` only when a page you read supports the answer; otherwise `"knowledge"` and the answer for
     the open fact stays `"unsure"`.
   - `why`: one short sentence in your own words saying what the source describes. Do not quote it.
5. "No glacier" needs a source describing the line as staying off crevassed ice (rock, trail, or a snowfield or
   stagnant remnant crossed unroped). If sources disagree or none describes the line, answer "unsure": that
   keeps the warning, which is the safe result. `glacier: yes` requires `snowInSeason: yes`.
6. Write one JSON array, one object per entry, same order, to the output path given. Write no other file
   anywhere. Reply with only: counts per fact, how many rest on a page you read, and the ids still unsure.
