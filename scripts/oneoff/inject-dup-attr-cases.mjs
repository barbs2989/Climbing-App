#!/usr/bin/env node
// Injection cases for check:dup-attrs. Each proves its edit LANDED by checksum before the guard
// is believed, and restores the file byte-identically afterwards.
//
// CASES 4 AND 5 MUST PASS, and they are the ones that make the rule worth having. Overriding a
// spread (`{...base, color:"red"}`) and a pair of computed keys (`{[k]:1,[k]:2}`) are both
// correct code; a guard that flagged them would be telling authors to break working objects,
// which is how a guard gets ignored.
//
// Cases 1 and 2 are the REAL historical defects, reproduced by re-inserting exactly what
// scripts/oneoff/fix-duplicate-declarations.mjs removed -- not by inventing a duplicate.
//
//   node scripts/oneoff/inject-dup-attr-cases.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

function runGuard() {
  try {
    execFileSync("node", ["scripts/check-dup-attrs.mjs"], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

// (label, file, find, replace, mustFail, needleInMessage)
const CASES = [
  ["1  the real ClimbMatchCore aria-current duplicate", "ClimbMatchCore.jsx",
    'onClick={()=>setSection(x[0])} aria-current={on?"true":undefined}',
    'onClick={()=>setSection(x[0])} aria-current={on?"true":undefined} aria-current={on?"true":undefined}',
    true, "aria-current"],
  ["2  the real ClimbMatchCore border duplicate", "ClimbMatchCore.jsx",
    'fontWeight:700,color:C.blue,background:C.blueBg,borderRadius:10,padding:"11px 10px",border:"1.5px solid "+C.blueDim',
    'fontWeight:700,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:10,padding:"11px 10px",border:"1.5px solid "+C.blueDim',
    true, '"border"'],
  ["3  a spread BETWEEN two same-named attributes changes nothing", "ClimbMatchCore.jsx",
    'onClick={()=>setSection(x[0])} aria-current={on?"true":undefined}',
    'onClick={()=>setSection(x[0])} aria-current={on?"true":undefined} {...{}} aria-current={"page"}',
    true, "aria-current"],
  ["4  MUST PASS — a spread and a key are not two keys", "ClimbMatchCore.jsx",
    'const on=section===x[0];',
    'const on=section===x[0];const _dupcase={...{color:"blue"},color:"red"};void _dupcase;',
    false, null],
  ["5  MUST PASS — two computed keys are not knowably the same", "ClimbMatchCore.jsx",
    'const on=section===x[0];',
    'const on=section===x[0];const _k="a",_dupcase2={[_k]:1,[_k]:2};void _dupcase2;',
    false, null],
];

const clean = runGuard();
if (clean.code !== 0) {
  console.error("REFUSING to run: the guard already fails on a clean tree, so no case below would mean anything.\n" + clean.out);
  process.exit(1);
}
console.log("baseline: guard passes on a clean tree\n");

let pass = 0;
for (const [label, rel, find, replace, mustFail, needle] of CASES) {
  const abs = path.join(ROOT, rel);
  const before = fs.readFileSync(abs, "utf8");
  const n = before.split(find).length - 1;
  if (n !== 1) {
    console.log(`${label}\n   EDIT NEVER LANDED — the anchor appears ${n} time(s), expected 1. Fix the case, not the guard.`);
    continue;
  }
  const after = before.replace(find, replace);
  fs.writeFileSync(abs, after);
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
  if (mustFail && failed && !named) console.log(`        but its message never mentions ${needle} — a failure for another reason is not a catch`);
  if (!ok && !mustFail && failed) console.log("        " + r.out.split("\n").slice(0, 6).join("\n        "));
}

// Case 6 is separate: it breaks the traversal rather than the app, so it edits the guard.
{
  const abs = path.join(ROOT, "scripts/check-dup-attrs.mjs");
  const before = fs.readFileSync(abs, "utf8");
  const find = "    JSXOpeningElement(p) {\n      elements++;";
  const n = before.split(find).length - 1;
  if (n !== 1) {
    console.log("6  EDIT NEVER LANDED — the visitor anchor moved.");
  } else {
    fs.writeFileSync(abs, before.replace(find, "    JSXOpeningElement(p) {\n      if (true) return;\n      elements++;"));
    const landed = sum(fs.readFileSync(abs, "utf8")) !== sum(before);
    const r = runGuard();
    fs.writeFileSync(abs, before);
    const restored = sum(fs.readFileSync(abs, "utf8")) === sum(before);
    const ok = landed && restored && r.code !== 0 && r.out.includes("traversal is broken");
    if (ok) pass++;
    console.log(`${ok ? "PASS" : "FAIL"}  6  a broken visitor fails on the floor, not silently`);
    console.log(`        edit landed: ${landed}   restored byte-identical: ${restored}   guard ${r.code !== 0 ? "FAILED" : "passed"} (wanted FAILED)`);
  }
}

console.log(`\n${pass}/6 cases behaved.`);
process.exit(pass === 6 ? 0 : 1);
