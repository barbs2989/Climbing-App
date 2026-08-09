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

// 2b. PARTIAL data is the harder case, and the one that shipped. `hasHikeInputs` is an OR, so
//     one component was enough to render a confident total while scarfHrs charged the missing
//     ones as 0 — 325 of the 950 routes that show an estimate. A route is only allowed to
//     present an unmarked figure when dist, gain AND loss are all present.
const PARTIALS = [
  ["dist+gain, no loss", { distKm: 8, gainM: 1200 }],
  ["gain only", { gainM: 1200 }],
  ["dist only", { distKm: 8 }],
];
const alpineBase = { ...bare("alpine", "5.8"), mountainId: "probe_peak" };
for (const [label, extra] of PARTIALS) {
  let html;
  try { html = render({ ...alpineBase, ...extra }, "planner"); }
  catch (e) { fail(`partial "${label}" threw: ${e.message.split("\n")[0].slice(0, 100)}`); continue; }
  const t = text(html);
  if (!/≥/.test(t)) fail(`partial "${label}": confident unmarked estimate with a missing component`);
  else if (html.includes(GREEN_BG)) fail(`partial "${label}": green tile despite a missing component`);
  else ok(`partial "${label}": marked as a lower bound, not painted green`);
}
// And the complete case must NOT be downgraded — otherwise the fix above is just "mark
// everything", which would be useless noise on the routes that do have full data.
{
  const html = render({ ...alpineBase, distKm: 8, gainM: 1200, lossM: 1200 }, "planner");
  if (/≥/.test(text(html))) fail("a route with dist+gain+loss is wrongly marked as a lower bound");
  else ok("a fully-populated route still shows a plain estimate");
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

// 4. The Plan/Safety tabs are gated on CONTENT, not discipline. Both ends have to hold or
//    the gate is useless: a bare crag route must still get neither tab (an empty Plan tab is
//    worse than no Plan tab), and a crag route that carries a real approach/descent/hazard
//    must get them back. Red Mountain's South Face is the route that proved this — filed
//    `trad`, it hid an approach, a descent, permits, four hazards and two watch-outs behind
//    tabs the strip never rendered, and Overview showed none of it. Whole-line matching, so
//    "Plan" cannot pass on the strength of "Trip plan".
{
  const lines = (h) => text(h).split(" ").length && h.replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, "\n").split("\n").map((s) => s.trim()).filter(Boolean);
  const ADVICE = "What matters most for this discipline";
  const cragBase = { ...bare("trad", "5.8"), pitches: 3 };
  const bl = lines(render(cragBase, "overview"));
  if (bl.includes("Plan") || bl.includes("Safety")) fail("bare crag route: offered a Plan/Safety tab with no content to put in it");
  else ok("bare crag route: no Plan or Safety tab");
  if (bl.filter((l) => l === ADVICE).length !== 1) fail(`bare crag route: discipline advice should appear exactly once on Overview (got ${bl.filter((l) => l === ADVICE).length})`);
  else ok("bare crag route: discipline advice inline on Overview exactly once");

  const rich = { ...cragBase, id: "probe_rich", approach: "Walk up the gully.", descent: "Walk off west.",
    hazards: ["Loose rock in the gully"], objHaz: ["Rockfall"], watchOut: ["Steepens near the top"] };
  const rl = lines(render(rich, "overview"));
  if (!rl.includes("Plan")) fail("enriched crag route: approach/descent on file but no Plan tab");
  else ok("enriched crag route: Plan tab offered");
  if (!rl.includes("Safety")) fail("enriched crag route: hazards on file but no Safety tab");
  else ok("enriched crag route: Safety tab offered");
  // The advice lives in SafetyMatrix too, so leaving it inline as well would print it twice.
  if (rl.filter((l) => l === ADVICE).length !== 0) fail("enriched crag route: discipline advice duplicated on Overview and Safety");
  else ok("enriched crag route: discipline advice not duplicated");
  const rp = text(render(rich, "planner"));
  if (!rp.includes("Walk up the gully") || !rp.includes("Walk off west")) fail("enriched crag route: Plan tab does not render its approach/descent");
  else ok("enriched crag route: approach and descent render on Plan");
  const rs = text(render(rich, "safety"));
  if (!rs.includes("Loose rock in the gully") || !rs.includes("Steepens near the top")) fail("enriched crag route: Safety tab drops its own hazards/watch-outs");
  else ok("enriched crag route: its own hazards and watch-outs render on Safety");
  // watchOut renders inside the KNOWN HAZARDS box; it used to be left out of that box's
  // own condition, so a route with watch-outs and no hazards printed none of them.
  const wo = text(render({ ...cragBase, id: "probe_wo", watchOut: ["Test every hold"] }, "safety"));
  if (!wo.includes("Test every hold")) fail("watch-outs alone are swallowed when a route has no hazards");
  else ok("watch-outs alone still render");
}

// 5. The nearby-fire panel lives on Safety, and a route with no Safety tab keeps it on
//    Overview rather than losing it. Nothing above can see this: FireNearRoute renders NOTHING
//    without a coordinate (deliberately — "no fires near here" about a place we cannot locate
//    is worse than silence), and `bare()`'s area has no lat/lng, so every render so far has
//    been of a route where the panel is correctly absent. Locate the area and the question
//    becomes answerable. Under renderToStaticMarkup no effect runs, so the query is still
//    loading and the panel paints its "checking" line — which is what to match on. Do NOT
//    widen this to the panel's heading: the Safety tab's forecast list already links
//    "Fire & smoke — AirNow", so a heading match reports the panel present on Safety when it
//    is not there at all. Injection 1 below passed on exactly that until it was tightened.
{
  const at = { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington", lat: 47.5, lng: -121.0 };
  const located = (d, extra) => ({ ...bare(d, "5.9"), id: "probe_fire_" + d, _dbArea: at, ...extra });
  const FIRE = /Checking federal fire reports/;
  const hits = (r, tab) => (text(render(r, tab)).match(FIRE) || []).length;

  if (!hits(located("alpine"), "safety")) fail("ANCHOR LOST or moved: the nearby-fire panel does not render on Safety");
  else ok("nearby fire: renders on the Safety tab");
  if (hits(located("alpine"), "overview")) fail("nearby fire: still on Overview for a route that has a Safety tab");
  else ok("nearby fire: not left behind on Overview");
  if (hits(located("alpine"), "conditions")) fail("nearby fire: duplicated onto the Reports tab");
  else ok("nearby fire: not on Reports");
  // A bare crag route is offered no Safety tab at all, so moving the panel there unconditionally
  // would delete it for 99.5% of the catalog. It falls back to Overview — and only there.
  if (!hits(located("trad"), "overview")) fail("nearby fire: lost entirely on a crag route with no Safety tab");
  else ok("nearby fire: kept on Overview when there is no Safety tab to hold it");
  // An enriched crag route earns the tab back, so it must move like the alpine one.
  const richCrag = located("trad", { objHaz: ["Rockfall"], watchOut: ["Steepens near the top"] });
  if (!hits(richCrag, "safety") || hits(richCrag, "overview")) fail("nearby fire: enriched crag route does not follow its Safety tab");
  else ok("nearby fire: follows the Safety tab back onto an enriched crag route");
  // Position: it is the first thing on the tab, above the float-plan prompt and the forecasts.
  const st = text(render(located("alpine"), "safety"));
  const iF = st.search(FIRE), iB = st.indexOf("Committing objective"), iW = st.indexOf("Weather & mountain forecasts");
  if (iB < 0 || iW < 0) fail("ANCHOR LOST: the Safety tab's banner/forecast sections were renamed — update this guard");
  else if (iF > iB || iF > iW) fail("nearby fire: no longer the first section on Safety");
  else ok("nearby fire: first section on Safety, above the float plan and the forecasts");
}

fs.rmSync(path.dirname(out), { recursive: true, force: true });
console.log(failures
  ? `\ncheck:bare — ${failures} problem(s).`
  : "\ncheck:bare: ok — a route with no enrichment states what it does not know.");
process.exit(failures ? 1 : 0);

// ── Injections for section 5, all four confirmed caught and NAMED (a run that dies for some
//    other reason is not a catch). In RouteDetail.jsx:
//      1. revert the move — `{showSafety?null:fireEl}` back to `{fireEl}` and drop `{fireEl}`
//         from the safety branch  -> "does not render on Safety"
//      2. render it in both places — `{showSafety?null:fireEl}` to `{fireEl}`
//         -> "still on Overview for a route that has a Safety tab"
//      3. drop the fallback — `{showSafety?null:fireEl}` to `{null}`
//         -> "lost entirely on a crag route with no Safety tab"
//      4. demote it below the committing-objective banner
//         -> "no longer the first section on Safety"
//    Case 1 is the one that shaped the anchor: matching the panel's "Fire & smoke" HEADING made
//    it pass, because the Safety tab's forecast list links "Fire & smoke — AirNow" and the
//    assertion was reading that. Only the panel's own loading line is unique to the panel.
