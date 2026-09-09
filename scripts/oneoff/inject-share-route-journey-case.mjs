#!/usr/bin/env node
// Does check:new-climber-journey's PHASE 3 assertion actually fail when a shared route stops
// being sent? The healthy answer here is "everything passes", which is also what a walk that
// asserts nothing prints -- so this is the only thing that makes that phase worth having.
//
// THE CASE IS THE REAL HISTORICAL DEFECT, not a synthetic edit. #1576's handler toasted
// "Shared <route> with <climber>" and pushed the message into the local `msgs` map and NOWHERE
// ELSE, while sendMsg() -- declared in the same component -- had always done the optimistic push
// AND the sendDirectMessage write. The injection makes exactly that call unreachable and leaves
// the toast standing, so the screen behaves identically and only the database disagrees.
//
//   node scripts/oneoff/inject-share-route-journey-case.mjs          # inject, run, restore
//   node scripts/oneoff/inject-share-route-journey-case.mjs --keep   # inject and stop
//   node scripts/oneoff/inject-share-route-journey-case.mjs --restore
//
// It EDITS ClimbMatch.jsx IN PLACE, so do not commit while it is running -- #1190 was committed
// mid-suite and shipped whichever revert happened to be live.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const BAK = path.join(ROOT, `.share-route-case.${process.pid}.bak`);
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

// Matched EXACTLY and asserted unique: this file packs whole components onto one physical line,
// so a loose match edits a different, correct control.
const LIVE = `with "+c.name.split(" ")[0]);sendMsg(c.id,`;
const BROKEN = `with "+c.name.split(" ")[0]);false&&sendMsg(c.id,`;

const read = () => fs.readFileSync(APP, "utf8");

function restore() {
  if (!fs.existsSync(BAK)) { console.log("nothing to restore (no backup for this pid)"); return; }
  fs.copyFileSync(BAK, APP);
  fs.unlinkSync(BAK);
  console.log("restored ClimbMatch.jsx");
}

if (process.argv.includes("--restore")) { restore(); process.exit(0); }

const before = read();
if (before.split(LIVE).length - 1 !== 1) {
  console.error(`REFUSED: the live share call is not present exactly once (found ${before.split(LIVE).length - 1}).`);
  console.error("Either #1576 has been reverted already, or the handler moved. Re-anchor before trusting this case.");
  process.exit(1);
}
fs.writeFileSync(BAK, before);

const injected = before.replace(LIVE, BROKEN);
fs.writeFileSync(APP, injected);
// CHECKSUM MOVEMENT PROVES AN EDIT HAPPENED, not that it was the right one -- so the content is
// asserted too. This repo has twice read "the guard missed" off an injection that never landed.
if (sum(injected) === sum(before) || !injected.includes(BROKEN)) {
  restore();
  console.error("REFUSED: the edit did not land");
  process.exit(1);
}
console.log(`injected: ${sum(before)} -> ${sum(injected)} (the share no longer calls sendMsg)`);

if (process.argv.includes("--keep")) {
  console.log("left in place. Run the walk, then: node scripts/oneoff/inject-share-route-journey-case.mjs --restore");
  process.exit(0);
}

let out = "";
try {
  const r = spawnSync("node", ["scripts/check-new-climber-journey.mjs"], { cwd: ROOT, encoding: "utf8", timeout: 1800000 });
  out = (r.stdout || "") + (r.stderr || "");
  console.log(out);
} finally {
  restore();
  const after = read();
  if (sum(after) !== sum(before)) {
    console.error(`RESTORE FAILED: ${sum(before)} != ${sum(after)} — ClimbMatch.jsx is NOT byte-identical`);
    process.exit(1);
  }
  console.log(`restored byte-identically (${sum(after)})`);
}

// JUDGED ON WHICH ASSERTION FIRED, never on the exit code. A walk that died on a loaded box also
// exits non-zero, and this repo has read one as the other twice.
const caught = /NO message row exists/.test(out);
const collateral = /never reached the database|cannot find the owner's crew|left the connection in the database/.test(out);
if (!caught) {
  console.error("MISSED — phase 3 passed with sendMsg unreachable. The message assertion is not doing anything.");
  process.exit(1);
}
if (collateral) {
  console.error("WRONG FAILURE — another phase also failed, so this run is not attributable to the injection.");
  process.exit(1);
}
console.log("CAUGHT — phase 3 fails on exactly the share assertion, and nothing else.");
