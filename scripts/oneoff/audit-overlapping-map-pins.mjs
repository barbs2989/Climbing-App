// Which routes open their ROUTE MAP with one waypoint pin drawn on top of another?
//
// Reported 2026-10-01 on Forbidden Peak's West Ridge: the "West Ridge notch" Junction sits ~170 m
// from the summit, which at the zoom the map OPENS at is 6 px. Each pin is a 20 px icon, so the
// notch covered the summit and tapping the summit opened the notch — the summit pin could not be
// reached at all. Nothing about either row is wrong; two real places close together are simply
// drawn on top of each other at the fit zoom.
//
// This replays GPXMap's opening view in Web Mercator — bounds of the track (or the placed pins),
// padded 25% a side, fitted into a phone-width map (358 x 300 px) and capped at the satellite
// layer's sharpest zoom (19) — and lists every route where two placed pins land closer than
// one icon width. `--covered` reports only pairs closer than HALF an icon, where the lower pin
// is essentially unreachable by tap.
//
// The fix (one combined popup listing every pin within a tap of the one tapped) makes every
// listed pin reachable without moving any data, so this is a measurement, not a worklist:
// re-run it to see the class, never to "repair" coordinates that are correct.
//
//   node scripts/oneoff/audit-overlapping-map-pins.mjs [--covered] [--list]
import { selectAll } from "../lib/supabase-env.mjs";

const W = 358, H = 300, ICON = 20, MAX_Z = 19;
const coveredOnly = process.argv.includes("--covered");
const list = process.argv.includes("--list");
const num = v => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const placed = w => w && num(w.lat) != null && num(w.lng) != null;
// Web Mercator world pixel at zoom z (256 px tiles), as Leaflet's map.project does.
const proj = (lat, lng, z) => {
  const s = 256 * Math.pow(2, z), r = Math.PI / 180, sin = Math.sin(lat * r);
  return [s * (lng + 180) / 360, s * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI))];
};
function fitZoom(pts) {
  let s = 90, n = -90, w = 180, e = -180;
  for (const [la, ln] of pts) { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, ln); e = Math.max(e, ln); }
  const dl = (n - s) * 0.25, dn = (e - w) * 0.25; s -= dl; n += dl; w -= dn; e += dn;
  for (let z = MAX_Z; z >= 0; z--) {
    const a = proj(n, w, z), b = proj(s, e, z);
    if (b[0] - a[0] <= W && b[1] - a[1] <= H) return z;
  }
  return 0;
}

const rows = await selectAll("routes", "id,name,waypoints,gpx", "waypoints=not.is.null", { pageSize: 1000 });
let withPins = 0, affectedRoutes = 0, affectedPins = 0, invalid = 0;
const hits = [];
for (const r of rows) {
  let wps = r.waypoints;
  if (typeof wps === "string") { try { wps = JSON.parse(wps); } catch { continue; } }
  if (!Array.isArray(wps)) continue;
  const pins = wps.filter(placed).map(w => ({ name: w.name || w.type || "?", type: w.type, lat: num(w.lat), lng: num(w.lng) }));
  // A coordinate outside the globe would draw nowhere (or throw) — a different "cannot tap" cause.
  const bad = pins.filter(p => Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180);
  if (bad.length) { invalid++; hits.push({ id: r.id, z: null, pairs: bad.map(p => [p.name, "(off the globe)", null]) }); }
  const good = pins.filter(p => Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
  if (!good.length) continue;
  withPins++;
  const track = Array.isArray(r.gpx) && r.gpx.length >= 2 ? r.gpx.map(p => [num(p[0] ?? p.lat), num(p[1] ?? p.lng)]).filter(p => p[0] != null && p[1] != null) : [];
  const z = fitZoom([...track, ...good.map(p => [p.lat, p.lng])]);
  const xy = good.map(p => proj(p.lat, p.lng, z));
  const lim = coveredOnly ? ICON / 2 : ICON;
  const pairs = [], touched = new Set();
  for (let i = 0; i < good.length; i++) for (let j = i + 1; j < good.length; j++) {
    const d = Math.hypot(xy[i][0] - xy[j][0], xy[i][1] - xy[j][1]);
    if (d < lim) { pairs.push([good[i].name, good[j].name, Math.round(d)]); touched.add(i); touched.add(j); }
  }
  if (pairs.length) { affectedRoutes++; affectedPins += touched.size; hits.push({ id: r.id, z, pairs }); }
}
console.log(`routes with placed waypoints: ${withPins} (of ${rows.length} with a waypoints value)`);
console.log(`routes where two pins overlap at the opening zoom (< ${coveredOnly ? ICON / 2 : ICON} px apart): ${affectedRoutes} — ${affectedPins} pins involved`);
console.log(`routes with a pin off the globe: ${invalid}`);
if (list) for (const h of hits) console.log(`  ${h.id} z${h.z}: ` + h.pairs.map(p => `${p[0]} / ${p[1]}${p[2] != null ? " " + p[2] + "px" : ""}`).join("; "));
