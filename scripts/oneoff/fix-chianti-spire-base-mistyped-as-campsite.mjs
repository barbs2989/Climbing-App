#!/usr/bin/env node
// wa_chianti_spire_east_face puts a CAMPSITE at the base of a 7-pitch 5.10b.
//
// Waypoint 3 is typed `Campsite` and named "Chianti Spire / East Face (Rebel Yell) area", but its
// own leg text describes traversing "around to the obvious east side of Chianti Spire at about
// 7,900 ft" -- the base of the climb -- and in the same breath locates the actual camp somewhere
// else: "Reckon on under an hour from the col, OR FROM THE LARCH BENCH CAMP LOWER DOWN."
//
// So the app draws a tent at the start of the technical climbing, on a route where the next
// waypoint is the summit. `Base` is a drawable type (it is one of the five added when
// check:wp-styles was written -- before that all five fell through to one grey pin), so this is a
// retype, not a request for new UI.
//
// Elevation is re-homed from the waypoint's OWN text ("at about 7,900 ft"), not invented; it is
// currently null, and the summit above it is 8,420 ft.
//
// THE SHARED COORDINATE IS DELIBERATELY LEFT ALONE, and that is the part worth recording. This
// waypoint and the Summit carry an identical lat/lng, which reads as a copy-paste defect and is
// what a duplicate-pin audit will flag. Measured first: the two sit 165 m from the area's own
// summit coordinate, and this is a SPIRE -- the east-face base is directly below the summit, 520
// ft under it. Coincident pins are the honest plan-view geometry here, not an error, and
// "correcting" them would mean inventing a position for one of the two. Same discipline as the
// computed-pin alarm that measurement disproved: check before repairing.
//
// Backs up, asserts area_id, writes through patchRow, re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_chianti_spire_east_face";
const EXPECT_AREA = "wa_chianti_spire";

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

const i = wps.findIndex(w => String(w && w.type).toLowerCase() === "campsite" && /east face/i.test(String(w.name || "")));
if (i < 0) { console.error("REFUSING — no Campsite-typed east-face waypoint; the defect may already be fixed"); process.exit(1); }
const w = wps[i];
// The claim this repair rests on must still be in the route's own words.
if (!/larch bench camp lower down/i.test(String(w.directions || ""))) {
  console.error("REFUSING — the leg text no longer locates the camp elsewhere; re-read it before retyping this waypoint");
  process.exit(1);
}
const ELEV_M = String(w.directions).match(/at about ([\d,]+) ft/);
if (!ELEV_M) { console.error("REFUSING — could not re-home an elevation from the waypoint's own text"); process.exit(1); }
const elev = Number(ELEV_M[1].replace(/,/g, ""));

const next = wps.slice();
next[i] = { ...w, type: "Base", elev: w.elev == null ? elev : w.elev };

console.log(`${ID} — ${row.name}\n`);
wps.forEach((x, j) => console.log(`  [${j}] ${String(x.type).padEnd(10)} ${String(x.name).slice(0, 55).padEnd(55)} elev=${x.elev}${j === i ? "   <-- RETYPE" : ""}`));
console.log(`\n  [${i}] Campsite -> Base, elev ${w.elev} -> ${next[i].elev} (re-homed from "at about ${ELEV_M[1]} ft" in its own leg text)`);
console.log(`  shared coordinate with the Summit: LEFT ALONE — spire geometry, see header\n`);

if (!WRITE) { console.log("DRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/chianti-spire-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`backup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const a = (await read()).waypoints;
const okType = String(a[i].type) === "Base";
const okElev = Number(a[i].elev) === elev;
const okRest = a.length === wps.length && String(a[a.length - 1].type).toLowerCase() === "summit";
if (okType && okElev && okRest) console.log(`ok — re-read confirms waypoint ${i + 1} is Base at ${elev} ft, ${a.length} waypoints intact`);
else { console.error(`RECONCILE FAILED — type? ${okType}; elev? ${okElev}; rest intact? ${okRest}`); process.exit(1); }
