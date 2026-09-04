#!/usr/bin/env node
// Injection cases for check:float-plan-persistence.
//
// THE DEFECT THIS GUARD EXISTS FOR IS SILENT BY CONSTRUCTION, which is what the cases have to
// reproduce: `plan`/`onPlan` are OPTIONAL, so a call site that stops passing them makes FloatPlan
// fall back to its own state — the component renders perfectly, and only the WIRING assertions
// can see it. Cases 1 and 2 are exactly that, once per call site, because the fix was shipped
// incomplete the first time (#1577 did the route tab, #1581 the crew tab).
//
// Every case proves its edit LANDED by checksum before the guard is believed. This repo has twice
// recorded an injection that logged, moved no byte, and read as "the guard missed it".
//
// Two cases must stay SILENT. A suite that only ever proves a guard FIRES is satisfied by a guard
// that fires on everything, and this one asserts wiring by matching source — the shape most likely
// to flag correct work.
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const RD = path.join(ROOT, "RouteDetail.jsx");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");

const CASES = [
  {
    name: "route-site-drops-plan",
    file: RD,
    why: "THE REAL SHAPE: RouteDetail stops passing plan/onPlan. FloatPlan falls back to its own state, every render assertion still passes, and the form is silently lost again on every tab switch.",
    expect: /RouteDetail's call site does not pass plan\/onPlan/,
    // TARGET THE TAG THAT CARRIES plan=, not the first <FloatPlan. Core quotes `<FloatPlan/>`
    // twice in comments explaining this very defect, so a first-match edit is a silent no-op —
    // it reported "guard missed it" while moving no byte the guard reads.
    edit: (s) => s.replace(/<FloatPlan\b[^>]*\bplan=\{[^>]*>/, "<FloatPlan/>"),
  },
  {
    name: "crew-site-drops-plan",
    file: CORE,
    why: "THE HISTORICAL MISS: #1577 fixed the route tab and left this one. Team Alignment / Float Plan are a two-button pair, so the control most likely to be tapped mid-fill is the one that cleared the form.",
    expect: /SafetyTab's call site does not pass plan\/onPlan/,
    // TARGET THE TAG THAT CARRIES plan=, not the first <FloatPlan. Core quotes `<FloatPlan/>`
    // twice in comments explaining this very defect, so a first-match edit is a silent no-op —
    // it reported "guard missed it" while moving no byte the guard reads.
    edit: (s) => s.replace(/<FloatPlan\b[^>]*\bplan=\{[^>]*>/, "<FloatPlan/>"),
  },
  {
    name: "route-state-below-the-branch",
    file: RD,
    why: "lifting the state changes NOTHING if it is still declared inside the branch that unmounts. The props are passed, so cases 1/2 stay green and only the ordering assertion can see it.",
    expect: /not declared above the branch that unmounts the form/,
    edit: (s) => {
      /* Move the declaration BELOW the gate. The presence assertions must stay green, so the
         declaration is relocated rather than removed — only the ordering can fail.

         LAST OCCURRENCE, NOT FIRST, and this cost a run: RouteDetail says `tab==="safety"` twice
         and the FIRST is inside the fix's own explanatory comment. Inserting before that one puts
         the declaration ahead of the real gate once comments are stripped, so the guard was
         correct to stay silent and the case read as a miss. */
      const decl = s.match(/const \[floatPlan,setFloatPlan\]=useState\([^;]*\);/);
      if (!decl) throw new Error("declaration not found");
      const without = s.replace(decl[0], "");
      const NEEDLE = 'tab==="safety"';
      const g = without.lastIndexOf(NEEDLE);
      if (g < 0) throw new Error("gate not found");
      // AFTER the gate, not before it — inserting before leaves the declaration above the branch,
      // which is the state the guard is supposed to accept. This is a POSITIONAL injection: the
      // ordering assertion compares source offsets, so it does not need to be runnable JSX.
      const at = g + NEEDLE.length;
      return without.slice(0, at) + decl[0] + without.slice(at);
    },
  },
  {
    name: "shape-duplicated-at-the-crew-site",
    file: CORE,
    why: "seeding the crew site from a hand-written literal instead of floatPlanState() puts the eleven-key shape in two places, and they drift. The props are still passed, so only the seeding assertion sees it.",
    expect: /crew site does not seed from floatPlanState/,
    edit: (s) => s.replace(/(\[floatPlan,setFloatPlan\]=useState\(\(\)=>)floatPlanState\(\)/,
      "$1({form:{route:\"\"},saved:false,checkedIn:false})"),
  },

  // ---- must stay SILENT ---------------------------------------------------------------------
  {
    name: "comment-naming-the-gate",
    file: RD,
    why: "MUST PASS. The fix's own comment quotes `tab===\"safety\"` verbatim to explain itself. A raw search finds the EXPLANATION before the code and fails on a correct tree — the guard strips comments first, and this pins that.",
    silent: true,
    edit: (s) => s.replace(/(const \[floatPlan,setFloatPlan\]=useState\()/,
      '/* the branch below is {tab==="safety"?<div><FloatPlan/></div>:null} */\n  $1'),
  },
  {
    name: "extra-prop-on-the-call-site",
    file: RD,
    why: "MUST PASS. Adding an unrelated prop is ordinary work; a wiring assertion that fired on any change to the tag would tell authors to stop editing it.",
    silent: true,
    edit: (s) => s.replace(/<FloatPlan\b/, '<FloatPlan data-x="1"'),
  },
];

let pass = 0;
const fails = [];
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  let out = "";
  try {
    const after = c.edit(before);
    if (after === before) { fails.push(`${c.name}: EDIT NEVER LANDED (file unchanged)`); console.log(`FAIL  ${c.name}`); continue; }
    fs.writeFileSync(c.file, after);
    if (sum(c.file) === beforeSum) { fails.push(`${c.name}: EDIT NEVER LANDED (checksum unmoved)`); console.log(`FAIL  ${c.name}`); continue; }
    try { out = execFileSync("node", ["scripts/check-float-plan-persistence.mjs"], { cwd: ROOT, encoding: "utf8" }); }
    catch (e) { out = String((e.stdout || "") + (e.stderr || "")); }
  } finally {
    fs.writeFileSync(c.file, before);
    if (sum(c.file) !== beforeSum) { console.log(`HARNESS BROKEN: ${c.file} not restored byte-identically`); process.exit(1); }
  }

  const fired = /\bFAIL\b/.test(out);
  const ok = c.silent ? !fired : (c.expect ? c.expect.test(out) : fired);
  if (ok) pass++;
  else fails.push(`${c.name}: expected ${c.silent ? "SILENCE" : "to name " + c.expect}, got:\n` +
    out.split("\n").filter((l) => /FAIL|problem|ok —/.test(l)).slice(0, 4).map((l) => "        | " + l).join("\n"));
  console.log(`${ok ? "ok  " : "FAIL"}  ${c.name}`);
  console.log(`        ${c.why}`);
}

console.log(`\n${pass}/${CASES.length} cases behaved as specified.`);
if (fails.length) { console.log("\n" + fails.join("\n")); process.exit(1); }
