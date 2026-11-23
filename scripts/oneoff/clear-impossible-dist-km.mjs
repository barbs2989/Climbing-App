// Clear dist_km on 12 WA routes whose stored one-way distance is shorter than the straight line from the
// route's own trailhead pin to its summit pin (impossible), and for which the 2026-11-23 research batch found no
// published trailhead-to-summit figure that agrees (research-data/route-ledger-2026-11-23/, PR #3766).
// Owner's go-ahead 2026-11-23 ("clear them"); null beats a figure known to be wrong.
// Not touched: Mount Fernow (corrected to 12.2), Big Four Spindrift Couloir (1.6 km matches the walk to the
// couloir). Mount Adams North Ridge was added on a second run the same day (owner: "go"); a re-run skips
// every row already cleared, so give each run its own --rollback folder or the earlier file is overwritten.
//
//   node scripts/oneoff/clear-impossible-dist-km.mjs                          # dry run
//   node scripts/oneoff/clear-impossible-dist-km.mjs --write --rollback DIR
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const RB = process.argv.includes("--rollback") ? process.argv[process.argv.indexOf("--rollback") + 1] : null;
if (WRITE && !RB) { console.error("--write needs --rollback DIR"); process.exit(2); }
// id -> [area_id, stored dist_km, straight line km]
const T = {
  wa_ridge_traverse_from_east_fury: ["wa_mount_fury_west", 0.5, 20.5],
  wa_forbidden_peak_east_ledges: ["wa_forbidden_peak", 0.8, 3.8],
  wa_austera_peak_southwest_ridge: ["wa_austera_peak", 4.5, 8.6],
  wa_castle_peak_pasayten_scramble: ["wa_castle_peak_pasayten", 17.7, 31.9],
  wa_the_devils_club: ["wa_southeast_mox_peak", 16.1, 28.2],
  wa_sherman_peak_baker_route: ["wa_sherman_peak_baker", 3.9, 6.7],
  wa_castle_peak_pasayten_south_route: ["wa_castle_peak_pasayten", 21.8, 32.2],
  wa_jack_mountain_northeast_glacier: ["wa_jack_mountain", 5.6, 7.9],
  adams_northwest_ridge: ["wa_mount_adams", 8, 10.7],
  wa_castle_in_the_sky: ["wa_whatcom_peak", 13.7, 17],
  wa_glacier_peak_kennedy_glacier: ["wa_glacier_peak", 12.4, 14.2],
  wa_storm_king_southwest_scramble: ["wa_storm_king", 21.7, 24.9],
  // Added the same day (owner: "go"): disputed in the ledger, published 16.1 km vs the track's 13.5 km.
  wa_mount_adams_north_ridge: ["wa_mount_adams", 5.6, 10.7],
};
const ids = Object.keys(T);
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k), signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const rows = await get(`routes?select=id,name,area_id,dist_km&id=in.(${ids.join(",")})`);
const locks = await get(`route_field_evidence?select=route_id,level&field=eq.dist_km&route_id=in.(${ids.join(",")})`);
const plan = [];
for (const id of ids) {
  const r = rows.find(x => x.id === id), [area, from] = T[id];
  if (!r) { console.log(`${id}: NOT FOUND, skipped`); continue; }
  if (r.area_id !== area) { console.log(`${id}: filed under ${r.area_id}, not ${area}, skipped`); continue; }
  if (locks.some(l => l.route_id === id && /locked/.test(l.level))) { console.log(`${id}: dist_km is locked in the ledger, skipped`); continue; }
  if (r.dist_km !== from) { console.log(`${id}: dist_km is ${r.dist_km} now, not ${from}, skipped`); continue; }
  console.log(`${id} (${r.name}): dist_km ${from} -> null (straight line ${T[id][2]} km)`);
  plan.push({ id, before: { dist_km: from } });
}
if (!WRITE) { console.log(`\ndry run: ${plan.length} row(s) would be cleared. --write --rollback DIR to apply.`); process.exit(0); }
fs.mkdirSync(RB, { recursive: true });
const rbFile = path.join(RB, "rollback-clear-impossible-dist-km.json");
fs.writeFileSync(rbFile, JSON.stringify({ note: "dist_km before clear-impossible-dist-km.mjs; restore with patchRow('routes', id, before)", at: new Date().toISOString(), rows: plan }));
for (const p of plan) { await patchRow("routes", p.id, { dist_km: null }); await new Promise(r => setTimeout(r, 500)); }
const back = await get(`routes?select=id,dist_km&id=in.(${plan.map(p => p.id).join(",")})`);
let bad = 0; for (const p of plan) { const b = back.find(x => x.id === p.id); if (!b || b.dist_km !== null) { bad++; console.log(`  NOT CLEARED: ${p.id}`); } }
console.log(`\n${plan.length - bad} of ${plan.length} cleared and re-read as null. Rollback: ${rbFile}`);
process.exit(bad ? 1 : 0);
