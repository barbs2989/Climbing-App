// Is a route's "GPS track" actually a track, or just its own waypoints joined up?
//
// 201 of the 580 WA routes carrying a track store a polyline whose every vertex IS one of that
// route's waypoints — median FOUR points. The app renders those under a ROUTE TRACK heading, draws
// them on the map, and offers a "Download GPX" button, so a climber can take away five straight
// line segments across 22 km of the North Cascades (`wa_amphitheater_mountain_north_ridge`) as
// though it were a recorded track. The waypoints themselves are real and worth keeping; calling
// the line between them a track is the part that is not true.
//
// This is NOT covered by the provenance chip, and the measurement says so in the worst way:
// `auto_generated` is true on 45% of these and on 78% of the routes whose track is genuine, so it
// points the WRONG WAY. A climber reading the chip cannot tell which kind of line they are looking
// at. That is why this is a separate, per-section signal — the same rule `check:provenance`
// records, that a per-section signal must beat the route-level flag.
//
// It is also why the existing waypoint audits cannot see this class. Both ask "is each pin on this
// route's own track?", and on these routes the answer is yes BY CONSTRUCTION — the track is a copy
// of the pins, not independent evidence, so the two records agreeing proves nothing. The tiny-stub
// placeholder gate those audits already carry is about EXTENT and cannot reach it either: these
// have large extent (162 of the 201 span more than 2 km) and unremarkable point counts.

// Metres between two {lat,lng}. Small enough to keep here rather than import a geo dependency.
function metresBetween(a, b) {
  const R = 6371000, rad = x => (x * Math.PI) / 180;
  const dLng = rad(b.lng - a.lng), dLat = rad(b.lat - a.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// A gpx point is [lat, lng] — MEASURED, not assumed, and the note is here because the opposite was
// written down and believed for a while. Across the 570 routes carrying both a track and a
// Trailhead waypoint, the median distance from that pin to the nearer end of its own track is 35 m
// read as [lat,lng] and 11,937,630 m read as [lng,lat]. `gpxDownload` in ClimbMatchCore agrees —
// it emits `lat={pt[0]}`. Objects with .lat/.lng are accepted too, since contributed tracks use them.
function pointOf(p) {
  if (!p) return null;
  if (Array.isArray(p)) return typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null;
  return typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
}

// True when the line is the waypoint list and nothing more.
//
// Not "most" in the sense of a FRACTION: a real recorded track passes through its own waypoints too,
// so a proportional threshold would condemn genuine tracks that happen to be sparse. What
// distinguishes the synthetic ones is that there is nothing in the line EXCEPT the waypoints. The
// <=40 cap keeps a long recorded track from qualifying by coincidence, and the one-pin slack allows
// a summit pin that the line stops short of.
//
// ONE VERTEX OF SLACK, AND THE ASYMMETRY IT REPLACES WAS DELETING THE CAVEAT OUTRIGHT. This used to
// demand `line.every(onAPin)` — no slack at all on the vertex side, while pins already had one. So
// MOVING A PIN, which every trailhead, camp and cross-route repair does, stranded the vertex drawn
// through its old position and the predicate went false: the route silently stopped saying its line
// is a sketch and began posing as a recorded GPS track, with Download GPX beneath it. 52 routes had
// lost it that way, and 17 could not be recovered by moving the vertex, because the pin had been
// REPLACED rather than refined (a trailhead 27 km down a different valley) so there was nowhere
// correct to move it to.
//
// The slack is safe BECAUSE of the <=40 cap, not in spite of it: a recording has hundreds of points
// and not one of them lands within 5 m of a NAMED waypoint by chance. Measured over the catalog, the
// 26 lines this newly recognises carry at most 8 vertices at a median spacing of 2,217 m — the
// densest is 105 m — so none of them could be a recording.
//
// STRICTLY ADDITIVE, and that had to be enforced rather than assumed. A two-point line keeps the old
// rule exactly: with no interior, "one vertex of slack" is HALF the line, satisfied by any stub with
// one end near a pin. Measured, applying it there admitted a 55 m placeholder AND took the caveat
// AWAY from 34 two-point lines that legitimately carry it today.
// AND THE SLACK IS TWO WHERE TWO IS STILL A MINORITY, because the number of stranded vertices
// tracks HOW MANY PINS WERE MOVED and not how long the line is. Eight routes had two pins repaired
// and so kept posing as recorded tracks after the one-vertex fix; five of those cannot be repaired
// at all, because the pin was REPLACED rather than refined and there is nowhere correct to carry
// the vertex to. A caveat that only reaches the repairable half is not the honesty fix.
//
// FLAT TWO-OF-SLACK IS WRONG AND check:track-caveat PINS THAT: on a three-point line it means ONE
// vertex need be a pin, which is not a sketch test at all. So the condition is written as what it
// MEANS -- a strict majority of the points must still sit on a pin -- which DERIVES the five-point
// minimum instead of picking it, and keeps every shorter line on exactly the old rule.
//
// The same test applies to the pin side, and that is not symmetry for its own sake: a line touching
// neither of two pins is not "straight lines between this route's waypoints", it is a line about
// something else, and the caption would be a false claim.
//
// MEASURED ACROSS THE CATALOG BEFORE SHIPPING, and the losing side is the one that had to be
// checked: 275 lines considered, 200 captioned by both rules, GAINED 8, **LOST 0**. A summary count
// alone hid a real loss last time -- the one-vertex change quietly took the caveat away from 34
// two-point lines -- so the set is printed in full by measure-majority-slack.mjs, which exits 1 if
// it is not empty. None of the 8 could be a recording: their median vertex spacing runs 258 m to
// 4,432 m against the 8-47 m a real GPS track sits at.
const slackFor = n => (n < 3 ? 0 : n - 2 > n / 2 ? 2 : 1);

export function trackIsJustTheWaypoints(gpxPts, waypoints) {
  const line = (Array.isArray(gpxPts) ? gpxPts : []).map(pointOf).filter(Boolean);
  const pins = (Array.isArray(waypoints) ? waypoints : []).map(pointOf).filter(Boolean);
  if (line.length < 2 || line.length > 40 || !pins.length) return false;
  const onAPin = v => pins.some(p => metresBetween(v, p) < 5);
  const onTheLine = p => line.some(v => metresBetween(v, p) < 5);
  const on = line.filter(onAPin).length;
  const vertexOk = on >= line.length - slackFor(line.length);
  return vertexOk && pins.filter(onTheLine).length >= pins.length - Math.max(1, slackFor(pins.length));
}

export const WAYPOINT_LINE_CAVEAT =
  "Straight lines between this route's waypoints — not a recorded GPS track. Do not navigate by it.";

// Are the WAYPOINTS themselves manufactured, rather than the line between them?
//
// The sibling defect, and a worse one. 63 of the 372 judgeable WA routes have every intermediate
// pin spaced along the straight segment from the trailhead pin to the summit pin; 44 are collinear
// to within 20 m, most at 0 m. A trailhead, a creek ford, a camp and a col are not collinear, so
// this is not a tolerance question — no survey produces it.
//
// The ELEVATIONS on those pins are right; they were read from the route's own prose. Only the
// positions are fabricated, which is exactly what makes it dangerous: the list reads as precise
// local knowledge ("Crescent Creek Basin Camp, 6,050 ft") while the coordinate behind it sits 6 km
// away at 1,432 ft. `npm run audit:synthetic-waypoints` measures it; `audit:waypoint-elevations`
// confirms it against USGS 3DEP.
//
// A ROUTE CAN HAVE BOTH: 18 of the 63 also satisfy trackIsJustTheWaypoints, so neither the line nor
// the pins record anywhere. And 22 carry a track of 100+ points, so a genuine track is NOT evidence
// that the pins beside it are genuine.
//
// The thresholds match scripts/audit-synthetic-waypoints.mjs deliberately. Fewer than 5 pins cannot
// distinguish a line from a path; a span under 1 km is trivially straight; and without real relief
// across the pins a flat traverse that genuinely runs straight would be captioned, which is the
// "audit tells you to break correct data" trap this codebase keeps paying for.
function offsetFromSegment(p, a, b) {
  const k = Math.cos((a.lat * Math.PI) / 180), R = (6371000 * Math.PI) / 180;
  const px = (p.lng - a.lng) * k * R, py = (p.lat - a.lat) * R;
  const bx = (b.lng - a.lng) * k * R, by = (b.lat - a.lat) * R;
  const L2 = bx * bx + by * by;
  if (L2 === 0) return Math.hypot(px, py);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / L2));
  return Math.hypot(px - t * bx, py - t * by);
}

export function waypointsAreOnOneLine(waypoints) {
  const list = (Array.isArray(waypoints) ? waypoints : []).filter(w => pointOf(w));
  if (list.length < 5) return false;
  const pts = list.map(pointOf);
  const a = pts[0], b = pts[pts.length - 1];
  if (metresBetween(a, b) < 1000) return false;
  const elevs = list.map(w => (typeof w.elev === "number" ? w.elev : null)).filter(e => e != null);
  if (elevs.length < 2 || Math.max(...elevs) - Math.min(...elevs) < 1500) return false;
  return pts.slice(1, -1).every(p => offsetFromSegment(p, a, b) <= 120);
}

export const SYNTHETIC_WAYPOINT_CAVEAT =
  "These points were placed evenly along a line from the trailhead to the summit, not surveyed. " +
  "The elevations come from the route description; the map positions do not. Do not navigate by them.";

// A SINGLE pin can be manufactured on a route whose trailhead and summit are perfectly real, and
// `waypointsAreOnOneLine` is blind to that by construction — it asks about the whole route.
//
// The tell is precision. A surveyed coordinate is written to 4-6 decimals; `-121.16888095238095`
// is 17, and that tail is the floating-point residue of dividing a span into equal parts. It is
// per-pin, so it survives partial fabrication, and it is not a judgement call.
//
// This matters MORE as the pins get repaired, not less: replacing some of a route's fabricated
// coordinates with real ones breaks the collinearity that the whole-route test depends on, so a
// half-repaired route would silently lose its caption while still carrying manufactured pins.
// Measured 2026-08-20 — 187 routes carry fabricated pins by at least one test, against 52 the
// whole-route test finds alone.
// THE OPPOSITE TEST — TOO FEW DECIMALS — WAS MEASURED AND REJECTED. Recorded here because it is
// the obvious next idea and it looks convincing until you control for one variable.
//
// A coordinate at 3 decimals is ~111 m and at 2 is ~1.1 km, which is not a survey; it is a value
// read off a map. `wa_mount_stuart_north_ridge` carries 3 decimals on nearly every pin AND a
// 2,559 ft ground disagreement at Goat Pass, which is what suggested it. The raw numbers agree —
// across 3,927 pins with a ground reading, the share more than 2,000 ft out runs 12.0% at <=2
// decimals and 9.3% at 3, against 3.9% at the surveyed 4-6.
//
// IT IS CONFOUNDED BY WAYPOINT TYPE. The coarse bands are 70-76% Junction/Campsite/Hazard, and
// those are exactly the types whose elevations are round-number guesses (64-82% land on a round
// 100 ft, against 3% of summit pins — see `audit:waypoint-elevations`). Hold the type fixed and
// the signal mostly evaporates: Summit 0.0% at 3 decimals, Trailhead 0.0%, Campsite 4.2% against
// 5.5%, Hazard 13.3% against 12.3%. Only Junction moves at all, 17.0% (n=53) against 5.8%.
//
// So at best it would fire on 53 pins to find 9 — an 83% false-positive rate, on a caption whose
// whole value is that a climber can believe it. And it would find NOTHING NEW: all 9 already
// exceed 2,000 ft, so the ground index above captions every one of them. A detector that is
// mostly wrong and adds no coverage is not a detector.
//
// The 9 are one per route, so they are not one bad enrichment pass — and they are all named for
// high features (Adams Glacier Base, Goat Pass, Luna Col, Ruth-Icy Saddle) with 8 of 9 claiming
// to sit ABOVE the ground. That is a real shape, and the GROUND is what finds it, not precision.
const SURVEYED_DECIMALS = 8;
export function someWaypointsAreComputed(waypoints) {
  const decimals = v => { const s = String(v); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
  return (Array.isArray(waypoints) ? waypoints : []).some(w =>
    pointOf(w) && Math.max(decimals(w.lat), decimals(w.lng)) > SURVEYED_DECIMALS);
}

export const COMPUTED_WAYPOINT_CAVEAT =
  "Some of these coordinates were calculated rather than surveyed, so those points are approximate " +
  "on the map. The names and elevations come from the route description and are unaffected.";

// One call site on the screen, so the cases cannot drift apart or render together. The whole-route
// wording is the stronger claim and wins where it applies; the partial cases share a wording
// because a run laid along a bearing IS a calculated coordinate, and a second near-identical
// string would be a second thing to keep true.
//
// The 3-pin run needs corroboration and 4 does not — measured, 19 WA routes have a bare 3-run with
// no other tell, and captioning those would be captioning correct data.
export function manufacturedWaypointCaveat(waypoints) {
  if (waypointsAreOnOneLine(waypoints)) return SYNTHETIC_WAYPOINT_CAVEAT;
  const computed = someWaypointsAreComputed(waypoints);
  const run = longestArithmeticRun(waypoints);
  if (computed || run >= 4 || (run >= 3 && computed)) return COMPUTED_WAYPOINT_CAVEAT;
  return null;
}

// ── the ground ────────────────────────────────────────────────────────────────
//
// Every predicate above reads the COORDINATES and nothing else, so all of them are blind to a pin
// that was manufactured and then ROUNDED to surveyed precision — it has no structural tell left.
// Measured 2026-08-20: of the 107 routes carrying a pin more than 2,000 ft from the ground beneath
// it, the coordinate-only tests caption 29 and say nothing about the other 78.
//
// The ground is the only thing that separates those, and asking it is ~3,900 elevation requests,
// so it is measured once by scripts/oneoff/build-ground-disagreement-index.mjs and shipped as a
// table. This is where that table is read.
//
// IT RE-CHECKS THE MEASUREMENT'S OWN INPUTS BEFORE USING IT, which is the whole reason a stored
// verdict is safe to publish. Repair a coordinate and a stale flag would start accusing a pin that
// is now correct — worse than the silence it replaced, because the app would be confidently wrong
// rather than quiet. So an entry only counts while the live pin still carries the exact lat, lng
// and elev it was measured for. Anything moved, converted or deleted stops matching, and the
// caption disappears rather than misfiring.
import { GROUND_DISAGREEMENTS } from "./ground-checked-pins.js";

export function groundDisagreements(routeId, waypoints) {
  const entries = (routeId && GROUND_DISAGREEMENTS[routeId]) || null;
  if (!entries) return [];
  const list = Array.isArray(waypoints) ? waypoints : [];
  // `normalizeWaypoints` coerces these from the strings contributed rows store, and the index was
  // built through the same coercion, so both sides are numbers by the time they meet here.
  const num = v => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  const elevOf = w => num(w.elev != null ? w.elev : w.elevFt != null ? w.elevFt : w.elev_ft);
  return entries.filter(e => list.some(w =>
    w && num(w.lat) === e.lat && num(w.lng) === e.lng && elevOf(w) === e.elev));
}

export function groundDisagreementCaveat(routeId, waypoints) {
  const live = groundDisagreements(routeId, waypoints);
  if (!live.length) return null;
  const gaps = live.map(e => e.elev - e.ground);
  const worst = gaps.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a);
  const ft = n => Math.abs(Math.round(n)).toLocaleString("en-US");
  // Never asserts WHICH of the two is wrong, because nothing measured here can tell: a pin in the
  // wrong place and a mistyped elevation produce exactly the same disagreement. Saying "this pin is
  // misplaced" would be a claim the evidence does not support, on the surface a climber navigates
  // from. It reports the disagreement and stops.
  return live.length === 1
    ? `One of these waypoints records an elevation ${ft(worst)} ft ${worst > 0 ? "above" : "below"} ` +
      `the ground at its own coordinate. Either the point is in the wrong place or its elevation is ` +
      `wrong — treat both as unverified.`
    : `${live.length} of these waypoints record elevations that disagree with the ground at their own ` +
      `coordinates, by up to ${ft(worst)} ft. Either those points are in the wrong place or their ` +
      `elevations are wrong — treat both as unverified.`;
}

// One call site on the screen. Exactly one caption renders — stacking two on a single section reads
// as two separate problems, and where both fire they are one problem described twice.
//
// THE GROUND IS THE FALLBACK, NOT THE OVERRIDE, and the intuitive ordering is the wrong one. Rating
// it first because a measurement outranks an inference was tried and reverted: it silently REWORDED
// the routes that already captioned. `wa_castle_peak_pasayten_scramble` carries 17-decimal
// coordinates across several pins and a 2,058 ft ground disagreement on one of them, and ground-first
// replaced "some of these coordinates were calculated" with a sentence about that single pin —
// trading a true statement about the whole list for a narrower one. That is a loss, not a promotion.
//
// The ground was built to cover what structure CANNOT see: of the 107 routes with a pin more than
// 2,000 ft from the ground beneath it, the structural tests already caption 29. Keeping it last means
// this table can only ever ADD a caption to a route that had none, never change one that had one —
// which is the whole of what it was for, and makes the change verifiable by counting.
export function waypointCaveat(routeId, waypoints) {
  return manufacturedWaypointCaveat(waypoints) || groundDisagreementCaveat(routeId, waypoints);
}

// A CONSECUTIVE RUN of pins laid along one bearing, on a route whose other pins are real.
//
// The third fabrication shape, and the one both tests above miss. `waypointsAreOnOneLine` asks
// about the whole route; `someWaypointsAreComputed` asks about one pin's precision. Neither sees a
// stretch of three or four pins interpolated between two genuine ones — and one-axis interpolation
// makes it worse, because pins whose LONGITUDE alone was divided up are not collinear in the plane
// at all, so no distance-to-a-line test can find them.
//
// Compare SLOPES rather than distances: a run can be short in extent and still be arithmetic, and
// slope agreement to 0.2% across three legs is not something a trail does.
//
// The 4-pin floor is measured, not chosen. A 3-pin run on its own is luck about as often as
// fabrication — 19 WA routes sit there with no second tell — so three only counts when a computed
// coordinate on the same route corroborates it. That is `manufacturedWaypointCaveat`'s job below.
const RUN_SLOPE_TOL = 2e-3;
export function longestArithmeticRun(waypoints) {
  const P = (Array.isArray(waypoints) ? waypoints : []).map(w => {
    const p = pointOf(w);
    return p && !(p.lat === 0 && p.lng === 0) ? p : null;
  });
  const slope = (p, q) => (q.lng === p.lng ? Infinity : (q.lat - p.lat) / (q.lng - p.lng));
  const runs = [];
  let start = 0;
  for (let i = 0; i + 2 < P.length; i++) {
    if (!P[i] || !P[i + 1] || !P[i + 2]) { start = i + 1; continue; }
    const s1 = slope(P[i], P[i + 1]), s2 = slope(P[i + 1], P[i + 2]);
    if (!(Number.isFinite(s1) && Number.isFinite(s2) && Math.abs(s1 - s2) <= Math.abs(s1) * RUN_SLOPE_TOL)) {
      if (i + 2 - start >= 3) runs.push(i + 1 - start + 1);
      start = i + 1;
    }
  }
  if (P.length - start >= 3 && P.slice(start).every(Boolean)) runs.push(P.length - start);
  return runs.length ? Math.max(...runs) : 0;
}

// Does the drawn line cover the whole route, and if not, which end is missing?
//
// The page draws a polyline under ROUTE TRACK and offers "Download GPX", and until now said
// nothing about how much of the route that line is. Measured over the 378 WA routes carrying a
// real (non-stub, non-synthetic) track and pins to judge against, the distance from the
// Trailhead pin to the nearest track point is BIMODAL: 41 m at the median — the line starts at
// the trailhead, as you would expect — and then a distinct population out at p90 = 6.7 km. 63
// routes (16.9%) start more than 2 km from their own trailhead. Those are climb-only tracks:
// the walk in simply is not in the recording. The summit end is tighter (p50 16 m, p95 1.0 km),
// with 6 routes ending more than 2 km short.
//
// Both are worth saying and they are DIFFERENT facts. A missing approach means the line begins
// somewhere up the mountain. A missing summit means somebody following it runs out of line
// while still climbing, which is the worse of the two.
//
// THRESHOLD IS 2 km AT BOTH ENDS, and it is precedent rather than a fitted number: it is what
// audit:waypoints' "TRACK NEVER COMES WITHIN 2 km OF THE PEAK" uses and what the off-track pin
// triage uses to call a track climb-only. Tightening the summit end to 1 km would flag 19
// instead of 6, and those extra 13 cannot be attributed with confidence — a line ending 1.2 km
// from the summit PIN is equally consistent with the pin being wrong, which is its own known
// defect class. A caveat that fires on correct data is one people learn to ignore.
const COVERAGE_GAP_M = 2000;

function nearestOnLine(p, line) {
  let best = Infinity;
  for (const v of line) { const d = metresBetween(p, v); if (d < best) best = d; }
  return best;
}

// Returns null when nothing can honestly be said — no usable line, a placeholder stub, a
// synthetic waypoint line (which carries its own stronger caveat), or no pin to judge against.
// Never guesses: a route with no Trailhead pin gets no claim about its approach.
export function trackCoverage(gpxPts, waypoints) {
  const line = (Array.isArray(gpxPts) ? gpxPts : []).map(pointOf).filter(Boolean);
  if (line.length < 4) return null;
  // A dot-sized line is a placeholder, not a partial track. Measuring pins against one
  // manufactures huge distances out of nothing — the gate audit:waypoints already carries.
  let mnLa = 90, mxLa = -90, mnLn = 180, mxLn = -180;
  for (const v of line) { mnLa = Math.min(mnLa, v.lat); mxLa = Math.max(mxLa, v.lat); mnLn = Math.min(mnLn, v.lng); mxLn = Math.max(mxLn, v.lng); }
  if (metresBetween({ lat: mnLa, lng: mnLn }, { lat: mxLa, lng: mxLn }) < 500) return null;
  if (trackIsJustTheWaypoints(gpxPts, waypoints)) return null;

  const pins = (Array.isArray(waypoints) ? waypoints : []).filter(w => w && pointOf(w));
  const th = pins.find(w => /trailhead/i.test(String(w.type || "")));
  const sum = pins.find(w => /summit|topout/i.test(String(w.type || "")));
  const approachGapM = th ? nearestOnLine(pointOf(th), line) : null;
  const summitGapM = sum ? nearestOnLine(pointOf(sum), line) : null;
  const missingApproach = approachGapM != null && approachGapM > COVERAGE_GAP_M;
  const missingSummit = summitGapM != null && summitGapM > COVERAGE_GAP_M;
  if (!missingApproach && !missingSummit) return null;

  // BEFORE blaming the line for being short, ask whether it is short at all — because on some
  // routes the line and the pins are two COMPLETE records of DIFFERENT ways up the same peak.
  //
  // wa_mount_barnes_scramble is the case that forced this. Its own approach text names two
  // approaches: west via Sol Duc over the Bailey Range, east via the Elwha River Trail from
  // Whiskey Bend. All eight of its waypoints are on the Sol Duc one; its 438-point gpx is the
  // Elwha one. Neither record is partial. Saying "the walk in is not in this line" there points
  // the reader at the wrong half — the same misattribution audit:map-pins already warns about
  // for two-trailhead routes, and the reason that audit reports candidates rather than defects.
  //
  // The discriminator is whether ANY of the route's own pins lie on the line. A genuinely
  // climb-only track still carries its UPPER pins — the summit, the high camp, the col — since
  // the recording does cover that stretch; only the approach pins are off it. A track of a
  // different approach carries NONE, because it never passes any of the places the pins name.
  // Measured over the 68 WA routes this fires on: 66 partial, 2 different-approach.
  //
  // Two placed pins are required. With one, "no pin is on the line" is one coincidence away
  // from a wrong story, and the safer failure is to keep the ordinary partial wording.
  const placed = pins.filter(w => pointOf(w).lat != null);
  if (placed.length >= 2) {
    const onLine = placed.filter(w => nearestOnLine(pointOf(w), line) <= pinTolerance(w.type));
    if (!onLine.length)
      return { differentApproach: true, missingApproach: false, missingSummit: false, approachGapM, summitGapM, pins: placed.length };
  }
  return { differentApproach: false, missingApproach, missingSummit, approachGapM, summitGapM, pins: placed.length };
}

// Per-type slack, matching what the off-track waypoint audits use. A flat number would
// mis-classify by design: a Bailout pin is SUPPOSED to sit off the line, and a Campsite is
// recorded at the camp rather than where the track passes it.
function pinTolerance(type) {
  const t = String(type || "");
  if (/bailout/i.test(t)) return 2000;
  if (/hazard/i.test(t)) return 600;
  if (/campsite|camp|bivy/i.test(t)) return 500;
  if (/water|lake/i.test(t)) return 400;
  return 300;
}

// The sentence for a partial track. Says WHICH end is missing and HOW FAR, because "this track
// is incomplete" tells a climber nothing they can plan around. Distance is rendered by the
// caller in the reader's own units.
export function trackCoverageCaveat(cov, fmt) {
  if (!cov) return "";
  const d = (m) => (typeof fmt === "function" ? fmt(m) : `${(m / 1000).toFixed(1)} km`);
  // Says what is known and stops. It does NOT pick a winner: on a peak with two genuine
  // approaches both records are right, and nothing here can tell that case from a line that
  // was filed against the wrong route.
  if (cov.differentApproach)
    return "This line does not pass any of the waypoints listed below — the track and the waypoints describe different ways up this peak. Check which one you mean to follow before using either.";
  if (cov.missingApproach && cov.missingSummit)
    return `This line covers the middle of the route only — it starts ${d(cov.approachGapM)} from the trailhead and stops ${d(cov.summitGapM)} short of the summit. Do not treat it as the whole route.`;
  if (cov.missingApproach)
    return `The walk in is not in this line — it starts ${d(cov.approachGapM)} from the trailhead. Only the climb itself is recorded here.`;
  return `This line stops ${d(cov.summitGapM)} short of the summit. Following it will run out before the top.`;
}
