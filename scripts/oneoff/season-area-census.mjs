#!/usr/bin/env node
// Owner note "Audit optimal season for all route via online research" (2026-10-30): which areas
// carry the most climbs and no researched season yet? Read-only; service key (counts must not be
// RLS-zeroed). Prints busiest-first; --json for a research batch pick.
//   node scripts/oneoff/season-area-census.mjs [--limit 60] [--offset 0] [--json]
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const limit = Number(opt("--limit", 60)), offset = Number(opt("--offset", 0));
const k = requireServiceKey();
async function get(q) {
  const t = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { ...headers(k), Prefer: "count=exact" } });
  if (!r.ok) { console.error("read failed", r.status, await r.text()); process.exit(1); }
  console.error(`${r.status} ${r.headers.get("content-range")} ${Date.now() - t} ms  ${q.slice(0, 90)}`);
  return r.json();
}
await get("areas?select=id&season_months=not.is.null&limit=1");
const rows = await get(`areas?select=id,name,region,area_type,route_count,lat,lng,elevation_ft,disciplines,parent:parent_id(name),season_months&area_type=in.(crag,peak)&season_months=is.null&route_count=gt.0&order=route_count.desc&limit=${limit}&offset=${offset}`);
if (args.includes("--json")) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
for (const a of rows) console.log(String(a.route_count).padStart(6), a.area_type.padEnd(5), (a.region || "").padEnd(15), a.id, "|", a.name, "<", a.parent && a.parent.name);
