// Insert the Washington climbs a fastestknowntime.com comparison found missing from the catalog.
//
// Of ~90 climbing objectives that site lists in WA, these were absent. Walk-ups, trail runs and
// running link-ups of peaks the catalog already has were deliberately NOT added (Sawtooth Ridge
// Slam, Paddy-Go-Easy/Sherpani, Cushman Six, Goat Rocks tour, Steamboat Prow, Labyrinth, Aix):
//
//   Vesper Peak — Standard Route (Headlee Pass)   the catalog held only Vesper's north-face rock routes
//   Big Chiwaukum — West Ridge via Wildhorse Creek  a NEW peak area under the Chiwaukum Range
//   Inspiration Traverse                            filed with the Ptarmigan in Alpine and Technical Traverses
//   Enchantment Enchainment                         a NEW range-level container, Stuart Range Traverses
//   Painted Traverse                                a NEW range-level container, Glacier Peak Wilderness Traverses
//
// Multi-peak link-ups go in a range-level container, never under one peak — the same rule the
// Ptarmigan and Ragged Ridge already follow (a traverse belongs to no single summit), and routes may
// only attach to a LEAF area (trg_routes_require_leaf), which is why each needs one.
//
// The rows are in data/wa-fkt-gap-climbs.json: researched prose (no source named anywhere a
// climber reads it — scanned before the file was written), the recorded GPS line shaped by
// apply-recorded-wa-tracks.mjs, and pins taken ONLY from that recording (trailhead = its start;
// a summit = the recorded point nearest the peak's catalog coordinate, and only within 250 m).
// route_count, name_search and dominant_discipline are maintained by triggers.
//
//   node scripts/oneoff/insert-wa-fkt-gap-climbs.mjs           # dry run: preflight only
//   node scripts/oneoff/insert-wa-fkt-gap-climbs.mjs --write   # insert, then re-read
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const data = JSON.parse(fs.readFileSync(new URL("./data/wa-fkt-gap-climbs.json", import.meta.url)));
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const post = async (table, rows) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: headers(k, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify(rows) });
  const t = await r.text(); if (!r.ok) throw new Error(`POST ${table} -> ${r.status} ${t.slice(0, 400)}`);
  const out = JSON.parse(t); if (!Array.isArray(out) || out.length !== rows.length) throw new Error(`POST ${table} returned ${out.length} of ${rows.length} rows`); return out;
};

// ── Preflight: nothing here may already exist, under this id OR under this name on this area ──
const problems = [];
const areaIds = data.areas.map(a => a.id), routeIds = data.routes.map(r => r.id);
for (const a of await get(`areas?select=id&id=in.(${areaIds.join(",")})`)) problems.push(`area ${a.id} already exists`);
for (const r of await get(`routes?select=id&id=in.(${routeIds.join(",")})`)) problems.push(`route ${r.id} already exists`);
const parents = [...new Set(data.areas.map(a => a.parent_id))];
const liveParents = await get(`areas?select=id&id=in.(${parents.join(",")})`);
for (const p of parents) if (!liveParents.find(x => x.id === p)) problems.push(`parent area ${p} not found`);
for (const p of parents) { const held = await get(`routes?select=id&area_id=eq.${p}&limit=1`); if (held.length) problems.push(`parent ${p} holds routes — cannot nest an area under it`); }
const newAreaIds = new Set(areaIds);
for (const r of data.routes) {
  if (!newAreaIds.has(r.area_id)) {
    const kids = await get(`areas?select=id&parent_id=eq.${r.area_id}&limit=1`);
    if (kids.length) problems.push(`${r.id}: area ${r.area_id} has sub-areas (routes must attach to a leaf)`);
    const same = await get(`routes?select=id,name&area_id=eq.${r.area_id}`);
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    for (const s of same) if (norm(s.name) === norm(r.name)) problems.push(`${r.id}: "${s.name}" already on ${r.area_id} as ${s.id}`);
    console.log(`  ${r.id} -> ${r.area_id} (currently ${same.length} routes: ${same.map(s => s.name).join(" | ").slice(0, 160)})`);
  } else console.log(`  ${r.id} -> NEW area ${r.area_id}`);
}
for (const a of data.areas) console.log(`  area ${a.id} "${a.name}" under ${a.parent_id} (${a.area_type})`);
if (problems.length) { console.error("\nREFUSING:\n  " + problems.join("\n  ")); process.exit(1); }
console.log(`\npreflight clean: ${data.areas.length} areas, ${data.routes.length} routes`);
if (!WRITE) { console.log("Dry run. Re-run with --write to insert."); process.exit(0); }

// ── Write: areas first (routes need their leaf), one route at a time so a failure names itself ──
// One row per request: PostgREST refuses a bulk insert whose objects carry different keys
// (PGRST102), and only the peak has a prominence.
for (const a of data.areas) await post("areas", [a]);
for (const r of data.routes) await post("routes", [r]);

// A 200 is not evidence. Re-read what landed and the counts the triggers maintain.
const back = await get(`routes?select=id,area_id,name,gpx,waypoints&id=in.(${routeIds.join(",")})`);
let bad = 0;
for (const r of data.routes) { const b = back.find(x => x.id === r.id); const ok = b && b.area_id === r.area_id && b.gpx?.length === r.gpx.length && b.waypoints?.length === r.waypoints.length; if (!ok) { bad++; console.log("NOT LANDED:", r.id); } }
const counts = await get(`areas?select=id,route_count&id=in.(${[...new Set(data.routes.map(r => r.area_id))].join(",")})`);
console.log(`re-read: ${data.routes.length - bad}/${data.routes.length} routes landed; route_count ${counts.map(c => `${c.id}=${c.route_count}`).join(", ")}`);
if (bad) process.exit(1);
