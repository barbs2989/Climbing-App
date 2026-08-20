#!/usr/bin/env node
// check:waypoint-caveat — a waypoint list whose COORDINATES were manufactured must say so.
//
// The sibling of `check:track-caveat`, and the worse defect of the two. That one guards a LINE
// drawn between real pins; this one guards the pins themselves. 63 of the 372 judgeable WA routes
// have every intermediate waypoint spaced along the straight segment from the trailhead pin to the
// summit pin, and 44 are collinear to within 20 m — most at 0 m. A trailhead, a creek ford, a camp
// and a col are not collinear, so this is not a tolerance question.
//
// WHAT MAKES IT DANGEROUS IS THAT THE ELEVATIONS ARE RIGHT. They were read from the route's own
// prose, so the list reads as precise local knowledge — "Crescent Creek Basin Camp, 6,050 ft" —
// while the coordinate behind it sits 6 km from the peak at 1,432 ft.
// `wa_castle_peak_pasayten_scramble` pins a 1,500 ft creek junction on a 7,990 ft ridge 24 km out.
//
// A CAPTION, not a removal, exactly as the track caveat and the RACK caption are: the names and
// elevations are worth keeping, and it is the map positions that are not true. Measured by
// `npm run audit:synthetic-waypoints` (no DEM) and confirmed against USGS 3DEP by
// `npm run audit:waypoint-elevations`.
//
// A REAL TRACK IS NOT EVIDENCE THE PINS ARE REAL — 22 of the 63 carry a track of 100+ points, and
// 18 satisfy `trackIsJustTheWaypoints` as well, so on those neither the line nor the pins record
// anywhere. The two predicates are independent and both are asserted here.
//
// Static SSR (no browser, no DB), so it sits in `npm run build`.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { waypointsAreOnOneLine, SYNTHETIC_WAYPOINT_CAVEAT } from "../lib/track.js";

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-wpcav-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// renderToStaticMarkup ESCAPES — see [[ssr-probes-must-match-escaped-html]]. The caveat contains an
// apostrophe, which comes back as &#x27;, so matching the raw string reports a rendered caption as
// missing.
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

// Eight pins spaced along one straight line from a trailhead to a summit, climbing 1,000 -> 7,900 ft:
// the exact shape the enrichment produced.
const A = { lat: 48.4900, lng: -121.1200 }, B = { lat: 48.5600, lng: -121.1000 };
const SYNTH_WPS = Array.from({ length: 8 }, (_, i) => {
  const t = i / 7;
  return { name: `Point ${i}`, type: ["Trailhead","Junction","Water","Campsite","Junction","Hazard","Junction","Summit"][i],
    lat: A.lat + (B.lat - A.lat) * t, lng: A.lng + (B.lng - A.lng) * t,
    elev: Math.round(1000 + 6900 * t) };
});
// The same walk as it really is: a path that wanders off the direct line, as terrain forces.
const REAL_WPS = SYNTH_WPS.map((w, i) => ({ ...w,
  lng: w.lng + (i === 0 || i === 7 ? 0 : (i % 2 ? 0.011 : -0.009)) }));

const route = extra => Object.assign({
  id: "probe_wp", name: "Probe", grade: "5.6", gradeSystem: "yds",
  discipline: "alpine", pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
}, extra);

let failures = 0;
const fail = m => { console.log("  FAIL  " + m); failures++; };
const ok = m => console.log("  ok    " + m);
const shows = r => text(render(r, "planner")).includes(SYNTHETIC_WAYPOINT_CAVEAT);

console.log("check:waypoint-caveat\n");

// ── 0. The probe must be able to fire. If a synthetic-pin route renders no WAYPOINTS section at
//    all, every assertion below passes vacuously — the ANCHOR LOST rule check:camping records.
//    Anchored on the heading ELEMENT in the RAW html, never the stripped words, because two
//    surfaces render a WAYPOINTS heading and other prose mentions the word.
const raw = render(route({ waypoints: SYNTH_WPS }), "planner");
if (!raw.includes(">WAYPOINTS<")) {
  console.log("  FAIL  ANCHOR LOST: a route with waypoints renders no 'WAYPOINTS' heading.");
  console.log("        The section moved or is unmounted. Nothing below was checked.");
  process.exit(1);
}
ok("probe is live — the WAYPOINTS section renders for a route carrying pins");

// ── 1. The pure predicate, tested directly as well as through the screen: a render-only test
//    cannot say WHICH half broke when it goes red.
if (!waypointsAreOnOneLine(SYNTH_WPS)) fail("predicate: 8 pins evenly spaced on one line are not recognised");
else ok("predicate: pins spaced along a trailhead->summit line are recognised");

if (waypointsAreOnOneLine(REAL_WPS)) fail("predicate: a wandering real approach was called synthetic — this would caption correct data");
else ok("predicate: an approach that wanders off the direct line is NOT called synthetic");

if (waypointsAreOnOneLine(SYNTH_WPS.slice(0, 4))) fail("predicate: 4 pins is too few to tell a line from a path");
else ok("predicate: fewer than 5 pins does not qualify");

// A flat traverse may genuinely run straight. Without real relief across the pins this would
// caption correct data, which is the trap that makes people ignore a guard.
if (waypointsAreOnOneLine(SYNTH_WPS.map(w => ({ ...w, elev: 5000 }))))
  fail("predicate: a FLAT straight traverse must not qualify — relief is what makes a line impossible");
else ok("predicate: a straight line with no relief across it is not a finding");

// ── 2. It reaches the screen, and only where it should.
if (!shows(route({ waypoints: SYNTH_WPS }))) fail("the caveat does not render on a route whose pins are on one line");
else ok("the caveat renders on a synthetic-waypoint route");

if (shows(route({ waypoints: REAL_WPS }))) fail("the caveat renders on a route whose waypoints are REAL — worse than not having it");
else ok("the caveat stays off a route with real waypoints");

// ── 3. It is independent of the track caveat. A route can have real pins and a synthetic line, or
//    manufactured pins beside a genuine 100+ point track; neither caption may stand in for the
//    other. 22 of the 63 real cases carry a long track.
const longTrack = [];
for (let i = 0; i < 200; i++) {
  const t = i / 199;
  longTrack.push([A.lat + (B.lat - A.lat) * t + Math.sin(i / 7) * 0.004,
                  A.lng + (B.lng - A.lng) * t + Math.cos(i / 5) * 0.004]);
}
if (!shows(route({ waypoints: SYNTH_WPS, gpxPts: longTrack })))
  fail("a genuine 200-point track suppressed the waypoint caveat — a real track is not evidence the pins are real");
else ok("the caveat still renders when a genuine long track sits beside manufactured pins");

console.log("");
if (failures) { console.log(`${failures} failure(s).`); process.exit(1); }
console.log("ok — manufactured waypoint coordinates say so on the screen that shows them.");

// Injection-tested. Each case must fail this check, and re-run them after any change to the
// predicate or the render site:
//   1. delete the `{waypointsAreOnOneLine(...)?...}` block from RouteDetail  -> the render assertions fail
//   2. make waypointsAreOnOneLine always return true                        -> the REAL_WPS assertions fail
//   3. drop the relief test from the predicate                              -> the flat-traverse assertion fails
//   4. rename the WAYPOINTS heading                                         -> ANCHOR LOST, exit 1, nothing claimed
