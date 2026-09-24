// Proves the route finder's grade-range options sit on the SAME number line as the parser that
// fills routes.grade_num. The options are lifted out of lib/DbAreaBrowser.jsx (ANCHOR LOST if
// they move) rather than retyped — a copy would agree with itself whatever the app did.
//
// For every option [label, lo, hi]: the grade_num gradeNumFrom assigns to that label must lie in
// [lo, hi], or a range "5.10a to 5.10a" would exclude the 5.10a routes it names. It also checks the
// bare-number case (a stored "5.10" must fall inside the 5.10a..5.10d band), that options are in
// ascending order (the From/To pickers slice the list by index), and that the two mixed-scale
// disciplines are refused. No browser, no database.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { gradeNumFrom, gradeSystemForDiscipline } from "../../lib/grade.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "lib/DbAreaBrowser.jsx"), "utf8");
const a = src.indexOf("const GRADE_SCALES = (() => {");
const b = src.indexOf("const gradeRangeLabel");
if (a < 0 || b < 0 || b < a) { console.error("ANCHOR LOST: GRADE_SCALES / gradeRangeLabel moved in lib/DbAreaBrowser.jsx"); process.exit(1); }
const block = src.slice(a, b).replace(/\/\/[^\n]*\n/g, "\n");
const { GRADE_SCALES, gradeScaleFor, gradeScalesFor, GRADE_SYS_FILTERED } = new Function("gradeSystemForDiscipline", block + "\nreturn { GRADE_SCALES, gradeScaleFor, gradeScalesFor, GRADE_SYS_FILTERED };")(gradeSystemForDiscipline);

let fails = 0, ran = 0;
const ok = (cond, msg) => { ran++; if (!cond) { fails++; console.log("FAIL  " + msg); } };

for (const [sys, opts] of Object.entries(GRADE_SCALES)) {
  ok(opts.length >= 5, sys + ": scale has at least 5 options (got " + opts.length + ")");
  for (let i = 0; i < opts.length; i++) {
    const [label, lo, hi] = opts[i];
    const gn = gradeNumFrom(label, sys);
    ok(gn != null && gn >= lo && gn <= hi, sys + " " + label + ": parser gives " + gn + ", option covers [" + lo + ", " + hi + "]");
    if (i) ok(lo >= opts[i - 1][1] && hi > opts[i - 1][2], sys + ": " + label + " sorts after " + opts[i - 1][0]);
  }
}
// A grade written without a letter must land in its number band, not below it.
const yds = GRADE_SCALES.yds, at = l => yds.find(o => o[0] === l);
for (const n of [10, 11, 12, 13]) {
  const gn = gradeNumFrom("5." + n, "yds");
  ok(gn >= at("5." + n + "a")[1] && gn <= at("5." + n + "d")[2], "bare 5." + n + " (" + gn + ") falls inside the 5." + n + "a–5." + n + "d range");
}
// Every discipline the finder lists either has a scale or is deliberately refused.
const want = { sport: "yds", trad: "yds", rock: "yds", bouldering: "v", scrambling: "class", aid: "aid,yds", mixed: "m,yds", ice: "wi,yds" };
for (const [d, s] of Object.entries(want)) ok(gradeScalesFor(d).join(",") === s && Array.isArray(gradeScaleFor(d)), d + ": offers " + s + " (got " + gradeScalesFor(d).join(",") + ")");
ok(gradeScaleFor("ice", "yds") === GRADE_SCALES.yds && gradeScaleFor("ice", "wi") === GRADE_SCALES.wi && gradeScaleFor("ice", "bogus") === GRADE_SCALES.wi, "ice: the scale toggle picks the option list, defaulting to WI");
for (const d of ["", "alpine", "mountaineering"]) ok(gradeScaleFor(d) === null, (d || "All") + ": grade range refused (mixed scales / no discipline)");
// Exactly the disciplines 0196 relabelled send grade_sys; the others must not, or a range drops
// rows whose labels were never corrected (41 scrambling "4th" rows are labelled 'yds').
ok(Object.keys(GRADE_SYS_FILTERED).sort().join(",") === "aid,ice,mixed", "grade_sys is sent for aid/ice/mixed only");
const mig = fs.readFileSync(path.join(ROOT, "supabase/migrations/0196_route_finder_grade_scale.sql"), "utf8");
ok(/discipline in \('ice', 'mixed', 'aid'\)/.test(mig), "0196 relabels the same three disciplines the sheet filters on");

if (ran < 100) { console.error("FAIL: only " + ran + " assertions ran — the lift is not exercising the scales"); process.exit(1); }
console.log(fails ? fails + " of " + ran + " failed" : "ok — " + ran + " assertions");
process.exit(fails ? 1 : 0);
