#!/usr/bin/env node
// Injection harness for check:boot's SECTION 2 (the Help modal's tab tour).
//
// Every case proves its edit LANDED by checksum before the guard is believed, and
// restores every file it touched byte-identically afterwards. A case whose edit
// never landed reports as a harness bug, never as a guard miss — this repo has
// twice read one as the other.
//
// Cases 1 and 2 are the real historical defects. CASE 5 MUST PASS: the tour is
// allowed to describe sections that are not tabs (Groups, Guides), and a guard
// that flagged them would instruct authors to delete correct content.
//
// CASE 3 IS WHY THIS HARNESS TAKES MULTIPLE EDITS. Renaming a tab in NAV also
// breaks the boot shell, so SECTION 1 fails first and exits — the first version of
// that case reported a catch while section 2 had never run. It now renames the tab
// in index.html too, leaving section 2 as the only thing that can fail. An
// injection that produces a different failure is not a catch.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const HTML = path.join(ROOT, "index.html");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

// each case is a list of [file, find, replace]; `find` must match exactly once
const CASES = [
  { name: "1 my-crew", edits: [[CORE, '["","Crew","', '["","My Crew","']], expect: "fail", why: "the real defect: the tour called the Crew tab 'My Crew'" },
  { name: "2 no-home", edits: [[CORE, '["","Home","', '["","Home2","']], expect: "fail", why: "the real defect: Home, the landing tab, had no entry" },
  { name: "3 nav-rename", edits: [[APP, 'label:"Ranks"', 'label:"Leaderboards"'], [HTML, "<div><b></b>Ranks</div>", "<div><b></b>Leaderboards</div>"]], expect: "fail", why: "a tab renamed in NAV must drag the tour with it (boot shell renamed too, so only section 2 can fail)" },
  { name: "4 anchor", edits: [[CORE, "const feats=[", "const featsX=["]], expect: "fail", why: "a renamed tour must fail closed, never pass" },
  { name: "5 extra-section", edits: [[CORE, '["","Groups","', '["","Weather","Not a tab.",["a."]],["","Groups","']], expect: "pass", why: "MUST STAY SILENT — a non-tab section is legitimate" },
];

let bad = 0;
for (const c of CASES) {
  const orig = new Map(c.edits.map(([f]) => [f, fs.readFileSync(f, "utf8")]));
  const before = new Map([...orig].map(([f, t]) => [f, sha(t)]));

  let harness = false;
  for (const [f, find] of c.edits) {
    const n = orig.get(f).split(find).length - 1;
    if (n !== 1) { console.log(`  ${c.name}: HARNESS BUG — ${JSON.stringify(find)} matched ${n} times in ${path.basename(f)}`); harness = true; }
  }
  if (harness) { bad++; continue; }

  for (const [f, find, repl] of c.edits) fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(find, repl));
  const landed = c.edits.every(([f]) => sha(fs.readFileSync(f, "utf8")) !== before.get(f));

  let passed, out = "";
  try { execFileSync("node", [path.join(ROOT, "scripts", "check-boot-shell.mjs")], { stdio: "pipe" }); passed = true; }
  catch (e) { passed = false; out = String((e.stderr || "") + (e.stdout || "")); }

  for (const [f, t] of orig) fs.writeFileSync(f, t);
  const restored = [...orig].every(([f]) => sha(fs.readFileSync(f, "utf8")) === before.get(f));

  // a failure must come from SECTION 2, not from the boot-shell equality above it
  const rightSection = passed || /Help modal's tour|Help tour was renamed|Help tour/.test(out);
  const got = passed ? "pass" : "fail";
  const ok = landed && restored && got === c.expect && rightSection;
  if (!ok) bad++;
  console.log(`  ${c.name}: landed=${landed} restored=${restored} guard=${got} expected=${c.expect}${passed ? "" : ` section2=${rightSection}`} ${ok ? "OK" : "*** WRONG ***"}  — ${c.why}`);
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nall ${CASES.length} cases behaved`);
process.exit(bad ? 1 : 0);
