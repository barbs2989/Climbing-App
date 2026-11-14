#!/usr/bin/env node
// Which areas should get a researched page next? Crags, peaks and walls with climbs and no
// description, busiest first — the owner's call (2026-10-15): a facts block for every area now,
// researched prose for the busiest, an invitation to edit on the rest.
//
//   node scripts/enrich/area-page-next-batch.mjs [--limit 50] [--state Utah] [--json]
//
// Prints what each area already holds (rock, approach, parking, aspect, season) so a batch
// writes only what is missing. Read-only; anon key.
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const limit = Number(opt("--limit", 50));
const state = opt("--state", null);
const json = args.includes("--json");
const k = anonKey();
let q = `areas?select=id,name,region,area_type,route_count,blurb,approach,approach_min,parking_name,parking_note,rock,aspect,season_months,disciplines&area_type=in.(crag,peak,wall)&route_count=gt.0&blurb=is.null&order=route_count.desc&limit=${limit}`;
if (state) q += `&region=eq.${encodeURIComponent(state)}`;
const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(k) });
if (!r.ok) { console.error("read failed", r.status, await r.text()); process.exit(1); }
const rows = await r.json();
if (json) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
console.log(`${rows.length} area(s) with climbs and no description, busiest first${state ? " in " + state : ""}:\n`);
for (const a of rows) {
  const has = [a.rock ? "rock" : null, a.approach ? "approach" : null, a.approach_min ? "min" : null, a.parking_name || a.parking_note ? "parking" : null, a.aspect ? "aspect" : null, a.season_months ? "season" : null].filter(Boolean);
  console.log(`${a.id.padEnd(40)} ${String(a.route_count).padStart(6)}  ${a.area_type.padEnd(4)} ${(a.region || "").padEnd(16)} ${a.name}`);
  console.log(`${"".padEnd(40)}         has: ${has.length ? has.join(", ") : "nothing"} · types: ${(a.disciplines || []).join("/")}`);
}
