// Two Mount Stuart routes carry a trailhead pin their own approach prose contradicts.
//
// Found by scripts/oneoff/probe-trailhead-consensus.mjs and then CONFIRMED BY READING, because
// the probe's majority vote was wrong about which pin was the outlier — see its header.
//
//   wa_mount_stuart_west_ridge        prose: "Esmeralda Trailhead (end of North Fork Teanaway
//                                     Road, ~4,243 ft)"   pin: 47.43656,-120.93697   CORRECT,
//                                     and it is the MINORITY pin. Not touched.
//
//   wa_mount_stuart_cascadian_couloir prose: "the Esmeralda (DeRoux Campground/Teanaway)
//                                     trailhead at the end of North Fork Teanaway River Road
//                                     (FR 9737), elevation ~4,243 ft"
//                                     pin: 47.427,-120.892 — 3.5 km from that road end.
//                                     COORDINATE wrong, name right.
//
//   wa_mount_stuart_north_ridge       prose: "from the north via the Stuart Lake Trailhead
//                                     (reached via Icicle Creek Road and FR 7601 out of
//                                     Leavenworth)" — a DIFFERENT trailhead on the opposite
//                                     side of the mountain. Its pin is named "Esmeralda Basin
//                                     Trailhead" at 47.427,-120.892. NAME AND COORDINATE wrong.
//
// Neither new value is invented. The Esmeralda road end comes from west_ridge's own pin; the
// Stuart Lake Trailhead coordinate is the catalog's own consensus across 30 routes that name it.
// Every replacement is a value this catalog already holds, on a row that agrees with the prose.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const ESMERALDA = { lat: 47.43656, lng: -120.93697 };          // west_ridge's pin, the FR 9737 road end
const STUART_LAKE = { lat: 47.5278, lng: -120.8205, name: "Stuart Lake Trailhead" }; // consensus of 30

const PLAN = [
  { id: "wa_mount_stuart_cascadian_couloir", expectLat: 47.427, expectLng: -120.892,
    set: { lat: ESMERALDA.lat, lng: ESMERALDA.lng },
    why: "prose names the FR 9737 road end; pin was 3.5 km away" },
  { id: "wa_mount_stuart_north_ridge", expectLat: 47.427, expectLng: -120.892,
    set: { lat: STUART_LAKE.lat, lng: STUART_LAKE.lng, name: STUART_LAKE.name },
    why: "prose names the Stuart Lake Trailhead, north side — the pin named the south-side trailhead" },
];

let wrote = 0;
for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,name,waypoints", `id=eq.${p.id}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND — refusing to guess`); process.exit(1); }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
  if (i < 0) { console.error(`${p.id}: no Trailhead waypoint — refusing`); process.exit(1); }

  /* Assert the CURRENT value before writing, so a correction someone else has already made is
     refused rather than clobbered. A blind write here would silently undo their work. */
  const cur = wps[i];
  if (Math.abs(+cur.lat - p.expectLat) > 1e-4 || Math.abs(+cur.lng - p.expectLng) > 1e-4) {
    console.error(`${p.id}: trailhead is now ${cur.lat},${cur.lng}, not the ${p.expectLat},${p.expectLng} this fix was written against — someone else has changed it. Refusing.`);
    process.exit(1);
  }

  console.log(`${p.id}`);
  console.log(`   ${p.why}`);
  console.log(`   "${cur.name}" @${cur.lat},${cur.lng}`);
  console.log(`   ->  "${p.set.name || cur.name}" @${p.set.lat},${p.set.lng}`);

  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  const next = wps.map((w, n) => n === i ? { ...w, ...p.set } : w);
  await patchRow("routes", p.id, { waypoints: next });

  // A 200 is not evidence. Re-read and compare.
  const [after] = await selectAll("routes", "id,waypoints", `id=eq.${p.id}`, { pageSize: 3, key });
  const got = (after.waypoints || []).find(w => String(w.type || "").toLowerCase() === "trailhead");
  const ok = got && Math.abs(+got.lat - p.set.lat) < 1e-6 && Math.abs(+got.lng - p.set.lng) < 1e-6
    && (!p.set.name || got.name === p.set.name);
  if (!ok) { console.error(`   RECONCILE FAILED — now ${got && got.name} @${got && got.lat},${got && got.lng}`); process.exit(1); }
  console.log(`   reconciled: "${got.name}" @${got.lat},${got.lng}`);
  // The other waypoints must be untouched — this writes the whole array back.
  if ((after.waypoints || []).length !== wps.length) {
    console.error("   WAYPOINT COUNT CHANGED — aborting"); process.exit(1);
  }
  console.log(`   ${after.waypoints.length} waypoints intact\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s).` : "DRY RUN — pass --apply to write.");
