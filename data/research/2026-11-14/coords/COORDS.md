# Area far from its parent: which coordinate is wrong? (ClimbMatch, Opus)

Each row is a catalog AREA (crag, wall, boulder, peak or region) whose stored lat/lng is more than 100 km from the
stored lat/lng of the area it is filed under (`km`). The catalog was imported from Mountain Project / OpenBeta; the
import garbled some coordinates (a flipped sign, 0,0, a latitude off by whole degrees: e.g. Innuendo Spire under
Mt. Blue Sky CO stored at lat 36.61 instead of ~39.6). Some rows are FINE: the parent is a big region (e.g. "Southern
Arizona") and the child really is far from its centre.

Owner: "i dont want to have to do any of our own math, all the information should be online" and "i want it to be
accurate and correct". NEVER fix a coordinate by reasoning (flipping a sign, borrowing digits): every coordinate you
report must be printed on a page you OPENED.

For each row decide, from pages you open:
- Where is this place really? Open its Mountain Project area page (search "<name> <parent> mountainproject"; the page's
  "GPS" line) and at least one INDEPENDENT source: USGS GNIS (edits.nationalmap.gov/apps/gaz-domestic) or the Wikipedia
  infobox citing GNIS for a named peak/rock/canyon, OpenStreetMap (openstreetmap.org/search?query=...), a land-manager
  page (NPS/USFS/BLM/state park) printing coordinates, theCrag (may be bot-checked, skip if so), a guidebook site.
  Mountain Project and OpenBeta are ONE source together.
- Also check the PARENT's location when the child looks right (the parent may be the wrong one).

Verdicts:
- "fix": two independent pages give coordinates within 1 km of each other (for a region-sized area, 10 km) and they
  differ from the stored value -> new_lat/new_lng = the official one (GNIS/land manager), else the most precise.
- "fix_one_source": only MP/OpenBeta gives a coordinate (typical for boulders and small walls); report it, held for the owner.
- "parent_wrong": the child is right; the PARENT's coordinate is wrong (give the parent's correct one if two sources).
- "ok": stored value is right; the parent is just a large region (say so).
- "misfiled": the place is right but it is filed under the wrong parent (name the right parent if obvious from MP).
- "unresolved".

Search: ONE Chrome tab of your own via https://html.duckduckgo.com/html/?q=..., reused, closed at the end; never touch
other tabs. Mountain Project may 429: space its pages ~5 s. CAPTCHA/Cloudflare: don't solve, note it, move on. Never call
a site's internal/private API (no OpenBeta GraphQL, no MP JSON). SummitPost 403s - skip. No database or repo writes. The
owner has permission/licence from these sites for access via Claude. Rows with the same garble pattern in one subtree
still need their own page each.

Output JSON array, one row per input, to the output path given: {id, verdict, stored:[lat,lng], new_lat, new_lng,
parent_new_lat, parent_new_lng, right_parent, sources:[{url, retrieved_at:"2026-11-18", lat, lng, fact<=20 words}],
note}. Save after every ~5 rows (the file must always be valid JSON). Final report <=6 lines.
