// Clear `elev_pts` on two routes whose stored values are not elevations, so the profile under the route
// map stops printing them. Found by a census of every route that stores elev_pts (2026-11-23, 448 rows):
//
//   wa_sherman_peak_baker_squak_glacier   2,062 values, every one between 3 and 10, on a 10,133 ft peak.
//                                         The profile read "Gain 0 ft · Loss 0 ft", 3 ft to 3 ft.
//   wa_mount_logan_r1                     3,000 values, 1,148 of them 0: the recording carried no
//                                         elevation for those stretches, and the profile dropped to sea level.
//
// The track (`gpx`) is untouched: the line on the map is still the recording. Only the profile goes, and a
// route with no elev_pts shows the map alone. Each row is re-checked before it is written, so a row somebody
// has since repaired is left as it is.
//
//   node scripts/oneoff/clear-bad-track-elevations.mjs            # dry run
//   node scripts/oneoff/clear-bad-track-elevations.mjs --write    # rollback file, patch, re-read
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const TARGETS = {
  wa_sherman_peak_baker_squak_glacier: e => Math.max(...e) < 100,                       // nothing above 100 ft
  wa_mount_logan_r1: e => e.filter(v => v === 0).length > e.length / 4,                 // over a quarter zeros
};
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const ids = Object.keys(TARGETS);
const rows = await get(`routes?select=id,name,elev_pts&id=in.(${ids.join(",")})`);
const plan = [];
for (const id of ids) {
  const r = rows.find(x => x.id === id);
  if (!r) { console.log(`${id}: NOT FOUND, skipped`); continue; }
  const e = r.elev_pts;
  if (!Array.isArray(e) || !e.length) { console.log(`${id}: no elev_pts now, skipped`); continue; }
  if (!TARGETS[id](e)) { console.log(`${id}: the values no longer look wrong (min ${Math.min(...e)}, max ${Math.max(...e)}), skipped`); continue; }
  console.log(`${id} (${r.name}): ${e.length} values, min ${Math.min(...e)}, max ${Math.max(...e)}, zeros ${e.filter(v => v === 0).length} -> clear`);
  plan.push({ id, before: { elev_pts: e } });
}
if (!WRITE) { console.log(`\ndry run: ${plan.length} row(s) would be cleared. --write to apply.`); process.exit(0); }
const rb = new URL("./rollback-clear-bad-track-elevations.json", import.meta.url);
fs.writeFileSync(rb, JSON.stringify({ note: "elev_pts before clear-bad-track-elevations.mjs; restore with patchRow('routes', id, before)", at: new Date().toISOString(), rows: plan }));
for (const p of plan) await patchRow("routes", p.id, { elev_pts: null });
const back = await get(`routes?select=id,elev_pts&id=in.(${ids.join(",")})`);
let bad = 0;
for (const p of plan) { const b = back.find(x => x.id === p.id); if (!b || b.elev_pts !== null) { bad++; console.log(`  NOT CLEARED: ${p.id}`); } }
console.log(`\n${plan.length - bad} of ${plan.length} cleared and re-read as null. Rollback: scripts/oneoff/rollback-clear-bad-track-elevations.json`);
process.exit(bad ? 1 : 0);
