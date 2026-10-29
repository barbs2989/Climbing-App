# Fill missing getting-there text — brief for each research agent

Research only. Do not touch any database, app code, or git.

A climbing app shows, on each route, a **trailhead** name, a short **driving direction** to it, and
an **approach** paragraph (trailhead to the start of the climb). The routes in your batch file have
none of the three. Each entry carries: `id` (copy it back), `name` (the route), `peak`, `range`,
the peak's `lat`/`lng`, and `siblingTrailheads` / `siblingApproaches`: what OTHER routes on the same
peak already show. The sibling drives were checked online on 2026-10-28; treat them as a strong
starting point, not as proof that THIS route uses the same trailhead.

## For each entry

1. Find out which trailhead THIS route is climbed from, and how a party walks from it to the start
   of THIS route. Use Mountain Project route pages (fetch the route page itself: its Description
   and "Location" sections say where it starts), Washington Trails Association hike pages, US Forest
   Service and National Park Service pages, SummitPost and Peakbagger. WebSearch (mode "extended"
   when standard is thin), then WebFetch the page.
2. If the route uses a sibling's trailhead, copy that trailhead name **character for character**
   (the app joins them by name) and reuse the sibling's drive if it is a real drive; if the
   sibling text is not a drive (it describes a trail, a bearing or only names the place), write the
   drive from a fetched page.
3. If the route name or the peak looks misfiled (a route that belongs to a different mountain),
   do not research it: `found: false`, `note: "misfiled: <why>"`.

## Writing

- `trailheadDirection`: one to three sentences of DRIVING ONLY. Start at a named town or highway
  junction, end at the trailhead parking. Road numbers, turns and mileages only as a fetched page
  gives them. Mention a year-round or current closure, dated ("closed since <month year>").
  It must not describe walking, a trail, a lake, a pass or the climb.
- `approach`: two to five sentences, trailhead to the base of THIS route: trail names, the junction
  or point where you leave the trail, the basin, glacier, gully or col you reach, and where the
  climb starts. **It must contain the trailhead name exactly as in `trailhead`.** Distances, gains
  and times only as a fetched page gives them. Stop at the base of the climb — no pitch beta.
- **Your own words.** Never copy a phrase of 8 or more words from any page (this is checked by
  machine against every page you cite, and the entry is refused). No quotes, no "according to",
  never name or link a website, guidebook, app or person in the text. No coordinates, no emoji,
  no ALL CAPS.
- `numbersUsed`: EXACTLY the digit groups that appear in `trailheadDirection` + `approach`
  ("SR-20" → "20", "FR 4616" → "4616", "2.5 miles" → "2.5", "5,400 ft" → "5400"), each once.

## Evidence rule

- Every `found: true` needs at least one page you actually opened with WebFetch that describes
  THIS route's approach (a snippet is not enough; a page about a different route on the same peak
  is not enough for the approach, though it may support the drive). List only fetched pages in
  `sourceUrls`, approach sources first.
- `confidence`: `high` = the route's own page plus an agreeing second page, or an official page;
  `medium` = one good page that describes this route's approach; `low` = inference from sibling
  routes or a vague page. Low is never written, so be honest — it is better than a wrong approach.
- If you cannot find it, `found: false` with a one-line `note`. Do every entry; if you run out of
  time, mark the rest `found: false`, note "not checked".

## Output

Write a JSON array to the output file named in your prompt, one object per input entry, same order.
Rewrite the file after every 8 entries so partial work survives an interruption.

    { "id": "<copied>", "found": true|false, "trailhead": "<name>",
      "trailheadDirection": "<drive>", "approach": "<prose>",
      "numbersUsed": ["..."], "confidence": "high"|"medium"|"low",
      "sourceUrls": ["..."], "note": "<one line: what you relied on, or why not found>" }

Return to the caller only: counts by found/confidence, and a one-line list of misfiled entries.
