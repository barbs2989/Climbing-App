// Confirm the three placement changes by rendering, not by reading the diff:
//   - "Got beta?" sits with the beta cluster on Overview, not at the page bottom
//   - TURNAROUND is gone from Plan and its prose is on Safety, under BAILOUT & TURNAROUND
//   - the planner no longer names the formula behind its estimate
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
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-place-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render } = require_(out);

const TURN = "Set a firm turnaround given the long approach and multi-rappel descent.";
const route = {
  id: "probe_place", name: "Probe", grade: "5.8", gradeSystem: "yds", discipline: "alpine",
  pitches: 6, mountainId: "probe_area", turnaround: TURN,
  bail: "Retreat from the notch via two 30m raps.",
  beta: ["x".repeat(240)], approach: "Walk in from the trailhead for two hours.",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington", lat: 48.8, lng: -121.1 },
};
const txt = h => h.replace(/<[^>]+>/g, "\n").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\n+/g, "\n");

let bad = 0;
const ck = (name, ok, extra) => { console.log((ok ? "  ok    " : "  FAIL  ") + name + (extra ? "   " + extra : "")); if (!ok) bad++; };

const ov = txt(render(route, "overview"));
const iBeta = ov.indexOf("CLIMBER BETA") > -1 ? ov.indexOf("CLIMBER BETA") : ov.indexOf("BETA");
const iCta = ov.indexOf("Got beta?") > -1 ? ov.indexOf("Got beta?") : ov.indexOf("got beta?");
const iLog = ov.indexOf("Log an ascent");
const iMore = ov.indexOf("More on ");
console.log("\n--- Overview: the contribute prompt sits with the beta ---");
ck("the prompt renders on Overview", iCta > -1);
ck("it sits AFTER the beta block", iBeta > -1 && iCta > iBeta, "beta@" + iBeta + " cta@" + iCta);
ck("it sits BEFORE 'Log an ascent'", iLog > -1 && iCta < iLog, "log@" + iLog);
ck("it is no longer past 'More on <peak>'", iMore > -1 && iCta < iMore, "more@" + iMore);

console.log("\n--- Turnaround moved off Plan and onto Safety ---");
const pl = txt(render(route, "planner"));
const sf = txt(render(route, "safety"));
ck("no TURNAROUND heading on Plan", !/\bTURNAROUND\b/.test(pl));
ck("the turnaround prose is NOT on Plan", !pl.includes(TURN));
ck("Safety carries the merged heading", sf.includes("BAILOUT & TURNAROUND") || sf.includes("BAILOUT &amp; TURNAROUND"));
ck("the turnaround prose IS on Safety", sf.includes(TURN));
ck("it sits ABOVE the bail points", sf.indexOf(TURN) < sf.indexOf("Retreat from the notch"));

console.log("\n--- The planner no longer names its formula ---");
ck("no 'Scarf' anywhere on Plan", !/Scarf/i.test(pl));
ck("the estimate is still labelled", /estimate for your party/i.test(pl));

console.log(bad ? "\n" + bad + " FAILED" : "\nall placements confirmed");
process.exit(bad ? 1 : 0);
