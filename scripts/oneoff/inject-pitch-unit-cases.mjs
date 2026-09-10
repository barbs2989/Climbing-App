#!/usr/bin/env node
// Injection suite for check-units.mjs, the `pitches` section (run with --only=pitches).
//
// The fix has FOUR separable edges — prefill, the box's label, the store, and the two summary
// strings — and reverting any ONE is silent: the value still flows, in the wrong unit, under a
// success toast. Each is reverted here on its own, so the section cannot pass on the strength of
// its neighbours.
//
// `prefill-not-converted` is the one worth reading. It is the WORST of the four and the least
// obvious: an imperial climber opens a 45 m pitch, the box shows "45" under a FEET label, they
// change nothing, they save — and the pitch becomes 14 m. Nothing on screen says so.
//
// `summary-fed-canonical-rows` is the subtle one. `pitchStr` is fed the DRAFT by pendStr and
// filledStr and CANONICAL rows by curRefStr, so converting only the draft makes the editor compare
// 55m against "180m" — two conventions through one formatter.
//
// TWO CASES MUST STAY SILENT, and they are what stop this suite pinning implementation details: a
// renamed local and a reworded placeholder are ordinary work, and a suite that fired on either
// would tell an author to stop touching correct code.
//
// IT EDITS RouteDetail.jsx IN PLACE. Do not commit, and do not build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const abs = path.join(ROOT, "RouteDetail.jsx");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex");

const SEED = 'lengthM:p.lengthM!=null?uLenN(p.lengthM):""';
const STORE = "var _len=uLenIn(p.lengthM),_bolts=parseInt(p.bolts,10);";

const CASES = [
  // THE REAL HISTORICAL DEFECT: the box asked for metres whatever the setting, and stored raw.
  { name: "store-never-converts", expect: "fail",
    find: STORE, repl: "var _len=parseInt(p.lengthM,10),_bolts=parseInt(p.bolts,10);",
    says: /the column holds metres|not converting|round-trips|was rewritten/ },
  // THE WORST EDGE: metres shown under a feet label, and an untouched save shrinks the pitch 3.28x.
  { name: "prefill-not-converted", expect: "fail",
    find: SEED, repl: 'lengthM:p.lengthM!=null?p.lengthM:""',
    says: /was rewritten|the box shows|seeded with the length/ },
  { name: "box-still-asks-for-metres", expect: "fail",
    find: '"Pitch "+(idx+1)+" length in "+(uImp()?"feet":"metres")', repl: '"Pitch "+(idx+1)+" length in metres"',
    says: /asks in the climber's own units/ },
  { name: "placeholder-reverts-to-fixed-text", expect: "fail",
    find: 'placeholder={"Length ("+uLenUnit()+")"}', repl: 'placeholder="Length (m)"',
    says: /placeholder follows the setting/ },
  { name: "summary-hardcodes-metres", expect: "fail",
    find: 'pp.lengthM?pp.lengthM+uLenUnit():""', repl: 'pp.lengthM?pp.lengthM+"m":""',
    says: /labels the unit it is showing/ },
  // TWO CONVENTIONS THROUGH ONE FORMATTER — canonical metres against a display-unit draft.
  { name: "summary-fed-canonical-rows", expect: "fail",
    find: "pitchStr(routePitches)", repl: "pitchStr(route.pitchDetail)",
    says: /same convention as the draft/ },
  // THE OVER-REACH IN THE OTHER DIRECTION: converting for a METRIC climber too, which hands them
  // their own typing back changed. Worse than the defect it replaces.
  { name: "metric-converts-too", expect: "fail",
    find: SEED, repl: 'lengthM:p.lengthM!=null?Math.round(p.lengthM*3.28084):""',
    says: /was rewritten|the box shows|seeded with the length/ },
  // MUST STAY SILENT: a renamed local is not a change to what is stored.
  { name: "local-renamed", expect: "pass",
    find: STORE, repl: "var _lm=uLenIn(p.lengthM),_bolts=parseInt(p.bolts,10);var _len=_lm;",
    says: null },
  // MUST STAY SILENT: a better placeholder is ordinary editorial work. It still consults the unit
  // helper, which is the property the section asserts — pinning the exact string would forbid this.
  { name: "placeholder-reworded", expect: "pass",
    find: 'placeholder={"Length ("+uLenUnit()+")"}', repl: 'placeholder={"e.g. 30 "+uLenUnit()}',
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(abs, "utf8");
  const beforeSum = sum();
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  fs.writeFileSync(abs, before.replace(c.find, c.repl));
  if (sum() === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(abs, before); bad++; continue; }

  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "check-units.mjs"), "--only=pitches"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(abs, before);
  if (sum() !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // Judged on the FAIL lines only. A case written against the wording an assertion prints when it
    // PASSES reports MISSED against a probe firing correctly — a mistake made twice in this repo.
    const named = c.says.test(out.split("\n").filter((l) => /FAIL|ANCHOR LOST|^ {2}- /.test(l)).join("\n"));
    if (caught && named) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
