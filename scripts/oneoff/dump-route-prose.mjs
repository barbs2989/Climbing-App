#!/usr/bin/env node
// Print everything a route holds that could source a waypoint `directions` leg.
//
// `write-waypoint-directions.mjs`'s sourcing rule is that every leg is restated from the
// route's OWN on-file prose. That rule is only followable if the prose is easy to put in
// front of whoever is writing — otherwise the temptation is to write something plausible
// from general knowledge, which is the one outcome the field must not contain.
//
// Prints the waypoint array with its INDEX, so the positional convention is unambiguous:
// directions[i] is the leg INTO waypoint i, i.e. how you get here from waypoint i-1.
//
// Usage: node scripts/oneoff/dump-route-prose.mjs <route_id> [<route_id> ...]
import { selectAll as _selectAll } from "../lib/supabase-env.mjs";

// Column names are asserted against the live table by --cols, not guessed. `trailhead` and
// `notes` are NOT columns (the first draft asked for both and got a 42703); the trailhead is
// carried inside `approach_logistics` and by the first waypoint.
const COLS = [
  "id", "name", "grade", "pitches", "waypoints",
  "approach", "approach_logistics", "approach_variants", "itinerary",
  "descent", "descent_text", "beta", "overview", "description",
  "pitch_detail", "season", "best_season", "road", "access", "pro_tips", "hazards",
];
const PROSE = ["season", "best_season", "overview", "description", "approach", "approach_logistics",
  "approach_variants", "itinerary", "descent", "descent_text", "beta", "pro_tips", "road", "access", "hazards"];

async function selectAll(t, s, f, o) {
  let last;
  for (let a = 1; a <= 5; a++) {
    try { return await _selectAll(t, s, f, o); }
    catch (e) { last = e; if (a < 5) await new Promise((x) => setTimeout(x, 3000 * a)); }
  }
  throw new Error(`read failed after 5 attempts (${f || t}): ${last?.message}`);
}

const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!ids.length) { console.error("usage: dump-route-prose.mjs <route_id> [...]"); process.exit(1); }

for (const id of ids) {
  const rows = await selectAll("routes", COLS.join(","), `id=eq.${id}`, { pageSize: 5 });
  if (rows.length !== 1) { console.log(`\n### ${id} — matched ${rows.length} rows, NOT 1. Wrong id.\n`); continue; }
  const r = rows[0];
  console.log(`\n${"=".repeat(78)}\n### ${r.id} — ${r.name}   ${r.grade || ""} ${r.pitches ? r.pitches + "p" : ""}\n${"=".repeat(78)}`);

  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  console.log(`\n--- WAYPOINTS (${wps.length}) — directions[i] is the leg INTO waypoint i ---`);
  wps.forEach((w, i) => {
    const dir = w.directions && String(w.directions).trim();
    console.log(`  [${i}] ${w.type || "?"} — ${w.name || "(unnamed)"}   distMi=${w.distMi ?? "-"} elev=${w.elev ?? "-"} lat=${w.lat ?? "-"} lng=${w.lng ?? "-"}`);
    if (w.note) console.log(`        note: ${w.note}`);
    console.log(`        directions: ${dir ? dir : "(EMPTY — writeable)"}`);
  });

  for (const c of PROSE) {
    const v = r[c];
    if (v == null || v === "") continue;
    console.log(`\n--- ${c} ---\n${typeof v === "string" ? v : JSON.stringify(v, null, 2)}`);
  }
  if (Array.isArray(r.pitch_detail) && r.pitch_detail.length) {
    console.log(`\n--- pitch_detail (${r.pitch_detail.length}) ---`);
    r.pitch_detail.forEach((p, i) => console.log(`  ${i + 1}. ${JSON.stringify(p)}`));
  }
}
