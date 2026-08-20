// wa_north_face_7 is a `trad` route on wa_anderson_hall — another University of Washington campus
// building, the same subtree that held the misfiled Vasiliki route. Same fingerprint, so read it
// before assuming it is the same defect: a UW building genuinely has climbable brickwork, and
// "North Face" on a building is a perfectly ordinary name for it.
//
// The Vasiliki row was decided on non-prose columns disagreeing with the area. Ask the same
// questions here rather than pattern-matching on the area's name.
import { selectAll } from "../lib/supabase-env.mjs";

const r = (await selectAll("routes", "id,name,area_id,discipline,grade,pitches,dist_km,gain_ft,approach,beta,overview,waypoints,road", "id=eq.wa_north_face_7", { pageSize: 5 }))[0];
if (!r) { console.error("FAIL — wa_north_face_7 returned no row"); process.exit(1); }

console.log(`${r.id}  [${r.discipline}]  name="${r.name}"  area=${r.area_id}`);
console.log(`grade=${r.grade}  pitches=${r.pitches}  dist_km=${r.dist_km}  gain_ft=${r.gain_ft}  waypoints=${(r.waypoints || []).length}`);
for (const f of ["overview", "approach", "beta"]) {
  const v = r[f];
  console.log(`\n--- ${f} ---\n${typeof v === "string" && v.trim() ? v.trim() : "(empty)"}`);
}

const sibs = await selectAll("routes", "id,name,discipline,grade", `area_id=eq.${r.area_id}`, { pageSize: 50 });
console.log(`\n--- everything on ${r.area_id} ---`);
for (const s of sibs) console.log(`  ${s.id.padEnd(30)} [${String(s.discipline).padEnd(10)}] grade=${String(s.grade).padEnd(8)} "${s.name}"`);

const a = (await selectAll("areas", "id,name,path,area_type", `id=eq.${r.area_id}`, { pageSize: 5 }))[0];
console.log(`\narea "${a.name}" (${a.area_type})\n  ${a.path}`);
