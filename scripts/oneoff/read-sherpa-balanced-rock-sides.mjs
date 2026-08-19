// CLASS A misdirection candidate: wa_sherpa_balanced_rock_standard.
// The index says the approach is the Teanaway side and the waypoints are the Icicle side.
// Which half is wrong is NOT guessable from the disagreement -- the Little Annapurna case is
// on record where the reported repair was backwards and would have flipped a shady north slog
// sunny. So anchor on a THIRD record: the peak's own coordinate from `areas`, and measure each
// named trailhead against it. Read-only.
import { loadEnv } from "../lib/supabase-env.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const ID = "wa_sherpa_balanced_rock_standard";
const COLS = "id,name,area_id,aspect,approach,approach_logistics,waypoints,descent_text,climbing_route,gpx";
const r = await fetch(`${U}/rest/v1/routes?id=eq.${ID}&select=${COLS}`, { headers: H });
if (!r.ok) { console.error("read failed", r.status, (await r.text()).slice(0, 200)); process.exit(1); }
const [row] = await r.json();
if (!row) { console.error("no row"); process.exit(1); }

const a = await fetch(`${U}/rest/v1/areas?id=eq.${row.area_id}&select=id,name,lat,lng,path`, { headers: H });
const [area] = a.ok ? await a.json() : [];

const hav = (a1, o1, a2, o2) => {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (a2 - a1) * t, dLon = (o2 - o1) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

console.log(`${row.id}   ${row.name}`);
console.log(`area_id: ${row.area_id}`);
if (area) console.log(`PEAK (areas): ${area.name}  lat=${area.lat}  lng=${area.lng}`);
console.log(`aspect: ${row.aspect}`);
console.log("");
console.log("--- approach ---");
console.log(String(row.approach || "(none)").slice(0, 1200));
console.log("");
if (row.approach_logistics) {
  const al = row.approach_logistics;
  console.log("--- approach_logistics ---");
  console.log(`  trailhead: ${al.trailhead}`);
  console.log(`  lat/lng  : ${al.trailheadLat}, ${al.trailheadLng}`);
  if (area && al.trailheadLat != null) {
    console.log(`  -> ${(hav(al.trailheadLat, al.trailheadLng, area.lat, area.lng) / 1000).toFixed(1)} km from the peak`);
  }
  if (al.trailheadDirection) console.log(`  direction: ${String(al.trailheadDirection).slice(0, 300)}`);
  console.log("");
}
if (Array.isArray(row.waypoints)) {
  console.log(`--- waypoints (${row.waypoints.length}) ---`);
  for (const w of row.waypoints) {
    const d = (area && w.lat != null) ? ` · ${(hav(w.lat, w.lng, area.lat, area.lng) / 1000).toFixed(1)} km from peak` : "";
    console.log(`  [${w.type}] ${w.name}  (${w.lat}, ${w.lng})${d}`);
  }
  console.log("");
}
if (row.gpx) {
  const pts = Array.isArray(row.gpx) ? row.gpx : (row.gpx.points || row.gpx.pts || []);
  if (pts.length && area) {
    const first = pts[0], last = pts[pts.length - 1];
    const g = (p) => Array.isArray(p) ? { lat: p[1] ?? p[0], lng: p[0] ?? p[1] } : p;
    console.log(`--- gpx (${pts.length} pts) ---`);
    console.log(`  first: ${JSON.stringify(first)}`);
    console.log(`  last : ${JSON.stringify(last)}`);
  }
}
console.log("--- descent_text (head) ---");
console.log(String(row.descent_text || "(none)").slice(0, 600));
