// Fills a crag's WALK-IN (areas.approach / approach_min, 0247) from the guidebook fill pass.
//
//   node scripts/oneoff/apply-crag-approach.mjs crag-fills.json          # dry run
//   node scripts/oneoff/apply-crag-approach.mjs crag-fills.json --apply  # write, with a rollback file
//
// crag-fills.json: [{ area_id, approach, approach_min }]. Fill-only: an area that already has an
// approach is left alone, never overwritten. The walk-in is the walk from the trail to the base;
// roads, parking, permits and closures are not written here (the collector refuses them).
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const items = JSON.parse(fs.readFileSync(file, "utf8"));
const rbFile = `scripts/rollback-crag-approach-${Date.now()}.json`;
const rollback = [];
let ok = 0, skipped = 0, refused = 0;
for (const it of items) {
  const url = `${SUPABASE_URL}/rest/v1/areas?id=eq.${encodeURIComponent(it.area_id)}&select=id,approach,approach_min`;
  const rows = await (await fetch(url, { headers: headers(key) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`REFUSED ${it.area_id}: not exactly one row`); refused++; continue; }
  const row = rows[0];
  if (row.approach) { console.log(`SKIP ${it.area_id}: already has a walk-in`); skipped++; continue; }
  const body = { approach: it.approach };
  if (it.approach_min != null) body.approach_min = it.approach_min;
  console.log(`${it.area_id}: ${JSON.stringify(body)}`);
  if (APPLY) {
    rollback.push({ id: it.area_id, before: { approach: row.approach, approach_min: row.approach_min } });
    fs.writeFileSync(rbFile, JSON.stringify(rollback, null, 1));
    try { await patchRow("areas", it.area_id, body, { filter: "select=id" }); }
    catch (e) { rollback.pop(); fs.writeFileSync(rbFile, JSON.stringify(rollback, null, 1)); console.log(`REFUSED ${it.area_id}: ${String(e).slice(0, 160)}`); refused++; continue; }
    const back = (await (await fetch(url, { headers: headers(key) })).json())[0];
    if (back.approach !== body.approach) throw new Error(`${it.area_id}: re-read does not match`);
  }
  ok++;
}
if (APPLY && rollback.length) console.log(`\nrollback: ${rbFile}`);
console.log(`\n${APPLY ? "WRITTEN and re-read" : "DRY RUN"}: ${ok} areas ok, ${skipped} skipped, ${refused} refused`);
if (refused) process.exitCode = 1;
