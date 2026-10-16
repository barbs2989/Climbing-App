// Dump the uncovered alpine/mountaineering/scrambling routes with their AREA IDS, grouped by
// depth-5 ltree region. Zone files must declare explicit peak ids — expanding a region
// container swallowed seven Kangaroo Ridge routes once already.
import { selectAll } from "../lib/supabase-env.mjs";

const wa = await selectAll("areas", "id,name,path", "name=eq.Washington&area_type=eq.state", { pageSize: 10 });
const kids = await selectAll("areas", "id,name,path,lat,lng", `path=cd.${wa[0].path}`, { pageSize: 1000 });
const byId = new Map([[wa[0].id, wa[0]], ...kids.map(a => [a.id, a])]);
const byPath = new Map([...byId.values()].map(a => [a.path, a]));

const all = await selectAll("routes", "id,name,area_id,discipline,bivy", "", { pageSize: 1000 });
const open = all.filter(r => byId.has(r.area_id) && ["alpine", "mountaineering", "scrambling"].includes(r.discipline) && r.bivy == null);

const want = process.argv.slice(2);
const g = new Map();
for (const r of open) {
  const a = byId.get(r.area_id);
  const anc = String(a.path || "").split(".").slice(0, 5).join(".");
  const k = (byPath.get(anc) || {}).name || anc;
  if (!g.has(k)) g.set(k, new Map());
  const peaks = g.get(k);
  if (!peaks.has(a.id)) peaks.set(a.id, { name: a.name, lat: a.lat, lng: a.lng, routes: [] });
  peaks.get(a.id).routes.push(r.name);
}
const size = m => [...m.values()].reduce((s, p) => s + p.routes.length, 0);
for (const [region, peaks] of [...g.entries()].sort((x, y) => size(y[1]) - size(x[1]))) {
  if (want.length && !want.some(w => region.toLowerCase().includes(w.toLowerCase()))) continue;
  console.log(`\n## ${region}  (${size(peaks)} routes / ${peaks.size} areas)`);
  for (const [id, p] of [...peaks.entries()].sort((x, y) => y[1].routes.length - x[1].routes.length))
    console.log(`  ${id}  ${p.name} [${p.lat},${p.lng}]  :: ${p.routes.join(" | ")}`);
}
