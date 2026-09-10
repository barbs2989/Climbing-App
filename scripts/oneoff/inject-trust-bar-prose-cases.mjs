#!/usr/bin/env node
/* Is check:trust-breakdown's section 8 non-vacuous, and is it a BOUND rather than a ban on
 * numbers?
 *
 * The defect: a notification read "Finish verification to lift your trust score to 90+" -- six
 * above the 84 a climber can earn, twenty-five above the top tier, and promised for an action
 * worth five points. Section 7 bounds the bars inside TRUST_TIERS and is blind to one stated in
 * prose, so the same sweep that fixed four of them left this one.
 *
 * The cases that matter are the SILENT ones. A rule that only ever fires is satisfied by flagging
 * every number in every sentence mentioning trust -- and on this tree that reports a DATE ("...on
 * May 24? ... reliability feeds your trust score") as a defect. Four cases pin the edges of the
 * band and the two shapes that must stay invisible by construction: a comment, and a
 * CONCATENATION, which is the group gate's own repair and which a guard firing on it would forbid.
 *
 * Every case proves its edit LANDED by checksum before the guard is believed -- "checksum movement
 * proves an edit happened, not that it was the right one", so each also declares the text its own
 * failure must carry -- and restores every file it touches BYTE-IDENTICALLY afterwards.
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
const APP = path.join(ROOT, "ClimbMatch.jsx");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const GUARD = path.join(ROOT, "scripts", "check-trust-breakdown.mjs");

const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const read = (p) => fs.readFileSync(p, "utf8");

function runGuard() {
  try {
    return execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
}
// A dead() failure prints "check:trust-breakdown FAILED", which carries FAIL, so the fail-closed
// path is visible to the same filter as an ordinary assertion.
const failLines = (out) => out.split("\n").filter((l) => l.includes("FAIL")).join("\n");

const LIVE = '"Finish verification — it feeds your trust score, and verified climbers get more requests."';
const HISTORICAL = '"Finish verification to lift your trust score to 90+"';

const cases = [
  {
    name: "historical: the real pre-fix notification, restored verbatim",
    edits: [[APP, LIVE, HISTORICAL]],
    expect: "name a trust bar in 85..99",
  },
  {
    /* THE BOUND IS THE CEILING, NOT THE LITERAL 90. A guard pinned to the number this defect
       happened to use would go quiet on any other unreachable bar. */
    name: "a bar one point above the ceiling",
    edits: [[APP, LIVE, '"Finish verification to reach trust 85."']],
    expect: "name a trust bar in 85..99",
  },
  {
    /* Section 8 must see a TemplateElement, or half the ways this app writes copy are unwatched. */
    name: "the same bar written as a template literal",
    edits: [[APP, LIVE, "`Finish verification to lift your trust score to 90+`"]],
    expect: "name a trust bar in 85..99",
  },
  {
    /* SILENT. A bar AT the ceiling is one a climber can actually be shown, so it is correct work.
       Without this the rule is satisfied by forbidding every number beside the word trust. */
    name: "SILENT: a bar at the ceiling is reachable",
    edits: [[APP, LIVE, '"Finish verification — climbers at trust 84 get more requests."']],
    silent: true,
  },
  {
    /* SILENT. Above the model's own cap a number is not a trust score at all -- a year, a row
       count. Flagging it would report correct prose and is how the naive rule reaches 50% noise. */
    name: "SILENT: a number off the trust scale entirely",
    edits: [[APP, LIVE, '"Trust signals now cover 205543 routes."']],
    silent: true,
  },
  {
    /* SILENT, AND THE LOAD-BEARING ONE. The group gate's repair states its bar as
       "Trust " + GROUP_TRUST_MIN + "+", which puts no digit in any literal. A guard that fired on
       a derived bar would forbid the fix section 6 records. */
    name: "SILENT: a bar DERIVED from the constant rather than typed",
    edits: [[APP, LIVE, '"Finish verification — it lifts your trust score toward "+TRUST_GOAL+"."']],
    silent: true,
  },
  {
    /* SILENT. Three checkers here were fooled in one day by the comment explaining the fix they
       were checking; an AST sees none. */
    name: "SILENT: a comment quoting the forbidden string",
    edits: [[APP, LIVE, LIVE + "/* was: Finish verification to lift your trust score to 90+ */"]],
    silent: true,
  },
  {
    /* SECTION 8'S OWN NON-VACUITY FLOOR, and it edits the GUARD because that is where this
       failure lives -- the precedent check:seed-only-surfaces sets with its cases 11 and 12.
       With the needle matching nothing the walk still sees 36,328 literals and reports a
       cheerful "no bar found", which is exactly what a clean tree prints.

       IT REPLACED AN ANCHOR-LOST CASE THAT WAS TESTING SOMETHING ELSE. Renaming
       SERVER_TRUST_CAP's declaration also breaks serverTrustScore, which references the name
       internally, so the bundle threw in SECTION 3 and section 8 never ran. That is the "an
       injection that produces a different failure is not a catch" trap -- and following it
       showed section 8's two anchor checks were unreachable, so they were deleted rather than
       given a contrived case. */
    name: "the trust needle stops matching (section 8's own non-vacuity floor)",
    edits: [[GUARD, "if (/trust/i.test(v)) {", "if (/trustzzz/i.test(v)) {"]],
    expect: "no string literal mentions trust at all",
  },
];

const originals = new Map([[APP, read(APP)], [CORE, read(CORE)], [GUARD, read(GUARD)]]);
const sums = new Map([...originals].map(([p, s]) => [p, sha(s)]));
const restore = () => {
  for (const [p, s] of originals) fs.writeFileSync(p, s);
  for (const [p, want] of sums) {
    if (sha(read(p)) !== want) {
      console.log(`TREE NOT RESTORED — ${path.basename(p)} differs from its original checksum`);
      process.exit(1);
    }
  }
};

console.log("--- healthy run ---");
const healthy = runGuard();
if (failLines(healthy).trim()) {
  console.log("REFUSING TO RUN: the guard is not green on a clean tree, so no case is attributable.");
  console.log(failLines(healthy));
  process.exit(1);
}
console.log("  guard is green on a clean tree\n");

let bad = 0;
for (const c of cases) {
  if (c.expect && healthy.includes(c.expect)) {
    console.log(`HARNESS BUG  ${c.name}: expectation ${JSON.stringify(c.expect)} appears in the GREEN run`);
    bad++;
    continue;
  }

  const staged = new Map();
  let landed = true;
  for (const [file, find, repl] of c.edits) {
    const base = staged.get(file) || originals.get(file);
    if (base.split(find).length - 1 !== 1) { landed = false; break; }
    staged.set(file, base.replace(find, repl));
  }
  if (!landed || [...staged].every(([p, s]) => sha(s) === sums.get(p))) {
    console.log(`HARNESS BUG  ${c.name}: the edit did not land (find string matched != 1)`);
    bad++;
    continue;
  }

  for (const [p, s] of staged) fs.writeFileSync(p, s);
  let out;
  try { out = runGuard(); } finally { restore(); }

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
