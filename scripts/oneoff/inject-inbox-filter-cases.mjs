#!/usr/bin/env node
// Injection suite for probe-inbox-filter-claims-only-filing.mjs.
//
// Cases 1-4 restore the ORIGINAL copy one string at a time, so the probe cannot pass on the
// strength of its neighbours. Case 5 is the outcome that would be worse than the defect: a
// rewrite that stops over-claiming by also deleting the sentence which was already true.
// Case 6 must stay SILENT — a comment quoting the old wording is documentation.
//
// IT EDITS ClimbMatch.jsx IN PLACE. Do not commit, and do not build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(APP)).digest("hex");

const CASES = [
  { name: "label-claims-permission", expect: "fail",
    find: 'aria-label="Which messages reach your inbox"', repl: 'aria-label="Who can message you"',
    says: /accessible name still claims control over who may SEND/ },
  { name: "heading-claims-permission", expect: "fail",
    find: "WHICH MESSAGES REACH MY INBOX", repl: "WHO CAN MESSAGE ME",
    says: /section heading still claims control over who may SEND/ },
  { name: "everyone-option-claims-permission", expect: "fail",
    find: ">Show me every message<", repl: ">Anyone can message me<",
    says: /everyone option still claims control over who may SEND/ },
  { name: "requests-option-says-approve", expect: "fail",
    find: ">Send non-friends to Message requests<", repl: ">Approve requests from non-friends<",
    says: /nothing is approved, they are filed/ },
  // THE WORST OUTCOME: a rewrite that removes the over-claim AND the one true sentence. A change
  // that only ever deletes claims is satisfied by saying nothing at all.
  { name: "drops-the-sentence-that-was-already-true", expect: "fail",
    find: "Only your friends and crew members show up in your inbox. Anyone else can still send a message — you just won't see it.",
    repl: "Only your friends and crew members show up in your inbox.",
    says: /states the LIMIT of the control/ },
  { name: "comment-quoting-the-old-wording", expect: "pass",
    find: 'aria-label="Which messages reach your inbox"',
    repl: '/* was: Who can message you — see probe-inbox-filter-claims-only-filing.mjs */ aria-label="Which messages reach your inbox"',
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(APP, "utf8");
  const beforeSum = sum();
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  fs.writeFileSync(APP, before.replace(c.find, c.repl));
  if (sum() === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(APP, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-inbox-filter-claims-only-filing.mjs")],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(APP, before);
  if (sum() !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // A failure for a DIFFERENT reason is not a catch.
    if (caught && c.says.test(out)) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
