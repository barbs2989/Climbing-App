// Rimrock Ridge was applied from a zone file that its own research then CORRECTED, because the
// batch was built and written before that agent finished revising. The stored value therefore
// names two camps that should not be offered to anyone:
//
//   * Flat Creek Camp — CLOSED (hazard trees on its access trail), absent from the park's
//     current camp table and booking inventory. It was the headline site.
//   * Dolly Varden Camp — defunct; third-party listings only, in neither park source.
//
// The corrected file also records that NO permit can be obtained in Stehekin at all — the
// visitor centre at the landing is closed — so the original file sent people to a desk that
// does not exist. That is the kind of error worth a targeted repair rather than waiting for
// the next batch, and `make-camping-batch-from-zones.mjs` cannot do it: it SKIPS any route
// that already has bivy, which is exactly this one.
//
// Assert-then-replace: it refuses unless the stored value is the known-bad list, so it cannot
// touch a corrected row, a different route, or any climber contribution.
//
// --dry prints and writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
import fs from "fs";

const DRY = process.argv.includes("--dry");
const AREA = "wa_rimrock_ridge";
const STALE = ["Dolly Varden Camp, upper Stehekin valley road", "Flat Creek Camp, at the trailhead"];

const zone = JSON.parse(fs.readFileSync("enrichment-wip/camping-zones/rimrock-ridge.json", "utf8"));
if (!Array.isArray(zone.sites) || !zone.sites.length) { console.log("FAIL: zone file has no sites"); process.exit(1); }
const fresh = zone.sites;
const freshNames = fresh.map(s => s.name);
for (const bad of STALE) if (freshNames.includes(bad)) { console.log(`FAIL: the corrected file still lists ${JSON.stringify(bad)} — nothing to repair`); process.exit(1); }

requireServiceKey();
const rows = await selectAll("routes", "id,name,bivy", `area_id=eq.${AREA}`, { pageSize: 20 });
if (!rows.length) { console.log(`FAIL: no routes on ${AREA} — refusing to conclude anything`); process.exit(1); }

let changed = 0;
for (const r of rows) {
  const names = (Array.isArray(r.bivy) ? r.bivy : []).map(s => s && s.name);
  const isStale = STALE.every(b => names.includes(b));
  if (!isStale) { console.log(`  SKIP ${r.id} — stored value is not the known-bad list: ${names.join(" | ") || "(none)"}`); continue; }
  console.log(`${DRY ? "would replace" : "replacing"} ${r.id}`);
  console.log(`   was: ${names.join(" | ")}`);
  console.log(`   now: ${freshNames.join(" | ")}`);
  if (!DRY) await patchRow("routes", r.id, { bivy: fresh });
  changed++;
}
if (!changed) { console.log("nothing matched the known-bad list"); process.exit(0); }
if (DRY) process.exit(0);

const after = await selectAll("routes", "id,bivy", `area_id=eq.${AREA}`, { pageSize: 20 });
const left = after.filter(r => (r.bivy || []).some(s => s && STALE.includes(s.name)));
console.log(left.length ? `FAIL: ${left.length} row(s) still name a closed or defunct camp` : "verified — no row offers the closed or defunct camps any more");
process.exit(left.length ? 1 : 0);
