// strip-route-topo-labels.mjs — take the guidebook TOPO NUMBER off climb names (2026-10-07).
//
// The owner, after the area labels came off (#2224, 0251): "ok do all of those" — including the 1,184
// climb names that read "(01) Chicken Crack", "36. The Thomas Test", "1) Odin's Raven". The rule, and
// what was measured to choose it, is scripts/lib/route-topo-label.mjs, shared with the importer so the
// next import still MATCHES every renamed climb (it matches by area + name).
//
// HELD, not renamed: a climb whose stripped name another climb on the same area already has (after
// its own rename). There the number is the only thing telling them apart — five "Slab" V1s, six
// "Project"s, "28b./28c. Intergalatic STDs" — 42 on 2026-10-07. Listed with --held.
//
//   node scripts/oneoff/strip-route-topo-labels.mjs            # dry run: counts + samples
//   node scripts/oneoff/strip-route-topo-labels.mjs --held     # print the held climbs
//   node scripts/oneoff/strip-route-topo-labels.mjs --apply    # write, with a rollback file, then re-read
//
// Writes need the service key. refuse_duplicate_route re-checks a renamed climb against same-named
// climbs in its neighbourhood (0216); a refusal is reported, not forced — it is a possible duplicate.
import fs from "fs";
import path from "path";
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
import { stripRouteTopoLabel, letterSeriesAreas } from "../lib/route-topo-label.mjs";
const APPLY = process.argv.includes("--apply"), HELD = process.argv.includes("--held");
const KEY = requireServiceKey();
const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const routes = await selectAll("routes", "id,name,area_id,grade", "", { pageSize: 1000, key: KEY });
if (routes.length < 300000) { console.error(`read only ${routes.length} routes — refusing to act on a partial read`); process.exit(2); }
const series = letterSeriesAreas(routes);
const key = s => String(s).toLowerCase().replace(/^the\s+|,\s*the$/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const all = routes.map(r => ({ id: r.id, area_id: r.area_id, grade: r.grade, from: r.name, to: stripRouteTopoLabel(r.name, { letterSeries: series.has(r.area_id) }) }));
const after = new Map(all.map(x => [x.id, x.to]));
const byArea = new Map(); for (const x of all) (byArea.get(x.area_id) || byArea.set(x.area_id, []).get(x.area_id)).push(x);
const changed = all.filter(x => x.to !== String(x.from).trim());
const held = changed.filter(x => byArea.get(x.area_id).some(o => o.id !== x.id && key(after.get(o.id)) === key(x.to)));
const heldIds = new Set(held.map(x => x.id));
const todo = changed.filter(x => !heldIds.has(x.id));
console.log(`${routes.length} routes read; ${series.size} areas run a letter series; ${todo.length} to rename; ${held.length} held (the number tells same-named climbs apart)`);
if (HELD) { for (const x of held) console.log(`  ${x.area_id}  "${x.from}"  (${x.grade || ""})`); process.exit(0); }
for (const x of todo.filter((_, i) => i % Math.ceil(todo.length / 30) === 0)) console.log(`  ${x.from}  ->  ${x.to}`);
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }
const rollbackFile = path.join(ROOT, `scripts/rollback-route-topo-labels-${Date.now()}.json`);
fs.writeFileSync(rollbackFile, JSON.stringify(todo.map(({ id, from }) => ({ id, name: from })), null, 1));
console.log("rollback:", path.relative(ROOT, rollbackFile));
const failed = [];
let done = 0;
for (const x of todo) {
  // Guarded by the OLD name too, so a row renamed by someone else meanwhile is left alone.
  try { await patchRow("routes", x.id, { name: x.to }, { filter: `name=eq.${encodeURIComponent(x.from)}` }); done++; }
  catch (e) { failed.push({ ...x, error: e.message.slice(0, 300) }); }
  if ((done + failed.length) % 100 === 0) console.log(`  ${done + failed.length}/${todo.length}`);
}
console.log(`patched ${done}, failed ${failed.length}`);
for (const f of failed) console.log(`  FAILED ${f.id} "${f.from}" -> "${f.to}": ${f.error}`);
// A 200 is not evidence the data changed: re-read and reconcile.
const now = new Map((await selectAll("routes", "id,name", "", { pageSize: 1000, key: KEY })).map(r => [r.id, r.name]));
const wrong = todo.filter(x => !failed.some(f => f.id === x.id) && now.get(x.id) !== x.to);
console.log(`re-read: ${todo.length - failed.length - wrong.length} of ${todo.length - failed.length} patched rows carry the new name`);
for (const w of wrong) console.log(`  MISMATCH ${w.id}: expected "${w.to}", found "${now.get(w.id)}"`);
if (failed.length) fs.writeFileSync(path.join(ROOT, "scripts/data/route-topo-labels-refused.json"), JSON.stringify(failed, null, 1));
process.exit(wrong.length ? 1 : 0);
