#!/usr/bin/env node
/* The mirror of "grades the parser cannot read": rows the parser reads PERFECTLY WELL that store
 * a NULL `grade_num` anyway.
 *
 * SAME CONSEQUENCE, DIFFERENT CAUSE. A null sorts behind the whole catalog under `grade_asc` and
 * `grade_desc` alike (both `nulls last`, 0018/0019) — the same defect the lowercase-v and VB
 * fixes removed. The cause is not a parser that cannot read the string; it is that nothing ever
 * WROTE the column for these rows.
 *
 * WHY THIS IS MEASURED BEFORE IT IS SWEPT. The standing objection is that a blanket fill from the
 * parser is "a write with no corroborating record", which is the reasoning the Shuksan refusal
 * rests on — there, `grade` implied 4 while the row's own `rock_grade` said 5.7, two candidate
 * fills three grades apart, so NULL was the honest value. That objection is about rows whose OWN
 * RECORDS DISAGREE, not about the operation: `grade_num` is BY DEFINITION the parsed form of
 * `grade`, and scripts/pipeline/load-state.mjs computes it exactly this way for the whole catalog
 * at import. So the question is "which of these rows carry a second record that disagrees?"
 *
 * CORROBORATION IS SAME-SYSTEM ONLY, AND THE FIRST VERSION OF THIS SCRIPT GOT IT WRONG — it
 * compared a technical `grade` against `alpine_grade` and reported 11 disagreements, EVERY ONE OF
 * WHICH WAS CORRECT DATA: `"5.7"` against `alpine_grade "IV"` is a technical grade against a
 * roman COMMITMENT grade, two different quantities. CLAUDE.md records that distinction in half a
 * dozen places and the instrument ignored it. `alpine_grade` is therefore never corroboration —
 * it holds commitment numerals and French adjectival grades, neither of which is a technical
 * difficulty — and a second record only counts when it is in the SAME system the row's own
 * discipline selects, which is exactly what `gradeNumFor` dispatches on.
 *
 * A COMMITMENT-ONLY `grade` IS CLASSIFIED SEPARATELY, and derived from the SHIPPED parser rather
 * than by re-implementing its branch order: a grade is commitment-only when it parses, and the
 * same string with roman numerals removed does not. CLAUDE.md blesses the roman last-resort
 * branch FOR SORTING ("a commitment-only route still SORTS among the catalog rather than falling
 * behind all of it — right for sorting, and exactly the case display must reject"), so those rows
 * are fillable — unless the row ALSO carries a technical second record, which is two candidate
 * fills and the Shuksan rule.
 *
 * Read-only. Anon key. Fails closed on an empty read and on a read carrying no grades.
 */
import { anonKey, selectAll } from "../lib/supabase-env.mjs";
import { gradeNumFor, gradeSystemForDiscipline } from "../../lib/grade.js";
import { SECOND_FOR, AGREE_WITHIN, isCommitmentOnly, secondOpinion, disagrees } from "../lib/grade-corroboration.mjs";

const argv = process.argv.slice(2);
const SHOW = argv.includes("--show") ? Number(argv[argv.indexOf("--show") + 1]) : 12;

const key = anonKey();
const rows = await selectAll(
  "routes",
  "id,name,grade,grade_num,discipline,rock_grade,ice_grade,alpine_grade,aid_grade",
  "",
  { key, pageSize: 1000 }
);
if (!rows.length) { console.error("FAIL — read 0 routes. Nothing was measured."); process.exit(1); }

/* THE CONVENTION, measured against the population that PASSES rather than asserted — the method
   that settled `wa_shock_and_awe`, where 2,277 of 2,278 V-graded rows stored the V number and the
   one exception was the defect. Two questions: does the POPULATED column agree with this parser at
   all (i.e. is a parser fill the catalog's own operation), and do populated COMMITMENT-ONLY rows
   store the roman numeral (i.e. is the roman last-resort branch the catalog's own convention, or
   something only this sweep would start doing)? */
let popTotal = 0, popAgree = 0, cmtTotal = 0, cmtRoman = 0;

let withGrade = 0;
const blanks = [];
for (const r of rows) {
  const g = typeof r.grade === "string" ? r.grade.trim() : "";
  if (!g) continue;
  withGrade++;
  if (r.grade_num != null) {
    const sysP = gradeSystemForDiscipline(r.discipline);
    const nP = gradeNumFor(g, r.discipline);
    if (nP != null) {
      popTotal++;
      if (Math.abs(nP - r.grade_num) < 1e-9) popAgree++;
      if (isCommitmentOnly(g, sysP)) {
        cmtTotal++;
        if (Math.abs(nP - r.grade_num) < 1e-9) cmtRoman++;
      }
    }
    continue;
  }
  const sys = gradeSystemForDiscipline(r.discipline);
  const n = gradeNumFor(g, r.discipline);
  if (n == null) continue;                   // genuinely unreadable — the OTHER measurement's subject
  const commitmentOnly = isCommitmentOnly(g, sys);
  const second = secondOpinion(r, sys);
  blanks.push({ r, g, n, sys, commitmentOnly, second });
}
if (!withGrade) { console.error("FAIL — not one route carries a grade. The read is wrong."); process.exit(1); }

const refuse = [], fillCommit = [], fillPlain = [];
for (const b of blanks) {
  if (disagrees(b.second, b.n)) { refuse.push(b); continue; }
  (b.commitmentOnly ? fillCommit : fillPlain).push(b);
}

const byDisc = new Map(), byState = new Map(), byVal = new Map();
for (const b of blanks) {
  byDisc.set(b.r.discipline, (byDisc.get(b.r.discipline) || 0) + 1);
  byState.set(String(b.r.id).split("_")[0], (byState.get(String(b.r.id).split("_")[0]) || 0) + 1);
  byVal.set(b.n, (byVal.get(b.n) || 0) + 1);
}

console.log("=== readable grades storing a NULL grade_num ===\n");
console.log(`  ${rows.length} routes read, ${withGrade} carry a grade.`);
console.log(`  ${blanks.length} store a NULL grade_num while carrying a grade this parser reads.\n`);

console.log("  --- BY DISCIPLINE");
for (const [d, n] of [...byDisc].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(5)}  ${d}`);
console.log("\n  --- BY STATE PREFIX (top 12)");
for (const [s, n] of [...byState].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`      ${String(n).padStart(5)}  ${s}_*`);
console.log("\n  --- WHAT THE PARSER WOULD WRITE");
for (const [v, n] of [...byVal].sort((a, b) => a[0] - b[0])) console.log(`      ${String(n).padStart(5)}  ->  ${v}`);

console.log("\n  --- THE CONVENTION, among the rows that ARE populated");
console.log(`      ${popAgree} of ${popTotal} (${(100 * popAgree / Math.max(1, popTotal)).toFixed(2)}%) store exactly what this parser reads,`);
console.log(`      so a parser fill is the catalog's OWN operation rather than a new rule.`);
console.log(`      Of those, ${cmtTotal} carry a commitment-only grade and ${cmtRoman} (${(100 * cmtRoman / Math.max(1, cmtTotal)).toFixed(2)}%) store the roman numeral.`);

console.log("\n  --- VERDICT");
console.log(`      FILL, technical      ${String(fillPlain.length).padStart(5)}  (the grade states a real difficulty)`);
console.log(`      FILL, commitment     ${String(fillCommit.length).padStart(5)}  (roman-only; blessed FOR SORTING, and nothing else on the row disagrees)`);
console.log(`      REFUSE               ${String(refuse.length).padStart(5)}  (a same-system second record disagrees by more than ${AGREE_WITHIN} — the Shuksan rule)`);

if (refuse.length) {
  console.log(`\n  --- THE REFUSALS, in full — two candidate fills, so NULL stays the honest value:`);
  for (const b of refuse) {
    console.log(`      ${b.r.id}`);
    console.log(`        grade        ${JSON.stringify(b.g)}  [${b.r.discipline} -> ${b.sys}]  parser ${b.n}${b.commitmentOnly ? "  (commitment-only)" : ""}`);
    console.log(`        ${String(b.second.col).padEnd(13)}${JSON.stringify(b.second.raw)}  parser ${b.second.n}`);
  }
}

console.log(`\n  --- SAMPLE of the COMMITMENT-ONLY fills (${Math.min(SHOW, fillCommit.length)} of ${fillCommit.length})`);
for (const b of fillCommit.slice(0, SHOW)) {
  console.log(`      null -> ${String(b.n).padStart(5)}   ${JSON.stringify(b.g.slice(0, 44))}  [${b.r.discipline}]  ${b.r.id}`);
}
console.log(`\n  --- SAMPLE of the TECHNICAL fills (${Math.min(SHOW, fillPlain.length)} of ${fillPlain.length})`);
for (const b of fillPlain.slice(0, SHOW)) {
  const sec = b.second ? `  ${b.second.col}=${JSON.stringify(b.second.raw)} (${b.second.n})` : "";
  console.log(`      null -> ${String(b.n).padStart(5)}   ${JSON.stringify(b.g.slice(0, 44))}  [${b.r.discipline}]  ${b.r.id}${sec}`);
}
