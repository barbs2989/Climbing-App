# Research brief v2: trailhead + summit for peak routes (rerun)

Read `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\BRIEF.md` first: the task, the output format
and the rules are the same. This brief CHANGES four things, and it wins wherever the two differ.

1. **Do NOT call Nominatim or Overpass.** OpenStreetMap points are matched by script afterwards, by
   the trailhead NAME you report, so give the name as the land manager or the map signs it (e.g.
   "Stuart Lake Trailhead", not "the usual lot"). Use `officialCandidates` (USFS/NPS) as Placement A
   as before; if a chunk has `osmCandidates`, report matching ones too.
2. **Every route must be researched on at least one page** unless its own text names a single
   trailhead unambiguously. Empty or vague route text is the normal case here, not a reason to stop.
   Look things up per PEAK: one good page usually names the standard trailhead for several routes on
   that peak. Sources, in order:
   - SummitPost and Peakbagger, through your Chrome tab. If you get a 403 or a human check, skip that
     site for the rest of your run and say so in `notes`. Never solve a check.
   - The land manager: USFS ranger-district pages, NPS park pages, recreation.gov, state parks / NYSDEC.
   - WTA (Washington), 14ers.com and listsofjohn (Colorado), the Adirondack Mountain Club and NYSDEC
     (New York), Wikipedia "Climbing" or "Routes" sections, trip reports (CascadeClimbers, blogs).
   - WebSearch is allowed, at most 2 per peak: use it to FIND a page, then open the page. A search
     summary is never evidence.
3. **Peak-level identification is allowed.** It applies when a page says the standard way to a peak
   (or to a named face or basin) starts at trailhead X, and the route's own text or that page puts
   this route on that side. Record `identifiedBy.kind: "page_peak"` with the url and the fact.
   Routes on the opposite side of the peak are not covered by it.
4. **One placement is enough for `found`**, but report both when both lists match. If the trailhead
   you identified is in neither list, look for a coordinate on the land-manager or recreation.gov page.
   If there is none, use `found` with an empty `placements` array and the name. I will place it.

Work through every route in your chunk; plan on 30+ tool calls. Rewrite your output file after each
peak. Final reply: counts, plus which sites blocked you.
