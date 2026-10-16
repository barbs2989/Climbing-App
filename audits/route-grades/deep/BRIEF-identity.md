# Deep research — route identity

Each input row is a route page in a Washington climbing catalog that an earlier pass flagged
(`flagged`): possibly a duplicate of another row, misnamed, or describing a different route from
its name. You get its current content and every other route on the same area
(`siblings_on_same_area`: `id | name | grade | fa`). A duplicate can also sit on a DIFFERENT area
(another spelling of the peak) — search for it if the flag says so.

Research ONLINE (Mountain Project, SummitPost, Peakbagger, CascadeClimbers, NWHikers, The
Mountaineers, AAJ, guide services, Beckey as quoted) and decide what this row really is. Do not
modify any database or repo file other than your output.

## Verdicts (pick one)

| verdict | meaning | `action` |
|---|---|---|
| `DUPLICATE` | this row and another row are the same climb | name the row to KEEP (`keep_id`) and the one to fold in (`merge_id`), and why (better name, richer content, correct peak) |
| `PART_OF` | not a standalone route — a variation, start, finish or crux section of another row | `parent_id`; say whether to fold it in or keep it as a named variation |
| `MISNAMED` | a real, distinct route, but the name (or the id's direction word) is wrong | `correct_name` as climbers call it |
| `WRONG_CONTENT` | the name is a real route, but the page's prose/grade/fa describe a different route | `content_belongs_to` (sibling id or route name) and what THIS route actually is: one-paragraph description, grade, fa — from sources |
| `DISTINCT` | the flag was wrong; both are real separate routes | one line on how they differ |
| `NOT_FOUND` | no evidence the route exists as described | what you searched |

Ids are derived from names and never change; a rename changes `name` only.

## Output

Write a JSON array to the path you are given, one object per input row, same order:

```json
{"id":"...", "verdict":"DUPLICATE", "keep_id":"...", "merge_id":"...", "parent_id":null,
 "correct_name":null, "content_belongs_to":null, "what_this_route_is":null,
 "confidence":"high|medium|low", "evidence":"2-3 sentences", "sources":["https://..."]}
```

`what_this_route_is` (only for `WRONG_CONTENT`): `{"overview":"2-4 sentences for a climber, no
source names, no 'according to'","grade":"one final grade per ../research/BRIEF.md","fa":"party, year"}`.
Never invent URLs; every non-NOT_FOUND verdict needs at least one source you actually saw.
