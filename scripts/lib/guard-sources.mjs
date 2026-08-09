// Every static guard has to answer one question before it prints "ok": did it actually
// read the app? None of them asked it, and this codebase has already been bitten by the
// answer being no.
//
// #547 is the case on record. The three-way split (#497/#508) moved most of the app out
// of ClimbMatch.jsx into ClimbMatchCore.jsx and RouteDetail.jsx, while check:refs and
// check:hooks still named only the entry files — so for a week the guard that exists to
// stop production blank screens was reading 24% of the app and reporting green on the
// other 76%.
//
// The fix for #547 added the missing names and then filtered the list with existsSync:
//
//     const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", ...]
//       .filter(f => fs.existsSync(path.join(ROOT, f)));
//
// which preserves the exact failure it documents. A renamed or moved file does not fail
// the guard; it silently drops out of the list and the guard reports green on whatever
// is left. That is the same shape as check:dead-flag-gates printing ok having loaded no
// files, and check:overlay-scroll's anchor-lost case exiting 0 having verified nothing:
// a guard you believe you have and do not.
//
// So: a missing required source is a HARD FAILURE here, never a quietly shorter list.
import fs from "node:fs";
import path from "node:path";

// The app source files that any whole-app guard must be reading. Deliberately not
// "every file" — these are the three that hold the app, so their absence from a scan
// means the scan covered a fraction of it. main.jsx is the entry shim and lib/ is
// enumerated dynamically, so neither belongs in a must-exist list.
export const REQUIRED = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

const bail = (guard, msg) => {
  console.error(`\n${guard} FAILED — ${msg}`);
  console.error("This is a coverage failure, not a code failure: the guard cannot report");
  console.error("green about source it never read. Update the guard to match the new layout.\n");
  process.exit(1);
};

// For guards that name their inputs (check:refs, check:hooks). Returns the app source
// list — the required files, main.jsx if present, and every lib/*.js(x) — and exits
// naming any required file it could not find, rather than dropping it.
export function appSources(root, guard) {
  const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) {
    bail(guard, `${missing.length} required app source(s) are missing: ${missing.join(", ")}`);
  }
  const list = [...REQUIRED];
  if (fs.existsSync(path.join(root, "main.jsx"))) list.push("main.jsx");
  const libDir = path.join(root, "lib");
  if (!fs.existsSync(libDir)) {
    bail(guard, "there is no lib/ directory, so the DB, auth and area-browser modules went unscanned");
  }
  const lib = fs.readdirSync(libDir).filter((f) => /\.jsx?$/.test(f));
  if (!lib.length) bail(guard, "lib/ contains no .js/.jsx files, which cannot be right");
  return list.concat(lib.map((f) => "lib/" + f));
}

// For guards that discover their inputs by walking the tree. Walking is already the
// safer design — it picks up a new file the day it lands — but it fails open in the
// other direction: a SKIP list that grows, a renamed root, or an extension filter that
// stops matching yields [] and every "no findings" check then passes vacuously.
//
// Accepts absolute or root-relative paths.
export function assertCovered(files, root, guard, required = REQUIRED) {
  if (!files || !files.length) {
    bail(guard, "the source walk found no files at all, so every assertion below passed on an empty set");
  }
  const seen = new Set(files.map((f) => (path.isAbsolute(f) ? path.relative(root, f) : f)));
  const missing = required.filter((f) => !seen.has(f));
  if (missing.length) {
    bail(guard, `the source walk covered ${files.length} file(s) but not ${missing.join(", ")}`);
  }
  return files;
}
