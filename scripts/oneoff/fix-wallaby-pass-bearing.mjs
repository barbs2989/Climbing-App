#!/usr/bin/env node
// wa_wallaby_peak_standard tells you to turn the wrong way at the pass.
//
// The Kangaroo Pass waypoint's note reads "leave the approach path and turn NORTHEAST onto
// Wallaby's southwest ridge". Measured from the route's own pins, from that pass:
//
//     pass -> next waypoint (7,400 ft ridge-to-face swing) : 0.51 km, 118 deg  ESE
//     pass -> Wallaby Peak summit                          : 1.15 km,  95 deg  E
//
// Northeast is 045. The note is off by 50-70 degrees, and it is self-inconsistent besides: you
// cannot gain the SOUTHWEST ridge of a peak by walking away from it.
//
// This is the leg where it matters most. The same waypoint chain says the tread "disappears on
// rock, so the rest is route-finding", and the next waypoint's own note says "boot tracks are
// sparse and easy to lose in poor visibility" -- which is precisely when a party stops reading
// the ground and starts trusting the written bearing. Northeast off Kangaroo Pass drops into the
// Spire Gulch side rather than onto the ridge.
//
// No audit can see this. The pins are correct, the order is correct, the distances are monotonic,
// and every geometric gate passes; only the PROSE is wrong, and only against the pins beside it.
// Same class as the descent_text that reversed a different route than its own waypoints described.
//
// Backs up, asserts area_id, writes through patchRow, re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_wallaby_peak_standard";
const EXPECT_AREA = "wa_wallaby_peak";
const WRONG = "turn northeast onto Wallaby's southwest ridge";
const RIGHT = "turn east onto Wallaby's southwest ridge";

const key = anonKey();
const read = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=eq.${ID}`,
    { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!r.ok) throw new Error(`read -> ${r.status}`);
  const rows = await r.json();
  if (!rows.length) throw new Error(`${ID} not found`);
  return rows[0];
};

const bearing = (a, b) => {
  const dN = (b.lat - a.lat) * 111.32, dE = (b.lng - a.lng) * 111.32 * Math.cos(a.lat * Math.PI / 180);
  return { km: Math.sqrt(dN * dN + dE * dE), deg: (Math.atan2(dE, dN) * 180 / Math.PI + 360) % 360 };
};

const row = await read();
if (row.area_id !== EXPECT_AREA) { console.error(`REFUSING — area is "${row.area_id}", expected "${EXPECT_AREA}"`); process.exit(1); }
const wps = row.waypoints;
const pi = wps.findIndex(w => /kangaroo pass/i.test(String(w && w.name || "")));
const si = wps.findIndex(w => String(w && w.type).toLowerCase() === "summit");
if (pi < 0 || si < 0) { console.error("REFUSING — could not find both the pass and the summit"); process.exit(1); }
if (!String(wps[pi].note || "").includes(WRONG)) { console.error("REFUSING — the wrong bearing is not present; already fixed?"); process.exit(1); }

// Re-measure rather than trust the header: the repair is only correct if the geometry still says so.
const toSummit = bearing(wps[pi], wps[si]);
const toNext = pi + 1 < wps.length ? bearing(wps[pi], wps[pi + 1]) : null;
console.log(`${ID} — ${row.name}\n`);
console.log(`  from "${wps[pi].name}":`);
if (toNext) console.log(`    -> ${wps[pi + 1].name}: ${toNext.km.toFixed(2)} km, ${toNext.deg.toFixed(0)} deg`);
console.log(`    -> ${wps[si].name}: ${toSummit.km.toFixed(2)} km, ${toSummit.deg.toFixed(0)} deg`);
if (!(toSummit.deg > 60 && toSummit.deg < 130)) {
  console.error(`\nREFUSING — the summit no longer bears roughly east (${toSummit.deg.toFixed(0)} deg). Re-read before rewriting the note.`);
  process.exit(1);
}

const next = wps.slice();
next[pi] = { ...wps[pi], note: String(wps[pi].note).replace(WRONG, RIGHT) };
console.log(`\n  note: "${WRONG}"\n     -> "${RIGHT}"\n`);

if (!WRITE) { console.log("DRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/wallaby-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`backup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const a = (await read()).waypoints;
const fixed = String(a[pi].note || "").includes(RIGHT) && !String(a[pi].note || "").includes(WRONG);
const intact = a.length === wps.length;
if (fixed && intact) console.log("ok — re-read confirms the bearing now reads east and the array is intact");
else { console.error(`RECONCILE FAILED — note fixed? ${fixed}; array intact? ${intact}`); process.exit(1); }
