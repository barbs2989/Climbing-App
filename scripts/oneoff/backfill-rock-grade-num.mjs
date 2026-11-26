#!/usr/bin/env node
// Fills the two numbers the Route finder's per-scale grade ranges (0550) read and the catalog left empty.
//
//   1. routes.rock_grade_num (new in 0550): the 5.x free grade of an ice, mixed, aid, alpine, mountaineering or
//      scrambling route whose headline grade is on another scale — "5.7 WI3 Easy Snow" (grade_system 'wi'), or an
//      aid route "C3" whose rock_grade says 5.8. Without it a "5.7-5.9" range cannot see those climbs.
//   2. routes.grade_num on Class-graded rows that have none: "Class 2", "Class 1", "Difficult Class 2" were stored
//      with grade_system 'class' and a NULL number (~280 rows, 2026-11-26 static snapshot), so every Class range
//      dropped them.
//
// Both numbers come from gradeNumFrom (lib/grade.js), the one parser — never a copy. Re-runnable: a row whose
// stored value already equals the parser's is skipped. Writes are paced by patchRow (>= 1 s each) and re-read to
// reconcile. A rollback file of every row it changes is written BEFORE the first write.
//
//   node scripts/oneoff/backfill-rock-grade-num.mjs          # dry run: counts + samples
//   node scripts/oneoff/backfill-rock-grade-num.mjs --apply
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const APPLY = process.argv.includes("--apply");
const DISCS = ["alpine", "mountaineering", "scrambling", "ice", "mixed", "aid"];
const key = requireServiceKey();
const rows = await selectAll("routes", "id,discipline,grade,grade_system,grade_num,rock_grade,rock_grade_num",
  `discipline=in.(${DISCS.join(",")})`, { key, pageSize: 1000 });
console.log(`read ${rows.length} rows`);

const same = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-9);
const plan = [];
for (const r of rows) {
  const patch = {};
  if (r.grade_system !== "yds") {
    const t = [r.grade, r.rock_grade].find((x) => typeof x === "string" && /5\.\d/.test(x));
    const rk = t ? gradeNumFrom(t, "yds") : null;
    if (rk != null && !same(rk, r.rock_grade_num)) patch.rock_grade_num = rk;
  }
  if (r.grade_system === "class" && r.grade_num == null && typeof r.grade === "string") {
    const n = gradeNumFrom(r.grade, "class");
    if (n != null) patch.grade_num = n;
  }
  if (Object.keys(patch).length) plan.push({ id: r.id, before: { rock_grade_num: r.rock_grade_num, grade_num: r.grade_num }, patch, grade: r.grade, rock_grade: r.rock_grade, discipline: r.discipline });
}
const nRock = plan.filter((p) => "rock_grade_num" in p.patch).length, nClass = plan.filter((p) => "grade_num" in p.patch).length;
console.log(`plan: ${plan.length} rows (rock_grade_num ${nRock}, class grade_num ${nClass})`);
for (const p of plan.slice(0, 15)) console.log("  ", p.id, p.discipline, JSON.stringify(p.grade), JSON.stringify(p.rock_grade), "->", JSON.stringify(p.patch));
if (!APPLY) { console.log("dry run; --apply to write"); process.exit(0); }

const rb = `scripts/rollback-rock-grade-num-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify(plan.map((p) => ({ id: p.id, restore: p.before })), null, 1));
console.log(`rollback: ${rb}`);
let done = 0;
for (const p of plan) {
  const got = await patchRow("routes", p.id, p.patch);
  for (const k of Object.keys(p.patch)) if (!same(got[k], p.patch[k])) throw new Error(`${p.id}: ${k} reads back ${got[k]}, wrote ${p.patch[k]}`);
  if (++done % 25 === 0) console.log(`  ${done}/${plan.length}`);
}
// Reconcile: re-read and re-plan; nothing should be left.
const again = await selectAll("routes", "id,grade,grade_system,grade_num,rock_grade,rock_grade_num", `id=in.(${plan.map((p) => `"${p.id}"`).join(",")})`.length < 6000
  ? `id=in.(${plan.map((p) => `"${p.id}"`).join(",")})` : `discipline=in.(${DISCS.join(",")})`, { key, pageSize: 1000 });
const byId = new Map(again.map((r) => [r.id, r]));
let bad = 0;
for (const p of plan) { const r = byId.get(p.id); for (const k of Object.keys(p.patch)) if (!r || !same(r[k], p.patch[k])) { bad++; console.log("  NOT LANDED", p.id, k); } }
console.log(`wrote ${done}; reconcile: ${bad ? bad + " not landed" : "all landed"}`);
process.exit(bad ? 1 : 0);
