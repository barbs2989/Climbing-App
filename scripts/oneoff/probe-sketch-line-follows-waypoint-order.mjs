// IS A SKETCHED LINE DRAWN IN WAYPOINT ORDER?
//
// fix-stranded-track-vertices.mjs pairs each adrift vertex with its NEAREST orphaned pin. Its exact
// post-condition (trackIsJustTheWaypoints becomes true) is satisfied by ANY bijection, so on a route
// with two adrift vertices a wrong pairing passes the gate while scrambling the drawn line.
//
// If these lines are drawn through the waypoints IN ORDER, then position is a stronger pairing rule
// than distance and needs no threshold at all. This measures that on the routes where it can be
// checked: the ones already satisfying the predicate, where every vertex is on a known pin.
//
// The answer decides the pairing rule; it is not assumed.
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

const rows = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

let checked = 0, identity = 0, monotone = 0, neither = 0;
const examples = [];
for (const r of rows) {
  if (!trackIsJustTheWaypoints(r.gpx, r.waypoints)) continue;
  const line = (r.gpx || []).map(pointOf).filter(Boolean);
  const pins = (r.waypoints || []).map(pointOf).filter(Boolean);
  if (line.length < 3) continue;
  // which pin index does each vertex sit on?
  const idx = line.map((v) => {
    let best = Infinity, bi = -1;
    pins.forEach((p, j) => { const d = metres(v, p); if (d < best) { best = d; bi = j; } });
    return best < 5 ? bi : -1;
  });
  if (idx.some((i) => i < 0)) continue;
  checked++;
  const isIdentity = idx.every((v, i) => v === i);
  const isMonotone = idx.every((v, i) => i === 0 || v > idx[i - 1]);
  if (isIdentity) identity++;
  else if (isMonotone) monotone++;
  else { neither++; if (examples.length < 6) examples.push({ id: r.id, idx }); }
}

console.log(`${checked} sketched line(s) where every vertex resolves to a pin\n`);
console.log(`  vertex i sits on waypoint i exactly:      ${identity}  (${(100 * identity / checked).toFixed(1)}%)`);
console.log(`  strictly increasing but not the identity: ${monotone}  (${(100 * monotone / checked).toFixed(1)}%)`);
console.log(`  neither — the line does not follow order: ${neither}  (${(100 * neither / checked).toFixed(1)}%)`);
for (const e of examples) console.log(`      ${e.id}: ${e.idx.join(",")}`);
console.log(`\n-> ${identity + monotone === checked
  ? "ORDER IS SAFE as a pairing rule: every sketched line follows its waypoint list."
  : "order is NOT universal — pairing by position would scramble " + neither + " line(s)."}`);
