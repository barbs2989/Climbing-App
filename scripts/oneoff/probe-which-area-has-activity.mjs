// Which seed area does AreaLatest actually have something to show for, and what is the click
// path to reach it?
//
// The greedy "click the first row with a climb count" drive descends into boulder areas that
// carry no `activity`, so AreaLatest correctly renders nothing. This computes the target from
// the seed data instead of guessing: the area whose subtree holds dated activity, plus the
// chain of names a browse drill-in has to click through.
//
// Bundled with esbuild because ClimbMatchCore.jsx is JSX and imports siblings.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Inside the repo, not /tmp: the externals (react etc.) must resolve from node_modules.
const out = path.join("scripts", "oneoff", `.seed-areas-${process.pid}.mjs`);
execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=esm", "--loader:.jsx=jsx",
  "--jsx=automatic", "--platform=node", "--external:react", "--external:react-dom",
  "--external:react-dom/server", "--external:@tanstack/react-query", "--external:react/jsx-runtime",
  // `import.meta.env` is a Vite-ism and is undefined under node; lib/supabase.js reads it at
  // module scope, so without this the import throws before ROUTES is ever reachable.
  "--define:import.meta.env={}",
  `--outfile=${out}`], { stdio: ["ignore", "pipe", "inherit"] });

let ROUTES, MOUNTAINS;
try {
  ({ ROUTES, MOUNTAINS } = await import(pathToFileURL(path.resolve(out)).href));
} finally {
  // Always clean up: a throw here used to leave a 2.3MB bundle behind in scripts/oneoff.
  try { fs.unlinkSync(out); } catch {}
}

const byId = new Map(MOUNTAINS.map((m) => [m.id, m]));
const pathTo = (id) => {
  const names = [];
  for (let m = byId.get(id); m; m = m.parentId ? byId.get(m.parentId) : null) names.unshift(m.name);
  return names;
};

// AreaLatest's own gate: the area is a canyon OR has a DIRECT route, and its subtree must hold
// at least one dated activity entry. Report per candidate area so the path is checkable.
const withAct = ROUTES.filter((r) => (r.activity || []).some((a) => a && a.date));
console.log(`seed routes carrying dated activity: ${withAct.length} of ${ROUTES.length}\n`);

const seen = new Set();
for (const r of withAct) {
  const a = byId.get(r.mountainId);
  if (!a || seen.has(a.id)) continue;
  seen.add(a.id);
  const p = pathTo(a.id);
  const acts = (r.activity || []).filter((x) => x && x.date).length;
  console.log(`area ${a.id}  (${a.areaType || "?"})  "${a.name}"  — ${acts} dated report(s) via "${r.name}"`);
  console.log(`   click path: ${p.join("  >  ")}`);
  // Every ancestor is also a legitimate target, because AreaLatest aggregates the SUBTREE via
  // inArea() — but only if the ancestor itself passes the early return (canyon or direct route).
  const okAncestors = p.slice(0, -1).map((_, i) => pathTo(a.id).slice(0, i + 1)).map((names) => names[names.length - 1]);
  const ancestorIds = [];
  for (let m = byId.get(a.id); m; m = m.parentId ? byId.get(m.parentId) : null) ancestorIds.unshift(m);
  const eligible = ancestorIds.filter((m) => m.areaType === "canyon" || ROUTES.some((x) => x.mountainId === m.id));
  console.log(`   eligible to RENDER AreaLatest (canyon or has a direct route): ${eligible.map((m) => `"${m.name}"(${m.areaType || "?"})`).join(", ") || "none"}\n`);
  void okAncestors;
}
