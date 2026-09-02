// Does check:trust-breakdown actually catch the thing it claims to?
//
// Its healthy output is "every account's factors sum to its headline", which is also exactly what
// a guard with a broken scan prints. So each case edits the app, proves the edit LANDED by
// checksum, runs the guard, and restores the file byte-identically.
//
// Cases 1 and 2 are the real historical defect from two directions. Case 5 must PASS: a comment
// inside TrustBreakdown naming the old expression is documentation, and a guard that flagged it
// would forbid the code from explaining itself.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");

const CASES = [
  {
    name: "renderer back on raw points",
    expect: "fail",
    why: "the real #1324 defect: raw points above a percentage headline",
    find: '{"+"+f.share}',
    repl: '{"+"+f.pts}',
  },
  {
    name: "renderer back on the raw factor list",
    expect: "fail",
    why: "trustFactors carries no `share`, so the panel has nothing apportioned to show",
    find: "return <div>{trustContributions(climber).map(",
    repl: "return <div>{trustFactors(climber).map(",
  },
  {
    // NOT "change how the initial split rounds" — that is self-correcting and the first version of
    // this case MISSED because of it. The redistribution hands out `total - used` units whatever
    // `used` was, so the sum comes out right however the floors were computed. The mechanism can
    // only be broken by removing the correction itself, which is also the realistic regression.
    name: "remainder distribution removed",
    expect: "fail",
    why: "bare floors undershoot the headline — the sum no longer holds by construction",
    find: "for(var k=0;k<order.length&&left>0;k++){order[k].floor++;left--;}",
    repl: "",
  },
  {
    name: "trustContributions export removed",
    expect: "fail",
    why: "fail closed — a renamed export must read as ANCHOR LOST, never as a clean panel",
    find: "vScore,trustContributions,",
    repl: "vScore,",
  },
  {
    name: "a comment naming the old expression",
    expect: "pass",
    why: "documentation, not a regression — a guard flagging it would forbid explaining itself",
    find: "function TrustBreakdown({climber}){",
    repl: 'function TrustBreakdown({climber}){/* this used to render {"+"+f.pts}, the raw points */',
  },
];

const before = sum(CORE);
let passed = 0;
for (const c of CASES) {
  const src = fs.readFileSync(CORE, "utf8");
  const n = src.split(c.find).length - 1;
  if (n !== 1) {
    console.log(`  HARNESS  ${c.name}: anchor matched ${n} time(s), expected 1 — the CASE is wrong, not the guard`);
    continue;
  }
  fs.writeFileSync(CORE, src.replace(c.find, c.repl));
  const landed = sum(CORE) !== before;

  let exit = 0, out = "";
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "check-trust-breakdown.mjs")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { exit = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }

  fs.writeFileSync(CORE, src);
  const restored = sum(CORE) === before;

  const got = exit === 0 ? "pass" : "fail";
  const good = landed && restored && got === c.expect;
  if (good) passed++;
  const detail = (out.split("\n").find((l) => /FAIL|FAILED —/.test(l)) || "").trim().slice(0, 110);
  console.log(`  ${good ? "CAUGHT " : "MISSED "} ${c.name}`);
  console.log(`      expected ${c.expect}, got ${got}   edit landed: ${landed}   restored: ${restored}`);
  console.log(`      ${c.why}`);
  if (detail) console.log(`      ${detail}`);
}

console.log(`\n${passed}/${CASES.length} cases behaved as required.`);
if (sum(CORE) !== before) { console.error("\nCRITICAL: ClimbMatchCore.jsx was NOT restored."); process.exit(1); }
process.exit(passed === CASES.length ? 0 : 1);
