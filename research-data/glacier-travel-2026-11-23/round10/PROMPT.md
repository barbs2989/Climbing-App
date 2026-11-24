# Round 10: glacier calls still open after round 7

Every route here went through round 7 with a full search effort and its GLACIER fact is still not settled.
`earlierWhy` now carries every earlier note (text reads, second review, each research round, and any hold
reason). Read it first: do NOT re-fetch a page it names, and do not repeat a search it reports. Look for a
DIFFERENT page: a second trip report, a guidebook snippet, a park or forest page, an ascent list entry.

1. Read `research-data/glacier-travel-2026-11-23/RULE.md` in full, then `RESEARCH-PROMPT.md` beside it: its
   steps 3 to 5 still bind (read a page; "no" needs a source describing the line off crevassed ice; when in
   doubt "unsure"). Each entry carries `state`, `stillUnsure` and `earlierWhy`.
2. These answer 403 and must not be tried: summitpost.org, cascadeclimbers.com, peakbagger.com,
   mountaineers.org, wta.org, mazamas.org. Sources that load: mountainproject.com route and area pages,
   publications.americanalpineclub.org, NPS / USFS / Parks Canada / BC Parks pages, bivouac.com, nwhikers.net,
   stephabegg.com and other personal trip-report blogs, Wikipedia, Google Books snippets.
3. **Effort rule (binding): work EVERY entry.** For each route make at least one search or fetch and try at
   least two different sources (WebFetch the result pages, not just the snippets) before answering "unsure".
   Stopping before every entry has been tried is a failed run. If WebSearch stops working, keep going with
   WebFetch of likely pages for every remaining entry. Expect 3 to 6 tool calls per route.
4. Settle ONLY the glacier fact (and snowInSeason, if it is listed in `stillUnsure`). Report the other fact as
   `"unsure"` unless a page you read settles it too. `glacier: "yes"` requires `snowInSeason: "yes"`.
5. **The review bar (an answer that misses it is held at unsure):**
   - "yes": a page describes this line crossing or climbing a crevassed glacier (roped glacier travel,
     crevasses, a named glacier on the approach, climb or normal descent).
   - "no": a page that DESCRIBES THIS LINE (approach, climb, normal descent) as staying off crevassed ice, or a
     place fact that rules a glacier out (the range or cirque holds none). NOT enough: silence about a
     glacier; one trip report that never mentions the glacier; a page about a different route on the peak;
     "you can stay off the glacier if…"; a page that covers only the approach or only the climb.
6. Write one JSON array `{ "id", "glacier", "snowInSeason", "basis", "why", "url" }`, one per entry, same
   order, to the output path given. `basis` is "web" only when a page you READ (not a snippet) supports the
   answer. `url` = that page (null if none). `why` is one short sentence in your own words. Write no other
   file anywhere (use the Write tool) and never touch a database. Reply with only: counts per glacier answer,
   how many rest on a page you read, and the ids still unsure.
