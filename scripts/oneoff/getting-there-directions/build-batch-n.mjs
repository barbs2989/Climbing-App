// Build research batches for the NEITHER backlog (neither.json): one entry per route, with the
// trailheads and drives its SIBLINGS on the same area already carry, so research starts from a
// verified drive instead of a blank. Read-only; reads only the areas named, by area_id, in chunks.
//   node build-batch-n.mjs <out-prefix> <areaType> [excludeAreaName ...]
//   SRC=remaining.json node build-batch-n.mjs ...   (the live re-listing, list-remaining.mjs)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const [prefix, type, ...exclude] = process.argv.slice(2);
const H = { apikey: anonKey(), Authorization: "Bearer " + anonKey() };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const groups = JSON.parse(fs.readFileSync(path.join(here, process.env.SRC || "neither.json"), "utf8"))
  .filter(g => g.area_type === type && !exclude.includes(g.area));
const sib = new Map();
const ids = groups.map(g => g.area_id);
for (let i = 0; i < ids.length; i += 10) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,th:approach_logistics->>trailhead,dir:approach_logistics->>trailheadDirection,approach&area_id=in.(${ids.slice(i, i + 10).map(encodeURIComponent).join(",")})&approach_logistics->>trailhead=not.is.null`, { headers: H, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error("siblings " + res.status + " " + (await res.text()).slice(0, 200));
  for (const r of await res.json()) (sib.get(r.area_id) || sib.set(r.area_id, []).get(r.area_id)).push(r);
  await sleep(500);
}
const out = [];
for (const g of groups) {
  const s = (sib.get(g.area_id) || []);
  const known = [...new Map(s.map(r => [r.th + "|" + r.dir, { trailhead: r.th, trailheadDirection: r.dir, usedBy: s.filter(x => x.th === r.th).map(x => x.name) }])).values()];
  const approachSample = s.filter(r => r.approach).slice(0, 2).map(r => ({ route: r.name, approach: String(r.approach).slice(0, 600) }));
  for (const r of g.routes) out.push({ id: r.id, name: r.name, discipline: r.discipline, peak: g.area, range: g.parent, lat: g.lat, lng: g.lng, siblingTrailheads: known, siblingApproaches: approachSample });
}
const half = Math.ceil(out.length / 2);
fs.writeFileSync(path.join(here, prefix + "-1.json"), JSON.stringify(out.slice(0, half), null, 1));
fs.writeFileSync(path.join(here, prefix + "-2.json"), JSON.stringify(out.slice(half), null, 1));
console.log(out.length, "routes;", out.filter(o => o.siblingTrailheads.length).length, "with a sibling trailhead");
