// Oregon, from a comparison against the Oregon routes on fastestknowntime.com (user: "do all of those", 2026-09-25).
//
// The OR catalog is a rock-climbing import: 4,178 routes, 59 alpine/scramble, 2 peak areas, and not one pin or
// line. So Oregon gets two things, both built from recorded tracks the same way Washington did (#1875):
//
//   1. RECORDED LINES on 6 existing routes. These rows carry only a name and a grade — no description, no pins —
//      so which route a recording is was decided by the SIDE it tops out from (bearing from the summit at 300,
//      600 and 1,000 m) against the route's name: Middle Sister North Ridge (0-8°), Mt. Washington North Ridge
//      (343-12°), Thielsen West Ridge (243-269°), Broken Top Northwest Ridge (278-301°), Three Fingered Jack
//      South Ridge (197-219°), Mt. Bachelor Trail. Each also gets a trailhead pin (the recording's start, named on
//      the route's page) and a summit pin where the GROUND says the recorded top is a summit — not Broken Top,
//      whose runner stopped below the summit pinnacle (ground: 1/8 of the ring higher, +114 ft).
//      Not applied: Jefferson (nothing on our row separates its South Ridge from the SW ridge the recording
//      climbs), McLoughlin (the recording starts at the Hwy 140 trailhead; Trail #3716 starts at Four Mile Lake),
//      South Sister (the recording is the south trail; our rows are Old Crater and North Ridge).
//
//   2. FIVE MISSING CLIMBS, climbs only (walk-ups and running link-ups were left out: South Sister trail, Eagle
//      Cap, Bailey, Cusick, SmURPL, Diamond Double, Broken Top-South Sister, Five Peaks, Matterhorn-Sacajawea):
//        Mount Hood — South Side (Hogsback)       the standard route; the catalog had only Wy'East and Eliot
//        Diamond Peak — South Ridge                a new peak area under Oregon Volcanoes
//        Three Sisters Traverse                    a new container, Three Sisters Traverses
//        Hurwal Divide Traverse                    a new container, Wallowa Mountains Traverses
//        Krag Peak Traverse                        same container; NO line — its only one is a 34-point sketch
//      Link-ups go in range-level containers, never under one peak (a traverse belongs to no single summit).
//
// Rows are in data/or-fkt-climbs.json. Prose was researched and scanned for source names before the file was
// written; nothing a climber reads names a source.
//
//   node scripts/oneoff/apply-or-fkt-climbs.mjs           # dry run: preflight only
//   node scripts/oneoff/apply-or-fkt-climbs.mjs --write   # write + rollback + re-read
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const data = JSON.parse(fs.readFileSync(new URL("./data/or-fkt-climbs.json", import.meta.url)));
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const post = async (table, row) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: headers(k, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify([row]) });
  const t = await r.text(); if (!r.ok) throw new Error(`POST ${table} ${row.id} -> ${r.status} ${t.slice(0, 400)}`); const out = JSON.parse(t); if (out.length !== 1) throw new Error(`POST ${table} ${row.id} returned ${out.length}`); };
const canon = v => JSON.stringify(v, (kk, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x);

const problems = [];
const aIds = data.areas.map(a => a.id), rIds = data.routes.map(r => r.id), uIds = data.trackUpdates.map(u => u.id);
for (const a of await get(`areas?select=id&id=in.(${aIds.join(",")})`)) problems.push(`area ${a.id} already exists`);
for (const r of await get(`routes?select=id&id=in.(${rIds.join(",")})`)) problems.push(`route ${r.id} already exists`);
for (const p of [...new Set(data.areas.map(a => a.parent_id))]) {
  if (!(await get(`areas?select=id&id=eq.${p}`)).length) problems.push(`parent ${p} not found`);
  if ((await get(`routes?select=id&area_id=eq.${p}&limit=1`)).length) problems.push(`parent ${p} holds routes`);
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
for (const r of data.routes.filter(r => !aIds.includes(r.area_id))) {
  if ((await get(`areas?select=id&parent_id=eq.${r.area_id}&limit=1`)).length) problems.push(`${r.id}: ${r.area_id} is not a leaf`);
  for (const s of await get(`routes?select=id,name&area_id=eq.${r.area_id}`)) if (norm(s.name) === norm(r.name)) problems.push(`${r.id}: "${s.name}" already on ${r.area_id}`);
}
const before = await get(`routes?select=id,gpx,elev_pts,waypoints&id=in.(${uIds.join(",")})`);
for (const id of uIds) if (!before.find(b => b.id === id)) problems.push(`track target ${id} not found`);
for (const u of data.trackUpdates) { const b = before.find(x => x.id === u.id); if (b && u.waypoints && (b.waypoints || []).length) problems.push(`${u.id} gained pins since compose — refusing to overwrite them`); }
console.log(`${data.areas.length} areas, ${data.routes.length} new routes, ${data.trackUpdates.length} track updates`);
if (problems.length) { console.error("REFUSING:\n  " + problems.join("\n  ")); process.exit(1); }
console.log("preflight clean");
if (!WRITE) { console.log("Dry run. Re-run with --write."); process.exit(0); }

fs.writeFileSync(new URL("../rollback-or-fkt-climbs.json", import.meta.url), JSON.stringify({ at: new Date().toISOString(), note: "track updates' before-state; inserted rows are removed by deleting data/or-fkt-climbs.json's route ids, then area ids", rows: before.map(b => ({ id: b.id, before: { gpx: b.gpx ?? null, elev_pts: b.elev_pts ?? null, waypoints: b.waypoints ?? null } })) }, null, 1));
for (const a of data.areas) await post("areas", a);
for (const r of data.routes) await post("routes", r);
for (const u of data.trackUpdates) { const { id, ...body } = u; await patchRow("routes", id, body); }

const back = await get(`routes?select=id,area_id,gpx,waypoints&id=in.(${[...rIds, ...uIds].join(",")})`);
let bad = 0;
for (const r of data.routes) { const b = back.find(x => x.id === r.id); if (!b || b.area_id !== r.area_id || canon(b.gpx ?? null) !== canon(r.gpx ?? null)) { bad++; console.log("NOT LANDED:", r.id); } }
for (const u of data.trackUpdates) { const b = back.find(x => x.id === u.id); if (!b || canon(b.gpx) !== canon(u.gpx) || (u.waypoints && canon(b.waypoints) !== canon(u.waypoints))) { bad++; console.log("NOT LANDED:", u.id); } }
console.log(`re-read: ${rIds.length + uIds.length - bad}/${rIds.length + uIds.length} landed`);
if (bad) process.exit(1);
