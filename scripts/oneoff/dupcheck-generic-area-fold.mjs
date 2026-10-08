// Out-of-band duplicate-CLIMB check for the generic-area fold (0259 bypasses refuse_duplicate_route for
// its climb moves, as 0251 did). Replays plan.json's climb moves on the live climbs of every area they
// touch and lists each destination that would hold two climbs with the same name key — the same climb
// filed twice (two copies of one place folded together), or two different climbs sharing a name.
//   node scripts/oneoff/dupcheck-generic-area-fold.mjs      -> audits/generic-area-names-2026-10-07/dup-climbs.json
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const DIR = path.join(ROOT, "audits/generic-area-names-2026-10-07");
const plan = JSON.parse(fs.readFileSync(path.join(DIR, "plan.json"), "utf8"));
const key = requireServiceKey();
const moves = plan.ops.filter(o => o.op === "moveall" || o.op === "moveone");
const areaIds = [...new Set(moves.flatMap(o => [o.from, o.to]))];
const created = new Set(plan.ops.filter(o => o.op === "create").map(o => o.id));
const routes = [];
const live = areaIds.filter(id => !created.has(id));
for (let i = 0; i < live.length; i += 40) routes.push(...await selectAll("routes", "id,name,area_id,grade,discipline,fa,description", `area_id=in.(${live.slice(i, i + 40).map(encodeURIComponent).join(",")})`, { key, pageSize: 1000 }));
const at = new Map(); for (const r of routes) (at.get(r.area_id) || at.set(r.area_id, []).get(r.area_id)).push(r);
for (const o of moves) {
  if (o.op === "moveone") { const src = at.get(o.from) || []; const r = src.find(x => x.id === o.route); if (!r) { console.log("missing", o.route); continue; } at.set(o.from, src.filter(x => x !== r)); (at.get(o.to) || at.set(o.to, []).get(o.to)).push(r); }
  else { const src = at.get(o.from) || []; at.set(o.from, []); (at.get(o.to) || at.set(o.to, []).get(o.to)).push(...src); }
}
// route_name_key-ish: the DB's 0219 key is canon minus "the" and trailing marks
const rk = n => String(n).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^the\s+/, "").replace(/,\s*the$/, "").replace(/[^a-z0-9]+/g, " ").trim();
const moved = new Set(moves.flatMap(o => o.op === "moveone" ? [o.route] : []));
for (const o of moves.filter(o => o.op === "moveall")) for (const r of routes.filter(r => r.area_id === o.from)) moved.add(r.id);
const dups = [];
for (const [area, rs] of at) {
  const g = new Map(); for (const r of rs) (g.get(rk(r.name)) || g.set(rk(r.name), []).get(rk(r.name))).push(r);
  for (const [k, list] of g) if (list.length > 1 && list.some(r => moved.has(r.id))) dups.push({ area, key: k, climbs: list.map(r => ({ id: r.id, name: r.name, grade: r.grade, discipline: r.discipline, fa: r.fa, from: r.area_id, desc: (r.description || "").slice(0, 80) })) });
}
fs.writeFileSync(path.join(DIR, "dup-climbs.json"), JSON.stringify(dups, null, 1));
console.log(`moved climbs ${moved.size}; destinations with a same-named pair: ${dups.length}`);
for (const d of dups) console.log(`  ${d.area}: ${d.climbs.map(c => `${c.name} [${c.grade} ${c.discipline}] (${c.id} from ${c.from})`).join("  |  ")}`);
