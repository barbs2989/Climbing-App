// ROLLBACK SNAPSHOT for 0259 (the generic-area fold), taken straight before it is applied: the full row of
// every area the plan touches, the area of every climb it moves, and the full row of every duplicate climb
// it merges away. Restoring = re-insert the deleted areas (parents first), set name/parent_id/area_type
// back, move the climbs back, re-insert the merged copies; then re-path and recount (see 0259's tail).
//   node scripts/oneoff/snapshot-generic-area-fold.mjs   -> scripts/rollback-generic-area-fold-<ms>.json
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, "audits/generic-area-names-2026-10-07/plan.json"), "utf8"));
const key = requireServiceKey();
const created = new Set(plan.ops.filter(o => o.op === "create").map(o => o.id));
const areaIds = [...new Set(plan.ops.flatMap(o => [o.id, o.from, o.to, o.into, o.parent]).filter(x => x && !created.has(x) && !/^\d/.test(x)))];
const routeAreas = [...new Set(plan.ops.filter(o => o.op === "moveall").map(o => o.from).filter(x => !created.has(x)))];
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const enc = ids => ids.map(encodeURIComponent).join(",");
const areas = [], moved = [], merged = [];
for (const c of chunks(areaIds, 60)) areas.push(...await selectAll("areas", "*", `id=in.(${enc(c)})`, { key, pageSize: 1000 }));
for (const c of chunks(routeAreas, 40)) moved.push(...(await selectAll("routes", "id,area_id", `area_id=in.(${enc(c)})`, { key, pageSize: 1000 })));
const ones = plan.ops.filter(o => o.op === "moveone").map(o => o.route);
for (const c of chunks(ones, 60)) moved.push(...(await selectAll("routes", "id,area_id", `id=in.(${enc(c)})`, { key, pageSize: 1000 })));
const drops = plan.ops.filter(o => o.op === "merge").map(o => o.drop);
if (drops.length) merged.push(...await selectAll("routes", "*", `id=in.(${enc(drops)})`, { key, pageSize: 1000 }));
const out = path.join(ROOT, `scripts/rollback-generic-area-fold-${Date.now()}.json`);
fs.writeFileSync(out, JSON.stringify({ migration: "0259_fold_generic_discipline_areas", taken: new Date().toISOString(), areas, routes_area_before: moved, merged_away_routes: merged }, null, 1));
console.log(`snapshot: ${areas.length} areas, ${moved.length} climb positions, ${merged.length} merged-away climbs -> ${path.relative(ROOT, out)}`);
