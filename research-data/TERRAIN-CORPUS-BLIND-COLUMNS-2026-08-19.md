# The terrain classifier could not see two of the columns it classifies from

2026-08-19. Read-only investigation of `audit:terrain`, which had never been triaged.

## What the audit was actually reporting

`audit:terrain` does not report a data backlog. It measures the app's own **suppression**:
how many routes `lib/terrain.js` withholds glacier/avalanche advice from, because that route
does not cross the terrain the advice is about. 106 WA routes, 214 advice lines, 111 gear
items. All of that is the fix from an earlier pass working.

The question it never asks is whether a suppression is **correct**, and the two directions
are not symmetric. `lib/terrain.js` says so in its own header:

> Wrongly dropping a crevasse warning from a glaciated route is dangerous; wrongly keeping
> one on a rock route is merely noise.

So the only question worth asking of this audit is: **is any suppression wrong?**

## First pass: the suppressions that exist are right

The two suppression classes were checked separately.

**44 routes classified "reads as rock"** — the largest suppression (-3 advice, -2 gear each).
Every one resolved to a summer rock climb: rock shoes, cams and nuts, Jun–Sep seasons, at
Roan Wall, The Monk, Cutthroat Wall, M&M Wall, the Early Winters Spires. Two names looked
wrong and were not — Chair Peak's *Northwest Ridge* is the 5.7 summer rock line rather than
the winter ice route, and the *Tooth–Chair Traverse* is 5.4 on a small rock rack.

**62 routes suppressed on their own row saying N/A** — the safest available basis, and the
classifier already handles the case where a row contradicts itself, resolving a conflict
**upward** to "unknown" rather than trusting the summary field.

Lane Peak's *The Fly* looked like the exception. Its own row says "Runout zone at base can be
avalanche-prone", "avalanche terrain (loose-dry and wet-loose problems documented on this
aspect)", and lists "avalanche gear" in what-to-bring — and it is in the suppression list. It
is **not** a defect: the one line dropped is the serac/icefall line, correctly dropped for a
non-glaciated couloir, and its avalanche advice is kept. Worth recording because it is the
most alarming-looking row in the output and reads as a bug until you check which line went.

## The real defect: evidence in a column the classifier does not read

A glacier line can only be dropped when `GLACIER_RE` finds nothing in `corpus()`. So a wrong
suppression cannot come from the regex being too narrow on text it **has** — it can only come
from evidence in a column `corpus()` never looks at. That makes the blind-column set the whole
attack surface, and it was two columns long:

| column | created by | read by corpus()? |
|---|---|---|
| `climbing_route` | migration **0122** | no |
| `approach_variants` | enrichment | no |

`climbing_route` was created **to re-home climbing prose out of `approach`** — and `approach`
*is* read. So every route the enrichment touched moved its snow and glacier sentences out of a
column the classifier could see and into one it could not.

**9 WA routes were live**: the classifier was suppressing snow or avalanche advice on the
strength of a blind spot. Their own text, on screen, said otherwise:

- `wa_roan_wall_center_stage` — *"Residual avalanche snow at the base for much of the season"*
- `wa_roan_wall_stage_right` — *"Residual avalanche snow at the base"*
- `wa_flight_of_the_falcon` — *"Residual avalanche snow at the base early in the season"*
- `wa_rapple_grapple` — *"Early-season snow and rockfall in the approach gully"*
- `wa_dragontail_peak_backbone_ridge` — *"Colchuck Glacier moraine"*, *"a perennial snow patch sits below the start"*
- `wa_chair_peak_northwest_ridge` — *"the climbers' path and snow up the broad basin"*
- `wa_king_kong_gorillas_direct_direct` — *"1,000 ft of rock rising straight out of the snow"*
- `wa_northwest_face_2`, `wa_burgundy_spire_north_face`, `wa_prusik_peak_west_ridge`

Nothing reported this and nothing could. The column was populated, the screen rendered it,
every coverage check was green. Only the classifier was blind. Same shape as `descent_text`
populated on 1,021 routes and rendered on none — the data was right, the reader was never told.

### Two of the ten are landmark mentions, not terrain crossed

Reported rather than hidden, because a fix whose findings are all quoted as wins is a fix
nobody has read:

- `wa_burgundy_spire_north_face` — *"the Silver Star Glacier lies below on the far (east)
  side"*. That is a **navigational landmark** used to confirm you are at the right col, not a
  glacier the party crosses.
- `wa_prusik_peak_west_ridge` — *"the hidden creek running beneath the talus is a real hazard
  where snow bridges it"*. A creek under snow, not a crevasse.

Both only move glacier `no → unknown`, which **softens** the advice rather than asserting it.
That is the noise direction the module explicitly accepts.

## Measured effect

610 WA snow-discipline routes, `routeTerrain` run twice per route — once on the row, once with
the two columns nulled — so before and after come from the same code path on the same data.

```
10 of 610 routes changed verdict on at least one axis
  toward keeping advice (safe direction):                10
  toward dropping advice (the direction that can hurt):   0
```

Audit totals: `glacier=no` 112 → 104, `snow=no` 54 → 47, routes with suppressed advice
106 → 98. **22 advice lines and 14 gear items restored.**

And a verdict is not a screen, so it was rendered. `RouteDetail` over the real row, both ways
from one bundle: *"Check the avalanche forecast"* is on the Safety tab after the fix and absent
before, on Roan Wall Center Stage, Rapple Grapple and Chair Peak NW Ridge. Absent on Overview
either way, which is correct — that panel lives on Safety.

## The obvious general fix is measurably WRONG — do not re-derive it

Naming a third column fixes today and leaves the trap armed for the fourth. The
by-construction answer is to invert `corpus()`: read every value on the route except a short
deny-list, so a new prose column is picked up the day it appears.

**Measured, and it is much worse than the bug.** Over 296 WA alpine routes with every column
selected, **112 (38%) would gain a new glacier/snow signal** from columns nobody considered:

```
  55  bivy              26  access             4  emergency        2  partner_requirements
  55  seasonal_hazards   7  waypoints          3  data_quality     1  rappel_detail
```

The worst is `seasonal_hazards` — **the column holding the "avalanche: N/A" declaration
itself**, read structurally by `saysNotApplicable()`. Reading its text as prose would make
every row that declares avalanche *absent* read as avalanche *present*, disabling the
mechanism it belongs to. The inversion is not a safer default; it destroys the classifier's
ability to discriminate at all.

So the allow-list stays, and the recurrence protection had to be something else.

## What was changed

**`lib/terrain.js`**
- `corpus()` reads `climbing_route`, and reads `approach_variants` **by key** — `name`,
  `notes`, `hazards`, `baseFinding` only. Flattening the object would pull its `season` key
  into the corpus and re-import the Highway 20 mistake under a new name: a dry summer rock
  climb kept an ice axe purely because its itinerary noted the highway "closes with the first
  heavy snow".
- Seven more columns joined, and this is the honest part: **they change zero verdicts today.**
  `rope_note`, `sling_rack`, `rope_type`, `ascender` sit beside `gear`/`rack`/`detailed_rack`,
  which are read; `rappels`/`rappel_count_note` sit beside `descent`/`descent_text`, which are
  read; `face` describes the wall the route climbs. The omission was arbitrary rather than
  principled, and the measured cost of closing it is nil.
- The key list is now `export const CORPUS_COLUMNS`, a single source of truth, with the
  camelCase spelling **derived** rather than listed — so a column added to it cannot be
  half-wired. Proven behaviour-neutral: identical before/after numbers across the refactor.
- Three stray `\x01` control bytes in the join separators, committed on main, normalised to
  spaces. Every one had a space on both sides, so `\b` and `\s` behave identically — byte
  hygiene in a safety classifier, not a behaviour change, and asserted as such in the patch.

**`scripts/audit-route-terrain.mjs`** — a **blind-column scan** that asks this question every
run, because a comment saying "add new prose columns to CORPUS_COLUMNS" would rot exactly the
way the last one did.

It samples full rows, finds every column outside the classifier that carries glacier or snow
prose, and requires each to be declared in `NOT_TERRAIN_EVIDENCE` **with a reason**. The
declaration is demanded **late** on purpose: a column needs an entry only once it is both
populated *and* carrying a terrain word — precisely when it could change a verdict, and not
before. A column that can never affect the classifier never appears, so the list stays at the
23 that matter instead of growing to all 94 on the table. A **stale** entry — declared but no
longer carrying terrain prose — is reported too, so the list cannot rot into a description of
data that has moved on.

Injection-tested 4/4 (`scripts/oneoff/inject-terrain-blind-scan-cases.mjs`), each case proving
its edit landed **by checksum** before judging the scan. Case 4 must **pass**: a healthy tree
reports every carrying column as declared. Case 3 removes `approach` from `CORPUS_COLUMNS` and
requires it to surface as unread — i.e. the scan sees the general defect, not just this one.

## Still open

The audit's headline count is unchanged in kind: 98 WA routes still have advice suppressed,
and every one checked was correct. **That number is not a backlog.** It is the measure of a
working feature, and driving it toward zero would mean handing every dry rock climb a
crevasse kit again.
