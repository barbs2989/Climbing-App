# Pitch and rappel gap audit (owner note, 2026-11-26)

> "Some of our routes don't have the number of pitches. Once someone edits it or if I add it through our research,
> and the route gets 2 pitches or more, does route breakdown, and rappels sections get added automatically? Audit and
> review. Also many climbs don't have the details for every pitch. Audit where the route says x number of pitches,
> and the route breakdown doesn't show all the info for every pitch and fill in the gap. Same for rappels."

## 1. Do the sections appear by themselves? Yes, nothing is stored that could go stale

ROUTE BREAKDOWN and RAPPELS are not flags on the row. The route page decides on every render from the route as it
stands (`pitchCountOf`, `lib/fieldScope.js` `scopeCtx`, `gapPitches`, `rappelsAreNone`, `multiPitchByLength`). So the
moment a route carries 2+ pitches, both sections are drawn: full when there is data, otherwise a headed
"help fill this in" section with a pencil. Each path to a count was traced:

| How the count arrives | Where it lands | Sections appear |
|---|---|---|
| Research / pipeline write (`enrich:apply`, `fill-pitches-from-mp.mjs`) | `routes.pitches` / `pitch_detail` | on the next page open (the page fetches the full row) |
| A climber's edit, once approved (`approve_field_contribution`) | `contributions` row, status approved | yes: the route memo overlays approved `pitchCount` onto `pitches` (`routeForDetail`'s `M` map) and approved `pitchDetail` onto the table |
| A climber typing the count in the edit sheet | the sheet's own `scopeCtx(route, cat, pitchCount)` | the sheet offers the pitch table and rappel editors as soon as 2+ is typed |
| No count, but the climb is longer than a rope reaches (#3998) | nothing stored | both sections, with "about N pitches" |

Exempt by design: bouldering, scrambles and walk-ups (never roped), and RAPPELS on a route that states a walk-off.
`scripts/oneoff/audit-multipitch-sections.mjs` renders the real page server-side and includes a synthetic pass that
takes single-pitch trad/sport/aid rows, gives them 3 pitches (or a 2-entry pitch list with the count still 0, or a
600 ft length) and asserts both sections appear. No change was needed.

## 2. Census: where the stored count is more than the page describes (2026-11-26, `census.mjs`)

9,893 routes store 2+ pitches; 9,881 are roped.

| discipline | routes | fewer pitches described than stored | no breakdown at all | rappel descent, no station table |
|---|---|---|---|---|
| trad | 5,667 | 5,621 | 5,617 | 207 |
| sport | 1,577 | 1,562 | 1,560 | 70 |
| ice | 1,538 | 1,532 | 1,527 | 186 |
| alpine | 838 | 608 | 511 | 243 |
| mixed | 166 | 165 | 165 | 21 |
| aid | 93 | 93 | 92 | 1 |

Thin entries (notes under 40 characters with no length or anchor) are rare: 17 routes.
8,893 roped multi-pitch routes say nothing about how you get down, so no rappel claim can be checked there.

## 3. Filling the gap: from text we hold, in our own words

Sources: the Mountain Project route descriptions already saved on disk from the licensed crawl (owner holds a licence,
2026-10-29), 12,457 routes. A route is worked only when its saved description goes pitch by pitch (P1, P2... or
"pitch 1"): **977 gap routes** (`worklist.json`, `build-worklist.mjs`). Sonnet agents turn each into a pitch table
under `BRIEF.md`; a rappel table is written only where the text lists the stations in order.

Every batch passes, before it is applied:
- `npm run audit:copied-prose`: no 8-word run shared with the saved text (the first two batches failed on 94 strings
  and were rewritten; the check is now part of the brief);
- `validate.mjs`: area and source match the context file, no low-confidence route, no source named in the notes
  ("the text", a book, "the party"...), no route grade copied onto every pitch, no overwrite of a stored table without
  the replace flag;
- a reviewer pass that removed what the text does not state: inferred crux flags, a midpoint picked from a stated range,
  "estimated" lengths, a length whose unit was assumed, one lead split three ways to reach the stored count, and two
  routes that are unfinished projects.

Stored counts the text contradicts are reported in each route's `review.other_findings`, never changed in bulk (a
mechanical fingerprint does not authorise a bulk fix).

## 4. What is left

`remainder.json`: 8,662 gap routes with no pitch-by-pitch text on disk. 8,048 of them have a Mountain Project page that
was never saved; 1,064 have a saved description that does not go pitch by pitch. Fetching those pages is the next step
(the existing licensed crawler); then run `build-worklist.mjs` again and continue the batches.

## Apply log

`apply-all.sh` (enrich:apply `--pace 1000`, one batch at a time, `dbslot check` before each): 2026-11-26 06:17-06:41
b001-b038, stopped once when the DB gate read 1.9 s, resumed after the back-off; 08:08-08:14 b039-b049. **All 893 routes
written and verified on re-read** (`applied.txt`, `logs/`, rollbacks in `audits/route-breakdown/rollback-17957*.json`).
Three notes were refused by the apply's own source rule (an organisation named, and "Beckey" inside a route name),
reworded and re-applied; `scan-sources.mjs` now runs that rule over a batch first.

Rappel tables: 43 written, then 2 not applied (40 m stations need two ropes; owner ruling 2026-11-26 that RAPPELS
describes one rope, carried by PR #4033's session, which is rewriting 17 already-applied tables for one rope).

Afterwards `scripts/oneoff/audit-multipitch-sections.mjs --ids=<the 893>`: every route renders, shows ROUTE BREAKDOWN
and RAPPELS as headed sections, and the synthetic "a route that gains pitches gains both sections" pass holds. Its
empty-section regex expected a pencil glyph the no-emoji rule removed, so it flagged every empty section on every
route; fixed to accept the icon.
