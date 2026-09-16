#!/usr/bin/env node
// Injection suite for check-return-leg.mjs section 2 -- "a warning names the DAY it lands on".
//
// The healthy output of that section is a column of "ok", which is also what a section asserting
// nothing prints. Each case edits RouteDetail.jsx in place, proves the edit landed BY CHECKSUM,
// restores the file byte-identically, and is judged on the guard's OWN failure text matched
// against FAIL LINES ONLY -- never the word "FAIL", because this guard's assertion labels contain
// ordinary prose and a bare includes() would match an `ok` line.
//
// It captures the CLEAN run first only to prove the tree is healthy before any case is attributed.
// It does NOT refuse an expectation that appears in that run -- this guard prints each assertion's
// label on `ok` and `FAIL` alike, so such a refusal rejects correct cases; judging on FAIL lines is
// what makes an expectation written against passing text report WRONG FAILURE instead of a catch.
//
// TWO CASES MUST STAY SILENT and they are the ones worth having:
//   * a comment quoting the bare pre-fix label is this fix's own documentation;
//   * REWORDING every label must change nothing. Section 2 pins no phrasing -- its invariant is
//     that a same-day tile and a next-day tile carry DIFFERENT labels and both carry one -- so a
//     guard that went red here would forbid improving the copy.
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RD = path.join(ROOT, "RouteDetail.jsx");
const GUARD = path.join(ROOT, "scripts", "check-return-leg.mjs");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 12);

const RET = '{late?<div style={{fontSize:12,color:C.red,marginTop:1}}>{dayOf(retH)>0?"Overnight":"After dark"}</div>:null}';
const SUM = '{sumLate?<div style={{fontSize:12,color:C.red,marginTop:1}}>{dayOf(sumH)>0?"Overnight":"Leave earlier"}</div>:null}';

const CASES = [
  {
    name: "revert-both-labels",
    why: "THE REAL HISTORICAL DEFECT, restored verbatim — a bare 'After dark' beside a 12:10 PM " +
         "(+1d) return and a bare 'Leave earlier' beside a 4:28 AM summit",
    edits: [
      { find: RET, repl: '{late?<div style={{fontSize:12,color:C.red,marginTop:1}}>After dark</div>:null}' },
      { find: SUM, repl: '{sumLate?<div style={{fontSize:12,color:C.red,marginTop:1}}>Leave earlier</div>:null}' },
    ],
    expect: "fail",
    must: /next-day RETURN does not reuse the same-day wording/,
  },
  {
    name: "revert-return-label-only",
    why: "one half of the pair, so neither tile can pass on the strength of the other",
    edits: [{ find: RET, repl: '{late?<div style={{fontSize:12,color:C.red,marginTop:1}}>After dark</div>:null}' }],
    expect: "fail",
    must: /next-day RETURN does not reuse the same-day wording/,
  },
  {
    name: "revert-summit-label-only",
    why: "the other half — 'Leave earlier' beside a summit that leaving earlier makes DARKER",
    edits: [{ find: SUM, repl: '{sumLate?<div style={{fontSize:12,color:C.red,marginTop:1}}>Leave earlier</div>:null}' }],
    expect: "fail",
    must: /next-day SUMMIT does not reuse the same-day wording/,
  },
  {
    name: "next-day-label-deleted",
    why: "THE OVER-REACH, and the load-bearing case: dropping the label on a next-day tile " +
         "satisfies every 'must not reuse the same-day wording' assertion while removing the " +
         "warning altogether. A rule that only ever forbids a phrase is satisfied by silence",
    edits: [{ find: '{dayOf(retH)>0?"Overnight":"After dark"}', repl: '{dayOf(retH)>0?"":"After dark"}' }],
    expect: "fail",
    must: /next-day return is still warned about at all/,
  },
  {
    name: "one-wording-everywhere",
    why: "labelling every warned tile the same way — the other direction of the same defect, " +
         "with the two clock cases collapsed onto one string instead of the other",
    edits: [
      { find: '{dayOf(retH)>0?"Overnight":"After dark"}', repl: "Overnight" },
      { find: '{dayOf(sumH)>0?"Overnight":"Leave earlier"}', repl: "Overnight" },
    ],
    expect: "fail",
    must: /does not reuse the same-day wording/,
  },
  {
    name: "keyed-on-the-estimate-not-the-tile",
    why: "the summit label asks whether the RETURN crosses midnight rather than whether its own " +
         "summit does. Every same-day and every next-day fixture still passes; only the split " +
         "route — a late same-day summit with a next-day return — can see it",
    edits: [{ find: '{dayOf(sumH)>0?"Overnight":"Leave earlier"}', repl: '{dayOf(retH)>0?"Overnight":"Leave earlier"}' }],
    expect: "fail",
    must: /same-day summit is worded like a same-day summit/,
  },
  {
    name: "a-second-dayof",
    why: "a second next-day test declared beside the label. It renders identically today and is " +
         "free to drift from the '(+Nd)' suffix rendered inches away, which is the whole reason " +
         "the label and the suffix share one function",
    edits: [{ find: "\nexport default RouteDetail;", repl: "\nfunction _dayOfDrift(){const dayOf=h=>Math.floor(h/24);return dayOf;}\nexport default RouteDetail;" }],
    expect: "fail",
    must: /dayOf is declared exactly once/,
  },
  {
    name: "SILENT-comment-quotes-the-bare-label",
    why: "MUST STAY SILENT — a comment naming the pre-fix label is this fix's own documentation, " +
         "and a guard failing on it would forbid explaining itself",
    edits: [{ find: "  const late=retH>18.5", repl: "  // the label used to read a bare After dark whatever day the return landed on\n  const late=retH>18.5" }],
    expect: "pass",
  },
  {
    name: "SILENT-every-label-reworded",
    why: "MUST STAY SILENT, and it is what proves section 2 pins no phrasing: all four strings " +
         "change and the invariant — same-day and next-day differ, and both are non-empty — is " +
         "untouched",
    edits: [
      { find: '{dayOf(retH)>0?"Overnight":"After dark"}', repl: '{dayOf(retH)>0?"Out through the night":"Back after dark"}' },
      { find: '{dayOf(sumH)>0?"Overnight":"Leave earlier"}', repl: '{dayOf(sumH)>0?"Out through the night":"Start earlier"}' },
    ],
    expect: "pass",
  },
];

const runGuard = () => {
  try {
    return { out: execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), code: 0 };
  } catch (e) {
    return { out: String(e.stdout || "") + String(e.stderr || ""), code: e.status || 1 };
  }
};
// A FAIL LINE, never the word: this guard's assertion labels are prose and several contain words
// that also appear in its `ok` output.
const failLines = (out) => out.split("\n").filter((l) => /^\s*FAIL\b/.test(l)).join("\n");

const clean = runGuard();
if (clean.code !== 0) {
  console.error("BROKEN: the guard is already failing on an unmodified tree, so no case below is attributable.");
  console.error(clean.out);
  process.exit(1);
}
/* THE "refuse an expectation that already appears in the CLEAN run" SAFEGUARD IS DELIBERATELY
   ABSENT, and trying it is what established why -- it refused every case here on the first run.
   check:return-leg prints each assertion's LABEL on its `ok` line and its `FAIL` line alike, so a
   correct expectation legitimately appears in a green run and the refusal is not a signal. Applied
   to the clean run's FAIL lines instead it is vacuous, because a green run has none.

   What actually protects against an expectation written against passing text is failLines() above:
   a needle aimed at `ok` output then matches nothing and the case reports WRONG FAILURE rather than
   a false catch. Same conclusion, and same reason, as the suite for check:count-matches-its-list. */

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(RD, "utf8");
  const beforeSum = sum(RD);
  let mutated = before;
  for (const e of c.edits) {
    if (mutated.split(e.find).length - 1 !== 1) {
      console.log(`  HARNESS BUG                    ${c.name}  ("${e.find.slice(0, 40)}..." matched ${mutated.split(e.find).length - 1} times)`);
      mutated = null;
      break;
    }
    mutated = mutated.replace(e.find, e.repl);
  }
  if (mutated === null) { bad++; continue; }

  let res;
  try {
    fs.writeFileSync(RD, mutated);
    if (sum(RD) === beforeSum) {
      fs.writeFileSync(RD, before);
      console.log(`  EDIT NEVER LANDED              ${c.name}`);
      bad++;
      continue;
    }
    res = runGuard();
  } finally {
    fs.writeFileSync(RD, before);
  }
  const restored = sum(RD) === beforeSum;
  const failed = res.code !== 0;
  const wanted = c.expect === "fail";
  let verdict;
  if (!restored) verdict = "BROKEN CASE — not restored";
  else if (failed !== wanted) verdict = wanted ? "MISSED" : "FIRED ON CORRECT WORK";
  else if (wanted && c.must && !c.must.test(failLines(res.out))) verdict = "WRONG FAILURE";
  else verdict = "ok";
  if (verdict !== "ok") bad++;
  console.log(`  ${verdict.padEnd(30)} ${c.name.padEnd(34)} restored=${restored} guard=${failed ? "fail" : "pass"} (want ${c.expect})`);
  console.log("      " + c.why);
}

console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as specified.`);
if (!fs.readFileSync(RD, "utf8").length) { console.error("BROKEN: RouteDetail.jsx is empty."); process.exit(1); }
if (bad) process.exit(1);
