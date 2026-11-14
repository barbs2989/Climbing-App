#!/usr/bin/env node
// check:types — every TypeScript file under src/ type-checks under tsconfig.json (strict).
//
// Vite compiles .tsx with esbuild, which STRIPS types and checks nothing, so a type error ships
// unless something runs the checker. This runs `tsc --noEmit` the way the chain runs every guard:
// as a `node scripts/*.mjs` entry, because run-build-guards.mjs parses the chain for exactly that
// shape and would silently skip a bare `tsc` there.
//
// Fails CLOSED. tsc with an `include` that matches no file reports TS18003 and exits non-zero, but
// a future tsconfig edit could turn that into a clean run over nothing, so the file count is
// asserted here first: zero TypeScript files under src/ is a layout change, not a pass.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const files = walk(SRC);
if (!files.length) {
  console.error("check:types FAILED — no .ts/.tsx file under src/. The components moved there (see docs/refactor-progress.md); an empty folder means the layout moved, and a checker over nothing would read as a pass.");
  process.exit(1);
}
const tsc = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");
if (!fs.existsSync(tsc)) { console.error("check:types FAILED — typescript is not installed (npm install)."); process.exit(1); }

const r = spawnSync(process.execPath, [tsc, "-p", path.join(ROOT, "tsconfig.json"), "--pretty", "false"], { cwd: ROOT, encoding: "utf8" });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
if (r.status !== 0) {
  console.error(`check:types FAILED — tsc exited ${r.status} over ${files.length} TypeScript file(s).`);
  process.exit(1);
}
console.log(`check:types — ${files.length} TypeScript file(s) under src/ type-check clean under tsconfig.json (strict).`);
