#!/usr/bin/env node
/* Does the thread-list preview assertion survive a SECOND concurrent run?
 *
 * check:message-delivery needs Chrome, a dev server and the durable fixture, so the two-run race
 * cannot be staged on demand — but the assertion is a string test, and that half is provable here.
 * The strings are LIFTED FROM SOURCE with `ANCHOR LOST` rather than retyped: a copy agrees with
 * the guard on the day it is written and measures a fossil afterwards.
 *
 * The case that matters is NON-VACUITY. Loosening `includes(BODY)` to `includes(BODY_PROSE)` is
 * only correct if the looser test can still FAIL — on an empty inbox, and on an inbox showing some
 * other conversation. A change that made the assertion unfailable would be worse than the flake.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "scripts/check-message-delivery.mjs"), "utf8");

function lift(re, what) {
  const m = src.match(re);
  if (!m) {
    console.error("ANCHOR LOST: could not lift " + what + " from check-message-delivery.mjs.\n"
      + "  Nothing below was checked. Re-anchor it — or, if a merge dropped the fix, restore it:\n"
      + "  the PREVIEW must assert the shared prose, and the OPEN THREAD this run's own tag.");
    process.exit(1);
  }
  return m[1];
}

const PROSE = lift(/const BODY_PROSE = "([^"]+)"/, "BODY_PROSE");
const previewAsserts = /must\(inbox\.includes\(BODY_PROSE\)/.test(src);
const threadAsserts  = /must\(thread\.includes\(BODY\)/.test(src);

const tag = (r) => `[${r}]`;
const body = (r) => `${PROSE} ${tag(r)}`;

// What the inbox text looks like in each situation. A thread-list preview shows only the NEWEST
// message of the one mate->owner thread; the open thread lists them all.
const MINE = "111", THEIRS = "222";
const scenarios = [
  { n: "alone — only my run's message",        inbox: `Robin\n${body(MINE)}`,   want: true },
  { n: "raced — the other run's is newest",    inbox: `Robin\n${body(THEIRS)}`, want: true },
  { n: "empty inbox",                          inbox: "No friend chats yet\nMessage a partner…", want: false },
  { n: "a different conversation entirely",    inbox: "Robin\nSee you at the crag at nine.",     want: false },
];

let bad = 0;
console.log("  preview assertion keys on: %j\n", PROSE);
for (const s of scenarios) {
  const got = s.inbox.includes(PROSE);
  const ok = got === s.want;
  console.log("  " + (ok ? "ok   " : "FAIL ") + s.n.padEnd(38)
    + "preview-passes=" + String(got).padEnd(6) + "(want " + s.want + ")");
  if (!ok) bad++;
}

// The old, run-tagged test must be shown to FAIL on the raced case — otherwise this whole change
// is fixing a problem that was not there.
const oldOnRaced = `Robin\n${body(THEIRS)}`.includes(body(MINE));
console.log("\n  the OLD run-tagged preview test, on the raced inbox: passes=" + oldOnRaced
  + "  (must be false — that is the defect)");
if (oldOnRaced) bad++;

// ...and the run-specific proof must still exist somewhere.
const threadHasMine = `Robin\n${body(THEIRS)}\n${body(MINE)}`.includes(body(MINE));
console.log("  this run's own tag, in the OPEN THREAD (lists every message): present=" + threadHasMine);
if (!threadHasMine) bad++;

if (!previewAsserts) { console.error("\nFAIL: the preview no longer asserts BODY_PROSE"); bad++; }
if (!threadAsserts)  { console.error("FAIL: the open thread no longer asserts BODY — this run's tag is unpinned"); bad++; }

if (bad) { console.error("\n" + bad + " problem(s)."); process.exit(1); }
console.log("\nok — the preview survives a raced run and still fails on an empty or unrelated inbox,\n"
  + "and this run's own tag is still pinned by the open-thread assertion.");
