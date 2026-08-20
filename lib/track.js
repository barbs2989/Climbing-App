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
// The test is EVERY vertex, not "most": a real recorded track passes through its own waypoints too,
// so a threshold would condemn genuine tracks that happen to be sparse. What distinguishes the
// synthetic ones is that there is nothing in the line EXCEPT the waypoints. The <=40 cap keeps a
// long recorded track from qualifying by coincidence, and the one-pin slack allows a summit pin
// that the line stops short of.
export function trackIsJustTheWaypoints(gpxPts, waypoints) {
  const line = (Array.isArray(gpxPts) ? gpxPts : []).map(pointOf).filter(Boolean);
  const pins = (Array.isArray(waypoints) ? waypoints : []).map(pointOf).filter(Boolean);
  if (line.length < 2 || line.length > 40 || !pins.length) return false;
  const onAPin = v => pins.some(p => metresBetween(v, p) < 5);
  const onTheLine = p => line.some(v => metresBetween(v, p) < 5);
  return line.every(onAPin) && pins.filter(onTheLine).length >= pins.length - 1;
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
