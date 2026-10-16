# Component extraction — progress and procedure

The three app files (`ClimbMatch.jsx`, `ClimbMatchCore.jsx`, `RouteDetail.jsx`) are being broken into
single-job components under `src/components/`, one component per PR. This file is the hand-off
between sessions: **read "Next" before starting, and update "Done" and "Next" in the same PR as the
extraction.** No guard reads this file; keeping it true is on the author.

## Conventions (every extracted component)

- One file, one component, one job: `src/components/<Name>.tsx`.
- `export default function <Name>(props: <Name>Props)` — exactly one default export written as a
  function declaration. The guards rebuild the parent file's text by stitching moved components back
  in (`scripts/lib/guard-sources.mjs`), and that stitch requires this shape.
- `interface <Name>Props { … }` declared above it, every prop typed; no `any`. Strict mode is on
  (`tsconfig.json`); `npm run check:types` runs in the build.
- Styling stays inline against the `C` palette, as everywhere else. No CSS files.
- Every consumer imports it by a path relative to itself — `./src/components/<Name>.tsx` from the three
  root app files, `../src/components/<Name>.tsx` from `lib/` — and renders it where the code used to be.
  Nothing else about the parent changes in that PR.
- Register the move in `MOVED` in `scripts/lib/guard-sources.mjs` under the parent file. Without this
  the text-reading guards go **blind, not red** — they keep passing while reading none of the moved code.
- A JS function the component calls has its destructured params inferred as **required** props
  (`Pill` failed TS2741 on a call without `icon`). Type the seam on the JS side with one JSDoc line —
  `/** @param {{label?: …, icon?: …}} p */` above the function — never with casts in the component.
- **Read the parent's exports at render time, never at module scope.** A parent that still uses what
  it extracted imports the file back, so the component module evaluates *inside* the parent's own
  evaluation and every binding it imported from the parent is still uninitialised. `DiscBadge` (PR3)
  did `const META = CAT` at the top of the file; `check:units` and `check:seed-history` both rendered
  the profile and threw `Cannot read properties of undefined` — caught by `measure-guard-reach`'s
  passed-before/fails-now rule, not by `check:types`. Look things up inside the function body.

## Procedure (per PR)

1. Fresh branch from `origin/main`. Main merges every ~10 minutes; an extraction that waits conflicts.
2. `node scripts/measure-guard-reach.mjs --out before.json` on the untouched tree.
3. Extract. Register in `MOVED`. Run `npm run check:types`.
4. `node scripts/measure-guard-reach.mjs --out after.json --compare before.json` — it fails if any
   guard lost a count it had before (the blindness signal). Fix the guard, don't accept the drop.
5. `grep -rl "<Name>" scripts/oneoff/inject-*` — run every injection suite that names the moved code;
   `check:injection-anchors` sees only some anchor shapes.
6. `npm run build`. Update **Done** and **Next** below. Push immediately; merge when CI is green.

## Done

| PR | Component | From | Notes |
|---|---|---|---|
| PR1 | `RiskBadge` | `ClimbMatchCore.jsx` | the smoke test for the pipeline; consumer `lib/SafetyTab.jsx`; `Pill` got its JSDoc seam |
| PR1 | _infrastructure_ | — | `src/components/`, `tsconfig.json`, `check:types`, TS-aware guards, `measure-guard-reach` |
| PR15 | `ChatComposer` | `ClimbMatchCore.jsx` | the DM/crew message composer (one 3.2 KB line, moved by SCRIPT); one consumer (`ClimbMatch.jsx`), core never rendered it — no cycle; reads `C`, `photoAlt`, `PhotoAltField` at render time; `PhotoAltField`'s seam typed on the JS side with a JSDoc `@param` (it destructures five props, the composer passes three); the only logic touch is the `typeof rd.result === "string"` check the FileReader type demands; no guard, probe or feature doc names it |
| PR14 | `SwipeRow` | `ClimbMatchCore.jsx` | the swipe-left-to-act row; 3 consumers (`ClimbMatch.jsx`, `lib/Inbox.jsx`, `lib/NotifPanel.jsx`), core never rendered it — no cycle; reads `C` only; its comment block moved with it as the JSDoc; touch handlers typed `TouchEvent<HTMLDivElement>`; no guard, probe or feature doc names it |
| PR13 | `GPXMap` | `ClimbMatchCore.jsx` | the route map (145 lines, moved by SCRIPT from core's body with asserted substitutions); 3 consumers (`RouteDetail.jsx`, `lib/LogAscent.jsx`, `lib/TripReport.jsx`), core never rendered it — no cycle; Leaflet is CDN-loaded and untyped, so `window.L` is declared `any` once in `src/types/leaflet-global.d.ts`; TypeScript cannot narrow through a boolean, so `track`/`pk` stand in for `pts`/`peakCoord` and `placed` is a type predicate over core's `wpPlaced()`; `check:waypoint-placement` reads it through the stitch (signature spelling kept) and `inject-waypoint-placement-cases.mjs` edits the `.tsx`; seams typed on the JS side: `useFollowMe` opts (JSDoc) and the seven `POP_*` styles (`CSSProperties`); core now exports `wpDivIcon` (`WP_COLORS` and `wpIs` already were); feature-doc rows moved in two docs |
| PR12 | `Av` | `ClimbMatchCore.jsx` | the round avatar with its online dot; 15 consumers (`ClimbMatch.jsx`, `RouteDetail.jsx`, 13 `lib/` files) AND core itself (16 uses), so core imports it back; reads `C`, `FALLBACK_AV`, `onImgErr` from core and `photoThumb` from `lib/photoThumb` at render time; only comments name it (`check:control-names`, four oneoff probes: an icon-only control is not NAMED by an `<Av/>`) |
| PR11 | `DiscIcon` | `ClimbMatchCore.jsx` | the discipline glyph (13 SVG groups, moved verbatim by script); 13 consumers (`ClimbMatch.jsx`, `RouteDetail.jsx`, 11 `lib/` files, `DiscBadge.tsx` via `./DiscIcon.tsx`) AND core itself (13 uses), so core imports it back; `CAT` is read at render time through a `Record` annotation, as `DiscBadge` does; `d` is optional because callers pass a place's `disc`, which can be unset — an unknown key drew the rock icon before and still does; no guard, probe or feature doc names it |
| PR10 | `ElevChart` | `ClimbMatchCore.jsx` | the elevation profile under the route map; a `memo` component (kept); ONE consumer (`RouteDetail.jsx`) and core never rendered it, so core does NOT import it back — the first move since PR4 with no cycle; reads `C` and `uElev` from core at render time; `docs/features/route-page.md` listed it under core and `check:feature-docs` asserts a symbol in the file its row names, so the row moved too |
| PR9 | `ActionIcon` | `ClimbMatchCore.jsx` | the line-icon set (6 KB of SVG, moved verbatim by script); 15 consumers (`ClimbMatch.jsx`, `RouteDetail.jsx`, 10 `lib/` files, 3 `.tsx` components via `./ActionIcon.tsx`) AND core itself (13 uses), so core imports it back; `EnrichmentPanels.jsx`, `lib/FireMap.jsx` and `lib/FireNearRoute.jsx` take it as a PROP and did not change; `check:field-renders` imported it from core by path and now imports the `.tsx`; the if-chain body is unchanged — add an icon by adding a case |
| PR8 | `Pill` | `ClimbMatchCore.jsx` | the rounded tag every badge is drawn with; its JSDoc `@param` seam became the interface; consumers `ClimbMatch.jsx`, `RouteDetail.jsx`, `lib/SafetyTab.jsx`, `lib/TripReport.jsx`, the three earlier `.tsx` components (now `./Pill.tsx`, not through core) AND core itself (7 uses), so core imports it back; `lib/PartnerSearch.jsx` imported it and never rendered it — import dropped; `lib/DbAreaBrowser.jsx` keeps a LOCAL copy (pre-existing duplicate, not touched) |
| PR7 | `CountUp` | `ClimbMatchCore.jsx` | the animated counter; consumers `ClimbMatch.jsx`, `RouteDetail.jsx`, `lib/Leaderboards.jsx` AND core itself (one use), so core imports it back; it reads NOTHING from core (only React), so there is no seam to type; five guards and nine probes name it only in comments ("never assert on a CountUp number under SSR"), one probe matches a call site in `RouteDetail.jsx`, which did not move |
| PR6 | `Lbl` | `ClimbMatchCore.jsx` | the emoji-to-icon label; ten consumers (`ClimbMatch.jsx`, `RouteDetail.jsx`, eight `lib/` files) AND core itself (20 uses), so core imports it back; the seam is typed on the JS side with a JSDoc `@type {Record<string, string>}` on `EMOJI_ICON`, not a cast; `check:control-names` and `check:popup-chrome` match `<Lbl` at the CALL SITES, which did not move |
| PR5 | `TrustBadge` | `ClimbMatchCore.jsx` | consumers `ClimbMatch.jsx`, `lib/CrewCard.jsx`, `lib/PartnerSearch.jsx`, `lib/ShareCard.jsx`, `lib/TripReport.jsx` AND core itself (`FullProfile`, `Resume`), so core imports it back; `check:profile-claims` reads its tooltip through the stitch, so the title stays a plain string beside the function keyword |
| PR4 | `DiscBadges` | `ClimbMatchCore.jsx` | consumers `lib/Calendar.jsx`, `lib/GiveVouch.jsx`; imports `DiscBadge` from its own folder; core does NOT use it, so no cycle this time |
| PR3 | `DiscBadge` | `ClimbMatchCore.jsx` | consumers `ClimbMatch.jsx`, `lib/PartnerSearch.jsx` AND core itself (`DiscBadges`), so core imports it back; `DiscIcon` got its JSDoc seam; `readParentSource()` now drops a parent's own import of a moved file before stitching |

## Next

Start with the small presentational components in `ClimbMatchCore.jsx` band 2 (badges, pills, icons):
they are pure props-in/markup-out, so each is a clean single-job component and a safe place to prove
the pipeline. Then the `App` render tree in `ClimbMatch.jsx`, which has **no inner components** —
every piece lifted out of it needs its props enumerated from the ~100 `useState` hooks it closes over.
Take the leaves first (a card, a row, a header strip), never a whole tab in one PR.

Last session stopped at: **PR15 — `ChatComposer`.** A census of every component still defined in core (2026-10-16,
`node` over core's top-level `function X(`/`const X=` with a JSX body; `<X` uses per file; guards naming each) found
**75**. Thirteen are declared SEED-ONLY by `check:seed-only-surfaces` and render for nobody once `VITE_USE_DB=true`:
`OverviewMap` (20 KB), `Guides` (25 KB), `GuideDashboard` (18 KB), `RouteFinder` (14 KB), `GuideApply`, `QuickMatch`,
`AreaView`, `SuggestedClimbs`, `GettingThere`, `AreaLatest`, `ClassicClimbs`, `AreaBrowse`, `AreaCrags`, `AvailCal` —
about 130 KB of core that no climber reaches. **Do not extract them**: moving dead code into a nicer file is not a
clean-up. Deleting them is a product decision (CLAUDE.md: polish only, features need approval), so it is PROPOSED to the
owner here, not done. Two more have NO consumer at all (`RSL`, `GH`) — confirm with a grep for a non-JSX use, then they
can go in a polish PR. The LIVE leaves to extract next, smallest first, none named by a guard: `Hr`, `Stars`, `Bar`
(one guard comment), `TypingIndicator`, `OverlaySkeleton`, `ScreenSkeleton`, `ShareExportRow`, `CardHead` (62 uses:
`RouteDetail.jsx` 49, `AlpineConditionsCard.jsx` 12), `TopContribBadge`, `PhotoAltField`, `PullToRefresh`,
`ReactionPicker`, `PhotoDescribeBox`, `RetryReminder`, `PlaceMatches`, `SectionJumps`, `MiniCalendar`, `SunCorrect`,
`StartLocationForm`, `AreaRegionSelect`, `TopContributors`, `MessageRow`. Then the guarded panels (`TrustBreakdown`,
`ReportStats`, `PhotoStrip`, `ItineraryEditor`, `RealClimberRow`, …) — read every guard named first. Conventions that
held through PR5–PR15: a parent that still uses what it extracted imports the new file back (the stitch drops that
import; the component reads the parent's exports at render time only); a component another extracted component renders
is imported from its own folder (`./Pill.tsx`), never through core; a guard that IMPORTS a moved symbol from core by
path is repointed in the same PR; a guard that matches the component's TEXT still sees it through the stitch only if
the body keeps the shape (`check:waypoint-placement` anchors on `function GPXMap({pts,waypoints` — exact spelling) — and
never quote that anchor in the component's JSDoc; an injection suite that edits the moved text is repointed at the
`.tsx`; explain any measured count that DROPS (`check:chunk-reload` counts JSDoc `import("react")` types); a feature doc
that lists the symbol under its old file must move it, or `check:feature-docs` fails; the stitch (`movedAsParentText`)
requires exactly ONE `export default function` per moved file, so a `memo(...)` component becomes an inner
implementation wrapped in `memo` behind an exported function (`ElevChart`, PR10); a seam TypeScript infers wrongly from
JS is typed on the JS side with JSDoc (`useFollowMe`'s options, the `POP_*` styles, `EMOJI_ICON`, `PhotoAltField`),
never cast in the component; a boolean cannot narrow its source, so derive the narrowed value (`track`, `pk`) and a type
predicate for a JS test (`placed` over `wpPlaced()`); ESLint is a build guard since #2487 and a ratchet
(`eslint-suppressions.json`): a new `.tsx` is CLEAN — no `any` (Leaflet's type is the one declared `LeafletAny` in
`src/types/leaflet-global.d.ts`), no empty block, and an effect that keys on a signature by design carries a per-line
`exhaustive-deps` disable WITH THE REASON — and when a move removes legacy findings from core, run
`npx eslint . --prune-suppressions`; a module-level helper in a component must not share a name with one in core, or
the stitched core will not PARSE (`escHtml`, PR13); before adding an export to core, check the export list by BUILDING —
a duplicate name fails esbuild, not `tsc`; a 100+ line body is moved by a GENERATOR with asserted substitutions, never
retyped; and after EVERY merge of `origin/main` into the branch, grep the tree again for
`import … Name … from "…ClimbMatchCore.jsx"` and run `npm run lint` — a consumer can land on main between the census
and the merge, and CI builds the PR merged with main (PR9).
