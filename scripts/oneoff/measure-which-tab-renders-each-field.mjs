// For each candidate route field, does adding it change what the PLANNER tab or the
// SAFETY tab renders? Only fields that actually produce content may gate their tab —
// otherwise the gate opens an empty tab.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/rappels-rack-filter-class-audit";
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-tabf-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { render } = require_(out);

// A bare crag route — the shape 99.5% of the catalog has. Rendered with the tab forced,
// so the gate under test does not hide the body we are measuring.
const base = () => ({
  id: "probe", name: "Probe", grade: "5.8", gradeSystem: "yds", discipline: "rock", style: "Trad",
  pitches: 3, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
});
const txt = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, "\n")
  .split("\n").map((s) => s.trim()).filter(Boolean).join(" | ");

const SAMPLES = {
  road: { name: "SR-20", status: "paved", driveNote: "PROBEVALUE drive note" },
  access: { permit: "PROBEVALUE permit", landManager: "PROBEVALUE manager" },
  permits: "PROBEVALUE permit string",
  approach: "PROBEVALUE approach text",
  descent: "PROBEVALUE descent text",
  descentText: "PROBEVALUE descent detail",
  waypoints: [{ type: "Trailhead", name: "PROBEVALUE TH", lat: 47.5, lng: -121.5, elevFt: 3000 }],
  itinerary: { days: [{ n: 1, title: "PROBEVALUE day", hours: 5 }] },
  timing: { totalHrs: 9, approachTimeHrs: 3 },
  gpxPts: [[47.5, -121.5], [47.51, -121.51]],
  distKm: 8.2, gainFt: 3200, lossFt: 3200,
  approachLogistics: { trailhead: "PROBEVALUE trailhead" },
  rappels: 4,
  rappelDetail: [{ n: 1, lengthM: 30, anchor: "PROBEVALUE bolts" }],
  elevPts: [3000, 3500, 4000],
  hazards: ["PROBEVALUE hazard"],
  objHaz: ["PROBEVALUE objective hazard"],
  watchOut: ["PROBEVALUE watch out"],
  comms: "PROBEVALUE comms",
  emergency: { rangerStation: "PROBEVALUE ranger" },
  bail: "PROBEVALUE bail",
  turnaround: "PROBEVALUE turnaround",
  seasonalHazards: ["PROBEVALUE seasonal"],
  climate: { typical: "PROBEVALUE climate" },
  maxAngle: 45,
};

const baseline = {};
for (const tab of ["planner", "safety", "overview"]) baseline[tab] = txt(render(base(), tab));

console.log("field".padEnd(20) + "planner  safety   overview   (✓ = the field's own value appears)");
for (const [k, v] of Object.entries(SAMPLES)) {
  const r = { ...base(), [k]: v };
  const row = ["planner", "safety", "overview"].map((tab) => {
    let t; try { t = txt(render(r, tab)); } catch (e) { return "THREW "; }
    const shows = t.includes("PROBEVALUE") || t.length !== baseline[tab].length;
    const own = t.includes("PROBEVALUE");
    return (own ? "  ✓    " : shows ? "  ~    " : "  ·    ");
  });
  console.log(k.padEnd(20) + row.join(" "));
}
console.log("\n✓ = the field's literal value renders on that tab; ~ = tab text changed but value not echoed (numeric/derived); · = no effect");
