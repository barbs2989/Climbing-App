#!/usr/bin/env node
// Injection harness for check:screen-lists' CLAUDE.md Architecture section (section 4).
//
// Case 1 is the real historical defect, restored verbatim: the bullet said
// overview/conditions/planner/safety/photos/`ranks` — `ranks` is a top-level NAV tab and
// has never been a route sub-tab, and `partners` was missing. That is the same wrong list
// this guard's own header records as costing check:token-boxes a walk.
//
// CASE 4 MUST PASS: the sub-bullet beneath the list NAMES the absent id while explaining
// it. The check reads only the bullet's own line for exactly that reason, and a version
// that scanned the whole entry would fail on its own documentation — the trap
// check:ci-cancel records from the other side.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MD = path.join(ROOT, "CLAUDE.md");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const GOOD = "sub-`tab` state: `overview`, `conditions`, `planner`, `safety`, `partners`, `photos`.";

const CASES = [
  { name: "1 ranks-back (real defect)", find: GOOD, repl: "sub-`tab` state: `overview`, `conditions`, `planner`, `safety`, `photos`, `ranks`.", expect: "fail" },
  { name: "2 partners-missing", find: GOOD, repl: "sub-`tab` state: `overview`, `conditions`, `planner`, `safety`, `photos`.", expect: "fail" },
  { name: "3 anchor renamed", find: "- `routes` — explore climbs by area", repl: "- `climbs` — explore climbs by area", expect: "fail" },
  { name: "4 explanation names the absent id", find: "**Six, and Ranks is NOT one of them**", repl: "**Six — `ranks` is NOT one of them**", expect: "pass" },
];

let bad = 0;
for (const c of CASES) {
  const orig = fs.readFileSync(MD, "utf8");
  const before = sha(orig);
  const n = orig.split(c.find).length - 1;
  if (n !== 1) { console.log(`  ${c.name}: HARNESS BUG — pattern matched ${n} times`); bad++; continue; }
  fs.writeFileSync(MD, orig.replace(c.find, c.repl));
  const landed = sha(fs.readFileSync(MD, "utf8")) !== before;
  let passed, out = "";
  try { execFileSync("node", [path.join(ROOT, "scripts", "check-screen-lists.mjs")], { stdio: "pipe" }); passed = true; }
  catch (e) { passed = false; out = String((e.stderr || "") + (e.stdout || "")); }
  fs.writeFileSync(MD, orig);
  const restored = sha(fs.readFileSync(MD, "utf8")) === before;
  // a failure must come from SECTION 4, not from one of the script-list sections above it
  const right = passed || /Architecture bullet|ANCHOR LOST — CLAUDE\.md/.test(out);
  const got = passed ? "pass" : "fail";
  const ok = landed && restored && got === c.expect && right;
  if (!ok) bad++;
  console.log(`  ${c.name}: landed=${landed} restored=${restored} guard=${got} expected=${c.expect}${passed ? "" : ` section4=${right}`} ${ok ? "OK" : "*** WRONG ***"}`);
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nall ${CASES.length} cases behaved`);
process.exit(bad ? 1 : 0);
