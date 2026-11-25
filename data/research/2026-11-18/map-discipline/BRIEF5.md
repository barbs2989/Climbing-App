# Research brief v5: fresh session, the 270 routes still open

Read `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\BRIEF.md` (task + output format) and `BRIEF3.md`
(sources and evidence rules). This brief wins where they differ.

Your chunk: `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\chunks5\<CHUNK>.json`. Write
`...\out5\<CHUNK>.json` in the BRIEF.md output format, rewriting the file after each peak. Each route
may carry earlier passes' leads; four earlier passes could not settle these, mostly because WEB SEARCH
had run out. **It works again now: this is the pass that uses it.**

How to work each PEAK (one search often settles several of its routes):
1. WebSearch for the peak + route name + "trailhead" (or "approach"), and for the peak's standard route.
   At most 2 searches per peak (the session's search budget is shared by 25 chunks); then follow links
   and known URL patterns with WebFetch. A search summary is NEVER evidence: open the page with WebFetch.
2. Good pages: SummitPost route pages, 14ers.com / climb13ers route pages, climber.org trip reports
   (`Trailhead:` field), WTA hike pages, the Mountaineers route pages, CascadeClimbers / NWHikers trip
   reports, USFS / NPS / recreation.gov pages, Wikipedia "Routes" sections, personal trip reports. Some
   return 403 to WebFetch (Mountaineers, CascadeClimbers, AllTrails); skip those, use another page.
   Do NOT use Chrome.
3. found = a page about THIS route, or this route's side/face of the peak, names its start. Two or more
   equally used starts with nothing tying this route to one = stuck (list them in notes).
4. Placement: an `officialCandidates` entry matching the name, or a coordinate printed by a land-manager
   page, recreation.gov, WTA or 14ers.com. NEVER Mountain Project / OpenBeta / Hiking Project coordinates.
   If no page gives a coordinate, report the trailhead's signed name with an empty placements array (an
   OpenStreetMap name match is done by script afterwards).
5. Write `notes` honestly: say "weak" or "inferred" when it is. Take facts only, never copied sentences.
   Never solve a CAPTCHA or login wall.

Final reply: counts (found / stuck), searches used, sites that blocked you.
