#!/usr/bin/env node
// Injection cases for check:bottom-panels. Each proves its edit LANDED by checksum and restores
// the file byte-identically.
//
// CASE 1 IS THE REAL REVERT this guard exists for -- the reservation removed while the flag that
// mounts the panel stays, which is exactly what a stale-base squash produces and exactly what
// audit:silent-reverts cannot see (it changes no identifier).
//
// CASE 3 MUST PASS. A full-screen overlay covers everything on purpose and carries its own close
// control; a guard that demanded it reserve space would be telling authors to break correct
// markup, which is how a guard gets ignored.
//
//   node scripts/oneoff/inject-bottom-panel-cases.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

function runGuard() {
  try {
    execFileSync("node", ["scripts/check-bottom-panels.mjs"], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    return { code: 0, out: "" };
  } catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
}

const SPACER = 'const on=section===x[0];';

const CASES = [
  ["1  THE REAL REVERT — reservation dropped, flag kept", "ClimbMatch.jsx",
    ',paddingBottom:_needsPolicy&&policyH?policyH:undefined}}>', '}}>',
    true, "reserves no space"],
  ["2  a second bottom-anchored fixed panel, undeclared", "ClimbMatchCore.jsx",
    SPACER, SPACER + 'const _c2=<div style={{position:"fixed",left:0,right:0,bottom:0,height:40}}/>;void _c2;',
    true, "not declared"],
  ["3  MUST PASS — a full-screen overlay is out of scope", "ClimbMatchCore.jsx",
    SPACER, SPACER + 'const _c3=<div style={{position:"fixed",left:0,right:0,top:0,bottom:0}}/>;void _c3;',
    false, null],
  ["4  the declared panel's style renamed -> STALE, not silent", "ClimbMatchCore.jsx",
    'position:"fixed",left:0,right:0,bottom:0,zIndex:z', 'position:"fixed",right:0,left:0,bottom:0,zIndex:z',
    true, "STALE declaration"],
  ["5  style vocabulary broken -> fails on the floor", "scripts/check-bottom-panels.mjs",
    'const BOTTOM = /position:"fixed"[^}]{0,200}?bottom:0/g;', 'const BOTTOM = /__nope__/g;',
    true, "found NO bottom-anchored"],
];

const clean = runGuard();
if (clean.code !== 0) {
  console.error("REFUSING to run: the guard already fails on a clean tree.\n" + clean.out);
  process.exit(1);
}
console.log("baseline: guard passes on a clean tree\n");

let pass = 0;
for (const [label, rel, find, replace, mustFail, needle] of CASES) {
  const abs = path.join(ROOT, rel);
  const before = fs.readFileSync(abs, "utf8");
  const n = before.split(find).length - 1;
  if (n !== 1) {
    console.log(`FAIL  ${label}\n        EDIT NEVER LANDED — the anchor appears ${n} time(s), expected 1. Fix the case, not the guard.`);
    continue;
  }
  fs.writeFileSync(abs, before.replace(find, replace));
  const landed = sum(fs.readFileSync(abs, "utf8")) !== sum(before);
  const r = runGuard();
  fs.writeFileSync(abs, before);
  const restored = sum(fs.readFileSync(abs, "utf8")) === sum(before);

  const failed = r.code !== 0;
  const named = !needle || r.out.includes(needle);
  const ok = landed && restored && failed === mustFail && (mustFail ? named : true);
  if (ok) pass++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  console.log(`        edit landed: ${landed}   restored byte-identical: ${restored}   guard ${failed ? "FAILED" : "passed"} (wanted ${mustFail ? "FAILED" : "passed"})`);
  if (mustFail && failed && !named) console.log(`        but its message never mentions ${JSON.stringify(needle)} — a failure for another reason is not a catch`);
  if (!ok && !mustFail && failed) console.log("        " + r.out.split("\n").slice(0, 5).join("\n        "));
}

console.log(`\n${pass}/${CASES.length} cases behaved.`);
process.exit(pass === CASES.length ? 0 : 1);
