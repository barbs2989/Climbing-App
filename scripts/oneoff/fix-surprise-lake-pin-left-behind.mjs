#!/usr/bin/env node
// wa_slippery_slab_tower_ne_face puts Surprise Lake 5.2 miles from Surprise Lake.
//
// This is the "waypoint [0] left behind" shape: the row's OWN notes record waypoints [2] and [3]
// being corrected against Peakbagger for a coordinate error of about 4.5 miles west, and [0] was
// missed. So the correction is finishing a pass somebody else started, not second-guessing it.
//
// THE DEFECT IS VISIBLE WITHOUT ANY EXTERNAL SOURCE. Against the stored pin, the lake sits 5.83
// mi from a summit that is only 2.95 mi from the trailhead — the lake further from the peak than
// the road is. Against WDFW's published coordinate every neighbour collapses into one coherent
// cluster:
//
//                              from STORED pin      from WDFW pin
//     Trap Pass                     5.82 mi             0.90 mi
//     Base of Slippery Slab Tower   5.83 mi             0.67 mi
//     NE Face topout / route start  5.83 mi             0.67 mi
//     Summit                        5.83 mi             0.67 mi
//
// One waypoint 5.8 mi from every other waypoint on its own route is an outlier by construction.
//
// SOURCE: Washington Department of Fish and Wildlife publishes Surprise Lake (King County) at
// 47.66798, -121.140727, elevation 4,512 ft. Independently corroborated by the Forest Service's
// Surprise Creek Trail #1060 page, which says the trail reaches "Surprise Lake at 4,500 feet".
// The stored elevation of 4,573 ft goes with the stored coordinate and is replaced along with it.
//
// WHAT THIS DELIBERATELY DOES NOT TOUCH — the row has a SECOND, separate defect. Its trailhead
// waypoint names TUNNEL CREEK while the chain (Surprise Lake -> Trap Pass) and the stored
// distMi 4.7 both belong to the SURPRISE CREEK trailhead: the corridor-swap class documented in
// diagnose-trailhead-refusals.mjs. It is not fixed here because NO ONE PUBLISHES a coordinate for
// the Surprise Creek trailhead — the Forest Service page for Trail #1060 gives none. Writing an
// estimate is the failure this whole area exists to prevent, so the trailhead is left wrong and
// recorded rather than guessed at. Fixing the lake is independent: where Surprise Lake is does
// not depend on which trailhead you walk from.
//
// Backs up, asserts area_id, re-verifies the defect at run time, patches through patchRow, then
// re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_slippery_slab_tower_ne_face";
const EXPECT_AREA = "wa_thunder_mountain_and_slippery_slab_tower";
const WDFW = { lat: 47.66798, lng: -121.140727, elev: 4512 };

const key = anonKey();
const H = { apikey: key, Authorization: "Bearer " + key };
const R = 6371, tr = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const mi = (km) => km / 1.60934;

const read = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=eq.${ID}`, { headers: H });
  if (!r.ok) throw new Error(`read -> ${r.status}`);
  const rows = await r.json();
  if (!rows.length) throw new Error(`${ID} not found`);
  return rows[0];
};

const row = await read();
if (row.area_id !== EXPECT_AREA) { console.error(`REFUSING — area is "${row.area_id}", expected "${EXPECT_AREA}"`); process.exit(1); }
const wps = row.waypoints;
const li = wps.findIndex((w) => /surprise lake/i.test(String(w && w.name || "")));
if (li < 0) { console.error("REFUSING — no Surprise Lake waypoint"); process.exit(1); }
const lake = wps[li];
const off = mi(hav(lake, WDFW));
if (!(off > 1)) { console.error(`REFUSING — the pin is already ${off.toFixed(2)} mi from the published coordinate; nothing to fix`); process.exit(1); }

// The repair rests on the neighbours clustering. Prove that at run time rather than trusting the
// header: every other located waypoint must be nearer the published coordinate than the stored one.
const others = wps.filter((_, i) => i !== li).filter((w) => w && w.lat != null);
const closer = others.filter((w) => hav(WDFW, w) < hav(lake, w));
console.log(`${ID} — ${row.name}\n`);
console.log(`  stored : ${lake.lat}, ${lake.lng}  ${lake.elev} ft`);
console.log(`  WDFW   : ${WDFW.lat}, ${WDFW.lng}  ${WDFW.elev} ft   (${off.toFixed(2)} mi apart)\n`);
for (const w of others)
  console.log(`    ${String(w.type).padEnd(10)} ${String(w.name).slice(0, 38).padEnd(38)} stored=${mi(hav(lake, w)).toFixed(2)} mi   WDFW=${mi(hav(WDFW, w)).toFixed(2)} mi`);
console.log(`\n  neighbours closer to the published coordinate: ${closer.length}/${others.length}`);
if (closer.length !== others.length) {
  console.error("REFUSING — not every neighbour is closer to the published coordinate, so the cluster argument does not hold here.");
  process.exit(1);
}

const next = wps.slice();
next[li] = { ...lake, lat: WDFW.lat, lng: WDFW.lng, elev: WDFW.elev,
  note: (String(lake.note || "").trim() + " Coordinate and elevation corrected to the Washington Department of Fish and Wildlife's published position for Surprise Lake (King County); the Forest Service's Surprise Creek Trail #1060 page independently gives the lake at 4,500 ft. The previous pin sat 5.2 mi west, which is the same ~4.5 mi westward error this route's other waypoints were already corrected for.").trim() };

if (!WRITE) { console.log("\nDRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/surprise-lake-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`\nbackup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const a = (await read()).waypoints;
const fixed = Math.abs(Number(a[li].lat) - WDFW.lat) < 1e-6 && Math.abs(Number(a[li].lng) - WDFW.lng) < 1e-6 && Number(a[li].elev) === WDFW.elev;
const intact = a.length === wps.length;
if (!fixed || !intact) { console.error(`RECONCILE FAILED — fixed? ${fixed}; intact? ${intact}`); process.exit(1); }
console.log(`ok — re-read confirms Surprise Lake at the published coordinate, ${a.length} waypoints intact`);
console.log(`note: this row's TRAILHEAD is still wrong (names Tunnel Creek, chain is Surprise Creek). Unfixed on purpose — no published coordinate exists for that trailhead.`);
