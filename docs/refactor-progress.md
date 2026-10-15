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

## Next

Start with the small presentational components in `ClimbMatchCore.jsx` band 2 (badges, pills, icons):
they are pure props-in/markup-out, so each is a clean single-job component and a safe place to prove
the pipeline. Then the `App` render tree in `ClimbMatch.jsx`, which has **no inner components** —
every piece lifted out of it needs its props enumerated from the ~100 `useState` hooks it closes over.
Take the leaves first (a card, a row, a header strip), never a whole tab in one PR.

Last session stopped at: **PR1 — infrastructure + `RiskBadge`.** Next candidates, by the same
measurement (small, pure, no guard names them): `DiscBadge` (consumers `ClimbMatch.jsx`,
`lib/PartnerSearch.jsx`), `DiscBadges` (`lib/Calendar.jsx`, `lib/GiveVouch.jsx`), `HelpDot`
(`ClimbMatch.jsx`). `TrustBadge`, `Pill` and `ActionIcon` are named by 1–5 guards each — do them
after the reach measurement has proven itself on the easy ones.
