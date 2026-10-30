#!/usr/bin/env node
// lint — ESLint over the app's source (eslint.config.js), zero warnings allowed.
//
// The rules are the three the owner asked to be held at zero before any feature ships: unused
// variables, `any` types, and hooks (rules-of-hooks + exhaustive-deps dependency arrays). Every
// rule is an ERROR, and `--max-warnings 0` makes a stray warning fail too.
//
// ZERO, WITH NO BASELINE. When this was added (2026-10-15) ~260 unused variables and ~150 incomplete
// dependency arrays already sat in the code; they were held in eslint-suppressions.json (ESLint's
// bulk suppressions) as a count that could only shrink. All 385 were cleared on 2026-10-28 and the
// file deleted. ESLint reads that file automatically whenever it exists, so this script FAILS if it
// comes back: `eslint --suppress-all` would otherwise hide a new finding behind a fresh baseline.
//
// A disable comment must name its rule(s) and say why: `// eslint-disable-line react-hooks/exhaustive-deps
// -- <reason>`. A bare `eslint-disable-line` silences EVERY rule on its line (one sat in
// lib/MyPartnerAreas.jsx until 2026-10-28), so a directive without a rule or without ` -- ` fails.
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

if (fs.existsSync(path.join(ROOT, "eslint-suppressions.json"))) {
  console.error("lint FAILED — eslint-suppressions.json exists. The legacy backlog was cleared to zero on 2026-10-28; a baseline file hides findings from this check. Fix the code and delete the file.");
  process.exit(1);
}

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
// Every disable directive names its rule(s) and gives a reason after ` -- `.
const DIRECTIVE = /(?:\/\/|\/\*)\s*eslint-disable(?:-next-line|-line)?(?![\w-])([^\n]*)/g;
for (const f of results) {
  fs.readFileSync(f.filePath, "utf8").split("\n").forEach((ln, i) => {
    for (const m of ln.matchAll(DIRECTIVE)) {
      const rest = m[1].replace(/\*\/.*$/, "").trim();
      if (/^[@\w/-]+(?:\s*,\s*[@\w/-]+)*\s+--\s+\S/.test(rest)) continue;
      n++;
      console.log(`${path.relative(ROOT, f.filePath)}:${i + 1}  error  an eslint-disable directive must name its rule(s) and give a reason: \`eslint-disable-line <rule> -- <why>\``);
    }
  });
}
if (r.status !== 0 || n) {
  console.error(`\nlint FAILED — ${n} finding(s) over ${results.length} file(s)${r.status !== 0 && !n ? ` (eslint exited ${r.status})` : ""}.`);
  process.exit(1);
}
console.log(`lint — ${results.length} file(s) clean under eslint.config.js, no baseline.`);
