// How many routes are filed as alpine/mountaineering/scrambling while sitting on an area the
// catalog itself calls a CRAG, and carrying a roped rock grade?
//
// This matters beyond tidiness: `catOf()` gates real behaviour on discipline. An alpine label
// puts the CAMPING & BIVY panel, the alpine safety advice and the approach/summit planner on a
// route that is a few metres from a car. Pinto Rock is the case that prompted it — 5 of its 17
// routes read `alpine` at 5.4 to 5.10 while the other 12, on the same plug, read sport or trad.
//
// Read-only. Fails closed on an empty read: zero routes would make every crag look clean.
import { selectAll } from "../lib/supabase-env.mjs";

const ALPINE = ["alpine", "mountaineering", "scrambling"];
const areas = await selectAll("areas", "id,name,area_type,path", "", { pageSize: 1000 });
if (!areas.length) { console.log("FAIL: read no areas"); process.exit(1); }
const byId = new Map(areas.map(a => [a.id, a]));

const routes = await selectAll("routes", "id,name,area_id,discipline,grade", "", { pageSize: 1000 });
if (!routes.length) { console.log("FAIL: read no routes"); process.exit(1); }
console.log(`${areas.length} areas, ${routes.length} routes`);

// A roped rock grade, i.e. YDS fifth class. Deliberately NOT matching "Class 4" or an ordinal —
// those are exactly what a legitimate scramble carries.
const isRockGrade = g => /^5\.\d/.test(String(g || "").trim());

const hits = [];
for (const r of routes) {
  const a = byId.get(r.area_id);
  if (!a || a.area_type !== "crag") continue;
  if (!ALPINE.includes(r.discipline)) continue;
  if (!isRockGrade(r.grade)) continue;
  hits.push({ r, a });
}

// Group by the crag's parent, so one bad import shows as one finding rather than N.
const byParent = new Map();
for (const { r, a } of hits) {
  const parent = String(a.path || "").split(".").slice(0, -1).join(".");
  const p = byId.get([...byId.values()].find(x => x.path === parent)?.id) || { name: parent };
  const k = p.name || parent;
  if (!byParent.has(k)) byParent.set(k, []);
  byParent.get(k).push({ r, a });
}

console.log(`\n${hits.length} route(s) filed alpine/mountaineering/scrambling on a CRAG with a 5.x grade:\n`);
for (const [parent, rows] of [...byParent.entries()].sort((x, y) => y[1].length - x[1].length)) {
  // Show the siblings' disciplines — a crag whose OTHER routes read sport/trad is the strong case.
  const cragIds = new Set(rows.map(x => x.a.id));
  const sibs = routes.filter(x => cragIds.has(x.area_id) && !rows.some(h => h.r.id === x.id));
  const sibDisc = [...new Set(sibs.map(s => s.discipline))].join("/") || "(no siblings)";
  console.log(`${String(rows.length).padStart(3)}  ${parent}   [siblings on the same crags: ${sibDisc}]`);
  for (const { r, a } of rows.slice(0, 8)) console.log(`       ${r.id}  "${r.name}"  ${r.discipline} ${r.grade}  on ${a.name}`);
  if (rows.length > 8) console.log(`       ... and ${rows.length - 8} more`);
}
console.log(`\nTotal: ${hits.length} across ${byParent.size} parent area(s).`);
