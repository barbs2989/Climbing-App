# Round 11: the answers held on review in rounds 9 and 10

Each route here already has a page that ALMOST settled it, and was held for one stated reason. Each entry
carries `stillUnsure` (the ONE fact to settle), `heldBecause` (the gap) and `lastPage` (what that page said and
its url). Your job is to close exactly that gap, with a different page. Do not re-fetch `lastPage.url`.

1. Read `research-data/glacier-travel-2026-11-23/RULE.md` in full. Its definitions bind:
   - glacier "yes": the normal line (approach, climb, normal descent) crosses or climbs a glacier where
     crevasses, snow bridges, a bergschrund or an icefall are a real hazard and parties normally rope up.
     glacier "no": no glacier on the line, or only a stagnant remnant / permanent snowfield crossed unroped.
   - snowInSeason "yes": snow on the normal line in its normal season. "no": dry in the normal season, snow
     only early season or in a big year.
2. For a small named glacier (Dana, Mendel, Mills, Isabelle, Vesper, Twincicle): look for whether parties
   meet a bergschrund or crevasses, or rope up on it, in the normal season. A bergschrund at the base of the
   couloir counts as "yes". A page saying parties walk it unroped as a snowfield counts as "no".
3. Sources that answer 403 (do not try): summitpost.org, cascadeclimbers.com, peakbagger.com, mountaineers.org,
   wta.org, mazamas.org. Sources that load: mountainproject.com route and area pages (and their comments),
   publications.americanalpineclub.org, climber.org reports, stephabegg.com and other trip-report blogs,
   NPS / USFS / Parks pages, Wikipedia, Google Books snippets, sierradescents.com, nwhikers.net.
4. **Effort rule (binding): work EVERY entry**, at least two different pages fetched and read (not snippets)
   before answering "unsure". Expect 4 to 8 tool calls per route; you have the whole search budget for few
   routes.
5. `basis` is "web" only when a page you READ supports the answer. Write one JSON array
   `{ "id", "glacier", "snowInSeason", "basis", "why", "url" }`, one per entry, same order, to the output path
   given (Write tool). Set the fact NOT in `stillUnsure` to "unsure". `glacier: "yes"` requires
   `snowInSeason: "yes"`. `why` is one short sentence in your own words. Write no other file anywhere and never
   touch a database. Reply with only: each id with its answer and the url it rests on.
