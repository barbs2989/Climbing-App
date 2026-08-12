// Does lib/grade.js's gradeNumFor() reproduce the catalog's own grade_num?
//
// The parser was lifted from scripts/pipeline/load-state.mjs, and a lifted copy is exactly
// the thing that silently drifts — there are already FOUR copies of it in this repo. So this
// does not diff the source; it replays the new function against every populated
// (grade, discipline, grade_num) triple the live catalog holds and reports disagreements.
// If community-approved routes are to sort among catalog routes, they have to be measured on
// the catalog's scale, and this is the only way to know they are.
//
// Read-only. Service key: the anon role's 3s statement_timeout kills the scoped join (57014).
import { SUPABASE_URL, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
import { gradeNumFor, gradeSystemForDiscipline } from "../../lib/grade.js";

const rows = await selectAll(
  "routes",
  "id,name,grade,discipline,grade_num,areas!inner(path)",
  "areas.path=cd.usa.washington&grade=not.is.null&grade_num=not.is.null",
  // pageSize 300, not 1000: the statement timeout is PER STATEMENT, so a smaller page is a
  // shorter query. At 1000 this join started returning 57014 intermittently once other
  // sessions were hitting the same database — it is contention, not a broken query, and the
  // fix is to ask for less at a time rather than to retry the same too-large page.
  { pageSize: 300, key: requireServiceKey() },
);
// Fail closed: an empty read makes perfect agreement the trivial answer.
if (!rows.length) { console.error("read 0 rows — refusing to report parity about nothing"); process.exit(1); }
console.log(`comparing against ${rows.length} live rows that already carry both grade and grade_num\n`);

const bad = [];
const bySystem = {};
for (const r of rows) {
  const sys = gradeSystemForDiscipline(r.discipline) || "(none)";
  bySystem[sys] = bySystem[sys] || { n: 0, mismatch: 0 };
  bySystem[sys].n++;
  const mine = gradeNumFor(r.grade, r.discipline);
  // Compare numerically with a tolerance: grade_num is numeric, and the letter grades produce
  // quarters (.25/.5/.75) that round-trip through the column as strings.
  const theirs = r.grade_num == null ? null : Number(r.grade_num);
  const agree = mine == null && theirs == null ? true
    : mine == null || theirs == null ? false
    : Math.abs(mine - theirs) < 1e-6;
  if (!agree) { bySystem[sys].mismatch++; bad.push({ ...r, mine, theirs }); }
}

for (const [sys, s] of Object.entries(bySystem).sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${sys.padEnd(8)} ${String(s.n).padStart(5)} rows   ${s.mismatch} disagree`);
}
console.log(`\n${rows.length - bad.length}/${rows.length} agree (${(((rows.length - bad.length) / rows.length) * 100).toFixed(2)}%)`);

if (bad.length) {
  console.log("\nfirst disagreements:");
  for (const b of bad.slice(0, 15)) {
    console.log(`  ${b.id}\n     grade=${JSON.stringify(b.grade)} disc=${b.discipline} → mine=${b.mine} stored=${b.theirs}`);
  }
}
process.exit(bad.length ? 1 : 0);
