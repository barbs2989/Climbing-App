// Write one context file per route under research: the route's pins (from the snapshot), its
// stored distance and gain, its area row, and the ground (3DEP) under every placed pin.
//   node scripts/oneoff/wa-waypoint-audit/context.mjs SNAPSHOT.json OUTDIR id1 id2 ...
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";
const [, , SNAP, OUTDIR, ...ids] = process.argv;
const key = requireServiceKey();
const rows = Object.fromEntries(JSON.parse(fs.readFileSync(SNAP, "utf8")).map(r => [r.id, r]));
fs.mkdirSync(OUTDIR, { recursive: true });
for (const id of ids) {
  const r = rows[id]; if (!r) { console.log("not in snapshot", id); continue; }
  const area = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${r.area_id}&select=id,name,lat,lng,elevation_ft,parent_id`, { headers: headers(key) })).json())[0];
  const pins = [];
  for (const [i, w] of (r.waypoints || []).entries()) {
    const placed = w.lat != null && w.lng != null;
    pins.push({ i, ...w, ground_ft: placed ? Math.round(await elevationAt(+w.lat, +w.lng)) : null });
  }
  const areaGround = area && area.lat != null ? Math.round(await elevationAt(+area.lat, +area.lng)) : null;
  fs.writeFileSync(`${OUTDIR}/${id}.json`, JSON.stringify({ id, name: r.name, discipline: r.discipline, area: { ...area, ground_ft: areaGround }, dist_km: r.dist_km, gain_ft: r.gain_ft, high_point_ft: r.high_point_ft, approach_logistics: r.approach_logistics, pins }, null, 1));
  console.log("wrote", id);
  await new Promise(s => setTimeout(s, 500));
}
