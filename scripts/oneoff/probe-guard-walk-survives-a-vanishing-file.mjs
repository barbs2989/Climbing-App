#!/usr/bin/env node
// A GUARD WRITING A TEMP FILE INTO THE REPO ROOT COULD KILL A SIBLING GUARD MID-WALK.
//
// `npm run build` runs its guards CONCURRENTLY (scripts/run-build-guards.mjs). Seven of them
// walk the repo root and call statSync on EVERY entry before deciding whether it is source:
//
//     for (const name of readdirSync(dir)) { ... if (statSync(p).isDirectory()) walk(p); }
//
// check:policy-claims bundled to `.policy-claims-<pid>.mjs` at that same root and deleted it a
// few lines later. A sibling that read the directory before the delete and statted after it died
// with ENOENT. Observed, not theorised -- check:write-feedback, mid-build, on an ordinary run:
//
//     Error: ENOENT: no such file or directory, stat '.../.policy-claims-39771.mjs'
//         at walk (scripts/check-write-feedback.mjs:51:12)
//
// It reports as `1 of 74 guard(s) FAILED` naming a guard that has nothing wrong with it, so the
// author goes looking in the wrong file. CLAUDE.md's concurrency note already says to re-check
// this "before adding a guard that writes anything"; check:policy-claims writes at the root.
//
// TWO FIXES, because one closes today's instance and the other closes the class:
//   1. the bundle moves to node_modules/.cache — outside every walker, and where a cache belongs
//   2. the walkers skip dot-prefixed entries, which is what check:dead-props already does
//
// THE REPRODUCTION IS A DANGLING SYMLINK, not a race. statSync on a broken symlink throws the
// identical ENOENT, deterministically, so this proves the crash and the fix without ever having
// to win a timing window.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

// The seven walkers. Six walk the repo root; check:screen-lists walks scripts/.
const ROOT_WALKERS = ["check-a11y-names", "check-disc-labels", "check-overlay-portals",
  "check-write-feedback", "check-zindex", "check-dead-props"];
const SCRIPT_WALKER = "check-screen-lists";

// =======================================================================================
// SECTION 1 -- no walker collects a dot-prefixed file today, so skipping them changes no
// verdict. Asserted rather than asserted-by-eye: if this ever finds one, the fix below is
// silently narrowing a guard's coverage instead of hardening it.
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "supabase", "public", "research", "audits"]);
const dotSource = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(dir, name);
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(name) && name.startsWith(".")) dotSource.push(path.relative(ROOT, p));
  }
};
walk(ROOT);
if (dotSource.length) fail(`${dotSource.length} dot-prefixed source file(s) exist — skipping them would LOSE coverage: ${dotSource.join(", ")}`);
else ok("no dot-prefixed .js/.jsx/.mjs file exists outside the skipped directories — the skip costs no coverage");

// =======================================================================================
// SECTION 2 -- the crash, reproduced. A dangling symlink named like a guard's temp file.
const bait = path.join(ROOT, ".probe-vanishing-file.mjs");
const baitScripts = path.join(ROOT, "scripts", ".probe-vanishing-file.mjs");
const clean = () => { for (const b of [bait, baitScripts]) { try { fs.unlinkSync(b); } catch {} } };
clean();
fs.symlinkSync(path.join(ROOT, "no-such-target-" + process.pid), bait);
fs.symlinkSync(path.join(ROOT, "no-such-target-" + process.pid), baitScripts);

let crashed = 0, ran = 0;
try {
  for (const g of [...ROOT_WALKERS, SCRIPT_WALKER]) {
    const file = path.join(ROOT, "scripts", g + ".mjs");
    if (!fs.existsSync(file)) { fail(`${g}.mjs is missing — this probe names a guard that no longer exists`); continue; }
    let out = "", code = 0;
    try { out = execFileSync("node", [file], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
    ran++;
    // A guard may legitimately FAIL (it is asserting about the app). What it must never do is
    // die on the walk itself: that reports a defect in a file nobody touched.
    if (/ENOENT[\s\S]*stat/.test(out)) { fail(`${g} died walking the tree (ENOENT on stat) — a vanishing sibling temp file takes it down`); crashed++; }
    else ok(`${g} survived a file it cannot stat (exit ${code})`);
  }
} finally { clean(); }

if (ran < 7) fail(`only ${ran} of 7 walkers ran — NOT MEASURED`);
if (fs.existsSync(bait) || fs.existsSync(baitScripts)) fail("the probe left its bait behind");

// =======================================================================================
// SECTION 3 -- the writer no longer writes into the walked tree.
const pc = fs.readFileSync(path.join(ROOT, "scripts", "check-policy-claims.mjs"), "utf8");
if (/path\.join\(ROOT,\s*`\.policy-claims/.test(pc)) fail("check:policy-claims still bundles to the repo root, where six guards are walking");
else if (!/node_modules[\s\S]{0,80}\.cache/.test(pc)) fail("check:policy-claims' bundle target is neither the root nor node_modules/.cache — check where it lands");
else ok("check:policy-claims bundles into node_modules/.cache, which every walker skips");

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log(`\nok — ${ran} walkers survive an unstattable entry, and no guard writes into the tree they walk.`);
