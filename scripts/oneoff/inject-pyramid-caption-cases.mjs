#!/usr/bin/env node
/* Is check:profile-claims' section 5 non-vacuous, and is it a DERIVED rule rather than a word ban?
 *
 * The defect: FullProfile captions its grade pyramid "Climbs logged at each grade" whenever you
 * are looking at somebody OTHER than yourself -- and in that branch AscentPyramid is handed no
 * logs, so it totals `climber.pyramid`, a stored career summary. Measured over every seed climber
 * that renders the section, 0 of 5 agree with the `Logged Climbs - N` heading printed directly
 * beneath it, and the pyramid runs +22 to +120 ahead.
 *
 * Every case proves its edit LANDED by checksum before the guard is believed -- "checksum movement
 * proves an edit happened, not that it was the right one" is why each also declares the text its
 * own failure must carry -- and restores ClimbMatchCore.jsx BYTE-IDENTICALLY afterwards.
 *
 * Expectations are matched against FAIL lines only, and the harness REFUSES any expectation that
 * already appears in the healthy run: an expectation written against the text an assertion prints
 * when it PASSES reports MISSED against a guard that is firing correctly, which this repo has
 * recorded making three times.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "ClimbMatchCore.jsx");
const GUARD = path.join(ROOT, "scripts", "check-profile-claims.mjs");

const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const read = () => fs.readFileSync(FILE, "utf8");

function runGuard() {
  try {
    return execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
}
const failLines = (out) => out.split("\n").filter((l) => l.includes("FAIL")).join("\n");

const CAPTION = '"Their sends by grade — a quick read on where they operate."';
const HISTORICAL = '"Climbs logged at each grade — a quick read on where they operate."';
const TAG = "<AscentPyramid routeById={routeById} logs={climber.__selfLogs} pyramid={climber.pyramid}/>";

const cases = [
  {
    name: "historical: the real pre-fix caption, restored verbatim",
    edits: [[CAPTION, HISTORICAL]],
    expect: "not logged climbs",
  },
  {
    name: "emptied rather than corrected",
    edits: [[CAPTION, '""']],
    expect: "emptied rather than corrected",
  },
  {
    name: "gutted to a bare noun (still no 'logged', but says nothing)",
    edits: [[CAPTION, '"Grades."']],
    expect: "emptied rather than corrected",
  },
  {
    name: "ANCHOR LOST: the pyramid tag is renamed",
    edits: [[TAG, TAG.replace("<AscentPyramid ", "<AscentPyramidV2 ")]],
    expect: "ANCHOR LOST",
  },
  {
    /* THE CASE THE RULE EXISTS FOR. Feed the non-self branch real logs and "logged" becomes a TRUE
       description -- so the guard must go quiet on the very wording it rejects above. A rule that
       banned the word outright would fail here and would forbid the fix. */
    name: "SILENT: 'logged' is correct once the branch is fed real logs",
    edits: [
      [CAPTION, HISTORICAL],
      [TAG, TAG.replace("logs={climber.__selfLogs}", "logs={climber.__selfLogs||climber.__peerLogs}")],
    ],
    silent: true,
  },
  {
    name: "SILENT: a different honest wording",
    edits: [[CAPTION, '"Where they operate, by grade — their sends so far."']],
    silent: true,
  },
];

const original = read();
const originalSum = sha(original);

console.log("--- healthy run ---");
const healthy = runGuard();
const healthyFails = failLines(healthy);
if (healthyFails.trim()) {
  console.log("REFUSING TO RUN: the guard is not green on a clean tree, so no case is attributable.");
  console.log(healthyFails);
  process.exit(1);
}
console.log("  guard is green on a clean tree\n");

let bad = 0;
for (const c of cases) {
  // An expectation that already appears in the green run cannot distinguish anything.
  if (c.expect && healthy.includes(c.expect)) {
    console.log(`HARNESS BUG  ${c.name}: expectation ${JSON.stringify(c.expect)} appears in the GREEN run`);
    bad++;
    continue;
  }

  let s = original;
  let landed = true;
  for (const [find, repl] of c.edits) {
    if (s.split(find).length - 1 !== 1) { landed = false; break; }
    s = s.replace(find, repl);
  }
  if (!landed || sha(s) === originalSum) {
    console.log(`HARNESS BUG  ${c.name}: the edit did not land (find string matched != 1)`);
    bad++;
    continue;
  }

  fs.writeFileSync(FILE, s);
  let out;
  try {
    out = runGuard();
  } finally {
    fs.writeFileSync(FILE, original);
    if (sha(read()) !== originalSum) {
      console.log("TREE NOT RESTORED — ClimbMatchCore.jsx differs from its original checksum");
      process.exit(1);
    }
  }

  const fails = failLines(out);
  if (c.silent) {
    if (fails.trim()) { console.log(`FIRED ON CORRECT WORK  ${c.name}\n${fails}`); bad++; }
    else console.log(`ok (silent)  ${c.name}`);
  } else if (!fails.trim()) {
    console.log(`MISSED  ${c.name}`);
    bad++;
  } else if (!fails.includes(c.expect)) {
    console.log(`WRONG FAILURE  ${c.name}: expected ${JSON.stringify(c.expect)}\n${fails}`);
    bad++;
  } else {
    console.log(`ok (caught)  ${c.name}`);
  }
}

console.log(bad ? `\n${bad} case(s) did not behave as declared` : `\n${cases.length}/${cases.length} behaved as declared`);
process.exit(bad ? 1 : 0);
