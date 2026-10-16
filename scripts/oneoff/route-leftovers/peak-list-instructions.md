PEAKBAGGER PASS. Follow `scripts/oneoff/route-leftovers/single-source-instructions.md` in full (rules, ops, output
shape), with these changes. Every entry in your input was left `unresolved` by the one-source pass, mostly because
peakbagger.com answered 403 to curl. `prior_evidence` is what that pass found; do not redo its web search.

## Read peakbagger (and summitpost) in Chrome, not curl
- Load the Chrome tools in one ToolSearch call:
  `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__find,mcp__claude-in-chrome__tabs_close_mcp`
- Call `tabs_context_mcp` once, then `tabs_create_mcp` to make YOUR OWN tab. Use only that tab id; other agents are
  using other tabs in the same browser. Close it with `tabs_close_mcp` when you finish.
- Read pages with `navigate` + `get_page_text`. Do not click, type, log in, or submit anything.
- Finding the peak: `https://www.peakbagger.com/search.aspx?ss=<peak name>&tid=S` (or navigate a peak list) and pick
  the Washington peak. The peak page lists ascents; ascent reports are `climber/ascent.aspx?aid=<n>`, and these carry
  the route name, stated gain, distance, times and a trip report. Read reports whose route matches THIS route's line.
  "Show all viewable ascents" (`peakascents.aspx?pid=<n>`) lists more.
- summitpost.org: read live in the same tab (peak page, route page) where the prior pass only had archived copies.
- If a page shows "Performing security verification" / "Just a moment...", wait ~8 s once and re-read. If it is
  still the check, **do not interact with it**: stop browsing, record `"peakbagger (security check)"` in `searched`
  for the remaining entries, finish the output file and return. Never try to get around the check.
- Pace yourself: one page at a time, no rapid-fire loops.

## Rules recap (unchanged)
One source stating the value for THIS route's line is enough; zero is not one. Never compute (no summing,
halving, measuring GPS tracks or maps — a peakbagger GPS track's computed stats are NOT a stated figure unless the
climber states them in the report or the ascent's stated "Elevation Gain"/"Distance" fields). Ascent-stat fields a
climber filled in (e.g. "Total Elevation Gain", "Round-Trip Distance") count as that climber stating them.
`dist_km` takes only a stated one-way figure. Never write `loss_ft`, `access._raw`, `access.fees`. Change every copy
of a fact on the row together or don't change it. No sources, names or URLs in app text.

Output: one JSON file at the path in your task, rewritten after each entry; every input entry must appear in it.
`searched` must say "peakbagger" with what you read (peak page / N ascent reports / not listed).
