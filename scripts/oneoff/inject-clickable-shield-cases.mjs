// Injection tests for check:clickable's stopPropagation SHIELD exemption.
//
// The exemption is the one place this guard deliberately says "not a control". Widening it
// to recognise `function(e){e.stopPropagation();}` fixed 13 false findings, and the risk of
// any widening runs the other way: a shield test that swallows a handler which stops
// propagation AND THEN DOES REAL WORK would hide a genuine keyboard defect. That is the
// direction these cases exist to pin.
//
// Every case proves the edit LANDED (by checksum) before it believes anything the guard
// says about it — a .replace() that matched nothing reports "guard missed" when the truth
// is "the file was never modified". That trap is on record in CLAUDE.md for check:log.
//
//   node scripts/oneoff/inject-clickable-shield-cases.mjs
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(ROOT, "scripts", "check-clickable-divs.mjs");
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);

const runGuard = () => {
  try {
    return { code: 0, out: execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
};

// Baseline must be green before any injection, or every result below is meaningless.
const clean = runGuard();
if (clean.code !== 0) {
  console.error("REFUSING TO RUN — check:clickable is already failing before any injection:\n" + clean.out);
  process.exit(1);
}
console.log("baseline: check:clickable is green\n");

const CASES = [
  {
    name: "1. a handler that shields AND does real work is still a CONTROL (the dangerous direction)",
    file: "RouteDetail.jsx",
    find: "onClick={function(e){e.stopPropagation();}}",
    repl: "onClick={function(e){e.stopPropagation();onClose();}}",
    expect: "fail",
    why: "two statements — exempting this would hide a real keyboard defect",
  },
  {
    name: "2. an arrow with a BLOCK body is still a shield",
    file: "RouteDetail.jsx",
    find: "onClick={function(e){e.stopPropagation();}}",
    repl: "onClick={(e)=>{e.stopPropagation();}}",
    expect: "pass",
    why: "same thing in a third syntax; the rule is about what it does, not how it is written",
  },
  {
    name: "3. reverting a real clickable() fix is still caught",
    file: "lib/DbGuides.jsx",
    find: "{...clickable(onOpen)}",
    repl: "onClick={onOpen}",
    expect: "fail",
    why: "the guard's primary job must survive the exemption change",
  },
];

let passed = 0;
for (const c of CASES) {
  const abs = path.join(ROOT, c.file);
  const original = fs.readFileSync(abs, "utf8");
  if (!original.includes(c.find)) {
    console.log(`${c.name}\n   SKIPPED — anchor not found in ${c.file}: ${c.find}\n`);
    continue;
  }
  // Replace ONE occurrence only, so the delta is exactly one element.
  const injected = original.replace(c.find, c.repl);
  fs.writeFileSync(abs, injected);
  try {
    const landed = sum(original) !== sum(fs.readFileSync(abs, "utf8"));
    if (!landed) {
      console.log(`${c.name}\n   HARNESS BUG — the edit did not land; nothing below was tested.\n`);
      continue;
    }
    const r = runGuard();
    const got = r.code === 0 ? "pass" : "fail";
    const ok = got === c.expect;
    if (ok) passed++;
    console.log(`${c.name}`);
    console.log(`   edit landed: yes (${sum(original)} -> ${sum(injected)})`);
    console.log(`   expected ${c.expect}, guard ${got}  ${ok ? "OK" : "*** WRONG ***"}`);
    console.log(`   ${c.why}`);
    if (got === "fail") {
      const line = r.out.split("\n").find((l) => /mouse-only control\(s\), baseline allows/.test(l));
      if (line) console.log(`   guard said: ${line.trim()}`);
    }
    console.log("");
  } finally {
    fs.writeFileSync(abs, original); // always restore, even if the guard threw
  }
}

// The tree must be exactly as it started, or a later run is judging injected code.
const after = runGuard();
console.log(after.code === 0
  ? `restored: check:clickable is green again\n\n${passed}/${CASES.length} injection case(s) behaved as expected.`
  : `\n*** NOT RESTORED — check:clickable is failing after teardown:\n${after.out}`);
process.exit(after.code === 0 && passed === CASES.length ? 0 : 1);
