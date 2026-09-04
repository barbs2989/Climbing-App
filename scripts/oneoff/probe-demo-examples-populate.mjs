#!/usr/bin/env node
// Does DEMO_FILLERS=true actually POPULATE the sample constants, and do the two new
// useState seeds parse and hold the shape their readers need?
//
// Written because the expected result of the change is "the app looks fuller", which is
// exactly what a change that did nothing also looks like from the outside. This asks the
// bundle rather than reading the source: the constants are built by an IIFE and a ternary,
// either of which could yield an empty array while the flag reads `true` in the file.
//
// No browser, no DB, no dev server — it bundles ClimbMatchCore.jsx and reads the exports,
// plus a Babel parse of the two `useState(DEMO_FILLERS?…)` seeds in ClimbMatch.jsx.
//
//   node scripts/oneoff/probe-demo-examples-populate.mjs
//
// Fails CLOSED: a bundle that does not build, an export that is missing, or a seed whose
// anchor has moved are each reported as a broken probe, never as a clean result.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parse } from "@babel/parser";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, ".probe-demo-examples.mjs"); // inside the project: node must
// resolve `react` from the project's own node_modules, which a bundle in /tmp cannot do.

let fail = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fail++; };

// ---- half 1: the bundled constants -------------------------------------------------
try {
  execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx",
    "--bundle", "--format=esm", "--platform=node",
    "--jsx=automatic", "--loader:.jsx=jsx",
    // lib/supabase.js reads import.meta.env at MODULE SCOPE, so without this the import
    // throws before any export is reachable.
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--outfile=" + OUT], { cwd: ROOT, stdio: "pipe" });
} catch (e) {
  console.error("BROKEN PROBE: esbuild failed — nothing was measured.\n" + String(e.stderr || e));
  process.exit(1);
}

const core = await import(OUT + "?t=" + Date.now());
// `ME` is in scope for the seeds below: they build example rows out of the signed-in
// climber's own name and avatar, exactly as the seed `logs` beside them do. Without this
// the eval fails with "ME is not defined" and reads as a defect in the app.
const ME = core.ME;
fs.unlinkSync(OUT);

for (const name of ["DEMO_FILLERS", "GROUPS", "COMMENTS", "FILLER_CLIMBERS", "ALL_CLIMBERS"]) {
  if (!(name in core)) { bad(name + " is not exported — the probe cannot see it"); }
}
if (fail) { console.error("\nBROKEN PROBE: an export moved."); process.exit(1); }

if (core.DEMO_FILLERS === true) ok("DEMO_FILLERS is true");
else bad("DEMO_FILLERS is " + core.DEMO_FILLERS + " — the samples are OFF");

const counts = {
  GROUPS: core.GROUPS.length,
  COMMENTS: core.COMMENTS.length,
  FILLER_CLIMBERS: core.FILLER_CLIMBERS.length,
  ALL_CLIMBERS: core.ALL_CLIMBERS.length,
};
for (const [n, c] of Object.entries(counts)) {
  if (c > 0) ok(n + " holds " + c + " entr" + (c === 1 ? "y" : "ies"));
  else bad(n + " is EMPTY — the flag reads true but nothing was populated");
}
// ALL_CLIMBERS must be strictly bigger than the 5 hardcoded seed climbers, or the spread
// of FILLER_CLIMBERS into it is not actually happening.
if (counts.ALL_CLIMBERS > counts.FILLER_CLIMBERS) ok("ALL_CLIMBERS = seed climbers + fillers");
else bad("ALL_CLIMBERS did not grow — the spread is not reaching it");

// Each sample group needs the fields the Groups screen reads, or it renders as a broken row.
for (const g of core.GROUPS) {
  const missing = ["id", "name", "memberIds", "ownerId"].filter((k) => g[k] === undefined);
  if (missing.length) bad("group " + g.id + " missing " + missing.join(", "));
}
if (core.GROUPS.length && !fail) ok("every sample group carries id/name/memberIds/ownerId");

// ---- half 2: the two new useState seeds ---------------------------------------------
// Read them out of the AST rather than by regex: the point is that they PARSE as arrays of
// objects, which a regex cannot tell from a string that merely looks like one.
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });

const SEEDS = {
  catches: ["id", "routeId", "friendName", "dir", "date"],
  condReports: ["routeId", "user", "date", "condTags"],
};
const seen = new Set();
(function walk(n) {
  if (!n || typeof n !== "object") return;
  if (n.type === "ArrayPattern" && n.elements && n.elements[0] && n.elements[0].type === "Identifier") {
    const name = n.elements[0].name;
    if (SEEDS[name]) seen.add(name);
  }
  for (const k of Object.keys(n)) {
    const v = n[k];
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object" && v.type) walk(v);
  }
})(ast.program);

for (const name of Object.keys(SEEDS)) {
  if (!seen.has(name)) { bad("no `[" + name + ", set…]` destructuring found — ANCHOR LOST"); continue; }
  // Pull the seed's literal text and check it parses to objects with the right keys.
  const m = src.match(new RegExp("\\[" + name + ",set[A-Za-z0-9_]+\\]=useState\\(DEMO_FILLERS\\?"));
  if (!m) { bad(name + " is not seeded from DEMO_FILLERS — it will not clear with the flag"); continue; }
  const start = m.index + m[0].length;
  let i = start, depth = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === ":" && depth === 0) break;
  }
  let arr;
  try { arr = eval(src.slice(start, i)); void ME; } catch (e) { bad(name + " seed does not evaluate: " + e.message); continue; }
  if (!Array.isArray(arr) || !arr.length) { bad(name + " seed is empty"); continue; }
  const missing = arr.flatMap((o, k) => SEEDS[name].filter((f) => o[f] === undefined).map((f) => "[" + k + "]." + f));
  if (missing.length) bad(name + " seed missing " + missing.join(", "));
  else ok(name + " seeds " + arr.length + " example(s) with every field its reader needs");
}

console.log("");
if (fail) { console.error("probe-demo-examples-populate: " + fail + " problem(s)."); process.exit(1); }
console.log("probe-demo-examples-populate: ok — the sample content is actually populated.");
