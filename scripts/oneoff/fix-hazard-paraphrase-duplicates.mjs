// Remove KNOWN HAZARDS lines that a line beside them already says in full.
//
// The decisions come from reading every candidate pair measure-hazard-paraphrase-pairs.mjs lists
// (audits/2026-09-30-hazard-paraphrase-decisions.json). Only verdict "same" is acted on: the
// dropped line states nothing the kept line does not. Nothing is written or reworded — a line is
// only ever REMOVED from the column it came from, so every fact on screen afterwards was there
// before.
//
// Refuses a route unless ALL of these hold, checked against the live row at write time:
//   - the dropped line is still in the row, verbatim, at the column it was read from;
//   - its kept partner still prints, and is not itself being dropped;
//   - the box (knownHazards, what RouteDetail renders) loses exactly the dropped lines, nothing
//     else, in the same order;
//   - routeTerrain and routeTags, which read these columns as evidence, are byte-identical before
//     and after — so no glacier/avalanche advice or tag moves;
//   - no column is emptied (other readers test hazards for non-emptiness), and no string-shaped
//     watch_out is edited (rewriting its separators is a reshape, not a removal).
//
//   node scripts/oneoff/fix-hazard-paraphrase-duplicates.mjs            # dry run: prints the plan
//   node scripts/oneoff/fix-hazard-paraphrase-duplicates.mjs --apply    # writes, then re-reads
import { readFileSync, writeFileSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { knownHazards, toWarnArr } from "../../lib/hazards.js";
import { routeTerrain } from "../../lib/terrain.js";
import { routeTags } from "../../lib/routeTags.js";

const APPLY = process.argv.includes("--apply");
const DECISIONS = new URL("../../audits/2026-09-30-hazard-paraphrase-decisions.json", import.meta.url);
const key = requireServiceKey();
const decisions = JSON.parse(readFileSync(DECISIONS, "utf8")).filter(d => d.verdict === "same");

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
const box = r => { const k = knownHazards(Array.isArray(r.hazards) ? r.hazards : [], Array.isArray(r.obj_haz) ? r.obj_haz : [], toWarnArr(r.watch_out)); return [...k.hazards, ...k.watchOut]; };
const terrainOf = r => JSON.stringify(routeTerrain(r));
const tagsOf = r => JSON.stringify(routeTags(r).map(t => t.slug));

const plan = [], refused = [], rollback = [];
for (const [id, ds] of byRoute) {
  const row = await readRow(id);
  const why = msg => refused.push({ id, why: msg });
  const before = box(row);
  const drops = new Set(ds.map(d => d.dropText));
  // A kept line may itself be dropped in favour of a third ("0 ⊂ 3", "3 ⊂ 4"): containment is
  // transitive, so follow each chain to the line that finally prints. A cycle has no such line.
  const keepOf = new Map(ds.map(d => [d.dropText, d.keepText]));
  const finalKeep = t => { const seen = new Set(); while (drops.has(t)) { if (seen.has(t)) return null; seen.add(t); t = keepOf.get(t); } return t; };
  const keeps = new Set([...drops].map(finalKeep));
  if (keeps.has(null)) { why("drops form a cycle — no line would survive to say it"); continue; }
  if ([...drops].some(t => !before.includes(t))) { why("a dropped line no longer prints"); continue; }
  if ([...keeps].some(t => !before.includes(t))) { why("a kept line no longer prints"); continue; }

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

console.log(`decisions acted on: ${decisions.length} drops across ${byRoute.size} routes`);
console.log(`planned: ${plan.length} routes, ${plan.reduce((s, p) => s + p.dropped.length, 0)} lines; refused: ${refused.length}`);
for (const r of refused) console.log(`  REFUSED ${r.id}: ${r.why}`);
if (!APPLY) { for (const p of plan.slice(0, 10)) console.log(`  ${p.id}: drop ${p.dropped.map(t => JSON.stringify(t)).join(" | ")}`); console.log("\ndry run — pass --apply to write"); process.exit(refused.length ? 2 : 0); }

const rbPath = new URL(`../rollback-hazard-paraphrase-${Date.now()}.json`, import.meta.url);
writeFileSync(rbPath, JSON.stringify(rollback, null, 1));
console.log("rollback written:", rbPath.pathname);
let ok = 0;
const failed = [];
for (const p of plan) {
  await patchRow("routes", p.id, p.changed);
  const now = box(await readRow(p.id));
  if (JSON.stringify(now) === JSON.stringify(p.expected)) ok++; else failed.push(p.id);
}
console.log(`written and re-read: ${ok}/${plan.length} match the expected box`);
if (failed.length) { console.log("MISMATCH after write:", failed.join(", ")); process.exit(1); }
