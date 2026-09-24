// Delete ONE fabricated route: Bonanza Peak "West Ridge Approach" (wa_bonanza_peak_west_ridge).
// The owner approved this deletion explicitly on 2026-09-24 ("if you recommend it then do it").
//
// Found by the walk-up audit (rounds 1-4, #1849-#1858), where three independent online passes
// could find no route of that name — Bonanza's documented lines are the Mary Green Glacier,
// North Ridge, NE Buttress and the technical faces, all glacier plus Class 4 or harder. The row is
// `auto_generated`, has no route steps, and its overview is filler ("better views of the surrounding
// mountains ... popular for parties seeking less crowded access") claiming Class 2-3 scrambling on a
// peak where no Class 2-3 line exists.
//
// Deliberately NOT deleted: Little Sister "Twin Sisters Olivine Scramble". That NAME is a generic
// enrichment label reused on four Twin Sisters peaks, but the row describes a real line (the west
// ridge from the Green Creek cirque) and is the peak's only scramble — a bad name, not an invented route.
//
// Safety: the full row is written to scripts/rollback-*.json FIRST (restore = POST it back). The
// delete refuses unless the row still has the name, area and auto_generated flag recorded here, and
// unless no other table references it (measured 0 across all 44 tables on 2026-09-24; the FK tables
// cascade, so a reference would be DESTROYED with it, not orphaned). It must delete exactly one row.
// --dry reads and checks everything, writes nothing.
import fs from "fs";
import { requireServiceKey, selectAll, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const ID = "wa_bonanza_peak_west_ridge";
const EXPECT = { name: "West Ridge Approach", area_id: "wa_bonanza_peak", auto_generated: true };
const REFS = ["climb_logs", "content_reports", "contributions", "crews", "gps_submissions", "hazard_votes", "objectives", "route_base_checkins", "topo_lines"];

const key = requireServiceKey();
const fail = m => { console.log(`FAIL: ${m}`); process.exit(1); };
const count = async (q) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key, { Prefer: "count=exact" }) });
  if (!r.ok) fail(`GET ${q} -> ${r.status}`);
  return +(r.headers.get("content-range") || "*/0").split("/")[1];
};

const rows = await selectAll("routes", "*", `id=eq.${ID}`, { key, pageSize: 5 });
if (!rows.length) { console.log(`already gone: ${ID}`); process.exit(0); }
const row = rows[0];
for (const [k, v] of Object.entries(EXPECT)) if (row[k] !== v) fail(`${ID}.${k} is ${JSON.stringify(row[k])}, not ${JSON.stringify(v)} — not the row this was written against`);

let refs = 0;
for (const t of REFS) { const n = await count(`${t}?select=route_id&route_id=eq.${ID}`); if (n) console.log(`  ${t}: ${n}`); refs += n; }
refs += await count(`user_lists?select=id&route_ids=cs.%7B${ID}%7D`);
if (refs) fail(`${refs} reference(s) to ${ID} — deleting would cascade or orphan them`);
console.log(`checked: name/area/auto_generated match; 0 references`);

const before = (await selectAll("areas", "id,route_count", `id=eq.${EXPECT.area_id}`, { key, pageSize: 5 }))[0].route_count;
if (DRY) { console.log(`would delete ${ID} "${row.name}" (area route_count ${before} -> ${before - 1})`); process.exit(0); }

const backup = `scripts/rollback-delete-${ID}-${Date.now()}.json`;
fs.writeFileSync(backup, JSON.stringify(row, null, 1));
console.log(`backed up full row -> ${backup}`);

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}`, { method: "DELETE", headers: headers(key, { Prefer: "return=representation" }) });
const gone = await res.json();
if (!res.ok || !Array.isArray(gone) || gone.length !== 1) fail(`DELETE -> ${res.status}, ${Array.isArray(gone) ? gone.length : "?"} rows (expected 1)`);

const still = await selectAll("routes", "id", `id=eq.${ID}`, { key, pageSize: 5 });
const after = (await selectAll("areas", "id,route_count", `id=eq.${EXPECT.area_id}`, { key, pageSize: 5 }))[0].route_count;
const real = await count(`routes?select=id&area_id=eq.${EXPECT.area_id}`);
console.log(`deleted: ${!still.length}; area route_count ${before} -> ${after}; routes actually on the area: ${real}`);
if (still.length) fail("row still present");
if (after !== real) console.log(`WARN: route_count ${after} disagrees with ${real} — run npm run check:counts`);
console.log("verified — row gone");
