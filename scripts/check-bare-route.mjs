#!/usr/bin/env node
// check:bare — render the route detail for a route that has NO enrichment, and assert the
// screen tells the truth about what it does not know.
//
// Why this exists. check:ui walks one route detail, and the route it samples is an enriched
// one (in production it resolves to a Washington alpine route with full approach data). But
// enrichment reaches ~648 of 5,477 alpine-scope routes; the other 88% are name + grade +
// pitches, and catalog-wide it is 204,469 of 205,492. So the shape almost every route
// actually has was the one shape nothing ever rendered. Two bugs shipped through that hole:
//
//   #641  scarfHrs() coerces its inputs (`+distKm||0`), so "no approach data" and "a zero
//         approach" were the same value. Total, Est. summit and Est. return silently added a
//         0.0hr hike leg and painted the return tile GREEN — an affirmative claim you are
//         down before dark, with the walk in and the walk out both counted as zero. The
//         "After dark" warning could not fire.
//   #655  The discipline safety advice written for sport/trad/bouldering lived behind the
//         Safety tab, which is hidden for exactly those three disciplines.
//
// Both are invisible to a guard that only ever renders a fully-populated route.
//
// This renders the real component with react-dom/server, so it exercises the true render
// tree rather than parsing source. Effects do not run under renderToStaticMarkup, so
// anything animated (CountUp) renders its initial value — never assert on those numbers.

import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-bare-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// ── The shape 88% of alpine routes and 99.5% of the catalog actually have.
const bare = (discipline, grade) => ({
  id: "probe_" + discipline, name: "Probe " + discipline, grade, gradeSystem: "yds",
  discipline, pitches: 6, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Colorado" },
});
const CRAG = ["trad", "sport", "bouldering"];
const ALPINE = ["alpine", "mountaineering", "ice", "mixed"];
const TABS = ["overview", "conditions", "photos", "partners", "planner", "safety"];
const GREEN_BG = "#0f2419"; // C.greenBg — the "you're fine" affirmation

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

// 1. Nothing throws, and no placeholder leaks into rendered copy.
let rendered = 0;
const cache = new Map();
for (const d of [...CRAG, ...ALPINE]) {
  for (const tab of TABS) {
    let html;
    try { html = render(bare(d, "5.9"), tab); }
    catch (e) { fail(`${d}/${tab} threw: ${e.message.split("\n")[0].slice(0, 120)}`); continue; }
    cache.set(d + "/" + tab, html);
    rendered++;
    const t = text(html);
    for (const bad of ["NaN", "undefined", "[object Object]"]) {
      if (t.includes(bad)) fail(`${d}/${tab} rendered "${bad}" in visible copy`);
    }
  }
}
ok(`${rendered} route-detail renders, no throw, no NaN/undefined/[object Object]`);

// 2. #641 — with no approach data, a time figure must be marked as a lower bound, and the
//    return tile must not be painted green. Alpine keeps the planner, so assert there.
const plan = cache.get("alpine/planner");
if (!plan) fail("could not render alpine/planner at all");
else {
  const t = text(plan);
  // Anchor check first: if the tiles are renamed this guard must break, not silently pass.
  if (!t.includes("Est. return")) fail("ANCHOR LOST: 'Est. return' no longer rendered — update this guard");
  else if (!/≥/.test(t)) fail("a route with no approach data shows unmarked time figures (#641 regressed)");
  else ok("no-approach-data times are marked as lower bounds (≥)");

  if (!t.includes("Lower bounds only")) fail("the lower-bounds explanation is missing (#641 regressed)");
  else ok("the reason is stated in place");

  if (plan.includes(GREEN_BG)) fail("a green 'you are down before dark' tile is painted with no approach data (#641 regressed)");
  else ok("no green safety affirmation without the data to back it");
}

// 3. #655 — crag disciplines cannot open the Safety tab, so their discipline advice must be
//    reachable on Overview instead.
for (const d of CRAG) {
  const html = cache.get(d + "/overview");
  if (!html) { fail(`could not render ${d}/overview`); continue; }
  const t = text(html);
  if (!t.includes("What matters most for this discipline") || !t.includes("Watch out for on this type of climb")) {
    fail(`${d}: discipline safety advice is unreachable — Safety tab is hidden for it (#655 regressed)`);
  } else ok(`${d}: discipline safety advice reachable on Overview`);
}

fs.rmSync(path.dirname(out), { recursive: true, force: true });
console.log(failures
  ? `\ncheck:bare — ${failures} problem(s).`
  : "\ncheck:bare: ok — a route with no enrichment states what it does not know.");
process.exit(failures ? 1 : 0);
