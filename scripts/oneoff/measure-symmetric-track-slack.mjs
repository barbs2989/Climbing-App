// WHAT WOULD SYMMETRIC SLACK COST?
//
// `trackIsJustTheWaypoints` is asymmetric and only one side of it is justified:
//
//     line.every(onAPin) && pins.filter(onTheLine).length >= pins.length - 1
//              ^ no slack                        ^ one pin may be missed
//
// The pin slack has a stated reason ("allows a summit pin that the line stops short of"). The vertex
// strictness has one too — "a threshold would condemn genuine tracks that happen to be sparse" — but
// that argument is about a threshold on HOW MANY vertices are waypoints, and the <=40 vertex cap
// already excludes recordings: a GPS track has hundreds of points and none of them lands within 5 m
// of a named waypoint by chance.
//
// The cost of the asymmetry is that ONE stranded vertex — the collateral of any pin repair — deletes
// the caveat outright. 52 routes had lost it that way.
//
// This measures the exact population that symmetric slack would newly caption, and then asks the
// question that decides whether it is safe: COULD ANY OF THEM BE A REAL RECORDING? A recording is
// dense and regular, so vertex spacing answers it directly.
//
// MEASUREMENT ONLY.
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

// the proposed predicate: identical but for one vertex of slack
function symmetric(gpxPts, waypoints) {
  const line = (Array.isArray(gpxPts) ? gpxPts : []).map(pointOf).filter(Boolean);
  const pins = (Array.isArray(waypoints) ? waypoints : []).map(pointOf).filter(Boolean);
  // >= 3, not >= 2: on a two-point line "one vertex of slack" is HALF the line, which is satisfied
  // by any stub with one end near a pin. Measured, that admitted wa_mount_terror_stoddard_buttress
  // — a 55 m placeholder this repo already documents — and wa_mount_stuart_the_gendarme at 69 m.
  if (line.length < 2 || line.length > 40 || !pins.length) return false;
  const onAPin = (v) => pins.some((p) => metres(v, p) < 5);
  const onTheLine = (p) => line.some((v) => metres(v, p) < 5);
  const on = line.filter(onAPin).length;
  // STRICTLY ADDITIVE. A two-point line keeps the old rule exactly: on a line with no interior,
  // "one vertex of slack" is HALF of it, satisfied by any stub with one end near a pin. Applying
  // the slack there both admitted a 55 m placeholder AND — measured by this script's own LOST
  // check — took the caveat AWAY from 34 two-point lines that legitimately carry it today.
  const vertexOk = line.length >= 3 ? (on >= line.length - 1) : (on === line.length);
  return vertexOk && pins.filter(onTheLine).length >= pins.length - 1;
}

const rows = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

let today = 0, after = 0;
const gained = [];
for (const r of rows) {
  const line = (r.gpx || []).map(pointOf).filter(Boolean);
  if (line.length < 2) continue;
  const a = trackIsJustTheWaypoints(r.gpx, r.waypoints), b = symmetric(r.gpx, r.waypoints);
  if (a) today++;
  if (b) after++;
  if (a && !b) { console.log(`LOST: ${r.id} — symmetric slack must never REMOVE a caveat`); process.exitCode = 1; }
  if (!a && b) {
    const gaps = [];
    for (let i = 1; i < line.length; i++) gaps.push(metres(line[i - 1], line[i]));
    gaps.sort((x, y) => x - y);
    const pins = (r.waypoints || []).map(pointOf).filter(Boolean);
    gained.push({ id: r.id, n: line.length, p50: Math.round(pct(gaps, 0.5)),
      on: line.filter((v) => pins.some((p) => metres(v, p) < 5)).length });
  }
}

console.log(`captioned today: ${today}   with symmetric slack: ${after}   newly captioned: ${gained.length}\n`);
const sp = gained.map((g) => g.p50).sort((a, b) => a - b);
const np = gained.map((g) => g.n).sort((a, b) => a - b);
if (gained.length) {
  console.log(`  vertex count:   min ${np[0]}, median ${pct(np, 0.5)}, max ${np[np.length - 1]}`);
  console.log(`  p50 spacing:    min ${sp[0]} m, median ${pct(sp, 0.5)} m, max ${sp[sp.length - 1]} m`);
  const risky = gained.filter((g) => g.p50 < 100 || g.n > 30);
  console.log(`\n  COULD ANY BE A RECORDING? (spacing under 100 m, or more than 30 points): ${risky.length}`);
  for (const g of risky) console.log(`      ${g.id}  ${g.n} pts, ${g.on} on a pin, p50 ${g.p50} m`);
  console.log("\n  a sample of what is newly captioned:");
  for (const g of gained.slice(0, 8)) console.log(`      ${g.id}  ${g.n} pts, ${g.on} on a pin, p50 ${g.p50} m`);
}
console.log("\nMEASUREMENT ONLY — nothing written.");
