// The getting-there BACKLOG: WA alpine routes (alpine/mountaineering/ice/mixed) with NO approach prose
// and NO trailhead card. Read-only, and deliberately light — it never scans `areas` whole (that read
// timed out on 2026-10-28): routes are filtered by id prefix, discipline and empty prose, and only the
// areas they sit in are fetched, by id, with their parents.
//
// Writes, beside this file:
//   neither.json        — the routes, each with its area and parent area names, grouped by area
//   th-library.json     — {trailhead name: {lat, lng, routes}} from coordinates OTHER WA routes already
//                         store in approach_logistics, kept only where every copy agrees within 200 m
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const H = { apikey: anonKey(), Authorization: "Bearer " + anonKey() };

const routes = await selectAll("routes", "id,name,area_id,discipline,approach,approach_logistics,waypoints",
  "id=like.wa_*&discipline=in.(alpine,mountaineering,ice,mixed)&or=(approach.is.null,approach.eq.)", { pageSize: 500 });
const hasCard = r => r.approach_logistics && (r.approach_logistics.trailhead || (r.waypoints || []).some(w => w.type === "Trailhead"));
const gap = routes.filter(r => !hasCard(r));

const areaIds = [...new Set(gap.map(r => r.area_id))];
const areas = new Map();
const fetchAreas = async (ids) => {
  for (let i = 0; i < ids.length; i += 50) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,parent_id,area_type,lat,lng&id=in.(${ids.slice(i, i + 50).map(encodeURIComponent).join(",")})`, { headers: H });
    if (!res.ok) throw new Error("areas " + res.status);
    for (const a of await res.json()) areas.set(a.id, a);
  }
};
await fetchAreas(areaIds);
await fetchAreas([...new Set([...areas.values()].map(a => a.parent_id).filter(p => p && !areas.has(p)))]);

const groups = {};
for (const r of gap) {
  const a = areas.get(r.area_id) || {};
  const p = areas.get(a.parent_id) || {};
  (groups[r.area_id] = groups[r.area_id] || { area_id: r.area_id, area: a.name, parent: p.name, area_type: a.area_type, lat: a.lat, lng: a.lng, routes: [] })
    .routes.push({ id: r.id, name: r.name, discipline: r.discipline, approach_logistics: r.approach_logistics || {} });
}
const list = Object.values(groups).sort((x, y) => y.routes.length - x.routes.length);
fs.writeFileSync(path.join(here, "neither.json"), JSON.stringify(list, null, 1));

// The coordinate library: only copies, only where they agree.
const withCoord = await selectAll("routes", "id,th:approach_logistics->>trailhead,lat:approach_logistics->>trailheadLat,lng:approach_logistics->>trailheadLng",
  "id=like.wa_*&approach_logistics->>trailheadLat=not.is.null", { pageSize: 1000 });
const byName = {};
for (const r of withCoord) if (r.th) (byName[r.th] = byName[r.th] || []).push({ id: r.id, lat: Number(r.lat), lng: Number(r.lng) });
const km = (a, b) => { const R = 6371, d = Math.PI / 180, x = (b.lng - a.lng) * d * Math.cos((a.lat + b.lat) / 2 * d), y = (b.lat - a.lat) * d; return R * Math.hypot(x, y); };
const library = {};
for (const [name, pts] of Object.entries(byName)) {
  if (pts.some(p => !isFinite(p.lat) || !isFinite(p.lng))) continue;
  if (pts.every(p => km(p, pts[0]) <= 0.2)) library[name] = { lat: pts[0].lat, lng: pts[0].lng, routes: pts.length };
}
fs.writeFileSync(path.join(here, "th-library.json"), JSON.stringify(library, null, 1));

const types = {};
for (const g of list) types[g.area_type || "?"] = (types[g.area_type || "?"] || 0) + g.routes.length;
console.log("backlog routes", gap.length, "in", list.length, "areas; by area type", JSON.stringify(types));
console.log("top areas:", list.slice(0, 20).map(g => `${g.area} (${g.parent}) ${g.routes.length}`).join("; "));
console.log("library: " + Object.keys(library).length + " trailhead names with an agreeing coordinate");
