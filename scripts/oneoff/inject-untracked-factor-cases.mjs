#!/usr/bin/env node
// Does check:untracked-factors actually fail when a factor nobody measured starts reading as zero?
// Its healthy output is "everything passed", which is also exactly what a guard asserting nothing
// prints -- and this guard was PROMOTED from a probe whose core comparison was only PRINTED, so
// that is not a hypothetical here: the rule it exists for could not fail until section 1 became
// assertions. These cases are what says it can.
//
// FIVE CASES. Four must fire and ONE MUST STAY SILENT, because a guard that only ever demands
// "Not yet tracked" is satisfied by making the row always untracked -- which would hide a genuine
// no-show record. Only the pair pins the rule.
//
//   revert-coercion    App's Math.max(1,committed) divide-by-zero guard restored: the real #1569
//                      defect, which turns 0/0 into the number 0. Section 1 executes CORE and is
//                      untouched, so ONLY the wiring section fires -- which is what makes the
//                      finding attributable to the App half rather than to the branch.
//   always-untracked   `_rel` forced to null in CORE, so a REAL 0% is hidden as untracked. This is
//                      the over-suppression direction and the case the guard most needs.
//   untracked-counts   the untracked branch keeps max 18, so 18 points of unfillable goal stay in
//                      the denominator while the copy still reads "Not yet tracked".
//   trip-report-fork   the trip report's connect button forked back off connect(), which is
//                      #1569's other defect and the one the journey walk does NOT cover.
//   SILENT-reworded    the reliability sentence reworded while its nullability is untouched. The
//                      guard keys on the untracked BRANCH, not on one phrasing; firing here would
//                      forbid ever improving the copy.
//
// It EDITS ClimbMatchCore.jsx AND ClimbMatch.jsx IN PLACE, so do not commit while it runs -- #1190
// was committed mid-suite and shipped whichever revert happened to be live. Two runs must never
// overlap: both snapshot and restore the same files, so the second would capture the first's
// injected text and write it back as though it were the original.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const LOCK = path.join(ROOT, ".untracked-factor-cases.lock");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const read = (f) => fs.readFileSync(f, "utf8");

const CASES = [
  {
    name: "revert-coercion", file: APP,
    find: "relLedger.committed?Math.round(relLedger.honored/relLedger.committed*100):null",
    repl: "Math.round(relLedger.honored/Math.max(1,relLedger.committed)*100)",
    // Matched against FAIL lines only. Matching the text an assertion prints when it PASSES
    // reports MISSED against a guard firing correctly, which this repo has done twice.
    expect: "the divide-by-zero guard is back",
  },
  {
    name: "always-untracked", file: CORE,
    find: "var _rel=c.reliability!=null?c.reliability:null;",
    repl: "var _rel=null;",
    expect: "a genuine no-show record must not be hidden",
  },
  {
    name: "untracked-counts", file: CORE,
    find: "max:_rel!=null?18:0",
    repl: "max:18",
    expect: "points of goal the climber cannot fill",
  },
  {
    name: "trip-report-fork", file: APP,
    find: "onConnect={c=>connect(c)}",
    repl: "onConnect={c=>{setConnections(pp=>pp.find(x=>x.id===c.id)?pp:[...pp,c]);showToast(\"You are now friends\");}}",
    expect: "forked from connect() again",
  },
  {
    name: "SILENT-reworded", file: CORE,
    find: "% of confirmed crews honored — no-shows hurt this",
    repl: "% of the crews you confirmed were honoured — missing one costs you here",
    expect: null, // must stay silent
  },
];

let bak = null;
function restore(quiet) {
  if (!bak) return;
  for (const [f, txt] of Object.entries(bak)) fs.writeFileSync(f, txt);
  bak = null;
  if (!quiet) console.log("restored");
}

if (process.argv.includes("--restore")) { console.log("nothing to restore — this suite restores in a finally"); process.exit(0); }

try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error(`REFUSED: ${LOCK} exists — another run of this suite is in flight.`); process.exit(1); }
const dropLock = () => { try { fs.unlinkSync(LOCK); } catch {} };
process.on("exit", dropLock);
process.on("SIGINT", () => { restore(true); dropLock(); process.exit(1); });

// REFUSE TO START ON A TREE THAT IS ALREADY FAILING: a dirty baseline makes every case
// unattributable, and this suite judges on which assertion fired.
const base = spawnSync("node", [path.join(ROOT, "scripts/check-untracked-factors.mjs")], { cwd: ROOT, encoding: "utf8" });
if (base.status !== 0) {
  console.error("REFUSED: check:untracked-factors is not green before any injection. Fix that first.");
  console.error((base.stdout || "") + (base.stderr || ""));
  process.exit(1);
}
console.log("baseline: check:untracked-factors is green\n");

const pristine = { [CORE]: read(CORE), [APP]: read(APP) };
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const run = CASES.filter((c) => !only.length || only.includes(c.name));
if (!run.length) { console.error(`no such case. Known: ${CASES.map((c) => c.name).join(", ")}`); process.exit(1); }
let bad = 0;

for (const c of run) {
  console.log(`=== ${c.name} ===`);
  for (const [f, txt] of Object.entries(pristine)) {
    if (sum(read(f)) !== sum(txt)) { console.error(`REFUSED: ${path.basename(f)} moved between cases`); bad++; }
  }
  if (bad) break;

  const before = read(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) {
    console.error(`HARNESS BUG — "${c.find}" occurs ${n} times in ${path.basename(c.file)}, expected 1. Re-anchor.`);
    bad++; continue;
  }
  bak = { [c.file]: before };
  const injected = before.replace(c.find, c.repl);
  fs.writeFileSync(c.file, injected);
  // CHECKSUM MOVEMENT PROVES AN EDIT HAPPENED, not that it was the right one -- so the content is
  // asserted too. This repo has read "the guard missed" off an injection that reproduced no defect.
  if (sum(injected) === sum(before) || !injected.includes(c.repl)) {
    restore(true); console.error("REFUSED: the edit did not land"); bad++; continue;
  }
  console.log(`injected into ${path.basename(c.file)}: ${sum(before)} -> ${sum(injected)}`);

  let out = "";
  try {
    const r = spawnSync("node", [path.join(ROOT, "scripts/check-untracked-factors.mjs")], { cwd: ROOT, encoding: "utf8", timeout: 300000 });
    out = (r.stdout || "") + (r.stderr || "");
  } finally {
    restore(true);
    if (sum(read(c.file)) !== sum(before)) { console.error(`TREE NOT RESTORED: ${path.basename(c.file)} is NOT byte-identical`); bad++; }
  }

  const fails = out.split("\n").filter((l) => l.includes("FAIL"));
  if (!/^\s*ok\s/m.test(out)) {
    console.error(`INCONCLUSIVE — the guard produced no assertions:\n${out.slice(0, 400)}`);
    bad++; continue;
  }
  if (c.expect === null) {
    if (!fails.length) console.log("SILENT — correct work is not reported, as declared.");
    else { console.error(`FIRED ON CORRECT WORK — ${fails.join(" | ")}`); bad++; }
  } else if (fails.some((l) => l.includes(c.expect))) {
    console.log(`CAUGHT — fails on "${c.expect}".`);
  } else {
    console.error(`MISSED — no failure mentioned "${c.expect}". Failures were: ${fails.length ? fails.join(" | ") : "(none)"}`);
    bad++;
  }
  console.log("");
}

for (const [f, txt] of Object.entries(pristine)) {
  if (sum(read(f)) !== sum(txt)) { console.error(`TREE NOT RESTORED at exit: ${path.basename(f)}`); bad++; }
}
console.log(`${run.length - bad}/${run.length} case(s) behaved as declared.`);
process.exit(bad ? 1 : 0);
