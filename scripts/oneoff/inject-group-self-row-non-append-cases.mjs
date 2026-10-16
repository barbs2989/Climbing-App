#!/usr/bin/env node
// INJECTION SUITE for probe-group-self-row-is-not-only-the-append-path.mjs.
//
// The probe's healthy output is "everything passed", which is also what a probe asserting nothing
// prints. These cases edit ClimbMatch.jsx IN PLACE, prove the edit landed BY CHECKSUM, run the
// probe, and restore the file byte-identically — so a case that reports MISSED is a claim about
// the probe rather than about the tree.
//
// DO NOT COMMIT WHILE THIS IS RUNNING, and do not run two copies at once: CLAUDE.md records a
// working tree left permanently corrupted by exactly that.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "ClimbMatch.jsx");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-group-self-row-is-not-only-the-append-path.mjs");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

const original = fs.readFileSync(FILE, "utf8");
const originalSha = sha(original);

// A case must name the text ITS OWN failure has to carry, matched against FAIL lines only. Judging
// on the exit code alone is satisfied by a run that died for an unrelated reason, and matching the
// text an assertion prints when it PASSES is a mistake this repo has recorded more than once.
const CASES = [
  {
    name: "self-row-carries-ME-verbatim (the real pre-#1701 defect)",
    find: 'var m=_asMember(id)||(id===_meGid?Object.assign({},ME,{id:_meGid}):',
    repl: 'var m=_asMember(id)||(id===_meGid?ME:',
    expect: "the roster offers + Mod on YOUR OWN row",
  },
  {
    name: "SILENT: the same fallback written longhand",
    find: 'var m=_asMember(id)||(id===_meGid?Object.assign({},ME,{id:_meGid}):',
    repl: 'var m=_asMember(id)||(id===_meGid?Object.assign({},ME,{id:_meGid,name:ME.name}):',
    silent: true,
  },
];

// The GREEN run first: an expectation that already matches it is testing nothing, so refuse it.
let green = "";
try { green = execFileSync(process.execPath, [PROBE], { encoding: "utf8" }); }
catch (e) { console.error("REFUSING TO RUN: the probe is not green on a clean tree — every case would be unattributable.\n" + ((e.stdout || "") + (e.stderr || ""))); process.exit(1); }
for (const c of CASES) {
  if (c.expect && green.includes(c.expect)) { console.error(`REFUSING: case "${c.name}" expects text that appears in the GREEN run.`); process.exit(1); }
}

let pass = 0;
for (const c of CASES) {
  const n = original.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name}: find string matched ${n} times, expected 1`); continue; }
  const mutated = original.replace(c.find, c.repl);
  if (sha(mutated) === originalSha) { console.log(`  HARNESS BUG  ${c.name}: edit did not change the file`); continue; }
  fs.writeFileSync(FILE, mutated);
  let out = "", code = 0;
  try { out = execFileSync(process.execPath, [PROBE], { encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status || 1; }
  fs.writeFileSync(FILE, original);
  if (sha(fs.readFileSync(FILE, "utf8")) !== originalSha) { console.error("TREE NOT RESTORED — stop and check git status"); process.exit(1); }

  const fails = out.split("\n").filter((l) => l.includes("FAIL"));
  if (c.silent) {
    if (code === 0) { console.log(`  ok (silent)  ${c.name}`); pass++; }
    else console.log(`  FIRED        ${c.name} — a correct edit was flagged:\n${fails.join("\n")}`);
  } else if (code !== 0 && fails.some((l) => l.includes(c.expect))) {
    console.log(`  ok (caught)  ${c.name}`); pass++;
  } else if (code !== 0) {
    console.log(`  WRONG FAILURE ${c.name} — failed, but not on "${c.expect}":\n${fails.join("\n")}`);
  } else {
    console.log(`  MISSED       ${c.name} — the probe passed against the injected defect`);
  }
}
console.log(`\n${pass}/${CASES.length} behaved as declared`);
process.exit(pass === CASES.length ? 0 : 1);
