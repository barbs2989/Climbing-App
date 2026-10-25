#!/usr/bin/env node
// One-off: write per-approach `hazards` / `objHaz` onto each switchable approach_variants entry.
//
// Input: the batch outputs written by the research agents, one JSON file per batch, shaped
//   { "<routeId>": { "<variantIndex>": { hazards: [...], objHaz: [...], basis, unsure } } }
// (a route with no switchable variant is recorded as a string and skipped).
//
// Safety:
//   - default is a DRY RUN: it fetches each row, merges in memory, validates, and prints the plan.
//     Nothing is written until `--apply`.
//   - the row is re-read immediately before each write, so a concurrent edit is merged onto, not clobbered.
//   - the pre-write approach_variants of every route is saved to a rollback file first.
//   - writes are paced at least 1000 ms apart (owner's rule for production writes); on any error
//     the run STOPS — it never retries fast into a struggling database.
//   - after the writes, every row is re-read and compared with the intended value.
//   - hazard text naming a source is refused (no sources in the app).
//
// Usage:
//   node scripts/oneoff/apply-approach-hazards.mjs <dir-with-out-batch-files>            (dry run)
//   node scripts/oneoff/apply-approach-hazards.mjs <dir-with-out-batch-files> --apply

import fs from "fs";
import path from "path";
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const dir = process.argv[2];
const apply = process.argv.includes("--apply");
if (!dir) { console.error("usage: apply-approach-hazards.mjs <dir> [--apply]"); process.exit(2); }

const SOURCE_RE = /mountain project|guidebook|according to|\bsources?\b (say|says|state|list)|\bper (the|a|mp|a guide)\b|summitpost|thecrag|openbeta/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. merge every batch file into one plan: routeId -> { index -> entry }
const plan = {};
const problems = [];
for (const f of fs.readdirSync(dir).filter((n) => /^out-batch-\d+\.json$/.test(n)).sort()) {
  const batch = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const [id, byIdx] of Object.entries(batch)) {
    if (typeof byIdx === "string") { problems.push(`${id}: ${byIdx}`); continue; }
    for (const [idx, e] of Object.entries(byIdx)) {
      const bad = [];
      if (!e || !Array.isArray(e.hazards) || !e.hazards.length) bad.push("no hazards");
      else for (const h of e.hazards) {
        if (typeof h !== "string" || h.length > 140) bad.push("hazard over 140 chars or not text");
        else if (SOURCE_RE.test(h)) bad.push("names a source: " + h.slice(0, 60));
      }
      if (e && Array.isArray(e.objHaz) && e.objHaz.some((x) => typeof x !== "string")) bad.push("objHaz not text");
      if (bad.length) { problems.push(`${id}[${idx}]: ${bad.join("; ")}`); continue; }
      (plan[id] ||= {})[idx] = e;
    }
  }
}
const ids = Object.keys(plan);
console.log(`plan: ${ids.length} routes, ${ids.reduce((n, id) => n + Object.keys(plan[id]).length, 0)} variants; refused: ${problems.length}`);
for (const p of problems) console.log("  refused " + p);

// 2. read each row, merge in memory
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,approach_variants`, { headers: headers(anonKey()) });
  if (!r.ok) throw new Error(`read ${id} -> ${r.status}`);
  const j = await r.json();
  if (!j.length) throw new Error(`read ${id} -> no row`);
  return j[0].approach_variants;
};
const merged = {};
const before = {};
for (const id of ids) {
  const cur = await get(id);
  if (!Array.isArray(cur)) { problems.push(`${id}: no approach_variants`); continue; }
  before[id] = cur;
  const next = cur.map((v, i) => {
    const e = plan[id][String(i)];
    if (!e) return v;
    return { ...v, hazards: e.hazards, objHaz: Array.isArray(e.objHaz) ? e.objHaz : [] };
  });
  merged[id] = next;
}
const unsure = ids.flatMap((id) => Object.entries(plan[id]).filter(([, e]) => e.unsure).map(([i]) => `${id}[${i}]`));
console.log(`merged: ${Object.keys(merged).length} rows; unsure entries (written, owner should look): ${unsure.length}`);

if (!apply) { console.log("DRY RUN — nothing written. Re-run with --apply."); process.exit(0); }

// 3. rollback snapshot first
const rb = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", `rollback-approach-hazards-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify(before, null, 1));
console.log("rollback saved: " + rb);

// 4. paced writes; stop on the first error
let written = 0;
for (const id of Object.keys(merged)) {
  const fresh = await get(id);
  const again = fresh.map((v, i) => { const e = plan[id][String(i)]; return e ? { ...v, hazards: e.hazards, objHaz: Array.isArray(e.objHaz) ? e.objHaz : [] } : v; });
  try {
    await patchRow("routes", id, { approach_variants: again });
  } catch (err) {
    console.error(`STOPPED at ${id}: ${err.message}. ${written} written. Rollback: ${rb}`);
    process.exit(1);
  }
  written++;
  await sleep(1000);
}
console.log(`wrote ${written} rows; reconciling`);

// 5. reconcile: re-read and compare with the intended value
let bad = 0;
for (const id of Object.keys(merged)) {
  const got = await get(id);
  const ok = ids && plan[id] && Object.entries(plan[id]).every(([i, e]) => JSON.stringify(got[Number(i)].hazards) === JSON.stringify(e.hazards));
  if (!ok) { bad++; console.log("MISMATCH " + id); }
  await sleep(250);
}
console.log(bad ? `${bad} rows did not reconcile — see above` : "all rows reconcile");
