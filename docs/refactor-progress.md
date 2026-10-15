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

Last session stopped at: **PR8 — `Pill`.** (**Grep for the definition before starting a candidate**: the
PR4 hand-off named `HelpDot`, which #2430 had already deleted.) One candidate is left in core band 2 by the
same census (top-level definition; `<Name` uses per file; guards and `scripts/oneoff` probes naming it):
`ActionIcon` (6 KB of SVG paths, ~80 uses across 19 files). Its guards, already read: `check:field-renders`
IMPORTS it from `ClimbMatchCore.jsx` by path (L126) and passes it as a prop to the enrichment panels, as
`EnrichmentPanels.jsx` does — that import must be repointed at the `.tsx` in the same PR, or the guard dies;
`check:count-matches-its-list` matches the `ActionIcon name="bell"` call site; `check:control-names`,
`check:dead-props` and `check:zero-state` name it only in comments; `inject-control-name-cases.mjs` swaps a
`<Lbl>` for an `<ActionIcon>` at a call site. After it, the census moves to band 2's LARGER components (`ProvenancePanel`,
`RouteGearCheck`, `ElevChart`, `GPXMap`) and then to `RouteDetail.jsx` — take the leaves first, as the
conventions above say. A component that another extracted component renders is imported from its own
folder (`./Pill.tsx`), never through core. A parent that still uses what it extracted
imports the new file back — a cycle, and an accepted one: the parent's import is dropped by the
stitch, and the component reads the parent's exports at render time only. A component that renders
another extracted component imports it from its own folder (`./DiscBadge.tsx`), not through the parent.
A guard that matches the component's TEXT (`check:profile-claims` on `TrustBadge`'s tooltip) still sees
it through the stitch, but only if the moved body keeps the shape the regex expects — read the guard,
and do NOT quote its anchor in the component's JSDoc: the regex matched the comment before the code
(PR5 caught `title="…"` as the tooltip). Oneoff probes that bundle core and destructure the moved
export off it break too (`probe-trust-tiers-onscreen.mjs`, PR5) — grep `scripts/oneoff` for the name.
