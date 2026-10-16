#!/usr/bin/env node
/* Does the grade pyramid on somebody ELSE's profile hold what its caption says it holds?
 *
 * FullProfile renders one section two ways. Viewing YOURSELF, AscentPyramid is handed
 * `climber.__selfLogs` -- real logs. Viewing ANYONE ELSE that prop is undefined, so the component
 * takes its `else if(pyramid)` branch and totals `climber.pyramid`, a stored career summary. The
 * caption there used to read "Climbs logged at each grade", while the same screen prints
 * `Logged Climbs · N` a few lines below it off seedHistoryFor.
 *
 * This is the evidence for check:profile-claims section 5, kept so the numbers in CLAUDE.md can be
 * RE-DERIVED rather than quoted -- a measurement written into prose rots, which this file records
 * under half a dozen names.
 *
 * `seedHistoryFor` is not exported; it is `seedIdentity(c) ? ticksFor(c.name) : []`, and both of
 * THOSE are, so this composes them rather than retyping the rule. A retyped copy agrees with
 * itself whatever the app does, which is the entire question.
 *
 * No browser, no database -- so it answers honestly on a box too loaded for a walk to be evidence.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Inside the repo, not /tmp: react and friends are external and must resolve from node_modules.
const out = path.join(ROOT, "scripts", "oneoff", `.pyr-${process.pid}.mjs`);

execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=esm", "--loader:.jsx=jsx",
  "--jsx=automatic", "--platform=node", "--external:react", "--external:react-dom",
  "--external:react-dom/server", "--external:@tanstack/react-query", "--external:react/jsx-runtime",
  // lib/supabase.js reads import.meta.env at module scope; without this the import throws.
  "--define:import.meta.env={}", `--outfile=${out}`],
  { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] });

let CLIMBERS, ticksFor, seedIdentity;
try {
  ({ CLIMBERS, ticksFor, seedIdentity } = await import(pathToFileURL(out).href));
} finally {
  try { fs.unlinkSync(out); } catch {}
}

const sum = (o) => Object.values(o || {}).reduce((s, n) => s + (Number(n) || 0), 0);
const seedHistoryFor = (c) => (seedIdentity(c) ? ticksFor(c.name) : []);

const rows = [];
for (const c of CLIMBERS) {
  if (!c.pyramid) continue;
  rows.push({
    name: c.name,
    // AscentPyramid's `else if(pyramid)` branch adds pyramid.rock then pyramid.boulder.
    pyr: sum(c.pyramid.rock) + sum(c.pyramid.boulder),
    logged: seedHistoryFor(c).length,
  });
}
rows.sort((a, b) => b.pyr - b.logged - (a.pyr - a.logged));

console.log(`climbers whose profile renders the pyramid: ${rows.length}`);
console.log(`  of those, pyramid total EQUALS the Logged Climbs count: ${rows.filter((r) => r.pyr === r.logged).length}\n`);
console.log("climber              sends by grade    Logged Climbs      gap");
for (const r of rows) {
  console.log(
    r.name.padEnd(20) + String(r.pyr).padStart(14) + String(r.logged).padStart(17) +
    ("+" + (r.pyr - r.logged)).padStart(9),
  );
}

/* FAIL CLOSED. An empty side makes every comparison pass vacuously, and "0 of 0 disagree" prints
   the same reassuring shape as a clean catalog. */
const ticks = CLIMBERS.reduce((s, c) => s + seedHistoryFor(c).length, 0);
console.log(`\nnon-vacuity: ${ticks} seed activity rows resolved across ${CLIMBERS.length} climbers`);
if (!rows.length || !ticks) {
  console.log("BROKEN SCAN — one side is empty, so this measured nothing.");
  process.exit(1);
}
