# One-source gain contradicts stored gain: find a second source (ClimbMatch, Opus)

Each row: a route's stored one-way gain_ft, and ONE published figure (one_source_url) that differs from it by more than
10%. Earlier passes found no second page (earlier_notes says what was tried). Owner: "i dont want to have to do any of our
own math, all the information should be online" and "i want it to be accurate and correct". Agreement = two figures within
10% of the LARGER one. Never compute a figure; every number must be printed on a page you OPENED.

Look for a SECOND INDEPENDENT one-way gain for the same route from the same start: Peakbagger ascent pages that name the
route and trailhead (several Peakbagger logs = one source), NPS/USFS pages, WTA, Mountaineers, Mazamas, guide services,
summitpost-style trip reports on other sites, CascadeClimbers/NWHikers trip reports stating gain, Beckey-derived pages,
Wikipedia citing a guide. Record the START for every figure; a figure from another start (a camp, an upper trailhead, an
open/closed road) is not the same route figure. Round-trip or traverse totals: record with one_way:false.

Verdicts:
- "replace": two independent pages agree (<=10%) on a one-way figure from the route's current start, and the stored value
  is outside 10% of it -> final_gain = the official/land-manager figure, else the most route-precise one.
- "keep": two independent pages agree with the STORED value (<=10%).
- "start_differs": the figures differ because they use different starts; name each start + its figure.
- "unresolved".
Independence: WTA + Mountaineers identical text = one; a page citing another = not independent; a search snippet is never
evidence.

Search: Chrome via https://html.duckduckgo.com/html/?q=... ONE Chrome tab of your own, created with tabs_create_mcp,
reused, closed at the end; NEVER navigate a tab you did not create. CAPTCHA/Cloudflare: don't solve, note it. Never call a
site's internal/private API. SummitPost 403s - skip. No database or repo writes. The owner has permission/licence from these
sites for access via Claude.

Output JSON array, one row per input: {route_id, verdict, final_gain|null, figures:[{value, start, one_way, url, fact<=20
words}], evidence:[the 2 agreeing {url, retrieved_at:"2026-11-23", fact<=20 words}], note}. Save after every ~3 rows (valid
JSON always). Final report <=6 lines.
