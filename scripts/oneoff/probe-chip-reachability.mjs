// Diagnostic: for each wired section, populate ONLY that field and see whether a chip
// reaches the screen. Prints a table -- this is how the guard's assertions get chosen,
// rather than assuming a heading renders just because a prop was added to it.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
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
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-reach-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render } = require_(out);

const base = { id: "probe_trad", name: "Probe", grade: "5.8", gradeSystem: "yds",
  discipline: "trad", pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Colorado", lat: 40, lng: -105 } };

const LONG = "x".repeat(260) + " long beta prose for the block that needs >=220 chars.";
const CASES = [
  ["approach", { approach: "Hike the trail 1.2 mi." }, ["planner", "overview"]],
  ["descentText", { descentText: "Walk off east." }, ["planner"]],
  ["rappels", { rappels: "3", rappelDetail: [{ n: 1, lengthM: 30 }] }, ["planner"]],
  ["gpx", { gpxPts: [{ lat: 40, lng: -105 }, { lat: 40.01, lng: -105.01 }] }, ["planner"]],
  ["waypoints", { waypoints: [{ type: "Trailhead", name: "TH", lat: 40, lng: -105 }] }, ["planner"]],
  // pitch_detail has TWO surfaces, split PER ENTRY: roped pitches -> PITCH-BY-PITCH,
  // travel legs -> ROUTE BETA. Probe both, or one looks broken while the other works.
  ["pitchTable", { pitchDetail: [{ n: 1, grade: "5.6", notes: "chimney" }, { n: 2, grade: "5.8", notes: "crack" }] }, ["planner", "overview"]],
  ["pitchDetail", { pitchDetail: [{ label: "Approach gully", class: "3rd", notes: "scramble to the notch" }, { label: "Summit snowfield", class: "2nd", notes: "easy" }] }, ["planner", "overview"]],
  ["beta", { beta: [LONG] }, ["overview", "planner"]],
  ["gear", { gear: ["single set of cams"], gearConfidence: "verified" }, ["overview", "planner"]],
  // The box is gated on route.climate and needs typical / a season key / forecastZone —
  // `summary` alone returns null, which is what made a season-keyed chip look broken.
  ["climate", { climate: { typical: "Dry, hot afternoons.", forecastZone: "Front Range" } }, ["conditions", "overview"]],
  ["hazards", { hazards: ["rockfall"], objHaz: ["cornice"] }, ["safety", "overview"]],
];

const LABELS = ["Climber-verified", "On file", "Auto-generated"];
/* The heading each section renders. Without this the table cannot tell a WIRING bug
   (heading on screen, no chip) from a THIN FIXTURE (section never rendered) — and those
   need opposite fixes. */
const HEADING = {
  approach: "APPROACH", descentText: "DESCENT", rappels: "RAPPELS", gpx: "ROUTE TRACK",
  waypoints: "WAYPOINTS", pitchDetail: "ROUTE BETA", beta: "BETA", gear: "RACK",
  climate: "CLIMATE &amp; SEASON", hazards: "KNOWN HAZARDS",
  pitchTable: "PITCH-BY-PITCH",
};
/* Several sections are DISCIPLINE-gated (cragOnly vs alpine), so a single-discipline probe
   reports a healthy section as unreachable — the trap check:field-renders records as "one
   discipline base, when RouteGearCheck is cragOnly". Try both before concluding anything. */
const DISCIPLINES = ["trad", "mountaineering"];
console.log("section        disc/tab                 heading?  chip?  verdict");
for (const [name, extra, tabs] of CASES) {
  let hit = null, sawHead = false, where = null;
  outer:
  for (const disc of DISCIPLINES) for (const tab of tabs) {
    let m;
    const r = Object.assign({}, base, { discipline: disc }, extra);
    try { m = render(r, tab); }
    catch (e) { m = "THREW:" + e.message; }
    if (m.startsWith("THREW:")) { hit = "THREW"; where = disc + "/" + tab; break outer; }
    const head = m.includes(HEADING[name]);
    const found = LABELS.filter(l => m.includes(l));
    if (head) { sawHead = true; where = disc + "/" + tab; }
    if (found.length) { hit = found.join("+"); where = disc + "/" + tab; break outer; }
    where = where || disc + "/" + tab;
  }
  const verdict = hit ? "ok" : sawHead ? "*** WIRING BUG: heading renders, no chip ***" : "fixture too thin (section never rendered)";
  console.log(`${name.padEnd(14)} ${String(where).padEnd(24)} ${sawHead ? "yes" : "no "}       ${hit ? "YES" : "no "}    ${verdict}`);
}
