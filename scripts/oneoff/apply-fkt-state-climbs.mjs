// Recorded lines on existing routes, plus the missing climbs, for one state — the comparison #1875 (WA) and #1907 (OR)
// ran, extended to California, Colorado, Wyoming, Idaho and Montana (user, 2026-09-25: "Big alpine states").
//
// Each state's rows are in data/<st>-fkt-climbs.json, the same shape apply-or-fkt-climbs.mjs writes:
//   trackUpdates  existing routes that get a recorded line (`gpx`), its elevation profile (`elev_pts`), and — only
//                 where the row has no pins yet — a trailhead pin at the recording's start and a summit pin where
//                 the GROUND (USGS 3DEP, scripts/lib/terrain.mjs) says the recorded top is a summit.
//   areas         new areas (a new peak, or a range-level container for a link-up — never under one peak)
//   routes        new climbs, researched; nothing a climber reads names a source.
//
// WHICH TRACK IS WHICH ROUTE WAS DECIDED BY GEOMETRY, NOT BY NAME: the recorded top within ~150 m of the route's peak,
// and the side the line arrives at the summit from (bearing at 300, 600 and 1,000 m) against the route's name. Most
// rows in these states come from a rock-climbing import and carry a name and a grade but no text or pins, so the
// bearing is what separates a North Arete from an East Arete. A summit route's line runs trailhead -> summit (the
// convention lib/track.js measures against); a traverse keeps the whole recording. Rejected pairings are listed in
// each state's section of the PR.
//
//   node scripts/oneoff/apply-fkt-state-climbs.mjs --state ca           # dry run: preflight only
//   node scripts/oneoff/apply-fkt-state-climbs.mjs --state ca --write   # write + rollback + re-read
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const arg = f => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : null; };
const ST = (arg("--state") || "").toLowerCase();
if (!/^[a-z]{2}$/.test(ST)) { console.error("usage: --state <two-letter code>"); process.exit(2); }
const WRITE = process.argv.includes("--write");
const data = JSON.parse(fs.readFileSync(new URL(`./data/${ST}-fkt-climbs.json`, import.meta.url)));
const ROLLBACK = new URL(`../rollback-${ST}-fkt-climbs.json`, import.meta.url);
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const post = async (table, row) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: headers(k, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify([row]) });
  const t = await r.text(); if (!r.ok) throw new Error(`POST ${table} ${row.id} -> ${r.status} ${t.slice(0, 400)}`); const out = JSON.parse(t); if (out.length !== 1) throw new Error(`POST ${table} ${row.id} returned ${out.length}`); };
const canon = v => JSON.stringify(v, (kk, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x);

const problems = [];
const aIds = data.areas.map(a => a.id), rIds = data.routes.map(r => r.id), uIds = data.trackUpdates.map(u => u.id);
if (aIds.length) for (const a of await get(`areas?select=id&id=in.(${aIds.join(",")})`)) problems.push(`area ${a.id} already exists`);
if (rIds.length) for (const r of await get(`routes?select=id&id=in.(${rIds.join(",")})`)) problems.push(`route ${r.id} already exists`);
for (const p of [...new Set(data.areas.map(a => a.parent_id))]) {
  if (!(await get(`areas?select=id&id=eq.${p}`)).length) problems.push(`parent ${p} not found`);
  if ((await get(`routes?select=id&area_id=eq.${p}&limit=1`)).length) problems.push(`parent ${p} holds routes`);
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
for (const r of data.routes.filter(r => !aIds.includes(r.area_id))) {
  if ((await get(`areas?select=id&parent_id=eq.${r.area_id}&limit=1`)).length) problems.push(`${r.id}: ${r.area_id} is not a leaf`);
  for (const s of await get(`routes?select=id,name&area_id=eq.${r.area_id}`)) if (norm(s.name) === norm(r.name)) problems.push(`${r.id}: "${s.name}" already on ${r.area_id}`);
}
const before = uIds.length ? await get(`routes?select=id,gpx,elev_pts,waypoints&id=in.(${uIds.join(",")})`) : [];
for (const id of uIds) if (!before.find(b => b.id === id)) problems.push(`track target ${id} not found`);
for (const u of data.trackUpdates) { const b = before.find(x => x.id === u.id); if (!b) continue;
  if (u.waypoints && (b.waypoints || []).length) problems.push(`${u.id} gained pins since compose — refusing to overwrite them`);
  if ((b.gpx || []).length) problems.push(`${u.id} gained a line since compose — refusing to overwrite it`); }
console.log(`${ST.toUpperCase()}: ${data.areas.length} areas, ${data.routes.length} new routes, ${data.trackUpdates.length} track updates`);
if (problems.length) { console.error("REFUSING:\n  " + problems.join("\n  ")); process.exit(1); }
console.log("preflight clean");
if (!WRITE) { console.log("Dry run. Re-run with --write."); process.exit(0); }

fs.writeFileSync(ROLLBACK, JSON.stringify({ at: new Date().toISOString(), note: `track updates' before-state; inserted rows are removed by deleting data/${ST}-fkt-climbs.json's route ids, then its area ids`, rows: before.map(b => ({ id: b.id, before: { gpx: b.gpx ?? null, elev_pts: b.elev_pts ?? null, waypoints: b.waypoints ?? null } })) }, null, 1));
for (const a of data.areas) await post("areas", a);
for (const r of data.routes) await post("routes", r);
for (const u of data.trackUpdates) { const { id, ...body } = u; await patchRow("routes", id, body); }

const all = [...rIds, ...uIds]; const back = [];
for (let i = 0; i < all.length; i += 40) back.push(...await get(`routes?select=id,area_id,gpx,waypoints&id=in.(${all.slice(i, i + 40).join(",")})`));
let bad = 0;
for (const r of data.routes) { const b = back.find(x => x.id === r.id); if (!b || b.area_id !== r.area_id || canon(b.gpx ?? null) !== canon(r.gpx ?? null)) { bad++; console.log("NOT LANDED:", r.id); } }
for (const u of data.trackUpdates) { const b = back.find(x => x.id === u.id); if (!b || canon(b.gpx) !== canon(u.gpx) || (u.waypoints && canon(b.waypoints) !== canon(u.waypoints))) { bad++; console.log("NOT LANDED:", u.id); } }
console.log(`re-read: ${all.length - bad}/${all.length} landed`);
if (bad) process.exit(1);
