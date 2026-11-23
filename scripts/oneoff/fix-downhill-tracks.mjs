// Three routes whose stored track runs DOWNHILL from the summit, so the elevation profile under the map
// started at the top and printed almost no gain. Found by a study of every drawn profile (2026-11-23, 430):
//
//   wa_lundin_peak_west_ridge             recorded summit to trailhead (6,019 ft to 2,978 ft, ending 293 m
//                                         from the trailhead pin). The profile read "Gain 24 ft".
//   wa_cutthroat_west_ridge               the same (7,971 ft to 5,129 ft, ending 467 m from the pin): "Gain 145 ft".
//   wa_goode_mountain_southwest_couloir   a 1 km piece coming down off the summit (9,197 ft to 7,370 ft),
//                                         14 km from the trailhead, on a route with 8,400 ft of gain: "Gain 0 ft".
//
// The first two are whole recordings in the wrong order: the same points are written back REVERSED, with
// their elevations, so the line starts at the trailhead. No point is moved, added or dropped. The third is
// neither complete nor trailhead to summit, so its track and elevations are cleared and the route shows its
// pins alone. Each row is re-checked before it is written, so one somebody has since repaired is left alone.
//
//   node scripts/oneoff/fix-downhill-tracks.mjs                       # dry run
//   node scripts/oneoff/fix-downhill-tracks.mjs --write --rollback DIR # rollback file in DIR, patch, re-read
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { metresBetween, pointOf } from "../../lib/track.js";

const WRITE = process.argv.includes("--write");
const RB = process.argv.includes("--rollback") ? process.argv[process.argv.indexOf("--rollback") + 1] : null;
if (WRITE && !RB) { console.error("--write needs --rollback DIR (a folder outside git: the before-state holds whole tracks)"); process.exit(2); }
const REVERSE = ["wa_lundin_peak_west_ridge", "wa_cutthroat_west_ridge"];
const CLEAR = ["wa_goode_mountain_southwest_couloir"];
const AREA = { wa_lundin_peak_west_ridge: "wa_lundin_peak", wa_cutthroat_west_ridge: "wa_cutthroat_peak", wa_goode_mountain_southwest_couloir: "wa_mount_goode" };
const ids = [...REVERSE, ...CLEAR];
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k), signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const lengthM = g => { let d = 0; for (let i = 1; i < g.length; i++) d += metresBetween(g[i - 1], g[i]); return d; };

const rows = await get(`routes?select=id,name,area_id,gpx,elev_pts,waypoints&id=in.(${ids.join(",")})`);
const plan = [];
for (const id of ids) {
  const r = rows.find(x => x.id === id);
  if (!r) { console.log(`${id}: NOT FOUND, skipped`); continue; }
  if (r.area_id !== AREA[id]) { console.log(`${id}: filed under ${r.area_id}, not ${AREA[id]}, skipped`); continue; }
  const gpx = r.gpx, e = r.elev_pts;
  if (!Array.isArray(gpx) || gpx.length < 2 || !Array.isArray(e) || e.length !== gpx.length) { console.log(`${id}: no track with matching elevations now, skipped`); continue; }
  const g = gpx.map(pointOf), n = g.length;
  const th = (r.waypoints || []).find(w => /trailhead/i.test(String(w.type || "")));
  const thP = th && pointOf(th);
  if (!thP) { console.log(`${id}: no trailhead pin to judge against, skipped`); continue; }
  const toStart = metresBetween(thP, g[0]), toEnd = metresBetween(thP, g[n - 1]);
  const drop = e[0] - e[n - 1];
  const say = `${id} (${r.name}): ${n} points, ${Math.round(e[0])} ft -> ${Math.round(e[n - 1])} ft, trailhead ${Math.round(toStart)} m from the start and ${Math.round(toEnd)} m from the end`;
  if (REVERSE.includes(id)) {
    // Still downhill, top at the very start, and the trailhead clearly at the far end.
    if (!(drop > 1000 && Math.max(...e) === e[0] && toEnd < 600 && toStart > 3 * toEnd)) { console.log(`${say} -> no longer a summit-to-trailhead recording, skipped`); continue; }
    console.log(`${say} -> reverse`);
    plan.push({ id, before: { gpx, elev_pts: e }, after: { gpx: [...gpx].reverse(), elev_pts: [...e].reverse() } });
  } else {
    // Still a short descending piece nowhere near the trailhead.
    const km = lengthM(g) / 1000;
    if (!(km < 2 && drop > 1000 && toStart > 10000 && toEnd > 10000)) { console.log(`${say}, ${km.toFixed(1)} km -> no longer a short descending fragment, skipped`); continue; }
    console.log(`${say}, ${km.toFixed(1)} km -> clear track and elevations`);
    plan.push({ id, before: { gpx, elev_pts: e }, after: { gpx: null, elev_pts: null } });
  }
}
if (!WRITE) { console.log(`\ndry run: ${plan.length} row(s) would change. --write --rollback DIR to apply.`); process.exit(0); }
fs.mkdirSync(RB, { recursive: true });
const rbFile = path.join(RB, "rollback-fix-downhill-tracks.json");
fs.writeFileSync(rbFile, JSON.stringify({ note: "gpx and elev_pts before fix-downhill-tracks.mjs; restore with patchRow('routes', id, before)", at: new Date().toISOString(), rows: plan.map(p => ({ id: p.id, before: p.before })) }));
for (const p of plan) { await patchRow("routes", p.id, p.after); await new Promise(r => setTimeout(r, 1000)); }
const back = await get(`routes?select=id,gpx,elev_pts&id=in.(${plan.map(p => p.id).join(",")})`);
let bad = 0;
for (const p of plan) {
  const b = back.find(x => x.id === p.id);
  const same = b && JSON.stringify(b.gpx) === JSON.stringify(p.after.gpx) && JSON.stringify(b.elev_pts) === JSON.stringify(p.after.elev_pts);
  if (!same) { bad++; console.log(`  NOT AS WRITTEN: ${p.id}`); }
}
console.log(`\n${plan.length - bad} of ${plan.length} written and re-read. Rollback: ${rbFile}`);
process.exit(bad ? 1 : 0);
