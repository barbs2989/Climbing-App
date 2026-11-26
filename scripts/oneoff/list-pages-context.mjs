// Builds the research worklist for audit:list-pages: for each thin list page, the route's current
// values of the sections a batch may fill, so research agents never read the production database.
//   node scripts/oneoff/list-pages-context.mjs <pages.json> <outdir> [--per 12]
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const [, , pagesPath, outDir] = process.argv;
const per = process.argv.includes("--per") ? Number(process.argv[process.argv.indexOf("--per") + 1]) : 12;
const ORDER = ["co14", "ca14", "cascade", "adk46", "fifty", "co_cent", "desert", "sps", "bulgers"];
const FILL = new Set(["description", "approach", "descent", "season", "hazards", "gain", "distance"]);
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
const seen = new Set();
const todo = [];
for (const l of ORDER) for (const p of pages) if (p.list === l && p.route && !seen.has(p.route) && p.missing.some(m => FILL.has(m))) { seen.add(p.route); todo.push(p); }
const key = requireServiceKey();
const SEL = "id,area_id,name,grade,discipline,overview,description,approach,descent_text,season,best_season,hazards,gain_ft,dist_km,high_point_ft,waypoints,areas(name,elevation_ft,lat,lng)";
const ctx = [];
for (let i = 0; i < todo.length; i += 30) {
  const ids = todo.slice(i, i + 30).map(p => p.route);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 200));
  for (const row of await r.json()) {
    const p = todo.find(x => x.route === row.id);
    ctx.push({ list: p.list, peak: p.peak, fill: p.missing.filter(m => FILL.has(m)), row: { ...row, waypoints: (row.waypoints || []).map(w => ({ name: w.name, type: w.type, elev: w.elev, distMi: w.distMi })) } });
  }
  await new Promise(res => setTimeout(res, 300));
}
const pos = id => todo.findIndex(p => p.route === id);
ctx.sort((a, b) => pos(a.row.id) - pos(b.row.id));
fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (let i = 0; i < ctx.length; i += per) fs.writeFileSync(`${outDir}/ctx-${String(++n).padStart(2, "0")}.json`, JSON.stringify(ctx.slice(i, i + per), null, 1));
console.log(`${ctx.length} routes to fill, ${n} batches of ${per}`);
