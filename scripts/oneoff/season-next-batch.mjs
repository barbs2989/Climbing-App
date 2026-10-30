#!/usr/bin/env node
// The next areas to research a season for, from audits/season/parents.json (season-parent-census)
// less every id in audits/season/attempted.json (researched already, written or not).
// State and country rows are skipped: one season for a whole state is not a fact anybody publishes.
//   node scripts/oneoff/season-next-batch.mjs --n 24 --cache <areas.json from the census>
// Prints a JSON list with each area's parent and grandparent names for context. Read-only, no DB.
import fs from "fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const n = Number(opt("--n", 24));
const byId = new Map(JSON.parse(fs.readFileSync(opt("--cache"), "utf8")).map(a => [a.id, a]));
const done = new Set(fs.existsSync("audits/season/attempted.json") ? JSON.parse(fs.readFileSync("audits/season/attempted.json", "utf8")) : []);
// A unit already inherits a season when one of its first three ancestors has one (the header walks
// four levels up from a route's own area, and a unit is that area's parent): census cache plus every
// apply-*.json written since. State and country rows never count.
const seasoned = new Set([...byId.values()].filter(a => Array.isArray(a.season_months) && a.season_months.length).map(a => a.id));
for (const f of fs.readdirSync("audits/season").filter(f => /^apply-.*\.json$/.test(f))) for (const id of Object.keys(JSON.parse(fs.readFileSync("audits/season/" + f, "utf8")))) seasoned.add(id);
const inherits = id => { let p = byId.get(id); for (let d = 0; d < 3 && p && p.parent_id; d++) { p = byId.get(p.parent_id); if (p && seasoned.has(p.id) && !["state", "country"].includes(p.area_type)) return true; } return false; };
const list = JSON.parse(fs.readFileSync("audits/season/parents.json", "utf8"))
  .filter(e => !["state", "country"].includes(e.type) && !done.has(e.id) && !inherits(e.id)).slice(0, n);
const nm = id => (byId.get(id) || {}).name || null;
const out = list.map(e => {
  const a = byId.get(e.id) || {}, p = a.parent_id ? byId.get(a.parent_id) : null;
  return { id: e.id, name: e.name, region: e.region, type: e.type, inside: [p && p.name, p && p.parent_id && nm(p.parent_id)].filter(Boolean).join(" < "), lat: e.lat, lng: e.lng, routes: e.uncovered };
});
// --round NN writes audits/season/pick-NN.json and one text list per agent (pick-NNa.txt, -b) instead.
const round = opt("--round", null);
if (!round) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
fs.writeFileSync(`audits/season/pick-${round}.json`, JSON.stringify(out, null, 1));
const line = e => `${e.id} | ${e.name} | ${e.region} | inside: ${e.inside} | ${e.lat == null ? "?" : e.lat.toFixed(3)},${e.lng == null ? "?" : e.lng.toFixed(3)}`;
const half = Math.ceil(out.length / 2);
fs.writeFileSync(`audits/season/pick-${round}a.txt`, out.slice(0, half).map(line).join("\n") + "\n");
fs.writeFileSync(`audits/season/pick-${round}b.txt`, out.slice(half).map(line).join("\n") + "\n");
console.log(`round ${round}: ${out.length} areas, ${out.reduce((s, e) => s + e.routes, 0)} routes`);
