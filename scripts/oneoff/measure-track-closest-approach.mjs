// Does the track come near its own peak? Measured over EVERY point, not the endpoints.
//
// This exists because I got it wrong the other way. In #1076 I reported that
// wa_three_queens_standard and wa_south_face_12 "store a track that never comes within 4 km /
// 9 km of their own peak" -- measured from the track's FIRST and LAST point only. Both tracks
// turn out to start and end at nearly the same coordinate, i.e. they are out-and-backs, so the
// endpoints are the trailhead twice and the summit is in the MIDDLE. Endpoint distance says
// nothing about whether a track reaches its peak.
//
// The right test is the minimum over all points, which is what audit:waypoints' trackOffItsPeak
// already does. Read-only.
import { loadEnv } from "../lib/supabase-env.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const hav = (a1, o1, a2, o2) => {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (a2 - a1) * t, dLon = (o2 - o1) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

for (const id of process.argv.slice(2)) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=id,name,area_id,gpx`, { headers: H });
  const [row] = await r.json();
  if (!row) { console.log(`${id}: no row`); continue; }
  const a = await fetch(`${U}/rest/v1/areas?id=eq.${row.area_id}&select=name,lat,lng`, { headers: H });
  const [area] = await a.json();
  const pts = (row.gpx || []).map((p) => Array.isArray(p) ? { lat: p[0], lng: p[1] } : p).filter((p) => p && p.lat != null);
  if (!pts.length || !area || area.lat == null) { console.log(`${id}: no track or no peak coordinate`); continue; }

  let min = Infinity, minAt = -1;
  pts.forEach((p, i) => { const d = hav(p.lat, p.lng, area.lat, area.lng); if (d < min) { min = d; minAt = i; } });
  const first = hav(pts[0].lat, pts[0].lng, area.lat, area.lng);
  const last = hav(pts[pts.length - 1].lat, pts[pts.length - 1].lng, area.lat, area.lng);
  const loop = hav(pts[0].lat, pts[0].lng, pts[pts.length - 1].lat, pts[pts.length - 1].lng);

  console.log(`### ${id}  "${row.name}"  under ${area.name}`);
  console.log(`  points ${pts.length}   start<->end ${Math.round(loop)} m  ${loop < 200 ? "(OUT-AND-BACK: endpoints are the trailhead twice)" : ""}`);
  console.log(`  first point -> peak : ${(first / 1000).toFixed(2)} km`);
  console.log(`  last  point -> peak : ${(last / 1000).toFixed(2)} km`);
  console.log(`  CLOSEST APPROACH    : ${(min / 1000).toFixed(3)} km  (at point ${minAt} of ${pts.length}, ${Math.round(100 * minAt / (pts.length - 1))}% along)`);
  console.log(`  verdict: ${min < 500 ? "the track DOES reach its peak — endpoint-only measurement was misleading"
    : min < 2000 ? "comes close but not to the summit" : "genuinely never approaches this peak"}`);
  console.log("");
}
