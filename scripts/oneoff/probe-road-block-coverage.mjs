// Before repairing two routes with an empty `road` block, ask how many WA routes have one.
// Fixing 2 while 3,000 share the hole would be answering the wrong question — the two only
// surfaced because their prose happened to mention a road, which is a property of the prose,
// not of the gap. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,discipline,road,access,approach_logistics,waypoints&id=like.wa_*&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}
const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

const has = (v) => leaves(v).length > 0;
let roadYes = 0, accessYes = 0, logisticsYes = 0, enrichedish = 0, enrichedNoRoad = 0;
for (const r of rows) {
  const road = has(r.road), acc = has(r.access), log = has(r.approach_logistics);
  if (road) roadYes++;
  if (acc) accessYes++;
  if (log) logisticsYes++;
  /* "Enriched" = the route carries the access apparatus at all. A bare catalog row with none
     of it is not a route missing its road block; it is a route nothing has researched. */
  if (acc || log || has(r.waypoints)) { enrichedish++; if (!road && !log) enrichedNoRoad++; }
}
console.log(`\n=== road-block coverage, WA ===`);
console.log(`${rows.length} routes`);
console.log(`  road populated:                ${roadYes}`);
console.log(`  access populated:              ${accessYes}`);
console.log(`  approach_logistics populated:  ${logisticsYes}`);
console.log(`\n  routes carrying ANY access apparatus (access | logistics | waypoints): ${enrichedish}`);
console.log(`  ... of those, NEITHER road NOR approach_logistics says anything:       ${enrichedNoRoad}`);
