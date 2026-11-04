#!/usr/bin/env node
// Which AREA, given a season, would put one in front of the most routes that still show none?
// Since #3076 the header walks four ancestors, so a season on an area reaches every route filed
// up to four levels below it. Tallies each still-uncovered route onto its four ancestors (state and
// country excluded), drops areas already researched as systems (systems-attempted.json) or as
// units (attempted.json), and writes audits/season/systems-v2.json, busiest first. No DB.
//   node scripts/oneoff/season-systems-v2.mjs --cache <areas.json> [--top 30]
import fs from "fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const rows = JSON.parse(fs.readFileSync(opt("--cache"), "utf8"));
const byId = new Map(rows.map(a => [a.id, a]));
const rd = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
const seasoned = new Set(rows.filter(a => Array.isArray(a.season_months) && a.season_months.length).map(a => a.id));
for (const f of fs.readdirSync("audits/season").filter(f => /^apply-.*\.json$/.test(f))) for (const id of Object.keys(JSON.parse(fs.readFileSync("audits/season/" + f, "utf8")))) seasoned.add(id);
for (const id of rd("audits/season/cleared.json")) seasoned.delete(id);
const skip = new Set([...rd("audits/season/systems-attempted.json"), ...rd("audits/season/attempted.json")]);
const big = a => ["state", "country"].includes(a.area_type);
const kids = new Map(); for (const a of rows) if (a.parent_id) kids.set(a.parent_id, (kids.get(a.parent_id) || 0) + (a.route_count || 0));
const tally = new Map();
for (const a of rows) {
  const n = Math.max(0, (a.route_count || 0) - (kids.get(a.id) || 0)); if (!n) continue;
  const chain = []; let covered = false;
  for (let p = a, d = 0; p && d < 5; d++, p = byId.get(p.parent_id)) { if (big(p)) break; if (seasoned.has(p.id)) { covered = true; break; } chain.push(p.id); }
  if (covered) continue;
  for (const id of chain.slice(1)) tally.set(id, (tally.get(id) || 0) + n); // ancestors only: the route's own area is unit work
}
const list = [...tally].filter(([id]) => !skip.has(id)).sort((x, y) => y[1] - x[1]).map(([id, n]) => {
  const a = byId.get(id), p = byId.get(a.parent_id);
  return { id, name: a.name, region: a.region, type: a.area_type, inside: p ? p.name : "", lat: a.lat, lng: a.lng, routes: n, children: rows.filter(c => c.parent_id === id).map(c => c.name) };
});
fs.writeFileSync("audits/season/systems-v2.json", JSON.stringify(list, null, 1));
for (const e of list.slice(0, Number(opt("--top", 30)))) console.log(String(e.routes).padStart(6), (e.region || "").padEnd(15), e.id, "|", e.name, "<", e.inside, `(${e.children.length} sub-areas)`);
