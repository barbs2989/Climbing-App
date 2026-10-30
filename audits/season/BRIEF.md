# Season research brief (owner note "Audit optimal season for all route via online research")

For each climbing AREA you are given, find its climbing SEASON: the calendar months climbers and
published sources name as the time to climb there (the good season, not "possible if you're tough").
This becomes `areas.season_months` (integers 1-12) and shows on the area page and in the header of
every route under it, e.g. "Mar-May, Sep-Nov".

How to research (WebSearch — use mode "extended" when a standard search is thin — and WebFetch):
- Prefer: guidebook publishers' / authors' pages, land agency pages (NPS, USFS, BLM, state parks,
  local climbing coalitions), the area's Mountain Project page text (description, getting there,
  weather notes), theCrag / 27 Crags editorial text, climbing magazines (Climbing, Rock and Ice,
  Gripped), reputable regional climbing sites.
- NEED TWO INDEPENDENT SOURCES that agree on the months (or one guidebook / agency source plus a
  second that is consistent with it). If sources disagree, take the window most of them share and
  say so in the note.
- Map season words to months only when a source gives no months: spring = Mar-May, summer =
  Jun-Aug, fall/autumn = Sep-Nov, winter = Dec-Feb — and only when at least ONE other source names
  months that agree. Season words alone are "low". Watch the climate: in the north or at altitude
  "spring" seldom means March (snow), so prefer the months a source actually names. If a source is more precise ("late March to
  early June"), use the months it names (a month named as a partial start or end counts).
- "Year-round" = all 12 months only when sources say so plainly.
- The area is identified by name, state, its parent areas and a coordinate. Make sure each source is
  about THIS place (e.g. "Lower Highway" is the lower Mount Lemmon highway above Tucson). Sibling
  areas in one crag system (several Red River Gorge preserves) may share one season if the sources
  speak for the whole system.
- Research the season of the ROCK climbing (sport, trad, bouldering) unless the area is an ice-only
  venue. An ice season is wrong for a crag whose routes are rock; say so in the note instead.
- If you cannot confirm with two sources, return confidence "low" and season_months null. Do not
  guess and do not fall back on climate reasoning alone.

Output: write a JSON file (the path is in your task) shaped
{ "<area id>": { "name": "...", "region": "...", "season_months": [3,4,5,9,10,11] or null,
  "confidence": "high" | "medium" | "low", "sources": ["url", ...], "note": "one line: what the sources said" } }
One entry for every area you were given. Reply with only a 2-3 line summary (how many high / medium /
low); the file is the deliverable. Do not touch any database or any other file.
