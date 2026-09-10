#!/usr/bin/env node
// Injection suite for check-units.mjs, the `itinerary` section (run with --only=itinerary).
//
// The fix has four separable parts — seed, store, the visible label and the accessible name — and
// a change that moved some of them reads as finished. Each is reverted here on its own, so the
// probe cannot pass on the strength of its neighbours.
//
// Case `orig-preservation-dropped` is not a revert of the defect at all: it reverts the part of
// the FIX that stops the fix being lossy. And `imperial-converts-too` is the over-reach in the
// other direction, which would be worse than the defect it replaces.
//
// IT EDITS ClimbMatchCore.jsx IN PLACE. Do not commit, and do not build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = "ClimbMatchCore.jsx";
const abs = path.join(ROOT, FILE);
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex");

const CASES = [
  // THE WRITE HALF — the one that corrupts a plan every other climber reads back.
  { name: "store-never-converts", expect: "fail",
    find: 'function itinStoreVal(d,k){if(!d[k])return null;if(uImp())return _itinParse[k](d[k]);',
    repl: 'function itinStoreVal(d,k){if(!d[k])return null;if(true)return _itinParse[k](d[k]);',
    says: /the column is feet/ },
  // THE SEED HALF — the box shows a number the card beside it does not.
  { name: "seed-never-converts", expect: "fail",
    find: 'const itinDraftVal=(d,k)=>d[k]!=null?(uImp()?String(d[k]):String(_itinDisp[k](d[k]))):"";',
    repl: 'const itinDraftVal=(d,k)=>d[k]!=null?String(d[k]):"";',
    says: /the gain box does not show 152/ },
  // The label and the accessible name are separate expressions, so they are reverted separately:
  // a screen reader announcing "ft" over a box holding metres is the same lie by another route.
  { name: "visible-label-reverts-to-ft", expect: "fail",
    find: 'marginBottom:3}}>{"GAIN ("+uElevUnit().toUpperCase()+")"}</div>',
    repl: 'marginBottom:3}}>GAIN (FT)</div>',
    says: /not labelled GAIN \(M\)/ },
  { name: "accessible-name-reverts-to-ft", expect: "fail",
    find: '<input aria-label={"Gain ("+uElevUnit()+")"}',
    repl: '<input aria-label="Gain (ft)"',
    says: /the gain box does not show/ },
  // NOT A REVERT OF THE DEFECT: this reverts the part of the fix that keeps it lossless. Without
  // it, editing one day's note rewrites every figure on the plan by a rounding step.
  { name: "orig-preservation-dropped", expect: "fail",
    find: '  if(o!=null&&String(d[k])===String(_itinDisp[k](o)))return o;\n',
    repl: '',
    says: /an untouched day was rewritten/ },
  // THE OVER-REACH IN THE OTHER DIRECTION. A fix that converted for everyone would hand an
  // imperial climber their own typing back changed, which is worse than the defect it replaces.
  { name: "imperial-box-shows-metres", expect: "fail",
    find: 'const itinDraftVal=(d,k)=>d[k]!=null?(uImp()?String(d[k]):String(_itinDisp[k](d[k]))):"";',
    repl: 'const itinDraftVal=(d,k)=>d[k]!=null?String(Math.round(d[k]/3.28084)):"";',
    says: /imperial: the gain box does not show 500/ },
  // MUST STAY SILENT, AND THIS ONE IS A MEASUREMENT RATHER THAN A CASE. Dropping the uImp() early
  // return looks like it should break the imperial reading and does not: uElevN/uElevIn/uDistMiN
  // are IDENTITY under imperial, so the only thing that branch preserves is the exact parse
  // (parseInt vs a rounded +v), and nothing reachable can tell those apart — gainFt, lossFt and
  // packLb are typed through intOnly, and parseFloat and Math.round(n*100)/100 agree on every
  // decimal the miles box accepts. So the branch is justified by reading, not by behaviour, and
  // this case records that rather than pretending a test covers it. It read as a MISSED catch
  // first; the probe was right and the case was wrong.
  { name: "unit-guard-removed-is-observably-identical", expect: "pass",
    find: 'function itinStoreVal(d,k){if(!d[k])return null;if(uImp())return _itinParse[k](d[k]);',
    repl: 'function itinStoreVal(d,k){if(!d[k])return null;',
    says: null },
  // THE DOWNLOADED FILE, reverted on its own: every on-screen assertion still passes while the
  // .txt a climber carries into the field disagrees with the card it was made from.
  { name: "downloaded-plan-reverts-to-feet", expect: "fail",
    find: 'if(d.gainFt)stats.push("Gain "+uElev(d.gainFt));',
    repl: 'if(d.gainFt)stats.push("Gain "+d.gainFt+" ft");',
    says: /the downloaded plan is in the wrong units/ },
  // THE SECOND WRITER, reverted in each half. Every itinerary assertion still passes while the
  // bail form writes kilometres into a column of miles.
  { name: "bail-label-reverts-to-mi", expect: "fail",
    find: 'marginBottom:5}}>{"DIST. TO SAFETY ("+uDistMiUnit().toUpperCase()+")"}</div>',
    repl: 'marginBottom:5}}>DIST. TO SAFETY (MI)</div>',
    says: /the bail distance is not labelled/ },
  { name: "bail-submit-stores-what-was-typed", expect: "fail",
    find: 'distMi:distMi?uDistMiIn(distMi):undefined,', repl: 'distMi:distMi?Number(distMi):undefined,',
    says: /the bail form stores what was typed|raw submit expression is still there/ },
  // MUST STAY SILENT: renaming a local map is ordinary work, and a probe that fired on it would
  // pin an implementation detail rather than the promise.
  { name: "local-map-renamed", expect: "pass",
    find: "const _itinDisp={", repl: "const _itinShow={", also: [["_itinDisp[k]", "_itinShow[k]"]],
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(abs, "utf8");
  const beforeSum = sum();
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  let after = before.replace(c.find, c.repl);
  for (const [a, b] of c.also || []) after = after.split(a).join(b);
  fs.writeFileSync(abs, after);
  if (sum() === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(abs, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "check-units.mjs"), "--only=itinerary"],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(abs, before);
  if (sum() !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // A failure for a DIFFERENT reason is not a catch. Match the FAIL line, never the ok wording.
    const named = c.says.test(out.split("\n").filter((l) => /FAIL|^  - /.test(l)).join("\n"));
    if (caught && named) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
