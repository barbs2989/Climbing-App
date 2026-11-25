# Research brief v8: the routes still open after ten passes

Read `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\BRIEF.md` (task + output format) and `BRIEF3.md`
(sources and evidence rules). This brief wins where they differ.

Your chunk: `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\chunks8\<CHUNK>.json`. Write
`...\out8\<CHUNK>.json` in the BRIEF.md output format (a JSON array, one entry per input route, same order),
rewriting the file after each peak. Check that the file parses as JSON before you finish.

Each route carries `status` and `lastAnswer`, which says what earlier passes opened and why it was not enough:
- `stuck`: no opened page named a start for this route. Find one, and don't reopen the pages listed in
  `lastAnswer`.
- `multistart`: two or more starts are in use for the peak, and nothing tied this route to one. Look for
  pages about THIS route, or this face or side of the peak, that say where its party started.

## The evidence bar (the owner lowered it on 2026-11-23)

A start is `found` when **two independent opened sources agree** on it and no opened source names a
different start for this route. One opened page about this route is still enough when the peak has a single
road access. Two write-ups of the SAME trip count as one source. A trip that only passes the peak on a long
traverse is not a source for that route's start.

## Where to look

Earlier passes found these sites open and useful:
- **climber.org:** per-peak report index at `https://climber.org/reports/ByPeak<FirstLetter>.html`. Find the
  peak's anchor; each report has a "Trailhead:" line in its header.
- **Trip-report sites:** stephabegg.com, lemkeclimbs.com, sverdina.com, climberkyle.com,
  mountainflamingo.com, countryhighpoints.com, turns-all-year.com, wenatcheeoutdoors.org,
  yellowleaf / Middle Fork pages, trailcatjim.com, snwburd.com (Bob Burd), wacziarg (sites.google.com),
  peaksforfreaks, themtsarecalling.com, climb13ers.com, thenextsummit.org.
- **WTA hike pages** (`wta.org/go-hiking/hikes/...`). WTA trip reports return 403.
- **Journals and guides:** American Alpine Journal (publications.americanalpineclub.org) and
  alpineinstitute.com.
- **Land managers:** USFS, NPS and BC Parks pages.

These sites refuse automated access (403). Skip them and don't try copies of them: SummitPost,
Mountaineers.org, CascadeClimbers, Peakbagger, listsofjohn.

## Rules
1. Up to 3 WebSearches per PEAK, then WebFetch. A search summary is NEVER evidence: only a page you opened
   counts. Do NOT use Chrome, Nominatim, Photon or Overpass. Do NOT use archive.org, Google cache or any
   cached or mirror copy of a site that refuses you.
2. Placement: an `officialCandidates` entry matching the name, or a coordinate printed by a land-manager
   page, recreation.gov, WTA, 14ers.com, climb13ers or a climber.org driving page or GPX. NEVER use Mountain
   Project, OpenBeta, Hiking Project or AllTrails coordinates. If you have no coordinate, give the signed
   name and leave placements empty.
3. If you find nothing new, return `stuck` with notes "nothing new". In `notes`, list each page you opened
   (URL) and the start it used. Record facts only, never copied sentences. Never solve a CAPTCHA or get
   past a login wall.

Final reply: counts (found / stuck); for each found route, its start and the two sources behind it;
searches used; sites that blocked you.
