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
