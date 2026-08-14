#!/usr/bin/env node
// check:track-caveat — a line drawn between a route's own waypoints must not be presented as a
// recorded GPS track.
//
// 201 of the 580 WA routes carrying a `gpx` store a polyline whose every vertex IS one of that
// route's own waypoints — median FOUR points, and 162 of them span more than 2 km. The route page
// renders those under a ROUTE TRACK heading, draws them on the map, and offers "Download GPX", so a
// climber can take away five straight segments across 22 km of the North Cascades
// (`wa_amphitheater_mountain_north_ridge`) as though somebody had walked it.
//
// The waypoints are real and worth keeping. Calling the line between them a track is the untrue
// part, so this is a CAPTION rather than a removal — the same shape as the RACK caption and the
// fire panel's "distances are to the reported point of origin" caveat.
//
// WHY THE PROVENANCE CHIP DOES NOT ALREADY COVER IT, measured rather than argued:
// `auto_generated` is true on 45% of the synthetic tracks and on 78% of the routes whose track is
// genuine. It points the WRONG WAY, so a climber reading the chip cannot tell which kind of line is
// on screen. `check:provenance` already records the governing rule — a per-section signal must beat
// the route-level flag.
//
// AND WHY NO WAYPOINT AUDIT CAN SEE THIS CLASS: all three ask "is each pin on this route's own
// track?" On these routes the answer is yes BY CONSTRUCTION, because the track is a copy of the
// pins rather than independent evidence — two records agreeing is one claim counted twice. The
// tiny-stub placeholder gate those audits carry is about EXTENT and cannot reach it either.
//
// Static SSR (no browser, no DB), so it sits in `npm run build`.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { trackIsJustTheWaypoints, WAYPOINT_LINE_CAVEAT } from "../lib/track.js";

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-track-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// renderToStaticMarkup ESCAPES. The caveat contains an apostrophe ("route's"), which comes back as
// &#x27; — matching the raw string would report a rendered caption as missing.
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

// Waypoints of a real alpine approach, and a track that is exactly those four points.
const WPS = [
  { name: "Trailhead", type: "Trailhead", lat: 48.4926, lng: -121.1176 },
  { name: "Basin camp", type: "Campsite", lat: 48.5299, lng: -121.1242 },
  { name: "Glacier gain", type: "Junction", lat: 48.5479, lng: -121.1249 },
  { name: "Summit", type: "Summit", lat: 48.5543, lng: -121.1043 },
];
const SYNTH = WPS.map(w => [w.lat, w.lng]);
// A genuine track: the same walk, but with vertices BETWEEN the pins as a recorded one has.
const REAL = [];
for (let i = 0; i < WPS.length - 1; i++)
  for (let s = 0; s < 8; s++)
    REAL.push([WPS[i].lat + (WPS[i + 1].lat - WPS[i].lat) * (s / 8),
               WPS[i].lng + (WPS[i + 1].lng - WPS[i].lng) * (s / 8)]);
REAL.push([WPS[3].lat, WPS[3].lng]);

const route = extra => Object.assign({
  id: "probe_track", name: "Probe", grade: "5.6", gradeSystem: "yds",
  discipline: "alpine", pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
}, extra);

let failures = 0;
const fail = m => { console.log("  FAIL  " + m); failures++; };
const ok = m => console.log("  ok    " + m);
const shows = r => text(render(r, "planner")).includes(WAYPOINT_LINE_CAVEAT);

console.log("check:track-caveat\n");

// ── 0. The probe must be able to fire at all. If a synthetic-track route renders no ROUTE TRACK
//    section, every assertion below is vacuous — the check:camping ANCHOR LOST rule.
//
//    Anchor on the heading ELEMENT (`>ROUTE TRACK<`) in the RAW html, never on the stripped words.
//    Two surfaces render that text and only one is the heading: CAMPING & BIVY's own prose says
//    "Anything marked on the track is also a pin under ROUTE TRACK." whenever a campsite waypoint
//    is on the track — which this fixture has. A stripped-text match found that sentence, so
//    renaming the heading left this check GREEN. Caught by injection, not by reading it; the same
//    two-surfaces trap CLAUDE.md records for `rappels`, and the reason its landmark rule says to
//    match whole lines rather than substrings.
const anchored = render(route({ gpxPts: SYNTH, waypoints: WPS }), "planner").includes(">ROUTE TRACK<");
if (!anchored) {
  console.log("  FAIL  ANCHOR LOST: a route with a track renders no 'ROUTE TRACK' heading on the Planner.");
  console.log("        The section moved or is unmounted. Nothing below was checked.");
  process.exit(1);
}
ok("probe is live — the ROUTE TRACK section renders for a route carrying a track");

// ── 1. The pure predicate. Tested directly as well as through the screen, because a render-only
//    test cannot say WHICH half broke when it goes red.
if (!trackIsJustTheWaypoints(SYNTH, WPS)) fail("predicate: a 4-point line through 4 waypoints is not recognised");
else ok("predicate: a line that is just the waypoints is recognised");

if (trackIsJustTheWaypoints(REAL, WPS)) fail("predicate: a genuine 25-point track was wrongly called synthetic — this would caption correct data");
else ok("predicate: a genuine track with vertices between the pins is NOT called synthetic");

if (trackIsJustTheWaypoints([[48.49, -121.11], [48.55, -121.10]], [])) fail("predicate: a route with NO waypoints must not qualify");
else ok("predicate: no waypoints means nothing to be a copy of");

// ── 2. It reaches the screen, and only on the routes it should.
if (!shows(route({ gpxPts: SYNTH, waypoints: WPS }))) fail("the caveat does not render on a route whose track is just its waypoints");
else ok("the caveat renders on a waypoint-polyline route");

if (shows(route({ gpxPts: REAL, waypoints: WPS }))) fail("the caveat renders on a route with a GENUINE track — that is a false warning on good data");
else ok("a genuine track carries no caveat");

console.log();
if (failures) { console.error(`check:track-caveat FAILED — ${failures} problem(s).`); process.exit(1); }
console.log("ok — a line drawn between waypoints says so, and a real track is left alone");

// Injection-tested, 3 cases:
//   delete the caveat from RouteDetail's ROUTE TRACK block  -> assertion 2 fails
//   make trackIsJustTheWaypoints always return true         -> the genuine-track assertions fail
//   rename the ROUTE TRACK heading                          -> ANCHOR LOST, nothing reported clean
