#!/usr/bin/env node
// Does the STORED grade_num still agree with what lib/grade.js derives from the row's own `grade`?
//
// `grade_num` is the SORTABLE grade: both finder RPCs (0018/0019) rank and filter on it, so a wrong
// value is invisible -- the route just sits in the wrong place in a list nobody cross-checks.
//
// A DIFFERENT QUESTION FROM check:grade-parser, which is why this exists. That build gate asserts
// there is exactly ONE parser in the code, and it cannot see whether the DATA still agrees with it:
// the column was populated by importers, and a row written by an older parser stays wrong forever.
// Nobody had asked. Measured on first run: 114 of 8,014 readable WA grades disagree (1.4%).
//
// REPORT-ONLY, AND IT MUST STAY SO. Most disagreements are NOT defects, because grade_num is a
// LOSSY column by construction -- gradeNumFrom maps `class 3` and `5.3` to the same 3, and a roman
// numeral (a COMMITMENT grade) to its own number, so a Grade V alpine route and 5.5 share a slot.
// Sweeping the parser's answer over the column would file scrambles among rock climbs. The classes
// below separate "the row disagrees with its own system" from "the column cannot express this".
//
// THE ONE ROW THAT WAS FIXED shows the bar. wa_shock_and_awe stored 10 for "V3"; the convention was
// then measured against the population that PASSES -- 2,277 of 2,278 V-graded rows store the V
// number, none stores a YDS equivalent -- so a convention with a single exception is a defect.
// Compare a suspect against the rows that agree before calling it wrong.
import { selectAll } from "./lib/supabase-env.mjs";
import { gradeNumFrom } from "../lib/grade.js";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const STATE = String(arg("--state", "wa")).toLowerCase();

const rows = await selectAll("routes", "id,grade,grade_system,grade_num,discipline",
  `id=like.${STATE}_*`, { pageSize: 1000 });

/* Fail closed. Zero rows makes every column look consistent, which is the false-pass direction. */
if (!rows.length) {
  console.error(`FAIL — read 0 routes for state '${STATE}'. A broken read, not a clean catalog.`);
  process.exit(1);
}

const ROMAN_ONLY = /^\s*(?:grade\s+)?[IVX]+[+-]?\s*$/i;
const HAS_ROMAN = /\b[IVX]{1,4}[+-]?\b/;
const HAS_YDS = /5\.\d/;
const HAS_V = /\bV\d/i;
const HAS_ICE = /\b(?:WI|AI|M)\d/i;
const SPLIT = /\d[a-d]\s*\/\s*[a-d]|\d\s*\/\s*5\.\d|[a-d]\/[a-d]/i;

/* Each class says whether the parser's answer is even MEANINGFUL for that grade, because the
   answer decides whether a reader should act. The first two are the column's own limits. */
const CLASSES = {
  A: ["roman numeral ALONE — a COMMITMENT grade, which grade_num cannot carry",
      "Leave. `V` here is Grade V, not 5.5, and the parser's number would file it among 5.x rock."],
  B: ["ice/mixed only — grade_num cannot carry an ice grade",
      "Leave. CLAUDE.md records this class already; never 'fix' one in isolation."],
  C: ["V-grade (bouldering)",
      "CHECK against the V-grade population first — the convention is the V number (2,277 of 2,278)."],
  D: ["split/slash grade — a .5 convention question",
      "Leave unless a convention is decided. Both 10 and 10.5 are defensible for '5.10b/c'."],
  E: ["roman + YDS in one string — which did the row store?",
      "READ the row. The YDS part is the difficulty; a stored roman number is the wrong half."],
  F: ["plain grade, plain disagreement",
      "READ the row. These are where a genuinely wrong stored value lives."],
};

let compared = 0, agree = 0;
const buckets = {};
for (const r of rows) {
  if (!r.grade) continue;
  const derived = gradeNumFrom(r.grade, r.grade_system);
  if (derived == null) continue;
  compared++;
  if (r.grade_num != null && Math.abs(Number(r.grade_num) - Number(derived)) < 1e-9) { agree++; continue; }

  const g = String(r.grade);
  let k;
  if (ROMAN_ONLY.test(g)) k = "A";
  else if (HAS_ICE.test(g) && !HAS_YDS.test(g)) k = "B";
  else if (HAS_V.test(g) && (r.discipline === "bouldering" || /^\s*V\d/i.test(g))) k = "C";
  else if (SPLIT.test(g)) k = "D";
  else if (HAS_ROMAN.test(g) && HAS_YDS.test(g)) k = "E";
  else k = "F";
  (buckets[k] = buckets[k] || []).push({ r, derived });
}

if (!compared) {
  console.error("FAIL — the parser could read 0 grades. A broken scan, not a clean catalog.");
  process.exit(1);
}

const total = Object.values(buckets).reduce((n, l) => n + l.length, 0);
console.log(`${rows.length} ${STATE.toUpperCase()} routes; ${compared} carry a grade the parser can read.`);
console.log(`${agree} agree with the stored grade_num (${(100 * agree / compared).toFixed(2)}%).`);
console.log(`${total} disagree.\n`);

for (const k of Object.keys(CLASSES)) {
  const list = buckets[k];
  if (!list) continue;
  console.log(`${k}. ${CLASSES[k][0]} — ${list.length}`);
  console.log(`   → ${CLASSES[k][1]}`);
  for (const { r, derived } of list.slice(0, 8)) {
    console.log(`     ${r.id.padEnd(46)} ${JSON.stringify(String(r.grade).slice(0, 34)).padEnd(38)} stored=${String(r.grade_num).padEnd(6)} parser=${derived}`);
  }
  if (list.length > 8) console.log(`     … ${list.length - 8} more`);
  console.log();
}

console.log("Report-only: a disagreement is not a defect. grade_num is lossy across grade systems");
console.log("by construction, so classes A, B and D are the column's limits rather than bad rows.");
console.log("Before changing any row, compare it against the rows in its own system that AGREE.");
process.exit(0);
