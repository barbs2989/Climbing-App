// Slice ai: three more coordinate disputes, each settled by a DISTANCE the sources state.
//
// None could be settled by a published trailhead coordinate — these sources describe the trailhead
// by its distance from a landmark rather than by latitude/longitude. So each is resolved by
// triangulation, a weaker instrument than an exact coordinate, and that is recorded per route.
//
//   wa_mount_ferry_standard -> LOG. The Sol Duc Falls shelter is at 47.9522,-123.8208 and is
//     documented as 0.68 miles from the Sol Duc trailhead. The PIN sits 77 m from that shelter,
//     i.e. AT the falls, two thirds of a mile into the hike. The blob sits 1,170 m away (~0.73 mi),
//     which is the stated distance. The pin is a point on the trail — the same shape as Little Big
//     Chief's blob in the previous batch, seen from the opposite side.
//
//   wa_mount_goode_northeast_buttress -> PIN. Bridge Creek Trailhead is a paved lot on the NORTH
//     side of SR-20 at mile 159, "just over 1 mile east of Rainy Pass" (48.5158,-120.7343). The pin
//     is 1.03 mi from the pass; the blob 0.59 mi. WEAKER THAN THE OTHERS: 937 m apart, both are
//     plausible roadside points, and this rests on the stated mileage alone.
//
//   wa_trapper_mountain_south_slopes -> PIN. Row-local, no external source needed: the route's own
//     approach says "take the Stehekin Valley Road (or park shuttle) about 4.5 miles to Harlequin
//     Campground", and the pin is "Harlequin Campground / Stehekin River Trail trailhead". The blob
//     names the Harlequin BRIDGE, a different point 652 m away.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const PLAN = [
  ["wa_mount_ferry_standard", "log"],
  ["wa_mount_goode_northeast_buttress", "pin"],
  ["wa_trapper_mountain_south_slopes", "pin"],
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

let wrote = 0, skipped = 0;
for (const [id, winner] of PLAN) {
  const [r] = await selectAll("routes", "id,name,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  if (!r) { console.error(`${id}: NOT FOUND`); process.exit(1); }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  if (i < 0 || !al) { console.error(`${id}: missing a record — refusing`); process.exit(1); }
  const pLat = num(wps[i].lat), pLng = num(wps[i].lng);
  const lLat = num(al.trailheadLat), lLng = num(al.trailheadLng);
  if (pLat === null || lLat === null) { console.error(`${id}: a record has no coordinate — refusing`); process.exit(1); }
  const apart = Math.round(hav(pLat, pLng, lLat, lLng));
  if (apart <= 500) { console.log(`${id}: records now agree (${apart} m) — skipping`); skipped++; continue; }

  let body;
  if (winner === "log") {
    body = { waypoints: wps.map((w, n) => n === i ? { ...w, name: al.trailhead || w.name, lat: lLat, lng: lLng } : w) };
    console.log(`${id} (${apart} m, log wins)\n   pin "${wps[i].name}" -> "${al.trailhead}" @${lLat},${lLng}`);
  } else {
    const next = { ...al, trailhead: wps[i].name, trailheadLat: pLat, trailheadLng: pLng };
    delete next.trailheadDirection;
    body = { approach_logistics: next };
    console.log(`${id} (${apart} m, pin wins)\n   log "${al.trailhead}" -> "${wps[i].name}" @${pLat},${pLng}  (direction dropped)`);
  }
  if (!APPLY) { console.log("   (dry run)\n"); continue; }
  await patchRow("routes", id, body);
  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const a2 = chk.approach_logistics || {};
  if ((chk.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — ${now} m apart`); process.exit(1); }
  console.log(`   reconciled to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned.`);

// LEFT for a sourced pass, deliberately:
//   wa_ridge_traverse_from_east_fury (541 m) — both name the Ross Dam Trailhead; the blob adds
//     "milepost 134". No published coordinate found, and choosing between two plausible roadside
//     points without one is a guess.
//   wa_south_face_5 (1,536 m) — its own prose names "the small pullout just before Goodell Creek
//     Campground", which is the pin, while EIGHT sibling Picket routes were resolved to the Upper
//     Goodell Group Camp in an earlier batch. Row-local evidence and the siblings disagree, and
//     resolving that by majority is exactly what these appliers exclude by construction.
