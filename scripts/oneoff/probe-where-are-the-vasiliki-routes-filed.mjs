// wa_south_face_direct's prose is Vasiliki Tower (Wine Spires, Washington Pass) and its area is
// wa_art_building, whose ltree path runs through the University of Washington campus. #1161 wrote a
// road block onto wa_northwest_face from donor wa_south_face, and the applier asserted only that
// donor and target share an area_id — which is satisfied just as well by two routes misfiled
// TOGETHER. So: where do all the Vasiliki-prose routes actually sit, and did that write land on a
// row whose area is wrong?
//
// The write itself is defensible either way — a road block copied from a sibling that shares the
// route's own named trailhead is right about the drive regardless of which area row the pair are
// filed under. But a misfiled area is its own defect, and finding one while checking another is
// exactly when it gets missed.
import { selectAll } from "../lib/supabase-env.mjs";

const ids = ["wa_south_face_direct", "wa_northwest_face", "wa_south_face", "wa_south_face_2001_variation", "wa_lundin_peak_south_face_left"];
const rows = await selectAll("routes", "id,name,area_id,discipline,road,approach,overview", `id=in.(${ids.join(",")})`, { pageSize: 20 });
if (!rows.length) { console.error("FAIL — read zero routes."); process.exit(1); }

const aids = [...new Set(rows.map((r) => r.area_id))];
const areas = await selectAll("areas", "id,name,path,area_type,route_count", `id=in.(${aids.join(",")})`, { pageSize: 50 });
const areaBy = Object.fromEntries(areas.map((a) => [a.id, a]));

for (const r of rows) {
  const a = areaBy[r.area_id];
  console.log(`\n${"=".repeat(92)}\n${r.id}  [${r.discipline}]  name="${r.name}"`);
  console.log(`   area  ${r.area_id}  "${a ? a.name : "?"}"  type=${a ? a.area_type : "?"}  routes=${a ? a.route_count : "?"}`);
  console.log(`   path  ${a ? a.path : "?"}`);
  console.log(`   road  ${r.road ? (r.road.name || JSON.stringify(r.road).slice(0, 120)) : "(empty)"}`);
  if (typeof r.overview === "string" && r.overview.trim()) console.log(`   overview: ${r.overview.trim().slice(0, 220)}`);
  if (typeof r.approach === "string" && r.approach.trim()) console.log(`   approach: ${r.approach.trim().slice(0, 260)}`);
}

/* What else lives on each of those areas? A single misfiled route is one story; a whole formation
   filed under the wrong parent is a different one, and they need opposite repairs. */
for (const aid of aids) {
  const sib = await selectAll("routes", "id,name,discipline", `area_id=eq.${aid}`, { pageSize: 200 });
  const a = areaBy[aid];
  console.log(`\n--- ${aid} "${a ? a.name : "?"}" holds ${sib.length} route(s) ---`);
  for (const s of sib.slice(0, 25)) console.log(`   ${s.id}  [${s.discipline}]  "${s.name}"`);
  if (sib.length > 25) console.log(`   ... ${sib.length - 25} more`);
}
