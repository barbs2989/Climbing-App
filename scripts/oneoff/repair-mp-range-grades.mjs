// repair-mp-range-grades.mjs — the ice/mixed/aid Mountain Project imports (#1882, #1956) read a RANGE
// like "WI3-4" as "WI3-": the token pattern tried the single "-" before "-\d". The full rating is
// still in `grade`, so each cut-off token is re-read from it and the number that came FROM the
// cut-off token is replaced. A stored minus grade that is not the start of a range in `grade`
// ("WI4-" on its own) is left alone.
//
//   node scripts/oneoff/repair-mp-range-grades.mjs           # dry run
//   node scripts/oneoff/repair-mp-range-grades.mjs --apply
import { patchRow, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const rows = await selectAll("routes", "id,grade,grade_system,grade_num,ice_grade,aid_grade,ice_grade_num,mixed_grade_num,aid_grade_num",
  "or=(ice_grade.like.*-,aid_grade.like.*-)", { key, pageSize: 1000 });
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const same = (a, b) => a != null && b != null && Math.abs(+a - +b) < 1e-9;
const plan = [];
for (const r of rows) {
  const p = {};
  for (const [col, numColOf] of [["ice_grade", t => /^M/.test(t) ? ["m", "mixed_grade_num"] : ["wi", "ice_grade_num"]], ["aid_grade", () => ["aid", "aid_grade_num"]]]) {
    const cut = r[col];
    if (!cut || !cut.endsWith("-")) continue;
    const m = String(r.grade || "").match(new RegExp("(?<![A-Za-z0-9])" + esc(cut) + "\\d+"));
    if (!m) continue;
    const [scale, numCol] = numColOf(cut);
    const oldN = gradeNumFrom(cut, scale), newN = gradeNumFrom(m[0], scale);
    if (newN == null) continue;
    p[col] = m[0];
    if (same(r[numCol], oldN)) p[numCol] = newN;
    if (r.grade_system === scale && same(r.grade_num, oldN)) p.grade_num = newN;
  }
  if (Object.keys(p).length) plan.push({ r, p });
}
console.log(`${rows.length} rows end a token in "-"; ${plan.length} are cut-off ranges to repair`);
for (const { r, p } of plan.slice(0, 10)) console.log(`  ${r.id}  ${JSON.stringify(r.grade)}  ${JSON.stringify(p)}`);
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }
let n = 0;
for (const { r, p } of plan) { await patchRow("routes", r.id, p); n++; }
console.log(`wrote and verified ${n} rows`);
