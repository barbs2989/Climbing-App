// IS "EVERY VERTEX IS A WAYPOINT" THE RIGHT TEST FOR "THIS LINE IS NOT A RECORDING"?
//
// `trackIsJustTheWaypoints` answers the second question by asking the first, and its own comment
// explains why the test is EVERY vertex rather than most: "a real recorded track passes through its
// own waypoints too, so a threshold would condemn genuine tracks that happen to be sparse." That is
// sound, and it makes the predicate fragile — 52 routes lost the caveat because a pin was repaired
// and its vertex stayed behind, and 17 still have a vertex sitting where no pin is.
//
// There is a second signal that carries none of that risk, because it does not ask what the vertices
// ARE: VERTEX SPACING. A GPS recording samples on a clock, so its points are metres apart and
// regular. A line somebody drew between named places has points kilometres apart. Measured on two
// routes already read by hand:
//     wa_magic_mountain_south_ridge   1013 points, p50 spacing     8 m   — a recording
//     wa_ptarmigan_traverse             11 points, p50 spacing 3,269 m   — a sketch
//
// If the catalog separates cleanly on that, the caveat is keyed on the wrong thing and a line that
// is manifestly not a recording could say so regardless of whether its vertices are pins.
//
// MEASUREMENT ONLY. It changes nothing; the point is to find out whether a change is warranted and
// what it would cost, since widening the caveat would caption routes that do not have it today.
import { selectAll } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const pointOf = (p) => {
  if (!p) return null;
  if (Array.isArray(p)) return typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null;
  return typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
};
const pct = (xs, f) => xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * f))] : NaN;

const rows = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

const tracks = [];
for (const r of rows) {
  const line = (r.gpx || []).map(pointOf).filter(Boolean);
  if (line.length < 2) continue;
  const gaps = [];
  for (let i = 1; i < line.length; i++) gaps.push(metres(line[i - 1], line[i]));
  gaps.sort((a, b) => a - b);
  tracks.push({
    id: r.id, n: line.length,
    p50: pct(gaps, 0.5),
    sketch: trackIsJustTheWaypoints(r.gpx, r.waypoints),
  });
}
if (!tracks.length) { console.log("FAIL CLOSED: no tracks"); process.exit(1); }

const known = tracks.filter((t) => t.sketch), rest = tracks.filter((t) => !t.sketch);
const show = (label, xs) => {
  const s = xs.map((t) => t.p50).sort((a, b) => a - b);
  console.log(`${label.padEnd(34)} n=${String(xs.length).padStart(4)}   p50 spacing: ` +
    `p10 ${Math.round(pct(s, 0.1))} m, median ${Math.round(pct(s, 0.5))} m, p90 ${Math.round(pct(s, 0.9))} m, min ${Math.round(s[0])} m`);
};
console.log(`${tracks.length} route(s) carry a line.\n`);
show("recognised as a sketch today", known);
show("everything else", rest);

// where does the second group sit? that is the question.
console.log("\n=== the non-sketch group by median vertex spacing ===");
const B = [[0, 50], [50, 200], [200, 500], [500, 1000], [1000, 99e9]];
for (const [lo, hi] of B) {
  const g = rest.filter((t) => t.p50 >= lo && t.p50 < hi);
  const pts = g.map((t) => t.n).sort((a, b) => a - b);
  console.log(`  ${String(lo).padStart(5)}-${hi > 1e9 ? "  inf" : String(hi).padStart(5)} m: ${String(g.length).padStart(4)} route(s)` +
    (g.length ? `   vertex count median ${pct(pts, 0.5)}` : ""));
}
const dense = known.filter((t) => t.p50 < 200);
console.log(`\nsketches already recognised whose spacing is under 200 m: ${dense.length}`);
for (const t of dense.slice(0, 6)) console.log(`   ${t.id}  ${t.n} pts, p50 ${Math.round(t.p50)} m`);
console.log("\nMEASUREMENT ONLY — nothing written, nothing changed.");
