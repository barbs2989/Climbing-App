// Which PEAK does each route that lib/terrain.js classifies as "rock" actually sit on?
//
// audit:route-terrain reports how many routes have snow/glacier advice SUPPRESSED. It never
// asks whether a suppression is correct, and a wrong one is the dangerous direction: it takes
// the avalanche-forecast line off a route that does cross avalanche terrain.
//
// The discriminator is the area, not the route name. "North Ridge" says nothing; "Chair Peak"
// says Snoqualmie alpine and "Roan Wall" says a crag.
//
//   node scripts/oneoff/probe-terrain-rock-classification.mjs <id> <id> ...
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const ids = process.argv.slice(2);
if (!ids.length) { console.error("give route ids"); process.exit(1); }

const q = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,grade,pitches,season,gear,rack&id=in.(${ids.join(",")})`;
const res = await fetch(q, { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status} ${(await res.text()).slice(0, 200)}`);
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error("read returned zero routes — a clean answer here would be a false pass");

const aids = [...new Set(rows.map(x => x.area_id).filter(Boolean))];
const ares = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,path&id=in.(${aids.join(",")})`, { headers: headers(key) });
if (!ares.ok) throw new Error(`areas -> ${ares.status}`);
const areas = Object.fromEntries(JSON.parse(await ares.text()).map(a => [a.id, a]));

const byArea = new Map();
for (const x of rows) {
  const a = areas[x.area_id] || {};
  const k = `${a.name || "?"} [${a.area_type || "?"}]`;
  if (!byArea.has(k)) byArea.set(k, []);
  byArea.get(k).push(x);
}
for (const [k, list] of [...byArea].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`\n${k}  (${list.length})`);
  for (const x of list) {
    console.log(`   ${x.id}`);
    console.log(`     name=${x.name}  grade=${x.grade || "-"}  pitches=${x.pitches ?? "-"}  season=${(x.season || "-").slice(0, 60)}`);
    const g = [x.gear, x.rack].filter(Boolean).join(" | ");
    if (g) console.log(`     gear=${g.slice(0, 160)}`);
  }
}
console.log(`\n${rows.length} routes across ${byArea.size} areas`);
