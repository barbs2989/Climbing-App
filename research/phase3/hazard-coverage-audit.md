# Do WA alpine hazard write-ups cover the terrain? — audit, 2026-07-29

Every WA alpine / mountaineering / ice / mixed route already has `routes.hazards`
populated — 614 of 614. Repeated enrichment rounds treated that as the finish line. This
audit asks the question nobody asked: **does the prose that's there warn about the things
that kill people in that terrain?**

Run it with `node scripts/audit-hazard-coverage.mjs`. Read-only; it writes a JSON gap list
and touches no route data.

## Headline

| zone | routes | cover every core hazard | with a gap |
|---|---|---|---|
| Glaciated volcanoes (Rainier, Baker, Adams, Glacier Pk) | 41 | 10 | **31** |
| North Cascades glaciated peaks | 30 | 2 | **28** |
| Stuart Range / Enchantments | 43 | 13 | **30** |
| Washington Pass spires | 53 | 9 | **44** |
| Olympics | 16 | 4 | **12** |
| St. Helens (non-glaciated) | 2 | 1 | 1 |
| **total zoned** | **185** | **39** | **146** |

429 of the 614 routes sit outside these six zones and were not judged — the zones cover
the terrain types where a specific hazard is genuinely predictable from the peak.

## The findings that matter

**Six glaciated-volcano routes and ten North Cascades glaciated routes never mention
crevasses or snow bridges anywhere in their hazard prose.** On a glacier route that is the
hazard that kills people. Worst example: `wa_forbidden_peak_northwest_face`, whose entire
hazard list is `"mixed snow/ice/rock"`, `"route-finding on a big face"`, `"shaded, cold
aspect"` — three statements of terrain type, no warning of any kind, on a serious
glaciated alpine face.

**Descent is the systematic gap on rock.** 40 of 53 Washington Pass spire routes and 28 of
43 Stuart/Enchantments routes say nothing about descent or retreat. These are peaks where
the descent — rappel routes off Liberty Bell, the Cutthroat rappels, getting off Prusik —
is the crux of the day and a recurring accident setting.

**Remoteness is the systematic gap in the backcountry.** 25 of 30 North Cascades glaciated
routes and 12 of 16 Olympics routes never mention that help is far away.

**Two routes have hazard entries that warn about nothing at all**, so they look covered
while telling a climber nothing: Forbidden NW Face (above) and
`wa_energizer_bunny` on Prusik ("Dirt/lichen reported on the lower pitches given the
route's relative obscurity").

## What this is not

**These are candidates for review, not confirmed omissions.** A zone cannot know whether a
specific line crosses a glacier — that is exactly the assumption that produced the
`hazard_tags` mess (glacier hazards on Arizona boulder problems, see
`hazard_tags-README.md`). Some flags will be correct absences: a route that genuinely
avoids the icefall shouldn't warn about it.

So this output is a **worklist for per-route research**, not a basis for bulk writes. Do
not turn `coreGaps` in the JSON into an `UPDATE`.

## How the checks were tuned, and what that cost

The first pass reported 0 of 192 routes fully covered, which is a broken test rather than
192 broken routes. Four corrections, each of which shrank the finding:

1. **Zone matching caught crags.** "Shuksan Crag", "Cutthroat Wall" and "Cutthroat Creek
   Wall" share a name with the peak but are bolted crags. Now requires `area_type='peak'`.
2. **Altitude and weather were demoted to context.** Requiring every route to mention them
   produced most of the noise; hazard prose reasonably covers terrain, and WA summits are
   too low for altitude to be the limiting factor. Same for river crossings in the
   Olympics, which would have flagged roadside peaks like Ellinor while being real for the
   Hoh interior.
3. **St. Helens was split out.** It lost its glaciers in 1980; its routes cross snowfields
   and rubble. Expecting a crevasse warning there manufactures a gap.
4. **"loose rock" was too literal.** Real entries say "loose/dirty rock", "loose scree",
   "loose blocks". 192 -> 146 flagged routes across these fixes.

The "warns about nothing" check went through the biggest change. Keyword matching was
useless: a vocabulary wide enough to admit "creek crossing" and "confirm bolt/anchor
condition" (genuine warnings) also admits "mixed snow/ice/rock". The test is now whether a
sentence expresses **risk** — a modal or an instruction to the climber — or names a hazard
outright. That took the flag list from 24 routes to 2, both of which survive manual review.

## Suggested next step

Work the 16 glacier-route crevasse gaps first — smallest list, highest consequence, and
each one is a specific question a guidebook can answer. Then descent on the Washington
Pass spires, where the gap is widest.
