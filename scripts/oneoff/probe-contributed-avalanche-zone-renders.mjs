// Does a CLIMBER's contributed avalanche.zone reach the "Forecast coverage:" line?
//
// #1399 offers `avalanche.zone` in the contribute form, and check:contrib-fields accepts it. That
// guard proves the key is READ somewhere in the file; it does not prove a contributed value
// survives the dotted-path build in `structuredVal` and lands where the panel looks. Those are
// different questions — the same distinction check:token-boxes draws against check:field-renders:
// reaching a screen and fitting the element it reaches are not the same claim.
//
// FIVE CASES, and the last two are what keep it honest. A probe that only proved the line appears
// would be satisfied by a panel that prints every zone value, including the "N/A" ones the render
// already refuses on purpose.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// RouteDetail reaches react-query hooks, so it needs a provider — and the library must be
// --external below, or esbuild inlines its own copy and this provider is a different module
// instance with a different context ("No QueryClient set" with a provider plainly in place).
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(ROOT, `.avyc-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });
let fails = 0, cases = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };
const dead = (w) => { console.error(`\nprobe FAILED — ${w}. Nothing below was checked.\n`); clean(); process.exit(1); };

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "RouteDetail.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle RouteDetail.jsx"); }

const mod = await import(out + "?t=" + Date.now());
const RouteDetail = mod.default || mod.RouteDetail;
if (typeof RouteDetail !== "function") dead("RouteDetail.jsx has no default export — ANCHOR LOST");

// The prop set check:bare uses. Several props are indexed by route id, so a short list throws
// "Cannot read properties of undefined", which reads like a bad row rather than a bad harness.
const noop = () => {};
const base = {
  onBack: noop, onSubTab: noop, contribs: [], myReports: [], connections: [], comments: {},
  hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {},
  presence: null,
};

// The shape a merged contribution leaves on the route. `structuredVal` writes a dotted key through
// `_dset`, so `avalanche.zone` lands nested inside the object the panel reads — this fixture is
// that output, not a hand-arranged convenience.
const CONTRIB = "NWAC Snoqualmie Pass — the daily forecast runs November through April";
const route = (over) => ({
  id: "probe", name: "Probe", grade: "5.6", gradeSystem: "yds", pitches: 4,
  discipline: "alpine", mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  seasonalHazards: { avalanche: { byMonth: { January: "Considerable", June: "Moderate" } } },
  ...over,
});

function render(r) {
  try {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, { ...base, route: r, initialSubTab: "safety" })));
  } catch (e) { dead("RouteDetail threw: " + (e && e.message)); }
}

// 1. Baseline — the panel renders from the route's own ratings with no zone at all. Without this
//    every "the line appeared" assertion below could be true of a panel that was never gated.
const m0 = render(route());
if (m0.length < 2000) dead(`the Safety tab rendered only ${m0.length} characters`);

cases++;
if (m0.includes("AVALANCHE FORECAST")) ok("panel renders from the route's own ratings, no zone");
else bad("panel absent on the baseline — the probe is measuring nothing");

cases++;
if (!m0.includes("Forecast coverage:")) ok("no coverage line when there is no zone");
else bad("a coverage line appeared with no zone to show");

// 2. The contributed value, nested exactly as _dset leaves it.
const m1 = render(route({ seasonalHazards: { avalanche: {
  byMonth: { January: "Considerable", June: "Moderate" }, zone: CONTRIB } } }));

cases++;
if (m1.includes("Forecast coverage:")) ok("a contributed zone renders the coverage line");
else bad("the coverage line never appeared for a contributed zone");

// Assert the TEXT, not just the label: a label with the wrong value beside it is the defect.
cases++;
if (m1.includes("NWAC Snoqualmie Pass")) ok("the contributed text itself reaches the screen");
else bad("the line rendered but the contributed text is not in it");

// 3. The refusal the panel already makes. 497 stored values include "N/A" spellings, and treating
//    one as coverage would tell a party a forecast exists where the row says it does not.
cases++;
const m2 = render(route({ seasonalHazards: { avalanche: {
  byMonth: { January: "Considerable" }, zone: "N/A" } } }));
if (!m2.includes("Forecast coverage:")) ok('an "N/A" zone is still refused');
else bad('"N/A" rendered as forecast coverage');

clean();
if (cases < 5) dead(`only ${cases} case(s) ran`);
console.log(`\nprobe-contributed-avalanche-zone-renders: ${cases} case(s), ${fails} failure(s)  [${m1.length}ch]`);
process.exit(fails ? 1 : 0);
