// Does AreaLatest render AT ALL for a seed area? No browser, no dev server.
//
// Four attempts to reach it through the app have failed (a ?za=1 setSelArea opener; three
// driven browse paths), and each failure was consistent with EITHER "the component will not
// render for this data" or "the app wiring never mounts it". This separates those two halves,
// which is the thing all four attempts could not distinguish.
//
// If it renders here, the component is fine and the remaining unknown is purely app wiring.
// If it does not, every browser attempt was chasing the wrong half.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const out = path.join("scripts", "oneoff", `.arealatest-ssr-${process.pid}.mjs`);
execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=esm", "--loader:.jsx=jsx",
  "--jsx=automatic", "--platform=node", "--external:react", "--external:react-dom",
  "--external:react-dom/server", "--external:@tanstack/react-query", "--external:react/jsx-runtime",
  "--define:import.meta.env={}", `--outfile=${out}`], { stdio: ["ignore", "pipe", "inherit"] });

let mod;
try {
  mod = await import(pathToFileURL(path.resolve(out)).href);
} finally {
  try { fs.unlinkSync(out); } catch {}
}

const { ROUTES, MOUNTAINS } = mod;
const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");

// AreaLatest is not in core's export list (it is an internal component), so reach it the way
// check:bare reaches internals: render the exported thing that mounts it. If it is exported,
// use it directly — report which path was taken rather than assuming.
const AreaLatest = mod.AreaLatest;
console.log("AreaLatest exported from core:", !!AreaLatest);
if (!AreaLatest) {
  console.log("\nNot exported, so it cannot be rendered in isolation. That is itself the answer:");
  console.log("any coverage has to come through the app, and this probe cannot narrow it further.");
  process.exit(0);
}

const byId = new Map(MOUNTAINS.map((m) => [m.id, m]));
const targets = ["kings", "olympus", "lcc", "lcc_egg"].map((id) => byId.get(id)).filter(Boolean);
console.log(`\ntrying ${targets.length} seed area(s)\n`);
for (const area of targets) {
  let html = "";
  let err = null;
  try {
    html = renderToStaticMarkup(React.createElement(AreaLatest, { area, onOpenReport: () => {} }));
  } catch (e) { err = e; }
  const acts = ROUTES.filter((r) => r.mountainId === area.id).flatMap((r) => (r.activity || []).filter((a) => a && a.date));
  console.log(`${area.id.padEnd(10)} ${(area.areaType || "?").padEnd(7)} direct-dated-acts=${String(acts.length).padStart(2)}  html=${String(html.length).padStart(5)}${err ? "  THREW: " + err.message : ""}`);
  if (html) {
    const heading = /Latest from this area/i.test(html);
    console.log(`           heading present: ${heading}`);
    const m = html.match(/>([^<>]{3,40})<\/div><div[^>]*>([^<>]{3,40})</);
    if (m) console.log(`           first row fragments: ${JSON.stringify(m[1])} + ${JSON.stringify(m[2])}`);
  }
}
