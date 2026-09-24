#!/usr/bin/env node
/* The rows #1769's sweep DECLINED, read one at a time — and the three where a SECOND record agrees.
 *
 * That sweep writes only where the stored value agreed with the OLD parser, so a row that already
 * disagreed is pre-existing drift and none of its business. CLAUDE.md records those as "a reading
 * list for audit:grade-num-drift, not part of this change". This is that reading, done.
 *
 * WHAT MAKES THESE THREE DIFFERENT FROM THE OTHER FOUR: `rock_grade` is an INDEPENDENT record of
 * the same route's technical difficulty, written by a different enrichment pass from `grade`. Where
 * the parser and `rock_grade` agree and the stored number is the odd one out, two records outvote
 * one and no judgement is required. Where they disagree, the refusal stands — that is the
 * "when two candidate fills disagree, the NULL is the honest value" rule this catalog already runs on.
 *
 * NOTHING IS TYPED. Every new value is COMPUTED by gradeNumFor from the row's own `grade`, and the
 * corroborating value is COMPUTED from the row's own `rock_grade`. A repair needing a number the
 * row does not already imply cannot be expressed here at all.
 *
 * THE EVIDENCE IS RE-ASSERTED AT APPLY TIME, not merely when this was written: every entry declares
 * the stored value it expects to find, and the run REFUSES the whole batch if any row has moved.
 *
 * Dry run by default. --apply to write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFor } from "../../lib/grade.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");

/* Each entry: the row, the value it should currently hold, and WHY the change is safe.
   `expect: null` means the column was never populated — those routes sort behind the whole
   catalog and are dropped by any range filter, which is the defect being repaired. */
const BATCH = [
  {
    id: "wa_soviet_route",
    expect: 10,
    why: `#1769 RESOLVED a deadlock CLAUDE.md recorded as unresolvable. It read: "THREE RECORDS GIVE
      THREE VALUES - gradeNumFrom says 9, the column says 10, rock_grade says 10.25 - and it is not
      repaired, because the quarter-grade repair's OWN contract already refuses it... its fingerprint
      is stored === Math.floor(parser), which here is 10 === 9, false, so it structurally cannot be
      selected." Under highest-wins the parser now reads "V, 5.9-5.10a" as 10.25, so Math.floor is
      10 and the fingerprint MATCHES - and parser and rock_grade ("5.10a") now AGREE at 10.25, with
      the stored 10 being the dropped letter. The quarter-grade convention is near-unanimous.`,
  },
  {
    id: "wa_dragontail_peak_east_ridge_aasgard_pass",
    expect: null,
    why: `CLAUDE.md already calls this "the only clean one" - parser and rock_grade ("Class 2-3")
      both read 3, every record agreeing - and declined it only because "filling NULLs is a different
      question from which end a range stores, and it is not this measurement's". This is that
      question, asked on its own.`,
  },
  {
    id: "wa_sahale_mountain_r1",
    expect: 3,
    why: `Parser and rock_grade ("4th class") both read 4; the stored 3 is the odd one out.
      audit:grade-num-drift files it under "split/slash grade", whose stated reason is a .5
      convention question - that reason does not apply here, because both candidate readings of this
      row's own string (Class 3-4, and the 5.0-5.4 summit block) land on the same integer.`,
  },
];

/* READ, NOT REPAIRED - recorded here so the next reader does not re-derive them. */
const LEFT = [
  ["wa_mount_shuksan_northwest_arete", `CLAUDE.md's recorded refusal STANDS. Filling from the headline
     string understates the route's own hardest recorded climbing: the parser reads 5 and rock_grade
     says "5.7" (= 7). #1769 narrowed that gap from 3 grades to 2 and did not close it, so the NULL
     is still the honest value.`],
  ["wa_mount_challenger_challenger_glacier", `LEAVE. The stored 5 AGREES with rock_grade ("5.5"); it
     is the grade STRING ("Class 3-4, Glacier, 5.6-5.7") that disagrees with both. Writing the
     parser's 7 would move the column AWAY from its corroborating record. That is a data question
     between two columns, not a grade_num defect.`],
  ["bc_south_howser_tower_west_buttress", `LEAVE for now. "5.8 A2 or 5.10" parses to 10 and 10 is
     defensible (5.10 is the free crux; the alternative is an aid line), but rock_grade is NULL so
     NOTHING corroborates it. These two belong to a larger class measured alongside: 778 routes
     catalog-wide store a NULL grade_num while carrying a grade the parser can read - re-run
     measure-unreadable-grades.mjs rather than quoting that figure, which has already moved once.`],
  ["nt_lotus_flower_tower_southeast_face", `LEAVE - identical string and identical reasoning to
     bc_south_howser_tower_west_buttress.`],
];

const k = anonKey();
async function readRow(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,grade,grade_num,rock_grade,discipline&id=eq.${encodeURIComponent(id)}`, { headers: headers(k) });
  if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
  const [r] = await res.json();
  return r;
}

const eq = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9);

const writes = [], refusals = [];
for (const e of BATCH) {
  const r = await readRow(e.id);
  if (!r) { refusals.push([e.id, "no such row"]); continue; }
  if (!eq(r.grade_num, e.expect)) { refusals.push([e.id, `stored is ${r.grade_num}, this entry was written against ${e.expect} - the row has MOVED`]); continue; }
  const fromGrade = gradeNumFor(r.grade, r.discipline);
  const fromRock = gradeNumFor(r.rock_grade, r.discipline);
  if (fromGrade == null) { refusals.push([e.id, "the parser no longer reads this row's grade"]); continue; }
  if (!eq(fromGrade, fromRock)) { refusals.push([e.id, `the two records no longer AGREE: grade -> ${fromGrade}, rock_grade -> ${fromRock}. The corroboration this entry rests on is gone.`]); continue; }
  if (eq(r.grade_num, fromGrade)) { refusals.push([e.id, "already correct - nothing to write"]); continue; }
  writes.push({ id: e.id, name: r.name, grade: r.grade, rock: r.rock_grade, from: r.grade_num, to: fromGrade });
}

console.log(`\n=== grade_num rows where a SECOND record settles it ===\n`);
for (const w of writes) {
  console.log(`  ${w.id}   "${w.name}"`);
  console.log(`      grade ${JSON.stringify(w.grade)}  +  rock_grade ${JSON.stringify(w.rock)}  both read ${w.to}`);
  console.log(`      stored ${w.from} -> ${w.to}\n`);
}
if (refusals.length) {
  console.log(`  REFUSED (${refusals.length}):`);
  for (const [id, why] of refusals) console.log(`    ${id}: ${why}`);
  console.log("");
}
console.log(`  READ AND DELIBERATELY NOT REPAIRED (${LEFT.length}):`);
for (const [id, why] of LEFT) console.log(`    ${id}\n      ${why.replace(/\s+/g, " ").trim()}\n`);

// A refusal means the evidence this batch rests on has moved. Write nothing at all.
if (refusals.some(([, w]) => !/already correct/.test(w))) {
  console.error(`FAIL - at least one row has moved since this batch was written. Nothing written.`);
  process.exit(1);
}
if (!writes.length) { console.log(`  Nothing to write.\n`); process.exit(0); }
if (!APPLY) { console.log(`  DRY RUN - pass --apply to write.\n`); process.exit(0); }

const svc = requireServiceKey();
const rb = path.join(ROOT, "scripts", `rollback-grade-num-corroborated-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify(writes.map((w) => ({ id: w.id, grade_num: w.from })), null, 2));
console.log(`  rollback written: ${path.relative(ROOT, rb)}\n`);

let bad = 0;
for (const w of writes) {
  await patchRow("routes", w.id, { grade_num: w.to });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,grade_num&id=eq.${encodeURIComponent(w.id)}`, { headers: headers(svc) });
  const [got] = await res.json();
  if (!got || !eq(got.grade_num, w.to)) { bad++; console.error(`    RECONCILE FAILED ${w.id}: expected ${w.to}, read ${got ? got.grade_num : "no row"}`); }
  else console.log(`    wrote and reconciled ${w.id} -> ${w.to}`);
}
console.log(`\n  wrote ${writes.length}, failed ${bad}\n`);
if (bad) process.exit(1);
