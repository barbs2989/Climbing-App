// Snapshot every RICH route filed OUTSIDE Washington (enough enrichment for two fields to disagree).
// One SQL read picks the ids (no count=exact on routes: it 500s); rows are then fetched by id, paced.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const OUT = new URL("../../../audits/oos-contradictions", import.meta.url).pathname;
const sql = `select r.id, r.area_id from routes r join areas a on a.id = r.area_id
 where a.path is not null and not (a.path <@ 'usa.washington')
 and (r.timing is not null or r.itinerary is not null or r.waypoints is not null or r.approach_variants is not null or r.climbing_route is not null or r.seasonal_guidance is not null or r.pitch_detail is not null)`;
const raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
const ids = JSON.parse(raw.slice(raw.indexOf("{"))).rows;
console.log("rich out-of-state routes", ids.length);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(q) {
  for (let t = 0; ; t++) {
    const t0 = Date.now();
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key) });
    const s = await r.text();
    if (r.ok) { const ms = Date.now() - t0; if (ms > 10000) throw new Error(`slow read ${ms}ms — stop`); return JSON.parse(s); }
    if (t >= 1) throw new Error(r.status + " " + s.slice(0, 300));
    console.log("read failed", r.status, "backing off 60s"); await sleep(60000);
  }
}
const areaIds = [...new Set(ids.map(x => x.area_id))];
const areas = [];
for (let i = 0; i < areaIds.length; i += 100) { areas.push(...await get(`areas?select=id,name,parent_id,path,area_type,elevation_ft,lat,lng,avy_zone,region&id=in.(${areaIds.slice(i, i + 100).map(encodeURIComponent).join(",")})`)); await sleep(500); }
fs.writeFileSync(`${OUT}/oos-areas.json`, JSON.stringify(areas));
const routes = [];
const rid = ids.map(x => x.id);
for (let i = 0; i < rid.length; i += 40) {
  routes.push(...await get(`routes?select=*&id=in.(${rid.slice(i, i + 40).map(encodeURIComponent).join(",")})`));
  if (i % 400 === 0) console.log(i, "/", rid.length);
  await sleep(700);
}
console.log("routes", routes.length, "areas", areas.length);
fs.writeFileSync(`${OUT}/oos-routes.json`, JSON.stringify(routes));
