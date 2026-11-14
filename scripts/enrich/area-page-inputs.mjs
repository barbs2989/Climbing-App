#!/usr/bin/env node
// Build research INPUT files for the area-page pass: the next areas with climbs and no `blurb`,
// each with what it already holds and its climb stats (area_climb_stats: disciplines, grade
// spread) so the researcher writes only what is missing and describes the grades we actually list.
//
//   node scripts/enrich/area-page-inputs.mjs --min 30 [--max 49] --skip done-ids.json --per 8 --out DIR --prefix t [--from-region "New Mexico" --limit 400]
//
// Read-only; anon key. Areas already handled (written or skipped in an audits/area-pages batch)
// are left out through --skip, a JSON array of ids.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const min = Number(opt("--min", 30)), max = opt("--max", null), per = Number(opt("--per", 8));
const out = opt("--out", "."), prefix = opt("--prefix", "t"), start = Number(opt("--start", 1));
const skip = new Set(opt("--skip", null) ? JSON.parse(fs.readFileSync(opt("--skip"), "utf8")) : []);
const k = anonKey();
let q = `areas?select=id,name,region,area_type,route_count,lat,lng,approach,approach_min,parking_name,parking_note,rock,aspect,season_months,disciplines,path&area_type=in.(crag,peak,wall)&route_count=gte.${min}&blurb=is.null&order=region.asc,route_count.desc&limit=${Number(opt("--limit", 2000))}`;
if (max) q += `&route_count=lte.${max}`;
// PostgREST answers at most 1000 rows, so a long tier is built in passes: --from-region starts a pass
// at a region (inclusive), after the last pass's final region.
if (opt("--from-region", null)) q += `&region=gte.${encodeURIComponent(opt("--from-region"))}`;
// --region reads one region only: the cheapest read when a ranged one hits the statement timeout.
if (opt("--region", null)) q += `&region=eq.${encodeURIComponent(opt("--region"))}`;
// --split reads one route_count value at a time (min..max) and merges them: a big region's
// whole-tier read can hit the statement timeout when one value's read does not.
const reads = args.includes("--split") && max ? Array.from({ length: Number(max) - min + 1 }, (_, i) => q.replace(`route_count=gte.${min}`, `route_count=eq.${Number(max) - i}`).replace(`&route_count=lte.${max}`, "")) : [q];
const all = [];
for (const rq of reads) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${rq}`, { headers: headers(k) });
  if (!r.ok) { console.error("read failed", r.status, await r.text()); process.exit(1); }
  all.push(...await r.json());
}
const rows = all.filter(a => !skip.has(a.id));
console.error(`${rows.length} area(s) to research`);
const sleep = ms => new Promise(res => setTimeout(res, ms));
for (const a of rows) {
  const s = await fetch(`${SUPABASE_URL}/rest/v1/rpc/area_climb_stats`, { method: "POST", headers: { ...headers(k), "Content-Type": "application/json" }, body: JSON.stringify({ aid: a.id }) });
  a.stats = s.ok ? await s.json() : null;
  const p = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=name&path=eq.${encodeURIComponent((a.path || "").split(".").slice(0, -1).join("."))}`, { headers: headers(k) });
  a.parent = p.ok ? ((await p.json())[0] || {}).name || null : null;
  delete a.path;
  await sleep(300);
}
let n = start;
for (let i = 0; i < rows.length; i += per, n++) {
  const f = `${out}/in-${prefix}${String(n).padStart(2, "0")}.json`;
  fs.writeFileSync(f, JSON.stringify(rows.slice(i, i + per), null, 1));
  console.log(f, rows.slice(i, i + per).map(x => x.region).filter((v, j, arr) => arr.indexOf(v) === j).join(","));
}
