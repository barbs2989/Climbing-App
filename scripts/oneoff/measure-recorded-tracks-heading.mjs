#!/usr/bin/env node
// "Recent recorded tracks" — does that section ever contain a recorded track?
//
// The list merges `route.communityTracks` (real recorded lines) with the route's TRIP REPORTS,
// each of which is mapped to the note "Trip report — no recorded track." So the heading names one
// kind of thing while the rows can be another.
//
// `communityTracks` is a SEED-only field: it appears on two seed ROUTES and nowhere else, and
// `routes` has no track column under any spelling — so `dbRouteToCamel`'s spread cannot deliver
// one either (that spread is why a zero grep in lib/db.js proves nothing on its own). Production
// sets VITE_USE_DB=true, so every route a real climber opens is a DB route.
//
// This RENDERS rather than reasoning: a populated field is not a rendered one, and proximity is
// not scope on a file that packs whole screens onto one physical line.
//
//   node scripts/oneoff/measure-recorded-tracks-heading.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-tracks-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
  .replace(/&#x2F;/g, "/").replace(/\s+/g, " ");

const ACTIVITY = [
  { user: "Maya Chen", date: "2026-07-12", text: "Snow to the notch, good conditions.", avatar: "" },
  { user: "Alex Torres", date: "2026-06-30", text: "Dry rock, one wet corner.", avatar: "" },
];

// A DB route: exactly what dbRouteToCamel can produce — no communityTracks under any spelling.
const dbRoute = {
  id: "probe_db", name: "Probe DB Route", grade: "5.9", gradeSystem: "yds",
  discipline: "alpine", pitches: 6, mountainId: "probe_area",
  gpxPts: [[47.5, -121.5], [47.51, -121.51]],
  // NO `activity` key and NO `communityTracks`: `routes` has a column for neither, so
  // dbRouteToCamel's spread cannot deliver one. Reports reach the page as a PROP.
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
};
// The CONTROL: a seed-shaped route that really does carry a recorded line. Without it a null
// result could just mean the section never rendered at all.
const seedRoute = {
  ...dbRoute, id: "probe_seed",
  communityTracks: [{ who: "Sam Rivera", date: "2026-08-01", note: "Recorded GPX, car to car.", avatar: "" }],
};

const TABS = ["overview", "conditions", "photos", "partners", "planner", "safety"];
const HEAD = "Recent tracks & trip reports";

let where = null;
for (const t of TABS) {
  if (text(render(dbRoute, t, ACTIVITY)).includes(HEAD)) { where = t; break; }
}
console.log("section renders on tab           : " + (where || "NONE — it reached no sub-tab"));
if (!where) {
  console.log("\nthe probe could not reach the section; nothing below would mean anything.");
  process.exit(1);
}

const seg = (b) => { const i = b.indexOf(HEAD); return i < 0 ? "" : b.slice(i, i + 900); };
const dbSeg = seg(text(render(dbRoute, where, ACTIVITY)));
const seedSeg = seg(text(render(seedRoute, where, ACTIVITY)));

const NOTRACK = "Trip report — no recorded track.";
const count = (h, n) => h.split(n).length - 1;

console.log("");
console.log("DB ROUTE (what production serves)");
console.log('  rows saying "no recorded track" : ' + count(dbSeg, NOTRACK));
console.log("  a recorded track's note present : " + dbSeg.includes("Recorded GPX"));
console.log("");
console.log("SEED ROUTE (control — proves the section CAN show a track)");
console.log('  rows saying "no recorded track" : ' + count(seedSeg, NOTRACK));
console.log("  a recorded track's note present : " + seedSeg.includes("Recorded GPX"));
console.log("");

const emptySeg = seg(text(render(dbRoute, where, [])));
const EMPTY = "No recent tracks or trip reports yet";
console.log("empty state, no trip reports     : " + (emptySeg.includes(EMPTY) ? '"' + EMPTY + '"' : "(not found)"));
console.log("");

if (count(seedSeg, NOTRACK) === 0 && !seedSeg.includes("Recorded GPX")) {
  console.log("CONTROL FAILED — the seed route showed neither kind of row, so this measurement is vacuous.");
  process.exit(1);
}
console.log('VERDICT: on a DB route this section contains ONLY trip reports (a recorded track is\n'
  + '         present: ' + dbSeg.includes("Recorded GPX") + '), so the heading must not assert that every\n'
  + '         row is one. It now reads "' + HEAD + '".');
