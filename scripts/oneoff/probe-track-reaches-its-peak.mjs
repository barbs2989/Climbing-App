// Does a route's gpx track go anywhere near the peak the route is filed under?
//
// This is the airtight version of the waypoint question. `audit:waypoints` measures pins
// against the track and cannot say which of the two is wrong. But a route on Curtis Ridge must
// have a track that passes Mount Rainier — that needs no waypoints, no prose and no judgement,
// only the area's own coordinate. Curtis Ridge's track is five points near North Bend, ~65 km
// away, and every geometry finding on that route is downstream of it.
//
// SCOPE IS area_type='peak' ON PURPOSE. A crag or a region carries a centroid, and a centroid
// is legitimately far from any one line inside it, so the same test there measures the size of
// the container rather than a defect. `area_type='peak'` is WA-only (memory: area-type-peak-is-
// wa-only) and a peak coordinate IS the summit, which an alpine route is expected to reach.
//
// The threshold is chosen from the measured distribution below, not assumed.
//
// Read-only. Prints; writes nothing.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const R = Math.PI / 180;
function hav(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * R, dLng = (bLng - aLng) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * R) * Math.cos(bLat * R) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}

const routes = await selectAll("routes", "id,name,area_id,gpx", "id=like.wa_*",
  { pageSize: 120, key });
const areas = await selectAll("areas", "id,name,lat,lng,area_type", "", { pageSize: 800, key });
if (!routes.length || !areas.length) {
  console.error("read 0 rows — refusing to report a clean result"); process.exit(1);
}
const A = new Map(areas.map(a => [a.id, a]));

/* Decimal places in the stored coordinate, because THE TELL IS PRECISION, NOT PROXIMITY
   (memory: picket-placeholder-coordinates). Eight Northern Picket peaks carry 3-decimal
   placeholders while their neighbours carry 6-7, and against a placeholder summit this whole
   test measures the wrong thing: a perfectly good track would read as kilometres off a peak
   whose coordinate was never a measurement. So a low-precision area is reported as an AREA
   defect, not a track one. 3 decimals is ~110 m of latitude, well inside the 2 km threshold,
   so this cannot excuse a genuinely displaced track either. */
function decimals(v) {
  const s = String(v);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

const measured = [];
let noGpx = 0, noAreaCoord = 0, notPeak = 0;
for (const r of routes) {
  const g = Array.isArray(r.gpx) ? r.gpx : [];
  if (g.length < 2) { noGpx++; continue; }
  const a = A.get(r.area_id);
  if (!a) { noAreaCoord++; continue; }
  if (a.area_type !== "peak") { notPeak++; continue; }
  if (a.lat == null || a.lng == null) { noAreaCoord++; continue; }
  let min = Infinity;
  for (const p of g) {
    const lat = Array.isArray(p) ? +p[0] : +p.lat, lng = Array.isArray(p) ? +p[1] : +p.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const d = hav(+a.lat, +a.lng, lat, lng);
    if (d < min) min = d;
  }
  if (!Number.isFinite(min)) continue;
  measured.push({ id: r.id, name: r.name, area: a.name, areaId: a.id, minM: Math.round(min), pts: g.length,
    lat: a.lat, lng: a.lng, dp: Math.min(decimals(a.lat), decimals(a.lng)) });
}

console.log(`wa routes: ${routes.length}`);
console.log(`  skipped — no usable gpx: ${noGpx}, area not a peak: ${notPeak}, no area coord: ${noAreaCoord}`);
console.log(`  measured: ${measured.length}\n`);

const ds = measured.map(m => m.minM).sort((a, b) => a - b);
const q = f => ds[Math.min(ds.length - 1, Math.floor(ds.length * f))];
console.log("closest approach of a route's own track to its own peak:");
console.log(`  p50=${q(0.5)} m  p90=${q(0.9)} m  p95=${q(0.95)} m  p99=${q(0.99)} m  max=${ds[ds.length - 1]} m`);
for (const t of [500, 1000, 2000, 5000, 10000, 20000]) {
  console.log(`  never within ${String(t).padStart(6)} m: ${measured.filter(m => m.minM > t).length}`);
}

console.log("\n-- every track that never comes within 2 km of its own peak --");
console.log("   (pts<4 is a placeholder stub, already reported as `unrouted`;");
console.log("    dp<=3 means the PEAK coordinate is a placeholder and this test cannot judge the track)");
for (const m of measured.filter(m => m.minM > 2000).sort((a, b) => b.minM - a.minM)) {
  const why = m.dp <= 3 ? "AREA COORD IS A PLACEHOLDER" : m.pts < 4 ? "gpx is a stub" : "TRACK";
  console.log(`  ${String(m.minM).padStart(6)} m  ${m.id.padEnd(42)} ${String(m.pts).padStart(4)} pts  dp=${m.dp}  ${why}`);
  console.log(`            ${m.area} @ ${m.lat},${m.lng}`);
}
