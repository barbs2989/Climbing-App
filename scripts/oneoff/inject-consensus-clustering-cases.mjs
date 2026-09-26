// Injection cases for check:consensus-clustering.
//
// The guard's healthy output is "17 cases, 0 failures", which is also what a broken bundle prints
// if the assertions stop meaning anything. Each case edits ClimbMatchCore.jsx, proves the edit
// LANDED by checksum, runs the guard, and restores the file byte-identically.
//
// Case 1 is the real historical behaviour: exact comparison for arrays and scalars. It must fail
// the ORDER and WORDING halves at once.
//
// CASES 4 AND 5 MUST FAIL TOO, and they are the ones worth having. They make the rule LOOSER —
// sorting every array, and stripping non-alphanumerics — which is what somebody "improving" this
// would reach for. A loose rule does not under-report: a cluster of three WINS, so it publishes a
// value nobody agreed on, and it would also make a reversed waypoint sequence compare equal.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const F = path.join(ROOT, "ClimbMatchCore.jsx");
const GUARD = path.join(ROOT, "scripts/check-consensus-clustering.mjs");
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const ORIGINAL = fs.readFileSync(F, "utf8");
const BEFORE = sum(ORIGINAL);

const CASES = [
  {
    name: "1 the real historical rule: exact comparison for arrays and scalars",
    expect: "fail",
    edit: (s) => s
      .replace('if(SET_FIELDS[k]){try{return _agreeSet(a)===_agreeSet(b);}catch(e){return a===b;}}', "")
      .replace('try{return _agreeJson(a)===_agreeJson(b);}catch(e){return a===b;}',
               'try{return _stableJson(a)===_stableJson(b);}catch(e){return a===b;}')
      .replace('if(typeof a==="string"||typeof b==="string")return normEditStr(a)===normEditStr(b);', ""),
  },
  {
    name: "2 chip order matters again (SET_FIELDS emptied)",
    expect: "fail",
    edit: (s) => s.replace("var SET_FIELDS={haz:1,objHaz:1,style:1,condWindow:1};", "var SET_FIELDS={};"),
  },
  {
    name: "3 wording tolerance removed (normEditStr made identity)",
    expect: "fail",
    edit: (s) => s.replace("function normEditStr(v){\n  return String(v==null?\"\":v)",
                           "function normEditStr(v){\n  if(1)return String(v==null?\"\":v);\n  return String(v==null?\"\":v)"),
  },
  {
    name: "4 TOO LOOSE: every array sorted, so a reversed waypoint sequence agrees",
    expect: "fail",
    edit: (s) => s.replace('if(Array.isArray(v))return "["+v.map(_agreeJson).join(",")+"]";',
                           'if(Array.isArray(v))return "["+v.map(_agreeJson).slice().sort().join(",")+"]";'),
  },
  {
    name: "5 TOO LOOSE: punctuation and digits stripped, so 5.8 and 5.10 agree",
    expect: "fail",
    edit: (s) => s.replace('.replace(/\\s+/g," ").trim().replace(/[.;,]+$/,"").toLowerCase();',
                           '.replace(/[^a-z ]/gi,"").replace(/\\s+/g," ").trim().toLowerCase();'),
  },
  {
    name: "6 a comment mentioning the old rule — must stay SILENT",
    expect: "pass",
    edit: (s) => s.replace("function normEditStr(v){",
                           "/* injection case 6: _stableJson(a)===_stableJson(b) named in prose is not a regression */\nfunction normEditStr(v){"),
  },
];

let bad = 0;
for (const c of CASES) {
  const edited = c.edit(ORIGINAL);
  if (edited === ORIGINAL) {
    console.log(`  HARNESS  ${c.name}\n           EDIT NEVER LANDED — the pattern did not match. Fix the case, not the guard.`);
    bad++;
    continue;
  }
  fs.writeFileSync(F, edited);
  if (sum(fs.readFileSync(F, "utf8")) === BEFORE) {
    console.log(`  HARNESS  ${c.name}\n           checksum unchanged — the edit did not reach disk.`);
    bad++;
    fs.writeFileSync(F, ORIGINAL);
    continue;
  }
  let code = 0, output = "";
  try {
    output = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status ?? 1; output = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(F, ORIGINAL);
  if (sum(fs.readFileSync(F, "utf8")) !== BEFORE) {
    console.log("  HARNESS  restore did not return the file byte-identically — STOP and check git status.");
    process.exit(1);
  }
  const caught = code !== 0, want = c.expect === "fail";
  if (caught !== want) bad++;
  const first = output.split("\n").find((l) => /FAIL/.test(l)) || "(no failure line)";
  console.log(`  ${caught === want ? "OK  " : "MISS"}  ${c.name}`);
  console.log(`        expected ${c.expect}, got ${caught ? "fail" : "pass"} — ${first.trim()}`);
}
console.log(`\ninject-consensus-clustering-cases: ${CASES.length - bad}/${CASES.length} behaved as specified`);
process.exit(bad ? 1 : 0);
