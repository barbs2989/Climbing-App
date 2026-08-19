// Which half of wa_sherpa_balanced_rock_standard is wrong?
//
// The defects index called it "approach is the Teanaway side; waypoints are the Icicle side",
// i.e. a 1-v-1 disagreement, which is NOT decidable -- the Little Annapurna case is on record
// where the reported repair was backwards. But this row carries a THIRD record: a 324-point
// gpx track. Anchoring on it settles the direction.
//
// The track is only usable as evidence if it is a real track. `lib/track.js` records that 201
// of 580 WA routes store a line that IS the waypoint list joined up -- on those, "is the pin on
// the track" is answered yes by construction and proves nothing. So this checks that first.
import { loadEnv } from "../lib/supabase-env.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const ID = "wa_sherpa_balanced_rock_standard";
const r = await fetch(`${U}/rest/v1/routes?id=eq.${ID}&select=id,area_id,waypoints,gpx`, { headers: H });
const [row] = await r.json();
const a = await fetch(`${U}/rest/v1/areas?id=eq.${row.area_id}&select=name,lat,lng`, { headers: H });
const [area] = await a.json();

const hav = (a1, o1, a2, o2) => {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (a2 - a1) * t, dLon = (o2 - o1) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const pts = (Array.isArray(row.gpx) ? row.gpx : []).map((p) => Array.isArray(p) ? { lat: p[0], lng: p[1] } : p);
const nearest = (lat, lng) => Math.min(...pts.map((p) => hav(lat, lng, p.lat, p.lng)));

// Is the track a copy of the waypoints? If every vertex is a waypoint, it is not a second opinion.
const wps = row.waypoints || [];
const isWp = (p) => wps.some((w) => w.lat != null && hav(p.lat, p.lng, w.lat, w.lng) < 25);
const copied = pts.length > 0 && pts.every(isWp);
console.log(`gpx points: ${pts.length}`);
console.log(`track is a copy of the waypoint list: ${copied}  ${copied ? "<-- NOT independent evidence" : "<-- independent, usable"}`);

const ext = pts.length ? Math.max(...pts.map((p) => Math.max(...pts.map((q) => hav(p.lat, p.lng, q.lat, q.lng))))) : 0;
console.log(`track extent: ${(ext / 1000).toFixed(1)} km  (a tiny stub would be a placeholder, not a track)`);
console.log(`track start -> peak: ${(hav(pts[0].lat, pts[0].lng, area.lat, area.lng) / 1000).toFixed(1)} km`);
console.log(`track end   -> peak: ${(hav(pts[pts.length - 1].lat, pts[pts.length - 1].lng, area.lat, area.lng) / 1000).toFixed(2)} km`);
console.log("");
console.log("waypoint                                           off-track    from peak");
for (const w of wps) {
  if (w.lat == null) { console.log(`  [${w.type}] ${w.name} — no position`); continue; }
  const off = nearest(w.lat, w.lng), pk = hav(w.lat, w.lng, area.lat, area.lng);
  const flag = off > 500 ? "  <-- NOT ON THIS ROUTE'S TRACK" : "";
  console.log(`  [${String(w.type).padEnd(9)}] ${String(w.name).slice(0, 34).padEnd(35)} ${(off / 1000).toFixed(2).padStart(7)} km ${(pk / 1000).toFixed(2).padStart(8)} km${flag}`);
}
