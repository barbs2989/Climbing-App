#!/usr/bin/env node
// Injection suite for probe-prefs-fold-is-behaviour-neutral.mjs.
//
// The fold moved working guard logic out of two modules into one. That is the kind of change that
// looks obviously safe, so each way it could have gone wrong is reverted here one at a time:
// a lost guard, a lost validation, a key collision (the mistake a fold is the natural way to
// make), and the wiring that makes the new module more than dead code.
//
// Case `precondition` is the one that is not about the fold at all: remembering the inbox filter
// is only honest because #1625 reworded it, so restoring the old label must fail.
//
// IT EDITS lib/ AND THE APP IN PLACE. Do not commit, and do not build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(ROOT, f))).digest("hex");

const CASES = [
  // The guard is the whole reason these modules exist. Without it an SSR render dies at module
  // load, which is how a dozen guards import the app.
  { name: "guard-removed-from-the-shared-core", file: "lib/prefs.js", expect: "fail",
    find: "    try {\n      const v = localStorage.getItem(key);\n      return valid.indexOf(v) >= 0 ? v : dflt;\n    } catch {\n      // Includes the ReferenceError when `localStorage` does not exist at all (node, SSR).\n      return dflt;\n    }",
    repl: "    const v = localStorage.getItem(key);\n    return valid.indexOf(v) >= 0 ? v : dflt;",
    says: /survives having no localStorage|localStorage is not defined/ },
  // Validating only on write trusts whatever is already stored, and "" is the reachable junk.
  { name: "read-stops-validating", file: "lib/prefs.js", expect: "fail",
    find: "      return valid.indexOf(v) >= 0 ? v : dflt;", repl: "      return v === null ? dflt : v;",
    says: /empty string is believed|junk storage is believed/ },
  { name: "write-stops-validating", file: "lib/prefs.js", expect: "fail",
    find: "    if (valid.indexOf(v) < 0) return;", repl: "    if (v === undefined) return;",
    says: /wrote a value the control does not offer/ },
  // THE MISTAKE A FOLD IS THE NATURAL WAY TO MAKE: one key serving two preferences.
  { name: "two-preferences-share-a-key", file: "lib/inbox-pref.js", expect: "fail",
    find: 'definePref("climbmatch-inbox-filter"', repl: 'definePref("climbmatch-units"',
    says: /share a key|distinct keys/ },
  // A module nothing calls is dead code, and every assertion above still passes.
  { name: "not-seeded", file: "ClimbMatch.jsx", expect: "fail",
    find: '[msgFrom,setMsgFrom]=useState(loadInboxFilter)', repl: '[msgFrom,setMsgFrom]=useState("everyone")',
    says: /is not seeded/ },
  { name: "not-written", file: "ClimbMatch.jsx", expect: "fail",
    find: 'onChange={e=>{setMsgFrom(e.target.value);saveInboxFilter(e.target.value);}}',
    repl: 'onChange={e=>setMsgFrom(e.target.value)}',
    says: /does not write it/ },
  // Not about the fold: persisting this control is only honest while its label is.
  { name: "precondition-label-claims-permission", file: "ClimbMatch.jsx", expect: "fail",
    find: 'aria-label="Which messages reach your inbox"', repl: 'aria-label="Who can message you"',
    says: /durably keeps a promise the app cannot keep/ },
  // MUST STAY SILENT: a valid rewrite of the shared core.
  { name: "valid-refactor-of-the-core", file: "lib/prefs.js", expect: "pass",
    find: "  const save = (v) => {", repl: "  const save = function (v) {",
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const abs = path.join(ROOT, c.file);
  const before = fs.readFileSync(abs, "utf8");
  const beforeSum = sum(c.file);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  fs.writeFileSync(abs, before.replace(c.find, c.repl));
  if (sum(c.file) === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(abs, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-prefs-fold-is-behaviour-neutral.mjs")],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(abs, before);
  if (sum(c.file) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

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
