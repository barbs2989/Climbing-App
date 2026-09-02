// Repair two grade defects using ONLY values the row already holds or the app's own parser derives.
// Nothing here types a grade or a number: every write is either computed by gradeNumFrom() from the
// LIVE row's own grade string, or copied verbatim from a sibling column of the SAME row. A repair
// needing a fact the catalog does not hold cannot be expressed by this script.
//
//   CLASS 1  grade_num is 0 while the row's grade string parses to a real value.
//            0 is not a low grade, it is a null: it sorts below the entire catalog and is dropped by
//            every grade-range filter the finder RPCs apply (0018/0019 rank on grade_num). Measured:
//            13 WA rows, every one an alpine or scramble line whose string the parser reads fine
//            ("Class 4" -> 4). These are stored values predating the parser's unification, not parse
//            failures. check:grade-parser asserts the parser lives in one place; nothing asks whether
//            the stored COLUMN still agrees with it — the check:column-drift question for a derived value.
//
//   CLASS 2  grade is blank while grade_num is set and a sibling grade column holds the display string.
//            Such a route ranks and range-filters as a graded route while its grade pill renders
//            NOTHING, so a climber filtering for 5.7 is offered a route whose screen will not say what
//            it is. grade_num alone cannot reconstruct the string (4 could be "Class 4" or "5.4"; 10
//            could be 5.10a-d), so this is only mechanical where the row already carries the string.
//
// TWO GATES ON CLASS 2, both measured rather than assumed:
//   (a) the sibling must PARSE BACK to the stored grade_num. Copying a string that parses to something
//       else would silently change how the route ranks — a different edit than filling a blank.
//       Measured: 152 blank-grade rows, 126 agree, 26 disagree and are left alone.
//   (b) the sibling must be a CLEAN GRADE TOKEN. `grade` renders in the header pill and the compact
//       area-page rows, and 20 of the 126 carry 28-215 characters of qualifier prose ("5.8 (Beckey
//       guidebook grade; a 2013 party found pitch 1 harder, closer to 5.10, due to loose rock)").
//       Copying those in would commit the prose-in-a-display-field defect CLAUDE.md records for
//       season, grade and the bivy chips, and relying on shortGrade() to clean it up at render time is
//       storing the defect and hoping. Those 20 need the qualifier re-homed to a prose column first.
//       A trailing R/X protection rating IS allowed, because the column already carries them
//       (wa_the_cave_route "5.8 R", wa_direct_west_face "5.10+ R") — the convention was read off the
//       column, not invented. Clean set: 109, longest 9 chars, against a populated-column p90 of 5.
//
// Read-only by default. Pass --apply to write.
import { gradeNumFrom } from "../../lib/grade.js";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();   // fail loudly rather than degrading to the anon key, which PATCHes 200-with-[]

const CLEAN = /^\s*(?:5\.\d+[a-dA-D]?[+-]?|Class\s*\d(?:-\d)?|WI\s*\d\+?|AI\s*\d\+?|M\d\+?)\s*(?:[/-]\s*5\.\d+[a-dA-D]?[+-]?)?\s*(?:[RX])?\s*$/;
const isV = (g) => /^\s*V\s*[-0-9]/i.test(String(g || ""));
const SIBS = ["rock_grade", "alpine_grade", "ice_grade"];

// HELD BACK — a class-1 write makes grade_num agree with the row's grade STRING, so it is premature
// where the audit has already established the string itself is wrong: the route would then surface in
// searches at a grade research has refuted, rather than merely being unsortable. Cross-checked against
// findings.jsonl for `wrong` findings on the grade STRING (not on grade_num, which IS this defect, and
// not on rock_grade/alpine_grade, which are different columns). Exactly one row qualifies.
// A stale entry fails, so this list cannot rot into a description of a row that has since been fixed.
const HOLD = {
  wa_devore_peak_west_ridge:
    "grade \"Class 2-3\" is itself wrong - Wikipedia and the Mountaineers both give the easiest route as "
    + "Class 4, and the row's own rock_grade, pitch_detail, rope_note and rack all agree with them. "
    + "Fix the string and the number together as a research repair; do not make 0 -> 2 here.",
};

const rows = await selectAll("routes",
  "id,grade,grade_num,grade_system,rock_grade,alpine_grade,ice_grade", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [];
for (const r of rows) {
  const blank = r.grade == null || String(r.grade).trim() === "";

  // CLASS 1 — recompute grade_num from the row's own grade string, using the app's own parser.
  if (!blank && r.grade_num === 0 && !isV(r.grade)) {
    let p; try { p = gradeNumFrom(r.grade, r.grade_system); } catch { p = null; }
    if (typeof p === "number" && p !== 0 && !HOLD[r.id])
      plan.push({ cls: 1, id: r.id, col: "grade_num", from: 0, to: p,
                  why: `gradeNumFrom(${JSON.stringify(r.grade)}) = ${p}`,
                  premise: { grade: r.grade, grade_num: 0 } });
  }

  // CLASS 2 — fill a blank grade from a sibling column of the same row.
  if (blank && typeof r.grade_num === "number") {
    const sib = SIBS.map(c => [c, r[c]]).find(([, v]) => typeof v === "string" && v.trim() !== "");
    if (sib) {
      const v = sib[1].trim();
      let p; try { p = gradeNumFrom(v, r.grade_system); } catch { p = null; }
      const agrees = typeof p === "number" && Math.abs(p - r.grade_num) < 0.001;
      if (agrees && CLEAN.test(v))
        plan.push({ cls: 2, id: r.id, col: "grade", from: r.grade, to: v,
                    why: `copied from ${sib[0]}; parses back to the stored grade_num ${r.grade_num}`,
                    premise: { grade_num: r.grade_num, [sib[0]]: sib[1] } });
    }
  }
}

// A HOLD entry is a claim about a row. Fail if it has stopped being true rather than carrying it forever.
for (const [id, why] of Object.entries(HOLD)) {
  const r = rows.find(x => x.id === id);
  if (!r) { console.error(`STALE HOLD: ${id} is no longer in the catalog`); process.exit(1); }
  let p; try { p = gradeNumFrom(r.grade, r.grade_system); } catch { p = null; }
  const qualifies = r.grade_num === 0 && typeof r.grade === "string" && r.grade.trim() !== ""
    && !isV(r.grade) && typeof p === "number" && p !== 0;
  if (!qualifies) { console.error(`STALE HOLD: ${id} no longer needs a class-1 write - drop the entry.\n  reason on file: ${why}`); process.exit(1); }
  console.log(`HELD BACK  ${id}: ${why}`);
}

const c1 = plan.filter(p => p.cls === 1), c2 = plan.filter(p => p.cls === 2);
console.log(`\nclass 1 (grade_num 0 -> parser value): ${c1.length}`);
console.log(`class 2 (blank grade <- sibling column): ${c2.length}`);
console.log(`total writes planned: ${plan.length}\n`);
for (const p of plan)
  console.log(`  [${p.cls}] ${p.id.padEnd(46)} ${p.col.padEnd(9)} ${JSON.stringify(p.from)} -> ${JSON.stringify(p.to)}`);

if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

// ---- APPLY -----------------------------------------------------------------------------
// Re-assert the premise against the LIVE row before each write, so a row that has changed since the
// read is refused rather than overwritten with a stale conclusion.
let wrote = 0, refused = 0;
const live = new Map((await selectAll("routes",
  "id,grade,grade_num,grade_system,rock_grade,alpine_grade,ice_grade", "id=like.wa_*", { pageSize: 1000 }))
  .map(r => [r.id, r]));

for (const p of plan) {
  const r = live.get(p.id);
  if (!r) { console.log(`  REFUSED ${p.id}: row not found`); refused++; continue; }
  const stale = Object.entries(p.premise).find(([k, v]) => JSON.stringify(r[k]) !== JSON.stringify(v));
  if (stale) {
    console.log(`  REFUSED ${p.id}: ${stale[0]} is now ${JSON.stringify(r[stale[0]])}, expected ${JSON.stringify(stale[1])}`);
    refused++; continue;
  }
  await patchRow("routes", p.id, { [p.col]: p.to });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

// ---- VERIFY ----------------------------------------------------------------------------
// A 200 is not evidence the data changed. Re-read and reconcile against what was planned.
const after = new Map((await selectAll("routes", "id,grade,grade_num", "id=like.wa_*", { pageSize: 1000 }))
  .map(r => [r.id, r]));
let ok = 0; const bad = [];
for (const p of plan) {
  const r = after.get(p.id);
  if (r && JSON.stringify(r[p.col]) === JSON.stringify(p.to)) ok++; else bad.push(p.id);
}
console.log(`verified ${ok} of ${plan.length}${bad.length ? `; NOT applied: ${bad.join(", ")}` : ""}`);

// The whole point of class 1 is that 0 stops sorting below the catalog. Assert the class is now empty.
const left = [...after.values()].filter(r =>
  r.grade_num === 0 && typeof r.grade === "string" && r.grade.trim() !== "" && !isV(r.grade) &&
  (() => { try { const p = gradeNumFrom(r.grade); return typeof p === "number" && p !== 0; } catch { return false; } })());
console.log(`class 1 remaining after the run: ${left.length}${left.length ? ` (${left.map(r=>r.id).join(", ")})` : ""}`);
