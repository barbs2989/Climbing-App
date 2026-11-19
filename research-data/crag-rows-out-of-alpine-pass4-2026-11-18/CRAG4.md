# Crag pass 4: find the STATED walking time (ClimbMatch, Opus)

Owner rule: a CRAG = about <=1 hour ON FOOT from the car to the base. "Accurate and correct", and "i dont want to have to
do any of our own math, all the information should be online". These areas' routes are filed "alpine" and were NEVER researched (prior_* fields are empty; use area_name, area_trail = the Mountain Project path, lat/lng and the route names to identify the place). On OTHER areas, earlier passes
were often left undecided by: a distance with no time, a time from a ski-lift/gondola top, a photo caption, a
partly-timed walk, conflicting pages, or a place never identified. None of those decide a verdict. Many of these areas
(Alaska Range, Bugaboos, High Sierra, RMNP) are likely real alpine: say so only when a page states a >60 min approach,
a summit/ridge finish, glacier/snow, or fly-in/roadless access.

For EACH AREA, from pages you OPEN (a search snippet is never evidence):
1. Identify the place (search the sample route names + state if place_name is null).
2. Find a page that STATES the walk time from the car/parking to the base, in minutes or hours ("20 min", "1-1.5 hours",
   "roadside", "a few minutes"). Try sources OTHER than the prior URLs: theCrag.com, Mountain Project child/parent area
   and route pages ("Getting There", comments), local climbing org / guidebook publisher pages, land-manager pages
   (USFS/NPS/BLM/state parks), blogs/trip reports, Hiking Project trail pages (for the trail part). Never convert a
   distance into a time yourself, and never add legs yourself — the page must state the time.
3. Note any summit/ridge finish, glacier/snow, or lift-only access.
4. For each listed route with known_type null: Mountain Project's type (Sport / Trad / TR) for THAT exact route name;
   if the name does not match exactly, leave it null (no guessing by grade or theme).

Verdict: "crag" (a page states <=60 min from the car to the base, or roadside; no summit/glacier), "alpine" (a page
states >60 min, summit/ridge finish, glacier/snow, or roadless backcountry), "unsure" (nothing stated). If two pages
disagree across 60 min, "unsure" and quote both.

Search: the WebSearch tool budget is USED UP. Search in your Chrome tab with https://html.duckduckgo.com/html/?q=...
and open the result pages there or with WebFetch. Chrome: ONE tab of your own, reused, closed at the end; never touch
other tabs. Mountain Project rate-limits (429) — space its pages ~5 s apart, use other sites meanwhile. SummitPost 403s —
skip. CAPTCHA/Cloudflare: don't solve, note it. "Could not verify this site's safety category": wait ~45 s, retry up to
4 times. No database or repo writes.

Output: JSON array, one row per input area: {area_id, place_name, verdict, approach_stated (quote the page's own words
for the time), from (car/parking/trailhead/lift), summit_or_glacier, route_types:{route_id:"Sport|Trad|TR"}, evidence:
[{url, retrieved_at:"2026-11-18", fact <=25 words}], note}. Save after every ~5 areas. Final report <=5 lines.
