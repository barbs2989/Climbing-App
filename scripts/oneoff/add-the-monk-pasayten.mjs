// The Monk is its own summit: a detached granite tower leaning on Cathedral Peak's east/south flank in the
// Pasayten, split from it by a deep gully, with its own climbs and its own rappel descent (owner-question
// research 2026-11-04, cathedral_peak_pasayten.json). Its five climbs were filed under Cathedral Peak.
// This adds a sibling peak area under the same parent and MOVES those five rows to it (area_id only; no
// delete). catalog_find_area('The Monk', 'Washington', 48.9903, -120.1888) returned nothing. The coordinate is
// an area-level point, so coords_approx = true; elevation stays blank (two sources disagree).
//   node scripts/oneoff/add-the-monk-pasayten.mjs [--write]
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
const WRITE = process.argv.includes("--write");
const k = requireServiceKey();
const AREA = { id: "wa_the_monk_pasayten", name: "The Monk", parent_id: "wa_pasayten", area_type: "peak", region: "Pasayten/Okanogan",
  lat: 48.9903, lng: -120.1888, coords_approx: true,
  blurb: "The Monk is a detached granite tower that leans against the east and south flank of Cathedral Peak in the far northern Pasayten, cut off from the main peak by a deep gully. It carries a handful of short, steep crack and face climbs on the same clean rock as Cathedral, and parties come down by rappel into the northeast gully." };
const MOVE = ["wa_the_monk_le_gibet", "wa_the_monk_odine", "wa_the_monk_scabo", "wa_the_monk_west_cracks_left_crack", "wa_the_monk_west_cracks_right_crack"];
const rows = await selectAll("routes", "id,area_id,name", `id=in.(${MOVE.join(",")})`, { key: k, pageSize: 10 });
if (rows.length !== MOVE.length || rows.some(r => r.area_id !== "wa_cathedral_peak_pasayten" && r.area_id !== AREA.id)) { console.log("FAIL: rows not where the research read them", rows); process.exit(1); }
const exists = (await selectAll("areas", "id", `id=eq.${AREA.id}`, { key: k, pageSize: 2 })).length;
console.log(`area ${AREA.id}: ${exists ? "exists" : "to insert"}; moving ${rows.filter(r => r.area_id !== AREA.id).length} routes`);
if (!WRITE) process.exit(0);
fs.writeFileSync(`scripts/rollback-the-monk-${Date.now()}.json`, JSON.stringify({ note: "set area_id back to wa_cathedral_peak_pasayten, then delete area wa_the_monk_pasayten", rows }, null, 1));
if (!exists) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas`, { method: "POST", headers: headers(k, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify([AREA]) });
  if (!r.ok) { console.log("area insert failed", r.status, (await r.text()).slice(0, 300)); process.exit(1); }
}
for (const r of rows) if (r.area_id !== AREA.id) { await patchRow("routes", r.id, { area_id: AREA.id }); await new Promise(s => setTimeout(s, 800)); }
const back = await selectAll("routes", "id,area_id", `id=in.(${MOVE.join(",")})`, { key: k, pageSize: 10 });
const counts = await selectAll("areas", "id,route_count", `id=in.(${AREA.id},wa_cathedral_peak_pasayten)`, { key: k, pageSize: 5 });
console.log(`moved ${back.filter(r => r.area_id === AREA.id).length}/${MOVE.length}; ${counts.map(c => `${c.id}=${c.route_count}`).join(", ")}`);
