// Remove KNOWN HAZARDS lines that are pure logistics — road condition, closure, permit, parking,
// shuttle — when the same route ALREADY states that fact in the field built for it.
//
// The census is measure-logistics-in-hazard-box.mjs (2,651 printed lines with logistics vocabulary);
// every line of the 651 outside the seven crag-level shared blobs was read, and the decisions are in
// audits/2026-10-01-hazard-logistics-decisions.json. Only action "remove" is acted on, and each one
// names the field and quotes the text that says it. Remoteness, no cell coverage, long or committing
// days, sparse beta, and a gate or washout that ADDS DISTANCE are hazards and stay. Nothing is moved
// and nothing is written: a line is only ever REMOVED, so every fact on screen afterwards was there
// before — on the Plan tab's road block or the Access panel instead of twice.
//
// Refuses a route unless ALL of these hold, checked against the live row at write time:
//   - the quote is still in the named field, verbatim, and that field is one that renders
//     (road.driveNote/status/seasonalGate, permit, access.closures/rules/permit/notes, approach,
//     descent_text);
//   - the box (knownHazards, what RouteDetail renders) loses exactly the dropped lines, in order;
//   - routeTerrain and routeTags are byte-identical before and after (raptorClosure reads closure
//     clauses out of these columns);
//   - no column is emptied, and no string-shaped watch_out is edited.
//
//   node scripts/oneoff/fix-hazard-logistics-lines.mjs            # dry run: prints the plan
//   node scripts/oneoff/fix-hazard-logistics-lines.mjs --apply    # writes, then re-reads
import { readFileSync, writeFileSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { knownHazards, toWarnArr } from "../../lib/hazards.js";
import { routeTerrain } from "../../lib/terrain.js";
import { routeTags } from "../../lib/routeTags.js";

const APPLY = process.argv.includes("--apply");
const DECISIONS = new URL("../../audits/2026-10-01-hazard-logistics-decisions.json", import.meta.url);
const ROLLBACK = new URL("../../audits/2026-10-01-hazard-logistics-rollback.json", import.meta.url);
const RENDERS = new Set(["road.driveNote", "road.status", "road.seasonalGate", "permit", "access.closures", "access.rules", "access.permit", "access.notes", "approach", "descent_text"]);
const key = requireServiceKey();
const decisions = JSON.parse(readFileSync(DECISIONS, "utf8")).filter(d => d.action === "remove");

const byRoute = new Map();
for (const d of decisions) {
  if (!byRoute.has(d.id)) byRoute.set(d.id, []);
  byRoute.get(d.id).push(d);
}

async function readRow(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  if (!res.ok) throw new Error(`GET ${id} -> ${res.status}`);
  const j = await res.json();
  if (j.length !== 1) throw new Error(`GET ${id} -> ${j.length} rows`);
  return j[0];
}
const fieldText = (row, path) => { const v = path.split(".").reduce((a, k) => a == null ? a : a[k], row); return typeof v === "string" ? v : v == null ? "" : JSON.stringify(v); };
const box = r => { const k = knownHazards(Array.isArray(r.hazards) ? r.hazards : [], Array.isArray(r.obj_haz) ? r.obj_haz : [], toWarnArr(r.watch_out)); return [...k.hazards, ...k.watchOut]; };
const terrainOf = r => JSON.stringify(routeTerrain(r));
const tagsOf = r => JSON.stringify(routeTags(r).map(t => t.slug));

const plan = [], refused = [], rollback = [];
for (const [id, ds] of byRoute) {
  const row = await readRow(id);
  const why = msg => refused.push({ id, why: msg });
  const before = box(row);
  const unbacked = ds.find(d => !RENDERS.has(d.field) || !d.quote || !fieldText(row, d.field).includes(d.quote));
  if (unbacked) { why(`quote no longer in ${unbacked.field}`); continue; }
  const drops = new Set(ds.map(d => d.text));
  if ([...drops].some(t => !before.includes(t))) { why("a dropped line no longer prints"); continue; }

  const next = { ...row };
  const changed = {};
  let bad = null;
  for (const t of drops) {
    let hit = false;
    for (const col of ["hazards", "obj_haz", "watch_out"]) {
      const v = next[col];
      if (typeof v === "string" && col === "watch_out" && toWarnArr(v).some(x => String(x).trim() === t)) { bad = "dropped line is inside a string-shaped watch_out"; break; }
      if (!Array.isArray(v)) continue;
      const kept = v.filter(x => String(x).trim() !== t);
      if (kept.length === v.length) continue;
      if (!kept.length) { bad = `would empty ${col}`; break; }
      next[col] = kept; changed[col] = kept; hit = true;
    }
    if (bad) break;
    if (!hit) { bad = `dropped line not found in any array column: ${JSON.stringify(t)}`; break; }
  }
  if (bad) { why(bad); continue; }

  const after = box(next);
  const expected = before.filter(t => !drops.has(t));
  if (JSON.stringify(after) !== JSON.stringify(expected)) { why("the box would change by more than the dropped lines"); continue; }
  if (terrainOf(row) !== terrainOf(next)) { why("routeTerrain verdict would change"); continue; }
  if (tagsOf(row) !== tagsOf(next)) { why("routeTags would change"); continue; }

  plan.push({ id, changed, dropped: [...drops], expected });
  rollback.push({ id, before: Object.fromEntries(Object.keys(changed).map(c => [c, row[c]])) });
}

console.log(`decisions acted on: ${decisions.length} removes across ${byRoute.size} routes`);
console.log(`planned: ${plan.length} routes, ${plan.reduce((s, p) => s + p.dropped.length, 0)} lines; refused: ${refused.length}`);
for (const r of refused) console.log(`  REFUSED ${r.id}: ${r.why}`);
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

writeFileSync(ROLLBACK, JSON.stringify(rollback, null, 1));
console.log("rollback written:", ROLLBACK.pathname);
let ok = 0;
const failed = [];
for (const p of plan) {
  await patchRow("routes", p.id, p.changed);
  const now = box(await readRow(p.id));
  if (JSON.stringify(now) === JSON.stringify(p.expected)) ok++; else failed.push(p.id);
}
console.log(`written and re-read: ${ok}/${plan.length} match the expected box`);
if (failed.length) { console.log("MISMATCH after write:", failed.join(", ")); process.exit(1); }
