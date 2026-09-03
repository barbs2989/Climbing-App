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
import { trackIsJustTheWaypoints, WAYPOINT_LINE_CAVEAT, trackCoverage } from "../lib/track.js";

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

// ── 1b. ONE VERTEX OF SLACK. A pin repair strands the vertex drawn through the pin's old position,
//    and with no slack that ONE vertex deleted the caveat: 52 routes had lost it, 17 of them beyond
//    recovery because the pin had been replaced rather than refined. The slack is safe only because
//    of the <=40 cap — a recording's points do not land within 5 m of NAMED waypoints — so these
//    cases pin BOTH directions. A rule that only ever admits is satisfied by deleting the test.
// Built FROM WPS, never typed: a hand-written coordinate that misses a pin makes the case test
// nothing, which is how the first version of these four failed against a correct predicate.
const OFF = [48.60, -121.30];                      // on no pin, a long way from every one of them
const STRANDED = [SYNTH[0], OFF, SYNTH[2], SYNTH[3]];
if (!trackIsJustTheWaypoints(STRANDED, WPS)) fail("predicate: one stranded vertex still deletes the caveat — a pin repair breaks it again");
else ok("predicate: a line with ONE vertex off a pin is still recognised as a sketch");

// TWO OFF A *FOUR*-POINT LINE IS NOT A SKETCH, and this case is what pins the slack to a MAJORITY
// rather than to a flat two. At four vertices, two of slack leaves only two explained by the
// waypoints — the line has as much content they do not account for as content they do. A flat
// two-of-slack qualifies this, which is why the rule is written as "a strict majority still sits on
// a pin" and derives its own minimum length.
const TWO_OFF = [SYNTH[0], OFF, [48.61, -121.31], SYNTH[3]];
if (trackIsJustTheWaypoints(TWO_OFF, WPS)) fail("predicate: TWO vertices off a FOUR-point line must not qualify — two is not a minority there");
else ok("predicate: two vertices off a four-point line is not a waypoint line");

// ── 1c. TWO OF SLACK WHERE TWO IS STILL A MINORITY. Eight routes had two pins repaired, so one
//    vertex of slack left them posing as recorded tracks — and five cannot be repaired at all,
//    because the pin was REPLACED rather than refined and there is nowhere correct to carry the
//    vertex to. Both directions, because a rule that only ever admits is satisfied by deleting it.
// A FIVE-pin fixture, so the vertex half is what these measure: against the four-pin WPS a
// five-point line fails the PIN side first and the case would be testing the wrong half — the
// mistake the two-point cases above already record.
const WPS5 = WPS.concat([{ name: "Col", type: "Junction", lat: 48.5512, lng: -121.1150 }]);
const P5 = WPS5.map(w => [w.lat, w.lng]);
const OFF2 = [48.62, -121.32], OFF3 = [48.63, -121.33];

// 3 of 5 on a pin: a strict majority, so this is the line drawn through pins two of which have
// since moved. Under one-vertex slack it is refused, which is the defect.
if (!trackIsJustTheWaypoints([P5[0], P5[1], P5[2], OFF, OFF2], WPS5))
  fail("predicate: a FIVE-point line with two stranded vertices is refused — two repaired pins still delete the caveat");
else ok("predicate: two stranded vertices on a five-point line is still recognised as a sketch");

// 2 of 5 is not a majority. The slack must not grow with the line.
if (trackIsJustTheWaypoints([P5[0], P5[1], OFF, OFF2, OFF3], WPS5))
  fail("predicate: THREE vertices off a five-point line qualified — the majority condition is not holding");
else ok("predicate: three vertices off a five-point line is not a waypoint line");

// THE CASE THAT SEPARATES A MAJORITY FROM A FLAT TWO. On a three-point line, two of slack means ONE
// vertex need be a pin — not a sketch test at all. Refused here, admitted by a flat two.
//
// AGAINST A *THREE*-PIN ROUTE, and that is not cosmetic: with five pins the PIN half refuses this
// line first (one of five on it), so the case passed against a flat-two predicate and was proving
// nothing about the vertex rule it names. Found by the injection coming back WRONG FAILURE, not by
// reading it — the same wrong-half mistake the two-point cases above already record.
const WPS3 = WPS.slice(0, 3);
if (trackIsJustTheWaypoints([P5[0], OFF, OFF2], WPS3))
  fail("predicate: a THREE-point line with one vertex on a pin qualified — a flat two of slack has been let in");
else ok("predicate: a three-point line still needs two of its points on a pin");

// STRICTLY ADDITIVE: a two-point line has no interior, so one of slack is HALF of it. Applying the
// slack there admitted a 55 m placeholder and took the caveat AWAY from 34 lines that had it.
if (trackIsJustTheWaypoints([SYNTH[0], OFF], WPS)) fail("predicate: a 2-point line with one end off a pin must NOT qualify — the slack must not reach a line with no interior");
else ok("predicate: a two-point line still needs both ends on a pin");
// against a TWO-pin route: with four pins a two-point line fails the PIN side (3 of 4 must be on
// the line), so this case would have been testing the wrong half of the predicate.
const TWO_PINS = [WPS[0], WPS[3]];
if (!trackIsJustTheWaypoints([SYNTH[0], SYNTH[3]], TWO_PINS)) fail("predicate: a 2-point line through two pins stopped qualifying — the change must be additive");
else ok("predicate: a two-point line through two pins is unaffected");
if (trackIsJustTheWaypoints([SYNTH[0], OFF], TWO_PINS)) fail("predicate: a 2-point line with one end off a pin qualified against a 2-pin route — the slack reached a line with no interior");
else ok("predicate: two points, one off a pin, still refused when the pin side cannot mask it");

// ── 2. It reaches the screen, and only on the routes it should.
if (!shows(route({ gpxPts: SYNTH, waypoints: WPS }))) fail("the caveat does not render on a route whose track is just its waypoints");
else ok("the caveat renders on a waypoint-polyline route");

if (shows(route({ gpxPts: REAL, waypoints: WPS }))) fail("the caveat renders on a route with a GENUINE track — that is a false warning on good data");
else ok("a genuine track carries no caveat");

// ── 3. A PARTIAL track must say which end is missing.
//
//    Different question from section 2 and it needed its own fixture, because a partial track is
//    a GENUINE recording — it just does not cover the whole route. Measured over the 378 WA
//    routes carrying a real track and pins to judge against: 63 (16.9%) start more than 2 km from
//    their own Trailhead pin, and 6 stop more than 2 km short of the summit. The page drew all of
//    them with a "Download GPX" button beneath and said nothing.
//
//    The summit case is the one that matters most — somebody following the line runs out of it
//    while still climbing — so it is asserted separately rather than folded into one "is partial"
//    test. A check that fires on either end cannot tell you the dangerous half broke.
const CLIMB_ONLY = REAL.filter(p => p[0] > 48.535);   // starts at the glacier, not the trailhead
const STOPS_SHORT = REAL.filter(p => p[0] < 48.535);  // never reaches the summit
const covText = r => text(render(r, "planner"));

const covFull = trackCoverage(REAL, WPS);
if (covFull) fail(`coverage: a track running trailhead-to-summit was called partial (${JSON.stringify(covFull)}) — a false warning on good data`);
else ok("coverage: a track covering the whole route carries no partial caveat");

if (trackCoverage(SYNTH, WPS)) fail("coverage: a SYNTHETIC line got a partial caveat too — it already carries the stronger one, and two captions contradict each other");
else ok("coverage: a synthetic line is left to its own caveat");

if (trackCoverage(REAL, [])) fail("coverage: with no pins to judge against, it must claim NOTHING rather than guess");
else ok("coverage: no trailhead or summit pin means no claim");

const covA = trackCoverage(CLIMB_ONLY, WPS);
if (!covA || !covA.missingApproach) fail("coverage: a climb-only track (no walk-in recorded) was not detected");
else if (covA.missingSummit) fail("coverage: a climb-only track was ALSO reported as stopping short of the summit — it reaches it");
else ok(`coverage: a climb-only track is detected (${Math.round(covA.approachGapM)} m from the trailhead)`);

/* A line that passes NONE of the route's own pins is not a partial track — it is a record of a
   different way up the peak, and blaming the line there points the reader at the wrong half.
   wa_mount_barnes_scramble is the real case: eight waypoints on the Sol Duc/Bailey Range
   approach, a 438-point gpx of the Elwha River Trail, and both complete. */
const ELSEWHERE = REAL.map(p => [p[0] + 0.30, p[1] + 0.30]);
const covD = trackCoverage(ELSEWHERE, WPS);
if (!covD || !covD.differentApproach) fail("coverage: a line passing NONE of the route's pins was reported as a partial track — that blames the wrong record");
else if (covD.missingApproach || covD.missingSummit) fail("coverage: a different-approach line must not ALSO claim a missing end — the two are different findings");
else ok("coverage: a line passing none of the route's own pins is called a different approach, not a partial track");

if (trackCoverage(ELSEWHERE, WPS.slice(0, 1))) {
  const one = trackCoverage(ELSEWHERE, WPS.slice(0, 1));
  if (one.differentApproach) fail("coverage: ONE pin off the line is not enough evidence for a different-approach claim");
  else ok("coverage: with a single pin it falls back to the ordinary partial wording rather than telling a story");
}

const shownD = covText(route({ gpxPts: ELSEWHERE, waypoints: WPS }));
if (!/different ways up this peak/i.test(shownD)) fail("the different-approach caveat does not reach the screen");
else if (/walk in is not in this line|short of the summit/i.test(shownD)) fail("the different-approach route ALSO renders a partial caveat — two sentences contradicting each other");
else ok("the different-approach caveat renders, and the partial wording does not");

const covS = trackCoverage(STOPS_SHORT, WPS);
if (!covS || !covS.missingSummit) fail("coverage: a track stopping short of the summit was not detected — this is the dangerous half");
else ok(`coverage: a track stopping short of the summit is detected (${Math.round(covS.summitGapM)} m)`);

/* On screen, and stating the DISTANCE. "This track is incomplete" tells a climber nothing they
   can plan around, so the sentence has to carry a measurement — and a rendered sentence with no
   number in it is the way this silently degrades. */
const shownA = covText(route({ gpxPts: CLIMB_ONLY, waypoints: WPS }));
if (!/walk in is not in this line/i.test(shownA)) fail("the climb-only caveat does not reach the screen");
else if (!/\d/.test((shownA.match(/The walk in is not in this line[^.]*\./i) || [""])[0])) fail("the climb-only caveat renders without a distance — it must say how far, not just that it is short");
else ok("the climb-only caveat renders, with the gap measured");

const shownS = covText(route({ gpxPts: STOPS_SHORT, waypoints: WPS }));
if (!/stops .* short of the summit/i.test(shownS)) fail("the stops-short-of-the-summit caveat does not reach the screen");
else ok("the stops-short caveat renders");

if (/walk in is not in this line|short of the summit/i.test(covText(route({ gpxPts: REAL, waypoints: WPS }))))
  fail("a complete track renders a partial-coverage caveat — a false warning on good data");
else ok("a complete track renders no partial-coverage caveat");

console.log();
if (failures) { console.error(`check:track-caveat FAILED — ${failures} problem(s).`); process.exit(1); }
console.log("ok — a line drawn between waypoints says so, a partial one says which end is missing, and a real track is left alone");

// Injection-tested, 6 cases:
//   delete the caveat from RouteDetail's ROUTE TRACK block  -> assertion 2 fails
//   make trackIsJustTheWaypoints always return true         -> the genuine-track assertions fail
//   rename the ROUTE TRACK heading                          -> ANCHOR LOST, nothing reported clean
//   delete the coverage caveat from the ROUTE TRACK block   -> section 3's two render tests fail
//   make trackCoverage always report missingApproach        -> the false-warning assertions fail
//   drop the different-approach branch                      -> a line passing no pin reads as partial
