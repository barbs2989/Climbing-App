#!/usr/bin/env node
// Does check:onboarding-reach actually fail when a climber stops being asked -- or starts being
// asked forever? Its healthy output is "everything passed", which is also exactly what a guard
// asserting nothing prints.
//
// EIGHT CASES. Six must fire and TWO MUST STAY SILENT, and the silent pair is what stops this
// guard becoming the thing it is guarding against:
//
//   revert-effect-key    the sheet keyed back on `authed`. The real historical defect: set true in
//                        exactly one place, LoginScreen's DEMO branch, so it can never fire for a
//                        real account.
//   revert-card-gate     the card gated back on `!onboarded` -- false on every load for a real
//                        account, so "Set up your climbing profile" is offered to every established
//                        climber forever. This half was never declared as a KNOWN by anything; it
//                        was found by asking what the gate evaluates to.
//   drop-loaded-guard    `profileLoaded` removed, so every established climber matches for the
//                        moments before their profile arrives and the sheet flashes at them on
//                        every load.
//   drop-failed-guard    `!profileReadFailed` removed, so a FAILED read -- which leaves exactly the
//                        empty profile a new account has -- opens a blank onboarding sheet over a
//                        profile the app could not load. Onboarding writes location, disciplines
//                        and all three grades, so that is the check:profile-edit-gate wipe.
//   always-needs         the disciplines test removed, so it fires for everybody forever. A rule
//                        that only ever ASKS is satisfied by asking always, which is the mirror the
//                        positive cases cannot see.
//   card-off-home        the card moved back out of Home's own region.
//   SILENT-comment       a comment quoting the OLD effect verbatim. The guard masks comments with
//                        Babel precisely so it does not fail on its own documentation; firing here
//                        would forbid explaining the fix beside it.
//   SILENT-reordered     the predicate's two independent conjuncts written in the other order. It
//                        is the same rule, and a guard pinned to one spelling forbids a correct
//                        refactor.
//
// It EDITS ClimbMatch.jsx IN PLACE, so do not commit while it runs, and two runs must never
// overlap: both snapshot and restore the same file, so the second would capture the first's
// injected text and write it back as though it were the original.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const GUARD = path.join(ROOT, "scripts/check-onboarding-reach.mjs");
const LOCK = path.join(ROOT, ".onboarding-reach-cases.lock");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const read = (f) => fs.readFileSync(f, "utf8");

const EFFECT = "useEffect(()=>{if(!accountNeedsOnboarding||onboardPrompted())return;markOnboardPrompted();setOnboardOpen(true);},[accountNeedsOnboarding]);";
const CARD = '(accountNeedsOnboarding&&!homeDismiss.includes("climbsetup"))';

const CASES = [
  {
    name: "revert-effect-key", find: EFFECT,
    repl: "useEffect(()=>{if(authed&&!onboarded)setOnboardOpen(true);},[authed]);",
    // Matched against FAIL lines only. Matching the text an assertion prints when it PASSES reports
    // MISSED against a guard firing correctly, which this repo has done three times.
    expect: "keyed on `authed` again",
  },
  {
    name: "revert-card-gate", find: CARD,
    repl: '(!onboarded&&!homeDismiss.includes("climbsetup"))',
    expect: "gated on `!onboarded` again",
  },
  {
    name: "drop-loaded-guard", find: "signedIn&&profileLoaded&&!profileReadFailed",
    repl: "signedIn&&(profileLoaded||true)&&!profileReadFailed",
    expect: "resolved — predicate said true, expected false",
  },
  {
    name: "drop-failed-guard", find: "signedIn&&profileLoaded&&!profileReadFailed",
    repl: "signedIn&&profileLoaded&&(!profileReadFailed||true)",
    expect: "could not load — predicate said true, expected false",
  },
  {
    name: "always-needs", find: "&&!(profile.disciplines||[]).length", repl: "",
    expect: "does NOT — predicate said true, expected false",
  },
  {
    name: "card-off-home", find: CARD + "?<div {...clickable(()=>setOnboardOpen(true))}",
    repl: "false?<div {...clickable(()=>setOnboardOpen(true))}",
    // The gate string disappears entirely, so the guard's own exactly-once check is what fires.
    expect: "cannot disagree — matched 0, expected 1",
  },
  {
    name: "SILENT-comment",
    find: "  const accountNeedsOnboarding=",
    repl: "  /* was: useEffect(()=>{if(authed&&!onboarded)setOnboardOpen(true);},[authed]); and the card\n     was (!onboarded&&!homeDismiss.includes(\"climbsetup\")) -- both quoted so the next reader can see\n     what this replaced. */\n  const accountNeedsOnboarding=",
    expect: null,
  },
  {
    name: "SILENT-reordered",
    find: "signedIn&&profileLoaded&&!profileReadFailed",
    repl: "signedIn&&!profileReadFailed&&profileLoaded",
    expect: null,
  },
];

let bak = null;
function restore(quiet) {
  if (!bak) return;
  fs.writeFileSync(APP, bak); bak = null;
  if (!quiet) console.log("restored");
}

try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error(`REFUSED: ${LOCK} exists — another run of this suite is in flight.`); process.exit(1); }
const dropLock = () => { try { fs.unlinkSync(LOCK); } catch {} };
process.on("exit", dropLock);
process.on("SIGINT", () => { restore(true); dropLock(); process.exit(1); });

// REFUSE TO START ON A TREE THAT IS ALREADY FAILING: a dirty baseline makes every case
// unattributable, and this suite judges on WHICH assertion fired.
const base = spawnSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" });
if (base.status !== 0) {
  console.error("REFUSED: check:onboarding-reach is not green before any injection. Fix that first.");
  console.error((base.stdout || "") + (base.stderr || ""));
  process.exit(1);
}
const cleanOut = (base.stdout || "") + (base.stderr || "");
console.log("baseline: check:onboarding-reach is green\n");

const pristine = read(APP);
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const run = CASES.filter((c) => !only.length || only.includes(c.name));
if (!run.length) { console.error(`no such case. Known: ${CASES.map((c) => c.name).join(", ")}`); process.exit(1); }
let bad = 0;

// An expectation that already matches the CLEAN run is satisfied by a guard that does nothing.
for (const c of run) {
  if (c.expect && cleanOut.includes(c.expect)) {
    console.error(`REFUSED: "${c.name}" expects text that is already in the healthy output — it would pass against a guard that never fires.`);
    process.exit(1);
  }
}

for (const c of run) {
  console.log(`=== ${c.name} ===`);
  if (sum(read(APP)) !== sum(pristine)) { console.error("REFUSED: ClimbMatch.jsx moved between cases"); bad++; break; }

  const before = read(APP);
  const n = before.split(c.find).length - 1;
  if (n !== 1) {
    console.error(`HARNESS BUG — "${c.find.slice(0, 60)}" occurs ${n} times, expected 1. Re-anchor.`);
    bad++; continue;
  }
  bak = before;
  const injected = before.replace(c.find, c.repl);
  // CHECKSUM MOVEMENT PROVES AN EDIT HAPPENED, not that it was the right one -- so the content is
  // asserted too. This repo has read "the guard missed" off an injection that reproduced no defect.
  if (sum(injected) === sum(before) || (c.repl && !injected.includes(c.repl))) {
    restore(true); console.error("REFUSED: the edit did not land"); bad++; continue;
  }
  fs.writeFileSync(APP, injected);
  console.log(`injected: ${sum(before)} -> ${sum(injected)}`);

  let out = "";
  try {
    const r = spawnSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", timeout: 300000 });
    out = (r.stdout || "") + (r.stderr || "");
  } finally {
    restore(true);
    if (sum(read(APP)) !== sum(before)) { console.error("TREE NOT RESTORED: ClimbMatch.jsx is NOT byte-identical"); bad++; }
  }

  // A FAIL LINE, never the word: the guard's own labels contain "FAILED" (as in "a FAILED
  // profile read"), so a bare includes("FAIL") matches assertions that PASSED.
  const fails = out.split("\n").filter((l) => /^\s*FAIL\s/.test(l) || l.startsWith("FAIL-CLOSED:"));
  if (!/^\s*ok\s/m.test(out) && !fails.length) {
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

if (sum(read(APP)) !== sum(pristine)) { console.error("TREE NOT RESTORED at exit"); bad++; }
console.log(`${run.length - bad}/${run.length} case(s) behaved as declared.`);
process.exit(bad ? 1 : 0);
