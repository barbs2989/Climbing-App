// The 12 routes whose Trailhead PIN and whose approach_logistics blob name different
// places. For each, everything needed to decide WHICH RECORD IS WRONG without guessing:
// the route's own approach prose (the primary evidence), the waypoint chain with its
// distMi ordering, and both candidates' distance to the peak's own coordinate on `areas`
// (the third, independent record — the trackOffItsPeak trick).
//
// Read-only. Deciding from the names alone is what produced a BACKWARDS repair the last
// time this class was worked (see the little_annapurna note in CLAUDE.md).
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const IDS = [
  "rainier_central_mowich_face",
  "wa_chikamin_peak_southeast_slopes",
  "wa_classic_route_3",
  "wa_liberty_bell_independence_route",
  "wa_lundin_peak_west_ridge",
  "wa_mount_carru_scramble",
  "wa_mount_howard_south_slope",
  "wa_phantom_peak_south_route",
  "wa_remmel_mountain_nw_ridge",
  "wa_ridge_traverse_from_east_fury",
  "wa_south_face_5",
  "wa_the_direct_north_ridge_w_gendarme",
];

const k = anonKey();
function haversineKm(p, q) {
  const R = 6371, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(q.lat - p.lat), dLng = toR(q.lng - p.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(p.lat)) * Math.cos(toR(q.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const isTh = (w) => /trailhead/i.test(String((w && w.type) || ""));

const routes = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,approach,approach_logistics,waypoints,dist_km,gain_ft&id=in.(${IDS.join(",")})`, { headers: headers(k) })).json();
const areaIds = [...new Set(routes.map((r) => r.area_id))];
const areas = await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&id=in.(${areaIds.join(",")})`, { headers: headers(k) })).json();
const areaById = Object.fromEntries(areas.map((a) => [a.id, a]));

for (const id of IDS) {
  const r = routes.find((x) => x.id === id);
  if (!r) { console.log(`\n########## ${id} — NOT FOUND`); continue; }
  const a = areaById[r.area_id] || {};
  const peak = (a.lat != null) ? { lat: +a.lat, lng: +a.lng } : null;
  const d = (la, ln) => (peak && la != null) ? haversineKm(peak, { lat: +la, lng: +ln }).toFixed(1) + " km from peak" : "—";
  const al = r.approach_logistics || {};
  const pin = (r.waypoints || []).find(isTh);

  console.log(`\n########## ${r.id} — ${r.name}`);
  console.log(`  peak ${a.name} @ ${a.lat},${a.lng}   dist_km=${r.dist_km} gain_ft=${r.gain_ft}`);
  console.log(`  PIN  "${pin && pin.name}"  @ ${pin && pin.lat},${pin && pin.lng}  — ${pin ? d(pin.lat, pin.lng) : "—"}  distMi=${pin && pin.distMi}`);
  console.log(`  BLOB "${al.trailhead}"  @ ${al.trailheadLat},${al.trailheadLng}  — ${d(al.trailheadLat, al.trailheadLng)}`);
  console.log(`  chain: ${(r.waypoints || []).map((w) => `${w.type}:${w.name}${w.distMi != null ? `@${w.distMi}mi` : ""}`).join("  ->  ")}`);
  console.log(`  approach: ${String(r.approach || "(none)").slice(0, 1000)}`);
}
