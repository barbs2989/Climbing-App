// Six routes from the 2026-11-23 study of elevation profiles, each checked against the USGS 3DEP ground:
//
// STOP SHORT OF THE SUMMIT: the track is cleared (gpx + elev_pts). The owner's rule (2026-10-28): "only use
// gpx tracks where the person reached the summit". Each recording's elevations match the ground to within
// 10 ft, so the shortfall is the recording's, not the data's.
//   wa_mount_watson_scramble       tops out at 5,644 ft, 279 m from a summit the ground puts at 6,218 ft
//   wa_pinnacle_peak_tatoosh_r1    ends at 5,935 ft; the summit is 6,560 ft
//   wa_chianti_spire_east_face     tops out at 7,794 ft, 173 m from a summit at 8,460 ft
//   wa_warrior_peak_standard       ends at 6,739 ft, 106 m from a summit at 7,291 ft
// (Each is within the 300 m SUMMIT_REACH_M of its summit pin, which is why the page kept it.)
//
// ELEVATIONS NOT THE TERRAIN: the track reaches the summit and is kept; elev_pts is rebuilt from the ground
// at every point, which is what the rest of the catalog's elevations are (Watson, Pinnacle, Chianti and
// Warrior above match the ground to the foot).
//   wa_argonaut_peak_northeast_couloir          stored 2,750-4,166 ft BELOW the ground; peaked at 5,273 ft on an 8,457 ft summit
//   wa_johannesburg_mountain_northeast_rib_1951_route  stored -1,050 to +859 ft off the ground; peaked 450 ft above the summit
//
// Owner's go-ahead: "do the rest" (2026-11-23).
//
//   node scripts/oneoff/fix-short-and-misread-tracks.mjs --ground CACHE.json      # fetch the ground (no DB slot needed)
//   node scripts/oneoff/fix-short-and-misread-tracks.mjs --ground CACHE.json --plan            # dry run
//   node scripts/oneoff/fix-short-and-misread-tracks.mjs --ground CACHE.json --write --rollback DIR
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow, anonKey } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";
import { pointOf } from "../../lib/track.js";

const arg = f => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : null);
const CACHE = arg("--ground"), RB = arg("--rollback");
const WRITE = process.argv.includes("--write"), PLAN = process.argv.includes("--plan") || WRITE;
if (!CACHE) { console.error("--ground CACHE.json is required"); process.exit(2); }
if (WRITE && !RB) { console.error("--write needs --rollback DIR (a folder outside git)"); process.exit(2); }

// id -> [area, point count measured, peak height the ground gives]
const CLEAR = {
  wa_mount_watson_scramble: ["wa_mount_watson", 99, 6218],
  wa_pinnacle_peak_tatoosh_r1: ["wa_pinnacle_peak_tatoosh", 93, 6560],
  wa_chianti_spire_east_face: ["wa_chianti_spire", 938, 8460],
  wa_warrior_peak_standard: ["wa_warrior_peak", 298, 7291],
};
const REBUILD = {
  wa_argonaut_peak_northeast_couloir: ["wa_argonaut_peak", 2385, 8434],
  wa_johannesburg_mountain_northeast_rib_1951_route: ["wa_johannesburg_mountain", 723, 8196],
};
const ids = [...Object.keys(CLEAR), ...Object.keys(REBUILD)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async (p, key) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(key), signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };

if (!PLAN) {
  // Phase 1: the ground at every point of the two tracks being rebuilt. Public reads only; resumable.
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
  for (const id of Object.keys(REBUILD)) {
    const r = (await get(`routes?select=id,gpx&id=eq.${id}`, anonKey()))[0];
    const g = r.gpx.map(pointOf);
    const c = cache[id] && cache[id].n === g.length ? cache[id] : { n: g.length, first: r.gpx[0], ft: new Array(g.length).fill(null) };
    // Six readings at a time: one by one the service answers about every 3 s, over two hours for both tracks.
    const todo = c.ft.map((v, i) => (v == null ? i : -1)).filter(i => i >= 0);
    for (let b = 0; b < todo.length; b += 6) {
      const batch = todo.slice(b, b + 6);
      const got = await Promise.all(batch.map(i => elevationAt(g[i].lat, g[i].lng, 8)));
      batch.forEach((i, j) => { c.ft[i] = got[j]; });
      if ((b / 6) % 20 === 0) { cache[id] = c; fs.writeFileSync(CACHE, JSON.stringify(cache)); console.log(`${id}: ${c.ft.filter(v => v != null).length}/${g.length}`); }
    }
    cache[id] = c; fs.writeFileSync(CACHE, JSON.stringify(cache));
    console.log(`${id}: ${c.ft.filter(v => v == null).length} point(s) without a reading`);
  }
  process.exit(0);
}

const cache = JSON.parse(fs.readFileSync(CACHE, "utf8"));
const k = requireServiceKey();
const rows = await get(`routes?select=id,name,area_id,gpx,elev_pts&id=in.(${ids.join(",")})`, k);
const plan = [];
for (const id of ids) {
  const r = rows.find(x => x.id === id);
  if (!r) { console.log(`${id}: NOT FOUND, skipped`); continue; }
  const [area, n, peakFt] = CLEAR[id] || REBUILD[id];
  if (r.area_id !== area) { console.log(`${id}: filed under ${r.area_id}, not ${area}, skipped`); continue; }
  if (!Array.isArray(r.gpx) || r.gpx.length !== n) { console.log(`${id}: the track is not the one measured (${r.gpx?.length} points, expected ${n}), skipped`); continue; }
  const e = Array.isArray(r.elev_pts) ? r.elev_pts : [];
  let mx = -Infinity; for (const v of e) if (v > mx) mx = v;
  if (CLEAR[id]) {
    if (!(mx < peakFt - 400)) { console.log(`${id}: now tops out at ${Math.round(mx)} ft, within 400 ft of ${peakFt}, skipped`); continue; }
    console.log(`${id} (${r.name}): tops out ${Math.round(peakFt - mx)} ft below the summit -> clear track`);
    plan.push({ id, before: { gpx: r.gpx, elev_pts: r.elev_pts }, after: { gpx: null, elev_pts: null } });
  } else {
    const c = cache[id];
    if (!c || c.n !== n || JSON.stringify(c.first) !== JSON.stringify(r.gpx[0]) || c.ft.some(v => v == null)) { console.log(`${id}: no complete ground reading for this track in ${CACHE}, skipped`); continue; }
    const ft = c.ft.map(v => Math.round(v));
    let gmx = -Infinity; for (const v of ft) if (v > gmx) gmx = v;
    // The rebuilt line must reach the summit's height where the track does, or something else is wrong.
    if (Math.abs(gmx - peakFt) > 300) { console.log(`${id}: the ground along the track tops out at ${gmx}, not near the summit's ${peakFt}, skipped`); continue; }
    const diffs = e.map((v, i) => v - ft[i]).sort((a, b) => a - b);
    console.log(`${id} (${r.name}): stored minus ground median ${Math.round(diffs[diffs.length >> 1])} ft (${Math.round(diffs[0])} to ${Math.round(diffs[diffs.length - 1])}); rebuilt ${ft[0]} -> top ${gmx} -> ${ft[ft.length - 1]} ft -> rebuild elev_pts`);
    plan.push({ id, before: { elev_pts: r.elev_pts }, after: { elev_pts: ft } });
  }
}
if (!WRITE) { console.log(`\ndry run: ${plan.length} row(s) would change. --write --rollback DIR to apply.`); process.exit(0); }
fs.mkdirSync(RB, { recursive: true });
const rbFile = path.join(RB, "rollback-fix-short-and-misread-tracks.json");
fs.writeFileSync(rbFile, JSON.stringify({ note: "before fix-short-and-misread-tracks.mjs; restore with patchRow('routes', id, before)", at: new Date().toISOString(), rows: plan.map(p => ({ id: p.id, before: p.before })) }));
for (const p of plan) { await patchRow("routes", p.id, p.after); await sleep(1000); }
const back = await get(`routes?select=id,gpx,elev_pts&id=in.(${plan.map(p => p.id).join(",")})`, k);
let bad = 0;
for (const p of plan) {
  const b = back.find(x => x.id === p.id);
  const ok = b && Object.entries(p.after).every(([f, v]) => JSON.stringify(b[f]) === JSON.stringify(v));
  if (!ok) { bad++; console.log(`  NOT AS WRITTEN: ${p.id}`); }
}
console.log(`\n${plan.length - bad} of ${plan.length} written and re-read. Rollback: ${rbFile}`);
process.exit(bad ? 1 : 0);
