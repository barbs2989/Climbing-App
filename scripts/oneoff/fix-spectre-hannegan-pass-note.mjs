#!/usr/bin/env node
// wa_spectre_peak_south_route sends you cross-country from the wrong place.
//
// Its Hannegan Pass waypoint note reads "leave the trail here to traverse cross-country toward
// Easy Ridge rather than continuing to Copper Ridge". The route contradicts itself one waypoint
// later: the Chilliwack River ford is reached "on the climbers' path past Copper Creek", 3 miles
// further on and 1,500 ft BELOW the pass (distMi 4 -> 7, elev 5,100 -> 3,600). You cannot be
// off-trail toward Easy Ridge at the pass and on a path past Copper Creek at the ford.
//
// The published record settles which half is wrong: from Hannegan Pass you DESCEND ON THE
// MAINTAINED TRAIL into the Chilliwack valley to Copper Creek Camp at about 3,200 ft, then
// continue roughly two more miles to an unmarked path dropping to the river ford. The Copper
// Ridge trail is a junction down in the valley, not a choice made at the pass.
//
// Left as a trap, this is the expensive kind: a party leaving the trail at 5,100 ft to "traverse
// cross-country toward Easy Ridge" is above the Chilliwack gorge on the wrong side of the river,
// on a multi-day Picket approach with no cell service.
//
// Two changes, kept separate on purpose:
//   1. THE FIX -- the note, corrected to what the route's own next waypoint already implies.
//   2. THE GAP -- the leg into the ford was EMPTY. It is written here from the route's own
//      recorded facts only: its two waypoint notes, its own distMi/elev deltas. No new claim.
//
// Backs up, asserts area_id, writes through patchRow, re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_spectre_peak_south_route";
const EXPECT_AREA = "wa_spectre_peak";
const WRONG = "leave the trail here to traverse cross-country toward Easy Ridge rather than continuing to Copper Ridge";
const RIGHT = "stay on the maintained trail here and descend into the Chilliwack valley; the cross-country toward Easy Ridge starts far below, after the river ford, and the Copper Ridge trail branches down in the valley rather than at the pass";
const LEG = "From the pass the maintained trail keeps going, and this is the stretch people get wrong: do not leave it here. Descend the switchbacks north-east into the Chilliwack valley, losing about 1,500 ft over roughly three miles to the Copper Creek area at a little over 3,000 ft, where the Copper Ridge trail branches away and is not your turn. Continue past it on the climbers' path and drop to the Chilliwack River ford below Easy Ridge. The crossing is cold and can run thigh-deep in early season, so pick a braided section, unclip your hipbelt, and cross before the afternoon melt comes down. The climbers' path switchbacks straight back up the far side, so this low point at 3,600 ft is the bottom of the whole approach.";

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
const pi = wps.findIndex(w => /^hannegan pass$/i.test(String(w && w.name || "").trim()));
const fi = wps.findIndex(w => /chilliwack river ford/i.test(String(w && w.name || "")));
if (pi < 0 || fi < 0) { console.error("REFUSING — could not find both the pass and the ford"); process.exit(1); }
if (!String(wps[pi].note || "").includes(WRONG)) { console.error("REFUSING — the wrong note is not present; already fixed?"); process.exit(1); }
if (fi !== pi + 1) { console.error(`REFUSING — the ford is not the waypoint after the pass (${pi} -> ${fi}); the leg text below would be wrong`); process.exit(1); }
if (String(wps[fi].directions || "").trim()) { console.error("REFUSING — the ford leg is no longer empty; do not overwrite written work"); process.exit(1); }

// The descent this repair asserts must still be what the route's own numbers say.
const drop = Number(wps[pi].elev) - Number(wps[fi].elev);
const miles = Number(wps[fi].distMi) - Number(wps[pi].distMi);
if (!(drop > 1000 && miles > 2)) {
  console.error(`REFUSING — the route no longer descends from the pass to the ford (${drop} ft over ${miles} mi). Re-read before rewriting.`);
  process.exit(1);
}

const next = wps.slice();
next[pi] = { ...wps[pi], note: String(wps[pi].note).replace(WRONG, RIGHT) };
next[fi] = { ...wps[fi], directions: LEG };

console.log(`${ID} — ${row.name}\n`);
console.log(`  [${pi}] ${wps[pi].name} (${wps[pi].elev} ft, mi ${wps[pi].distMi})`);
console.log(`  [${fi}] ${wps[fi].name} (${wps[fi].elev} ft, mi ${wps[fi].distMi})   -> ${drop} ft down over ${miles} mi\n`);
console.log(`  1. NOTE FIXED\n     was:  ...${WRONG}\n     now:  ...${RIGHT}\n`);
console.log(`  2. EMPTY LEG WRITTEN (${LEG.length} chars)\n     ${LEG.slice(0, 200)}...\n`);

if (!WRITE) { console.log("DRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/spectre-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`backup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const a = (await read()).waypoints;
const noteOk = String(a[pi].note || "").includes("stay on the maintained trail here") && !String(a[pi].note || "").includes(WRONG);
const legOk = String(a[fi].directions || "").startsWith("From the pass the maintained trail keeps going");
const intact = a.length === wps.length;
if (noteOk && legOk && intact) console.log("ok — re-read confirms the note is corrected and the ford leg is written");
else { console.error(`RECONCILE FAILED — note? ${noteOk}; leg? ${legOk}; intact? ${intact}`); process.exit(1); }
