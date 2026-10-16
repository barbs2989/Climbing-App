// A TRIP REPORT IS NOT A RECORDED TRACK, and the collapsed row said it was.
//
// RouteDetail's "Recent recorded tracks" builds its list from two sources:
//
//     ctSeed    = route.communityTracks         real recorded lines, each with its own note
//     actTracks = route.activity.map(...)       TRIP REPORTS -- and this map never sets gpxPts
//
// Every actTracks row carried a hardcoded note: "Recorded line — followed the standard route."
// Both halves are unknowable. No path exists (the EXPANDED view already admits "No recorded path
// from <who>"), and which line they took is recorded nowhere -- a report may describe a variation
// or a turnaround. The correction was one tap away; the collapsed row is the default state.
//
// The download control was already honest ("Download standard route line (GPX)" plus a caveat),
// which is what made the collapsed row's claim the odd one out.
//
// Render invocation COPIED from check:bare rather than re-derived.
import fs from "fs";
import os from "os";
import path from "path";
import { build } from "esbuild";
import { createRequire } from "module";
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
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-track-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// A route with a trip report and NO community track — the case that was lying.
const withReport = {
  id: "probe_track", name: "Probe Route", grade: "Class 3", gradeSystem: "yds",
  discipline: "mountaineering", pitches: 0, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
  activity: [{ user: "Maya Chen", date: "2026-06-16", text: "Snow lingering above 11k.", tickType: "Summit" }],
};

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};

const html = render(withReport, "planner");
ok("ANCHOR — the tracks section rendered at all", html.includes("Recent recorded tracks"),
  "every assertion below is vacuous without it");
ok("the trip report is still surfaced", html.includes("Maya Chen"),
  "the row was dropped — this change was meant to relabel it, not remove it");
// The EXACT old note, not the substring "Recorded line" — the corrected section blurb legitimately
// says "Recorded lines other parties walked" about the community-track half, and a loose assertion
// here failed on a correct fix.
ok("it no longer claims a recorded line", !html.includes("Recorded line — followed"),
  "the collapsed row still asserts a track that does not exist");
ok("it no longer claims they followed the standard route", !html.includes("followed the standard route"),
  "which line they took is recorded nowhere");
ok("it says what the row actually is", html.includes("Trip report"),
  "the replacement copy did not reach the screen");
ok("the section blurb no longer calls the whole list walked lines",
  !html.includes("Lines other parties actually walked"),
  "the list is mixed, and the blurb still generalises");

console.log(fail ? `\n${fail} failure(s).` : "\nall cases pass — a trip report is presented as a trip report.");
process.exitCode = fail ? 1 : 0;
