# Round 7: glacier calls still open after six rounds

Every route here has had two text reads and up to four research rounds, and its GLACIER fact is still not
settled. The earlier rounds mostly failed because the pages that describe these lines (summitpost.org,
cascadeclimbers.com) refuse automated reading. This round looks elsewhere.

1. Read `research-data/glacier-travel-2026-11-23/RULE.md` in full, then `RESEARCH-PROMPT.md` beside it: its
   steps 3 to 5 still bind (read a page; "no" needs a source describing the line off crevassed ice; when in
   doubt "unsure"). Each entry carries `state` and `earlierWhy` (what the earlier rounds found). Do not repeat
   a search whose result `earlierWhy` already reports.
2. **Do not try summitpost.org or cascadeclimbers.com**: they will not load. Sources that do load:
   - peakbagger.com: the peak page and its ascent list; trip-report ascents often describe the line.
   - mountainproject.com route and area pages (description and comments).
   - mountaineers.org route/place pages; wta.org (WA); NPS, USFS, Parks Canada and BC Parks pages.
   - nwhikers.net, bivouac.com, personal trip-report blogs, club newsletters, AAJ (publications.americanalpineclub.org).
   - Google Books snippets and previews of guidebooks.
3. **Budget: at most 2 web searches per route, and fewer where you can.** Fetch a known URL pattern instead of
   searching where possible. The search budget is shared with other researchers running at the same time;
   if searches start failing, keep going with fetches and answer "unsure" where nothing loads.
   **Effort rule (binding): work EVERY entry.** For each route make at least one search or fetch and try at
   least two different sources (WebFetch the most promising result pages, not just the snippets) before
   answering "unsure". Stopping before every entry has been tried is a failed run. A 403 on one site means
   try the next site, not stop. Expect about 4 to 6 tool calls per route.
4. Settle ONLY the glacier fact (and snowInSeason, if it is listed in `stillUnsure`). Report the other fact
   as `"unsure"` unless a page you read settles it too. `glacier: "yes"` requires `snowInSeason: "yes"`.
5. A "no" must rest on a page that DESCRIBES THIS LINE (approach, climb, normal descent) as staying off
   crevassed ice. These do NOT support "no": silence about a glacier; a page about a different route on the
   peak; "you can stay off the glacier if…"; a single account contradicted by the route's own text.
6. Write one JSON array `{ "id", "glacier", "snowInSeason", "basis", "why", "url" }`, one per entry, same
   order, to the output path given. `url` = the page the answer rests on (null if none). `why` is one short
   sentence in your own words. Write no other file anywhere and never touch a database. Reply with only:
   counts per glacier answer, how many rest on a page you read, and the ids still unsure.
