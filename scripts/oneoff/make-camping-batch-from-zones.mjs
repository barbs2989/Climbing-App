// Turn the per-zone camping research in enrichment-wip/camping-zones/*.json into ONE batch for
// enrich:apply. The zone file names the area ids its sites serve; every route in those areas'
// subtrees, in a discipline that can be benighted, and with NO existing bivy, gets that zone's
// site list.
//
// Why zone files rather than one big batch: camping is a property of the APPROACH, so the unit
// of research is the trailhead. Applying a zone's sites beyond its own areas is the failure to
// avoid — the wider "Washington Pass" subtree, for instance, spans Blue Lake, Burgundy Col,
// Rainy Pass and a peak reached from Stehekin by boat, which share no camping story at all.
//
// This NEVER overwrites: a route that already has bivy data is skipped and counted.
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import fs from "fs";
import path from "path";

const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const get = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 160));
  return r.json();
};
const DIS = ["alpine", "mountaineering", "scrambling"];
const DIR = "enrichment-wip/camping-zones";
await get("areas?select=id&limit=1");

const batch = {};
const report = [];
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".json")).sort()) {
  const zone = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  if (!Array.isArray(zone.sites) || !zone.sites.length) { report.push(`${f}: NO SITES — skipped`); continue; }
  if (!Array.isArray(zone.areas) || !zone.areas.length) { report.push(`${f}: no areas declared — skipped`); continue; }

  // Expand each declared area to its subtree, so a peak holding sub-areas is covered too.
  const roots = await get(`areas?select=id,path&id=in.(${zone.areas.join(",")})`);
  const missing = zone.areas.filter(a => !roots.some(r => r.id === a));
  if (missing.length) { report.push(`${f}: DECLARED AREA NOT IN DB: ${missing.join(", ")}`); }
  let areaIds = new Set(roots.map(r => r.id));
  for (const r of roots) {
    for (const k of await get(`areas?select=id&path=cd.${r.path}&limit=200`)) areaIds.add(k.id);
  }
  const ids = [...areaIds];
  let routes = [];
  for (let i = 0; i < ids.length; i += 40)
    routes = routes.concat(await get(`routes?select=id,area_id,discipline,bivy&area_id=in.(${ids.slice(i, i + 40).join(",")})&limit=1000`));

  let added = 0, hadBivy = 0, wrongDisc = 0;
  for (const r of routes) {
    if (!DIS.includes(r.discipline)) { wrongDisc++; continue; }
    if (r.bivy != null) { hadBivy++; continue; }
    if (batch[r.id]) { report.push(`  !! ${r.id} claimed by two zones — kept the first`); continue; }
    batch[r.id] = { area: r.area_id, bivy: zone.sites };
    added++;
  }
  report.push(`${f.padEnd(18)} ${zone.sites.length} sites -> ${String(added).padStart(3)} routes  (skipped ${hadBivy} with bivy, ${wrongDisc} other disciplines, across ${ids.length} areas)`);
}
const out = "enrichment-wip/camping_zones_batch.json";
fs.writeFileSync(out, JSON.stringify(batch, null, 1));
console.log(report.join("\n"));
console.log(`\nwrote ${out} — ${Object.keys(batch).length} routes`);
