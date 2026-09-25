You are auditing climbing-route records for INTERNAL CONTRADICTIONS. This is a read-only job: no web access is needed and you must not modify any file except your own output file.

## The product
ClimbMatch's route page has sub-tabs Overview · Plan · Reports(conditions) · Safety · Partners · Photos. Each tab renders fields of ONE database row (`routes`), and many facts are stated in several fields. The owner's requirement: **every field on the route page must agree with every other field — no contradictions that would confuse a climber.** Your job is to find every place where two fields (or two parts of one field) of the same route state incompatible things.

{{TAB_MAP}}

## Input
Read these batch files (JSON; each is a list of `{area, routes:[{route, detector_hints}]}`):
{{FILES}}
`area` is the peak/crag the route is filed on (its `elevation_ft` is the summit height). `detector_hints` are candidates from a mechanical pass — some are real, some false. Verify each against the row; do not trust them blindly, and do not limit yourself to them: READ EVERY FIELD of every route (overview, beta, approach, approach_variants, climbing_route, pitch_detail, descent, descent_text, rappels, rappel_detail, itinerary incl. every schedule entry, timing incl. sectionBreakdown, waypoints incl. name/elev/distMi/directions/notes, bivy, road, access, permit, emergency, season, best_season, seasonal_guidance, seasonal_hazards, climate, hazards, obj_haz, watch_out, turnaround, bail, gear, detailed_rack, pro_needs, rope_*, what_to_bring, partner_requirements, crowds, grade + all grade columns, pitches, length_m, gain_ft, loss_ft, dist_km, high_point_ft, aspect, face, fa, etc.).

## What counts as a contradiction (report these)
Two statements about the SAME fact on the SAME route that cannot both be true, or that a climber reading both tabs would reasonably find confusing. Examples:
- a different trailhead, pass, road or approach line named in one field vs the others (e.g. itinerary says "Stuart Lake TH / reach Stuart Pass" while approach + waypoints use the Esmeralda TH over Longs Pass)
- the same named place (pass, lake, col, camp, summit, trailhead) given materially different elevations (>~250 ft) or distances in different fields
- grade disagreements: commitment grade (I–VI) in `grade` vs `commitment`/`alpine_grade`; hardest rock grade in `grade` vs `rock_grade` vs the crux pitch in `pitch_detail` vs the grade quoted in prose
- pitch count in `pitches` vs the numbered rows of `pitch_detail` vs "N pitches" in prose describing THIS line
- total gain/loss/distance/hours in the columns vs the itinerary days vs timing vs approach_variants vs prose
- start time / turnaround time disagreements; number of days (itinerary days vs "one-day"/"2-day" prose vs timing.totalHrs)
- season windows that disagree (e.g. `season` "Jul-Sep" but seasonal_guidance calls June optimal; best window outside the season). NOTE: a "best" window lying INSIDE a wider season is NOT a contradiction.
- rope length / rappel count / rappel length disagreements between kit fields and descent fields
- descent described one way in `descent` and another way in `descent_text`/itinerary/bail (e.g. walk-off vs rappels)
- hazards: "no glacier travel / N/A" while the gear or approach requires crevasse rescue or roped glacier travel; "no avalanche terrain" vs an avalanche hazard listed
- permits/fees/land manager/wilderness/ranger district/county disagreeing between permit, access, road, emergency, what_to_bring
- aspect/face stated differently in aspect vs prose ("the north face" route whose aspect is S) — only when it is clearly the same face
- first-ascent party or year for THIS route disagreeing between `fa` and prose (a peak's first ascent differs from a route's — that is NOT a contradiction if prose clearly labels it as the peak's)
- a field that describes a DIFFERENT route or peak than the one it is on (copied/contaminated text)

## What is NOT a contradiction (do not report)
- A best window inside a wider season; a range that contains the other value; rounding (5,175 vs 5,200 ft); "~" approximations within ~10%.
- A route's high point below its peak's summit when the route does not reach the summit; a traverse that crosses several summits.
- Two legitimately different approaches or descents both offered as options.
- `dist_km` being one-way in one place and round-trip in another is only a contradiction when the page would present both as the same quantity — report it with that note, but it is low priority.
- Historical facts clearly framed as history (original aid grade vs current free grade, "originally 4 pitches").
- Missing data (a field that is simply empty).

## Output
Write ONE JSON file to {{OUT}} with this shape and nothing else:
```
{"batches": [...file names...], "routes_read": <int>, "routes": [
  {"id": "...", "name": "...", "area": "...",
   "contradictions": [
     {"fact": "short name of the fact in dispute, e.g. 'Longs Pass elevation'",
      "severity": "high|medium|low",   // high = could mislead a party's plan/safety (wrong trailhead, grade, rope, descent, gain/time off by >25%)
      "claims": [ {"field": "exact path, e.g. itinerary.days[0].schedule[0].detail", "says": "short verbatim quote or value"}, ... ],
      "why": "one sentence",
      "internal_resolution": "if the row itself clearly shows which claim is right (e.g. 4 fields + waypoints agree, one outlier), say which and why; else null",
      "needs_research": true|false
     }
   ]}
]}
```
List EVERY route you read in `routes`, including ones with an empty `contradictions` array (so coverage can be verified). Quote values exactly so a later script can locate them. Be exhaustive and precise; do not report stylistic differences.
