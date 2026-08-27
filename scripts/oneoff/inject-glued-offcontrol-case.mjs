#!/usr/bin/env node
// Injection for check:a11y-badges SECTION 2 — the off-control glue scan.
//
// THE REAL HISTORICAL DEFECT, not a synthetic one: it removes the {" "} separator from the route
// page's conditions list, putting the file back to what rendered "Best windowmid-Jul to early Sep"
// on a plain heading div. Section 1 was green on that exact tree, because its judgement is the
// computed CONTROL NAME and this is not a control.
//
// The run is long (65 screens), so this drives the guard with ONLY=route to reach the screen the
// defect is on. It proves its edit landed by checksum and restores the file byte-identically.
//
//   node scripts/oneoff/inject-glued-offcontrol-case.mjs

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "RouteDetail.jsx");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

const FIXED = 'marginBottom:2}}>{pat.label}{" "}{pat.when?<span';
const BROKEN = 'marginBottom:2}}>{pat.label}{pat.when?<span';

function runGuard() {
  try {
    execFileSync("node", ["scripts/check-a11y-badge-names.mjs", "--only=route"],
      { cwd: ROOT, encoding: "utf8", stdio: "pipe", timeout: 900000 });
    return { code: 0, out: "" };
  } catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
}

const before = fs.readFileSync(FILE, "utf8");
if (before.split(FIXED).length - 1 !== 1) {
  console.error("EDIT NEVER LANDED — the anchor moved. Fix the case, not the guard.");
  process.exit(1);
}

console.log("baseline: guard on a clean tree...");
const clean = runGuard();
if (clean.code !== 0) {
  console.error("REFUSING to run: the guard already fails on a clean tree, so the case below would mean nothing.\n" + clean.out.slice(-1200));
  process.exit(1);
}
console.log("  clean tree passes\n");

fs.writeFileSync(FILE, before.replace(FIXED, BROKEN));
const landed = sum(fs.readFileSync(FILE, "utf8")) !== sum(before);
const r = runGuard();
fs.writeFileSync(FILE, before);
const restored = sum(fs.readFileSync(FILE, "utf8")) === sum(before);

const failed = r.code !== 0;
// It must fail NAMING the glue, not for some other reason — a run that dies on a port race or a
// dev-server timeout is not a catch.
const named = /OFF a control/.test(r.out) && /welded token/.test(r.out);
const ok = landed && restored && failed && named;

console.log(`${ok ? "PASS" : "FAIL"}  the real conditions-list glue, with the separator removed`);
console.log(`        edit landed: ${landed}   restored byte-identical: ${restored}   guard ${failed ? "FAILED" : "passed"} (wanted FAILED)`);
if (failed && !named) console.log("        but it did not fail on the off-control scan — a failure for another reason is not a catch");
if (!ok) console.log("        " + r.out.split("\n").slice(-14).join("\n        "));
process.exit(ok ? 0 : 1);
