// Two injections for check:overlay-absence. Each proves its edit landed by checksum and restores
// the file byte-identically.
//   1. Revert gating to the wide window -- the real defect: logPickOpen is accused STALE against a
//      flag belonging to the `resumeFor` overlay next door, and the run must now FAIL rather than
//      print advice and exit 0.
//   2. Remove a CHECKED entry that is genuinely needed -- it must resurface as NOT YET READ.
//   4. Add a CHECKED entry for an overlay that already names a flag of its own -- the STALE
//      branch, reproduced directly rather than through the wide-window revert case 1 uses.
//
// EVERY failing case also asserts the run prints NO `ok` verdict. That is not decoration: the
// summary used to be the `else` of the ungated test alone, so a STALE or VANISHED failure exited
// 1 with `ok -- N overlay(s) assert absence: ... 0 unexamined.` as its LAST line. Case 1 already
// drove that branch and passed, because it only ever asked whether the exit code was non-zero and
// whether the message appeared -- an exit code says nothing about what the OUTPUT claims, and
// `tail` is how a guard gets read by hand.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";

import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const G = path.join(ROOT, "scripts/check-overlay-absence.mjs");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(G)).digest("hex").slice(0, 12);

const CASES = [
  { name: "1. gating back on the wide window (the real defect)",
    find: "gated: FLAGS.filter((f) => own.text.includes(f))",
    repl: "gated: FLAGS.filter((f) => wide.text.includes(f))",
    // The guard now lists every accused overlay on ONE line ("STALE: settingsOpen, logPickOpen, ..."),
    // so logPickOpen is no longer necessarily first.
    needs: /STALE: [^\n]*\blogPickOpen\b/ },
  { name: "4. a CHECKED entry for an overlay that names a flag of its own (STALE, direct)",
    find: "const CHECKED = {",
    repl: "const CHECKED = {\n  friendsOpen: 'INJECTED -- this overlay is gated by connectionsUnavailable',",
    needs: /STALE: friendsOpen/ },
  { name: "2. a genuinely needed CHECKED entry removed",
    find: "  calOpen: 'Calendar",
    repl: "  _calOpenRemoved: 'Calendar",
    needs: /NOT YET READ[\s\S]*calOpen|calOpen[\s\S]*no flag and no recorded reason/ },
];

/* Case 3 is RETIRED (2026-11-14). It stripped DbGuideDashboard's own read-error branch to prove a
   lib component that gates its overlay by itself resurfaces as unexamined. That screen went with the
   guide feature, and no remaining overlay is gated ONLY by a lib component's own error (loginOpen's
   WideFooter:error sits beside five App-level flags), so the property has no live subject to break. */

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(G, "utf8"), b = sum();
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`FAIL  ${c.name} — pattern matched ${n} times`); bad++; continue; }
  fs.writeFileSync(G, before.replace(c.find, c.repl));
  const landed = sum() !== b;
  let out = "", code = 0;
  try { out = execFileSync("node", [G], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(G, before);
  const restored = sum() === b;
  // A FAILING RUN MUST NOT PRINT AN `ok` VERDICT. Judged on the OUTPUT, never on the exit code:
  // the two disagreed for the whole life of this guard.
  const claimedOk = /^ok /m.test(out);
  const good = landed && restored && code !== 0 && c.needs.test(out) && !claimedOk;
  if (!good) bad++;
  console.log(`${good ? "  ok  " : "FAIL  "}${c.name}`);
  console.log(`        landed: ${landed}  restored: ${restored}  exit ${code}  named it: ${c.needs.test(out)}  claimed ok: ${claimedOk}`);
}

console.log(bad ? `\n${bad} case(s) wrong.` : "\nall cases behave as required.");
process.exitCode = bad ? 1 : 0;
