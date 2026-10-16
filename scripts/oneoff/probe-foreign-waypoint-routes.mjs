#!/usr/bin/env node
// The two routes carrying waypoints in another mountain range — read before repairing.
import { selectAll } from "../lib/supabase-env.mjs";

const ids = ["wa_true_grit", "wa_up_in_arms"];
const rows = await selectAll("routes",
  "id,name,grade,discipline,pitches,area_id,waypoints,approach_logistics,approach,overview,beta,hazards,descent_text,gear",
  `id=in.(${ids.join(",")})`, { pageSize: 20 });
if (rows.length !== ids.length) { console.error(`FAIL — expected ${ids.length}, got ${rows.length}`); process.exit(1); }
const areas = await selectAll("areas", "id,name,lat,lng,path,area_type",
  `id=in.(${[...new Set(rows.map((r) => r.area_id))].join(",")})`, { pageSize: 20 });
const byId = new Map(areas.map((a) => [a.id, a]));

for (const r of rows) {
  const a = byId.get(r.area_id) || {};
  console.log(`════ ${r.id}   "${r.name}"  [${r.discipline} ${r.grade}${r.pitches ? `, ${r.pitches}p` : ""}]`);
  console.log(`   area   ${a.name} (${a.area_type})  ${a.lat},${a.lng}`);
  console.log(`   path   ${a.path}`);
  console.log(`   waypoints (${(r.waypoints || []).length}):`);
  for (const w of r.waypoints || []) console.log(`      [${String(w.type || "?").padEnd(10)}] ${String(w.name || "").padEnd(44)} ${w.lat},${w.lng}  elev ${w.elev ?? "—"}`);
  for (const k of ["approach_logistics"]) if (r[k]) console.log(`   ${k}: ${JSON.stringify(r[k]).slice(0, 200)}`);
  for (const k of ["overview", "approach", "beta", "descent_text", "hazards"]) {
    const v = r[k];
    if (v == null) continue;
    const t = typeof v === "string" ? v : JSON.stringify(v);
    console.log(`   ${k.padEnd(13)} ${t.replace(/\s+/g, " ").slice(0, 170)}`);
  }
  console.log("");
}

// Which area does each stray waypoint actually belong to?
const KM = (p, q) => { const R = 6371, t = Math.PI / 180;
  const dla = (q.lat - p.lat) * t, dln = (q.lng - p.lng) * t;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dla / 2) ** 2 + Math.cos(p.lat * t) * Math.cos(q.lat * t) * Math.sin(dln / 2) ** 2)); };
const all = await selectAll("areas", "id,name,lat,lng", "lat=not.is.null", { pageSize: 1000 });
for (const r of rows) {
  for (const w of r.waypoints || []) {
    const p = { lat: Number(w.lat), lng: Number(w.lng) };
    if (!Number.isFinite(p.lat)) continue;
    let best = null;
    for (const a of all) { const km = KM(p, { lat: Number(a.lat), lng: Number(a.lng) }); if (!best || km < best.km) best = { a, km }; }
    console.log(`${r.id} · "${w.name}" sits ${best.km.toFixed(2)} km from ${best.a.id} (${best.a.name})`);
  }
}
