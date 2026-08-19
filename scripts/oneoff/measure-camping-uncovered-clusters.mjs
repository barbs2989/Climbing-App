// Which uncovered camping clusters are worth a batch? Groups the REMAINING alpine/
// mountaineering/scrambling routes by their area's ltree ancestry, so a zone is proposed
// by where the peaks actually sit rather than by name.
//
// Scoped by area subtree, never `id like 'wa_%'` — that misses legacy ids.
// selectAll on both reads: a plain PostgREST read caps at 1000 rows.
import { selectAll } from "../lib/supabase-env.mjs";

const wa = await selectAll("areas", "id,name,path", "name=eq.Washington&area_type=eq.state", { pageSize: 10 });
const root = wa[0];
const kids = await selectAll("areas", "id,name,path,lat,lng", `path=cd.${root.path}`, { pageSize: 1000 });
const byId = new Map([[root.id, root], ...kids.map(a => [a.id, a])]);

const all = await selectAll("routes", "id,name,area_id,discipline,bivy", "", { pageSize: 1000 });
const rows = all.filter(r => byId.has(r.area_id) && ["alpine", "mountaineering", "scrambling"].includes(r.discipline));
const open = rows.filter(r => r.bivy == null);

// Ancestor at a given ltree depth, resolved through the path rather than parent_id —
// the path is what the DB orders and filters by.
const labelAt = (area, depth) => {
  const segs = String(area.path || "").split(".");
  const anc = segs.slice(0, depth).join(".");
  for (const a of byId.values()) if (a.path === anc) return a.name;
  return anc || "(root)";
};

for (const depth of [4, 5]) {
  const g = new Map();
  for (const r of open) {
    const a = byId.get(r.area_id);
    const k = labelAt(a, depth);
    if (!g.has(k)) g.set(k, { routes: 0, areas: new Set(), peaks: new Map() });
    const e = g.get(k);
    e.routes++; e.areas.add(r.area_id);
    e.peaks.set(a.name, (e.peaks.get(a.name) || 0) + 1);
  }
  console.log(`\n=== uncovered, grouped at ltree depth ${depth} ===`);
  [...g.entries()].sort((x, y) => y[1].routes - x[1].routes).slice(0, 14).forEach(([k, e]) => {
    const top = [...e.peaks.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([n, c]) => `${n}(${c})`).join(", ");
    console.log(`${String(e.routes).padStart(4)} routes / ${String(e.areas.size).padStart(3)} areas  ${k}`);
    console.log(`      ${top}`);
  });
}
console.log(`\ntotal uncovered: ${open.length} routes on ${new Set(open.map(r => r.area_id)).size} areas`);
