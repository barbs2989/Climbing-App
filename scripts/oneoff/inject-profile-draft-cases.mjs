#!/usr/bin/env node
// Injection cases for `check:profile-draft-persists`.
//
// Its healthy output is "everything passed", which is also what a guard asking nothing prints.
// Each case proves its edit LANDED by checksum before the verdict is believed, restores the file
// byte-identically, and names the text its OWN failure must carry — matched against FAIL lines
// only, because an expectation taken from the text an assertion prints when it PASSES reports
// MISSED against a guard firing correctly.
//
// Two cases must stay SILENT. They are the load-bearing half: the rule must not fire on a field
// the schema cannot hold, or it would demand a column for every draft key.
//
//   node scripts/oneoff/inject-profile-draft-cases.mjs

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const LOCK = path.join(ROOT, ".profile-draft-injection.lock");

try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error("another run of this suite is in flight (.profile-draft-injection.lock). Refusing."); process.exit(1); }
const release = () => { try { fs.rmSync(LOCK, { force: true }); } catch {} };
process.on("exit", release); process.on("SIGINT", () => { release(); process.exit(1); });

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const run = () => {
  const r = spawnSync("node", [path.join(ROOT, "scripts", "check-profile-draft-persists.mjs")], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};

const ORIGINAL = fs.readFileSync(APP, "utf8");
const BASE_SHA = sha(APP);

const clean = run();
if (clean.code !== 0) { console.error("BASELINE NOT GREEN — fix the guard first.\n" + clean.out.slice(-1500)); process.exit(1); }
console.log("baseline green\n");
const cleanText = clean.out;

const cases = [
  {
    name: "THE REAL DEFECT: the payload drops certifications and skills again",
    edits: [["certifications:d.certifications||[],skills:d.skills||[],", ""]],
    expect: "saveEdit never sends it",
  },
  {
    name: "...only skills is dropped, so one field of a pair cannot hide behind the other",
    edits: [["skills:d.skills||[],", ""]],
    expect: 'the editor collects "skills"',
  },
  {
    name: "the WRITE stands and the READ BACK is dropped — stored, then ignored",
    edits: [["certifications:(p.certifications&&p.certifications.length)?p.certifications:pp.certifications,", ""]],
    expect: 'the hydration never reads "certifications" back',
  },
  {
    name: "the payload stops reaching saveProfile",
    edits: [["saveProfile(uid,f)", "saveProfile(uid,{})"]],
    expect: "no longer hands `f` to saveProfile",
  },
  {
    name: "a NEW draft field is added that has no column and no declaration",
    edits: [["boulderGrade:ME.boulderGrade,avatar:ME.avatar,", "boulderGrade:ME.boulderGrade,avatar:ME.avatar,favouriteCrag:ME.favouriteCrag,"]],
    expect: 'has no "favourite_crag" column',
  },
  {
    name: "a stale ALIAS: showRealName stops being collected",
    edits: [["showRealName:showRealName});", "});"]],
    expect: 'ALIAS declares "showRealName"',
  },
  {
    name: "SILENT: level and availWeek stay undeclared columns — the rule must not demand them",
    // A no-op edit that leaves both in place. If the rule ever started firing on a draft key with
    // no column, the guard would demand a migration for every field the editor collects.
    edits: [["setEditDraft({availWeek:", "setEditDraft({ availWeek:"]],
    expect: null,
  },
  {
    name: "SILENT: a comment naming the forbidden shape",
    edits: [["const saveEdit=()=>{", "/* saveEdit once sent no certifications and no skills */\nconst saveEdit=()=>{"]],
    expect: null,
  },
];

for (const c of cases) {
  if (c.expect && cleanText.includes(c.expect)) {
    console.error(`CASE "${c.name}" is unusable: its expectation "${c.expect}" already appears in the GREEN run.`);
    process.exit(1);
  }
}

let problems = 0;
for (const c of cases) {
  let s = ORIGINAL, landed = true, why = "";
  for (const [find, repl] of c.edits) {
    const n = s.split(find).length - 1;
    if (n !== 1) { landed = false; why = `anchor found ${n}x: ${find.slice(0, 70)}`; break; }
    s = s.replace(find, repl);
  }
  if (!landed) { console.log(`  HARNESS BUG  ${c.name}\n      ${why}`); problems++; continue; }

  fs.writeFileSync(APP, s);
  const moved = sha(APP) !== BASE_SHA;
  const r = run();
  fs.writeFileSync(APP, ORIGINAL);

  const fails = r.out.split("\n").filter((l) => l.includes("FAIL")).join("\n");
  let verdict;
  if (c.expect === null) verdict = r.code === 0 ? "SILENT" : "FIRED (should be silent)";
  else if (r.code === 0) verdict = "MISSED";
  else verdict = fails.includes(c.expect) ? "CAUGHT" : "wrong failure";

  const good = (c.expect === null && verdict === "SILENT") || (c.expect !== null && verdict === "CAUGHT");
  if (!good) problems++;
  console.log(`  ${verdict.padEnd(24)} ${c.name}   (edit landed: ${moved})`);
  if (!good && c.expect !== null) console.log("      " + (fails.split("\n")[0] || "(no FAIL line)"));
}

if (sha(APP) !== BASE_SHA) { console.log("\nTREE NOT RESTORED — ClimbMatch.jsx differs from the baseline."); process.exit(1); }
console.log("\nrestored byte-identically");
console.log(`RESULT: ${cases.length - problems}/${cases.length} as expected`);
process.exit(problems ? 1 : 0);
