// The three routes `audit:road-coverage` files under RE-HOMING: their own prose names a road, so
// the fact is already in the catalog and a copy — not research — could fill the block. Two of them
// report ZERO sibling blocks on their own area, which is why the applier's same-area donor rule
// could not reach them. Read the rows before widening anything: a token match is a hypothesis
// about a row, not a reading of one.
import { selectAll } from "../lib/supabase-env.mjs";

const ids = ["wa_little_annapurna_south_face", "wa_south_face_direct", "wa_upper_castle_toprope_wall"];
const rows = await selectAll(
  "routes",
  "id,name,discipline,area_id,approach,beta,overview,dist_km,gain_ft,waypoints,road,approach_logistics",
  `id=in.(${ids.join(",")})`,
  { pageSize: 20 },
);
if (rows.length !== ids.length) { console.error(`FAIL — expected ${ids.length} rows, got ${rows.length}`); process.exit(1); }

for (const r of rows) {
  console.log(`\n${"=".repeat(92)}\n${r.id}  [${r.discipline}]  area=${r.area_id}  name="${r.name}"`);
  console.log(`dist_km=${r.dist_km}  gain_ft=${r.gain_ft}  waypoints=${(r.waypoints || []).length}  road=${r.road ? "SET" : "empty"}  logistics=${r.approach_logistics ? "SET" : "empty"}`);
  for (const f of ["approach", "beta", "overview"]) {
    if (typeof r[f] === "string" && r[f].trim()) console.log(`\n--- ${f} ---\n${r[f].trim()}`);
  }
}
