#!/usr/bin/env node
// measure:guard-reach — did moving code make a guard go BLIND?
//
// The guards read the app's TEXT. When a component moves out of ClimbMatch.jsx, ClimbMatchCore.jsx
// or RouteDetail.jsx, a guard that still reads only the parent does not fail — every pattern that
// used to match inside the component now matches nothing, and a rule that only ever FORBIDS passes.
// That happened on 2026-09-24 (#1864, #1883): twenty screens moved into lib/ and the chain stayed
// green while several guards were reading none of them. The detector recorded then is this one:
// capture what every build guard PRINTS before the move, capture it again after, and read any
// count that dropped — to zero above all — as a guard that lost sight of something.
//
//   node scripts/measure-guard-reach.mjs --out before.json          # on the tree BEFORE the move
//   node scripts/measure-guard-reach.mjs --out after.json --compare before.json   # AFTER
//
// It runs the same list `npm run build` runs (parsed out of package.json, so there is no second
// list to rot), records each guard's exit code and every integer it printed, and in --compare
// mode fails if any guard that passed before now fails, printed a number that fell to zero, or
// printed fewer numbers than before. A count that merely CHANGED is listed, not failed: a move
// legitimately shifts a file count by one.
//
// What it cannot see: a guard whose counts are unchanged because the moved code never held a
// match for it. That is the no-finding case, and it is fine — the hazard is the drop, not the
// steady number.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const OUT = arg("--out"), COMPARE = arg("--compare");
if (!OUT) { console.error("usage: measure-guard-reach.mjs --out <file.json> [--compare <before.json>]"); process.exit(2); }

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const guards = [...(pkg.scripts["build:guards"] || "").matchAll(/node (scripts\/[\w./-]+\.mjs)/g)].map((m) => m[1]);
if (guards.length < 20) { console.error(`parsed only ${guards.length} guards from build:guards — refusing`); process.exit(1); }

const LIMIT = Math.max(1, Math.min(Number(process.env.GUARD_CONCURRENCY) || 4, 8));
const results = {};
let next = 0;
const runOne = (g) => new Promise((resolve) => {
  let out = "";
  const child = spawn("node", [g], { cwd: ROOT });
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  child.on("close", (code, signal) => {
    // Every integer the guard printed, in order. Durations are rare in guard output and the
    // comparison tolerates a changed value; only a drop to zero or a missing number is a finding.
    // Node's own warnings — `(node:85793) ExperimentalWarning …` and the `    at …` stack frames
    // under them — are dropped first: they carry a pid and line numbers, appear or not depending on
    // the box's load, and on the first use of this tool they made two guards read as blinded when
    // their own counts were identical.
    const clean = out.split("\n").filter((l) => !/^\(node:\d+\)/.test(l) && !/^\s+at /.test(l)).join("\n");
    const numbers = (clean.match(/\b\d+\b/g) || []).map(Number);
    results[g] = { code: signal ? 1 : code, numbers, lines: out.split("\n").length };
    process.stdout.write(`  ${code || signal ? "FAIL" : "ok  "}  ${g.replace("scripts/", "")}\n`);
    resolve();
  });
});
const worker = async () => { while (next < guards.length) await runOne(guards[next++]); };
await Promise.all(Array.from({ length: LIMIT }, worker));
fs.writeFileSync(OUT, JSON.stringify({ taken: new Date().toISOString(), results }, null, 1));
console.log(`\nwrote ${OUT} — ${guards.length} guards.`);

if (COMPARE) {
  const before = JSON.parse(fs.readFileSync(COMPARE, "utf8")).results;
  let bad = 0, changed = 0;
  for (const g of guards) {
    const a = before[g], b = results[g];
    if (!a) { console.log(`  new   ${g} (not in the baseline)`); continue; }
    if (a.code === 0 && b.code !== 0) { console.error(`  FAIL  ${g} passed before and fails now`); bad++; continue; }
    if (b.numbers.length < a.numbers.length) { console.error(`  FAIL  ${g} printed ${a.numbers.length} number(s) before, ${b.numbers.length} now — a count went missing`); bad++; continue; }
    const zeroed = a.numbers.filter((n, i) => n > 0 && b.numbers[i] === 0);
    if (zeroed.length) { console.error(`  FAIL  ${g} — a count that was ${zeroed.join("/")} is now 0: the guard has lost sight of something`); bad++; continue; }
    if (a.numbers.join() !== b.numbers.join()) { changed++; console.log(`  diff  ${g}  ${a.numbers.slice(0, 6).join(",")} → ${b.numbers.slice(0, 6).join(",")}`); }
  }
  console.log(`\nmeasure:guard-reach — ${guards.length} guards compared, ${changed} with changed counts, ${bad} blinded or broken.`);
  if (bad) process.exit(1);
  console.log("ok — no guard lost a count it had before.");
}
