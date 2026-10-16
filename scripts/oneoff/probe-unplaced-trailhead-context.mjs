// Before writing a coordinate onto an unplaced trailhead pin, read what the route itself
// says about where it starts. A researched coordinate that contradicts the row's own
// approach prose is the pin-vs-prose deadlock CLAUDE.md records, and the fix for that is
// NOT to write the pin.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const k = anonKey();
const ids = ["wa_emerald_peak_west_route", "wa_vesper_peak_north_face_ragged_edge", "wa_west_face_2", "wa_mount_adams_mazama_glacier_headwall"];
for (const id of ids) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,approach,approach_logistics,waypoints,dist_km,gain_ft&id=eq.${id}`, { headers: headers(k) })).json())[0];
  if (!r) { console.log(`\n### ${id}: NOT FOUND`); continue; }
  const a = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&id=eq.${r.area_id}`, { headers: headers(k) })).json())[0];
  console.log(`\n########## ${r.id} — ${r.name}`);
  console.log(`area: ${a && a.name} @ ${a && a.lat}, ${a && a.lng}   dist_km=${r.dist_km} gain_ft=${r.gain_ft}`);
  console.log(`waypoints:`);
  for (const w of r.waypoints || []) console.log(`   [${w.type}] ${w.name} — ${w.lat},${w.lng}  distMi=${w.distMi ?? "—"} elev=${w.elev ?? "—"}`);
  const al = r.approach_logistics || {};
  console.log(`approach_logistics.trailhead: ${al.trailhead}  @ ${al.trailheadLat},${al.trailheadLng}`);
  console.log(`approach: ${String(r.approach || "").slice(0, 900)}`);
}
