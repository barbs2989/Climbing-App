# Round 8: snow-in-season calls still open

Every route here has a settled GLACIER answer; only `snowInSeason` is open. It decides whether the alpine
Conditions tab warns about soft snow and overnight freeze on the route (snow "no" = a dry line in its normal
season, so no freeze warnings).

1. Read `research-data/glacier-travel-2026-11-23/RULE.md` in full: its definition of snow in season (the
   NORMAL line, in the route's NORMAL season) binds. Each entry carries `state` and `earlierWhy`.
2. Sources that load: mountainproject.com route pages and comments, publications.americanalpineclub.org,
   NPS / USFS / park pages, personal trip-report blogs (stephabegg.com and the like), Wikipedia, Google
   Books snippets. Do NOT try summitpost.org, cascadeclimbers.com, peakbagger.com, mountaineers.org, wta.org
   or mazamas.org: they answer 403.
3. **Effort rule (binding): work EVERY entry.** For each route, at least one search or fetch and at least two
   sources tried (WebFetch the result pages, not just snippets) before answering "unsure". Stopping before
   every entry has been tried is a failed run. Expect 3 to 6 tool calls per route.
4. "yes": a page describes snow on the normal line in its normal season (a snow approach, couloir, snowfield
   needing an axe, a winter or spring ice/snow climb). "no": a page describes the line in its normal season as
   dry (rock, trail, talus; snow gone by the usual climbing months). Silence is "unsure". Ice and mixed routes
   climbed in winter are "yes".
5. Write one JSON array `{ "id", "glacier", "snowInSeason", "basis", "why", "url" }`, one per entry, same
   order, to the output path given. Copy `glacier` from the entry's settled answer if you know it, else write
   "unsure" (the fold ignores it). `basis` is "web" only when a page you read supports the answer. `why` is one
   short sentence in your own words. Write no other file anywhere and never touch a database. Reply with only:
   counts per snowInSeason answer, how many rest on a page you read, and the ids still unsure.
