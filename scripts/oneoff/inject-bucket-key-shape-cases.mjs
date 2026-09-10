#!/usr/bin/env node
// Does check:add-route-fields catch a bucket-key chip group writing into a column of another
// shape — the class `approach` turned out to be one of, not the whole of?
//
// Its healthy output is "no bucket-key chip group writes into a column of another shape", which
// is also exactly what a broken scan prints. Each case edits the tree, proves the edit LANDED by
// checksum, runs the guard, and is judged on the guard's OWN failure text rather than on an exit
// code — an injection that produces a different failure is not a catch. Files are restored
// byte-identically and the run refuses if they are not.
//
// THREE CASES MUST STAY SILENT, and they are the reason the assertion is shaped the way it is:
//   3  a comment naming the keys — the trap the sibling approach suite actually hit, where a raw
//      scan reports the removal's own explanation as a re-introduction.
//   4  a bare "rappel" string that is NOT the head of a [key,"Label"] pair. `"rappel"` occurs 8
//      times in core legitimately (a vouch skills array, passesFilters' own FINDER filter), so a
//      bare-key scan would flag correct code.
//   6  the same pair shape OUTSIDE AddRoute. TIME_BUDGETS, a crag filter and RouteDetail's
//      PIN_CATEGORIES all use it correctly; the fingerprint is the shape inside THIS component.
//
// Case 5 is the load-bearing negative: outingShape's column carries a CHECK constraint naming its
// three keys (0087), so a bucket key is the RIGHT shape there. A rule that merely forbade chip
// groups would forbid the one that is correct.
//
// Do not commit while this is running, and do not run it alongside inject-approach-bucket-cases —
// both edit ClimbMatchCore.jsx and an overlapping run can "restore" the other's injected text.
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const CORE = "ClimbMatchCore.jsx";
const GUARD = "scripts/check-add-route-fields.mjs";
const sum = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

// A stable anchor INSIDE AddRoute that neither repair touched.
const IN_FORM = '{sf("road")?';
// ...and one in core but OUTSIDE AddRoute, for the scoping case.
const OUT_OF_FORM = "const TIME_BUDGETS=";

const CASES = [
  {
    name: "1-descent-chips-come-back",
    why: "REAL DEFECT: rappel/walkoff into routes.descent_text, a PROSE column",
    file: CORE, find: IN_FORM,
    repl: '{sf("descent")?<div>{[["rappel","Rappel"],["walkoff","Walk-off"]].map(o=>o[1])}</div>:null}' + IN_FORM,
    expect: /descentText bucket chips are back \(rappel, walkoff\)/,
  },
  {
    name: "2-pitch-chips-come-back",
    why: "REAL DEFECT: single/multi into routes.pitches, an INT — proposal_num turns it into NULL",
    file: CORE, find: IN_FORM,
    repl: '{sf("pitches")?<div>{[["single","Single-pitch"],["multi","Multi-pitch"]].map(o=>o[1])}</div>:null}' + IN_FORM,
    expect: /pitchCount bucket chips are back \(single, multi\)/,
  },
  {
    name: "3-SILENT-a-comment-naming-the-keys",
    why: 'MUST PASS — the repair\'s own explanation quotes "rappel"/"walkoff"; a guard firing on it would forbid explaining itself',
    file: CORE, find: IN_FORM,
    repl: '{/* never re-add ["rappel","Rappel"] or ["single","Single-pitch"] here */}' + IN_FORM,
    expect: null,
  },
  {
    name: "4-SILENT-a-bare-key-that-is-not-a-pair-head",
    why: 'MUST PASS — "rappel" is ordinary English in this app; only the [key,"Label"] chip shape is the fingerprint',
    file: CORE, find: IN_FORM,
    // A BARE ARRAY OF KEYS IS NOT A USABLE DECOY, and the first version of this case proved it:
    // `["rappel","walkoff"]` is character-identical to a [key,"Label"] pair head, so the case was
    // injecting the very shape it claimed was innocent and reported the guard as over-eager. The
    // pattern that is genuinely legitimate — and that `passesFilters` really uses — is a comparison.
    repl: '{descent==="rappel"||descent==="walkoff"?null:null}' + IN_FORM,
    expect: null,
  },
  {
    // The rule must be TARGETED: a CHECK-constrained key column is the model, so sweeping the
    // CORRECT control away with the wrong ones has to be loud. The whitelist reports this twice
    // over — the mutated group is undeclared AND the declaration is now stale — and either message
    // is a catch; this case is judged on the staleness one, which is the half that cannot rot.
    name: "5-the-correct-control-swept-away-goes-stale",
    why: "a whitelist that cannot rot: removing the one group that is RIGHT must fail, not pass",
    file: CORE, find: '["outback","Out and back"]',
    repl: '["OUTBACK_REMOVED","Out and back"]',
    expect: /chip group \[outback\/loop\/point\] is declared here but is no longer in AddRoute/,
  },
  {
    name: "6-SILENT-the-same-pair-shape-outside-AddRoute",
    why: "MUST PASS — TIME_BUDGETS, a crag filter and PIN_CATEGORIES all use this shape correctly",
    file: CORE, find: OUT_OF_FORM,
    // `u1` is deliberately NOT in this decoy. The older approach assertion above scans the whole
    // file on the BARE key, which is right for it — u1/1to3/3to6/6plus are unique tokens that
    // occur nowhere else — so including one would trip that rule and say nothing about this one.
    repl: 'const DECOY=[["rappel","Rappel"],["single","Single-pitch"],["multi","Multi-pitch"]];' + OUT_OF_FORM,
    expect: null,
  },
  {
    // THE CASE THE BLACKLIST CANNOT CATCH, and the whole reason the whitelist exists. Brand-new
    // keys, same defect: the three-key FORBIDDEN list above matches nothing here, so without the
    // group whitelist this run would be GREEN on a fresh bucket control.
    name: "7-a-NOVEL-bucket-group-the-blacklist-cannot-see",
    why: "REAL CLASS: a new chip group with unknown keys is invisible to a list of known keys",
    file: CORE, find: IN_FORM,
    repl: '{sf("comms")?<div>{[["shady","Mostly shady"],["mixed","Mixed"],["sunny","Mostly sunny"]].map(o=>o[1])}</div>:null}' + IN_FORM,
    expect: /chip group \[shady\/mixed\/sunny\] in AddRoute is not declared/,
  },
  {
    name: "8-SILENT-a-bare-two-string-list-is-not-a-group",
    why: 'MUST PASS — ["cams","nuts"] is a list of gear kinds, character-identical to a pair; only an array OF ARRAYS is a group',
    file: CORE, find: IN_FORM,
    repl: '{["cams","nuts","screws","pads"].map(x=>x).length?null:null}' + IN_FORM,
    expect: null,
  },
];

let pass = 0, bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`HARNESS BUG  ${c.name}: anchor matched ${n}x in ${c.file}`); bad++; continue; }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  if (sum(c.file) === beforeSum) { console.log(`HARNESS BUG  ${c.name}: checksum unmoved`); fs.writeFileSync(c.file, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [GUARD], { encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status ?? 1; }

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`HARNESS BUG  ${c.name}: TREE NOT RESTORED`); bad++; continue; }

  const fails = out.split("\n").filter((l) => l.includes("FAIL")).join("\n");
  if (c.expect === null) {
    if (code === 0 && !fails) { console.log(`ok    ${c.name} — correctly silent`); pass++; }
    else { console.log(`MISS  ${c.name}: fired on correct work\n${fails}`); bad++; }
  } else if (code !== 0 && c.expect.test(fails)) { console.log(`ok    ${c.name} — caught, by its own message`); pass++; }
  else { console.log(`MISS  ${c.name} (${c.why})\n  exit=${code}\n${fails || out.trim().split("\n").slice(-4).join("\n")}`); bad++; }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified`);
process.exit(bad ? 1 : 0);
