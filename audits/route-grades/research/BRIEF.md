# Route-grade research brief — WA mountain routes

You are auditing the difficulty grade of Washington mountaineering / alpine / scrambling / ice routes
in a climbing app. Each input row is ONE route (`id`, `route` name, `peak`, current grade columns,
a short `overview`, and `breakdown_grades` from its section-by-section beta). Research each route
ONLINE and decide its single FINAL grade. Do not touch any database or repo file other than your
output file.

## The final grade (what the app filters and sorts on)

ONE value, the route's **crux** — the hardest move or pitch on the normal line of THIS route —
taking the **top of any range** ("Class 2-3" → `Class 3`, "5.4-5.6" → `5.6`). Exactly one scale:

| scale | value form | use when |
|---|---|---|
| `yds` | `5.0`…`5.15d` (letters/`+`/`-` only if sources give them) | the crux is 5th-class (roped) rock |
| `wi`  | `AI1`…`AI6` or `WI1`…`WI7` | no 5th-class rock, and the crux is graded alpine/water ice |
| `class` | `Class 1`…`Class 4` | everything else: trails, scrambles, glacier and snow climbs |

- If a route has both 5th-class rock and graded ice, use the scale of whichever pitch sources call
  the crux (default to `yds` if unclear) and mention the other in `note`.
- Non-technical glacier / snow climbs: `Class 2`, unless sources give a Class rating, or the route
  has a rock scramble that is harder (DC on Rainier is `Class 3`: Class 2 with occasional Class 3
  moves on the Cleaver). Steep snow that sources say needs front-pointing or belays and has no ice
  grade: `Class 3`. Say in `note` when you mapped a snow term (Mountain Project "Easy/Mod/Steep Snow").
- "Low 5th" with no number anywhere: use the most commonly cited number; if none exists, `5.0`
  with confidence `low`.
- Unroped scrambling tops out at `Class 4`. A "Class 4" crux reported by several sources as low
  5th is `5.0`–`5.4` per those sources.
- A commitment numeral (Grade II, III…) or a French grade (F/PD/AD) is NOT a final grade. Use them
  only as evidence.
- If sources disagree, prefer route-specific sources in this order: Mountain Project, SummitPost,
  The Mountaineers route pages, Peakbagger trip reports / NWHikers / CascadeClimbers, Beckey's
  *Cascade Alpine Guide* as quoted online, NPS/USFS route briefs. Do not just copy the app's
  current value; it is what is being audited.

## Also check (only what your research touches anyway)

- `rock_grade`: if it states a difficulty your sources contradict (e.g. DC said "3rd-4th class"),
  give a corrected short value in `fix.rock_grade`, keeping its style ("Class 2-3 (loose scree)").
- Any other grade column that is clearly wrong for THIS route (`alpine_grade`, `ice_grade`,
  `commitment`): put the corrected value in `fix`, or `null` to clear one that contradicts the
  record (like an ALPINE "III" beside a COMMITMENT "II" on a route sources call Grade II).
- `identity`: if the overview/breakdown seems to describe a DIFFERENT route from the name, or two
  routes merged, say so in one sentence. Otherwise omit.

## Output

Write a JSON array to the output path you are given, one object per input row, same order:

```json
{"id":"...", "final_grade":"Class 3", "scale":"class", "confidence":"high|medium|low",
 "sources":["https://..."], "evidence":"one short line: what the sources say",
 "fix": {"rock_grade":"Class 2-3 (loose rock rib)"}, "note":"...", "identity":"..."}
```

Every row needs at least one source URL you actually opened or saw in search results, except where
the route cannot be found anywhere — then `final_grade` is your best reading of the record's own
columns, `confidence` is `low`, and `sources` is `[]`. Do not invent URLs. Do not put source names
into any `fix` value (the app shows no sources). Keep going until every row is answered.

## Skip

Rows with `discipline: "mixed"` (drytooling crags) are out of scope: output
`{"id":"...","final_grade":null,"scale":"skip"}` for them without researching.
