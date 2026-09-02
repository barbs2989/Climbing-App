#!/usr/bin/env node
// Injection harness for check:pitch-split, after pitch_detail's two boxes (PITCH-BY-PITCH and
// ROUTE BETA) became one ordered ROUTE BREAKDOWN.
//
// The guard's healthy output is "4 real payloads split correctly", which is exactly what a
// guard that has stopped looking prints. Each case edits RouteDetail.jsx in place, proves the
// edit LANDED by checksum, runs the guard, and restores the file byte-identically.
//
// Case 4 is the one the merge added. Cases 1-3 are the original three re-run against the
// merged section: a guard that still catches everything it used to is the claim being made.
//
// DO NOT COMMIT WHILE THIS RUNS — it edits the app source in place (#1190).

import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "RouteDetail.jsx");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "1. per-ROUTE verdict restored (the pre-#1042 classifier)",
    find: "function pitchEntryKind(p,route){\n",
    repl: "function pitchEntryKind(p,route){\n  return isPitched(route)?\"pitch\":\"stage\";\n",
    expect: "fail",
  },
  {
    name: "2. glued badge — 'P'+raw label instead of 'P'+parsed number",
    find: '}}>{isPitch?("P"+r._badge):r._seq}</div>',
    repl: '}}>{isPitch?("P"+r._n):r._seq}</div>',
    expect: "fail",
  },
  {
    name: "3. travel legs dropped instead of drawn",
    find: "  return {rows:rows,pitchCount:nP,stageCount:nS};",
    repl: '  return {rows:rows.filter(r=>r._kind==="pitch"),pitchCount:nP,stageCount:nS};',
    expect: "fail",
  },
  {
    name: "4. ORDER lost — every section, then every pitch (the old two boxes, merged)",
    find: "  return {rows:rows,pitchCount:nP,stageCount:nS};",
    repl: '  return {rows:rows.filter(r=>r._kind==="stage").concat(rows.filter(r=>r._kind==="pitch")),pitchCount:nP,stageCount:nS};',
    expect: "fail",
  },
];

const original = fs.readFileSync(FILE, "utf8");
const before = sum(original);
let bad = 0;

// A clean tree must pass, or every "fail" below is meaningless.
if (run() !== "pass") { console.log("  BROKEN  check:pitch-split does not pass on a clean tree"); process.exit(1); }
console.log("  ok      clean tree: check:pitch-split passes");

for (const c of CASES) {
  if (!original.includes(c.find)) { console.log(`  BROKEN  ${c.name}: anchor not found — re-anchor this case`); bad++; continue; }
  const injected = original.replace(c.find, c.repl);
  fs.writeFileSync(FILE, injected);
  const landed = sum(fs.readFileSync(FILE, "utf8")) !== before;
  let got;
  try { got = run(); } finally { fs.writeFileSync(FILE, original); }
  if (sum(fs.readFileSync(FILE, "utf8")) !== before) { console.log("  BROKEN  restore did not return the file byte-identically"); process.exit(1); }
  if (!landed) { console.log(`  BROKEN  ${c.name}: edit never landed`); bad++; continue; }
  if (got === c.expect) console.log(`  ok      ${c.name} — guard ${got === "fail" ? "CAUGHT it" : "stayed quiet"}`);
  else { console.log(`  MISS    ${c.name} — guard ${got}ed, expected ${c.expect}`); bad++; }
}

function run() {
  try { execFileSync("node", [path.join(ROOT, "scripts", "check-pitch-split.mjs")], { cwd: ROOT, stdio: "pipe" }); return "pass"; }
  catch { return "fail"; }
}

console.log("");
console.log(bad ? `${bad} problem(s) — check:pitch-split is not proven.` : `ok — ${CASES.length}/${CASES.length}, and the file is byte-identical to where it started.`);
process.exit(bad ? 1 : 0);
