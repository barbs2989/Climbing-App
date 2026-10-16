// The last client-side link in the add-a-route chain: RouteProposals.jsx calls
//   approveNewRoute(id, gradeNumFor(v.grade, v.discipline))
// so `grade_num` — the column BOTH finder RPCs rank and filter on (0018/0019) — is computed
// in JS from the proposal and passed into the SQL. A wrong number here is invisible: the route
// simply sits in the wrong place in a list nobody cross-checks.
//
// Two things worth testing separately, because they fail differently:
//   1. Does every discipline the FORM can emit map to a grading system? AddRoute offers
//      ["rock","ice","mixed","aid","alpine","mountaineering","scrambling"] and derives
//      disc = cat==="rock" ? (sub==="bouldering"?"bouldering":"rock") : cat. If a value the
//      form emits is unknown to gradeSystemForDiscipline it returns null, gradeNumFrom falls
//      through to its generic branches, and the answer is right by luck or wrong quietly.
//   2. Does the number come out right for grades a climber would actually type?
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-gn-")), "g.cjs");
await build({
  entryPoints: [path.join(ROOT, "lib", "grade.js")],
  bundle: true, format: "cjs", platform: "node", outfile: out, logLevel: "error",
});
const { gradeNumFor, gradeSystemForDiscipline } = require_(out);

let bad = 0;
const check = (label, got, want) => {
  const ok = got === want || (got != null && want != null && Math.abs(got - want) < 1e-9);
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label.padEnd(46)} -> ${got}${ok ? "" : `   expected ${want}`}`);
};

// 1. every discipline AddRoute can emit resolves to a system
console.log("discipline -> grading system (all values AddRoute can emit)");
const FORM_DISCIPLINES = ["rock", "bouldering", "ice", "mixed", "aid", "alpine", "mountaineering", "scrambling"];
for (const d of FORM_DISCIPLINES) {
  const sys = gradeSystemForDiscipline(d);
  if (!sys) { bad++; console.log(`  FAIL  ${d.padEnd(16)} -> null  (unknown to the mapper)`); }
  else console.log(`  ok    ${d.padEnd(16)} -> ${sys}`);
}

// 2. realistic grades per discipline
console.log("\ngradeNumFor(grade, discipline)");
check("rock / 5.9",                     gradeNumFor("5.9", "rock"), 9);
check("rock / 5.10a",                   gradeNumFor("5.10a", "rock"), 10.25);
// The letter is a QUARTER, with d = a full step: a .25, b .5, c .75, d 1.0. So 5.11d is 12,
// not 11.75 — I expected 11.75 first and the code was right. Ordering still holds
// (5.11c 11.75 < 5.11d 12 < 5.12a 12.25), which is all the finder RPCs need. The cost is that
// 5.11d and a bare "5.12" collide on 12; that is inherited verbatim from load-state.mjs and
// is catalog-wide, so it is the convention, not a bug to fix in this one caller.
check("rock / 5.11d  (d is a FULL step)", gradeNumFor("5.11d", "rock"), 12);
check("rock / 5.11c",                   gradeNumFor("5.11c", "rock"), 11.75);
check("rock / 5.12a  (still above 11d)", gradeNumFor("5.12a", "rock"), 12.25);
check("bouldering / V4",                gradeNumFor("V4", "bouldering"), 4);
check("bouldering / V10",               gradeNumFor("V10", "bouldering"), 10);
check("ice / WI3",                      gradeNumFor("WI3", "ice"), 3);
check("mixed / M6",                     gradeNumFor("M6", "mixed"), 6);
check("aid / A2",                       gradeNumFor("A2", "aid"), 2);
check("alpine / 5.6",                   gradeNumFor("5.6", "alpine"), 6);
check("mountaineering / Class 3",       gradeNumFor("Class 3", "mountaineering"), 3);
check("scrambling / Class 4",           gradeNumFor("Class 4", "scrambling"), 4);

// the shape the comment above gradeNumFor is about: a commitment grade FOLLOWED by a
// technical one. Pre-cutting with shortGrade() threw the technical grade away.
check("alpine / 'Grade III, 5.4'",      gradeNumFor("Grade III, 5.4", "alpine"), 4);

// empty / junk must be null, never 0 — a 0 would sort a route below every real grade
check("empty string",                   gradeNumFor("", "rock"), null);
check("null grade",                     gradeNumFor(null, "rock"), null);
check("unparseable prose",              gradeNumFor("moderate", "rock"), null);
check("no discipline chosen",           gradeNumFor("5.9", ""), 9);

// The comment above gradeNumFor claimed a bare ordinal "scores null here because the ordinal
// branch requires the word class". That was true when it was written and is NOT true now —
// gradeNumFrom grew a dedicated bare-ordinal branch afterwards. Asserted rather than printed,
// so the comment cannot rot back into disagreeing with the code.
console.log("\nbare ordinals (the stale-comment case)");
check("mountaineering / 4th",           gradeNumFor("4th", "mountaineering"), 4);
check("mountaineering / 3rd",           gradeNumFor("3rd", "mountaineering"), 3);
check("mountaineering / 'Easy 5th'",    gradeNumFor("Easy 5th", "mountaineering"), 5);

console.log(`\n${bad === 0 ? "all checks passed" : bad + " FAILURE(S)"}`);
process.exit(bad === 0 ? 0 : 1);
