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
// WHAT THIS CANNOT SEE, measured rather than guessed. All three tests read only the COORDINATES,
// so they catch fabrication that left a structural fingerprint and nothing else. Pins that were
// manufactured and then ROUNDED to surveyed precision are invisible:
// `wa_himmelhorn_southeast_route` claims 5,100-7,400 ft across five pins whose ground reads
// 1,191-1,612, and its coordinates sit at 6 decimals and are not collinear — so no caveat renders,
// correctly, by every test here. Measured 2026-08-20: 180 of the 1,016 routes with pins would
// caption (18%), while 371 pins of 4,195 carry more than 8 decimals and 3,353 sit at 4-6.
//
// THAT GAP IS NOW CLOSED, and the note it replaces was wrong about why it was hard. It said
// closing it "needs the verdict PRECOMPUTED and stored — a schema decision". Precomputed, yes;
// a schema decision, no. `lib/ground-checked-pins.js` is generated once by
// `scripts/oneoff/build-ground-disagreement-index.mjs` and committed, so it needs no migration,
// cannot corrupt `waypoints`, and arrives as a reviewable diff. Section 6 guards it.
//
// The published measurement SELF-INVALIDATES: each entry records the lat/lng/elev it was taken
// for, and the reader re-checks all three against the live pin. Repair a coordinate and the entry
// retires itself, so a stale flag can never start accusing a pin that is now correct — which would
// be worse than the silence it replaced, the app being confidently wrong rather than quiet.
// `oneoff/probe-caveat-on-real-rows.mjs` renders real rows and pins the coordinate-only limit.
//
// Static SSR (no browser, no DB), so it sits in `npm run build`.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { waypointsAreOnOneLine, someWaypointsAreComputed, longestArithmeticRun, manufacturedWaypointCaveat,
         groundDisagreementCaveat, waypointCaveat,
         SYNTHETIC_WAYPOINT_CAVEAT, COMPUTED_WAYPOINT_CAVEAT } from "../lib/track.js";
import { GROUND_DISAGREEMENTS, GROUND_TOLERANCE_FT, GROUND_PINS_MEASURED } from "../lib/ground-checked-pins.js";
const GROUND_ROUTE_IDS = Object.keys(GROUND_DISAGREEMENTS);

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
//
// ROUNDED TO 5 DECIMALS, WHICH IS NOT COSMETIC. Built with raw float arithmetic these came out at
// 14 decimals — `-121.10614285714287` — so the "real" fixture itself tripped the computed-coordinate
// test and the COMPUTED caveat rendered on it. The assertion below missed that because it only
// looked for the SYNTHETIC wording, i.e. it passed vacuously while the guard was captioning correct
// data. A surveyed coordinate has 4-6 decimals; the fixture has to look like one.
const REAL_WPS = SYNTH_WPS.map((w, i) => ({ ...w,
  lat: Number(w.lat.toFixed(5)),
  lng: Number((w.lng + (i === 0 || i === 7 ? 0 : (i % 2 ? 0.011 : -0.009))).toFixed(5)) }));

const route = extra => Object.assign({
  id: "probe_wp", name: "Probe", grade: "5.6", gradeSystem: "yds",
  discipline: "alpine", pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
}, extra);

let failures = 0;
const fail = m => { console.log("  FAIL  " + m); failures++; };
const ok = m => console.log("  ok    " + m);
const shows = (r, caveat = SYNTHETIC_WAYPOINT_CAVEAT) => text(render(r, "planner")).includes(caveat);

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

// Assert NO caveat of EITHER wording. Checking only the synthetic one let the computed one render
// on correct data unnoticed — an absent-wording test is not an absent-caption test.
if (manufacturedWaypointCaveat(REAL_WPS))
  fail(`a real-waypoint route would be captioned: "${String(manufacturedWaypointCaveat(REAL_WPS)).slice(0, 60)}..."`);
else ok("predicate: a real route earns no caveat of either kind");
if (shows(route({ waypoints: REAL_WPS })) || shows(route({ waypoints: REAL_WPS }), COMPUTED_WAYPOINT_CAVEAT))
  fail("a caveat renders on a route whose waypoints are REAL — worse than not having one at all");
else ok("neither caveat renders on a route with real waypoints");

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

// ── 4. PARTIAL FABRICATION — the case that matters most, and the one that gets WORSE as the data
//    is repaired. A parallel session is replacing fabricated coordinates with real ones from GNIS
//    and OSM. Replacing SOME of a route's pins breaks the collinearity the whole-route test
//    depends on, so a half-repaired route would silently lose its caption while still carrying
//    manufactured pins. Measured 2026-08-20: 187 routes carry fabricated pins by at least one
//    test, against 52 that the whole-route test finds alone.
//
//    The per-pin tell is precision — a surveyed coordinate has 4-6 decimals, a computed one has 17.
const HALF_REPAIRED = SYNTH_WPS.map((w, i) =>
  i === 2 || i === 5 ? { ...w, lat: Number((w.lat + 0.02).toFixed(5)), lng: Number((w.lng - 0.017).toFixed(5)) }
                     : { ...w, lat: w.lat, lng: w.lng });
if (waypointsAreOnOneLine(HALF_REPAIRED))
  fail("fixture: the half-repaired route is still collinear, so this case proves nothing — fix the fixture");
else ok("fixture: repairing 2 of 8 pins does break the whole-route collinearity test, as expected");

if (!someWaypointsAreComputed(HALF_REPAIRED))
  fail("predicate: a route still holding computed 17-decimal coordinates is not recognised");
else ok("predicate: a computed coordinate is recognised per-pin, so partial repair cannot hide it");

if (!shows(route({ waypoints: HALF_REPAIRED }), COMPUTED_WAYPOINT_CAVEAT))
  fail("A HALF-REPAIRED ROUTE LOST ITS CAPTION while still carrying manufactured pins");
else ok("a half-repaired route still says its remaining coordinates were calculated");

// Fully repaired: every coordinate surveyed-precision. Nothing to disclaim, and claiming
// otherwise would caption correct data — the failure that teaches people to ignore a guard.
const REPAIRED = REAL_WPS.map(w => ({ ...w, lat: Number(w.lat.toFixed(5)), lng: Number(w.lng.toFixed(5)) }));
if (someWaypointsAreComputed(REPAIRED)) fail("predicate: surveyed-precision coordinates were called computed");
else ok("predicate: 5-decimal coordinates are not called computed");
if (manufacturedWaypointCaveat(REPAIRED)) fail("a fully repaired route still shows a caveat — captioning correct data");
else ok("a fully repaired route shows no caveat at all");

// The two wordings are mutually exclusive: the stronger whole-route claim wins where it applies,
// and a route must never carry both.
const both = text(render(route({ waypoints: SYNTH_WPS }), "planner"));
if (both.includes(SYNTHETIC_WAYPOINT_CAVEAT) && both.includes(COMPUTED_WAYPOINT_CAVEAT))
  fail("both caveats rendered on one route — they must be mutually exclusive");
else ok("a whole-line route shows the stronger wording only");

// ── 5. AN INTERPOLATED RUN between two genuine pins. The third shape, and the one both tests above
//    miss: the route as a whole is not a line, and the pins may carry ordinary precision. It also
//    covers one-axis interpolation, where only the longitude was divided up — those pins are not
//    collinear in the plane at all, so no distance-to-a-line test can reach them.
//
//    NOTE THE FIXTURE IS NOT ROUNDED, and that is the point rather than laziness: interpolation
//    leaves full float precision, which is exactly why the real rows show 17 decimals. Rounding a
//    fabricated pin to 5 decimals destroys the slope agreement AND the precision tell, so a
//    hand-rounded fixture proves nothing and quietly tests the opposite of what it claims.
const GENUINE_ENDS = [
  { name: "Trailhead", type: "Trailhead", lat: 48.49, lng: -121.12, elev: 1000 },
  { name: "Summit", type: "Summit", lat: 48.556, lng: -121.10, elev: 7900 },
];
const INTERPOLATED = Array.from({ length: 4 }, (_, i) => {
  const t = i / 3;
  return { name: `Mid ${i}`, type: "Junction",
    lat: 48.505 + (48.545 - 48.505) * t, lng: -121.118 + 0.014 * t, elev: 2000 + i * 800 };
});
const RUN_ROUTE = [GENUINE_ENDS[0], ...INTERPOLATED, GENUINE_ENDS[1]];

if (longestArithmeticRun(RUN_ROUTE) < 4)
  fail(`predicate: a 4-pin interpolated run is not recognised (got ${longestArithmeticRun(RUN_ROUTE)})`);
else ok("predicate: a run of pins laid along one bearing is recognised");

if (waypointsAreOnOneLine(RUN_ROUTE))
  fail("fixture: the run route is collinear end to end, so it proves nothing about PARTIAL fabrication");
else ok("fixture: the run route is not a whole-route line, so it needs the run test");

if (longestArithmeticRun(REAL_WPS) >= 3)
  fail(`predicate: a real wandering approach shows a ${longestArithmeticRun(REAL_WPS)}-pin run — this would caption correct data`);
else ok("predicate: a real approach has no arithmetic run");

if (!shows(route({ waypoints: RUN_ROUTE }), COMPUTED_WAYPOINT_CAVEAT))
  fail("a route with an interpolated run between genuine pins shows NO caveat");
else ok("a route with an interpolated run says its coordinates were calculated");

// A bare 3-run with no corroboration must NOT caption — measured, 19 WA routes sit there and
// captioning them would be captioning correct data.
const THREE_RUN = [GENUINE_ENDS[0],
  ...Array.from({ length: 3 }, (_, i) => {
    const t = i / 2;
    return { name: `M${i}`, type: "Junction",
      lat: Number((48.505 + 0.03 * t).toFixed(5)), lng: Number((-121.118 + 0.01 * t).toFixed(5)), elev: 2000 + i * 900 };
  }), GENUINE_ENDS[1]];
if (longestArithmeticRun(THREE_RUN) >= 4)
  fail("fixture: the 3-run fixture produced a longer run, so it cannot test the floor");
else if (someWaypointsAreComputed(THREE_RUN))
  fail("fixture: the 3-run fixture carries computed precision, so the floor is not what is being tested");
else if (manufacturedWaypointCaveat(THREE_RUN))
  fail("a bare 3-pin run was captioned — measured, that is luck as often as fabrication");
else ok("a bare 3-pin run with no second tell is NOT captioned");

// ── 6. THE GROUND. Everything above reads the coordinates alone, so all of it is blind to a pin
//    that was manufactured and then ROUNDED — no structural tell survives that. Of the 107 routes
//    the DEM says carry a pin more than 2,000 ft from the ground beneath it, the tests above
//    caption 29 and say nothing about the other 78. `lib/ground-checked-pins.js` is that
//    measurement, precomputed because ~3,900 elevation requests cannot run at render time.
//
//    THE FIXTURES COME OUT OF THE SHIPPED INDEX rather than being written here. A hand-written
//    entry proves the reader against a shape the real file might not have — the fossil problem
//    `check:camping` records — and it would keep passing after the generator changed its output.
if (!GROUND_ROUTE_IDS.length) {
  fail("the ground index is EMPTY — either the generator failed or its output shape changed. "
     + "Nothing below this line was checked, and a caption that covers 18% is being shipped as if it covered more.");
} else {
  ok(`the ground index carries ${GROUND_ROUTE_IDS.length} routes (${GROUND_PINS_MEASURED} pins measured)`);

  // Every entry must actually clear the tolerance it claims. A generator that wrote its findings
  // before applying the threshold would produce a caption on ordinary rounding slop, which is the
  // 1,080-pin false finding `audit:waypoint-elevations` exists to avoid — shipped to climbers.
  const slack = GROUND_ROUTE_IDS.flatMap(id => GROUND_DISAGREEMENTS[id])
    .filter(e => !(Math.abs(e.elev - e.ground) > GROUND_TOLERANCE_FT));
  if (slack.length) fail(`${slack.length} index entries do NOT exceed the ${GROUND_TOLERANCE_FT} ft tolerance they are filed under`);
  else ok(`every index entry clears ${GROUND_TOLERANCE_FT} ft`);

  const malformed = GROUND_ROUTE_IDS.flatMap(id => GROUND_DISAGREEMENTS[id])
    .filter(e => ![e.lat, e.lng, e.elev, e.ground].every(Number.isFinite));
  if (malformed.length) fail(`${malformed.length} index entries carry a non-numeric lat/lng/elev/ground`);
  else ok("every index entry is fully numeric — the reader compares numbers, so a string can never match");

  // A pin whose own coordinates are ALSO computed-precision would be captioned by the tests above
  // anyway, so it cannot show that the ground adds anything. Pick one that only the ground finds.
  const GID = GROUND_ROUTE_IDS.find(id =>
    GROUND_DISAGREEMENTS[id].every(e => !someWaypointsAreComputed([{ lat: e.lat, lng: e.lng }])));
  if (!GID) {
    fail("every flagged pin also carries computed precision, so this section cannot show the ground adds anything. "
       + "That would be a real finding about the data — check it before changing this guard.");
  } else {
    const ENTRIES = GROUND_DISAGREEMENTS[GID];
    const GROUND_WPS = ENTRIES.map((e, i) => ({ name: `Ground ${i}`, type: "Junction", lat: e.lat, lng: e.lng, elev: e.elev }));

    if (manufacturedWaypointCaveat(GROUND_WPS))
      fail(`fixture: ${GID}'s pins already trip a coordinate-only test, so this proves nothing about the ground`);
    else ok(`fixture: ${GID} is invisible to every coordinate-only test — only the ground finds it`);

    const cav = groundDisagreementCaveat(GID, GROUND_WPS);
    if (!cav) fail(`the ground caveat does not fire for ${GID}, whose pins are in the index verbatim`);
    else ok("the ground caveat fires on a route whose live pins match the measurement");

    // SELF-INVALIDATION, in all three directions. This is what makes a stored verdict safe to
    // publish: repair the pin and the entry retires itself. Without it a fixed coordinate would
    // keep being accused — confidently wrong, which is worse than the silence it replaced.
    const moved = GROUND_WPS.map(w => ({ ...w, lat: Number((w.lat + 0.01).toFixed(5)) }));
    if (groundDisagreementCaveat(GID, moved)) fail("moving the COORDINATE did not retire the measurement — a repaired pin would still be accused");
    else ok("moving the coordinate retires the measurement");

    const reElev = GROUND_WPS.map(w => ({ ...w, elev: w.elev + 1 }));
    if (groundDisagreementCaveat(GID, reElev)) fail("correcting the ELEVATION did not retire the measurement");
    else ok("correcting the elevation retires the measurement");

    if (groundDisagreementCaveat("no_such_route_id", GROUND_WPS)) fail("a route id absent from the index still produced a caveat");
    else ok("a route not in the index produces nothing");

    // It must reach the screen, not merely return a string. A predicate nothing renders is the
    // `descent_text` shape — populated on 1,021 routes and displayed on none.
    if (!shows(route({ id: GID, waypoints: GROUND_WPS }), cav))
      fail("the ground caveat never reaches the WAYPOINTS section — it returns a string nobody sees");
    else ok("the ground caveat renders on the screen that shows the pins");

    // It says the disagreement and refuses to say which half is wrong, because nothing measured
    // can tell: a misplaced pin and a mistyped elevation produce an identical gap.
    if (/\bpin is (?:in the )?wrong\b/i.test(cav) || !/Either/.test(cav))
      fail("the caveat picks a side — nothing here can tell a misplaced pin from a wrong elevation");
    else ok("the caveat reports the disagreement without claiming which half is wrong");

    // ORDERING, and it is asserted in the direction that is NOT the intuitive one. Rating the
    // ground first — a measurement outranks an inference — was tried and reverted: it silently
    // REWORDED every route that already captioned. The table may only ever ADD a caption to a
    // route that had none. Both cases below pin that, so a re-flip goes red rather than quietly
    // changing 29 screens.
    //
    // Built by laying a synthetic line THROUGH a real index pin, so both conditions truly hold.
    const P = ENTRIES[0];
    const LA = { lat: P.lat - 0.035, lng: P.lng - 0.010 }, LB = { lat: P.lat + 0.035, lng: P.lng + 0.010 };
    const BOTH = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return { name: `L${i}`, type: "Junction", lat: LA.lat + (LB.lat - LA.lat) * t,
        lng: LA.lng + (LB.lng - LA.lng) * t, elev: Math.round(P.elev - 1600 + 3200 * t) };
    });
    BOTH[4] = { ...BOTH[4], lat: P.lat, lng: P.lng, elev: P.elev };   // the midpoint IS the indexed pin
    if (!waypointsAreOnOneLine(BOTH) || !groundDisagreementCaveat(GID, BOTH))
      fail("fixture: the ordering case does not satisfy BOTH conditions, so it cannot test precedence");
    else if (waypointCaveat(GID, BOTH) !== SYNTHETIC_WAYPOINT_CAVEAT)
      fail("a one-pin ground finding displaced the whole-route warning — the stronger claim must win");
    else ok("where the line test and the ground both fire, the whole-route warning wins");

    // …and the COMPUTED wording survives a ground finding on the same route. It is a statement
    // about several pins where the ground names one, so replacing it trades a broader true
    // sentence for a narrower one — `wa_castle_peak_pasayten_scramble` is the measured case.
    const GC = GROUND_WPS.concat([{ name: "calc", type: "Junction", lat: 48.51234567890123, lng: -121.11234567890123, elev: 4000 }]);
    if (!someWaypointsAreComputed(GC) || !groundDisagreementCaveat(GID, GC))
      fail("fixture: the mixed route does not satisfy BOTH tests, so precedence is untested");
    else if (waypointCaveat(GID, GC) !== COMPUTED_WAYPOINT_CAVEAT)
      fail("a ground finding displaced the computed-coordinate caption — the table may only ADD captions, never reword one");
    else ok("a ground finding leaves an existing computed-coordinate caption alone");
  }
}

console.log("");
if (failures) { console.log(`${failures} failure(s).`); process.exit(1); }
console.log("ok — manufactured waypoint coordinates say so on the screen that shows them.");

// Injection-tested. Each case must fail this check, and re-run them after any change to the
// predicate or the render site:
//   1. delete the caveat block from RouteDetail            -> the render assertions fail
//   2. make waypointsAreOnOneLine always true              -> the real-waypoint assertions fail
//   3. make someWaypointsAreComputed always FALSE          -> the half-repaired route loses its caption
//   4. make someWaypointsAreComputed always TRUE           -> a real route gets captioned
//   5. drop the relief test from the predicate             -> the flat-traverse assertion fails
//   6. rename the WAYPOINTS heading                        -> ANCHOR LOST, exit 1, nothing claimed
// All 6 caught 2026-08-20, each proving its edit landed by checksum first.
