// The one route in WA whose map paints two trailhead pins. Which of the two is this
// route's start? Read the row's own third record — the peak coordinate on `areas` — the
// way audit:waypoints' trackOffItsPeak does, rather than guessing from the names.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const k = anonKey();
const id = process.argv[2] || "wa_mount_ballard_south";
const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${id}`, { headers: headers(k) })).json())[0];
if (!r) throw new Error("no such route " + id);
const a = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&id=eq.${r.area_id}`, { headers: headers(k) })).json())[0];

function haversineKm(p, q) {
  const R = 6371, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(q.lat - p.lat), dLng = toR(q.lng - p.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(p.lat)) * Math.cos(toR(q.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

console.log(`route ${r.id} — ${r.name}`);
console.log(`area  ${a.id} — ${a.name}  @ ${a.lat}, ${a.lng}`);
const peak = { lat: Number(a.lat), lng: Number(a.lng) };
const al = r.approach_logistics || {};
if (al.peakLat != null) console.log(`approach_logistics.peak: ${al.peakLat}, ${al.peakLng}  (${haversineKm(peak, { lat: +al.peakLat, lng: +al.peakLng }).toFixed(2)} km from areas coord)`);

console.log(`\nwaypoints:`);
for (const w of r.waypoints || []) {
  const d = w.lat != null ? haversineKm(peak, { lat: +w.lat, lng: +w.lng }).toFixed(2) + " km from peak" : "NO COORD";
  console.log(`  [${w.type}] ${w.name}  ${w.lat},${w.lng}  — ${d}   distMi=${w.distMi ?? "—"}  elev=${w.elev ?? "—"}`);
}
console.log(`\napproach_logistics.trailhead: ${al.trailhead}`);
if (al.trailheadLat != null) console.log(`  @ ${al.trailheadLat}, ${al.trailheadLng} — ${haversineKm(peak, { lat: +al.trailheadLat, lng: +al.trailheadLng }).toFixed(2)} km from peak`);
console.log(`  direction: ${al.trailheadDirection}`);
console.log(`\ndist_km=${r.dist_km}  gain_ft=${r.gain_ft}  high_point_ft=${r.high_point_ft}`);
console.log(`\napproach:\n  ${String(r.approach || "").slice(0, 1500)}`);
console.log(`\nroad: ${JSON.stringify(r.road)}`);
console.log(`\ngpx pts: ${Array.isArray(r.gpx) ? r.gpx.length : (r.gpx ? "non-array" : "none")}`);
if (Array.isArray(r.gpx) && r.gpx.length) {
  const f = r.gpx[0], l = r.gpx[r.gpx.length - 1];
  const pt = (p) => Array.isArray(p) ? { lat: +p[0], lng: +p[1] } : { lat: +p.lat, lng: +p.lng };
  console.log(`  first ${JSON.stringify(f)} — ${haversineKm(peak, pt(f)).toFixed(2)} km from peak`);
  console.log(`  last  ${JSON.stringify(l)} — ${haversineKm(peak, pt(l)).toFixed(2)} km from peak`);
}
