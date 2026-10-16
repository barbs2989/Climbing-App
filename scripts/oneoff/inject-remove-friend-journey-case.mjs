#!/usr/bin/env node
// Does check:new-climber-journey's PHASE 3 assertion actually fail when remove-friend stops
// persisting? The healthy answer here is "everything passes", which is exactly what a walk that
// asserts nothing prints -- so the only thing that makes phase 3 worth having is this.
//
// THE CASE IS THE REAL HISTORICAL DEFECT, not a synthetic edit. #1563's handler filtered local
// state and toasted success while `removeConnection` sat imported and called from nowhere; the
// injection reverts exactly that call, leaving the optimistic filter and the toast in place. So
// the screen behaves identically and only the database disagrees -- which is the whole class.
//
//   node scripts/oneoff/inject-remove-friend-journey-case.mjs          # inject, run, restore
//   node scripts/oneoff/inject-remove-friend-journey-case.mjs --keep   # inject and stop
//   node scripts/oneoff/inject-remove-friend-journey-case.mjs --restore
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
const BAK = path.join(ROOT, `.remove-friend-case.${process.pid}.bak`);
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

// The live call, lifted verbatim. Matched EXACTLY and asserted unique: this file packs whole
// components onto one physical line, so a loose match edits a different, correct control.
const LIVE = `if(uid&&_row&&_row._dbId){removeConnection(_row._dbId).then(`;
// The defect: never reach the write. Everything else -- the optimistic filter above, the toast,
// the revert path -- is left exactly as it is, because the point is that they all still look right.
const BROKEN = `if(false&&uid&&_row&&_row._dbId){removeConnection(_row._dbId).then(`;

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
  console.error(`REFUSED: the live call is not present exactly once (found ${before.split(LIVE).length - 1}).`);
  console.error("Either #1563 has been reverted already, or the handler moved. Re-anchor before trusting this case.");
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
console.log(`injected: ${sum(before)} -> ${sum(injected)} (removeConnection is now unreachable)`);

if (process.argv.includes("--keep")) {
  console.log("left in place. Run the walk, then: node scripts/oneoff/inject-remove-friend-journey-case.mjs --restore");
  process.exit(0);
}

let out = "";
try {
  const r = spawnSync("node", ["scripts/check-new-climber-journey.mjs"], { cwd: ROOT, encoding: "utf8", timeout: 900000 });
  out = (r.stdout || "") + (r.status !== 0 ? "" : "") + (r.stderr || "");
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
// exits 1, and this repo has read one as the other twice.
const caught = /left the connection in the database/.test(out);
const collateral = /never reached the database|cannot find the owner's crew/.test(out);
if (!caught) {
  console.error("MISSED — phase 3 passed with removeConnection unreachable. The DB assertion is not doing anything.");
  process.exit(1);
}
if (collateral) {
  console.error("WRONG FAILURE — phase 1 or 2 also failed, so this run is not attributable to the injection.");
  process.exit(1);
}
console.log("CAUGHT — phase 3 fails on exactly the removal assertion, and nothing else.");
