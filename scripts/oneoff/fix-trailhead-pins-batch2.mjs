// Four trailhead pins their own route's prose contradicts.
//
// Surfaced by probe-trailhead-consensus.mjs, then CONFIRMED BY READING — the majority vote is a
// hypothesis and has been wrong twice already (the Alpental/Rainier "Snow Lake" pair, and
// Esmeralda, where the lone dissenting pin was the correct one).
//
// TWO OF THESE ARE NAME BUGS, NOT COORDINATE BUGS, and that distinction matters: the pin is in
// the right PLACE and calls itself the wrong trailhead, which no geometry test can see.
//
//   wa_beckey_davis        pin "Snow Lakes Trailhead" @47.527315,-120.820942 — 66 m from the
//   wa_energizer_bunny     Stuart Lake trailhead, and both routes' prose reads "Stuart Lake
//                          Trailhead -> Stuart Lake Trail (2.5 mi) -> Colchuck Lake Trail".
//                          Snow Lakes is a different trailhead 8.5 km away. Rename only; the
//                          coordinate is already right and is NOT touched.
//
//   wa_mount_larrabee_south_ridge   prose: "Park at the Twin Lakes Trailhead at the end of
//                          FS-3065". Its own 2,155 m-distant pin disagrees, and its gpx track
//                          starts at the consensus — the one case here where the track is real
//                          and independent rather than derived from the pin.
//
//   wa_direct_southwest_buttress    prose: "Shares the standard Southwest Buttress's approach
//                          ... from the Cascade River Road trailhead". That standard route is in
//                          the 9-route consensus; this pin sits 6.3 km off it.
//
// No coordinate is invented: each is the consensus of routes that name the same trailhead.
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  { id: "wa_beckey_davis", expect: [47.527315, -120.820942],
    set: { name: "Stuart Lake Trailhead" },
    why: "prose names the Stuart Lake Trailhead; the pin is 66 m from it but called Snow Lakes" },
  { id: "wa_energizer_bunny", expect: [47.527315, -120.820942],
    set: { name: "Stuart Lake Trailhead" },
    why: "same — prose names Stuart Lake, pin called Snow Lakes" },
  { id: "wa_mount_larrabee_south_ridge", expect: [48.9435, -121.6625],
    set: { lat: 48.95176, lng: -121.6358 },
    why: "prose names Twin Lakes TH at the end of FS-3065; its own gpx track starts there" },
  { id: "wa_direct_southwest_buttress", expect: [48.5136, -121.1964],
    set: { lat: 48.4926, lng: -121.1176 },
    why: "prose says it shares the standard Southwest Buttress approach, which is the consensus" },
];

let wrote = 0;
for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,name,waypoints", `id=eq.${p.id}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND`); process.exit(1); }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
  if (i < 0) { console.error(`${p.id}: no Trailhead waypoint`); process.exit(1); }
  const cur = wps[i];

  // Assert the current value, so a correction someone else already made is refused, not clobbered.
  if (Math.abs(+cur.lat - p.expect[0]) > 1e-4 || Math.abs(+cur.lng - p.expect[1]) > 1e-4) {
    console.error(`${p.id}: pin is now ${cur.lat},${cur.lng}, not the ${p.expect} this was written against — refusing.`);
    process.exit(1);
  }

  console.log(`${p.id}\n   ${p.why}`);
  console.log(`   "${cur.name}" @${cur.lat},${cur.lng}`);
  console.log(`   ->  "${p.set.name || cur.name}" @${p.set.lat ?? cur.lat},${p.set.lng ?? cur.lng}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", p.id, { waypoints: wps.map((w, n) => n === i ? { ...w, ...p.set } : w) });

  const [after] = await selectAll("routes", "id,waypoints", `id=eq.${p.id}`, { pageSize: 3, key });
  const got = (after.waypoints || []).find(w => String(w.type || "").toLowerCase() === "trailhead");
  const okName = !p.set.name || got.name === p.set.name;
  const okLat = p.set.lat == null || Math.abs(+got.lat - p.set.lat) < 1e-6;
  const okLng = p.set.lng == null || Math.abs(+got.lng - p.set.lng) < 1e-6;
  if (!got || !okName || !okLat || !okLng) {
    console.error(`   RECONCILE FAILED — now "${got && got.name}" @${got && got.lat},${got && got.lng}`);
    process.exit(1);
  }
  if ((after.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  console.log(`   reconciled: "${got.name}" @${got.lat},${got.lng}  (${after.waypoints.length} waypoints intact)\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s).` : "DRY RUN — pass --apply to write.");
