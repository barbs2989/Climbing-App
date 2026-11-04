// Move Denali's and Fremont Peak's area coordinates onto their summits, as the GROUND places them
// (probe-denali-fremont-summits.mjs, USGS 3DEP: a local maximum at 20,214 / 13,744 ft; the stored
// points read 14,317 / 10,592 ft on the ground). Then, on every route filed under either peak:
//   - a Summit pin standing near the OLD point (within MOVE_M) moves to the summit, since it copied
//     the bad coordinate;
//   - a route with no Summit pin gets one when its recorded line passes within SUMMIT_M of the summit.
// Rollback saved first; every row re-read.
//   node scripts/oneoff/fix-denali-fremont-summits.mjs            dry run
//   node scripts/oneoff/fix-denali-fremont-summits.mjs --write
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const { recordedTrackPts } = await import("../../lib/track.js");
const WRITE = process.argv.includes("--write");
const KEY = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(KEY) }); const t = await r.text(); if (!r.ok) throw new Error(`${p.slice(0, 80)} ${r.status} ${t.slice(0, 160)}`); return JSON.parse(t); };
const R = 6371000, rad = d => d * Math.PI / 180;
const hav = (a, b) => { const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const MOVE_M = 500, SUMMIT_M = 150;
const FIX = [
  { id: "ak_denali", summit: [63.0692, -151.007], elevFt: 20310 },
  { id: "wy_fremont_peak", summit: [43.12473, -109.61829], elevFt: 13745 },
];
const areaRows = [], routeRows = [], plan = [];
for (const f of FIX) {
  const [a] = await get(`areas?select=id,name,lat,lng,elevation_ft&id=eq.${f.id}`);
  if (!a) throw new Error(`${f.id} not found`);
  areaRows.push(a);
  const old = [a.lat, a.lng];
  console.log(`${a.name}: ${a.lat}, ${a.lng} -> ${f.summit.join(", ")} (${Math.round(hav(old, f.summit))} m)`);
  // the peak and every area under it
  const ids = [a.id]; for (let i = 0; i < ids.length; i++) for (const k of await get(`areas?select=id&parent_id=eq.${ids[i]}`)) ids.push(k.id);
  const rs = await get(`routes?select=id,name,gpx,waypoints&area_id=in.(${ids.join(",")})&limit=1000`);
  for (const r of rs) {
    const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
    let changed = false;
    const next = wps.map(w => {
      if (!/summit/i.test(w.type || "") || w.lat == null || w.lng == null) return w;
      const dOld = hav([+w.lat, +w.lng], old), dNew = hav([+w.lat, +w.lng], f.summit);
      if (dOld <= MOVE_M && dNew > SUMMIT_M) { changed = true; console.log(`  ${r.id}: Summit pin "${w.name}" ${dOld} m from the old point -> summit`); return { ...w, lat: f.summit[0], lng: f.summit[1] }; }
      return w;
    });
    if (!next.some(w => /summit/i.test(w.type || ""))) {
      const d = recordedTrackPts(r.gpx, r.waypoints);
      const close = d ? Math.min(...d.map(p => hav(p, f.summit))) : Infinity;
      if (close <= SUMMIT_M) { changed = true; next.push({ type: "Summit", name: `${a.name} summit`, lat: f.summit[0], lng: f.summit[1], elev: f.elevFt }); console.log(`  ${r.id}: no Summit pin; its line passes ${Math.round(close)} m from the summit -> add one`); }
    }
    if (changed) { routeRows.push({ id: r.id, before: r.waypoints ?? null }); plan.push({ id: r.id, waypoints: next }); }
  }
  console.log(`  ${rs.length} routes under ${a.name}; ${plan.filter(p => rs.some(r => r.id === p.id)).length} to change`);
}
if (!WRITE) { console.log("Dry run. Re-run with --write."); process.exit(0); }
const rb = new URL(`../rollback-denali-fremont-summits-${Date.now()}.json`, import.meta.url);
fs.writeFileSync(rb, JSON.stringify({ at: new Date().toISOString(), note: "restore with patchRow(areas|routes, id, before)", areas: areaRows.map(a => ({ id: a.id, before: { lat: a.lat, lng: a.lng } })), routes: routeRows }, null, 1));
console.log("rollback saved", rb.pathname);
for (const f of FIX) { await patchRow("areas", f.id, { lat: f.summit[0], lng: f.summit[1] }); await new Promise(s => setTimeout(s, 800)); }
for (const p of plan) { await patchRow("routes", p.id, { waypoints: p.waypoints }); await new Promise(s => setTimeout(s, 800)); }
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x);
let bad = 0;
for (const f of FIX) { const [a] = await get(`areas?select=lat,lng&id=eq.${f.id}`); if (a.lat !== f.summit[0] || a.lng !== f.summit[1]) { bad++; console.log("NOT LANDED", f.id); } }
for (const p of plan) { const [r] = await get(`routes?select=waypoints&id=eq.${p.id}`); if (canon(r.waypoints) !== canon(p.waypoints)) { bad++; console.log("NOT LANDED", p.id); } }
console.log(`areas ${FIX.length}, routes ${plan.length}; re-read problems ${bad}`);
