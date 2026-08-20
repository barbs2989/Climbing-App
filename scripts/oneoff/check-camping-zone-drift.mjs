// Does the camping stored in the DB still match the zone file that produced it?
//
// The builder SKIPS any route that already has bivy, so once a zone is applied it can never
// update it. That is the right default — it protects a climber's correction — but it means a
// zone file REVISED AFTER its batch was applied leaves the DB holding the superseded version,
// silently and forever.
//
// That is not hypothetical. Rimrock Ridge was applied and its research then corrected: the
// stored value named Flat Creek Camp (CLOSED) and Dolly Varden Camp (defunct), and told people
// to collect a permit at a Stehekin visitor centre that does not exist. Nothing would have
// reported it.
//
// Reports drift by SITE NAME only. It deliberately does not compare prose: once `bivy` is
// contributable a climber may legitimately have edited the notes on a site, and flagging that
// would train people to ignore this. A name appearing or disappearing is the structural
// question.
//
// REPORT-ONLY, AND IT MUST STAY SO. Measured on the first real run: 32 routes reported, ONE of
// them real. The other 31 carry hand-authored PER-ROUTE camping that legitimately supersedes a
// generic zone list — Ptarmigan Ridge names Glacier Basin, Curtis Ridge and a high camp the
// route is built around, each labelled PLANNED or DESCENT; Mount Terror names the Chopping Block
// saddle. Acting on this script's output would have replaced better data with worse, which is
// the exact failure where a guard instructs an author to delete correct work.
//
// So it exits 0 and prints candidates. READ BOTH VALUES before touching a row: if the stored
// one is route-specific it is almost certainly the better record and the zone file is the thing
// that is behind.
//
// Read-only. Fails closed on an empty read.
import { selectAll } from "../lib/supabase-env.mjs";
import fs from "fs";
import path from "path";

const DIR = "enrichment-wip/camping-zones";
const DIS = ["alpine", "mountaineering", "scrambling"];

const areas = await selectAll("areas", "id,path", "", { pageSize: 1000 });
if (!areas.length) { console.log("FAIL: read no areas"); process.exit(1); }
const byId = new Map(areas.map(a => [a.id, a]));

const routes = await selectAll("routes", "id,area_id,discipline,bivy", "bivy=not.is.null", { pageSize: 1000 });
if (!routes.length) { console.log("FAIL: read no routes carrying bivy"); process.exit(1); }
const byArea = new Map();
for (const r of routes) {
  if (!DIS.includes(r.discipline)) continue;
  if (!byArea.has(r.area_id)) byArea.set(r.area_id, []);
  byArea.get(r.area_id).push(r);
}

const key = s => String((s && s.name) || "").trim().toLowerCase();
let drifted = 0, checked = 0, files = 0;

for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".json")).sort()) {
  const zone = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  if (!Array.isArray(zone.sites) || !Array.isArray(zone.areas)) continue;
  files++;
  const want = new Set(zone.sites.map(key));

  // Expand each declared area to its subtree, the same way the builder does.
  const ids = new Set();
  for (const a of zone.areas) {
    const row = byId.get(a);
    if (!row) continue;
    ids.add(a);
    for (const k of areas) if (String(k.path || "").startsWith(row.path + ".")) ids.add(k.id);
  }

  for (const id of ids) for (const r of byArea.get(id) || []) {
    checked++;
    const have = new Set((Array.isArray(r.bivy) ? r.bivy : []).map(key));
    const missing = [...want].filter(n => !have.has(n));
    const extra = [...have].filter(n => !want.has(n));
    if (!missing.length && !extra.length) continue;
    // A route legitimately carries only ONE zone's sites; if it shares nothing with this file
    // it belongs to another zone and this is not drift.
    if (![...have].some(n => want.has(n))) continue;
    drifted++;
    console.log(`DRIFT  ${r.id}  (${f})`);
    if (missing.length) console.log(`   file has, DB lacks:  ${missing.join(" | ")}`);
    if (extra.length) console.log(`   DB has, file lacks:  ${extra.join(" | ")}`);
  }
}

console.log(`\n${files} zone files, ${checked} route(s) checked`);
if (drifted) {
  console.log(`${drifted} candidate(s) where the stored camping differs from its zone file.`);
  console.log("NOT a defect list. Most are hand-authored per-route camping that is BETTER than the");
  console.log("generic zone list — read both values before changing anything. The one shape worth");
  console.log("repairing is a zone file CORRECTED after its batch was applied, which the builder");
  console.log("can never fix on its own because it skips any route that already has bivy.");
  process.exit(0);
}
console.log("ok — every applied route still matches the zone file that produced it");
