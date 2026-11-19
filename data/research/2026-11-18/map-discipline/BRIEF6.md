# Research brief v6: routes with two or more possible starts

Read `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\BRIEF.md` (task + output format) and `BRIEF3.md`
(sources and evidence rules). This brief wins where they differ.

Your chunk: `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\chunks6\<CHUNK>.json`. Write
`...\out6\<CHUNK>.json` in the BRIEF.md output format, rewriting the file after each route. Validate that
the file parses as JSON before you finish.

Each route has `lastPassNote`: the earlier pass found two or more starts in use and could not choose.
Your job is to find out whether ONE of them is the standard start FOR THIS ROUTE.

1. Up to 4 WebSearches per route. A search summary is NEVER evidence: open the page with WebFetch.
   Do NOT use Chrome. Do NOT call Nominatim, Photon or Overpass.
2. "found" needs one of:
   a. an authoritative page for this route (guidebook-derived page, Sierra Peaks Section / climber.org,
      Mountaineers, land manager, Wikipedia Routes section, 14ers/13ers route page) that names ONE start
      as the standard or usual one; or
   b. at least THREE opened trip reports of this route (or this side of the peak), with a clear majority
      from one start, and none calling the other start the usual one.
   Otherwise status "stuck"; list every start with the pages that used it. A wrong trailhead sends a
   climber to the wrong road; stuck is the correct answer when the evidence is even.
3. Placement: a coordinate printed by a land-manager page, recreation.gov, WTA or 14ers.com, or an
   `officialCandidates` entry matching the name. NEVER Mountain Project / OpenBeta / Hiking Project
   coordinates. No coordinate found: give the signed trailhead name with an empty placements array.
4. In `notes`, list each page opened and which start it used. Say "weak" or "inferred" when it is.
   Facts only, never copied sentences. Never solve a CAPTCHA or login wall.

Final reply: per route, found/stuck and the chosen start; searches used; sites that blocked you.
