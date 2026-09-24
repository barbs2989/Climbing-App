#!/usr/bin/env node
/* What is a "VB" boulder problem worth on the `grade_num` scale, and what would a value below
 * zero touch?
 *
 * WHY THIS IS A MEASUREMENT AND NOT A PATCH. `grade_num` is the sortable grade. V-Beginner is a
 * real Hueco grade BELOW V0 — and `gradeNumFrom` already maps `V0` to 0, so the honest slot for
 * VB is negative. Whether this column may hold a value under zero is a question about the
 * COLUMN'S CONSUMERS, not about the grade scale, so it is answered by reading them and by
 * measuring what the column already holds rather than by arguing from first principles.
 *
 * THE CONSUMERS, read 2026-09-23 and stated with file:line so the claim can be rechecked:
 *   - supabase/migrations/0018,0019 — `order by grade_num asc/desc nulls last`, and
 *     `grade_num >= min_grade` / `<= max_grade`, all `numeric default null`. A negative sorts
 *     correctly and is only excluded by a floor it is genuinely below.
 *   - lib/db.js:662,675 — the only callers, passing `minGrade ?? null`.
 *   - lib/DbAreaBrowser.jsx:756 — the one live `queryArgs`, which passes NO minGrade/maxGrade.
 *     THE RANGE FILTER IS UNWIRED TODAY, so the live consequence of a null is the SORT alone.
 *   - lib/offline.js:435-436,463-464 — the offline twin: `numOrNull` then `cmpNullsLast`.
 *   - ClimbMatchCore.jsx:1284 `techHrs(pitches,len,gradeNum)` is NOT a consumer of this column.
 *     Its callers pass `gn(route.grade)` (ClimbMatchCore.jsx:4792, RouteDetail.jsx:1603-1604),
 *     a separate parser over the grade STRING. The parameter merely shares the name, and reading
 *     it as a consumer would put a safety-adjacent time estimate in frame that is not in frame.
 *
 * Read-only. Anon key. Fails closed on an empty read and on a read that carries no grades.
 */
import { anonKey, selectAll } from "../lib/supabase-env.mjs";
import { gradeNumFrom, gradeNumFor } from "../../lib/grade.js";

const key = anonKey();
const LEADS_VB = /^\s*vb\b/i;
const TOKEN_VB = /\bvb\b/i;

const rows = await selectAll(
  "routes",
  "id,name,grade,discipline,grade_num,rock_grade,ice_grade,alpine_grade,aid_grade,commitment,area_id",
  "",
  { key, pageSize: 1000 }
);
if (!rows.length) { console.error("FAIL — read 0 routes. Nothing was measured."); process.exit(1); }

let withGrade = 0, scored = 0, min = null, max = null, neg = 0, zero = 0, sub1 = 0;
const hits = [];
const byDisc = new Map();
const otherCol = [];
for (const r of rows) {
  const g = typeof r.grade === "string" ? r.grade.trim() : "";
  if (g) withGrade++;
  const n = r.grade_num;
  if (typeof n === "number" && Number.isFinite(n)) {
    scored++;
    if (min == null || n < min) min = n;
    if (max == null || n > max) max = n;
    if (n < 0) neg++;
    if (n === 0) zero++;
    if (n > 0 && n < 1) sub1++;
  }
  if (LEADS_VB.test(g)) hits.push(r);
  if (TOKEN_VB.test(g)) byDisc.set(r.discipline, (byDisc.get(r.discipline) || 0) + 1);
  for (const c of ["rock_grade", "ice_grade", "alpine_grade", "aid_grade", "commitment"]) {
    if (typeof r[c] === "string" && TOKEN_VB.test(r[c])) otherCol.push([r.id, c, r[c]]);
  }
}
if (!withGrade) { console.error("FAIL — not one route carries a grade. The read is wrong."); process.exit(1); }

console.log("=== VB / Vb on the grade_num scale ===\n");
console.log(`  ${rows.length} routes read, ${withGrade} carry a grade, ${scored} carry a grade_num.\n`);

console.log("  --- WHAT THE COLUMN ALREADY HOLDS AT THE LOW END");
console.log(`      min ${min}   max ${max}`);
console.log(`      below zero      ${neg}`);
console.log(`      exactly zero    ${zero}   (V0 is a real grade, and 0 is FALSY)`);
console.log(`      between 0 and 1 ${sub1}`);
console.log(`      gradeNumFrom("V0","v") -> ${gradeNumFrom("V0", "v")}`);
console.log(`      gradeNumFrom("V1","v") -> ${gradeNumFrom("V1", "v")}`);
console.log(`      gradeNumFrom("VB","v") -> ${gradeNumFrom("VB", "v")}   <- the gap\n`);

console.log(`  --- THE ROWS: ${hits.length}`);
for (const r of hits) {
  console.log(`      ${r.id}`);
  console.log(`        name       ${r.name}`);
  console.log(`        grade      ${JSON.stringify(r.grade)}   discipline ${r.discipline}`);
  console.log(`        grade_num  ${r.grade_num == null ? "NULL" : r.grade_num}   (parser today: ${gradeNumFor(r.grade, r.discipline)})`);
  console.log(`        rock_grade ${JSON.stringify(r.rock_grade)}   area_id ${r.area_id}`);
}
if (!hits.length) console.log("      none — the class is empty and there is nothing to decide.");

/* A row whose OWN second grade record disagrees is not a candidate for a parser fill: the same
   discipline every other grade_num repair in this repo is held to. */
const contradicted = hits.filter(r => {
  const rg = typeof r.rock_grade === "string" ? r.rock_grade.trim() : "";
  return rg && !TOKEN_VB.test(rg);
});
console.log(`\n  --- CORROBORATION: ${hits.length - contradicted.length} of ${hits.length} carry no second grade record that disagrees.`);
for (const r of contradicted) console.log(`      DISAGREES  ${r.id}  grade=${JSON.stringify(r.grade)} rock_grade=${JSON.stringify(r.rock_grade)}`);

/* COLLISION RISK. A new branch is only safe if the token it matches cannot appear in a grade
   string meaning something else. Scoping it to the V system (bouldering) is strictly safer than
   a system-agnostic fallback, and this says what that scoping COSTS — which is the number that
   decides whether the safer option is also the complete one. */
console.log(`\n  --- "VB" AS A TOKEN ANYWHERE IN \`grade\`, by discipline`);
for (const [d, n] of [...byDisc].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(4)}  ${d}`);
const nonBoulder = [...byDisc].filter(([d]) => d !== "bouldering").reduce((s, [, n]) => s + n, 0);
console.log(`      in the other four grade columns + commitment: ${otherCol.length}`);
for (const [id, c, v] of otherCol) console.log(`         ${id}  ${c}=${JSON.stringify(v)}`);
console.log(`\n      Scoping the new branch to the V system costs ${nonBoulder} row(s).`);
