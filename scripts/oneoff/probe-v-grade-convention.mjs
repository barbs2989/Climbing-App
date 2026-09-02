// Is wa_shock_and_awe's grade_num=10 for "V3" an outlier, or the catalog's convention?
// The deciding question is what OTHER V-graded rows store: the V number, or a YDS-equivalent.
// Comparing a suspect against the population that PASSES is the step this repo records as the
// one that stops a "fix" being applied to correct data.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,grade,grade_system,grade_num,discipline",
  "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

const V = /^\s*V(\d+)/i;
let matchesV = 0, differs = 0, nulls = 0;
const odd = [];
for (const r of rows) {
  const m = r.grade && String(r.grade).match(V);
  if (!m) continue;
  const n = parseInt(m[1]);
  if (r.grade_num == null) { nulls++; continue; }
  if (Number(r.grade_num) === n) matchesV++;
  else { differs++; odd.push(r); }
}
console.log(`V-graded rows: ${matchesV + differs + nulls}`);
console.log(`  grade_num == the V number : ${matchesV}`);
console.log(`  grade_num differs         : ${differs}`);
console.log(`  grade_num null            : ${nulls}\n`);
for (const r of odd.slice(0, 12)) {
  console.log(`  ${r.id.padEnd(44)} ${JSON.stringify(String(r.grade).slice(0, 20)).padEnd(24)} sys=${(r.grade_system || "-").padEnd(5)} stored=${r.grade_num}`);
}
