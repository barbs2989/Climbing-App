// Two auto-generated route rows describe routes that no source documents, and each duplicates a
// real route already filed on the same peak. Found by the walk-up audit (rounds 1-5,
// fix-walkup-*.mjs); deleting them was approved by the owner on 2026-09-24.
//
//   wa_bonanza_peak_west_ridge — "West Ridge Approach", a Class 2-3 line. No source documents any
//     West Ridge route on Bonanza; its standard route is the Mary Green Glacier + Class 4 rock,
//     already on the peak as "Mary Green Glacier (Standard Route)".
//   wa_little_sister_scramble — "Twin Sisters Olivine Scramble", Class 3. Little Sister has no
//     scramble route; its easiest line is the Southeast Ridge (5.3), already on the peak.
//
// Showing a climber a Class 2-3 way up a peak whose real routes need a glacier rope or 5th class
// is the harm, not the clutter.
//
// Every table with a routes foreign key cascades or nulls on delete, so the script re-proves before
// deleting that nothing references either row (contributions, topo_lines, gps_submissions,
// route_base_checkins, content_reports, climb_logs, objectives, crews, hazard_votes, and
// user_lists.route_ids), and refuses otherwise. Both rows are written in full to
// scripts/rollback-remove-invented-duplicate-routes.json first; to restore, POST them back to
// /rest/v1/routes with the service key.
//
// --dry writes nothing.
import fs from "node:fs";
import { requireServiceKey, selectAll, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const DELETE = [
  { id: "wa_bonanza_peak_west_ridge", area: "wa_bonanza_peak", keeps: "Mary Green Glacier (Standard Route)" },
  { id: "wa_little_sister_scramble", area: "wa_little_sister", keeps: "Southeast Ridge" },
];
const ids = DELETE.map(d => d.id);
const BACKUP = new URL("../rollback-remove-invented-duplicate-routes.json", import.meta.url);
const key = requireServiceKey();

const rows = await selectAll("routes", "*", `id=in.(${ids.join(",")})`, { key, pageSize: 10 });
if (!rows.length) { console.log("both rows already deleted"); process.exit(0); }
for (const r of rows) {
  const d = DELETE.find(x => x.id === r.id);
  if (r.area_id !== d.area) { console.log(`FAIL: ${r.id} is on ${r.area_id}, not ${d.area} — nothing deleted`); process.exit(1); }
  const sib = await selectAll("routes", "id,name", `area_id=eq.${d.area}`, { key, pageSize: 50 });
  if (!sib.some(s => s.name === d.keeps)) { console.log(`FAIL: ${d.area} no longer has "${d.keeps}" — nothing deleted`); process.exit(1); }
}
for (const t of ["contributions", "topo_lines", "gps_submissions", "route_base_checkins", "content_reports", "climb_logs", "objectives", "crews", "hazard_votes"]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=route_id&route_id=in.(${ids.join(",")})&limit=1`, { headers: headers(key) });
  const refs = await res.json();
  if (!res.ok || refs.length) { console.log(`FAIL: ${t} ${res.ok ? "references a row" : `could not be checked (${res.status})`} — nothing deleted`); process.exit(1); }
}
const lists = await (await fetch(`${SUPABASE_URL}/rest/v1/user_lists?select=route_ids`, { headers: headers(key) })).json();
if (!Array.isArray(lists) || lists.some(l => (l.route_ids || []).some(id => ids.includes(id)))) { console.log("FAIL: a user list holds a row, or lists could not be read — nothing deleted"); process.exit(1); }
console.log(`verified: ${rows.length} row(s) on the expected peaks, each peak keeps its real route, 0 references`);

if (DRY) { rows.forEach(r => console.log(`would delete ${r.id} "${r.name}"`)); process.exit(0); }
fs.writeFileSync(BACKUP, JSON.stringify(rows, null, 1) + "\n");
console.log(`backed up ${rows.length} row(s) to ${BACKUP.pathname}`);
let failed = 0;
for (const r of rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${r.id}`, { method: "DELETE", headers: headers(key, { Prefer: "return=representation" }) });
  const gone = await res.json();
  if (!res.ok || !Array.isArray(gone) || gone.length !== 1) { console.log(`FAIL: delete ${r.id} -> ${res.status} ${JSON.stringify(gone).slice(0, 150)}`); failed++; }
  else console.log(`deleted ${r.id} "${r.name}"`);
}
const left = await selectAll("routes", "id", `id=in.(${ids.join(",")})`, { key, pageSize: 10 });
if (left.length) { console.log(`FAIL: still present: ${left.map(r => r.id).join(", ")}`); failed++; }
console.log(failed ? `FAIL: ${failed} problem(s)` : "verified — both rows are gone");
process.exit(failed ? 1 : 0);
