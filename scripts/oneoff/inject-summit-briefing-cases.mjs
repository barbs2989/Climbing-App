// Injection suite for check:summit-briefing.
//
// The healthy output of that guard is "all 27 assertions passed", which is also what a guard
// asserting nothing prints — so every claim below is judged on the guard's OWN failure text,
// never on an exit code, and each case proves its edit landed by CHECKSUM before the guard is
// believed. `lib/DbAreaBrowser.jsx` is restored byte-identically afterwards and the harness
// says TREE NOT RESTORED rather than exiting 0 on a tree it has damaged.
//
// The two SILENT cases carry as much weight as the rest: a comment quoting the rule, and the
// ALIAS table written in a different order, are both correct work, and a guard that fired on
// either would tell an author to stop touching the file.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const FILE = join(ROOT, "lib/DbAreaBrowser.jsx");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const ORIGINAL = fs.readFileSync(FILE, "utf8");
const BEFORE = sum(ORIGINAL);

const RULE = `  const toks = said.map(v => new Set(normFact(v).split(" ").filter(Boolean)));`;
const PICK = `  said.forEach((v, i) => { if (toks[i].size > toks[bi].size || (toks[i].size === toks[bi].size && v.length > said[bi].length)) bi = i; });`;
const AGREE = `  const agreed = toks.every(s => [...s].every(t => toks[bi].has(t)));`;

const CASES = [
  {
    name: "prefix-rule-restored",
    why: "THE REAL HISTORICAL DEFECT — agreement by prefix is order-sensitive, so Mount Baker's one agency written place-first reads as a disagreement.",
    find: AGREE,
    repl: `  const _l = said.slice().sort((a, b) => b.length - a.length)[0], _n = normFact(_l);\n  const agreed = said.every(v => _n.startsWith(normFact(v)));`,
    expect: "does NOT hedge the land manager where the routes differ only in WORDING",
  },
  {
    name: "always-agrees",
    why: "a rule that never refuses puts one side's permit on a mountain that needs two.",
    find: AGREE,
    repl: `  const agreed = true;`,
    expect: "refuses to name one permit when the routes disagree",
  },
  {
    name: "never-agrees",
    why: "a rule that always refuses withholds every fact the routes DO share.",
    find: AGREE,
    repl: `  const agreed = false;`,
    expect: "does NOT hedge the land manager",
  },
  {
    name: "shows-the-thinnest",
    why: "agreement holding is not enough — the value on screen has to be the fullest, or the page prints the bare agency name over routes that named the forest and the wilderness.",
    find: PICK,
    repl: `  said.forEach((v, i) => { if (toks[i].size < toks[bi].size) bi = i; });`,
    expect: "shows the MOST SPECIFIC of the agreeing land-manager strings",
  },
  {
    name: "SILENT-comment-quoting-the-rule",
    why: "a comment naming the forbidden prefix shape is documentation; a guard flagging it would forbid explaining itself.",
    find: RULE,
    repl: `  // A PREFIX test — normFact(longest).startsWith(normFact(v)) — is what this replaced.\n` + RULE,
    expect: null,
  },
  {
    name: "SILENT-alias-table-reordered",
    why: "the alias table is a set; its order says nothing, and reordering it is ordinary work.",
    find: `const ALIAS = { nw: "northwest",`,
    repl: `const ALIAS = { usa: "us", nw: "northwest",`,
    strip: ` usa: "usa-PLACEHOLDER",`,
    expect: null,
  },
];

let fails = 0;
for (const c of CASES) {
  const src = fs.readFileSync(FILE, "utf8");
  const hits = src.split(c.find).length - 1;
  if (hits !== 1) { console.log(`\n${c.name}: HARNESS BUG — find string matched ${hits} times`); fails++; continue; }
  const mutated = src.replace(c.find, c.repl);
  if (sum(mutated) === sum(src)) { console.log(`\n${c.name}: HARNESS BUG — edit changed nothing`); fails++; continue; }
  fs.writeFileSync(FILE, mutated);
  let out = "";
  try { out = execFileSync("node", [join(ROOT, "scripts/check-summit-briefing.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(FILE, ORIGINAL);

  const failLines = out.split("\n").filter((l) => l.includes("FAIL"));
  console.log(`\n${c.name}  [edit landed: ${sum(src)} -> ${sum(mutated)}]`);
  console.log(`  ${c.why}`);
  if (c.expect === null) {
    if (failLines.length) { console.log(`  MISS — must stay SILENT and fired:\n${failLines.map((l) => "      " + l.trim()).join("\n")}`); fails++; }
    else console.log("  ok — stayed silent");
  } else if (failLines.some((l) => l.includes(c.expect))) {
    console.log(`  ok — caught, naming its own defect`);
  } else {
    console.log(`  MISS — expected a FAIL line containing ${JSON.stringify(c.expect)}; got:\n${(failLines.length ? failLines : out.split("\n").slice(-6)).map((l) => "      " + l.trim()).join("\n")}`);
    fails++;
  }
}

const after = sum(fs.readFileSync(FILE, "utf8"));
if (after !== BEFORE) { console.log(`\nTREE NOT RESTORED — ${BEFORE} -> ${after}`); process.exit(1); }
console.log(`\ntree restored (${after}) · ${CASES.length - fails}/${CASES.length}`);
process.exit(fails ? 1 : 0);
