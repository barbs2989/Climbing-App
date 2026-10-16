// Injection suite for check:summit-briefing.
//
// The healthy output of that guard is "all N assertions passed", which is also what a guard
// asserting nothing prints — so every claim below is judged on the guard's OWN failure text,
// never on an exit code, and each case proves its edit landed by CHECKSUM before the guard is
// believed. `lib/DbAreaBrowser.jsx` is restored byte-identically afterwards and the harness
// says TREE NOT RESTORED rather than exiting 0 on a tree it has damaged.
//
// The four cases that targeted the access block's agreement rule (prefix-rule-restored,
// always-agrees, never-agrees, shows-the-thinnest) and its two SILENT companions were deleted
// with that block on 2026-10-04 — the owner removed Access & permits from the peak overview,
// so there is no rule left for them to break. What the guard proves now is the block's ABSENCE.
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

const CASES = [
  {
    name: "access-block-restored",
    why: "the owner removed Access & permits from the peak overview; putting its heading back must fail the guard.",
    find: `      <CardHead C={C} style={{ marginBottom: 10 }}>ACROSS EVERY ROUTE HERE</CardHead>`,
    repl: `      <CardHead C={C} style={{ marginBottom: 10 }}>ACROSS EVERY ROUTE HERE</CardHead>\n      <div>Access &amp; permits</div>`,
    expect: "has NO Access & permits block",
  },
  {
    name: "approach-reads-the-raw-column",
    why: "THE ANTI-REVERT CASE. Reading `dist_km` raw instead of the route page's own effective distance changes NO identifier, so audit:silent-reverts cannot see it and every other assertion here stays green — while one climb goes back to having two approach distances depending on the screen.",
    find: "    const ap = numericSpan(rs, effDistKm);",
    repl: "    const ap = numericSpan(rs, r => r.dist_km);",
    expect: "the Approach row shows the route page's own distance",
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
