// What could the Add-a-climb area picker reach, and what can it reach now?
//
// The picker used to read the seed `MOUNTAINS` array. This measures both sides of that gap
// against the live catalog, and it is the evidence behind the DbAreaPicker comment in
// ClimbMatchCore.jsx — re-run it rather than quoting those numbers, which move with the
// catalog.
//
// It also pins the claim the picker's design rests on: a route can only ever live on a LEAF,
// so a region is a step and never a destination. That is a schema fact (trg_areas_leaf_xor),
// not a house style, and reading `route_count` is NOT how you check it — that column is a
// SUBTREE aggregate, so "route_count > 0 and has children" is true of hundreds of correct
// container rows. Ask the routes table which areas actually host a route.
//
//   node scripts/oneoff/measure-addroute-area-reach.mjs [--state washington]

import { build } from "esbuild";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const stateArg = (process.argv.find(a => a.startsWith("--state=")) || "").split("=")[1]
  || (process.argv.includes("--state") ? process.argv[process.argv.indexOf("--state") + 1] : null)
  || "washington";

// ── the seed side, read from the app rather than restated ────────────────────────────────
// The bundle has to live INSIDE the project: node resolves a bare import from the nearest
// node_modules to the IMPORTING file, so an OS-temp bundle dies on `Cannot find package
// '@supabase/supabase-js'` — and bundling those in instead drags react-dom's CJS
// `require("stream")`, which an ESM output cannot do. node_modules/.cache satisfies both at
// once: resolution works, and check:grade-parser already skips node_modules, so the inlined
// gradeNumFrom is never counted as a second parser.
const dir = path.join(ROOT, "node_modules/.cache/climbmatch-probes");
mkdirSync(dir, { recursive: true });
const ep = path.join(dir, "ep.jsx");
writeFileSync(ep, 'export {MOUNTAINS} from "' + path.join(ROOT, "ClimbMatchCore.jsx") + '";');
const built = await build({
  entryPoints: [ep], bundle: true, write: false, format: "esm", platform: "node",
  jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "@tanstack/react-query", "@supabase/supabase-js", "leaflet"],
  absWorkingDir: ROOT, logLevel: "error",
});
const bundle = path.join(dir, "areareach-" + process.pid + ".mjs");
writeFileSync(bundle, built.outputFiles[0].text);
let MOUNTAINS;
try { ({ MOUNTAINS } = await import(bundle)); } finally { rmSync(bundle, { force: true }); }
if (!MOUNTAINS || MOUNTAINS.length < 5) { console.log("ANCHOR LOST — MOUNTAINS did not parse"); process.exit(1); }

const seedSub = (rootId) => {
  const out = [];
  const walk = id => MOUNTAINS.filter(a => a.parentId === id).forEach(a => { out.push(a); walk(a.id); });
  walk(rootId);
  return out;
};
// exactly the expression AddRoute's seed picker uses
const seedLeaves = MOUNTAINS.filter(a =>
  a.areaType !== "world" && a.areaType !== "country" && a.areaType !== "state" &&
  !MOUNTAINS.some(x => x.parentId === a.id));

// ── the live side ────────────────────────────────────────────────────────────────────────
const url = SUPABASE_URL, key = requireServiceKey();
const H = { apikey: key, Authorization: "Bearer " + key };
async function all(table, select, filter) {
  const out = []; let after = "";
  for (;;) {
    const qs = table + "?select=" + select + (filter ? "&" + filter : "") + "&order=id.asc&limit=1000" + (after ? "&id=gt." + encodeURIComponent(after) : "");
    const r = await fetch(url + "/rest/v1/" + qs, { headers: H });
    if (!r.ok) throw new Error(qs + " -> " + r.status + " " + (await r.text()).slice(0, 200));
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
    after = page[page.length - 1].id;
  }
  return out;
}

const areas = await all("areas", "id,name,area_type,parent_id,path");
if (areas.length < 1000) { console.log("read " + areas.length + " areas — too few to judge, refusing"); process.exit(1); }
const stateRow = areas.find(a => a.id === stateArg);
if (!stateRow) { console.log("no area with id " + JSON.stringify(stateArg)); process.exit(1); }
const pfx = stateRow.path + ".";
const live = areas.filter(a => a.path === stateRow.path || (a.path || "").startsWith(pfx));
const parents = new Set(areas.map(a => a.parent_id).filter(Boolean));
const skip = new Set(["world", "country", "state"]);
const liveLeaves = live.filter(a => !parents.has(a.id) && !skip.has(a.area_type));

const seedState = seedSub(stateArg);
const seedStateLeaves = seedLeaves.filter(a => seedState.some(w => w.id === a.id));
const by = rows => JSON.stringify(rows.reduce((m, a) => (m[a.area_type || a.areaType] = (m[a.area_type || a.areaType] || 0) + 1, m), {}));

console.log("seed MOUNTAINS: " + MOUNTAINS.length + " areas worldwide, " + seedLeaves.length + " selectable leaves");
console.log("  under " + stateRow.name + ": " + seedState.length + " areas, " + seedStateLeaves.length + " selectable  " + by(seedState));
console.log("\nlive catalog:  " + areas.length + " areas");
console.log("  under " + stateRow.name + ": " + live.length + " areas, " + liveLeaves.length + " selectable  " + by(live));
console.log("\nreach: " + seedStateLeaves.length + " -> " + liveLeaves.length
  + "  (" + (seedStateLeaves.length ? Math.round(liveLeaves.length / seedStateLeaves.length) + "x" : "from nothing") + ")");

// ── the leaf claim, asked of the routes table rather than of route_count ─────────────────
const routes = await all("routes", "id,area_id", "id=like." + encodeURIComponent(stateArg.slice(0, 2) + "_*"));
const hosting = new Set(routes.map(r => r.area_id));
const hostingWithKids = [...hosting].filter(id => parents.has(id));
const hostTypes = {};
[...hosting].forEach(id => { const a = areas.find(x => x.id === id); if (a) hostTypes[a.area_type] = (hostTypes[a.area_type] || 0) + 1; });
console.log("\nroutes read: " + routes.length + " on " + hosting.size + " distinct areas");
console.log("  areas that host a route AND have children: " + hostingWithKids.length + "   (expected 0 — trg_areas_leaf_xor)");
console.log("  area_type of every route-hosting area: " + JSON.stringify(hostTypes));
if (hostingWithKids.length) {
  console.log("\n  the leaf-only rule is NOT safe — these areas hold routes and children:");
  hostingWithKids.slice(0, 10).forEach(id => console.log("    " + id));
  process.exit(1);
}
console.log("\nok — only leaves hold routes, so a container is correctly never a destination.");
