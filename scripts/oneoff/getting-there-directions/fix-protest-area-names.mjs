// Areas whose name carries Mountain Project's 2025 "PUBLIC LAND FOR SALE" protest label (an onX
// campaign asked climbers to rename routes/areas that way; it is not the place's name). Strip the
// label and keep the place name: "PUBLIC LAND FOR SALE-Wayne's World" -> "Wayne's World".
// Read-only unless --apply; every write goes through patchRow (exactly one row) and is re-read.
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
import { writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const LABEL = /^\s*public\s+land\s+for\s+sale\s*[-–—:|]*\s*/i;
const get = async q => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key) }); if (!r.ok) throw new Error(`${q} -> ${r.status} ${await r.text()}`); return r.json(); };

const areas = await get(`areas?select=id,name,parent_id&name=ilike.*public%20land%20for%20sale*`);
// Routes: only under the labelled areas (a name scan of the whole 200k-row table is a full scan).
const routes = areas.length ? await get(`routes?select=id,name,area_id&area_id=in.(${areas.map(a => `"${a.id}"`).join(",")})&name=ilike.*public%20land%20for%20sale*`) : [];
console.log(`areas with the label: ${areas.length}; routes with the label: ${routes.length}`);
const plan = [];
for (const a of areas) { const name = a.name.replace(LABEL, "").trim(); console.log(`  area ${a.id}: "${a.name}" -> "${name}"`); if (name && name !== a.name) plan.push({ table: "areas", id: a.id, from: a.name, to: name }); }
for (const r of routes) { const name = r.name.replace(LABEL, "").trim(); console.log(`  route ${r.id}: "${r.name}" -> "${name}"`); if (name && name !== r.name) plan.push({ table: "routes", id: r.id, from: r.name, to: name }); }
if (!APPLY) { console.log(`dry run: ${plan.length} renames; pass --apply to write`); process.exit(0); }
writeFileSync(new URL(`./protest-names-rollback-${Date.now()}.json`, import.meta.url), JSON.stringify(plan, null, 1));
for (const p of plan) { const row = await patchRow(p.table, p.id, { name: p.to }); if (row.name !== p.to) throw new Error(`${p.id} reads back "${row.name}"`); console.log(`  wrote ${p.table} ${p.id}`); }
const left = await get(`areas?select=id&name=ilike.*public%20land%20for%20sale*`);
const leftR = areas.length ? await get(`routes?select=id&area_id=in.(${areas.map(a => `"${a.id}"`).join(",")})&name=ilike.*public%20land%20for%20sale*`) : [];
console.log(`reconciled: ${plan.length} written; areas still labelled ${left.length}, routes ${leftR.length}`);
