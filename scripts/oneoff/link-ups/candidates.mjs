// For every leg in research-data/link-ups/<file>.json that has no route_id yet, list the catalog
// routes on areas named like its peak, in the link-up's state, so a person can pick the right one
// (route ids come mostly from the route NAME — never guess one; docs/codebase/route-identity.md).
//
//   node scripts/oneoff/link-ups/candidates.mjs wa-north-cascades
//
// Read-only. Writes research-data/link-ups/<file>.candidates.txt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, requireServiceKey, headers } from "../../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const file = process.argv[2];
if (!file) throw new Error("usage: candidates.mjs <research file name without .json>");
const list = JSON.parse(fs.readFileSync(path.join(ROOT, "research-data/link-ups", file + ".json"), "utf8"));
const key = requireServiceKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STATE2 = { Washington: "wa", Oregon: "or", California: "ca", Colorado: "co", Wyoming: "wy", Montana: "mt", Idaho: "id", Utah: "ut", Nevada: "nv", "New Mexico": "nm", Alaska: "ak", Arizona: "az", "New Hampshire": "nh", "New York": "ny", Maine: "me", Vermont: "vt" };

// The distinctive word(s) of a summit name: "Mount Index (North Peak)" -> "Index".
function core(peak) {
  return peak.replace(/\(.*?\)/g, " ").replace(/\b(mount|mt\.?|peak|mountain|the|needle|spire)\b/gi, " ").replace(/[^A-Za-z' -]/g, " ").trim().split(/\s+/).filter((w) => w.length > 2).join(" ");
}

async function get(url) {
  const t = Date.now();
  const res = await fetch(url, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  if (Date.now() - t > 10000) { console.error("slow read — backing off 60 s"); await sleep(60000); }
  return res.json();
}

const out = [];
for (const lu of list) {
  if (lu.drop) continue;
  const st = STATE2[lu.state] || lu.id.slice(0, 2);
  out.push(`\n## ${lu.id} — ${lu.name}`);
  // A catalog route that IS the whole link-up ("Ptarmigan Traverse") -> also_route_ids.
  const whole = core(lu.name.replace(/\(.*?\)/g, "")).split(" ").filter((w) => !/^(and|traverse|with|to)$/i.test(w)).slice(0, 2).join("*");
  if (whole) {
    const rows = await get(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,grade&id=like.${st}_*&name=ilike.*${encodeURIComponent(whole)}*&limit=20`);
    for (const r of rows) out.push(`  whole? ${r.id} | ${r.name} | ${r.discipline} ${r.grade || ""}`);
    await sleep(300);
  }
  for (const leg of lu.legs) {
    if (leg.route_id !== undefined) { out.push(`  [set] ${leg.peak} -> ${leg.route_id}`); continue; }
    const c = core(leg.peak);
    if (!c) { out.push(`  ?? ${leg.peak}: no searchable word`); continue; }
    const rows = await get(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,grade,area_id,areas!inner(name)&id=like.${st}_*&areas.name=ilike.*${encodeURIComponent(c)}*&discipline=in.(alpine,mountaineering,scrambling,snow,ice)&limit=40`);
    out.push(`  ${leg.peak} / ${leg.route || ""}  [search "${c}", ${rows.length}]`);
    for (const r of rows) out.push(`      ${r.id}  | ${r.name} | ${r.discipline} ${r.grade || ""} | area ${r.areas.name}`);
    await sleep(300);
  }
}
fs.writeFileSync(path.join(ROOT, "research-data/link-ups", file + ".candidates.txt"), out.join("\n") + "\n");
console.log(out.join("\n"));
