// Census: every catalog route that can tick a PEAK-LIST peak.
//
// lib/lists.js peakClimbed() counts a peak when a logged route's area is the peak (or one of its
// `also` areas). This lists every such route with the facts needed to judge whether climbing it
// actually reaches the summit, so a boulder problem or a base-of-the-tower single pitch cannot
// tick Castleton Tower.
//
// Read-only. Needs a DB slot (~/dev/db-throttle/dbslot.mjs). Writes JSON to the path given
// (default research-data/list-summit-audit/census.json).
//   --check   write the census to the temp dir instead and exit 1 if any route on a list peak has
//             no verdict in audit.json (a route added after the audit).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SUPABASE_URL, headers as h, anonKey } from "./lib/supabase-env.mjs";
import { PEAK_ROSTERS } from "../lib/lists.js";

const CHECK = process.argv.includes("--check");
const out = process.argv.slice(2).find(a => !a.startsWith("--")) ||
  (CHECK ? path.join(os.tmpdir(), `list-summit-census-${process.pid}.json`) : "research-data/list-summit-audit/census.json");
const areaToPeak = new Map();
for (const [list, peaks] of Object.entries(PEAK_ROSTERS)) {
  for (const p of peaks) {
    for (const a of [p.id, ...(p.also || [])]) {
      const e = areaToPeak.get(a) || { peak: p.id, name: p.name, lists: [], viaAlso: a !== p.id };
      if (!e.lists.includes(list)) e.lists.push(list);
      areaToPeak.set(a, e);
    }
  }
}
const ids = [...areaToPeak.keys()];
const cols = "id,name,area_id,discipline,grade,pitches,length_m,high_point_ft,gain_ft,outing_shape,description,descent,descent_text";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rows = [];
const areas = [];
for (let i = 0; i < ids.length; i += 40) {
  const chunk = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${cols}&area_id=in.(${chunk})`, { headers: h(anonKey()) });
  if (!r.ok) { console.error("HTTP", r.status, await r.text()); process.exit(1); }
  rows.push(...await r.json());
  const a = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,parent_id&id=in.(${chunk})`, { headers: h(anonKey()) });
  if (a.ok) areas.push(...await a.json());
  await sleep(400);
}
const trim = s => (typeof s === "string" ? s.slice(0, 400) : s ? JSON.stringify(s).slice(0, 400) : null);
const census = rows.map(r => {
  const p = areaToPeak.get(r.area_id);
  return { id: r.id, name: r.name, area: r.area_id, peak: p.peak, peakName: p.name, lists: p.lists, viaAlso: p.viaAlso,
    discipline: r.discipline, grade: r.grade, pitches: r.pitches, lengthM: r.length_m, highFt: r.high_point_ft, gainFt: r.gain_ft,
    shape: r.outing_shape, desc: trim(r.description), descent: trim(r.descent_text || r.descent) };
}).sort((a, b) => a.peak.localeCompare(b.peak) || a.id.localeCompare(b.id));
const areaInfo = Object.fromEntries(areas.map(a => [a.id, a]));
const missing = ids.filter(id => !areaInfo[id]);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), areaCount: ids.length, missingAreas: missing, areas: areaInfo, routes: census }, null, 1));
const byDisc = {};
for (const r of census) byDisc[r.discipline] = (byDisc[r.discipline] || 0) + 1;
console.log(`areas ${ids.length} (missing in DB: ${missing.length}), routes ${census.length}`, byDisc);
if (CHECK) {
  // Routes added to a list peak since the audit tick it until someone reviews them (unless they are
  // bouldering or top-rope, refused by discipline). List them so the next review pass can.
  const audit = JSON.parse(fs.readFileSync("research-data/list-summit-audit/audit.json", "utf8"));
  const known = new Set(audit.routes.map(r => r.id));
  const fresh = census.filter(r => !known.has(r.id));
  if (fresh.length) {
    console.error(`${fresh.length} route(s) on list peaks have no summit verdict yet (census at ${out}):`);
    for (const r of fresh.slice(0, 50)) console.error(`  ${r.peak}  ${r.id}  ${r.name} (${r.discipline} ${r.grade || ""})`);
    process.exit(1);
  }
  console.log("every route on a list peak has a summit verdict");
}
