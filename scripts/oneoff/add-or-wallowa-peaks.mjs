// Two Wallowa summits had no peak area (Oregon owner-question research 2026-11-05, owner-qs/matterhorn-wallowas.json
// and krag-peak.json; owner: "if you find peaks or routes that we don't have, add them").
//  - Matterhorn: its two West Face rock climbs were filed on the crag area "Ice Lake Peaks". This adds the peak
//    under Wallowa Mountains and MOVES those two rows to it (area_id only; no delete). Razzberry and Exegesis stay.
//  - Krag Peak: no area at all. Its "Krag Peak Traverse" STAYS on Wallowa Mountains Traverses (the area exists for
//    lines that cross more than one summit); the new peak takes the standard ridge route (insert-owner-qs-routes).
// catalog_find_area('Matterhorn','Oregon',...) named only or_matterhorn in the Callahans, 548 km away (a different
// place); catalog_find_area('Krag Peak','Oregon',...) returned nothing. Coordinates and heights are Peakbagger's
// lidar summits (pid 3160 and 3192), so coords_approx = false.
//   node scripts/oneoff/add-or-wallowa-peaks.mjs [--write]
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
const WRITE = process.argv.includes("--write");
const k = requireServiceKey();
const AREAS = [
  { id: "or_matterhorn_wallowas", name: "Matterhorn", parent_id: "or_wallowa_mountains", area_type: "peak", region: "Oregon",
    lat: 45.22781, lng: -117.29932, elevation_ft: 9834, coords_approx: false,
    blurb: "The Wallowas' white marble summit, the second highest in the range, rising above Ice Lake. Most parties walk up its east side from an Ice Lake camp; steep rock climbs face west." },
  { id: "or_krag_peak", name: "Krag Peak", parent_id: "or_wallowa_mountains", area_type: "peak", region: "Oregon",
    lat: 45.06523, lng: -117.28951, elevation_ft: 9092, coords_approx: false,
    blurb: "A double-topped summit in the southern Wallowas above Crater Lake, reached by a loose scramble from the lake basin." },
];
const MOVE = { or_matterhorn_wallowas: { from: "or_ice_lake_peaks", ids: ["or_matterhorn_west_face_chimney", "or_matterhorn_west_face_wall"] } };
const ids = Object.values(MOVE).flatMap(m => m.ids);
const rows = await selectAll("routes", "id,area_id,name", `id=in.(${ids.join(",")})`, { key: k, pageSize: 10 });
for (const [to, m] of Object.entries(MOVE)) for (const id of m.ids) { const r = rows.find(x => x.id === id); if (!r || (r.area_id !== m.from && r.area_id !== to)) { console.log("FAIL: row not where the research read it", id, r); process.exit(1); } }
const have = new Set((await selectAll("areas", "id", `id=in.(${AREAS.map(a => a.id).join(",")})`, { key: k, pageSize: 5 })).map(a => a.id));
for (const a of AREAS) console.log(`area ${a.id}: ${have.has(a.id) ? "exists" : "to insert"}`);
console.log(`moving ${rows.filter(r => !Object.keys(MOVE).includes(r.area_id)).length} routes`);
if (!WRITE) process.exit(0);
fs.writeFileSync(`scripts/rollback-or-wallowa-peaks-${Date.now()}.json`, JSON.stringify({ note: "set each row's area_id back to its `area_id` here, then delete areas or_matterhorn_wallowas and or_krag_peak (if they hold nothing else)", rows }, null, 1));
for (const a of AREAS) {
  if (have.has(a.id)) continue;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas`, { method: "POST", headers: headers(k, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify([a]) });
  if (!r.ok) { console.log(`area ${a.id} insert failed`, r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  console.log(`inserted ${a.id}`);
  await new Promise(s => setTimeout(s, 800));
}
for (const [to, m] of Object.entries(MOVE)) for (const id of m.ids) { const r = rows.find(x => x.id === id); if (r.area_id !== to) { await patchRow("routes", id, { area_id: to }); await new Promise(s => setTimeout(s, 800)); } }
const back = await selectAll("routes", "id,area_id", `id=in.(${ids.join(",")})`, { key: k, pageSize: 10 });
const counts = await selectAll("areas", "id,route_count,path", `id=in.(${[...AREAS.map(a => a.id), "or_ice_lake_peaks"].join(",")})`, { key: k, pageSize: 5 });
console.log(`moved ${back.filter(r => r.area_id === "or_matterhorn_wallowas").length}/${ids.length}; ${counts.map(c => `${c.id}=${c.route_count} (${c.path})`).join(", ")}`);
