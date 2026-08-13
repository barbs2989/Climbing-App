// Seven `approach_logistics` blocks name a trailhead on the wrong mountain — in four cases in a
// different mountain RANGE — and the Plan tab navigates by them.
//
// WHY THIS IS USER-VISIBLE. `TrailheadCard` is the only directions control that renders on the
// Plan tab, and it reads approach_logistics FIRST:
//
//   const lat = al.trailheadLat!=null ? al.trailheadLat : (wp && wp.lat!=null ? Number(wp.lat) : null)
//
// so wherever the blob disagrees with the waypoint pin, the blob wins. (The crag Overview
// "Directions to crag" button resolves these in the OPPOSITE order — that inconsistency is real
// and is deliberately not addressed here; swapping a priority would only move the error, because
// which record is right varies per route.)
//
// HOW THEY WERE CONDEMNED. Not by the pin disagreeing — two coordinates disagreeing cannot say
// which is wrong. Each claimed trailhead is measured against the route's OWN PEAK, taken from
// `areas`, which is a third and independent record
// (scripts/oneoff/probe-logistics-trailhead-vs-peak.mjs). A trailhead 209 km from the summit is
// not a judgement call. Every route below has a pin 10-20x closer to its own peak.
//
// The cause is a name collision, one level up from the id collisions this repo already records:
// there are two "White River Trailhead"s in WA 130 km apart, and two "Lake Ann"s 79 km apart.
// The fingerprint is a `trailheadDirection` string repeating verbatim across peaks that share no
// trailhead — "From the Staircase Ranger Station trailhead past Lake Cushman (FR-24)" is stamped
// on Devore Peak (Lake Chelan) and La Bohn Peak (Alpine Lakes) as well as on Olympic peaks.
//
// WHAT IT WRITES. It CLEARS the wrong keys rather than replacing them, so nothing is invented:
// TrailheadCard then falls through to the waypoint pin, which is what the route's own prose
// names. `trailheadDirection` is decided per route, because it is not always wrong with the
// coordinates — on Black Peak the prose correctly says "Rainy Pass/Lake Ann trailhead on SR-20"
// while the name and coordinate are the Mount Baker Lake Ann. Deleting correct prose because the
// coordinate beside it is wrong would be its own small act of vandalism.
//
// NOT INCLUDED: the eight routes whose approach_logistics is far from the peak but whose PIN is
// no closer (Hozomeen, Castle Peak/Pasayten, the Mox Peaks, Ragged Ridge, and three Olympic
// scrambles). Those are genuinely remote objectives where a 28-31 km approach from Ross Dam or
// Whiskey Bend is real, and there is no better record to fall back to. Distance alone does not
// condemn them.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

// expectLog: the wrong coordinate this was written against, asserted before any write.
// keepDirection: true only where the prose is right and just the coordinate is contaminated.
const PLAN = [
  { id: "wa_devore_peak_west_ridge", expectLog: [47.5155, -123.3295], keepDirection: false,
    why: "Devore Peak (Lake Chelan) carrying Staircase in the Olympics — 209 km; pin is 8.8 km" },
  { id: "wa_mount_christie_west", expectLog: [46.78669, -121.73454], keepDirection: false,
    why: "Mount Christie (Olympics) carrying Paradise on Rainier — 170 km; pin is 15.6 km" },
  { id: "wa_la_bohn_peak_southwest_slopes", expectLog: [47.5155, -123.3295], keepDirection: false,
    why: "La Bohn Peak (Alpine Lakes) carrying Staircase in the Olympics — 156 km; pin is 11.9 km" },
  { id: "wa_frying_pan_whitman_glaciers", expectLog: [47.9628, -120.94501], keepDirection: false,
    why: "Little Tahoma carrying the LAKE WENATCHEE White River TH, not Rainier's — 137 km; pin is 8.8 km" },
  { id: "wa_black_peak_northeast_ridge", expectLog: [48.8500241, -121.6861633], keepDirection: true,
    why: "Black Peak carrying the MOUNT BAKER Lake Ann — 73 km; pin is 6.1 km. Its direction prose is CORRECT" },
  { id: "wa_jack_mountain_south_face", expectLog: [48.5181, -120.7331], keepDirection: false,
    why: "Jack Mountain's south face carrying Rainy Pass PCT North — 33 km; pin (Canyon Creek) is 7.9 km" },
  { id: "wa_north_face_left_buttress", expectLog: [48.7278, -121.0628], keepDirection: false,
    why: "Castle Peak carrying Ross Dam — 32 km; pin (Manning Park) is 9.2 km" },
];

const near = (a, b) => Math.abs(+a - b) < 1e-4;
let wrote = 0;

for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,name,approach_logistics", `id=eq.${p.id}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND`); process.exit(1); }
  const al = r.approach_logistics;
  if (!al || typeof al !== "object" || Array.isArray(al)) { console.error(`${p.id}: no approach_logistics object`); process.exit(1); }

  // Refuse if someone already corrected it, rather than clobbering their work.
  if (!near(al.trailheadLat, p.expectLog[0]) || !near(al.trailheadLng, p.expectLog[1])) {
    console.error(`${p.id}: approach_logistics is now @${al.trailheadLat},${al.trailheadLng}, not the ${p.expectLog} this was written against — refusing.`);
    process.exit(1);
  }

  const next = { ...al };
  delete next.trailhead; delete next.trailheadLat; delete next.trailheadLng;
  if (!p.keepDirection) delete next.trailheadDirection;

  console.log(`${p.id}\n   ${p.why}`);
  console.log(`   clearing: "${al.trailhead}" @${al.trailheadLat},${al.trailheadLng}${p.keepDirection ? "   (keeping trailheadDirection — it is correct)" : ""}`);
  console.log(`   remaining keys: ${Object.keys(next).join(", ") || "(none)"}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", p.id, { approach_logistics: next });

  const [after] = await selectAll("routes", "id,approach_logistics,waypoints", `id=eq.${p.id}`, { pageSize: 3, key });
  const a2 = after.approach_logistics || {};
  if (a2.trailheadLat != null || a2.trailheadLng != null || a2.trailhead != null) {
    console.error(`   RECONCILE FAILED — trailhead fields still present`); process.exit(1);
  }
  if (p.keepDirection && !a2.trailheadDirection) {
    console.error(`   RECONCILE FAILED — trailheadDirection was supposed to be kept and is gone`); process.exit(1);
  }
  // The pin is what the screen now falls back to, so prove it is still there.
  const wp = (after.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead" && w.lat != null);
  if (!wp) { console.error(`   RECONCILE FAILED — no coordinated Trailhead pin to fall back to`); process.exit(1); }
  console.log(`   cleared. Plan tab now falls back to the pin: "${wp.name}" @${wp.lat},${wp.lng}\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s).` : "DRY RUN — pass --apply to write.");
