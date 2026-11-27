# Camp nights research brief (owner note 2026-11-26)

The owner asked: for every multi-day route, say WHERE PARTIES CAMP EACH NIGHT ("night 1 most
parties camp at X, night 2 at Y"), and for the other camps give the reason a party would pick them
instead. You research one batch file of routes and write one output file. Nothing else.

## Input

`input/bNN.json` — an array of routes. Each has its `trip_plan` (the app's published day-by-day
plan; `days.length` days means `days.length - 1` nights), `camps_on_file` (the camps the route page
already lists, with role `main` = where most parties sleep, `route` = other option), and
`campsite_pins` (map pins). Routes on the same peak share camps; research a peak once.

## What to research (online, for real)

For each route: on a typical trip of THIS trip plan's length, where does a party sleep each night?
Use web search: trip reports (CascadeClimbers, Summitpost, Peakbagger, Mountaineers, NWHikers,
personal blogs), land-agency pages (NPS, USFS, wilderness permit pages), guidebook summaries.
Confirm with at least two independent sources where they exist.

EFFORT IS REQUIRED, NOT OPTIONAL: for EVERY peak in the batch run at least 3 searches (e.g. "<peak>
<route> trip report camp", "<peak> high camp", "<approach trail> camp") and actually FETCH and read
at least 2 pages (Summitpost route pages, Peakbagger trip reports, CascadeClimbers / NWHikers
threads, personal blogs, agency pages). Search-result snippets alone are not research. Mountaineers
pages return 403 — skip them. Only mark `low` after that effort found nothing. Guidebooks are the source of truth
when sources disagree. Do not guess: if you cannot confirm a night's camp, say so (`confidence:"low"`).

## Output: `output/bNN.json`

```json
[
 {
  "id": "wa_glacier_peak_cool_glacier_gerdine",
  "camps": [
   {"name": "Glacier Gap", "nights": [1, 2], "role": "main",
    "why": "The high camp for this side of the mountain: running meltwater, rock-walled tent sites, and it puts the summit within one long day."},
   {"name": "Mackinaw Shelter camp, North Fork Sauk", "nights": [1], "role": "route",
    "why": "Five flat miles in; parties starting late or wanting a four-day trip stop here and carry to Glacier Gap the next morning."}
  ],
  "new_camps": [],
  "confidence": "high",
  "plan_conflict": null,
  "sources": ["https://...", "https://..."]
 }
]
```

Rules for each field:

- `name` MUST be copied exactly from `camps_on_file` (or `campsite_pins`). Every camp on file must
  appear once, so each one gets a `why`.
- `nights`: the night numbers of THIS trip plan (1 = the night after day 1, up to days-1). Use `0`
  for a campground the party sleeps at THE NIGHT BEFORE day 1 (a car campground at the trailhead).
  `[]` if the camp is not slept at on a normal trip of this plan (e.g. a camp for a different
  approach, or an emergency bivy) — the `why` then says when it is used.
- EVERY night 1..days-1 needs a main camp. The commonest miss: a 3-day plan (in, summit, out) has
  TWO nights — the summit day returns to camp, so the high camp is usually `nights: [1, 2]`.
  Read each day's title/objective to see where it ends. If the plan's day N walks out to the car,
  night N does not exist in practice — then say so in `plan_conflict` and still give night N a
  main (the camp the plan's day N ends at).
- `role`: `main` = where most parties sleep on the night(s) listed. EXACTLY ONE `main` per night of
  the plan (night 1..days-1). `route` = another option for those nights (or for none). Change a
  role from what is on file when research shows it is wrong, and say so in `plan_conflict`.
- `why`: OUR OWN WORDS, 60-220 characters, one or two sentences, written for a climber choosing
  where to sleep: what this camp gives you (water, shelter, distance to the climb, an earlier
  start, space, a shorter day) or what it costs, compared with the other camps. Never name a
  source, a website, a guidebook, an author or "trip reports say"; no emoji; no ALL CAPS; no
  copied sentences (facts may come from a source, sentences may not — never 8+ words in a row
  from a page). State facts plainly; no "reportedly", "according to".
- `new_camps`: ONLY when a night of the plan has no camp on file at all (common where
  `camps_on_file` is empty). Full entry: `{"name","elev_ft","type":"camp|bivy|hut","role","nights",
  "why","water","capacity","permit","notes"}` — `water`/`capacity`/`permit` are short plain
  sentences, `notes` 1-3 sentences. Same writing rules. Elevation from a map/agency source, feet.
  NEVER guess: a new camp with no researched elevation will be refused, and a water/capacity/permit
  line you did not find a source for must be "" (empty), not a plausible sentence. Many sites
  (SummitPost, CascadeClimbers, WTA) 403 on fetch — use Peakbagger, NWHikers, blogs, agency pages.
- `confidence`: `high` (2+ sources agree on the nights), `medium` (one good source, or sources
  agree on the camp but not the night), `low`.
- `plan_conflict`: one sentence if the trip plan's day titles, or a camp's notes on file, disagree
  with where parties actually sleep (e.g. notes say "first night here" but the plan walks past it
  on day 1). null otherwise.
- `sources`: URLs you actually used (for our records only — never shown in the app).

Write valid JSON (check it with `node -e 'JSON.parse(require("fs").readFileSync(F))'`). Work
through every route in the batch; do not stop early. Reply with only: routes done, how many low
confidence, and any plan_conflicts in one line each.
