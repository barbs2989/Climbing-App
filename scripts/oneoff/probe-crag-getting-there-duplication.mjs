// Does a CRAG route render the same sections on Overview and on Plan?
//
// The crag Overview block renders unconditionally on cragOnly, while the Plan tab is
// content-gated: showPlan = !cragOnly || hasPlanContent(route). hasPlanContent is true whenever
// the route has road / approach / waypoints / descent / rappels -- which is exactly when the
// Overview block has anything to show. So the two should coincide, and reading says Plan is a
// superset. Reading is not enough: only rendering says what actually reaches each tab.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, `.crag-dup-${process.pid}.mjs`);
const entry = path.join(ROOT, `.crag-dup-entry-${process.pid}.mjs`);
const clean = () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); };

fs.writeFileSync(entry, `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};\n`);
try {
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
    "--jsx=automatic", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { clean(); console.error("FAIL — esbuild could not bundle RouteDetail.jsx"); process.exit(1); }

if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("no realtime"); } };
const { RouteDetail } = await import(out + "?t=" + Date.now());

/* A crag route WITH content -- the case where both tabs can render. */
const route = {
  id: "probe_crag", name: "Probe Crag Route", mountainId: "probe_area",
  discipline: "sport", grade: "5.10a", pitches: 1,
  road: { name: "Probe Canyon Road", driveNote: "Drive 12 miles up the canyon and park at the pullout.", status: "Open" },
  approach: "Walk five minutes up the climbers' trail to the base.",
  waypoints: [{ name: "Parking", type: "Trailhead", lat: 40.5, lng: -111.6, elev: 6000 }],
  gpxPts: [],
};
const props = {
  route, myReports: [], connections: [], diffRatings: {}, setDiffRatings: () => {},
  logged: [], hzVotes: {}, myStars: {}, setMyStars: () => {}, comments: [],
  onBack: () => {}, onSubTab: () => {},
};

const render = (tab) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { ...props, initialSubTab: tab })));
};

const overview = render("overview");
const plan = render("planner");
clean();

if (overview.length < 900 || plan.length < 900) {
  console.error(`FAIL — thin render (overview ${overview.length}, plan ${plan.length}); nothing below was checked.`);
  process.exit(1);
}

const SECTIONS = ["GETTING THERE", "WAYPOINTS", "APPROACH", "ROUTE TRACK"];
const STRINGS = [
  ["the drive note", "Drive 12 miles up the canyon"],
  ["the approach prose", "Walk five minutes up the climbers"],
  ["the road name", "Probe Canyon Road"],
  ["the waypoint name", "Parking"],
];
const has = (h, t) => h.includes(t.replace(/&/g, "&amp;").replace(/'/g, "&#x27;"));

console.log(`overview ${overview.length}ch   plan ${plan.length}ch\n`);
console.log("SECTION HEADING".padEnd(22) + "overview  plan");
for (const s of SECTIONS) console.log("  " + s.padEnd(22) + (has(overview, s) ? "yes" : "-").padEnd(10) + (has(plan, s) ? "yes" : "-"));
console.log("\n" + "CONTENT".padEnd(22) + "overview  plan");
for (const [label, t] of STRINGS) console.log("  " + label.padEnd(22) + (has(overview, t) ? "yes" : "-").padEnd(10) + (has(plan, t) ? "yes" : "-"));

/* THE FALLBACK CASE. Plan is content-gated -- showPlan = !cragOnly || hasPlanContent(route) -- so
   a BARE crag route is offered no Plan tab at all. The Overview block is retained for exactly that
   case (`cragOnly && !showPlan`), because it carries the contribution prompts, and removing it
   outright would leave a bare crag route with nowhere to be asked for an approach. Rendering it,
   because that is the half a reading of the gate cannot confirm. */
const bare = { id: "probe_bare", name: "Probe Bare Route", mountainId: "probe_area", discipline: "sport", grade: "5.9", pitches: 1 };
const bareQc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const bareOverview = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: bareQc },
  React.createElement(RouteDetail, { ...props, route: bare, initialSubTab: "overview" })));
const PROMPTS = ["No approach description", "No named waypoints yet"];
console.log("\nBARE crag route (no plan content, so no Plan tab) — Overview keeps its prompts:");
let missing = 0;
for (const t of PROMPTS) {
  const ok = has(bareOverview, t);
  if (!ok) missing++;
  console.log("  " + t.padEnd(34) + (ok ? "yes" : "*** MISSING"));
}
if (missing) {
  console.error(`\nFAIL — ${missing} contribution prompt(s) lost on a bare crag route.`);
  process.exit(1);
}

const dupes = STRINGS.filter(([, t]) => has(overview, t) && has(plan, t));
console.log(`\n${dupes.length} of ${STRINGS.length} content strings appear on BOTH tabs.`);
