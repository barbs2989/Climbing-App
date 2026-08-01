// check:zindex — keeps the toast above every overlay in the app.
//
// A toast is how the app reports that something went wrong, and the moment you
// most need to read one is while a modal is open: "Couldn't save your fix",
// "Upload failed". So the toast losing a z-index race is not a cosmetic bug —
// it silently swallows exactly the messages that matter, and the user is left
// staring at a dialog that appears to have done nothing.
//
// That is what had happened. The toast sat at zIndex 999 while the overlay stack
// had grown to 100000 (the Suggest-a-fix portal), 99999, 97000, 9999, 9800, 9700,
// 9600, 9500 and 9400 — nine layers above it. Nobody raised the toast, because
// nothing connects the two numbers: they live in different files, and each new
// overlay only needed to beat the overlay before it.
//
// This exists so that ratchet can't run again. Add an overlay at any depth you
// like; just stay under Z_TOAST.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKIP = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "scripts"]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(p);
  }
  return out;
};

const files = walk(ROOT);

// ---- find the declared ceiling ---------------------------------------------
let ceiling = null, ceilingFile = null;
for (const f of files) {
  const m = readFileSync(f, "utf8").match(/const\s+Z_TOAST\s*=\s*(\d+)/);
  if (m) { ceiling = Number(m[1]); ceilingFile = f.slice(ROOT.length); break; }
}
if (ceiling === null) {
  console.error("check:zindex FAILED — no `const Z_TOAST = <number>` found.");
  console.error("The toast's z-index must be a named constant so this check has a ceiling to enforce.");
  process.exit(1);
}
console.log(`  ok    Z_TOAST = ${ceiling} (${ceilingFile})`);

// ---- nothing may reach it ---------------------------------------------------
// Only literal z-indexes are checked. `zIndex:Z_TOAST` is the toast itself and is
// skipped by the numeric pattern.
const offenders = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/zIndex\s*:\s*(\d+)/g)) {
    const z = Number(m[1]);
    if (z < ceiling) continue;
    const line = src.slice(0, m.index).split("\n").length;
    const ctx = src.slice(Math.max(0, m.index - 70), m.index).replace(/\s+/g, " ").trim();
    offenders.push({ file: f.slice(ROOT.length), line, z, ctx });
  }
}

if (offenders.length) {
  console.error(`\ncheck:zindex FAILED — ${offenders.length} overlay(s) at or above Z_TOAST (${ceiling}):\n`);
  for (const o of offenders) console.error(`  - ${o.file}:${o.line}  zIndex ${o.z}\n      ...${o.ctx}`);
  console.error("\nAn overlay at or above the toast hides failure messages behind itself.");
  console.error("Lower the overlay. Do not raise Z_TOAST to make this pass — that just");
  console.error("restarts the ratchet this check exists to stop.");
  process.exit(1);
}

// ---- the toast must actually use the constant, and escape stacking contexts --
const toastFile = files.find((f) => /\{toast\s*&&/.test(readFileSync(f, "utf8")));
if (!toastFile) {
  console.error("\ncheck:zindex FAILED — could not find the toast render site (`{toast&&`).");
  process.exit(1);
}
const toastSrc = readFileSync(toastFile, "utf8");
const at = toastSrc.indexOf("{toast&&");
const block = toastSrc.slice(at, at + 700);

if (!/zIndex\s*:\s*Z_TOAST/.test(block)) {
  console.error(`\ncheck:zindex FAILED — the toast in ${toastFile.slice(ROOT.length)} does not use Z_TOAST.`);
  console.error("A literal here drifts out of sync with the ceiling and cannot be enforced.");
  process.exit(1);
}
// A z-index only competes globally if no ancestor creates a stacking context.
// The toast renders deep inside App's tree, so it is portalled to <body>; without
// that, a single `transform` or `filter` on any ancestor re-traps it — and that
// failure is invisible until the exact modal that shadows it is open.
if (!/createPortal/.test(block)) {
  console.error(`\ncheck:zindex FAILED — the toast in ${toastFile.slice(ROOT.length)} is not portalled.`);
  console.error("It must be createPortal(..., document.body): any ancestor with a transform,");
  console.error("filter or opacity creates a stacking context that pins it below sibling overlays,");
  console.error("no matter how high its z-index is.");
  process.exit(1);
}

const count = files.reduce((n, f) => n + [...readFileSync(f, "utf8").matchAll(/zIndex\s*:\s*\d+/g)].length, 0);
console.log(`  ok    toast is portalled to <body> and uses Z_TOAST`);
console.log(`  ok    ${count} literal z-index(es) all below the ceiling`);
console.log("\nz-index stack: ok");
