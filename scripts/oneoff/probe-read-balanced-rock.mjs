// Read wa_the_balanced_rock in full before deciding whether the trailhead-name gate should apply
// to it. A token match is a hypothesis about a row, not a reading of one.
import { selectAll } from "../lib/supabase-env.mjs";
const rows = await selectAll("routes", "id,name,discipline,area_id,approach,beta,overview,dist_km,gain_ft,waypoints,road,approach_logistics", "id=eq.wa_the_balanced_rock", { pageSize: 10 });
if (rows.length !== 1) { console.error(`expected 1 row, got ${rows.length}`); process.exit(1); }
const r = rows[0];
console.log(`${r.id} [${r.discipline}] area=${r.area_id}  name="${r.name}"`);
console.log(`dist_km=${r.dist_km}  gain_ft=${r.gain_ft}  waypoints=${(r.waypoints || []).length}  road=${r.road ? "SET" : "empty"}  logistics=${r.approach_logistics ? "SET" : "empty"}`);
for (const f of ["approach", "beta", "overview"]) if (typeof r[f] === "string" && r[f].trim()) console.log(`\n--- ${f} ---\n${r[f].trim()}`);
