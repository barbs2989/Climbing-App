// Build region research inputs from the static snapshot (no DB).
// node build-regions.js MIN MAX OUT
const z = require("zlib"), fs = require("fs"), path = require("path");
const S = path.join(__dirname, "snap") + "/";
const idx = JSON.parse(fs.readFileSync(S + "index.json"));
const areas = [], routes = [];
for (const s of Object.values(idx.states)) for (const p of s.parts) {
  const j = JSON.parse(z.gunzipSync(fs.readFileSync(S + p.file)));
  if (j.areas) for (const a of j.areas) areas.push(a);
  for (const r of j.routes || []) routes.push({ a: r.area_id, d: r.discipline, s: r.grade_system, g: r.grade_num });
}
const byId = Object.fromEntries(areas.map(a => [a.id, a]));
const kids = {}; for (const a of areas) (kids[a.parent_id] = kids[a.parent_id] || []).push(a);
const st = {};
for (const r of routes) {
  const a = byId[r.a]; if (!a) continue;
  for (const anc of a.path.split(".")) {
    const x = st[anc] = st[anc] || { total: 0, by_disc: {}, g: {} };
    x.total++; x.by_disc[r.d] = (x.by_disc[r.d] || 0) + 1;
    if (r.s && r.g != null) { const k = r.s + "|" + Math.floor(r.g); x.g[k] = (x.g[k] || 0) + 1; }
  }
}
const MIN = +process.argv[2] || 100, MAX = +process.argv[3] || 1e9;
const sel = areas.filter(a => a.area_type === "region" && !a.blurb && a.route_count >= MIN && a.route_count <= MAX).sort((a, b) => b.route_count - a.route_count);
const rocksBelow = {};
for (const b of areas) if (b.rock && b.rock_basis !== "mapped") for (const anc of b.path.split(".").slice(0, -1)) { const m = rocksBelow[anc] = rocksBelow[anc] || {}; m[b.rock] = (m[b.rock] || 0) + 1; }
const out = sel.map(a => {
  const x = st[a.id] || { total: 0, by_disc: {}, g: {} }; const par = byId[a.parent_id];
  const ch = (kids[a.id] || []).slice().sort((p, q) => q.route_count - p.route_count);
  return {
    id: a.id, name: a.name, region: a.region, parent: par ? par.name : null,
    breadcrumb: a.path.split(".").slice(1, -1).map(i => byId[i] ? byId[i].name : i).join(" > "),
    lat: a.lat, lng: a.lng, route_count: a.route_count,
    stats: { total: x.total, by_disc: x.by_disc, by_grade: Object.entries(x.g).map(([k, n]) => ({ sys: k.split("|")[0], bucket: +k.split("|")[1], n })).filter(e => e.n >= 2).sort((p, q) => p.sys.localeCompare(q.sys) || p.bucket - q.bucket) },
    sub_areas_count: ch.length,
    biggest_sub_areas: ch.slice(0, 15).map(c => ({ name: c.name, type: c.area_type, climbs: c.route_count, main: c.dominant_discipline || null })),
    researched_rocks_below: Object.entries(rocksBelow[a.id] || {}).sort((p, q) => q[1] - p[1]).slice(0, 4).map(e => e[0] + " (" + e[1] + " areas)"),
  };
});
console.error("selected", out.length);
fs.writeFileSync(process.argv[4] || "regions.json", JSON.stringify(out, null, 1));
