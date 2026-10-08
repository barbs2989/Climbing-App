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
//
// The last four cases edit lib/planTimes.js (a case's `file`), for the stored-legs section: a summit
// leg that holds the way down must send its descent share DOWN (push, derived, and a multi-day
// route's summit day from camp), and a single-day route's one-way climb must be left whole.
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RD = path.join(ROOT, "RouteDetail.jsx");
const PLAN = path.join(ROOT, "lib", "planTimes.js");
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
  {
    name: "multiday-gate-back-on-campoptions",
    why: "THE REAL DEFECT. campOptions is SEED-ONLY — it survives dbRouteToCamel on 0 of 8,365 WA " +
         "routes — so the amber disclaimer rendered for NOBODY in production while the gear box " +
         "beside it packed a tent on 344 of them. Note what the seed-shaped fixture reports here: " +
         "the reverted gate puts \"typically done over 1 days\" on a single-day route",
    edits: [{ find: ",multiDay=isMultiDayOuting(route);", repl: ",multiDay=route.campOptions&&route.campOptions.some(c=>c.stars>0);" }],
    expect: "fail",
    must: /says it is a multi-day outing/,
  },
  {
    name: "multiday-gate-ORs-the-seed-field-back-in",
    why: "The tempting half-fix: keep the itinerary AND honour campOptions. It satisfies every " +
         "must-appear case and re-admits a field no real route carries, so only the seed-shaped " +
         "fixture can see it — which is why that fixture exists",
    edits: [{ find: ",multiDay=isMultiDayOuting(route);", repl: ",multiDay=isMultiDayOuting(route)||!!(route.campOptions&&route.campOptions.some(c=>c.stars>0));" }],
    expect: "fail",
    must: /starred seed campOption does NOT drive it/,
  },
  {
    name: "multiday-disclaimer-fires-on-everything",
    why: "OVER-REACH. A rule that only demands the box APPEAR is satisfied by showing it always, " +
         "which would print \"typically done over 1 days\" on a car-to-car scramble. The two " +
         "must-stay-silent fixtures are what reject it",
    edits: [{ find: ",multiDay=isMultiDayOuting(route);", repl: ",multiDay=true;" }],
    expect: "fail",
    must: /single-day itinerary does NOT get the multi-day disclaimer/,
  },
  {
    name: "multiday-copy-points-at-the-tab-again",
    why: "The copy defect that was invisible for as long as the gate was dead: it sent a reader to " +
         "the Plan tab while sitting ON it, past the Trip plan rendered directly above. A gate fix " +
         "that left this would have made a circular pointer visible for the first time",
    edits: [{
      find: '{"This route is typically done over "+itinDayCount(route)+" days. The single-push estimate below is a reference only — the "}<b style={{color:C.amber}}>Trip plan</b>{" above is the realistic one."}',
      repl: 'This route is typically done over multiple days. The single-push estimate below is a reference only — use the <b style={{color:C.amber}}>Plan</b> tab for a realistic day-by-day plan.',
    }],
    expect: "fail",
    must: /already on/,
  },
  {
    name: "SILENT-multiday-copy-reworded-but-still-honest",
    why: "MUST STAY SILENT. Section 3 pins the day COUNT, the pointer's destination and the " +
         "ordering — never one phrasing. A guard pinned to the sentence would forbid improving it",
    edits: [{
      find: '{"This route is typically done over "+itinDayCount(route)+" days. The single-push estimate below is a reference only — the "}',
      repl: '{"Parties typically take "+itinDayCount(route)+" days on this route, so read the single-push estimate below as a reference only. The "}',
    }],
    expect: "pass",
  },
  {
    name: "push-descent-share-dropped-again",
    file: PLAN,
    why: "THE DEFECT THIS CALIBRATION FIXED, restored: a push climbs its 0.59 and DROPS the 0.41, " +
         "so American Border Peak walked down in 2.9 hr against 7 online",
    edits: [{ find: "const downH = Math.max((storedDescentH || 0) + legDownH, walkDownH + rapH);", repl: "const downH = Math.max(storedDescentH || 0, walkDownH + rapH);" }],
    expect: "fail",
    must: /DESCENT share \(0\.41\) is walked down/,
  },
  {
    name: "camp-rule-on-single-day-routes",
    file: PLAN,
    why: "a single-day route whose walk in ~= walk out is a one-way climb; splitting it shortens the " +
         "time UP, which the storm start counts back from",
    edits: [{ find: " && isMultiDayOuting(route) && ", repl: " && " }],
    expect: "fail",
    must: /SINGLE-day route are a one-way climb/,
  },
  {
    name: "derived-leg-not-split",
    file: PLAN,
    why: "total - approach with no stored descent is the climb AND the way down; read whole as the " +
         "way up, Cutthroat South Buttress walked down in 2 hr against 4.8 online",
    edits: [{ find: "  const derivedHoldsDescent = hasDerivedSummitH && d0 == null && a0 != null;", repl: "  const derivedHoldsDescent = false;" }],
    expect: "fail",
    must: /DERIVED leg \(total - approach\) holds the descent too/,
  },
  {
    name: "SILENT-camp-tolerance-nudged",
    file: PLAN,
    why: "MUST STAY SILENT. The guard pins the behaviour on a clear camp shape, not the exact 35% " +
         "tolerance, which a later measurement may move",
    edits: [{ find: "export const CAMP_LEG_MATCH = 0.35;", repl: "export const CAMP_LEG_MATCH = 0.3;" }],
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
  const F = c.file || RD;
  const before = fs.readFileSync(F, "utf8");
  const beforeSum = sum(F);
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
    fs.writeFileSync(F, mutated);
    if (sum(F) === beforeSum) {
      fs.writeFileSync(F, before);
      console.log(`  EDIT NEVER LANDED              ${c.name}`);
      bad++;
      continue;
    }
    res = runGuard();
  } finally {
    fs.writeFileSync(F, before);
  }
  const restored = sum(F) === beforeSum;
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
for (const f of [RD, PLAN]) if (!fs.readFileSync(f, "utf8").length) { console.error("BROKEN: " + f + " is empty."); process.exit(1); }
if (bad) process.exit(1);
