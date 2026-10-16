// "RECENT RECORDED TRACKS" READS route.activity, NOT THE PAGE'S MERGED `activity`.
//
// RouteDetail builds one merged list near the top of the component:
//
//     const activity = useMemo(() => (route.activity||[]).concat(myReports||[]).concat(dbReports) ...)
//
// Every other reader on the page uses it. The tracks section, ~88,000 characters further down and
// in the SAME component scope, reaches past it to the raw prop:
//
//     var actTracks = ((route.activity)||[]).filter(a => a && a.date).map(...)
//
// dbRouteToCamel does NOT produce an `activity` key (it spreads the row, and `routes` has no such
// column), so on a DB route `route.activity` is undefined. The other half of the list is
// `route.communityTracks`, and `routes` has no community-tracks column either — so on production
// BOTH halves are empty by construction and the section renders:
//
//     "No recent tracks yet — be the first to share one after you climb it."
//
// ...to a route that may carry any number of trip reports, which the page renders elsewhere from
// the merged list. The section is not wrong about one row; it can never populate.
//
// This is proved WITHOUT a database or a hook: `myReports` is a PROP and is one of the three
// inputs to the merge, so a report supplied that way lands in `activity` while `route.activity`
// stays undefined — exactly the shape a DB route has.
//
// Render invocation copied from check:bare rather than re-derived.
import fs from "fs";
import os from "os";
import path from "path";
import { build } from "esbuild";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const dead = (m) => { console.error("FAIL (probe cannot report): " + m); process.exit(1); };

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab, myReports) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: myReports || [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-rawprop-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// A DB-shaped route: no `activity` key and no `communityTracks` key, exactly as dbRouteToCamel
// leaves it. Everything else is the minimum RouteDetail needs to draw the Planner tab.
const dbRoute = {
  id: "probe_raw", name: "Probe Route", grade: "Class 3", gradeSystem: "yds",
  discipline: "mountaineering", pitches: 0, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
};
const REPORT = "Snow lingering above eleven thousand.";
const report = [{ user: "Robin Belay", date: "2026-06-16", text: REPORT, tickType: "Summit" }];

const EMPTY = "No recent tracks yet";

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};

const bare = render(dbRoute, "planner", []);
const withReport = render(dbRoute, "planner", report);
const conditions = render(dbRoute, "conditions", report);

// Without these every assertion below is satisfied by a page that rendered nothing.
ok("ANCHOR — the tracks section rendered", bare.includes("Recent recorded tracks"),
  "every assertion below is vacuous without it");
ok("CONTROL — with no reports at all the section is empty", bare.includes(EMPTY),
  "the empty state is not the string this probe is looking for — ANCHOR LOST");
// Asserted on CONDITIONS, which is where a report body renders — the Planner tab does not show it,
// so a control pointed there fails against a working merge and makes the finding look like a
// broken fixture.
ok("CONTROL — the report does merge into `activity`", conditions.includes(REPORT),
  "myReports never merged, so the fixture proves nothing about the section");

ok("a trip report reaches the recorded-tracks section", !withReport.includes(EMPTY),
  "the section still claims there is nothing, on a route whose report the page renders elsewhere");
ok("the report's author is listed in the section", withReport.includes("Robin Belay"),
  "the empty state cleared but no row appeared");

console.log(fail ? `\n${fail} failure(s).` : "\nall cases pass — the section reads the same list the page does.");
process.exitCode = fail ? 1 : 0;
