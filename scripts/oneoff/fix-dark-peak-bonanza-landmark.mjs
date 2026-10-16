#!/usr/bin/env node
// wa_dark_peak_dark_glacier_route routes a climber over a DIFFERENT MOUNTAIN.
//
// Its waypoint chain is Trailhead -> Dark Glacier -> "Bonanza Peak (adjacent landmark)" -> Dark
// Peak Summit. Bonanza is typed `Junction`, i.e. a travel step, sits at 9,516 ft between the
// glacier and Dark Peak's own 8,504 ft summit, and is a harder mountain by a wide margin.
//
// The route's own text proves it is not a step: the Summit waypoint's leg reads "Cross the Dark
// Glacier as a roped team ... to the true summit at 8,504 ft" -- glacier straight to summit,
// stepping over Bonanza entirely -- and the Bonanza waypoint carries NO directions at all. Every
// other waypoint on this route has them.
//
// THE PIN IS NOT WRONG, IT IS MISFILED. 48.2383,-120.8664 at 9,516 ft really is Bonanza Peak. So
// this is not the usual "one peak's data landed on another" id collision; it is a landmark
// inserted into a travel sequence. Deleting the waypoint therefore must not delete the FACT --
// Bonanza is the dominant summit on this skyline and useful for orientation -- so it is re-homed
// into the Summit waypoint's own note, which is where a climber standing there would want it.
//
// Safe with respect to positional directions: `directions` is a property ON each waypoint object,
// so removing an element carries each remaining leg with its own waypoint. Here the result is
// strictly better -- the Summit's leg already described arriving from the glacier, and after the
// removal the glacier is genuinely the waypoint before it.
//
// Backs up, asserts area_id, writes through patchRow, re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_dark_peak_dark_glacier_route";
const EXPECT_AREA = "wa_dark_peak";
const LANDMARK = "Bonanza Peak, at 9,516 ft the highest non-volcanic summit in Washington, stands about 2 km south-south-east across the head of the glacier and dominates the view from here; it is an orientation landmark from this summit, not a point on this route.";

const key = anonKey();
const read = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=eq.${ID}`,
    { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!r.ok) throw new Error(`read -> ${r.status}`);
  const rows = await r.json();
  if (!rows.length) throw new Error(`${ID} not found`);
  return rows[0];
};

const row = await read();
if (row.area_id !== EXPECT_AREA) { console.error(`REFUSING — area is "${row.area_id}", expected "${EXPECT_AREA}"`); process.exit(1); }
const wps = row.waypoints;
if (!Array.isArray(wps)) { console.error("REFUSING — no waypoint array"); process.exit(1); }

const bi = wps.findIndex(w => /bonanza/i.test(String(w && w.name || "")));
if (bi < 0) { console.error("REFUSING — no Bonanza waypoint; the defect is already gone"); process.exit(1); }
const b = wps[bi];
if (String(b.directions || "").trim()) { console.error("REFUSING — the Bonanza waypoint now carries a written leg, so it is being treated as a real step. Read it before removing."); process.exit(1); }
const si = wps.findIndex(w => String(w && w.type).toLowerCase() === "summit");
if (si < 0) { console.error("REFUSING — no Summit waypoint to re-home the landmark onto"); process.exit(1); }

const next = wps.filter((_, i) => i !== bi).map(w => {
  if (w !== wps[si]) return w;
  const note = String(w.note || "").trim();
  return { ...w, note: note ? `${note} ${LANDMARK}` : LANDMARK };
});

console.log(`${ID} — ${row.name}\n`);
console.log(`  BEFORE (${wps.length}):`);
wps.forEach((w, i) => console.log(`    [${i}] ${String(w.type).padEnd(10)} ${w.name}${i === bi ? "   <-- REMOVING (a landmark, not a step)" : ""}`));
console.log(`\n  AFTER (${next.length}):`);
next.forEach((w, i) => console.log(`    [${i}] ${String(w.type).padEnd(10)} ${w.name}`));
console.log(`\n  landmark re-homed onto the Summit note:\n    ${LANDMARK}\n`);

if (!WRITE) { console.log("DRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/dark-peak-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`backup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const after = await read();
const a = after.waypoints;
const gone = !a.some(w => /bonanza/i.test(String(w && w.name || "")));
const kept = a.some(w => String(w.note || "").includes("highest non-volcanic summit"));
const count = a.length === wps.length - 1;
if (gone && kept && count) console.log(`ok — re-read confirms ${wps.length} -> ${a.length} waypoints, Bonanza removed as a step and kept as a landmark`);
else { console.error(`RECONCILE FAILED — removed? ${gone}; landmark kept? ${kept}; count ok? ${count}`); process.exit(1); }
