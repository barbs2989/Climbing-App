#!/usr/bin/env node
/* Which end of a RANGE grade does this catalog actually store? "Class 3-4", "Class 2-3",
 * "5.7-5.9" — the string names two grades and `grade_num` is one number, so every such row has
 * already made a choice, and nothing has ever asked whether the choices agree.
 *
 * WHY THIS IS NOT AN INVITATION TO SWEEP. `lib/grade.js` records that `gradeNumFrom` matches
 * `load-state.mjs` VERBATIM on purpose, and that the ~1.9% disagreement between parser and column
 * is FOUR IMPORT PATHS writing one column — "a fifth dialect is the problem, not the fix". So the
 * useful output here is the SHAPE of the disagreement, not a repair: if the catalog is
 * overwhelmingly consistent, the outliers are rows to read; if it is genuinely split, then no
 * single end is "the" convention and a sweep would be inventing one.
 *
 * `grade_num` is the sortable grade and both finder RPCs rank and filter on it, so a row on the
 * wrong end sits in the wrong place in a list nobody cross-checks. It is not cosmetic — and it is
 * also not a safety number, which is why this reports rather than writes.
 */
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const k = anonKey();
const argv = process.argv.slice(2);
const STATE = (argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : "wa").toLowerCase();

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/routes?select=id,grade,grade_num,discipline&id=like.${STATE}_*&grade=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`;
    const res = await fetch(url, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error(`FAIL — read 0 routes for "${STATE}". A broken query, not a clean catalog.`); process.exit(1); }

/* A RANGE is two grades of the SAME system joined by a dash. Deliberately narrow:
   "5.9+" is not a range, "Grade III, 5.8" is a commitment grade beside a technical one, and
   "Class 2 snow climb / non-technical" is a compound grade this file already records must not be
   cut. Matching those would manufacture findings out of correct strings. */
const CLASS_RANGE = /class\s*(\d)\s*[-–]\s*(\d)/i;
const ORDINAL_RANGE = /\b(\d)(?:st|nd|rd|th)?\s*[-–]\s*(\d)(?:st|nd|rd|th)\s*class/i;
const YDS_RANGE = /5\.(\d+)([a-d]?)\s*[-–]\s*5\.(\d+)([a-d]?)/i;

const ydsVal = (n, l) => parseInt(n) + (l ? ("abcd".indexOf(l) + 1) / 4 : 0);

let classRows = 0, ydsRows = 0, notHeadline = 0;
const tally = { low: 0, high: 0, mid: 0, other: 0 };
const others = [];
const parserTally = { low: 0, high: 0, mid: 0, other: 0 };

for (const r of rows) {
  const g = String(r.grade || "");
  let lo = null, hi = null, kind = null;
  let m;
  if ((m = g.match(CLASS_RANGE))) { lo = +m[1]; hi = +m[2]; kind = "class"; }
  else if ((m = g.match(ORDINAL_RANGE))) { lo = +m[1]; hi = +m[2]; kind = "class"; }
  else if ((m = g.match(YDS_RANGE))) { lo = ydsVal(m[1], m[2]); hi = ydsVal(m[3], m[4]); kind = "yds"; }
  if (lo == null || !(hi > lo)) continue;

  /* THE RANGE HAS TO BE THE ROUTE'S HEADLINE GRADE, not a range mentioned somewhere in the
     string. `"Alpine IV, 5.8 (sustained 5.6-5.7)"` stores 8 — which is CORRECT, the route is 5.8
     — and a bare regex reads the parenthetical as the grade and reports a right row as wrong.
     Same for `"5.6-5.7 (2 technical pitches; remainder Class 3-4 scrambling"`, where the class
     range describes the ground BETWEEN the pitches. Five of ten rows in the first run's "neither"
     bucket were this, i.e. the measurement was manufacturing half its own findings.
     The test is the parser's own answer: if the most specific grade in the string does not fall
     inside the range this matched, the range is not what the row is graded at. */
  const parsed = gradeNumFrom(g, r.discipline);
  if (parsed != null && (parsed < lo - 1e-9 || parsed > hi + 1e-9)) { notHeadline++; continue; }

  if (kind === "class") classRows++; else ydsRows++;

  const stored = r.grade_num == null ? null : Number(r.grade_num);
  const mid = (lo + hi) / 2;
  const bucket = (v) => v == null ? "other" : (Math.abs(v - lo) < 1e-9 ? "low" : Math.abs(v - hi) < 1e-9 ? "high" : Math.abs(v - mid) < 1e-9 ? "mid" : "other");
  const b = bucket(stored);
  tally[b]++;
  if (b === "other") others.push({ id: r.id, grade: g, stored, lo, hi });

  parserTally[bucket(gradeNumFrom(g, r.discipline))]++;
}

const total = classRows + ydsRows;
console.log(`\n=== which END of a range grade does ${STATE.toUpperCase()} store? ===\n`);
console.log(`  ${rows.length} routes carry a grade`);
console.log(`  ${total} state a RANGE of two grades in one system  (${classRows} class, ${ydsRows} YDS)`);
console.log(`  ${notHeadline} more matched a range that is NOT the route's headline grade — excluded\n`);
console.log(`  STORED grade_num resolves to:`);
console.log(`    the LOW end   ${String(tally.low).padStart(4)}`);
console.log(`    the HIGH end  ${String(tally.high).padStart(4)}`);
console.log(`    the MIDPOINT  ${String(tally.mid).padStart(4)}`);
console.log(`    none of them  ${String(tally.other).padStart(4)}`);
console.log(`\n  what lib/grade.js's gradeNumFrom() would say about the same strings:`);
console.log(`    the LOW end   ${String(parserTally.low).padStart(4)}`);
console.log(`    the HIGH end  ${String(parserTally.high).padStart(4)}`);
console.log(`    the MIDPOINT  ${String(parserTally.mid).padStart(4)}`);
console.log(`    none of them  ${String(parserTally.other).padStart(4)}`);

if (others.length) {
  console.log(`\n  rows whose stored value is neither end nor the midpoint (first 25):`);
  for (const o of others.slice(0, 25)) console.log(`    ${String(o.stored).padStart(5)}  against ${o.lo}-${o.hi}   ${o.grade.slice(0, 60)}   ${o.id}`);
}

console.log(`\nReport only. lib/grade.js records that gradeNumFrom matches load-state.mjs VERBATIM`);
console.log(`and that a FIFTH dialect is the problem rather than the fix — so read this as the`);
console.log(`shape of the disagreement, never as a worklist.`);
