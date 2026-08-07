# Class-graded routes filed under a technical discipline — full catalog audit

**Date:** 2026-08-07
**Trigger:** "Black peak east buttress is all messed up it says it class 3 and 4 but
classified as trad route… It doesn't have a plan or safety tab but has that info sprinkled
in there."
**Scripts:** `scripts/oneoff/audit-class-grade-vs-discipline.mjs`,
`scripts/oneoff/audit-plan-safety-tab-gate-impact.mjs`,
`scripts/oneoff/render-db-route.mjs`

## The named route is not the broken one

`wa_black_peak_east_buttress` was checked against the live DB and rendered through the real
`RouteDetail` with `react-dom/server`:

```
discipline: alpine   catOf: alpine   grade: null   rock_grade: "Class 3-4"
tabs: Overview | Reports | Photos | Partners | Plan | Safety
```

It is typed **alpine**, is badged **Alpine**, and **does** get both a Plan and a Safety tab.
Its class-3/4 text is in `rock_grade` and `overview`, which is correct for an alpine rock
route. Nothing to fix on this row.

## The route that matches the description exactly

`wa_south_face_7` — **Red Mountain (Snoqualmie), "South Face"**.

```
discipline: trad          <- wrong
grade: "4th"  grade_system: "class"  pitches: 0  length_m: 457
rock_grade: "Class 3-4 (optional class 4/low 5th direct finish)"
overview:  "…several class 3 pitches, typically done unroped…"
pro_needs: "No gear generally needed on the standard class 3 line…"
gear:      helmet, optional rap webbing — no rack
tabs BEFORE: Overview | Send Reports | Photos | Partners      <- no Plan, no Safety
```

`catOf()` returns `trad`, which puts it in `cragOnly`, which filters `planner` and `safety`
out of the tab strip. Both tab bodies rendered ~90 lines of real content that the app never
showed: the approach from the PCT trailhead, the class-2 west-side descent, the permit /
fees / land manager / parking-pass block, four hazards, two watch-outs, and the NWAC
Snoqualmie Pass avalanche link. The only fragment that reached the screen was the approach,
duplicated into Overview — "sprinkled in there".

## Catalog-wide sweep: 226 hits, 1 real

All 205,492 routes scanned for a class grade (`1st`–`4th`, `Class 1`–`Class 4`, or
`grade_system='class'`) under a crag discipline (`trad` / `sport` / `bouldering`):

| | count |
|---|---|
| class-graded under a crag discipline | **226** |
| …on a **crag** area, no overview, no gear, no length, `pitches: 0` | **225** |
| …on a **peak**, with an overview, gear and a length | **1** (`wa_south_face_7`) |

The 225 are the population [`class-grade-is-not-a-scramble-signal`](../CLAUDE.md) already
warned about, now confirmed catalog-wide rather than WA-only: bare OpenBeta crag imports
where the **grade** is the bad field, not the discipline. Many are literally crag descents
catalogued as routes — "Descent Route", "Approach Gully", "rap station", "Downclimb",
"Poison Ivy Gully (descent)". Reclassifying them to `scrambling` would bury real crag climbs
under the wrong filter chip and fix nothing, and there is no trustworthy source to correct
the grade from. **Left alone, deliberately.**

`wa_south_face_7` is distinguishable on every axis the others fail, matching the fingerprint
of the single real fix found in the 2026-08-05 pass. Applied via `patchRow` and reconciled by
read-back:

```
wa_south_face_7  discipline: trad -> scrambling
```

## The bug behind the symptom is in the UI, not the data

One wrong row is not what "audit all routes for this mistake" is really about. The reason a
single mislabelled discipline could hide an entire researched route is that
**`cragOnly` gated the Plan and Safety tabs on the discipline string alone**. Any route
whose discipline says crag loses both tabs, however much planning and safety data it holds.

Measured across the catalog, with the predicates now in `RouteDetail.jsx`:

| | count |
|---|---|
| crag-discipline routes (tabs hidden) | 198,568 |
| …carrying route-specific plan or safety content that never rendered | **269** (0.14%) |
| …gaining a Plan tab | 256 |
| …gaining a Safety tab | 256 |
| …gaining both | 243 |
| …with a research `source` **or** both kinds of content | 249 |
| of the 269, in WA | 257 |

Examples: `wa_north_face_of_the_mole`, `wa_colchuck_balanced_rock_west_face`,
`wa_kangaroo_temple_north_face`, `wa_olympus_summit_block_north_face`,
`wa_amphitheater_mountain_north_buttress`. These are alpine-rock routes whose `trad`/`rock`
discipline is **correct** — the discipline is not the bug. Each was hiding road access,
approach, descent, waypoints, rappels, objective hazards, bail points and comms.

### Fix

`hasPlanContent()` / `hasSafetyContent()` in `RouteDetail.jsx`. A crag route gets the tab
back when it has content to put in it, and a bare one still gets neither — an empty Plan tab
is worse than no Plan tab.

Two things the predicates deliberately exclude:

- **`access` and `hazards`.** Both render, but at Index, Skykomish and other enriched crags
  they hold area-level boilerplate copied verbatim onto every route in the crag (one shared
  "Northwest Forest Pass required…", one shared loose-rock sentence). Counting them took the
  affected population from 269 to **4,568** routes whose whole new tab was one duplicated
  paragraph. They still render once a route qualifies on something route-specific.
- **Fields whose planner sections sit behind their own `!cragOnly` check** (itinerary,
  timing, route track, time-to-summit). Gating on those would open a tab that stays blank.
  Which field renders on which tab was measured, not assumed:
  `scripts/oneoff/measure-which-tab-renders-each-field.mjs`.

Two follow-on corrections fell out of the same read:

- `CragSafetyNotes` is rendered both inline on Overview (#655) and at the top of
  `SafetyMatrix`. A crag route that now gets a Safety tab would have printed it twice, so
  the inline copy is kept only when there is no Safety tab to hold it.
- The KNOWN HAZARDS box renders `watchOut` but was not part of its own condition, so a route
  with watch-outs and no hazards printed none of them.

All of the above is guarded in `check:bare` (a build gate), and the guard was injection-
tested: reverting to the discipline-only gate trips 3 assertions, opening the tabs
unconditionally trips 5, and restoring the old hazards-box condition trips 1.

## Not fixed, worth knowing

`scripts/oneoff/audit-fixed-overlay-portals.mjs` lists ~60 `position:fixed` overlays that are
not portalled. Those rendered inside `#appscroll` are painted under the app header — see the
Route finder filter sheet fix in this same change for the mechanism. Only the reported one
was fixed here.
