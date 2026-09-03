// A PIN REPAIR CAN SILENTLY DELETE THE "NOT A RECORDED TRACK" CAVEAT.
//
// 201 of 580 WA routes store a polyline whose every vertex IS one of that route's own waypoints.
// `trackIsJustTheWaypoints` detects those and the route page captions them — "Straight lines between
// this route's waypoints — not a recorded GPS track. Do not navigate by it." The predicate requires
// EVERY vertex to be on a pin, deliberately: a genuine track passes through its own waypoints too,
// so a threshold would caption correct data.
//
// THAT MAKES IT FRAGILE IN ONE DIRECTION NOBODY HAD ASKED ABOUT. Move a pin — which the cross-route,
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
import { trackIsJustTheWaypoints } from "../lib/track.js";

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
  if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) { sketch++; continue; }
  if (line.length > MAX_VERTICES) continue;           // a real recording, out of scope

  const off = line.filter((v) => !pins.some((p) => metres(v, p) < NEAR_M));
  // "almost its own waypoints": at most two vertices adrift, and the rest genuinely on pins
  if (!off.length || off.length > 2) continue;
  if (line.length - off.length < 3) continue;         // too short to call a sketch at all

  stranded.push({
    id: r.id, verts: line.length, off,
    orphanPins: pins.filter((p) => !line.some((v) => metres(v, p) < NEAR_M)),
  });
}

console.log(`${withTrack} route(s) carry a track and pins; ${sketch} are their own waypoints joined up.\n`);
if (!stranded.length) {
  console.log("No stranded vertices: every sketched line still matches its pins, so no route has");
  console.log("silently lost the 'not a recorded GPS track' caveat.");
} else {
  console.log(`=== ${stranded.length} route(s) whose line is ALMOST its own waypoints ===`);
  console.log("Each has lost the caveat: the line now poses as a recorded track.\n");
  for (const s of stranded) {
    console.log(`  ${s.id}  (${s.verts} vertices, ${s.off.length} adrift)`);
    for (const v of s.off) console.log(`      vertex at ${v.lat},${v.lng} sits on no pin`);
    for (const p of s.orphanPins) console.log(`      pin "${p.name}" @ ${p.lat},${p.lng} is on no vertex`);
  }
  console.log("\nA vertex adrift and a pin orphaned in the same route is the fingerprint of a pin");
  console.log("repair that did not carry its sketched line with it. The fix is to move the vertex");
  console.log("onto the pin — copying a coordinate the row already holds, inventing nothing.");
}
console.log("\nreport-only");
