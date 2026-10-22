#!/usr/bin/env node
// lint — ESLint over the app's source (eslint.config.js), zero warnings allowed.
//
// The rules are the three the owner asked to be held at zero before any feature ships: unused
// variables, `any` types, and hooks (rules-of-hooks + exhaustive-deps dependency arrays). Every
// rule is an ERROR, and `--max-warnings 0` makes a stray warning fail too.
//
// LEGACY FINDINGS ARE A RATCHET, NOT A PASS. When this was added (2026-10-15) the three big JSX
// files and some of lib/ already held ~260 unused variables and ~150 incomplete dependency arrays.
// Those are recorded per file and per rule in eslint-suppressions.json (ESLint's bulk
// suppressions). A NEW finding in any file fails, because it pushes that file's count over the
// recorded one. Fixing a legacy finding also fails until the file is shrunk to match, so the
// baseline can only go down:  npx eslint . --prune-suppressions
// Never run `--suppress-all` again to make a new finding go away — fix the code.
//
// It is a `node scripts/*.mjs` entry, not a bare `eslint`, because run-build-guards.mjs parses the
// build chain for exactly that shape and would silently skip anything else (same as check:types).
//
// Fails CLOSED on zero files linted: a config edit that ignores everything would otherwise pass.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(ROOT, "node_modules", "eslint", "bin", "eslint.js");
if (!fs.existsSync(bin)) { console.error("lint FAILED — eslint is not installed (npm install)."); process.exit(1); }

const r = spawnSync(process.execPath, [bin, ".", "--max-warnings", "0", "--format", "json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
if (r.stderr) process.stderr.write(r.stderr);
let results;
try { results = JSON.parse(r.stdout); } catch {
  if (r.stdout) process.stdout.write(r.stdout);
  console.error(`lint FAILED — eslint exited ${r.status} without a JSON report.`);
  process.exit(1);
}
const MIN_FILES = 40;
if (results.length < MIN_FILES) {
  console.error(`lint FAILED — eslint linted ${results.length} file(s), expected at least ${MIN_FILES}. The ignores in eslint.config.js now hide the app; a lint over nothing reads as a pass.`);
  process.exit(1);
}
let n = 0;
for (const f of results) {
  for (const m of f.messages) {
    n++;
    console.log(`${path.relative(ROOT, f.filePath)}:${m.line}:${m.column}  ${m.severity === 2 ? "error" : "warning"}  ${m.message}  ${m.ruleId || ""}`);
  }
}
if (r.status !== 0 || n) {
  console.error(`\nlint FAILED — ${n} finding(s) over ${results.length} file(s)${r.status !== 0 && !n ? ` (eslint exited ${r.status}; if it names unused suppressions, a legacy finding was fixed: run  npx eslint . --prune-suppressions  and commit eslint-suppressions.json)` : ""}.`);
  process.exit(1);
}
console.log(`lint — ${results.length} file(s) clean under eslint.config.js (legacy findings held in eslint-suppressions.json).`);
