// `carriesClimbingGrade` is a SECOND list of grade shapes, and this repo has paid four times over
// for a second copy of a grade rule. This measures it against the one that already exists.
//
// It is not `gradeNumFrom`, deliberately: that parser has a last-resort branch scoring a bare roman
// numeral, so a commitment-only route still SORTS among the catalog rather than falling behind all
// of it. Right for sorting; exactly the case display has to reject. So the two are ALLOWED to
// disagree — but only there, and this run is what says so rather than the comment beside them.
//
// TWO DIRECTIONS, and only one of them is checkable as a hard rule:
//   A. carriesClimbingGrade(v) => gradeNumFrom(v, "m") ?? gradeNumFrom(v, null) != null.   ASSERTED.
//      If the display list claims a grade the sortable parser cannot read, one of them has drifted.
//   B. gradeNumFrom(v, "m") ?? gradeNumFrom(v, null) != null && !carriesClimbingGrade(v).  REPORTED, not asserted.
//      This is the intended disagreement. Every value here should be a bare commitment numeral;
//      anything else is a shape the display list has not learned, and is a reading list.
import { carriesClimbingGrade, gradeNumFrom } from "../../lib/grade.js";
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,grade,rock_grade,ice_grade,alpine_grade,commitment", "", { pageSize: 1000 });
if (rows.length < 200000) { console.error("FAIL: read " + rows.length + " routes — that is not the catalog, so nothing below is a sweep"); process.exit(1); }

const vals = new Set();
for (const r of rows) for (const k of ["grade", "rock_grade", "ice_grade", "alpine_grade", "commitment"]) {
  const v = r[k]; if (v != null && String(v).trim() !== "") vals.add(String(v).trim());
}
if (vals.size < 200) { console.error("FAIL: only " + vals.size + " distinct grade values — the extraction is broken"); process.exit(1); }

/* A value LEADS with a roman numeral. Not anchored at the end: the catalog writes commitment
   grades with a trailing qualifier — "III/IV (route-dependent)", "V-easy", "I (glacier crossing on
   approach)" — and those are the same intended disagreement, not a surprise. */
const SYSTEMS = [null, "yds", "v", "wi", "m", "aid", "class"];
const ROMAN = /^(?:Grade\s+)?[IVX]+(?:\s*[-–—/+?]\s*(?:[IVX]+)?)?\b/i;
const claimsUnreadable = [], disagreeNotRoman = [];
let romanOnly = 0, both = 0, neither = 0;
for (const v of vals) {
  /* UNDER ANY SYSTEM. gradeNumFrom is system-aware and the app always calls it through
   gradeNumFor(grade, discipline), which supplies one; a bare "M5" is unreadable with a null
   system and reads fine as "m". Comparing against the null-system call alone accuses the display
   list of drift over eight mixed grades that the app parses correctly — which is what the first
   run of this script did. */
const n = SYSTEMS.some((sys) => gradeNumFrom(v, sys) != null);
  const c = carriesClimbingGrade(v);
  if (c && !n) claimsUnreadable.push(v);
  else if (!c && n) { if (ROMAN.test(v)) romanOnly++; else disagreeNotRoman.push(v); }
  else if (c && n) both++; else neither++;
}
console.log("distinct grade values in the catalog : " + vals.size);
console.log("  both agree it is a climbing grade  : " + both);
console.log("  both agree it is not              : " + neither);
console.log("  sortable ONLY, and roman-shaped    : " + romanOnly + "   (the intended disagreement)");
console.log("  sortable ONLY, NOT roman-shaped    : " + disagreeNotRoman.length + "   (a reading list)");
console.log("  display claims a grade the parser cannot read : " + claimsUnreadable.length);
console.log("");
if (disagreeNotRoman.length) {
  console.log("Values the sortable parser reads and the display list does not call a climbing grade:");
  for (const v of disagreeNotRoman.slice(0, 40)) console.log("  " + JSON.stringify(v) + "  -> grade_num " + gradeNumFrom(v, "m") ?? gradeNumFrom(v, null));
  if (disagreeNotRoman.length > 40) console.log("  ...and " + (disagreeNotRoman.length - 40) + " more");
  console.log("");
}
if (claimsUnreadable.length) {
  console.error("FAIL — the display vocabulary claims a climbing grade that gradeNumFrom cannot read:");
  for (const v of claimsUnreadable.slice(0, 30)) console.error("  " + JSON.stringify(v));
  console.error("\nOne of the two lists has drifted. They are allowed to disagree only about a bare roman numeral.");
  process.exit(1);
}
console.log("ok — every value the display list calls a climbing grade is one gradeNumFrom can read.");
