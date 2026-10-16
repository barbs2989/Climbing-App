// IS ANY LINE THE APP PRESENTS AS A RECORDED TRACK ACTUALLY A DRAWN ONE?
//
// FIRST ATTEMPT, AND THE FALSE POSITIVE IS THE USEFUL PART. lib/track.js's `coordinateIsComputed`
// flags a coordinate written to more than 8 decimals, because a SURVEYED or hand-placed point is
// written to 4-6 and a longer tail is the residue of dividing a span into parts. Pointed at gpx
// vertices it reported 118 routes — and `wa_old_snowy_mountain_r1` came back **976 of 976 points
// computed**. That is not a fabricated track. It is a real recording whose coordinates went through
// some numeric transform (a re-projection, a resample, a simplify), which leaves a full float tail
// on EVERY point.
//
// So the decimal rule does not transfer from a waypoint to a track vertex, and the reason is the
// one this repo keeps meeting: it was calibrated against a HAND-TYPED value. A machine writes long
// tails everywhere and means nothing by it. What made the #1572 vertices fabricated was not the
// tail on its own — it was a MINORITY of points carrying one, sitting exactly on the chord between
// hand-placed neighbours, at fractions of 3/5 and 2/5.
//
// SO THIS ASKS THE QUESTION THAT NEEDS NO PRECISION TEST: is the line dense enough to be a
// recording at all? A real GPS track sits at 8-47 m between points (measured, recorded in
// CLAUDE.md); a drawn line runs to kilometres. Any UNCAPTIONED line whose spacing is in the
// kilometres is a drawn line the app presents as a recorded track, with Download GPX beneath it.
//
// Read-only. Reports; decides nothing.
import { selectAll } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints, manufacturedWaypointCaveat } from "../../lib/track.js";

const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const pointOf = (p) => {
  if (!p) return null;
  if (Array.isArray(p)) return typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null;
  return typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
};

// Well clear of the 8-47 m a recording sits at, and well below the kilometres a sketch runs to.
// Nothing in this catalog sits between, which is what makes the number safe rather than fitted —
// the run prints the whole distribution so that stays checkable.
const SKETCH_SPACING_M = 500;

const rows = await selectAll("routes", "id,gpx,waypoints", "gpx=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL-CLOSED: read returned nothing."); process.exit(1); }

let withLine = 0;
const all = [], drawn = [];
for (const r of rows) {
  const line = (Array.isArray(r.gpx) ? r.gpx : []).map(pointOf).filter(Boolean);
  if (line.length < 3) continue;
  withLine++;
  const gaps = line.slice(1).map((p, i) => metres(line[i], p)).sort((a, b) => a - b);
  const med = gaps[Math.floor(gaps.length / 2)];
  const pins = (Array.isArray(r.waypoints) ? r.waypoints : []).map(pointOf).filter(Boolean);
  const onPins = pins.length ? line.filter((v) => pins.some((p) => metres(v, p) < 5)).length : 0;
  const rec = {
    id: r.id, verts: line.length, med: Math.round(med),
    sketch: trackIsJustTheWaypoints(r.gpx, r.waypoints),
    pinCaveat: !!manufacturedWaypointCaveat(r.waypoints),
    pins: pins.length, onPins,
  };
  all.push(rec);
  if (!rec.sketch && med > SKETCH_SPACING_M) drawn.push(rec);
}

const q = (xs, p) => xs.length ? xs.slice().sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)] : 0;
const meds = all.map((a) => a.med);
console.log(`${withLine} route(s) carry a line of 3+ points.`);
console.log(`median vertex spacing across all of them: p10 ${q(meds, .1)} m · p50 ${q(meds, .5)} m · p90 ${q(meds, .9)} m · max ${q(meds, 1)} m`);
console.log(`captioned as a sketch: ${all.filter((a) => a.sketch).length}\n`);

console.log(`=== ${drawn.length} UNCAPTIONED line(s) with sketch-like spacing (> ${SKETCH_SPACING_M} m) ===`);
console.log("These are drawn lines the app presents as recorded tracks.\n");
for (const d of drawn.sort((a, b) => b.med - a.med)) {
  // WHY each one escapes the caption matters, because the repair differs. A line touching SOME of
  // its pins fails the caption on a vertex the pins do not explain; a line touching NONE of them is
  // about something else entirely, and the existing sentence ("straight lines between this route's
  // waypoints") would be a FALSE claim there rather than a missing one.
  const why = !d.pins ? "no waypoints at all"
    : d.onPins === 0 ? "touches NONE of its own pins — the existing sentence would be FALSE here"
    : `${d.onPins} of ${d.verts} vertices on a pin`;
  console.log(`  ${d.id}  ${d.verts} vertices, median gap ${d.med} m — ${why}${d.pinCaveat ? "  [pin caveat present]" : ""}`);
}
