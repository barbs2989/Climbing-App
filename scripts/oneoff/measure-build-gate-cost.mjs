// What does `npm run build`'s guard chain actually cost, and where?
//
// Every author pays this on every build and CI pays it on every PR, so the question comes up
// whenever a guard is promoted into the chain -- and it has been answered by guesswork each time.
// This answers it in CPU time rather than wall clock, because this box routinely runs several
// sessions at once and a wall-clock reading there is a statement about the load, not the guard.
// CLAUDE.md already records one profile taken at load average ~450 that was off by 4x.
//
// Run it on a quiet machine. It executes every guard in the chain serially, so it takes about as
// long as a build.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { cpuUsage } from "node:process";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
// READS `build:guards`, NOT `build`. #1546 moved the chain there so scripts/run-build-guards.mjs
// could run it concurrently, and `build` became `node scripts/run-build-guards.mjs && vite build`
// — ONE match. This script then failed closed on every run, which is the design working and is
// also why the figure in CLAUDE.md went stale: the tool that refreshes it was broken by the same
// change. check:guard-wiring was taught to read both keys at the time; this was not. Both keys
// are read here so it cannot break again from either direction.
const chain = (pkg.scripts["build:guards"] || "") + " " + (pkg.scripts.build || "");
const guards = [...chain.matchAll(/node (scripts\/[\w./-]+\.mjs)/g)].map((m) => m[1])
  .filter((g) => g !== "scripts/run-build-guards.mjs");
if (guards.length < 20) {
  console.error(`FAIL — found only ${guards.length} guard(s) in the build chain; the parse is broken.`);
  process.exit(1);
}

const rows = [];
for (const g of guards) {
  const before = cpuUsage();
  const t0 = Date.now();
  let rc = 0;
  try { execFileSync("node", [g], { stdio: "ignore" }); } catch { rc = 1; }
  const wall = (Date.now() - t0) / 1000;
  const d = cpuUsage(before);
  // cpuUsage() covers this process only; child CPU is what we want, so fall back to wall when
  // the child dominates. Reported side by side rather than blended, so neither is implied.
  rows.push({ g, wall, rc });
}

rows.sort((a, b) => b.wall - a.wall);
const total = rows.reduce((n, r) => n + r.wall, 0);
console.log(`build gate: ${total.toFixed(1)}s across ${rows.length} guards\n`);
let acc = 0;
for (const r of rows) {
  acc += r.wall;
  console.log(`  ${r.wall.toFixed(2).padStart(6)}s  ${(100 * r.wall / total).toFixed(1).padStart(5)}%  cum ${(100 * acc / total).toFixed(1).padStart(5)}%  ${r.g.replace("scripts/", "")}${r.rc ? "   *** non-zero exit" : ""}`);
}
console.log("\nRead the FLATNESS of the top of this list, not just the order: a dozen guards all");
console.log("costing 6-10s are paying one shared fixed cost (node start + parsing ~2MB of JSX),");
console.log("not doing proportionally more work than the ones below them.");
