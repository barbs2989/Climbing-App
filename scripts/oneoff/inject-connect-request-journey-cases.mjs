#!/usr/bin/env node
// Do check:new-climber-journey's PHASE 5 assertions actually fail when a connection request stops
// working? The healthy answer there is "everything passed", which is also exactly what a phase
// asserting nothing prints -- so this is the only thing that makes that phase worth having.
//
// TWO CASES, because phase 5 makes two claims that fail in different places and only one of them
// is visible to the database:
//
//   write-gone   `sendConnectionRequest` made unreachable, with the optimistic state and the toast
//                left standing. The screen behaves identically and only the table disagrees. This
//                is the #1569 shape, and the same shape as #1563's removeConnection and #1576's
//                sendMsg -- a control that reports success in front of a write that never ran.
//
//   hydra-gone   the write is left alone and the OUTGOING half of the connection hydration is
//                dropped, so a pending row exists and the profile offers "+ Friend" again on the
//                next load. NO DATABASE ASSERTION CAN SEE THIS: the row is written, addressed
//                correctly and pending, so every table check passes while the app has forgotten.
//                It is the reload half of the phase, and the reason that half exists.
//
// WHAT IS DELIBERATELY *NOT* A CASE: writing the row as `accepted` instead of `pending`. `0087`'s
// insert policy is `auth.uid() = requester and status = 'pending'`, so RLS refuses that row
// outright -- the injection would fire "NO connection row exists" rather than the status assertion,
// and would read as a catch while proving something else. The policy makes that defect unreachable
// from a client, which is worth knowing rather than faking.
//
//   node scripts/oneoff/inject-connect-request-journey-cases.mjs            # both, in order
//   node scripts/oneoff/inject-connect-request-journey-cases.mjs write-gone # just one
//   node scripts/oneoff/inject-connect-request-journey-cases.mjs --restore
//
// It EDITS ClimbMatch.jsx IN PLACE, so do not commit while it is running -- #1190 was committed
// mid-suite and shipped whichever revert happened to be live. Two runs of this must never overlap
// either: both snapshot and restore the same file, so the second would capture the first's injected
// text and write it back as though it were the original.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const BAK = path.join(ROOT, `.connect-request-cases.${process.pid}.bak`);
const LOCK = path.join(ROOT, ".connect-request-cases.lock");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const read = () => fs.readFileSync(APP, "utf8");

// Matched EXACTLY and asserted unique: this file packs whole components onto one physical line, so
// a loose match edits a different, correct control.
const CASES = [
  {
    name: "write-gone",
    find: `sendConnectionRequest(uid,c.id).then`,
    repl: `false&&sendConnectionRequest(uid,c.id).then`,
    // The assertion this case must fire, matched against FAIL lines only. Matching the text an
    // assertion prints when it PASSES reports MISSED against a guard firing correctly, which this
    // repo has done twice.
    expect: "NO connection row exists",
  },
  {
    name: "hydra-gone",
    find: `if(outgoing.length)setFriendReqOut`,
    repl: `if(false&&outgoing.length)setFriendReqOut`,
    expect: "the pending request did not survive",
  },
];

function restore(quiet) {
  if (!fs.existsSync(BAK)) { if (!quiet) console.log("nothing to restore (no backup for this pid)"); return; }
  fs.copyFileSync(BAK, APP);
  fs.unlinkSync(BAK);
  if (!quiet) console.log("restored ClimbMatch.jsx");
}

if (process.argv.includes("--restore")) { restore(); process.exit(0); }

// An exclusive lock, because a second concurrent run would "restore" this run's injected text.
try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error(`REFUSED: ${LOCK} exists — another run of this suite is in flight.`); process.exit(1); }
const dropLock = () => { try { fs.unlinkSync(LOCK); } catch {} };
process.on("exit", dropLock);
process.on("SIGINT", () => { restore(true); dropLock(); process.exit(1); });

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const run = CASES.filter((c) => !only.length || only.includes(c.name));
if (!run.length) { console.error(`no such case. Known: ${CASES.map((c) => c.name).join(", ")}`); process.exit(1); }

const pristine = read();
let bad = 0;

for (const c of run) {
  console.log(`\n=== ${c.name} ===`);
  const before = read();
  if (sum(before) !== sum(pristine)) { console.error(`REFUSED: the tree moved between cases (${sum(pristine)} -> ${sum(before)})`); bad++; break; }
  const n = before.split(c.find).length - 1;
  if (n !== 1) {
    console.error(`HARNESS BUG — "${c.find}" occurs ${n} times, expected exactly 1. Re-anchor before trusting this case.`);
    bad++; continue;
  }
  fs.writeFileSync(BAK, before);
  const injected = before.replace(c.find, c.repl);
  fs.writeFileSync(APP, injected);
  // CHECKSUM MOVEMENT PROVES AN EDIT HAPPENED, not that it was the right one -- so the content is
  // asserted too. This repo has three times read "the guard missed" off an injection that either
  // never landed or landed somewhere that reproduced no defect.
  if (sum(injected) === sum(before) || !injected.includes(c.repl)) {
    restore(true); console.error("REFUSED: the edit did not land"); bad++; continue;
  }
  console.log(`injected: ${sum(before)} -> ${sum(injected)}`);

  let out = "";
  try {
    const r = spawnSync("node", ["scripts/check-new-climber-journey.mjs"], { cwd: ROOT, encoding: "utf8", timeout: 2400000 });
    out = (r.stdout || "") + (r.stderr || "");
    console.log(out);
  } finally {
    restore(true);
    const after = read();
    if (sum(after) !== sum(before)) {
      console.error(`TREE NOT RESTORED: ${sum(before)} != ${sum(after)} — ClimbMatch.jsx is NOT byte-identical`);
      bad++;
    } else {
      console.log(`restored byte-identically (${sum(after)})`);
    }
  }

  // JUDGED ON WHICH ASSERTION FIRED, never on the exit code: a walk that died on a loaded box also
  // exits non-zero, and a run that produced no assertions at all is inconclusive rather than a miss.
  const fails = out.split("\n").filter((l) => l.includes("FAIL"));
  if (!/^\s*ok\s/m.test(out)) {
    console.error(`INCONCLUSIVE — the walk produced no assertions (a dev server that never came up, or a box too loaded to serve). Re-run; this says nothing about the guard.`);
    bad++; continue;
  }
  const caught = fails.some((l) => l.includes(c.expect));
  const collateral = fails.some((l) =>
    /never reached the database|cannot find the owner's crew|left the connection in the database|NO message row exists/.test(l));
  if (!caught) {
    console.error(`MISSED — phase 5 did not fail on "${c.expect}". Failures were: ${fails.length ? fails.join(" | ") : "(none)"}`);
    bad++;
  } else if (collateral) {
    console.error(`WRONG FAILURE — another phase failed too, so this run is not attributable to the injection: ${fails.join(" | ")}`);
    bad++;
  } else {
    console.log(`CAUGHT — ${c.name} fails on exactly its own assertion, and nothing else.`);
  }
}

const final = read();
if (sum(final) !== sum(pristine)) { console.error(`\nTREE NOT RESTORED at exit: ${sum(pristine)} != ${sum(final)}`); bad++; }
console.log(`\n${run.length - bad}/${run.length} case(s) behaved as declared.`);
process.exit(bad ? 1 : 0);
