#!/usr/bin/env node
// Which crag SYSTEMS hold the most routes still without a season? A unit in parents.json is the
// parent of the areas that hold routes; its own parent (Joshua Tree National Park, Red River Gorge,
// Squamish, The Gunks) is usually what guidebooks and land agencies publish a season for. Writing a
// system's window to each of its units is one fact applied where the sources say it applies — only
// for a COMPACT system (one park, one gorge, one canyon), never a state or a mountain range whose
// elevation spans seasons. No DB: reads parents.json, attempted.json and the census cache.
//   node scripts/oneoff/season-systems.mjs --cache <areas.json> [--top 40]
import fs from "fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const byId = new Map(JSON.parse(fs.readFileSync(opt("--cache"), "utf8")).map(a => [a.id, a]));
const done = new Set(fs.existsSync("audits/season/attempted.json") ? JSON.parse(fs.readFileSync("audits/season/attempted.json", "utf8")) : []);
const units = JSON.parse(fs.readFileSync("audits/season/parents.json", "utf8")).filter(e => !["state", "country"].includes(e.type));
const sys = new Map();
for (const u of units) {
  const a = byId.get(u.id); if (!a || !a.parent_id) continue;
  const p = byId.get(a.parent_id); if (!p || ["state", "country"].includes(p.area_type)) continue;
  const e = sys.get(p.id) || { id: p.id, name: p.name, region: p.region, type: p.area_type, units: 0, open: 0, routes: 0 };
  e.units++; if (!done.has(u.id)) { e.open++; e.routes += u.uncovered; }
  sys.set(p.id, e);
}
const list = [...sys.values()].filter(e => e.open >= 2).sort((a, b) => b.routes - a.routes);
fs.writeFileSync("audits/season/systems.json", JSON.stringify(list, null, 1));
console.log(`${list.length} systems with 2+ unresearched units; top ${opt("--top", 40)}:`);
for (const e of list.slice(0, Number(opt("--top", 40)))) console.log(String(e.routes).padStart(6), String(e.open).padStart(4), (e.region || "").padEnd(15), e.id, "|", e.name);
