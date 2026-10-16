// READ the three candidates in full before writing anything to them.
//
// The two-source gate matched them on a road IDENTIFIER, which is a hypothesis about the row and
// not a reading of it. This repo's record on that is unambiguous: the aspect-vs-name audit's first
// reported repair was backwards, the Chimney Rock "Idaho route" finding recommended deleting a
// correct route, and both had passed a mechanical test. So print the prose and the candidate
// donor blocks side by side and decide by reading.
//
// One of the three is on LUNDIN PEAK, which CLAUDE.md names as "the clean example of the class" of
// peaks with two genuine trailheads — its two siblings offer I-90/Snoqualmie Pass and Alpental
// Road. Picking one of those would be exactly the "declare a winner the script has no basis to
// pick" failure. Expect to refuse it.
import { selectAll } from "../lib/supabase-env.mjs";

const IDS = [
  "wa_colchuck_balanced_rock_col_east_lake_side_approch",
  "wa_northwest_face",
  "wa_south_face_2001_variation",
];

const rows = await selectAll("routes",
  "id,name,discipline,area_id,road,approach,beta,overview,approach_logistics,waypoints",
  `id=in.(${IDS.join(",")})`, { pageSize: 100 });
if (rows.length !== IDS.length) { console.error(`expected ${IDS.length} rows, got ${rows.length} — ids are wrong, do not proceed`); process.exit(1); }

const areas = [...new Set(rows.map((r) => r.area_id))];
const sibs = await selectAll("routes", "id,name,area_id,road", `area_id=in.(${areas.join(",")})`, { pageSize: 1000 });

for (const r of rows) {
  console.log(`\n${"=".repeat(100)}`);
  console.log(`${r.id}   [${r.discipline}]   area=${r.area_id}`);
  console.log(`name: ${r.name}`);
  console.log(`${"-".repeat(100)}`);
  for (const f of ["approach", "beta", "overview"]) {
    if (typeof r[f] === "string" && r[f].trim()) {
      console.log(`\n--- ${f} ---\n${r[f].trim().slice(0, 1400)}`);
    }
  }
  console.log(`\n--- DONOR BLOCKS on ${r.area_id} ---`);
  const seen = new Set();
  for (const s of sibs.filter((s) => s.area_id === r.area_id && s.id !== r.id && (s.road || {}).name)) {
    const key = JSON.stringify(s.road);
    if (seen.has(key)) continue; seen.add(key);
    console.log(`\n  [${s.id}]`);
    for (const [k, v] of Object.entries(s.road)) if (typeof v === "string" && v.trim()) console.log(`     ${k}: ${v.slice(0, 300)}`);
  }
}
