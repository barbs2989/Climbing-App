// One grade parser, not five.
//
// `routes.grade_num` is the sortable grade: both finder RPCs rank and filter on it, and a
// wrong value is invisible — the route simply sits in the wrong place in a list nobody
// cross-checks. The arithmetic that produces it existed FOUR times (load-state.mjs,
// load-wa-rock-safe.mjs, import-alpine.mjs, oneoff/import-class2-3-routes.mjs) and had
// already drifted into THREE distinct behaviours: three agreed, the oneoff returned 5.1 for
// "5.10" where the catalog convention is 10, and not one of them handled a bare ordinal
// ("4th", "Easy 5th") that the live column nonetheless had right.
//
// They now all import `gradeNumFrom` from lib/grade.js. This guard exists because that is a
// convention, and a convention is exactly what [[semantic-invariants-need-a-script]] says
// will rot: re-inlining the function is valid JS that no other gate can see, and the next
// person to add an importer will copy whatever is nearest.
//
// Static, no DB, no browser — so it sits in `npm run build`.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_OF_TRUTH = "lib/grade.js";

// Walk rather than name files, so a NEW importer is covered without editing this guard.
const SKIP = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "supabase"]);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") && e.name !== ".github") continue;
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(mjs|js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
// Fail closed: an empty walk makes "no second parser" the trivially true answer, which is
// the vacuous pass this repo keeps catching (see guard-sources.mjs).
if (files.length < 20) {
  console.error(`check:grade-parser: only ${files.length} source files found — the walk is broken, refusing to report a clean result`);
  process.exit(1);
}

const truth = path.join(ROOT, SOURCE_OF_TRUTH);
if (!fs.existsSync(truth)) {
  console.error(`check:grade-parser: ${SOURCE_OF_TRUTH} does not exist — the single source is gone`);
  process.exit(1);
}
if (!/export function gradeNumFrom\s*\(/.test(fs.readFileSync(truth, "utf8"))) {
  console.error(`check:grade-parser: ${SOURCE_OF_TRUTH} no longer exports gradeNumFrom — every importer is broken`);
  process.exit(1);
}

/* What a second implementation looks like. Deliberately NOT "the word gradeNum appears":
   every importer mentions it, and the verification scripts name it in prose. The signal is a
   DECLARATION — `function gradeNum(`, `const gradeNum =`, or an arrow bound to that name. */
const DECL = [
  /\bfunction\s+gradeNum\w*\s*\(/,
  /\b(?:const|let|var)\s+gradeNum\w*\s*=\s*(?:function\b|\()/,
];

const offenders = [];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  if (rel === SOURCE_OF_TRUTH) continue;
  // The equivalence checker holds a verbatim copy ON PURPOSE — its whole job is to be a
  // second opinion, and importing the function under test would make it vacuous. It is named
  // explicitly rather than pattern-matched, so the exemption cannot quietly widen.
  if (rel === "scripts/oneoff/verify-grade-parser-equivalence.mjs") continue;
  // This file has to SAY `function gradeNum(` to explain itself, and did in fact flag itself
  // on the first run.
  if (rel === "scripts/check-grade-parser.mjs") continue;
  const src = fs.readFileSync(f, "utf8");
  // Match per LINE, skipping comment lines, so prose that merely mentions the pattern is
  // safe. Deliberately not the comment/string blanker other guards use: that one eats real
  // code when a string contains "//" (a URL), and this needs no string awareness — a
  // declaration is never inside a string literal.
  const lines = src.split("\n");
  let hit = null;
  for (let i = 0; i < lines.length && !hit; i++) {
    const t = lines[i].trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;
    for (const re of DECL) {
      const m = t.match(re);
      if (m) { hit = { rel, line: i + 1, text: m[0].trim() }; break; }
    }
  }
  if (hit) offenders.push(hit);
}

if (offenders.length) {
  console.error("check:grade-parser FAILED — grade_num is parsed in more than one place:\n");
  for (const o of offenders) console.error(`  ${o.rel}:${o.line}  ${o.text}`);
  console.error(`\nImport it instead:  import { gradeNumFrom } from "<rel>/${SOURCE_OF_TRUTH}";`);
  console.error("Four copies had already drifted into three behaviours before they were collapsed.");
  process.exit(1);
}

const importers = files.filter(f => /from\s+["'][^"']*lib\/grade(?:\.js)?["']/.test(fs.readFileSync(f, "utf8"))).length;
console.log(`check:grade-parser: ok — one parser in ${SOURCE_OF_TRUTH}, ${importers} importer(s), ${files.length} files scanned.`);

/* Injection tests (run by hand; each must FAIL):
   1. Paste `function gradeNum(g, s) { return null; }` into scripts/pipeline/load-state.mjs
      -> fails naming that file and line.
   2. `const gradeNumX = function (g, s) { return 1; }` in any scanned file -> fails.
   3. Rename lib/grade.js's export -> fails with "no longer exports gradeNumFrom".
   4. Add every directory to SKIP -> fails with "the walk is broken" rather than passing. */
