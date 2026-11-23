// Give ten Washington routes their elevation profile back.
//
// Found 2026-11-23: each stores an UP-AND-BACK recording of 2,006 to 52,311 points in `gpx`, and 516 to 800
// elevations in `elev_pts` that are the ASCENT HALF of that same recording, spaced evenly by distance from
// the trailhead to the summit (read that way they agree with the ground, USGS 3DEP, to a median of 25-103 ft
// on all ten; read as the whole line they are 900-2,700 ft off). The profile needs one elevation per track
// point (src/components/RouteMapProfile.tsx), so these ten show the map alone.
//
// What this writes, per route:
//   gpx       the same recording resampled at equal distance, 15 m or more apart, at most 3,000 points:
//             the convention of every other recorded line (apply-recorded-wa-tracks.mjs `resample`).
//   elev_pts  one elevation per resampled point.
//               - on the way up: the stored elevations, interpolated by distance (they ARE this stretch);
//               - on the way down, where the party retraced its way up (within NEAR_M of the ascent line):
//                 the stored elevation of that spot on the way up. The ground there is the same ground;
//               - on the way down, anywhere else: the ground (USGS 3DEP) at that point.
// No pin is touched. A route is skipped when its line is not an up-and-back, or when the finished profile
// disagrees with the ground on the way down (median over CHECK_MED_FT at a dozen points).
//
//   node scripts/oneoff/regenerate-dense-track-profiles.mjs                     # dry run: plan + ground check
//   node scripts/oneoff/regenerate-dense-track-profiles.mjs --write --rollback DIR   # rollback file in DIR (it is ~5 MB: keep it OUT of git), patch, re-read
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";
import { metresBetween, pointOf } from "../../lib/track.js";

const ALL = ["wa_crater_mountain_standard_route", "wa_jack_mountain_south_face", "wa_kaleetan_peak_south_ridge", "wa_little_tahoma_east_shoulder", "wa_mount_adams_south_climb", "wa_mount_baker_easton_glacier", "wa_mount_st_helens_monitor_ridge", "wa_robinson_mountain_southeast_ridge", "wa_snowfield_peak_neve_glacier", "wa_south_ridge_3"];
// --only id,id runs a few at a time (each route takes a minute or two of ground readings); the rollback file is then named per batch
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
if (ONLY && ONLY.some(id => !ALL.includes(id))) { console.error("--only names a route that is not one of the ten"); process.exit(2); }
const IDS = ONLY || ALL;
const WRITE = process.argv.includes("--write");
const RB_DIR = process.argv.includes("--rollback") ? process.argv[process.argv.indexOf("--rollback") + 1] : null;
if (WRITE && !RB_DIR) { console.error("--write needs --rollback DIR"); process.exit(2); }
const MAX_POINTS = 3000, STEP_M = 15, NEAR_M = 30, CHECK_MED_FT = 150, MAX_GROUND_PTS = 400;
const k = requireServiceKey(); const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k), signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

const plan = [];
for (const id of IDS) {
  await sleep(1200);
  const r = (await get(`routes?select=id,name,gpx,elev_pts&id=eq.${id}`))[0];
  if (!r || !Array.isArray(r.gpx) || !Array.isArray(r.elev_pts)) { console.log(`${id}: no track or no elevations now, skipped`); continue; }
  if (r.gpx.length === r.elev_pts.length) { console.log(`${id}: already lines up, skipped`); continue; }
  const raw = r.gpx.map(pointOf), e0 = r.elev_pts, m = e0.length;
  const cum = [0]; for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + metresBetween(raw[i - 1], raw[i]));
  const len = cum[cum.length - 1];
  // equal-distance resample (positions only)
  const n = Math.max(2, Math.min(MAX_POINTS, Math.ceil(len / STEP_M) + 1)), step = len / (n - 1);
  const pts = []; let j = 0;
  for (let q = 0; q < n; q++) {
    const d = q * step; while (j < raw.length - 2 && cum[j + 1] < d) j++;
    const seg = cum[j + 1] - cum[j], t = seg > 0 ? Math.min(1, Math.max(0, (d - cum[j]) / seg)) : 0;
    pts.push({ lat: raw[j].lat + (raw[j + 1].lat - raw[j].lat) * t, lng: raw[j].lng + (raw[j + 1].lng - raw[j].lng) * t, d });
  }
  // the turnaround: the resampled point farthest from the start
  let far = 0, turn = 0; for (let i = 0; i < n; i++) { const dd = metresBetween(pts[0], pts[i]); if (dd > far) { far = dd; turn = i; } }
  const back = metresBetween(pts[0], pts[n - 1]), frac = pts[turn].d / len;
  if (back > 300 || frac < 0.4 || frac > 0.6) { console.log(`${id}: not an up-and-back (ends ${Math.round(back)} m apart, turnaround at ${frac.toFixed(2)}), skipped`); continue; }
  const upLen = pts[turn].d;
  const upElev = d => { const x = Math.min(m - 1, Math.max(0, d / upLen * (m - 1))), a = Math.floor(x), b = Math.min(m - 1, a + 1); return e0[a] + (e0[b] - e0[a]) * (x - a); };
  const elev = new Array(n).fill(null); const src = new Array(n).fill("");
  for (let i = 0; i <= turn; i++) { elev[i] = upElev(pts[i].d); src[i] = "up"; }
  // way down: the nearest point of the way up. The party walks back along it, so search near the mirrored spot first.
  let hint = turn;
  const needGround = [];
  for (let i = turn + 1; i < n; i++) {
    let best = Infinity, bi = -1;
    const lo = Math.max(0, hint - 400), hi = Math.min(turn, hint + 60);
    for (let u = lo; u <= hi; u++) { const dd = metresBetween(pts[i], pts[u]); if (dd < best) { best = dd; bi = u; } }
    if (best > NEAR_M) for (let u = 0; u <= turn; u += 3) { const dd = metresBetween(pts[i], pts[u]); if (dd < best) { best = dd; bi = u; } }
    if (best <= NEAR_M) { elev[i] = elev[bi]; src[i] = "retraced"; hint = bi; } else needGround.push(i);
  }
  // the ground for the rest: at most MAX_GROUND_PTS readings, evenly through them, interpolated between
  const picks = needGround.length <= MAX_GROUND_PTS ? needGround : Array.from({ length: MAX_GROUND_PTS }, (_, q) => needGround[Math.round(q * (needGround.length - 1) / (MAX_GROUND_PTS - 1))]);
  let groundFail = 0;
  for (const i of new Set(picks)) { const v = await elevationAt(pts[i].lat, pts[i].lng); await sleep(150); if (v == null) groundFail++; else { elev[i] = v; src[i] = "ground"; } }
  // fill what is still empty by interpolating along distance between its filled neighbours
  for (let i = turn + 1; i < n; i++) if (elev[i] == null) {
    let a = i - 1; while (elev[a] == null) a--; let b = i + 1; while (b < n && elev[b] == null) b++;
    elev[i] = b < n ? elev[a] + (elev[b] - elev[a]) * (pts[i].d - pts[a].d) / (pts[b].d - pts[a].d) : elev[a]; src[i] = "between";
  }
  // check the way down against the ground at a dozen points that did NOT come from it
  const cand = []; for (let i = turn + 1; i < n; i++) if (src[i] === "retraced" || src[i] === "between") cand.push(i);
  const chk = Array.from({ length: Math.min(12, cand.length) }, (_, q) => cand[Math.round(q * (cand.length - 1) / Math.max(1, Math.min(12, cand.length) - 1))]);
  const diffs = []; for (const i of new Set(chk)) { const v = await elevationAt(pts[i].lat, pts[i].lng); await sleep(150); if (v != null) diffs.push(Math.abs(v - elev[i])); }
  const count = s => src.filter(x => x === s).length;
  const checkMed = diffs.length ? Math.round(med(diffs)) : null;
  const ok = diffs.length >= 6 && checkMed <= CHECK_MED_FT && groundFail <= picks.length * 0.1;
  console.log(`${id} (${r.name}): ${raw.length} -> ${n} pts, ${(len / 1000).toFixed(1)} km, turnaround at ${frac.toFixed(2)}; up ${count("up")}, retraced ${count("retraced")}, ground ${count("ground")}, between ${count("between")}; way down vs ground: median ${checkMed} ft, worst ${diffs.length ? Math.round(Math.max(...diffs)) : "-"} ft over ${diffs.length} -> ${ok ? "APPLY" : "SKIP"}`);
  if (!ok) continue;
  plan.push({ id, before: { gpx: r.gpx, elev_pts: r.elev_pts }, after: { gpx: pts.map(p => [+p.lat.toFixed(5), +p.lng.toFixed(5)]), elev_pts: elev.map(v => Math.round(v)) } });
}
if (!WRITE) { console.log(`\ndry run: ${plan.length} of ${IDS.length} would be written. --write --rollback DIR to apply.`); process.exit(0); }
fs.mkdirSync(RB_DIR, { recursive: true });
if (!plan.length) { console.log("nothing to write."); process.exit(0); }
const rb = path.join(RB_DIR, `rollback-regenerate-dense-track-profiles-${plan[0].id}.json`);
fs.writeFileSync(rb, JSON.stringify({ note: "gpx/elev_pts before regenerate-dense-track-profiles.mjs; restore with patchRow('routes', id, before)", at: new Date().toISOString(), rows: plan.map(p => ({ id: p.id, before: p.before })) }));
console.log(`rollback: ${rb}`);
let bad = 0;
for (const p of plan) {
  await patchRow("routes", p.id, p.after);
  const b = (await get(`routes?select=id,gpx,elev_pts&id=eq.${p.id}`))[0];
  const same = b && JSON.stringify(b.gpx) === JSON.stringify(p.after.gpx) && JSON.stringify(b.elev_pts) === JSON.stringify(p.after.elev_pts);
  console.log(`  ${same ? "written" : "NOT AS WRITTEN"}: ${p.id} (${p.after.gpx.length} pts)`); if (!same) bad++;
}
console.log(`\n${plan.length - bad} of ${plan.length} written and re-read.`);
process.exit(bad ? 1 : 0);
