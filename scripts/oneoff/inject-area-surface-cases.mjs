// Injection harness for check:area-surfaces. Every case proves its edit LANDED by checksum before
// the guard is believed — "the injection logged, the counter didn't move" is the shape this repo
// keeps recording, and a case that never modified the file reads as a guard that missed.
//
// The files are restored byte-identically afterwards and that is asserted, not hoped for.
//
// EACH CASE IS JUDGED ON THE GUARD'S OWN PROBLEM LINE, NEVER ON THE EXIT CODE. Until 2026-09-10
// this harness ran the guard with `stdio: "pipe"` and DISCARDED the output — `catch { failed =
// true; }` — so all six failing cases, which cut six different links, were scored identically as
// "the guard exited 1". That is the rule this repo records as *an injection that produces a
// different failure is not a catch*, and check:area-surfaces has a fail-CLOSED branch that also
// exits 1 saying "Nothing below was actually checked", so a case that merely truncated the source
// would have read `ok`.
//
// It was LATENT rather than live: measured on 2026-09-10, all six cases fired exactly their own
// rule and exactly one rule each. What was missing was the harness's ability to TELL — so the day
// a case's edit starts tripping a neighbouring rule, or the guard grows another closed path, this
// says so instead of printing a clean sweep.
//
// EXACTLY ONE problem is required, not "mine is among them": a case that trips its own rule AND
// something else is not a clean attribution either, and demanding one is what makes the fail-closed
// branch visible.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const BROWSER = path.join(ROOT, "lib/DbAreaBrowser.jsx");
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 12);

const CASES = [
  { name: "fetch: drop areaCommentTargets from useComments", file: APP, expect: "fail",
    find: ".concat(areaCommentTargets)", repl: "",
    says: /no longer includes areaCommentTargets/,
    why: "the section would render an empty box for ever — with `comments` at 0 rows that is indistinguishable from a feature nobody has used" },
  { name: "render: ungate the comments section", file: APP, expect: "fail",
    find: "areaCommentTargets.length?<div style={{marginTop:4}}><Comments", repl: "false?<div style={{marginTop:4}}><Comments",
    says: /no longer gated on `areaCommentTargets\.length`/,
    why: "the section disappears while the fetch keeps running" },
  { name: "scope: let world/country/state be discussed", file: APP, expect: "fail",
    find: '!["world","country","state"].includes(dbAreaCtx.areaType)', repl: "true",
    says: /no longer exclude world\/country\/state/,
    why: "a continent is not a conversation" },
  { name: "directions: remove the link", file: BROWSER, expect: "fail",
    find: "https://www.google.com/maps/dir/?api=1&destination=", repl: "about:blank#",
    says: /Directions link is gone from lib\/DbAreaBrowser\.jsx/,
    why: "a climber cannot navigate to a crag again" },
  { name: "directions: ungate area_type", file: BROWSER, expect: "fail",
    find: '["crag", "peak", "wall"].includes(area.area_type) && ', repl: "",
    says: /no longer gated on area_type/,
    why: "every area has a coordinate, so this offers directions to a state centroid" },
  { name: "caveat: stop mentioning the link", file: BROWSER, expect: "fail",
    find: ", any distance shown, and the Directions link are rough", repl: " and any distance shown are rough",
    says: /coords_approx caveat no longer mentions the Directions link/,
    why: "an approximate coordinate offered as a navigable destination with no warning" },
  // MUST PASS: reordering the concat is not a regression. A guard that demanded one spelling would
  // tell an author to rewrite working code, which is how a guard earns being ignored.
  { name: "reorder the concat (must PASS)", file: APP, expect: "pass",
    find: "commentTargets.concat(gpCommentTargets).concat(areaCommentTargets)",
    repl: "areaCommentTargets.concat(commentTargets).concat(gpCommentTargets)",
    why: "order does not change which ids are fetched" },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  if (!before.includes(c.find)) {
    console.log(`  BROKEN CASE  ${c.name} — its pattern is not in the file, so it proves nothing`);
    bad++; continue;
  }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  const landed = sum(c.file) !== beforeSum;
  let failed = false, out = "";
  try { out = execFileSync("node", [path.join(ROOT, "scripts/check-area-surfaces.mjs")], { cwd: ROOT, encoding: "utf8", stdio: "pipe" }); }
  catch (e) { failed = true; out = `${e.stdout ?? ""}${e.stderr ?? ""}`; }
  fs.writeFileSync(c.file, before);
  const restored = sum(c.file) === beforeSum;

  // The guard prints one "  - <sentence>" per problem. Judging on those, rather than on the exit
  // code, is what tells "it caught MY rule" from "it died for some other reason".
  const problems = out.split("\n").filter(l => l.trim().startsWith("- ")).map(l => l.trim().slice(2));
  const closed = /sources look truncated|Nothing below was actually checked/.test(out);

  const want = c.expect === "fail";
  let attributed = true, note = "";
  if (want) {
    if (closed) { attributed = false; note = "the guard hit its FAIL-CLOSED branch — this proves nothing about the rule"; }
    else if (problems.length !== 1) { attributed = false; note = `${problems.length} problem(s) reported — a catch is only attributable when exactly one rule fires`; }
    else if (!c.says.test(problems[0])) { attributed = false; note = `it failed on a DIFFERENT rule: "${problems[0].slice(0, 110)}"`; }
  } else if (problems.length) {
    attributed = false; note = `a case that must PASS reported: "${problems[0].slice(0, 110)}"`;
  }

  const good = landed && restored && failed === want && attributed;
  if (!good) bad++;
  console.log(`  ${good ? "ok  " : "MISS"} ${c.name}`);
  console.log(`         edit landed: ${landed} | guard ${failed ? "FAILED" : "passed"} (wanted ${want ? "FAIL" : "pass"}) | restored: ${restored}${want ? ` | rule named: ${attributed && failed}` : ""}`);
  if (note) console.log(`         ${note}`);
  if (!good) console.log(`         ${c.why}`);
}
console.log(bad ? `\n${bad} case(s) did not behave` : `\nall ${CASES.length} cases behaved`);
process.exit(bad ? 1 : 0);
