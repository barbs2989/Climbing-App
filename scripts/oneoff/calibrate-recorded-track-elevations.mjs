// Shift a recorded elevation profile onto the ground when the recording's altimeter was offset.
//
// The recorded lines written by #1875/#1889 (WA), #1907 (OR) and apply-fkt-state-climbs.mjs (CA, CO, WY, ID, MT) take
// `elev_pts` — and the elevation of every pin placed on the line — straight from the recording. Most watches agree with
// the ground to within a few tens of feet, but a barometric altimeter can be off by hundreds for a whole outing: the
// Middle Teton recording topped out at 12,163 ft on a 12,804 ft summit, so the profile and the summit pin both said
// 12,163.
//
// The ground is USGS 3DEP (scripts/lib/terrain.mjs). For each route, 25 points evenly along its line are read from the
// ground and compared with `elev_pts` at the same index. A route is shifted only when the disagreement is a CONSTANT
// offset — the median is more than 60 ft and the middle 60% of the differences (p20..p80) lie within 150 ft of each
// other, or the offset is at least twice that spread (Bonanza: -552 ft with a 204 ft spread — a shift leaves ~100 ft
// where there were ~550). Otherwise the noise is as large as the offset, a constant would not fix it, and the route is
// reported and left alone. The shift is the median, rounded to the foot; the SHAPE of the profile is
// the recording's own.
//
// Pins: a pin is shifted only when it was taken from this same recording — its coordinate is exactly a vertex of the
// line and its elevation is exactly `elev_pts` at that vertex. Any other pin (a researched trailhead, an older pin)
// keeps its elevation.
//
//   node scripts/oneoff/calibrate-recorded-track-elevations.mjs            # dry run: measure and report
//   node scripts/oneoff/calibrate-recorded-track-elevations.mjs --write    # patch + rollback + re-read
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const WRITE = process.argv.includes("--write");
const MIN_OFFSET_FT = 60, MAX_SPREAD_FT = 150, SAMPLES = 25;
const here = p => new URL(p, import.meta.url);
const read = p => JSON.parse(fs.readFileSync(here(p)));
const ids = new Set();
for (const f of ["../rollback-recorded-wa-tracks.json", "../rollback-recorded-wa-tracks-2.json", "../rollback-recorded-wa-tracks-3.json"]) if (fs.existsSync(here(f))) for (const r of read(f).rows) ids.add(r.id);
for (const f of fs.readdirSync(here("./data/")).filter(f => /-fkt-(climbs|gap-climbs)\.json$/.test(f))) { const d = read("./data/" + f); for (const u of d.trackUpdates || []) ids.add(u.id); for (const r of d.routes || []) ids.add(r.id); }

const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const all = [...ids], rows = [];
for (let i = 0; i < all.length; i += 40) rows.push(...await get(`routes?select=id,gpx,elev_pts,waypoints&id=in.(${all.slice(i, i + 40).join(",")})`));

const plan = [], left = [];
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  const g = r.gpx || [], e = r.elev_pts || [];
  if (!g.length || e.length !== g.length) continue;
  const idx = [...new Set(Array.from({ length: SAMPLES }, (_, i) => Math.round(i * (g.length - 1) / (SAMPLES - 1))))];
  const d = (await Promise.all(idx.map(async i => { const v = await elevationAt(g[i][0], g[i][1]); return v == null ? null : v - e[i]; }))).filter(v => v != null);
  if (d.length < 15) { left.push(`${r.id}: only ${d.length} ground readings — not measured`); continue; }
  d.sort((a, b) => a - b); const med = Math.round(d[Math.floor(d.length / 2)]), spread = Math.round(d[Math.floor(d.length * 0.8)] - d[Math.floor(d.length * 0.2)]);
  if (Math.abs(med) <= MIN_OFFSET_FT) continue;
  if (spread > MAX_SPREAD_FT && Math.abs(med) < 2 * spread) { left.push(`${r.id}: median ${med} ft but spread ${spread} ft — not a constant offset, left alone`); continue; }
  const key = p => `${(+p[0]).toFixed(5)},${(+p[1]).toFixed(5)}`; const at = new Map(g.map((p, i) => [key(p), i]));
  let pins = 0; const wps = (r.waypoints || []).map(w => { const i = at.get(key([w.lat, w.lng])); if (i != null && w.elev === e[i]) { pins++; return { ...w, elev: w.elev + med }; } return w; });
  plan.push({ id: r.id, med, spread, pins, before: { elev_pts: e, waypoints: r.waypoints ?? null }, after: { elev_pts: e.map(v => v + med), ...(pins ? { waypoints: wps } : {}) } });
}
console.log(`${rows.length} recorded lines measured against the ground`);
for (const p of plan) console.log(`  SHIFT ${p.id.padEnd(46)} ${p.med > 0 ? "+" : ""}${p.med} ft (spread ${p.spread} ft), ${p.pins} pin(s) from the recording`);
for (const l of left) console.log("  " + l);
if (!WRITE || !plan.length) { console.log(WRITE ? "nothing to write" : "Dry run. Re-run with --write."); process.exit(0); }

const RB = here("../rollback-calibrate-recorded-track-elevations.json");
const prev = fs.existsSync(RB) ? JSON.parse(fs.readFileSync(RB)) : { runs: [] };
prev.runs.push({ at: new Date().toISOString(), rows: plan.map(p => ({ id: p.id, shift_ft: p.med, before: p.before })) });
fs.writeFileSync(RB, JSON.stringify(prev, null, 1));
for (const p of plan) await patchRow("routes", p.id, p.after);
const back = await get(`routes?select=id,elev_pts,waypoints&id=in.(${plan.map(p => p.id).join(",")})`);
const canon = v => JSON.stringify(v, (kk, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x);
let bad = 0; for (const p of plan) { const b = back.find(x => x.id === p.id); if (!b || canon(b.elev_pts) !== canon(p.after.elev_pts) || (p.after.waypoints && canon(b.waypoints) !== canon(p.after.waypoints))) { bad++; console.log("NOT LANDED:", p.id); } }
console.log(`re-read: ${plan.length - bad}/${plan.length} landed`); if (bad) process.exit(1);
