// Clear the stored track (and its elevations) on seven routes whose recording is another, bigger outing:
// it goes over other catalogued peaks' summits, and on two of them never reaches the route's own.
// Owner's rule: one recording, one route, unless the route IS that traverse. Read one by one on
// 2026-11-23 (a peak counts as summited when the track passes within 150 m of it and 200 ft of its height):
//
//   wa_buck_mountain_south_ridge     36.3 km; summits Chiwawa and Fortress 7.5 km away; never within 212 m of Buck
//   wa_helmet_butte_standard_route   35.8 km on a 15.5 km route; also summits Chiwawa and Fortress
//   wa_dot_mountain_scramble         74.8 km on a 28.3 km route; also Ptarmigan Peak, Mount Lago, Mount Carru
//   wa_oval_peak_scramble            37.9 km on an 18.5 km route; summits Courtney and Star 3-4 km away
//   wa_sentinel_peak_standard        22.7 km one way; summits Le Conte and Old Guard; ends 634 ft below Sentinel
//   wa_hurry_up_peak_south_ridge     28 km one way; crosses Le Conte's summit 6 km away
//   wa_mount_formidable_south_face   40.7 km on a 16.1 km route
//
// Kept on the owner's word: Blackcap, Tailgunner, Castle Peak (Tatoosh), Tower Mountain, Northwest Mox, whose
// recordings take in a neighbouring peak but are about the route's own length.
//
// The route then shows its pins alone and the Add a track prompt. Each row is re-checked before it is
// written: still filed under the same peak, and still the same recording (its length within 2%).
//
//   node scripts/oneoff/clear-multi-peak-tracks.mjs                        # dry run
//   node scripts/oneoff/clear-multi-peak-tracks.mjs --write --rollback DIR # rollback file in DIR, patch, re-read
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { metresBetween, pointOf } from "../../lib/track.js";

const WRITE = process.argv.includes("--write");
const RB = process.argv.includes("--rollback") ? process.argv[process.argv.indexOf("--rollback") + 1] : null;
if (WRITE && !RB) { console.error("--write needs --rollback DIR (a folder outside git: the before-state holds whole tracks)"); process.exit(2); }
const TARGETS = {
  wa_buck_mountain_south_ridge: { area: "wa_buck_mountain", km: 36.3 },
  wa_helmet_butte_standard_route: { area: "wa_helmet_butte", km: 35.8 },
  wa_dot_mountain_scramble: { area: "wa_dot_mountain", km: 74.8 },
  wa_oval_peak_scramble: { area: "wa_oval_peak", km: 37.9 },
  wa_sentinel_peak_standard: { area: "wa_sentinel_peak", km: 22.7 },
  wa_hurry_up_peak_south_ridge: { area: "wa_hurry_up_peak", km: 28 },
  wa_mount_formidable_south_face: { area: "wa_mount_formidable", km: 40.7 },
};
const ids = Object.keys(TARGETS);
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k), signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const plan = [];
for (const id of ids) {
  await sleep(1000);
  const r = (await get(`routes?select=id,name,area_id,gpx,elev_pts&id=eq.${id}`))[0];
  if (!r) { console.log(`${id}: NOT FOUND, skipped`); continue; }
  if (r.area_id !== TARGETS[id].area) { console.log(`${id}: filed under ${r.area_id}, not ${TARGETS[id].area}, skipped`); continue; }
  if (!Array.isArray(r.gpx) || r.gpx.length < 2) { console.log(`${id}: no track now, skipped`); continue; }
  const g = r.gpx.map(pointOf); let m = 0; for (let i = 1; i < g.length; i++) m += metresBetween(g[i - 1], g[i]);
  const km = m / 1000;
  if (Math.abs(km - TARGETS[id].km) > 0.02 * TARGETS[id].km) { console.log(`${id}: the track is ${km.toFixed(1)} km now, not ${TARGETS[id].km} — a different recording, skipped`); continue; }
  console.log(`${id} (${r.name}): ${r.gpx.length} points, ${km.toFixed(1)} km -> clear track and elevations`);
  plan.push({ id, before: { gpx: r.gpx, elev_pts: r.elev_pts } });
}
if (!WRITE) { console.log(`\ndry run: ${plan.length} row(s) would be cleared. --write --rollback DIR to apply.`); process.exit(0); }
fs.mkdirSync(RB, { recursive: true });
const rbFile = path.join(RB, "rollback-clear-multi-peak-tracks.json");
fs.writeFileSync(rbFile, JSON.stringify({ note: "gpx and elev_pts before clear-multi-peak-tracks.mjs; restore with patchRow('routes', id, before)", at: new Date().toISOString(), rows: plan }));
for (const p of plan) { await patchRow("routes", p.id, { gpx: null, elev_pts: null }); await sleep(1000); }
const back = await get(`routes?select=id,gpx,elev_pts&id=in.(${plan.map(p => p.id).join(",")})`);
let bad = 0;
for (const p of plan) { const b = back.find(x => x.id === p.id); if (!b || b.gpx !== null || b.elev_pts !== null) { bad++; console.log(`  NOT CLEARED: ${p.id}`); } }
console.log(`\n${plan.length - bad} of ${plan.length} cleared and re-read as null. Rollback: ${rbFile}`);
process.exit(bad ? 1 : 0);
