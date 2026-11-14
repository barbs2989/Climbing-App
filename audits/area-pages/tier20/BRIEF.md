# Area-page research brief (ClimbMatch, crag ABOUT text)

You research a batch of climbing areas (crags / walls / peaks) and write ONE JSON batch file.
Input: an `in-uNN.json` file (array of areas). Each has id, name, region (state), parent (the area it sits under),
lat/lng, route_count, what is already stored (approach, approach_min, parking_name, parking_note, rock, aspect,
season_months, disciplines) and `stats` (our own climb counts by discipline and grade, from our catalog).

For EACH area:
1. Use WebSearch / WebFetch to find at least TWO independent pages that describe THIS place (Mountain Project
   area page, theCrag, a land agency, a local climbing coalition, a guidebook publisher page, a regional
   climbing site). Confirm it is the same place: name, state, parent area, and the coordinates roughly agree.
   If you cannot find two pages that describe it, or it is closed to climbing / on private land with
   climbing banned, put it under `_skipped` with a one-line reason and move on.
2. Write `blurb`: 60-130 words, ENTIRELY IN YOUR OWN WORDS, plain and practical, for a climber deciding
   whether to go: what and where the place is (town / canyon / land unit), the type of climbing and the grade
   spread (use OUR `stats` for numbers; describe them, don't dump them), the rock and style, the character
   (sun/shade, height, crowds, beginner-friendly or not). NO access rules, closures (raptor or other), fees,
   passes, permits, opening hours or landowner notices: area pages carry none (owner rule). No first-ascent history. Do not name individual climbs.
3. Only for columns that are EMPTY in the input, and only where two sources agree, also add:
   - `parking_note` (5-400 chars): where to leave the car and how to drive there, in your own words.
   - `approach` (≤600 chars): the walk from car to the base. `approach_min`: whole minutes, only if stated.
   - `rock` (≤40 chars, lower case, e.g. "granite", "sandstone", "limestone").
   - `aspect`: one of N NE E SE S SW W NW varies.
   - `season_months`: array of ints 1-12, the good months.
   If a stored value is CONTRADICTED by your sources, do not change it: note it under `_conflicts` with the URLs.
4. HARD RULES (the apply script refuses violations):
   - Never name or allude to a source in any field: no "Mountain Project", "guidebook", "according to", "source",
     "theCrag", "SummitPost", "OpenBeta", "27crags".
   - NO run of 8 or more consecutive words may match any page you list in `review.sources`. Paraphrase fully;
     re-read your sentences against the pages before writing the file.
   - No ALL-CAPS words (except normal abbreviations like WI5, US, NF), no emoji, no grade invented beyond `stats`.
   - Never guess. A fact not confirmed by your sources is left out.
5. Output file: `audits/area-pages/tier20/batch-uNN-<state-slugs>.json` in the worktree given to you, shape:
```
{
 "<area id>": { "_expect": { "name": "<exact name from input>", "region": "<exact region>" },
   "blurb": "...", "parking_note": "...", "approach": "...", "approach_min": 20, "rock": "granite",
   "aspect": "S", "season_months": [3,4,5,9,10,11],
   "review": { "sources": ["https://...", "https://..."] } },
 "_skipped": { "<area id>": "why" },
 "_conflicts": { "<area id>": "what disagrees, with URLs" }
}
```
   Omit keys you are not filling. `review.sources` must list the real URLs you read (they are fetched to check
   copying; an unreadable list gets the entry refused).
6. Do NOT touch the database and do NOT run git. Write only the batch file(s) you are asked for.
   Reply with a one-line summary per batch: written N, skipped N, conflicts N.

## Reading `stats.by_grade`
Each entry is `{sys, bucket, n}`: n climbs whose grade falls in that bucket. Buckets are whole grades:
- `yds`: bucket 9 = 5.9, 10 = 5.10a-d, 11 = 5.11, ...; buckets 0-4 are Class/4th-class terrain, not 5.x.
- `v`: bucket 3 = V3; -1 = VB.  `wi`: bucket 4 = WI4.  `m`: mixed M-grades.  `aid`: A/C grades.
`stats.by_disc` gives climbs per discipline. `total` minus `graded` = climbs with no readable grade.
Describe the spread in words ("mostly V2 to V5, with a few harder problems"); never state a grade outside these buckets.

## Fetch, don't skim (added after wave 1)
A search-result snippet is NOT a source. For every area you WRITE, you must have opened at least TWO pages
with WebFetch and read them; only fetched pages go in `review.sources`. If you cannot fetch two pages that
describe the place, put it under `_skipped` ("could not fetch two pages"). Expect to spend 3-6 tool calls per area.
- Never refer to "our catalog", "our listings", "the sources" or "the pages": write as a description of the
  place ("This crag has 27 sport routes..."). Never state fees, passes or permit prices.
