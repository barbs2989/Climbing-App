// Injection suite for check:grade-parser's SECOND section — one display chain, and it must not
// show a commitment grade.
//
// Every case proves its edit landed BY CHECKSUM before the guard is believed (checksum movement
// proves an edit happened, not that it was the right one — this repo has read one as the other
// four times), restores the file byte-identically, and is judged on the guard's OWN failure text
// rather than on an exit code: these edits can trip section 1 or a fail-closed path, and "it did
// not catch it", "it failed for another reason" and "my expectation was wrong" are identical from
// an exit status. Any expectation that already appears in the CLEAN run is refused outright.
//
// THREE CASES MUST STAY SILENT, and they are the half that keeps this guard usable: a comment
// quoting the forbidden chain is this guard's own documentation, two SPELLINGS of one column is
// what RouteDetail's COMPOSITE GRADE block correctly does, and a route whose record holds only a
// commitment grade must keep showing it.
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const run = () => {
  try { return execFileSync("node", [path.join(ROOT, "scripts/check-grade-parser.mjs")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) + ""; }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};
const exits = () => { try { execFileSync("node", [path.join(ROOT, "scripts/check-grade-parser.mjs")], { cwd: ROOT, stdio: "ignore" }); return 0; } catch (e) { return e.status == null ? 1 : e.status; } };

const CLEAN = run();
if (exits() !== 0) { console.error("REFUSING TO RUN: check:grade-parser is already failing. A dirty tree makes every case unattributable."); process.exit(1); }

const CASES = [
  { name: "rowgrade-chain-restored", file: "lib/DbAreaBrowser.jsx",
    find: "function rowGrade(r) { return displayGrade(r) || \"—\"; }",
    repl: "function rowGrade(r) { return shortGrade(r.rock_grade || r.ice_grade || r.alpine_grade || r.grade || r.commitment || \"\") || \"—\"; }",
    expect: "the displayed-grade column chain is written more than once", why: "the real second copy, restored verbatim" },

  { name: "header-pill-unwired", file: "ClimbMatchCore.jsx",
    find: "function gradeLabel(r){return displayGrade(r);}",
    repl: "function gradeLabel(r){return shortGrade(gradeLabelRaw(r));}",
    expect: "no longer resolves its grade through displayGrade",
    why: "the whole defect back with ONE chain still in the tree — rule A cannot see this, which is why rule B exists" },

  { name: "rule-gutted", file: "lib/grade.js",
    find: "  for (const v of cands) if (carriesClimbingGrade(v)) return cruxGrade(v);\n",
    repl: "",
    expect: "expected \"5.9 A2\"", why: "displayGrade stops preferring a climbing grade" },

  { name: "french-grade-lost", file: "lib/grade.js",
    find: "  /\\b(?:TD|PD|AD|ED)\\b/, /^\\s*(?:D|F)[+-]?\\s*$/, // French alpine difficulty\n",
    repl: "",
    expect: "expected \"PD+\"", why: "a French alpine grade is a real difficulty; dropping it would blank 155 routes' grades" },

  { name: "export-renamed", file: "lib/grade.js",
    find: "export function displayGrade(route) {",
    repl: "export function displayGradeX(route) {",
    expect: "no longer exports displayGrade", why: "fails CLOSED rather than skipping the section" },

  { name: "SILENT-comment-naming-the-chain", file: "lib/DbAreaBrowser.jsx",
    find: "function rowGrade(r) { return displayGrade(r) || \"—\"; }",
    repl: "// was: r.rock_grade || r.ice_grade || r.alpine_grade || r.grade || r.commitment\nfunction rowGrade(r) { return displayGrade(r) || \"—\"; }",
    silent: true, why: "this guard's own documentation quotes the chain; failing on it is a trap" },

  { name: "SILENT-two-spellings-of-one-column", file: "lib/DbAreaBrowser.jsx",
    find: "function rowGrade(r) { return displayGrade(r) || \"—\"; }",
    repl: "function _rawAlpine(r) { return r.alpineGrade || r.alpine_grade; }\nfunction _rawRock(r) { return r.rockGrade || r.rock_grade; }\nfunction rowGrade(r) { return displayGrade(r) || \"—\"; }",
    silent: true, why: "two SPELLINGS of one column is what RouteDetail's COMPOSITE GRADE block correctly does" },

  { name: "SILENT-commitment-only-route-keeps-it", file: "lib/grade.js",
    find: "  return cands.length ? shortGrade(cands[0]) : \"\";\n}",
    repl: "  return cands.length ? shortGrade(cands[0]) : \"\"; /* nothing better exists */\n}",
    silent: true, why: "a route whose record holds only a commitment grade must still show it" },
];

let pass = 0;
for (const c of CASES) {
  const p = path.join(ROOT, c.file);
  const before = fs.readFileSync(p, "utf8"), h0 = sum(p);
  if (c.expect && CLEAN.includes(c.expect)) { console.log(`  BAD CASE  ${c.name}: its expectation already appears in the CLEAN run, so it proves nothing`); continue; }
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name}: find string matched ${n} times, expected 1`); continue; }
  fs.writeFileSync(p, before.replace(c.find, c.repl));
  const h1 = sum(p);
  let verdict;
  if (h1 === h0) verdict = "EDIT NEVER LANDED";
  else {
    const out = run(), code = exits();
    if (c.silent) verdict = code === 0 ? "ok (silent, as required)" : "FIRED ON CORRECT WORK:\n" + out.split("\n").filter(l => /FAIL|check:grade-parser/.test(l)).slice(0, 3).join("\n");
    else if (code === 0) verdict = "MISSED";
    else verdict = out.includes(c.expect) ? "ok (caught, naming its own defect)" : "WRONG FAILURE — expected " + JSON.stringify(c.expect) + ", got:\n" + out.split("\n").filter(Boolean).slice(-4).join("\n");
  }
  fs.writeFileSync(p, before);
  if (sum(p) !== h0) { console.error(`  TREE NOT RESTORED after ${c.name} — ${c.file} differs. Fix by hand before continuing.`); process.exit(1); }
  console.log(`  ${verdict.startsWith("ok") ? "ok  " : "FAIL"}  ${c.name}: ${verdict}`);
  console.log(`        ${c.why}`);
  if (verdict.startsWith("ok")) pass++;
}
console.log(`\n${pass}/${CASES.length}`);
process.exit(pass === CASES.length ? 0 : 1);
