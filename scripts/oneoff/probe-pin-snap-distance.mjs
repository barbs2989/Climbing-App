// How far off its own track does a waypoint actually sit?
//
// Deriving `distMi` means projecting a pin onto the route's polyline and summing the segments
// up to that point. That is only meaningful if the pin is ON the line: a pin hundreds of metres
// away snaps to whichever track point happens to be nearest and yields a confident, wrong
// distance. So the gate threshold has to come from the measured distribution, not from a number
// somebody liked — the mistake `check:field-renders` records about indexes, one level over.
//
// Measures the perpendicular distance from every pin to its route's track, on the 115 routes
// where a genuine (non-synthetic) track exists, and prints the distribution per waypoint TYPE
// because the types are not alike: a Bailout pin is SUPPOSED to be off the line, and
// audit:waypoint-track already carries per-type tolerances for exactly that reason.
//
//   node scripts/oneoff/probe-pin-snap-distance.mjs [--state wa]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";
import { dedupeWaypoints } from "../../lib/waypoints.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

const num = v => (typeof v === "number" && Number.isFinite(v)) ? v : null;
const coordOf = w => {
  if (!w || typeof w !== "object") return null;
  const la = num(w.lat), ln = num(w.lng ?? w.lon);
  return (la != null && ln != null) ? [la, ln] : null;
};
const lineOf = g => {
  const pts = Array.isArray(g) ? g : (g && Array.isArray(g.points) ? g.points : null);
  if (!pts) return [];
  return pts.map(p => Array.isArray(p) ? [num(p[0]), num(p[1])]
    : [num(p.lat), num(p.lng ?? p.lon)]).filter(c => c[0] != null && c[1] != null);
};

// Equirectangular metres. Over a route-sized extent the error against haversine is far below
// anything this decides, and it keeps the segment projection simple planar algebra.
const R = 6371008.8;
const toXY = ([la, ln], lat0) => [R * (ln * Math.PI / 180) * Math.cos(lat0 * Math.PI / 180), R * (la * Math.PI / 180)];

// Perpendicular distance from p to segment ab, and how far along ab the foot of that
// perpendicular lies. Both are needed: the distance gates, the fraction positions.
function segDist(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const wx = p[0] - a[0], wy = p[1] - a[1];
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
  const cx = a[0] + t * vx, cy = a[1] + t * vy;
  return { d: Math.hypot(p[0] - cx, p[1] - cy), t, segLen: Math.sqrt(len2) };
}

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx` +
    `&waypoints=not.is.null&gpx=not.is.null` + (STATE ? `&id=like.${STATE}_*` : "") +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 900 * (a + 1)));
  }
}

const rows = [];
for (let after = null; ;) {
  const p = await page(after);
  if (!p.length) break;
  rows.push(...p);
  if (p.length < 1000) break;
  after = p[p.length - 1].id;
}
if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");

const byType = new Map();
let routesMeasured = 0, pinsMeasured = 0;
const routeWorst = [];
for (const r of rows) {
  const wps = dedupeWaypoints(Array.isArray(r.waypoints) ? r.waypoints : []);
  if (wps.length < 2) continue;
  const line = lineOf(r.gpx);
  if (line.length < 2) continue;
  const pins = wps.map(coordOf).filter(Boolean);
  if (pins.length < wps.length) continue;
  if (trackIsJustTheWaypoints(line, pins)) continue;   // circular — excluded, see the doc

  const lat0 = line[0][0];
  const xy = line.map(c => toXY(c, lat0));
  routesMeasured++;
  const worstOnRoute = [];
  for (const w of wps) {
    const p = toXY(coordOf(w), lat0);
    let best = Infinity;
    for (let i = 0; i + 1 < xy.length; i++) {
      const { d } = segDist(p, xy[i], xy[i + 1]);
      if (d < best) best = d;
    }
    const t = String(w.type || "?");
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(best);
    worstOnRoute.push(best);
    pinsMeasured++;
  }
  // The gate is per-ROUTE, not per-pin: orderWaypoints needs EVERY pin to carry a distMi, so a
  // single bad snap disqualifies the whole route. Recording the worst pin is what makes that
  // answerable — a per-pin acceptance rate would badly overstate how many routes are fixable.
  routeWorst.push({ id: r.id, worst: Math.max(...worstOnRoute), pins: wps.length,
    missing: wps.filter(w => num(w.distMi) == null).length });
}

const pct = (a, q) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))] : null;
const fmt = v => v == null ? "-" : (v < 1000 ? `${Math.round(v)}m` : `${(v / 1000).toFixed(1)}km`);

console.log(`${routesMeasured} routes with a genuine track, ${pinsMeasured} pins measured\n`);
console.log(`${"type".padEnd(16)} ${"n".padStart(5)}  ${"median".padStart(8)} ${"p75".padStart(8)} ${"p90".padStart(8)} ${"p95".padStart(8)} ${"max".padStart(9)}`);
const all = [];
for (const [t, ds] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
  all.push(...ds);
  console.log(`${t.padEnd(16)} ${String(ds.length).padStart(5)}  ${fmt(pct(ds, 0.5)).padStart(8)} ${fmt(pct(ds, 0.75)).padStart(8)} ${fmt(pct(ds, 0.9)).padStart(8)} ${fmt(pct(ds, 0.95)).padStart(8)} ${fmt(Math.max(...ds)).padStart(9)}`);
}
console.log(`${"ALL".padEnd(16)} ${String(all.length).padStart(5)}  ${fmt(pct(all, 0.5)).padStart(8)} ${fmt(pct(all, 0.75)).padStart(8)} ${fmt(pct(all, 0.9)).padStart(8)} ${fmt(pct(all, 0.95)).padStart(8)} ${fmt(Math.max(...all)).padStart(9)}`);

for (const g of [50, 100, 200, 400, 800]) {
  const n = all.filter(d => d <= g).length;
  console.log(`  a ${String(g).padStart(3)}m gate would accept ${n} of ${all.length} pins (${(100 * n / all.length).toFixed(1)}%)`);
}
console.log("\nPER-ROUTE, which is what actually decides fixability:");
const needsWork = routeWorst.filter(r => r.missing > 0);
for (const g of [50, 100, 200, 400]) {
  const all = routeWorst.filter(r => r.worst <= g).length;
  const fix = needsWork.filter(r => r.worst <= g).length;
  console.log(`  a ${String(g).padStart(3)}m gate: EVERY pin fits on ${all} of ${routeWorst.length} routes` +
    ` — ${fix} of the ${needsWork.length} that are actually missing a distMi`);
}
console.log("\nReport only — nothing was changed.");
