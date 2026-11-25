# Research brief v4: third pass, Peakbagger now readable

Read `C:\Users\nate_\.claude\jobs\be35cfe5\tmp\research\BRIEF.md` for the task and the output format,
then this, which wins where they differ. Your chunk is `chunks4\<CHUNK>.json`; write `out4\<CHUNK>.json`.
Each route carries `earlierPasses`: why two earlier passes left it stuck or held, and what they found.

**What changed: Peakbagger is readable now, in Chrome only** (WebFetch still gets 403 there).
- Load the Chrome tools in ONE ToolSearch call:
  `select:mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__tabs_close_mcp`.
  Create ONE tab with `tabs_create_mcp` and use ONLY that tabId for everything. Never call
  tabs_context_mcp, never touch another tab: other agents are working in the same window. Close your tab at the end.
- **FIRST call navigate on your new tabId** to `https://www.peakbagger.com/search.aspx`: a fresh tab is
  on an internal page where javascript_tool fails ("browser-internal or unparseable URL"). Then read pages with
  `javascript_tool` fetches from inside it (same-origin, fast), parsing with DOMParser, e.g.
  `const d=new DOMParser().parseFromString(await (await fetch(URL)).text(),'text/html')`. Keep each
  call under 40 s. Wait at least 1 s between fetches. On a 429 or 403, stop using Peakbagger.
- Find the peak: `/search.aspx?tid=R&lat=<peak.lat>&lon=<peak.lng>` lists the nearest peaks with
  `peak.aspx?pid=` links; pick the one whose name matches.
- The peak page `/peak.aspx?pid=N` lists recent ascents (`climber/ascent.aspx?aid=`) and links to
  trip reports. Each ascent page has labelled cells `Start Trailhead:`, `End Trailhead:`, `Route:`
  and the trip-report text. **Look for ascents of THIS route** (route name, face or ridge in the
  report or Route cell) and take their Start Trailhead. Peakbagger may also describe the standard route
  on the peak page or in a "Route Information" link.
- Also usable without Chrome, via WebFetch: climber.org reports, 14ers.com, climb13ers, snwburd.com,
  WTA hike pages, Wikipedia, NPS/USFS pages. WebSearch is exhausted for this session: don't call it.

**Bar for `found`:** an ascent or page about THIS route, or this route's side or face, names its start.
A peak's most common start counts only if this route is the peak's standard way up. Two or more starts
that are equally used for this route: stay `stuck` and list them. Placements: `officialCandidates`
entries that match the name, or a coordinate a land-manager page prints. Never Mountain Project or
OpenBeta coordinates. A Peakbagger trailhead has no coordinate, so name it exactly as the land manager signs it.

Rewrite your output file after each peak. Final reply: counts and the 3 most notable problems.
