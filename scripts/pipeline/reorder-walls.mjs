// reorder-walls.mjs — set a wall's whole left-to-right order (routes.sort_order = 1..n) from a READ plan.
//
// For the walls audit:next-door found out of step with Mountain Project's CURRENT page: a climb MP places that we
// left unplaced (GAP), or MP re-ordered the wall after our run. The plan lists, per area, every climb that should
// carry a position, left to right; this script refuses unless that list is exactly the area's placed climbs plus
// the named additions, so it can never drop a position by accident. Boulder problems sharing the area keep their
// relative order (they are in the list where they were).
//
//   node scripts/pipeline/reorder-walls.mjs --plan walls.json [--apply]
//   walls.json: [{ area, order: [route ids, left to right], add: [ids that had no position] , why }]
import { readFileSync, writeFileSync } from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
const arg = k => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const APPLY = process.argv.includes("--apply"), plan = JSON.parse(readFileSync(arg("plan"), "utf8"));
const k = requireServiceKey(), sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async p => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(k) }); const j = await r.json(); if (!Array.isArray(j)) throw new Error(JSON.stringify(j)); return j; };
const saved = [];
for (const w of plan) {
  const rows = await get(`routes?select=id,name,sort_order&area_id=eq.${encodeURIComponent(w.area)}`);
  saved.push(...rows.map(r => ({ ...r, area_id: w.area })));
  const placed = new Set(rows.filter(r => r.sort_order != null).map(r => r.id)), have = new Set(rows.map(r => r.id));
  const want = new Set(w.order), adds = new Set(w.add || []);
  const missing = [...placed].filter(id => !want.has(id)), stray = w.order.filter(id => !have.has(id)), unexpected = w.order.filter(id => !placed.has(id) && !adds.has(id));
  if (missing.length || stray.length || unexpected.length || want.size !== w.order.length) throw new Error(`${w.area}: plan does not match the wall — missing ${missing}, not in area ${stray}, unplaced and not named ${unexpected}`);
  const cur = new Map(rows.map(r => [r.id, r.sort_order]));
  const writes = w.order.map((id, i) => [id, i + 1]).filter(([id, n]) => cur.get(id) !== n);
  console.log(`${w.area}: ${w.order.length} placed, ${writes.length} positions change${APPLY ? "" : " (dry run)"} — ${w.why}`);
  if (!APPLY) continue;
  writeFileSync(`scripts/rollback-reorder-walls-${w.area}-${Date.now()}.json`, JSON.stringify(rows, null, 1));
  for (const [id, n] of writes) { await patchRow("routes", id, { sort_order: n }); await sleep(1100); }
  const back = await get(`routes?select=id,sort_order&area_id=eq.${encodeURIComponent(w.area)}`);
  const bad = w.order.filter((id, i) => back.find(r => r.id === id)?.sort_order !== i + 1);
  console.log(bad.length ? "  RECONCILE FAILED " + bad.join(",") : "  read back: as planned");
  if (bad.length) process.exit(1);
}
