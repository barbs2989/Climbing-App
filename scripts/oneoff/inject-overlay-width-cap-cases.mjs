#!/usr/bin/env node
// Injection suite for check:overlay-width-cap.
//
// The guard's healthy output is "ok", which is also what a guard that matches nothing prints, so
// every case proves its edit LANDED (by checksum) before the guard is believed, and restores the
// file byte-identically afterwards.
//
//   node scripts/oneoff/inject-overlay-width-cap-cases.mjs
//
// Two cases must stay SILENT. A guard that only proves it can fire is satisfied by one that fires
// on everything, and this repo has shipped exactly that: a rule that flags correct work is one
// people learn to ignore.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUARD = path.join(ROOT, "scripts", "check-overlay-width-cap.mjs");
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);

function runGuard() {
  try { return { code: 0, out: execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }) }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout || "") + String(e.stderr || "") }; }
}

const CASES = [
  {
    name: "uncap",
    file: "ClimbMatch.jsx",
    why: "a full-screen view loses its cap — the real historical state of all 21",
    edit: (s) => s.replace(',maxWidth:520,margin:"0 auto",boxSizing:"border-box"', ""),
    expect: "fail",
    must: /ignore the app's 520px column/,
  },
  {
    name: "nobordersizing",
    file: "lib/DbGuideDashboard.jsx",
    why: "keeps maxWidth+margin but drops box-sizing — measured at 552px in Chrome, and a scan " +
         "checking only the first two reported it as capped",
    edit: (s) => s.replace(',boxSizing:"border-box"', ""),
    expect: "fail",
    must: /missing boxSizing/,
  },
  {
    name: "staleexempt",
    file: "lib/FireMap.jsx",
    why: "the exempt view stops being a full-screen view — the exemption must FAIL as stale " +
         "rather than quietly excusing nothing",
    edit: (s) => s.replace('position: "fixed", inset: 0,', 'position: "relative", inset: 0,'),
    expect: "fail",
    must: /STALE exemption/,
  },
  {
    name: "brokenscan",
    file: "ClimbMatchCore.jsx",
    why: "ONE file's `style={{` is reformatted to `style={ {`. React renders it IDENTICALLY and " +
         "check:refs cannot see it, so this is the genuinely SILENT way the scan dies -- and it " +
         "is partial, which is how a shape test actually fails. Must report a BROKEN SCAN.",
    edit: (s) => s.split("style={{").join("style={ {"),
    expect: "fail",
    must: /NOT a clean result/,
  },
  {
    name: "brokenscan-firstdraft",
    file: "ClimbMatchCore.jsx",
    why: "the FIRST version of the case above renamed C.bg in one file and MISSED: it removed only " +
         "6 of 23 views, clearing a floor of 15. Kept as a case because it pins the floor at a " +
         "level that catches a single-file loss. (It is also not a silent failure in the real app " +
         "-- an unknown background renders the overlay transparent -- which is why it was replaced.)",
    edit: (s) => s.split('position:"fixed",inset:0,background:C.bg').join('position:"fixed",inset:0,background:C.bgX'),
    expect: "fail",
    must: /NOT a clean result/,
  },
  {
    name: "scrim",
    file: "ClimbMatch.jsx",
    why: "MUST STAY SILENT — a backdrop scrim is MEANT to cover the whole window, and its inner " +
         "panel carries its own maxWidth. Flagging it would tell authors to break correct code.",
    edit: (s) => s.replace('position:"fixed",inset:0,background:"rgba(0,0,0,0.6)"',
                           'position:"fixed",inset:0,background:"rgba(0,0,0,0.61)"'),
    expect: "pass",
  },
  {
    name: "cappedwithextra",
    file: "ClimbMatchCore.jsx",
    why: "MUST STAY SILENT — a capped view that gains an unrelated property is still capped",
    edit: (s) => s.replace(',maxWidth:520,margin:"0 auto",boxSizing:"border-box"',
                           ',maxWidth:520,margin:"0 auto",boxSizing:"border-box",cursor:"default"'),
    expect: "pass",
  },
];

let pass = 0, fail = 0;
console.log("baseline: " + runGuard().out.trim() + "\n");

for (const c of CASES) {
  const p = path.join(ROOT, c.file);
  const before = fs.readFileSync(p, "utf8");
  const after = c.edit(before);
  if (after === before) { console.log(`  BAD CASE  ${c.name}: edit never landed (pattern did not match)`); fail++; continue; }
  fs.writeFileSync(p, after);
  const landed = sum(fs.readFileSync(p, "utf8")) !== sum(before);
  const r = runGuard();
  fs.writeFileSync(p, before);
  const restored = sum(fs.readFileSync(p, "utf8")) === sum(before);

  const got = r.code === 0 ? "pass" : "fail";
  const right = got === c.expect && (c.expect === "pass" || (c.must ? c.must.test(r.out) : true));
  console.log(`  ${right ? "CAUGHT " : "MISSED "} ${c.name.padEnd(16)} edit-landed=${landed} restored=${restored} guard=${got} (want ${c.expect})`);
  if (!right) { console.log("      " + r.out.trim().split("\n").slice(0, 4).join("\n      ")); }
  if (!restored) { console.log("      !! FILE NOT RESTORED: " + c.file); }
  right && landed && restored ? pass++ : fail++;
  console.log("      " + c.why);
}

console.log(`\n${pass}/${CASES.length} cases behaved as specified.`);
process.exit(fail ? 1 : 0);
