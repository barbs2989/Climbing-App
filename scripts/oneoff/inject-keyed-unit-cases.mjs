#!/usr/bin/env node
// Does `check:units --only=keyed` catch a unit-bearing number added to a KEYED-object editor —
// the one contribute path that does no conversion at all?
//
// Its healthy output is "every keyed number is declared unit-invariant", which is also exactly
// what a scan that can no longer fire prints. Each case edits the tree, proves the edit LANDED by
// checksum, runs the section, and is judged on the guard's OWN failure text rather than on an exit
// code — an injection that produces a different failure is not a catch. Files are restored
// byte-identically and the run refuses if they are not.
//
// THREE CASES MUST STAY SILENT, and they are why the rule is scoped the way it is:
//   3  a new HOURS key, declared. Adding a unit-invariant number is ordinary work; a guard that
//      fired on every new number would tell authors to stop extending the form.
//   4  a free-text key whose PLACEHOLDER names a unit. Measured before the rule was written: the
//      wider "flag any entry whose label mentions a unit" rule hits FOUR live entries and all four
//      are prose ("e.g. last 4 mi rough, high clearance helps"). The app cannot convert a
//      sentence, so that rule would argue with correct work.
//   6  a numeric enum that is a RATING. A 1-5 scale is not a measurement.
//
// The harness also refuses any expectation that already appears in the HEALTHY run — the
// structural form of a mistake this repo has recorded three times, where a case was written
// against the text an assertion prints when it PASSES and reported MISSED against a guard firing
// correctly.
//
// Do not commit while this is running.
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const KEYS = "lib/objKeys.js";
const RD = "RouteDetail.jsx";
const GUARD = "scripts/check-units.mjs";
const ARGS = [GUARD, "--only=keyed"];
const sum = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

const run = () => {
  try { return { out: execFileSync("node", ARGS, { encoding: "utf8" }), code: 0 }; }
  catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status ?? 1 }; }
};

// A stable, unique anchor in each file.
const HRS = '["totalHrs","Car-to-car total (hrs)","e.g. 11.5","num"]';
const REG = "const OBJ_KEYS={";

const CASES = [
  {
    name: "1-a-distance-added-to-a-keyed-editor",
    why: "THE CLASS: a measurement on the path with no conversion stores raw miles from one climber and raw km from the next",
    file: KEYS, find: HRS, repl: '["approachMi","Approach (mi)","e.g. 3.4","num"],' + HRS,
    expect: /timing\.approachMi .*stores a NUMBER on the keyed path/,
  },
  {
    name: "2-an-elevation-added-as-a-numeric-enum",
    why: "the store path coerces a numeric enum too, so the scan must cover both shapes",
    file: KEYS, find: HRS,
    repl: '["gainBandFt","Gain band (ft)","","enum",[[1000,"Under 1,000 ft"],[3000,"1,000-3,000 ft"]]],' + HRS,
    expect: /timing\.gainBandFt .*stores a NUMBER on the keyed path/,
  },
  {
    name: "3-SILENT-a-new-hours-key-declared",
    why: "MUST PASS — a unit-invariant number is ordinary work; firing on it would forbid extending the form",
    file: KEYS, find: HRS, repl: '["summitTimeHrs","To the summit (hrs)","e.g. 8","num"],' + HRS,
    expect: null,
  },
  {
    name: "4-SILENT-a-prose-key-whose-placeholder-names-a-unit",
    why: 'MUST PASS — the app cannot convert "last 4 mi rough"; the wider label rule hits 4 live prose entries',
    file: KEYS, find: HRS, repl: '["gateNote","Gate notes","e.g. gate 2 mi below the trailhead"],' + HRS,
    expect: null,
  },
  {
    name: "5-a-stale-declaration",
    why: "the declaration list must not rot into a description of a vocabulary that moved on",
    file: KEYS, find: '["descentTimeHrs"', repl: '["descentTimeHrsRENAMED"',
    expect: /declares "descentTimeHrs", which no longer stores a number/,
  },
  {
    name: "6-SILENT-a-rating-scale-is-not-a-measurement",
    why: "MUST PASS — a 1-5 enum is a scale; declared, so it must not fire",
    file: KEYS, find: HRS, repl: '["solitudeRating","Solitude","","enum",[[1,"Busy"],[5,"Alone"]]],' + HRS,
    expect: null,
  },
  {
    name: "7-the-registry-anchor-moves",
    why: "FAIL CLOSED: with no registry the editors cannot be enumerated and every assertion below passes vacuously",
    file: RD, find: REG, repl: "const OBJ_KEYS_RENAMED={",
    expect: /ANCHOR LOST: `const OBJ_KEYS=\{` is gone/,
  },
  {
    name: "8-a-vocabulary-the-registry-names-is-not-exported",
    why: "FAIL CLOSED: reading a missing vocabulary as 'no numeric keys here' is the false-pass direction",
    file: KEYS, find: "export const TIMING_KEYS=", repl: "export const TIMING_KEYS_GONE=",
    expect: /which lib\/objKeys\.js does not export as an array/,
  },
];

// The healthy run, captured once. An expectation matching it is a case written against the text an
// assertion prints when it PASSES, which reports MISSED against a guard that is working.
const healthy = run();
if (healthy.code !== 0) {
  console.log("REFUSING TO RUN: the keyed section is not green on this tree, so no case would be attributable.");
  console.log(healthy.out.split("\n").filter((l) => l.includes("FAIL")).join("\n"));
  process.exit(1);
}

let pass = 0, bad = 0;
for (const c of CASES) {
  if (c.expect && c.expect.test(healthy.out)) {
    console.log(`HARNESS BUG  ${c.name}: its expectation already matches the HEALTHY run`);
    bad++; continue;
  }
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`HARNESS BUG  ${c.name}: anchor matched ${n}x in ${c.file}`); bad++; continue; }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  if (sum(c.file) === beforeSum) { console.log(`HARNESS BUG  ${c.name}: checksum unmoved`); fs.writeFileSync(c.file, before); bad++; continue; }

  const { out, code } = run();

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`HARNESS BUG  ${c.name}: TREE NOT RESTORED`); bad++; continue; }

  const fails = out.split("\n").filter((l) => l.includes("FAIL") || l.includes("BROKEN")).join("\n");
  if (c.expect === null) {
    if (code === 0 && !fails) { console.log(`ok    ${c.name} — correctly silent`); pass++; }
    else { console.log(`MISS  ${c.name}: fired on correct work\n${fails}`); bad++; }
  } else if (code !== 0 && c.expect.test(fails)) { console.log(`ok    ${c.name} — caught, by its own message`); pass++; }
  else { console.log(`MISS  ${c.name} (${c.why})\n  exit=${code}\n${fails || out.trim().split("\n").slice(-4).join("\n")}`); bad++; }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified`);
process.exit(bad ? 1 : 0);
