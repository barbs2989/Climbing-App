#!/usr/bin/env node
// wa_point_success_south_side is built on an approach the park no longer lists.
//
// Its trailhead is "Westside Road / Dry Creek (Tahoma Creek) Trailhead", and the whole distMi
// chain is measured from there -- Indian Henry's Hunting Ground at 7 mi, and everything above it.
// Two independent sources say that corridor is gone:
//
//   - Route beta for Success Cleaver states the only remaining approach is from Longmire via the
//     Wonderland Trail, the Tahoma Creek Trail being closed for flood hazard.
//   - The National Park Service page for Indian Henry's Hunting Ground -- this route's OWN second
//     waypoint -- lists exactly two accesses, Kautz Creek (11.5 mi round trip) and Longmire
//     (13 mi round trip). Westside Road and Tahoma Creek appear nowhere on it.
//
// WHAT THIS DOES NOT DO, and why. It does not swap the trailhead. Two reasons, both of which
// would make a "cleaner" fix wrong:
//
//   1. The existing note is a REASONED CHOICE, not an accident: it argues against the previous DB
//      value (Longmire Wilderness Information Center, "a permit/ranger station ~3.5 miles away")
//      and cites this point sitting ~30 m from the recorded GPS track's start. Somebody looked.
//      Overturning that on a search result would be replacing evidence with a hunch.
//   2. Every distMi on this route is anchored to that trailhead, so moving it needs a REBASE, and
//      the offset from Longmire or Kautz Creek is not in this route's own data. That is exactly
//      the trap diagnose-trailhead-refusals.mjs exists to stop -- a move alone writes confident
//      wrong numbers where there is currently an honest one.
//
// So this records the closure where a climber reads it BEFORE driving, and leaves the
// restructuring to a pass that can source the distances. The dangerous state was silence: the
// note explains the road gate in detail and says nothing about the trail beyond it being closed,
// which reads as "walk or bike past the gate and carry on".
//
// Backs up, asserts area_id, writes through patchRow, re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_point_success_south_side";
const EXPECT_AREA = "wa_point_success";
const WARNING = " CHECK THIS BEFORE YOU DRIVE: the National Park Service's own page for Indian Henry's Hunting Ground — the next waypoint on this route — lists only two accesses to it, Kautz Creek (11.5 mi round trip) and Longmire (13 mi round trip). The Westside Road and Tahoma Creek corridor is not among them, and route beta for Success Cleaver reports the Tahoma Creek Trail closed for flood hazard, leaving Longmire via the Wonderland Trail as the standard approach. The mileages recorded on this route's waypoints are measured from this Dry Creek gate, so they describe the older corridor rather than a Longmire or Kautz Creek start — treat them as approximate if you approach from either of those, and confirm current trail status with a wilderness information centre.";

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
const ti = wps.findIndex(w => String(w && w.type).toLowerCase() === "trailhead");
if (ti !== 0) { console.error(`REFUSING — trailhead is at index ${ti}, expected 0`); process.exit(1); }
if (!/tahoma creek|westside road/i.test(String(wps[ti].name || "") + String(wps[ti].note || ""))) {
  console.error("REFUSING — the trailhead is no longer the Westside/Tahoma Creek one; this warning would be wrong");
  process.exit(1);
}
if (String(wps[ti].note || "").includes("CHECK THIS BEFORE YOU DRIVE")) { console.error("REFUSING — already recorded"); process.exit(1); }
// The warning names the next waypoint explicitly; make sure it still is that waypoint.
if (!/indian henry/i.test(String(wps[1] && wps[1].name || ""))) {
  console.error(`REFUSING — waypoint 2 is "${wps[1] && wps[1].name}", not Indian Henry's; the warning's wording would be wrong`);
  process.exit(1);
}

const next = wps.slice();
next[ti] = { ...wps[ti], note: String(wps[ti].note || "").trim() + WARNING };

console.log(`${ID} — ${row.name}\n`);
console.log(`  [0] ${wps[ti].name}`);
console.log(`  [1] ${wps[1].name} — recorded at ${wps[1].distMi} mi from that gate\n`);
console.log(`  note ${String(wps[ti].note || "").length} -> ${next[ti].note.length} chars; trailhead, coordinates and every distMi LEFT UNCHANGED\n`);
console.log(WARNING.trim().slice(0, 260) + "...\n");

if (!WRITE) { console.log("DRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/point-success-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`backup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const a = (await read()).waypoints;
const warned = String(a[0].note || "").includes("CHECK THIS BEFORE YOU DRIVE");
const unchanged = a.length === wps.length && a[0].lat === wps[0].lat && a[1].distMi === wps[1].distMi;
if (warned && unchanged) console.log("ok — re-read confirms the closure is recorded and nothing else moved");
else { console.error(`RECONCILE FAILED — warning present? ${warned}; everything else unchanged? ${unchanged}`); process.exit(1); }
