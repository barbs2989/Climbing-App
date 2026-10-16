#!/usr/bin/env node
// Run the build-gate guards CONCURRENTLY instead of one after another.
//
// #1460 measured the chain at ~161s of CPU across 71 guards and named the shared-runner refactor
// as the remaining prize: 14 guards each pay a node start plus a Babel parse of ~2.0MB of JSX, and
// at least 41s of that is per-process overhead one process would pay once. That refactor is real
// and NOT free -- it means merging 14 fail-closed contracts and 14 injection suites, and CLAUDE.md
// records check:dead-props shipping three defects that each made it report a clean sweep after
// exactly that kind of rework.
//
// This gets most of the wall-clock win without touching a single guard. It changes ORCHESTRATION
// only: every guard still runs in its own process, with its own contract, its own fail-closed
// paths and its own injection suite, byte-for-byte as before.
//
// SAFE TO PARALLELISE, measured rather than assumed. On a normal run no guard writes a fixed path
// -- all six BASELINE writes are behind `--update`, which the chain never passes -- every temp
// file is pid- or mkdtemp-scoped, and none mutates cwd or process.env. That was checked before
// this was written; re-check it before adding a guard that writes anything.
//
// IT ALSO REPORTS MORE THAN THE CHAIN DID. `a && b && c` stops at the first failure, so a build
// with three broken guards showed one. This runs them all and lists every failure, which is
// strictly more information for the same work.
//
// THE DANGEROUS DIRECTION IS A RUNNER THAT PASSES WHILE A GUARD FAILS, so it fails closed four
// ways: too few guards parsed out of the chain, a child that exits non-zero, a child killed by a
// signal, and a child that could not be spawned at all.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { cpus } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));

/* The chain stays in package.json rather than being listed here, so there is no second list to
   rot -- and `check:guard-wiring` reads it from there to prove every guard runs somewhere. */
const chain = pkg.scripts["build:guards"] || "";
const guards = [...chain.matchAll(/node (scripts\/[\w./-]+\.mjs)/g)].map((m) => m[1]);

const MIN = 20;
if (guards.length < MIN) {
  console.error(`run-build-guards FAILED — parsed only ${guards.length} guard(s) from ` +
    `package.json's \`build:guards\`, expected at least ${MIN}.`);
  console.error("A runner that silently runs nothing is worse than a slow chain. Refusing.");
  process.exit(1);
}

const LIMIT = Math.max(1, Math.min(Number(process.env.GUARD_CONCURRENCY) || cpus().length, 8));
console.log(`running ${guards.length} guards, ${LIMIT} at a time\n`);

const results = new Array(guards.length);
let next = 0, done = 0;

const runOne = (i) => new Promise((resolve) => {
  const g = guards[i];
  let out = "";
  let child;
  try {
    child = spawn("node", [g], { cwd: ROOT });
  } catch (e) {
    results[i] = { g, code: 1, out: `could not spawn: ${e && e.message}` };
    return resolve();
  }
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  child.on("error", (e) => { results[i] = { g, code: 1, out: out + `\nspawn error: ${e.message}` }; resolve(); });
  child.on("close", (code, signal) => {
    /* A signal is a failure even though `code` is null for it -- a guard killed by the OOM killer
       or by a job timeout must never read as a pass. */
    results[i] = { g, code: signal ? 1 : code, signal, out };
    done++;
    process.stdout.write(`  [${String(done).padStart(2)}/${guards.length}] ${signal || code ? "FAIL" : "ok  "}  ${g.replace("scripts/", "")}\n`);
    resolve();
  });
});

const worker = async () => { while (next < guards.length) await runOne(next++); };
await Promise.all(Array.from({ length: LIMIT }, worker));

/* Printed in CHAIN order rather than completion order, so two runs of the same tree produce the
   same log and a CI diff is readable. */
const failed = [];
for (let i = 0; i < guards.length; i++) {
  const r = results[i];
  if (!r) { failed.push({ g: guards[i], out: "never ran" }); continue; }
  if (r.code) failed.push(r);
}

if (failed.length) {
  console.error(`\n${"=".repeat(72)}`);
  console.error(`${failed.length} of ${guards.length} guard(s) FAILED. All of them, not just the first:\n`);
  for (const r of failed) {
    console.error(`--- ${r.g}${r.signal ? ` (killed by ${r.signal})` : ""}`);
    console.error((r.out || "").trimEnd() || "(no output)");
    console.error("");
  }
  process.exit(1);
}

console.log(`\nok — all ${guards.length} guards passed.`);
