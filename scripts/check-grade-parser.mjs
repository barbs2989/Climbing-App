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
import { fileURLToPath, pathToFileURL } from "url";

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


/* ─────────────────────────────────────────────────────────────────────────────────────────
   SECTION 2 — ONE DISPLAY CHAIN, AND IT MUST NOT SHOW A COMMITMENT GRADE.

   Section 1 is about the SORTABLE grade. This is about the DISPLAYED one, and it is the same
   failure one column over. Which column a route's grade comes from was written out THREE times —
   `gradeLabelRaw` in ClimbMatchCore.jsx, `rowGrade` in lib/DbAreaBrowser.jsx, and a third inside
   `climbRowItem` that THIS SECTION found on its first run, before it shipped — as
   `rock_grade || ice_grade || alpine_grade || grade || commitment`. All three agreed on all 8,365
   WA rows, which is what a hand-copy looks like before it drifts, and all three were wrong in the
   same way: 274 of the 517 routes carrying an `alpine_grade` hold a bare NCCS roman numeral,
   which is a COMMITMENT grade rather than a difficulty, and on 30 of them nothing shadowed it.
   Slesse Mountain's NE Buttress showed "V" in the header pill while the CRUX GRADE tile below
   it showed "5.9 A2" — one screen stating the route's grade twice and disagreeing with itself,
   the sentence cruxGrade()'s own note in lib/grade.js opens with.

   TWO RULES, because a stale-base squash can take either half on its own. Rule A forbids the
   chain being written again anywhere. Rule B EXECUTES displayGrade() over fixtures and asserts
   the two call sites still route through it — restoring `gradeLabel(r) = shortGrade(
   gradeLabelRaw(r))` reinstates the whole defect while leaving exactly one chain in the tree,
   so rule A cannot see it.

   Static: the fixtures are constructed here, and the live-catalog half — 20 rows move, none
   loses its grade, and the labelled ALPINE pill survives — is
   `scripts/oneoff/probe-grade-pill-is-not-a-commitment-grade.mjs`, which needs the database. */

/* SCOPED TO WHAT RENDERS, and the scope is the point twice over. A displayed-grade chain only
   matters where a climber reads the result, both copies lived here, and a third would too;
   `scripts/oneoff/` is excluded on the precedent check:screen-lists sets — a one-off probe is
   scoped to whatever it was written to measure, and three throwaway query scripts do print
   several grade columns with `||` while promising nobody anything. */
const RENDER_FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
  .concat(fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.(?:jsx|js)$/.test(f)).map(f => "lib/" + f))
  .filter(rel => rel !== SOURCE_OF_TRUTH && fs.existsSync(path.join(ROOT, rel)));
if (RENDER_FILES.length < 5) {
  console.error(`check:grade-parser: only ${RENDER_FILES.length} rendering source(s) found — the scan is broken, not the tree`);
  process.exit(1);
}
// Canonical, so the TWO SPELLINGS of one column do not read as two columns: RouteDetail's
// COMPOSITE GRADE block is `route.alpineGrade || route.alpine_grade`, which is correct code and
// must never be reported.
const COL_RE = /\.\s*(rock_grade|rockGrade|ice_grade|iceGrade|alpine_grade|alpineGrade|commitment|grade)\b/g;
const canon = (c) => c.toLowerCase().replace(/_/g, "");
const chainOffenders = [];
for (const rel of RENDER_FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  for (const [i, raw] of src.split("\n").entries()) {
    /* Comments are stripped because this guard's own explanation, and the notes beside both
       repaired call sites, quote the forbidden chain in prose. A guard that fails on its own
       documentation is a trap the next author works around rather than reads. */
    const line = raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/, "");
    if (!line.includes("||")) continue;
    /* A LINE IS NOT A SCOPE IN THIS CODEBASE — these files pack a whole component onto one
       physical line, so `var ag=…||…,rg=…||…` puts four columns on one line in four separate,
       correct expressions. Segment on the delimiters that end an expression, then ask each
       segment on its own. */
    for (const seg of line.split(/[,;(){}?:]/)) {
      if (!seg.includes("||")) continue;
      const cols = new Set([...seg.matchAll(COL_RE)].map(m => canon(m[1])));
      if (cols.size < 2) continue;
      chainOffenders.push({ rel, line: i + 1, cols: [...cols].join(", "), text: seg.trim().slice(0, 110) });
    }
  }
}
if (chainOffenders.length) {
  console.error("check:grade-parser FAILED — the displayed-grade column chain is written more than once:\n");
  for (const o of chainOffenders) console.error(`  ${o.rel}:${o.line}  [${o.cols}]  ${o.text}`);
  console.error(`\nImport it instead:  import { displayGrade } from "<rel>/${SOURCE_OF_TRUTH}";`);
  console.error("Every copy of this chain showed a COMMITMENT grade as the route's grade on 30 routes.");
  process.exit(1);
}

// Rule B. Execute the real function; a claim about a chain is not a claim about what it picks.
const { displayGrade } = await import(pathToFileURL(truth).href);
if (typeof displayGrade !== "function") {
  console.error(`check:grade-parser: ${SOURCE_OF_TRUTH} no longer exports displayGrade — the grade pill has no resolver`);
  process.exit(1);
}
/* Every case is a real catalog shape. The two that must NOT move are the load-bearing half: a
   rule that only ever replaces a roman numeral is satisfied by deleting the commitment grade
   from the app, and a route whose record holds nothing else must still show it. */
const CASES = [
  [{ alpine_grade: "V", grade: "5.9 A2" }, "5.9 A2", "a bare NCCS roman loses to a rock grade"],
  [{ alpine_grade: "Grade II", grade: "Grade II, Class 3, glacier" }, "Class 3", "...and the compound remainder is promoted, as on the crux tile"],
  [{ alpine_grade: "II", grade: "Class 2, Glacier" }, "Class 2", "...and a class grade wins too"],
  [{ alpineGrade: "V", grade: "5.6" }, "5.6", "camelCase reads the same as snake_case"],
  [{ alpine_grade: "PD+", grade: "Class 3" }, "PD+", "a FRENCH alpine grade is a real difficulty and must keep winning"],
  [{ rock_grade: "5.10a", alpine_grade: "IV" }, "5.10a", "an ordinary route is untouched"],
  [{ alpine_grade: "III", grade: "Grade II–III glacier", commitment: "II" }, "III", "MUST NOT MOVE: no column carries a climbing grade"],
  [{ alpine_grade: "II", commitment: "II" }, "II", "MUST NOT MOVE: a commitment grade is all the record has"],
  [{}, "", "no grade at all resolves to nothing, not to a stray"],
];
let ran = 0;
for (const [route, want, why] of CASES) {
  const got = displayGrade(route);
  ran++;
  if (got !== want) {
    console.error(`check:grade-parser FAILED — displayGrade(${JSON.stringify(route)}) returned ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    console.error(`  ${why}`);
    process.exit(1);
  }
}
if (ran < CASES.length) { console.error("check:grade-parser: fewer cases ran than exist — a guard that quietly stops asking still exits 0"); process.exit(1); }

/* THE WIRING, as source. Executing displayGrade proves the rule and NOT that the two surfaces
   still call it — and those are the exact two lines a stale-base squash restores. */
for (const [rel, needle, what] of [
  ["ClimbMatchCore.jsx", /function gradeLabel\s*\(r\)\s*\{\s*return\s+displayGrade\(r\)/, "the route page's header pill and stat strip"],
  ["lib/DbAreaBrowser.jsx", /function rowGrade\s*\(r\)\s*\{\s*return\s+displayGrade\(r\)/, "every row of an area list"],
]) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.error(`check:grade-parser: ${rel} does not exist`); process.exit(1); }
  if (!needle.test(fs.readFileSync(p, "utf8"))) {
    console.error(`check:grade-parser FAILED — ${rel} no longer resolves its grade through displayGrade().`);
    console.error(`  That is ${what}. Without it the chain is back to showing whichever column has`);
    console.error("  anything in it, which on 30 routes is a bare commitment numeral.");
    process.exit(1);
  }
}

const importers = files.filter(f => /from\s+["'][^"']*lib\/grade(?:\.js)?["']/.test(fs.readFileSync(f, "utf8"))).length;
console.log(`check:grade-parser: ok — one parser and one display chain in ${SOURCE_OF_TRUTH}, ${importers} importer(s), ${ran} display cases, ${files.length} files scanned, ${RENDER_FILES.length} rendering.`);

/* Injection tests (run by hand; each must FAIL):
   1. Paste `function gradeNum(g, s) { return null; }` into scripts/pipeline/load-state.mjs
      -> fails naming that file and line.
   2. `const gradeNumX = function (g, s) { return 1; }` in any scanned file -> fails.
   3. Rename lib/grade.js's export -> fails with "no longer exports gradeNumFrom".
   4. Add every directory to SKIP -> fails with "the walk is broken" rather than passing. */
