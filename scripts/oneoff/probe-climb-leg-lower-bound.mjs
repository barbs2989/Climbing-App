#!/usr/bin/env node
/* Does a time estimate whose CLIMBING leg is unknown say so?
 *
 * THE DEFECT. `techHrs(0, ...)` returns 0, so a route with no recorded pitch count and no
 * published or derived summit time contributes a climbing leg of ZERO to Total, Est. summit and
 * Est. return. That is "unknown" counted as "none" — #641 one leg over, and in the direction that
 * matters: a smaller number makes the day look shorter and the return look earlier.
 *
 * WHY A PROBE AND NOT A GUARD. The class is SIX routes catalog-wide, measured by
 * scripts/oneoff/measure-zero-pitch-estimate-reach.mjs, three of which `approachUnknown` was
 * already hedging for its own reasons. What this asserts is the RULE rather than those six rows,
 * so it is worth running after any edit to the estimate block and would buy little in CI.
 *
 * IT RENDERS THE REAL RouteDetail. These flags are locals inside a component no static test can
 * evaluate, and the previous measurement of this very class was WRONG when computed from columns
 * alone — it missed `cragOnly` and reported 21 of 28 rows disagreeing with the screen. A claim
 * about what a climber reads has to come off the markup.
 *
 * BOTH DIRECTIONS, because a rule that only ever ADDS a hedge is satisfied by hedging everything,
 * which would make the marker meaningless on the routes that deserve a firm number. Cases 2-5 are
 * the ones that must stay CLEAN.
 *
 * No browser. No database. Fails closed on a thin render and on a missing tile.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-climbleg-"));
const outFile = path.join(outDir, "bundle.cjs");
let render;
try {
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: outFile, logLevel: "error",
  });
  ({ render } = require_(outFile));
} catch (e) { console.error(`FAIL — could not build the render harness: ${e.message}`); process.exit(1); }
process.on("exit", () => { try { fs.rmSync(outDir, { recursive: true, force: true }); } catch {} });

/* A non-crag discipline, because `{!cragOnly ? <Calculator/> : null}` means trad and sport never
   mount this calculator at all — the gate that made the column count (128,020) and the screen
   count (6) differ by four orders of magnitude. */
const base = (over) => ({
  id: "probe", name: "Probe Route", discipline: "alpine", grade: "5.7",
  areaId: "probe_area", mountainId: "probe_area",
  distKm: 8, gainM: 900, lossM: 900, pitches: 0, ...over,
});

/* The Est. caption is discipline-dependent (top-out / finish / summit), so anchor on the caption
   and capture the value that precedes it — never a fixed character window. */
const tile = (html, caption) => {
  const rx = new RegExp(`<div[^>]*>([^<]*)</div><div[^>]*>${caption}<`);
  const m = html.match(rx);
  return m ? m[1].trim() : null;
};
const GE = "≥";
const CLIMB_CAVEAT = "nothing on file says how long the climbing takes";
const APPROACH_CAVEAT = "this climb has no recorded";

const CASES = [
  {
    name: "climbing leg unknown, walk fully recorded — the three bare rows",
    route: base({}),
    climbing: "N/A", hedgedAggregates: true, climbCaveat: true, hedgedApproach: false,
  },
  {
    name: "pitch count recorded — a firm number, no hedge",
    route: base({ pitches: 6 }),
    climbing: /hr$/, hedgedAggregates: false, climbCaveat: false, hedgedApproach: false,
  },
  {
    name: "published summit time, no pitch count — the climbing leg IS known",
    route: base({ timing: { summitTimeHrs: 5 } }),
    climbing: /hr$/, hedgedAggregates: false, climbCaveat: false, hedgedApproach: false,
  },
  {
    name: "derived summit time, no pitch count — also known",
    route: base({ timing: { totalHrs: 9, approachTimeHrs: 2, descentTimeHrs: 2 } }),
    climbing: /hr$/, hedgedAggregates: false, climbCaveat: false, hedgedApproach: false,
  },
  {
    name: "published WHOLE-DAY time — proves the omitted !publishedIsWholeDay guard is unreachable",
    route: base({ timing: { summitTimeHrs: 11, totalHrs: 11 } }),
    climbing: /./, hedgedAggregates: false, climbCaveat: false, hedgedApproach: false,
  },
  {
    name: "BOTH legs unknown — one hedge each, and the approach tile hedges too",
    route: base({ distKm: 8, gainM: null, lossM: null }),
    climbing: "N/A", hedgedAggregates: true, climbCaveat: true, hedgedApproach: true,
  },
];

let fail = 0, ran = 0;
const say = (ok, msg) => { if (!ok) fail++; ran++; console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); };

console.log("\n=== an unknown CLIMBING leg is marked as a lower bound ===\n");
for (const c of CASES) {
  const html = render(c.route);
  console.log(`  --- ${c.name}`);
  if (html.length < 2000) { console.error(`  FAIL — render is ${html.length} chars; every assertion below would pass vacuously.`); process.exit(1); }

  const climbing = tile(html, "Climbing") ?? tile(html, "Car-to-car");
  const total = tile(html, "Total");
  const approach = tile(html, "Approach") ?? tile(html, "On foot");
  const summit = (html.match(/<div[^>]*>([^<]*)<\/div><div[^>]*>Est\.\s*(?:top-out|finish|summit)</) || [])[1]?.trim() ?? null;
  const ret = tile(html, "Est. return");

  if (climbing == null || total == null || approach == null || summit == null || ret == null) {
    console.error(`  FAIL — a tile did not render (climbing=${climbing} total=${total} approach=${approach} summit=${summit} return=${ret}). ANCHOR LOST.`);
    process.exit(1);
  }

  say(typeof c.climbing === "string" ? climbing === c.climbing : c.climbing.test(climbing),
      `Climbing tile reads ${JSON.stringify(climbing)}`);

  for (const [label, v] of [["Total", total], ["Est. summit", summit], ["Est. return", ret]]) {
    say(v.startsWith(GE) === c.hedgedAggregates, `${label} ${c.hedgedAggregates ? "carries" : "does NOT carry"} the ${GE} marker  (${JSON.stringify(v)})`);
  }

  /* THE LOAD-BEARING ONE: the Approach tile keeps its OWN flag. An unrecorded pitch count says
     nothing about the walk, so hedging a fully-recorded approach would be over-claiming
     uncertainty — and that is exactly what a blanket `lowerBound` everywhere would do. */
  say(approach.startsWith(GE) === c.hedgedApproach,
      `Approach tile ${c.hedgedApproach ? "carries" : "does NOT carry"} the ${GE} marker  (${JSON.stringify(approach)})`);

  say(html.includes(CLIMB_CAVEAT) === c.climbCaveat, `the climbing-leg caveat is ${c.climbCaveat ? "present" : "absent"}`);
  if (c.hedgedApproach) say(html.includes(APPROACH_CAVEAT), `the approach caveat is present too — two legs, two sentences`);
  console.log("");
}

console.log(`  ${ran} assertion(s) run, ${fail} failed\n`);
if (ran < 30) { console.error(`FAIL — only ${ran} assertions ran; this proved less than it claims.`); process.exit(1); }
if (fail) process.exit(1);
console.log(`ok — an unknown climbing leg is marked, a known one is not, and the approach tile keeps its own flag.\n`);
