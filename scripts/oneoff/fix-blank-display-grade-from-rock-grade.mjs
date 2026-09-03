// 43 WA ROUTES SORT AS A GRADE AND DISPLAY NOTHING.
//
// `grade` renders in the route header pill and in the compact area rows; `grade_num` is the
// sortable column both finder RPCs (0018/0019) rank and filter on. These 43 rows have `grade_num`
// populated and `grade` blank, so they are findable by grade and unreadable once found -- including
// wa_golden_horn_east_face, an 11-pitch IV 5.10+ R with a 20-foot unprotectable runout, and
// wa_prusik_peak_prayer_for_a_friend at 5.14a. Found by batch 106.
//
// EVERY ONE HAS THE ANSWER IN ITS OWN `rock_grade`, so this is a copy, not research. Measured: 43
// candidates, 43 recoverable, and shortGrade() renders all 43 inside the header-pill budget (the
// longest is 20 characters; nothing needs truncating).
//
// `grade_num` IS DELIBERATELY NOT TOUCHED, and the measurement behind that is the useful part.
// gradeNumFrom() encodes the YDS letter as a fraction (a=.25, b=.5, c=.75, d=1.0), and the CATALOG
// FOLLOWS IT: of 2,426 WA rows whose displayed grade carries a letter, 2,092 store the fraction and
// 334 store a bare integer. So these 43 also hold a TRUNCATED grade_num -- 5.14a stored as 14, 5.10d
// as 10 -- which is real, and which this script does not fix for two reasons:
//   * grade_num is what the finder RPCs RANK on, so changing it moves routes in a list nobody
//     cross-checks -- the failure mode CLAUDE.md records for that column.
//   * these 43 are an ARBITRARY SUBSET of the 334: they are the rows that happen to also have a
//     blank display grade. Repairing 43 of 334 because a different defect brought them to hand is
//     the partial-repair-on-an-arbitrary-subset trap. If the truncation is worth fixing it is worth
//     fixing across all 334, as one decision, against the parser.
// The consequence is stated rather than hidden: filling `grade` newly exposes these rows to
// audit:grade-num-drift (which reads the row's own `grade`), so that audit will report ~26 of them.
// Those reports will be CORRECT -- they are the truncation above, not a defect introduced here.
//
// DISCIPLINE: a copy from the row's own field, with the source re-asserted at apply time, refusing
// on any mismatch, idempotent by equality, verified by re-read.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
import { shortGrade } from "../../lib/grade.js";

const KEY = requireServiceKey();
const DRY = !process.argv.includes("--apply");
const S = v => typeof v === "string" ? v : JSON.stringify(v ?? "");
const blank = v => v === null || v === undefined || S(v).trim() === "" || S(v) === '""';

const rows = await selectAll("routes", "id,grade,grade_num,rock_grade,discipline,areas!inner(name,path)",
  "areas.path=cd.usa.washington", { pageSize: 500, key: KEY });
console.log("WA rows read:", rows.length);
if (rows.length < 5000) { console.error("SHORT READ — refusing."); process.exit(1); }

const cands = rows.filter(r => blank(r.grade) && !blank(r.rock_grade) &&
  r.grade_num !== null && r.grade_num !== undefined);
console.log(`blank display grade, populated grade_num, recoverable from rock_grade: ${cands.length}`);
if (!cands.length) { console.log("Nothing to do."); process.exit(0); }

const plans = [], refuse = [];
for (const r of cands) {
  const rg = S(r.rock_grade).trim();
  const pill = shortGrade(rg);
  // FAIL CLOSED ON THE SHAPE: `grade` renders in a compact pill, so a value the app's own
  // shortGrade() cannot bring inside the budget must not be written -- that is the season/grade
  // shape defect this repo already records, committed by a repair.
  if (!pill || !String(pill).trim()) { refuse.push(`${r.id}: shortGrade() returned nothing for ${JSON.stringify(rg)}`); continue; }
  if (String(pill).length > 24) { refuse.push(`${r.id}: shortGrade() is ${String(pill).length} chars (${JSON.stringify(pill)}) — too long for the header pill`); continue; }
  plans.push({ id: r.id, peak: r.areas.name, body: { grade: rg }, rg, pill,
    check: v => S(v.grade).trim() === rg });
}

if (refuse.length) { for (const x of refuse) console.error(`  !! REFUSED ${x}`); console.error(`\n${refuse.length} refusal(s); writing nothing.`); process.exit(1); }
console.log("");
for (const p of plans.slice(0, 10)) console.log(`  -> ${p.id.padEnd(46)} grade := ${JSON.stringify(p.rg).slice(0,60).padEnd(62)} pill=${JSON.stringify(p.pill)}`);
if (plans.length > 10) console.log(`  ... and ${plans.length - 10} more`);
if (DRY) { console.log(`\nDRY RUN — ${plans.length} row(s). Re-run with --apply.`); process.exit(0); }

for (const p of plans) await patchRow("routes", p.id, p.body, { key: KEY });

const after = await selectAll("routes", "id,grade", `id=in.(${plans.map(p => p.id).join(",")})`, { pageSize: 200, key: KEY });
const aby = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
for (const p of plans) if (!p.check(aby[p.id] || {})) { console.error(`  FAIL ${p.id}`); bad++; }
console.log(bad ? `\n${bad} of ${plans.length} FAILED — re-read the rows.` : `\nApplied and verified: ${plans.length} row(s) now display a grade.`);
process.exitCode = bad ? 1 : 0;
