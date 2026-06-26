#!/usr/bin/env node
// build-pack.mjs — merge validated per-region catalog files into ONE download pack.
// Reads catalog/<state>/*_areas.json + *_routes.json, de-duplicates by id (the shared
// state root and any shared parents collapse to one), checks references, and writes
// catalog/<state>.json = { state, areas, routes } — the per-state pack the app downloads.
//
// Usage: node build-pack.mjs utah
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const state = process.argv[2];
if (!state) { console.error("Usage: node build-pack.mjs <state>   (e.g. utah)"); process.exit(1); }
const dir = join("catalog", state);

let files;
try { files = readdirSync(dir); }
catch { console.error(`No folder catalog/${state}/ — add your *_areas.json / *_routes.json files there first.`); process.exit(1); }

const areaFiles = files.filter(f => f.endsWith("_areas.json")).sort();
const routeFiles = files.filter(f => f.endsWith("_routes.json")).sort();
if (!areaFiles.length) { console.error(`No *_areas.json files in catalog/${state}/`); process.exit(1); }

const problems = [];
const areas = new Map();   // id -> area (first file wins)
const routes = new Map();  // id -> route

function ingest(file, map, kind) {
  let arr;
  try { arr = JSON.parse(readFileSync(join(dir, file), "utf8")); }
  catch (e) { problems.push(`${file}: cannot parse (${e.message})`); return; }
  if (!Array.isArray(arr)) { problems.push(`${file}: not a JSON array`); return; }
  for (const item of arr) {
    if (!item || !item.id) { problems.push(`${file}: a ${kind} is missing id`); continue; }
    if (map.has(item.id)) {
      const prev = map.get(item.id);
      const a = { ...prev }; delete a.__file;
      if (JSON.stringify(a) !== JSON.stringify(item))
        problems.push(`CONFLICT: ${kind} id "${item.id}" differs between ${prev.__file} and ${file}`);
      continue; // dedupe: first occurrence wins
    }
    map.set(item.id, { ...item, __file: file });
  }
}

areaFiles.forEach(f => ingest(f, areas, "area"));
routeFiles.forEach(f => ingest(f, routes, "route"));

const areaArr = [...areas.values()].map(({ __file, ...rest }) => rest);
const routeArr = [...routes.values()].map(({ __file, ...rest }) => rest);

// every route.mountainId must resolve among the merged areas
const areaIds = new Set(areaArr.map(a => a.id));
for (const r of routeArr)
  if (r.mountainId && !areaIds.has(r.mountainId))
    problems.push(`route "${r.id}": mountainId "${r.mountainId}" not found among merged areas`);

console.log(`\n— Building ${state} pack —`);
console.log(`source: ${areaFiles.length} area file(s) + ${routeFiles.length} route file(s)`);
console.log(`merged: ${areaArr.length} areas, ${routeArr.length} routes`);

if (problems.length) {
  console.log(`\nProblems: ${problems.length}`);
  problems.slice(0, 50).forEach(p => console.log(`  ! ${p}`));
  if (problems.length > 50) console.log(`  ...and ${problems.length - 50} more`);
  console.log(`\nDid NOT write the pack — resolve the above first (usually a duplicate id with different data).`);
  process.exit(1);
}

const outPath = join("catalog", `${state}.json`);
writeFileSync(outPath, JSON.stringify({ state, areas: areaArr, routes: routeArr }, null, 2));
console.log(`\nWrote ${outPath}  — the download pack: { state, areas, routes }`);
console.log(`This single file is what the app fetches when a user downloads "${state}".`);
