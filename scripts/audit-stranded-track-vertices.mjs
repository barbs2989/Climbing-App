// A PIN REPAIR CAN SILENTLY DELETE THE "NOT A RECORDED TRACK" CAVEAT.
//
// 201 of 580 WA routes store a polyline whose every vertex IS one of that route's own waypoints.
// `trackIsJustTheWaypoints` detects those and the route page captions them — "Straight lines between
// this route's waypoints — not a recorded GPS track. Do not navigate by it." The predicate requires
// EVERY vertex to be on a pin, deliberately: a genuine track passes through its own waypoints too,
// so a threshold would caption correct data.
//
// SINCE lib/track.js GAINED ONE VERTEX OF SLACK, a SINGLE stranded vertex no longer deletes the
// caveat — the root cause of that fragility is fixed and this audit's subject narrowed accordingly:
// it now finds lines carrying TWO adrift vertices, which the slack deliberately does not cover.
// The accuracy question is separate and still live: a stranded vertex is painted on the map a
// kilometre from the pin it belongs to whether or not the caveat renders.
//
// THAT MADE IT FRAGILE IN ONE DIRECTION NOBODY HAD ASKED ABOUT. Move a pin — which the cross-route,
// trailhead and camp repairs all do — and the vertex drawn through its OLD position stays behind.
// The line stops being "the waypoints and nothing else", the predicate goes false, and the route
// SILENTLY STOPS SAYING its line is a sketch. A five-vertex sketch across 30 miles of the North
// Cascades then poses as a recorded GPS track, with a Download GPX button under it.
//
// No guard can see it: check:track-caveat proves the CODE renders the caveat when the predicate
// fires, never that a given row still satisfies the predicate. The three waypoint audits ask
// whether a pin is on its track, which on these routes was true by construction and is now false
// for the one repaired pin — reported, if at all, as a pin defect rather than as a lost caveat.
//
// This asks the row: is this line ALMOST its own waypoints? A track that misses by one or two
// vertices, on a route whose line is otherwise a sketch, is a stranded vertex — not a recording.
//
// Report-only, read-only, fails closed on an empty read.
import { selectAll } from "./lib/supabase-env.mjs";
import { trackIsJustTheWaypoints, coordinateIsComputed } from "../lib/track.js";

const NEAR_M = 5;           // the predicate's own tolerance
const MAX_VERTICES = 40;    // the predicate's own cap: past this it is a real recording
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const pointOf = (p) => {
  if (!p) return null;
  if (Array.isArray(p)) return typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null;
  return typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
};

const state = (process.argv.find((a) => a.startsWith("--state=")) || "").split("=")[1] || "";
const rows = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

let withTrack = 0, sketch = 0, stranded = [];
for (const r of rows) {
  if (state && !String(r.id).startsWith(state)) continue;
  const line = (Array.isArray(r.gpx) ? r.gpx : []).map(pointOf).filter(Boolean);
  const pins = (Array.isArray(r.waypoints) ? r.waypoints : []).map((w) => {
    const p = pointOf(w); return p ? { ...p, name: w.name } : null;
  }).filter(Boolean);
  if (line.length < 2 || !pins.length) continue;
  withTrack++;
  const captioned = trackIsJustTheWaypoints(r.gpx, r.waypoints);
  if (captioned) sketch++;
  if (line.length > MAX_VERTICES) continue;           // a real recording, out of scope

  const off = line.filter((v) => !pins.some((p) => metres(v, p) < NEAR_M));
  // "almost its own waypoints": at most two vertices adrift, and the rest genuinely on pins
  if (!off.length || off.length > 2) continue;
  if (line.length - off.length < 3) continue;         // too short to call a sketch at all

  // WHICH KIND OF ADRIFT VERTEX, because the two want OPPOSITE repairs and this report used to
  // prescribe one of them for both. A STRANDED vertex sits where a pin used to be, and the fix is
  // to carry it onto the pin. A COMPUTED one was interpolated along the line itself — a 14-decimal
  // tail, or sitting on the straight chord between its own neighbours — and moving it would invent
  // a shape the line never had. Measured: of the six routes the repair script proposed before this
  // distinction existed, THREE were computed, and the confidence ratio did not catch them (one
  // scored 18.4x). Same rule as lib/track.js's, imported rather than re-implemented.
  const onChord = (v) => {
    const j = line.indexOf(v), a = line[j - 1], b = line[j + 1];
    if (j < 1 || !a || !b) return false;               // an endpoint has no chord — says nothing
    const T = Math.PI / 180, k = Math.cos(a.lat * T), R = 6371000 * T;
    const px = (v.lng - a.lng) * k * R, py = (v.lat - a.lat) * R;
    const bx = (b.lng - a.lng) * k * R, by = (b.lat - a.lat) * R;
    const L2 = bx * bx + by * by;
    if (!L2) return false;
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / L2));
    return Math.hypot(px - t * bx, py - t * by) < 1;
  };
  const computed = off.filter((v) => coordinateIsComputed([v.lat, v.lng]) || onChord(v));

  stranded.push({
    id: r.id, verts: line.length, off, captioned, computed,
    orphanPins: pins.filter((p) => !line.some((v) => metres(v, p) < NEAR_M)),
  });
}

console.log(`${withTrack} route(s) carry a track and pins; ${sketch} are their own waypoints joined up.\n`);
// THE CAPTION IS A COLUMN, NOT A FILTER — and it was a filter until the slack reached two.
//
// This audit shares `trackIsJustTheWaypoints` with the app, and while a qualifying route was
// SKIPPED, every widening of that predicate silently shortened this report: the moment two of
// slack landed, all eight routes it had been reporting vanished and it printed "no stranded
// vertices" about a catalog where eight lines still have a vertex drawn a kilometre from the pin
// it belongs to. An audit that goes quiet because the thing it measures was excused is the
// overstated-coverage failure this repo keeps recording, committed by its own author.
//
// The caveat and the drawn line are DIFFERENT QUESTIONS, which lib/track.js already says of the
// one-vertex slack: the slack restores the honesty, the repair restores the accuracy. So a
// captioned route is still reported — flagged as captioned, so nobody reads it as a missing
// caveat — and only the UNCAPTIONED ones are the honesty defect.
const lost = stranded.filter((s) => !s.captioned);
if (!stranded.length) {
  console.log("No stranded vertices: every sketched line still matches its pins, so no route has");
  console.log("silently lost the 'not a recorded GPS track' caveat.");
} else {
  console.log(`=== ${stranded.length} route(s) whose line is ALMOST its own waypoints ===`);
  console.log(lost.length
    ? `${lost.length} have LOST the caveat: the line poses as a recorded track. The rest are captioned, and still carry a misplaced vertex.`
    : "All are still captioned, so no route poses as a recorded track — but each carries a vertex drawn where a pin used to be.\n");
  for (const s of stranded) {
    console.log(`  ${s.id}  (${s.verts} vertices, ${s.off.length} adrift)${s.captioned ? "  [captioned — accuracy only]" : "  [CAVEAT LOST]"}`);
    for (const v of s.off) console.log(`      vertex at ${v.lat},${v.lng} sits on no pin${s.computed.includes(v) ? "  [COMPUTED — leave it: it was interpolated along the line, not left behind by a pin]" : ""}`);
    for (const p of s.orphanPins) console.log(`      pin "${p.name}" @ ${p.lat},${p.lng} is on no vertex`);
  }
  const nOff = stranded.reduce((a, s) => a + s.off.length, 0);
  const nComp = stranded.reduce((a, s) => a + s.computed.length, 0);
  console.log(`\n${nOff} adrift vertex/vertices across ${stranded.length} route(s); ${nComp} of them COMPUTED.`);
  console.log("A STRANDED vertex — adrift while a pin sits orphaned — is the fingerprint of a pin repair");
  console.log("that did not carry its sketched line with it, and the fix is to move it onto the pin,");
  console.log("copying a coordinate the row already holds. A COMPUTED one is the opposite: it was");
  console.log("interpolated along the line, so there is no old pin position to carry it to and moving");
  console.log("it would invent a shape the line never had. Leave those alone.");
}
console.log("\nreport-only");
