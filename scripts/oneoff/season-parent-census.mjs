#!/usr/bin/env node
// Owner note "Audit optimal season for all route via online research" (2026-10-30). A climb's
// season is published per crag SYSTEM (Shelf Road, Pawtuckaway, Indian Creek), not per wall, and
// the route header falls back to its area's season_months, then the PARENT area's
// (lib/seasonText.js routeSeasonShort). So the research unit is the parent of the areas that hold
// routes. This reads every area once (keyset pages, service key), and writes
//   audits/season/parents.json — each parent: id, name, region, type, lat/lng, how many routes
//   sit directly under its children, how many of those are already covered (route has its own
//   season is NOT counted here; only area/parent season_months), sorted by uncovered routes.
// Read-only.
import fs from "fs";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
// --cache FILE reuses one earlier read (the whole table is ~68 pages; do not re-read it per run).
const ci = process.argv.indexOf("--cache"), cache = ci > 0 ? process.argv[ci + 1] : null;
const rows = cache && fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, "utf8"))
  : await selectAll("areas", "id,name,region,area_type,parent_id,route_count,lat,lng,season_months", "", { key, pageSize: 1000 });
if (cache && !fs.existsSync(cache)) fs.writeFileSync(cache, JSON.stringify(rows));
const byId = new Map(rows.map(a => [a.id, a]));
// areas.route_count is the SUBTREE total; the climbs filed directly on an area are its count less
// its children's.
const kids = new Map(); for (const a of rows) if (a.parent_id) kids.set(a.parent_id, (kids.get(a.parent_id) || 0) + (a.route_count || 0));
for (const a of rows) a.direct = Math.max(0, (a.route_count || 0) - (kids.get(a.id) || 0));
const has = a => Array.isArray(a && a.season_months) && a.season_months.length > 0;
const par = new Map();
let total = 0, covered = 0;
for (const a of rows) {
  const n = a.direct;
  if (!n) continue;
  total += n;
  const p = a.parent_id ? byId.get(a.parent_id) : null;
  const ok = has(a) || has(p);
  if (ok) covered += n;
  const pid = p ? p.id : a.id; // a top-level area with routes is its own unit
  const e = par.get(pid) || { id: pid, name: (p || a).name, region: (p || a).region, type: (p || a).area_type, lat: (p || a).lat, lng: (p || a).lng, has: has(p || a), routes: 0, uncovered: 0, children: 0 };
  e.routes += n; e.children++; if (!ok) e.uncovered += n;
  par.set(pid, e);
}
const list = [...par.values()].filter(e => e.uncovered > 0).sort((a, b) => b.uncovered - a.uncovered);
fs.mkdirSync("audits/season", { recursive: true });
fs.writeFileSync("audits/season/parents.json", JSON.stringify(list, null, 1));
let cum = 0; const marks = [50, 100, 200, 500, 1000, 2000, 5000];
const at = {}; list.forEach((e, i) => { cum += e.uncovered; if (marks.includes(i + 1)) at[i + 1] = cum; });
console.log(`areas read: ${rows.length}; routes under an area: ${total}; covered by area/parent season: ${covered}`);
console.log(`parents still needing a season: ${list.length}; routes they would cover, top-N cumulative:`, at);
for (const e of list.slice(0, 40)) console.log(String(e.uncovered).padStart(6), (e.type || "").padEnd(7), (e.region || "").padEnd(15), e.id, "|", e.name);
