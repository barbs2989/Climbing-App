// Does capping shortGrade change ANY real grade on screen?
//
// This repo's standard for touching a shared parser is to prove the swap before making it, not
// after — "I reformatted it and it looks the same" is not evidence when the function renders on
// every route row in the app. So: run shortGrade AND gradeDetail over every distinct catalog
// grade, at the ref given, and dump the results for diffing against the other ref.
//
//   node scripts/oneoff/verify-grade-cap-equivalence.mjs --out before.json    (on the old code)
//   node scripts/oneoff/verify-grade-cap-equivalence.mjs --out after.json     (on the new code)
//   node scripts/oneoff/verify-grade-cap-equivalence.mjs --diff before.json after.json
//
// It checks BOTH halves deliberately. A cap that shortens the pill while dropping the remainder
// would be a loss, and only gradeDetail can show that.
import fs from "fs";
import { shortGrade, gradeDetail } from "../../lib/grade.js";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(k + "=")); return a ? a.split("=")[1] : d; };
const DIFF = process.argv.indexOf("--diff");

if (DIFF >= 0) {
  const a = JSON.parse(fs.readFileSync(process.argv[DIFF + 1], "utf8"));
  const b = JSON.parse(fs.readFileSync(process.argv[DIFF + 2], "utf8"));
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let differ = 0;
  for (const k of keys) {
    const x = a[k], y = b[k];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    differ++;
    if (differ <= 15) {
      console.log(`  ${JSON.stringify(k.slice(0, 90))}`);
      console.log(`     before  short=${JSON.stringify((x || {}).s)}  detail=${JSON.stringify((x || {}).d)}`);
      console.log(`     after   short=${JSON.stringify((y || {}).s)}  detail=${JSON.stringify((y || {}).d)}`);
    }
  }
  console.log(`\n${keys.size} distinct grades compared; ${differ} differ.`);
  process.exit(0);
}

const q = async (filter) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=grade&${filter}&limit=1000`, { headers: headers(anonKey()) });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
// Over-sample the shapes that actually get long: an unordered slice is nearly all 3-char grades
// and would prove the cap harmless by never meeting a candidate.
const grades = new Set();
for (const f of ["grade=not.is.null", "grade=like.*(*", "grade=ilike.*class*", "grade=ilike.*grade*", "grade=ilike.*pitch*", "grade=ilike.*scrambl*"]) {
  for (const row of await q(f)) if (row.grade) grades.add(String(row.grade));
}
if (!grades.size) { console.log("FAIL: read no grades — an empty comparison proves nothing"); process.exit(1); }

// Hand-written edge cases alongside the live ones, because the catalog contains no value that
// exercises the cap and the whole question is what happens when one arrives.
for (const g of [
  "5.9", "Class 2 snow climb / non-technical", "5.11b/c (6c+ French, E4 6a British)",
  "x".repeat(80), "Grade III 5.10a sustained face climbing on excellent rock with no fixed gear anywhere",
  "", "  ", "WI3+",
]) grades.add(g);

const out = {};
for (const g of grades) out[g] = { s: shortGrade(g), d: gradeDetail(g) };
const file = arg("--out", "grade-dump.json");
fs.writeFileSync(file, JSON.stringify(out, null, 0));
console.log(`${grades.size} distinct grades evaluated -> ${file}`);
