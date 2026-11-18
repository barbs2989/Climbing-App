# Research brief v3: second pass on stuck and weakly identified routes

Read `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\BRIEF.md` for the task and the output format.
This brief wins wherever they differ.

Your chunk is in `chunks2\<CHUNK>.json`; write `out2\<CHUNK>.json` in the same format. Each route
carries `firstPass`: why the first pass was stuck or held, and what it found. Do better than that:
either identify the trailhead from a page about THIS route (or its side or face of the peak), or
confirm or replace the first pass's weak identification with a stronger source. If you still cannot,
leave it `stuck` with a precise reason. Do not repeat a guess.

**Sources (owner, 2026-11-18: "use all sources"):** every site may be read for facts. Use
AllTrails, Gaia GPS, CalTopo, Hiking Project and Mountain Project approach text, 14ers.com, climb13ers,
listsofjohn, climber.org trip reports (they have a `Trailhead:` field), WTA, the Mountaineers,
CascadeClimbers, NWHikers, SierraClub/SPS pages, USFS / NPS / recreation.gov / state agency pages,
Wikipedia, and personal trip-report blogs.
- **Read pages with WebFetch first.** The shared Chrome tab group is contested by other agents. Use
  Chrome only for a page WebFetch cannot read, in ONE tab of your own, and close it at the end.
- **Never solve a CAPTCHA, human check or login wall.** Skip that site and say so in `notes`.
- WebSearch is allowed to find pages, up to 3 per peak. A search summary is never evidence; open the page.
- **Mountain Project / OpenBeta / Hiking Project coordinates never place a pin** (they have measured
  kilometres off). Their text may still NAME the trailhead.
- A trailhead coordinate printed on AllTrails, Gaia, CalTopo, a land-manager page or recreation.gov may
  be reported as a placement (`source` = the site name, with the url). Do not call Nominatim or
  Overpass: OSM is matched by script from the NAME you report, so use the trailhead's signed name.
- Weak identification means: inferred from a nearby name, one multi-peak trip report, or the peak's
  standard route when this route is on another side. Say plainly which kind your answer is.

Plan on 3+ page reads per peak. Rewrite the output file after each peak. Final reply: counts, plus
which sites blocked you.
