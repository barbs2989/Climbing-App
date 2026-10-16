// Does audit:silent-reverts' outage-flag pattern see BOTH declaration shapes, in BOTH engines?
//
// The pattern is the only thing standing between a silently-reverted outage flag and nobody
// noticing, and it has now been wrong three times -- each time quietly, each time reporting a
// clean tree. #1279 fixed a bare-name presence test and a `^`-anchored collection; this adds the
// shape those fixes still could not see:
//
//     const msgHydratedRef=useRef({}),[dmThreadsUnavailable,setDmThreadsUnavailable]=useState(false)
//
// Measured before the fix: collection returned [] and presence returned false, so that flag was
// never TRACKED at all -- its removal could not have been reported at any window size.
//
// TWO ENGINES, AND ONLY ONE OF THEM TAKES A LOOKAHEAD. Presence is handed to `new RegExp` on the
// fast path and to `git grep -E` on the slow one, and POSIX ERE has no lookarounds. A presence
// string that works in JS and not in ERE fails only when the checkout is not the ref -- which is
// exactly how this audit gets validated against history, so the failure would surface at the worst
// possible moment. Both are exercised here.
//
// THE SILENT CASES ARE THE POINT. A pattern that matches everything is no more useful than one
// that matches nothing, and over-collection is the dangerous direction: a name collected from a
// mere mention is later reported ABSENT, which is a false accusation of a revert.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "scripts", "audit-silent-reverts.mjs");

// Lift the pattern and the presence builder out of the audit rather than restating them. A copy
// would agree with itself whatever the audit did, which is the whole failure mode here.
const src = fs.readFileSync(SRC, "utf8");
const m = /\{ kind: "outage-flag",\s*\n\s*re: (\/.*\/g),[\s\S]*?presence: \(name\) => ([^}]+?) \},/.exec(src);
if (!m) {
  console.error("ANCHOR LOST: could not lift the outage-flag pattern out of");
  console.error("  " + SRC);
  console.error("Nothing was measured. Re-anchor this probe rather than deleting it.");
  process.exit(1);
}
const COLLECT = new RegExp(m[1].slice(1, m[1].lastIndexOf("/")), "g");
// eslint-disable-next-line no-new-func
const presence = new Function("name", "return " + m[2] + ";");

const CASES = [
  // [label, source line, name, must be collected?]
  ["derived flag (every other one)",
   "var myFiledQ=useMyFiledReports(!!uid),filedReportsUnavailable=!!(uid&&myFiledQ&&myFiledQ.isError),x=1;",
   "filedReportsUnavailable", true],
  ["several on one dense line — the #1267 shape",
   "var a=1,catchesUnavailable=!!(q1.isError),b=2,searchesUnavailable=!!(q2.isError);",
   "searchesUnavailable", true],
  ["useState destructure — the #1276 shape",
   "const msgHydratedRef=useRef({}),[dmThreadsUnavailable,setDmThreadsUnavailable]=useState(false);",
   "dmThreadsUnavailable", true],
  ["useState, flag LAST in the pattern",
   "const [setX,fooUnavailable]=useState(false);",
   "fooUnavailable", true],
  // Must NOT be collected: a mention is not a declaration, and collecting one means later
  // reporting it ABSENT — a false accusation.
  ["a plain READ is not a declaration",
   "if(photosUnavailable){return null;}",
   "photosUnavailable", false],
  ["a function ARGUMENT is not a declaration",
   "render(Comp,{barUnavailable, other});",
   "barUnavailable", false],
  ["prose in a comment is not a declaration",
   "// bazUnavailable is set when the read fails and cleared on success",
   "bazUnavailable", false],
];

let bad = 0;
console.log("collection\n");
for (const [label, line, name, want] of CASES) {
  COLLECT.lastIndex = 0;
  const got = [...line.matchAll(COLLECT)].map((x) => x[1]).includes(name);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${want ? "collects" : "ignores "} ${name.padEnd(24)} ${label}`);
}

console.log("\npresence — JS RegExp (fast backend) and git grep -E (slow backend)\n");
for (const [label, line, name, want] of CASES) {
  if (!want) continue; // presence is only asked about tokens that were collected
  const ere = presence(name);
  const js = new RegExp(ere).test(line);
  // The same string must work in POSIX ERE. Feed it to grep the way the audit feeds git grep -E.
  let ere_ok;
  try {
    execFileSync("grep", ["-qE", ere], { input: line });
    ere_ok = true;
  } catch (e) {
    ere_ok = e.status === 1 ? false : `grep error (${e.status})`;
  }
  const ok = js === true && ere_ok === true;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name.padEnd(24)} js=${js} ere=${ere_ok}   ${label}`);
}

// Fail closed: an empty or trivial lift would make every case above vacuous.
if (CASES.length < 5) { console.error("\nFAIL — too few cases to mean anything."); bad++; }

console.log(bad ? `\n${bad} case(s) failed.`
  : "\nok — both declaration shapes are collected and present, in both engines, and a mention,\n"
    + "     an argument and a comment are still ignored.");
process.exitCode = bad ? 1 : 0;
