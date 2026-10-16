// `grade_num` means TECHNICAL difficulty — the user's call, 2026-09-04 — and these rows disagree
// with the catalog's own convention for the system they are written in.
//
// WHY THE PARSER IS THE RIGHT ANSWER HERE, and the measurement that establishes it. The disagreement
// `audit:grade-num-drift` reports for class F is that "5.11c" stores 11 while `gradeNumFrom` says
// 11.75. Whether that is a DEFECT depends on the column's convention, not on the parser, so the
// convention was measured the way this repo settled the V-grade question: against the rows in the
// same system that AGREE.
//
//     letter grades (5.11c etc) carrying a grade_num : 2444
//        2090  store a FRACTION   (5.11c -> 11.75)      <- 98% of those that store either
//          32  store the INTEGER  (5.11c -> 11)
//     Class RANGES ("Class 3-4") whose two ends DIFFER :  149
//         129  store the LOW end   ("Class 3-4" -> 3)     <- 89% of those storing either
//          16  store the HIGH end
//
// So the fractional/low-end answers ARE the convention, the integer rows are the outliers, and
// `gradeNumFrom` already produces the convention. This is not "trust the parser" — it is "the
// parser and 98% of the catalog agree, and these rows do not".
//
// SCOPED TO UNAMBIGUOUSLY TECHNICAL GRADES, which is what the decision requires. A YDS letter grade
// and a Class grade are technical by definition. Anything carrying a ROMAN NUMERAL is excluded even
// when the parser has an answer for it: under this decision a numeral is COMMITMENT, so writing the
// parser's 4 for a Grade IV alpine face would rank it alongside a Class 4 scramble. That is the case
// where the parser's answer is WORSE than the null, and no amount of catalog convention changes it.
//
// AND A CLASS RANGE RAISES A SECOND QUESTION THIS DECISION DID NOT SETTLE: which END does grade_num
// store? The catalog says the LOW end 129 times and the HIGH end 16. That is a lean, not a
// convention, and nothing like the 98/2 the letter grades give — so a row storing the HIGH end of
// its own range is REPORTED, not repaired. It is doing what 16 other rows do, and choosing between
// them is a separate call. A row storing NEITHER end has no such defence and IS repaired.
//
// THAT FIGURE READ 225/16 WHEN THIS SHIPPED, AND THE DENOMINATOR OF MY OWN COUNT WAS THE PROBLEM:
// it tested `n === lo` first, so all 74 SINGLE Class grades — where lo and hi are the same value —
// tallied as "stores the LOW end". A single grade cannot vote on a question about ranges. The
// conclusion is unchanged, since 89% is still nothing like the letter grades' 98%, but the dissent
// is 1-in-9 rather than 1-in-15. Ask what a number is a number OF, including your own.
//
// Every new value is COMPUTED by the app's own `gradeNumFrom` — nothing is typed, so a row needing a
// number the parser cannot produce cannot be expressed here.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const APPLY = process.argv.includes("--apply");

// Unambiguously technical: a YDS letter grade, a plain YDS grade, or a Class grade. No numerals.
const TECHNICAL = /^(?:5\.\d+[a-d]?(?:[+-])?|class\s*\d(?:\s*-\s*\d)?)\s*$/i;
const HAS_NUMERAL = /\b(?:[IVX]{1,4})\b/;

const rows = await selectAll("routes", "id,name,grade,grade_num", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL - 0 routes read. An empty read is not a clean catalog."); process.exit(1); }

const fix = [], skippedNumeral = [], rangeEnd = [];
for (const r of rows) {
  const g = typeof r.grade === "string" ? r.grade.trim() : "";
  if (!g || r.grade_num == null) continue;
  if (HAS_NUMERAL.test(g)) { if (!TECHNICAL.test(g)) skippedNumeral.push(g); continue; }
  if (!TECHNICAL.test(g)) continue;
  let want;
  try { want = gradeNumFrom(g); } catch { continue; }
  if (want == null || want === r.grade_num) continue;
  const rng = g.match(/^class\s*(\d)\s*-\s*(\d)/i);
  if (rng && (r.grade_num === +rng[1] || r.grade_num === +rng[2])) {
    rangeEnd.push({ id: r.id, grade: g, was: r.grade_num, now: want });
    continue;
  }
  fix.push({ id: r.id, name: r.name, grade: g, was: r.grade_num, now: want });
}

console.log(`${rows.length} wa routes; ${fix.length} carry an unambiguously TECHNICAL grade whose stored`);
console.log(`grade_num disagrees with the convention its own system uses.\n`);
const by = new Map();
for (const f of fix) {
  const k = `${f.was} -> ${f.now}`;
  if (!by.has(k)) by.set(k, []);
  by.get(k).push(f);
}
for (const [k, list] of [...by].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(list.length).padStart(3)}  ${k.padEnd(16)} e.g. ${list[0].grade.padEnd(10)} ${list[0].id}`);
}
console.log(`\n${skippedNumeral.length} row(s) skipped as carrying a ROMAN NUMERAL — commitment, not technical,`);
console.log(`so the parser's answer would be worse than what is stored.`);
console.log(`\n${rangeEnd.length} row(s) REPORTED, NOT REPAIRED: they store one END of their own Class range.`);
console.log(`Of the 149 ranges whose ends differ, 129 store the LOW end and 16 the HIGH — a lean,`);
console.log(`not a convention, and nothing like the 98/2 the letter grades give. Which end a RANGE`);
console.log(`stores is its own decision, and these rows are doing what 16 others do.`);
for (const x of rangeEnd.slice(0, 6)) console.log(`  ${x.grade.padEnd(12)} stored ${String(x.was).padEnd(5)} parser ${x.now}   ${x.id}`);

if (!fix.length) { console.log("\nNothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const f of fix) { await patchRow("routes", f.id, { grade_num: f.now }); wrote++; }
console.log(`\nwrote ${wrote} row(s).`);

// Verify by re-reading: a 200 is not evidence the data changed.
const after = await selectAll("routes", "id,grade,grade_num", "id=like.wa_*", { pageSize: 1000 });
const byId = new Map(after.map((x) => [x.id, x]));
let bad = 0;
for (const f of fix) {
  const live = byId.get(f.id);
  if (!live || live.grade_num !== f.now) { console.error(`NOT APPLIED: ${f.id} reads ${live && live.grade_num}`); bad++; }
  if (live && live.grade !== f.grade) { console.error(`COLLATERAL: ${f.id} grade string changed`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).`
                : `\nverified: all ${wrote} row(s) re-read at the convention's value, with the grade string untouched.`);
process.exit(bad ? 1 : 0);
