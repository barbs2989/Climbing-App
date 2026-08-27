#!/usr/bin/env node
/* The RETURN leg must not re-add a walk the figures already covered.
 *
 * PREMISE, read off the code rather than assumed:
 *     hikeH  = scarfHrs(distKm, gainM, lossM)      -- ONE walk, charged for gain AND loss
 *     totalH = hikeH + techH ; sumH = depart + totalH
 *     retH   = publishedIsWholeDay ? sumH : sumH + (pitches>0 ? techH*0.7 : hikeH*0.75)
 * so hikeH is meant to be the ONE-WAY approach and the return is a fraction of it.
 *
 * `gainCoversWholeOuting` (|loss-gain|/gain <= 3%) is the app's OWN test for rows whose figures
 * cover the whole outing. For those it already relabels the tile "On foot" and TECH STATS already
 * says "Total ascent is the whole day from the trailhead, not just the walk in" -- and then the
 * return added another 75% of that same walk. Label and arithmetic contradicting each other on one
 * screen: wa_ptarmigan_traverse read `21.6hr On foot` with Est. return 16.2 hr after Est. summit.
 * 196 WA routes, median +7.67 hr.
 *
 * THE PREMISE IS SOLID BECAUSE 433 OF THE 484 QUALIFYING ROWS HAVE gain EXACTLY EQUAL TO loss --
 * a round trip, or a traverse ending at its start elevation. That is not a coincidence on a
 * one-way approach.
 *
 * SCOPED TO THE WALK BRANCH, and the first draft was not: a pitched route's return is `techH*0.7`,
 * the descent of the CLIMB, which the walk never double-counted. Short-circuiting the whole
 * expression the way publishedIsWholeDay does would have stripped a real leg from 212 rows.
 *
 * Static SSR (no browser, no DB), so it sits in `npm run build`.
 */
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
export function render(route) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-retleg-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const FT = 3.28084;
/* gainM/lossM because dbRouteToCamel hands the app METRES; getting that backwards would silence
   every case here while the fixtures still looked right. */
const route = (over) => Object.assign({
  id: "probe_ret", name: "Probe", grade: "Class 3", gradeSystem: "yds",
  discipline: "mountaineering", distKm: 20, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
}, over || {});

let fail = 0;
const eq = (label, got, want) => {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};
// The two clock times, read off the rendered tiles.
const TIMES = /([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. summit.*?([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. return/;
const times = (r) => { const m = text(render(r)).match(TIMES); return m ? { summit: m[1], ret: m[2] } : null; };

console.log("the planner renders both clock tiles (so an EQUAL pair is not vacuous)");
const wholeDay = route({ gainM: 7000 / FT, lossM: 7000 / FT });
const t0 = times(wholeDay);
eq("ANCHOR: both tiles rendered", !!t0, true);

console.log("\na walk that already covers the day is not re-added");
eq("Est. return equals Est. summit", t0 ? t0.summit === t0.ret : null, true);

console.log("\n...and every other shape KEEPS its return leg");
/* One-way: gain and loss differ, so hikeH really is just the walk in. */
const oneWay = times(route({ gainM: 7000 / FT, lossM: 500 / FT }));
eq("ANCHOR: one-way rendered", !!oneWay, true);
eq("a one-way approach still adds a return", oneWay ? oneWay.summit !== oneWay.ret : null, true);
/* PITCHED whole-outing: the return is techH*0.7, the descent of the CLIMB, which the walk never
   double-counted. This is the case the first draft of the fix wrongly stripped, on 212 rows. */
const pitchedWhole = times(route({ gainM: 7000 / FT, lossM: 7000 / FT, pitches: 8, grade: "5.8" }));
eq("ANCHOR: pitched whole-outing rendered", !!pitchedWhole, true);
eq("a PITCHED whole-outing route keeps its climb descent", pitchedWhole ? pitchedWhole.summit !== pitchedWhole.ret : null, true);
/* Just outside the app's own 3% window — not a whole-outing row. */
const nearMiss = times(route({ gainM: 7000 / FT, lossM: 6500 / FT }));
eq("outside the 3% window still adds a return", nearMiss ? nearMiss.summit !== nearMiss.ret : null, true);

console.log(fail
  ? `\ncheck:return-leg: ${fail} FAILURE(S)`
  : "\ncheck:return-leg: ok — a whole-day walk is not counted twice, and every other shape keeps its return.");
process.exit(fail ? 1 : 0);
