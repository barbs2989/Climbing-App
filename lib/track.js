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
