// wa_huckleberry_mountain_west_route: which side is this route actually on?
//
// The row disagrees with itself: name "West Route", aspect W, a "West Face Talus Basin"
// waypoint -- against an approach that arrives "roughly due EAST of the summit" and a
// climbing_route segment labelled "East Ridge/East Face to the summit block".
//
// Name-vs-aspect is exactly the audit:aspect-name shape, and that audit is PERMANENTLY
// report-only because the first repair it suggested was backwards (Little Annapurna: the aspect
// was right and the NAME was wrong). So do not resolve this from the name.
//
// The gpx track is the third record. Which compass side of the summit it approaches from is the
// question; bearing, not distance, is what answers it.
import { loadEnv } from "../lib/supabase-env.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const r = await fetch(`${U}/rest/v1/routes?id=eq.wa_huckleberry_mountain_west_route&select=area_id,waypoints,gpx`, { headers: H });
const [row] = await r.json();
const a = await fetch(`${U}/rest/v1/areas?id=eq.${row.area_id}&select=name,lat,lng`, { headers: H });
const [area] = await a.json();

const hav = (a1, o1, a2, o2) => {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (a2 - a1) * t, dLon = (o2 - o1) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
// Compass bearing FROM the summit TO a point, i.e. "this thing lies <dir> of the peak".
const bearing = (lat1, lon1, lat2, lon2) => {
  const t = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * t) * Math.cos(lat2 * t);
  const x = Math.cos(lat1 * t) * Math.sin(lat2 * t) - Math.sin(lat1 * t) * Math.cos(lat2 * t) * Math.cos((lon2 - lon1) * t);
  return (Math.atan2(y, x) / t + 360) % 360;
};
const dir = (b) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(b / 45) % 8];

const pts = (row.gpx || []).map((p) => Array.isArray(p) ? { lat: p[0], lng: p[1] } : p);
console.log(`peak ${area.name}  (${area.lat}, ${area.lng})\n`);

console.log("gpx track, sampled along its length — which side of the summit is it on?");
for (const frac of [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]) {
  const p = pts[Math.min(pts.length - 1, Math.round(frac * (pts.length - 1)))];
  const d = hav(area.lat, area.lng, p.lat, p.lng), b = bearing(area.lat, area.lng, p.lat, p.lng);
  console.log(`  ${String(Math.round(frac * 100)).padStart(3)}%  (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})  ${(d / 1000).toFixed(2)} km  ${dir(b)} of the summit  (${b.toFixed(0)}°)`);
}

console.log("\nwaypoints — which side of the summit does each lie?");
for (const w of (row.waypoints || [])) {
  if (w.lat == null) continue;
  const d = hav(area.lat, area.lng, w.lat, w.lng), b = bearing(area.lat, area.lng, w.lat, w.lng);
  console.log(`  [${String(w.type).padEnd(9)}] ${String(w.name).slice(0, 42).padEnd(43)} ${(d / 1000).toFixed(2)} km  ${dir(b)}  (${b.toFixed(0)}°)`);
}
