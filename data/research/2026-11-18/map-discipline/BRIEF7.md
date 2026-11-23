# Research brief v7: the routes still open after six passes

Read `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\BRIEF.md` (task + output format) and `BRIEF3.md`
(sources and evidence rules). This brief wins where they differ.

Your chunk: `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\chunks7\<CHUNK>.json`. Write
`...\out7\<CHUNK>.json` in the BRIEF.md output format, rewriting the file after each peak. Check that the
file parses as JSON before you finish.

Each route carries `status` and `lastAnswer` (what earlier passes concluded, and why it was not enough):
- `held`: a start was named but the identification was weak (peak-level page, one page, inferred) or it had
  no mappable point. Your job: find a page about THIS route (or this face / side of the peak) that confirms
  or contradicts that start, and a coordinate from an allowed source.
- `nopage` / `new`: no page was found. Your job: find one.

Earlier passes leaned on SummitPost / Mountaineers / CascadeClimbers search summaries (those sites return 403)
and on climber.org. Spend this pass on sources they used less:
- guide services' route pages (alpineinstitute.com route profiles, ncmountainguides.com, mountainmadness.com,
  sierramountaineeringintl, internationalalpineguides), which name the parking spot;
- American Alpine Journal reports (publications.americanalpineclub.org), which say how the party approached;
- personal trip-report sites: stephabegg.com, lemkeclimbs.com, countryhighpoints.com, trailcatjim, snwburd.com
  (Bob Burd), wacziarg, peaksforfreaks, themtsarecalling, hikingwalking, 14ers.com / climb13ers.com,
  nwhikers trip reports, WTA hike pages and trip reports that open;
- land-manager pages (USFS, NPS, BLM, state parks, BC Parks) and Wikipedia.

Rules:
1. Up to 3 WebSearches per PEAK (one search often settles several of its routes), then WebFetch. A search
   summary is NEVER evidence: only a page you opened counts. Do NOT use Chrome. Do NOT call Nominatim, Photon
   or Overpass. Do NOT use archive.org, Google cache or any cached/mirror copy of a site that refuses you:
   a 403 means skip that site.
2. `found` only when an opened page about this route, or this side of the peak, names its start, and nothing
   you opened names a different start as usual for it. A peak-level page counts only when the peak has a
   single road access. Two or more starts in use with nothing tying this route to one = `stuck` (list them).
3. Placement: an `officialCandidates` entry matching the name, or a coordinate printed by a land-manager
   page, recreation.gov, WTA, 14ers.com or climb13ers. NEVER Mountain Project / OpenBeta / Hiking Project /
   AllTrails coordinates. No coordinate: give the signed name with an empty placements array.
4. If you find nothing new, return the route as `stuck` with notes "nothing new" — do not restate the old
   answer as found. Put in `notes` each page you opened and which start it used; say "weak" or "inferred"
   when it is. Facts only, never copied sentences. Never solve a CAPTCHA or login wall.

Final reply: counts (found / stuck), and for each found route the start plus the page behind it; searches
used; sites that blocked you.
