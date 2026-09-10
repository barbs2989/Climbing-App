#!/usr/bin/env node
// Injection cases for check:sample-content-removable SECTION 4 — the sign-in reset.
//
// Section 4's healthy output is "22 ungated seeded declaration(s), 21 cleared by the sign-in
// reset", i.e. NOTHING FOUND — which is exactly what a section that stopped asking would print
// too. Its whole job is the next ungated seeded useState, so the only way to know it can still
// see one is to make one.
//
// Both cases edit ClimbMatch.jsx IN PLACE, so do not commit while this is running, and never run
// two copies at once — the second one's snapshot captures the first one's injected text and then
// "restores" it permanently. That is a real incident this repo has already had
// (inject-offline-claim-cases, 2026-09-09), which is why this refuses to start on a dirty tree and
// checksums the file back afterwards rather than trusting its own restore.
//
// Each case proves its edit LANDED by checksum before the guard is believed, and is judged on the
// guard's own FAIL text rather than on an exit code: a run that dies for an unrelated reason is
// not a catch.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const GUARD = path.join(ROOT, "scripts", "check-sample-content-removable.mjs");

const sum = (s) => crypto.createHash("sha1").update(s).digest("hex");
const runGuard = () => {
  try {
    execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out: "" };
  } catch (e) {
    return { ok: false, out: (e.stdout || "") + (e.stderr || "") };
  }
};

const orig = fs.readFileSync(APP, "utf8");
const before = sum(orig);

// A dirty tree makes every case unattributable: the guard could be failing for a reason that was
// already there, and this suite would report it as a catch.
const clean = runGuard();
if (!clean.ok) {
  console.error("REFUSING TO RUN — check:sample-content-removable is already failing, so no case here would be attributable. Fix the tree first.\n");
  console.error(clean.out);
  process.exit(1);
}

const CASES = [
  {
    // The real shape section 4 exists for: a seeded array that the reset stops clearing. It is
    // ungated by DEMO_FILLERS, so rules 1 and 3 have no marker to find and stay silent.
    name: "setter-gone",
    find: "setCrews([]);",
    repl: "",
    expect: /gated by neither/,
  },
  {
    // A broken anchor must be LOUD. Silently failing to locate the reset makes every ungated
    // declaration read as covered, and the run prints a clean sweep having checked nothing.
    name: "anchor-gone",
    find: "setNotifs([]);",
    repl: "setNotifsZ([]);",
    expect: /ANCHOR LOST/,
  },
];

let bad = 0;
for (const c of CASES) {
  const hits = orig.split(c.find).length - 1;
  if (hits !== 1) {
    console.log(`HARNESS BUG  ${c.name}: ${hits} match(es) for its find string, expected exactly 1`);
    bad++;
    continue;
  }
  fs.writeFileSync(APP, orig.replace(c.find, c.repl));
  if (sum(fs.readFileSync(APP, "utf8")) === before) {
    console.log(`HARNESS BUG  ${c.name}: the edit did not land`);
    bad++;
    fs.writeFileSync(APP, orig);
    continue;
  }

  const r = runGuard();
  if (r.ok) {
    console.log(`MISSED       ${c.name}: the guard exited 0`);
    bad++;
  } else {
    const fails = r.out.split("\n").filter((l) => /FAIL/.test(l)).join("\n");
    if (c.expect.test(fails)) console.log(`CAUGHT       ${c.name}`);
    else {
      console.log(`WRONG FAILURE ${c.name} — it failed, but not on the rule this case names:\n${fails}`);
      bad++;
    }
  }

  fs.writeFileSync(APP, orig);
  if (sum(fs.readFileSync(APP, "utf8")) !== before) {
    console.error(`TREE NOT RESTORED after ${c.name} — ClimbMatch.jsx does not match its pre-run checksum. Restore it by hand before doing anything else.`);
    process.exit(1);
  }
}

console.log(bad ? `\n${bad} case(s) misbehaved` : `\n${CASES.length}/${CASES.length} behaved as declared, and ClimbMatch.jsx is byte-identical to where it started.`);
process.exit(bad ? 1 : 0);
