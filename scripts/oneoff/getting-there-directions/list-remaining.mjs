// Which routes of the NEITHER backlog (neither.json, 2026-10-28) are STILL empty today? Re-read by
// id (no scans), keep the ones with no trailhead card and no approach prose, and re-group them by
// their LIVE area (three were refiled 2026-10-29). Writes remaining.json in neither.json's shape,
// so build-batch-n.mjs-style tooling can read it.   node list-remaining.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const H = { apikey: anonKey(), Authorization: "Bearer " + anonKey() };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const groups = JSON.parse(fs.readFileSync(path.join(here, "neither.json"), "utf8"));
const ids = groups.flatMap(g => g.routes.map(r => r.id));
const live = [];
for (let i = 0; i < ids.length; i += 40) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,area_id,approach,th:approach_logistics->>trailhead&id=in.(${ids.slice(i, i + 40).map(encodeURIComponent).join(",")})`, { headers: H, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error("read " + res.status + " " + (await res.text()).slice(0, 200));
  live.push(...await res.json());
  await sleep(400);
}
const gone = ids.filter(id => !live.some(r => r.id === id));
const empty = live.filter(r => !r.th && !(r.approach && String(r.approach).trim()));
const areaIds = [...new Set(empty.map(r => r.area_id))];
const areas = [];
for (let i = 0; i < areaIds.length; i += 40) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,lat,lng,parent:parent_id(name)&id=in.(${areaIds.slice(i, i + 40).map(encodeURIComponent).join(",")})`, { headers: H, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error("areas " + res.status);
  areas.push(...await res.json());
}
const out = areas.map(a => ({ area_id: a.id, area: a.name, parent: a.parent?.name || null, area_type: a.area_type, lat: a.lat, lng: a.lng,
  routes: empty.filter(r => r.area_id === a.id).map(r => ({ id: r.id, name: r.name, discipline: r.discipline, approach_logistics: {} })) }));
fs.writeFileSync(path.join(here, "remaining.json"), JSON.stringify(out, null, 1));
const byType = {}; for (const g of out) byType[g.area_type] = (byType[g.area_type] || 0) + g.routes.length;
console.log(`${ids.length} in the backlog list; ${live.length - empty.length} now filled; ${gone.length} gone (${gone.join(", ")}); ${empty.length} still empty on ${out.length} areas`, JSON.stringify(byType));
