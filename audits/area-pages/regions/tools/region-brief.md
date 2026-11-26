# Region-page research brief (ClimbMatch, REGION "About" text)

You research a batch of climbing REGIONS (a parent area that holds many crags / sub-areas, e.g. "Red River Gorge",
"Joshua Tree National Park", "Boulder" in Colorado, "Northern WV") and write ONE JSON batch file.
A region page in the app shows only its description (`blurb`); nothing else you find is written.

Input: `in-rNNN.json`, an array. Each region has id, name, region (the state/province), parent, breadcrumb, lat/lng,
route_count, `stats` (our own climb counts by discipline and grade over the whole region), `biggest_sub_areas`
(its largest children with their climb counts) and `researched_rocks_below` (rock types already researched on crags inside it).

## For EACH region, one by one
1. At least TWO web searches (e.g. `"<name>" <state> rock climbing` and `"<name>" climbing area <parent>`), then
   FETCH candidate pages (WebFetch): a land agency (NPS / USFS / BLM / state park), a local climbing coalition, a
   regional climbing site, a guidebook publisher's page, Wikipedia, theCrag, 27crags, a climbing magazine or blog.
   Mountain Project often refuses fetches; try it, but do not depend on it. A search SNIPPET is NOT a source.
2. You need TWO different fetched pages that are about THIS region (or that clearly describe it as a whole),
   and the place must match: same state, roughly the input's coordinates, and sub-areas that agree with
   `biggest_sub_areas`. A catalog grouping with a generic name ("Southwest Region", "Northern WV", "Central-West
   Cascades & Seattle") may be described from its sub-areas: then one page must be about the grouping or its main
   town/range, and the other about one of its biggest sub-areas. If you cannot get two such pages, put the id under
   `_skipped` with a one-line reason. "Not researched" or "ran out of time" are NOT allowed reasons.
3. Write `blurb`: 80-160 words, ENTIRELY IN YOUR OWN WORDS, plain and practical, for a climber deciding where to go:
   - where it is (nearest towns, range, river, land unit) and what the landscape is like;
   - what kinds of climbing it holds and the grade spread, from OUR `stats` (describe in words: "mostly sport,
     5.10 to 5.12, with a good spread of moderates"; never a grade outside the buckets, never invented counts);
   - the rock and style (only what fetched pages say; if `researched_rocks_below` lists a rock, a rock you name
     must not contradict it), and the character: the seasons it climbs best, sun/shade, how spread out it is;
   - you MAY name up to four of its biggest sub-areas from `biggest_sub_areas`, but not as a copied list.
4. HARD RULES (the apply script refuses violations, and the owner has banned the rest):
   - NO access rules, closures (raptor or other), fees, passes, permits, parking rules, hours, landowner notices.
   - No first-ascent history, no named individual climbs, no named people.
   - Never name or allude to a source: no "Mountain Project", "guidebook", "according to", "source", "theCrag",
     "SummitPost", "OpenBeta", "27crags", "our catalog", "the pages", "listed here", "in the app".
   - NO run of 8 or more consecutive words may match any page you list in `review.sources` (checked mechanically).
     Do not open with a page's own first sentence; reword location phrases fully; never keep a page's sentence shape.
   - No ALL-CAPS words (normal abbreviations like US, BLM, NPS, WI4 are fine), no emoji, no exclamation marks.
   - Never guess. A fact not on a fetched page or in the input is left out. No distances or place names from memory.
5. Output file (exact path given in your task), shape:
```
{
 "<region id>": { "_expect": { "name": "<exact name from input>", "region": "<exact region from input>" },
   "blurb": "...", "review": { "sources": ["https://...", "https://..."] } },
 "_skipped": { "<region id>": "why" }
}
```
   `review.sources` lists only real URLs you FETCHED (they are re-fetched to check copying; an unreadable list gets
   the entry refused, so prefer pages that load without a login).
6. Do NOT touch the database and do NOT run git. Write only your one batch file.
   Reply with one line: written N, skipped N, and the file path.

## Lessons from wave 1 (read these too)
- Never call the climbs "the catalog", "what is recorded", "listed" or "the data": describe the place ("Sport dominates, with...").
- A fact you only saw in a search snippet is left OUT, even if it is famous. Only fetched pages and the input count.
- A rock or style you name must hold for the part you name it for: if a region mixes rock (granite boulders,
  tuff gorge), say which sub-area has which, or name none. Never generalise one sub-area's rock to the region.
- A season sentence needs a fetched page that says it.
