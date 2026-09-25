// Dump, per research batch, every camping route with the camps its CAMPING & BIVY panel lists today,
// so an agent can say which are the MAIN camps for a typical trip, which sit ON the route, and which
// do not belong. Batches keep a zone file (the trailhead unit) whole.
//   node scripts/oneoff/dump-camp-role-research-inputs.mjs [routesPerBatch=40]
import fs from "node:fs";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const PER = Number(process.argv[2] || 40);
const rows = await selectAll("routes", "id,name,area_id,discipline,grade,bivy,waypoints,overview,approach,high_point_ft", "bivy=not.is.null", { key, pageSize: 300 });
const areaIds = [...new Set(rows.map(r => r.area_id))];
const areas = {};
for (let i = 0; i < areaIds.length; i += 100) {
  const ids = areaIds.slice(i, i + 100).map(encodeURIComponent).join(",");
  for (const a of await selectAll("areas", "id,name,elevation_ft", `id=in.(${ids})`, { key, pageSize: 1000 })) areas[a.id] = a;
}
const dir = "enrichment-wip/camping-zones/";
const areaZone = {};
for (const f of fs.readdirSync(dir)) { const z = JSON.parse(fs.readFileSync(dir + f)); for (const a of z.areas || []) areaZone[a] = f.replace(/\.json$/, ""); }
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };
const groups = {};
for (const r of rows) {
  const z = areaZone[r.area_id] || ("unzoned:" + r.area_id);
  const names = new Set((r.bivy || []).map(b => String(b?.name || "").trim().toLowerCase()));
  const camps = (r.bivy || []).map(b => ({ name: b.name, store: "bivy", type: b.type || null, elev: b.elev ?? null, notes: cut(b.notes, 220) }))
    .concat((r.waypoints || []).filter(w => /camp/i.test(String(w?.type || "")) && !names.has(String(w?.name || "").trim().toLowerCase()))
      .map(w => ({ name: w.name, store: "waypoint", type: "camp", elev: w.elev ?? null, notes: cut(w.directions || w.note, 160) })));
  (groups[z] ||= []).push({ id: r.id, name: r.name, peak: areas[r.area_id]?.name || r.area_id, area_id: r.area_id, discipline: r.discipline, grade: r.grade, high_point_ft: r.high_point_ft, overview: cut(r.overview, 300), approach: cut(r.approach, 300), camps });
}
const zones = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
const batches = []; let cur = [];
for (const [z, rs] of zones) {
  if (cur.length && cur.reduce((n, g) => n + g.routes.length, 0) + rs.length > PER) { batches.push(cur); cur = []; }
  cur.push({ zone: z, routes: rs });
}
if (cur.length) batches.push(cur);
const out = "enrichment-wip/camping-roles/input/";
fs.mkdirSync(out, { recursive: true });
batches.forEach((b, i) => fs.writeFileSync(out + "batch-" + String(i + 1).padStart(2, "0") + ".json", JSON.stringify(b, null, 1)));
console.log(batches.length, "batches:", batches.map((b, i) => (i + 1) + "=" + b.reduce((n, g) => n + g.routes.length, 0) + "r/" + b.length + "z").join(" "));
