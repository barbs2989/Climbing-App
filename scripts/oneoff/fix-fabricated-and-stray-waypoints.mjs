// Waypoint repairs, and every one was re-verified in this session rather than taken from the
// research summary — the arithmetic is cheap and the claims are exact, so there is no excuse
// for trusting them second-hand.
//
// THE SHAPE OF THIS CLASS: across the 30 waypoint verdicts, the ELEVATION is usually the sound
// half and the COORDINATE is usually the wrong one. The right repair is therefore to DROP the
// coordinate, not to "correct" the elevation — the audit prompt says so in as many words, and
// this catalog already carries 346 computed coordinates. Nulling degrades honestly: wpPlaced()
// stops drawing the pin, the waypoint row renders "No coordinate on file — this point is not on
// the map above", and it is deliberately given no tap handler, so nothing offers a dead link.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // -------------------------------------------------------------------------------------------
  // wa_argonaut_peak_east_ridge — Long's Pass belongs to a DIFFERENT APPROACH, not to this route.
  // Verified here: the row's own 692-point gpx starts and ends 3 m apart (an out-and-back), its
  // Beverly Turnpike trailhead pin sits 8 m from that track and its summit pin 8 m — so the
  // track is genuine and correctly anchored at both ends — while Long's Pass is 3,600 m away.
  // Distance alone would not settle it, because a peak with two genuine approaches looks exactly
  // like this. What settles it is internal: Long's Pass is 1.9 km WEST of the track's entire
  // bounding box, so this line never passes within sight of it, and the row's OWN bivy note
  // attributes Longs Pass to the separate Esmeralda Trailhead approach. Its distMi of 2.5 also
  // puts it on the Beverly Creek Trail, well short of any pass.
  //
  // The COORDINATE is fine — it is a good coordinate for Longs Pass. The pin is simply on the
  // wrong route, so the whole waypoint goes rather than its position.
  { kind: "drop", route: "wa_argonaut_peak_east_ridge", path: "waypoints",
    expect: "a8b573853d7f760b", drop: [{ i: 0, name: "Long's Pass" }],
    why: "belongs to the separate Esmeralda approach, which the row's own bivy note says; 1.9 km outside this route's own track bounding box" },

  // -------------------------------------------------------------------------------------------
  // wa_mount_duckabush_standard.waypoints[6] — INTERPOLATED. Re-measured here: it sits 0.02 m
  // off the straight chord between waypoints[4] and waypoints[7], at t = 0.846171. Two
  // centimetres off a chord over that span is not a coincidence; it is a computed point. The
  // elevation is not disproven and stays — the DEM disagreement an earlier pass saw is an
  // artifact of measuring the ground under a coordinate that was never observed.
  { kind: "set", route: "wa_mount_duckabush_standard", path: "waypoints.6.lat",
    expect: "6bb9153362a3b7ac", value: null,
    why: "computed: 0.02 m off the chord between waypoints 4 and 7 at t=0.846171" },
  { kind: "set", route: "wa_mount_duckabush_standard", path: "waypoints.6.lng",
    expect: "4cfb46c166f53444", value: null, why: "the longitude half of the same computed point" },

  // -------------------------------------------------------------------------------------------
  // wa_mount_johnson_standard.waypoints[6] "Corkscrew ledge crux" — INTERPOLATED. Re-measured
  // here: 3.02 m off the chord between waypoints[4] and waypoints[7] at t = 0.752350, i.e. three
  // quarters of the way along. The 7,300 ft elevation is the credible half and stays.
  { kind: "set", route: "wa_mount_johnson_standard", path: "waypoints.6.lat",
    expect: "59cc6e9c5f2aad5e", value: null,
    why: "computed: 3.02 m off the chord between waypoints 4 and 7 at t=0.752350" },
  { kind: "set", route: "wa_mount_johnson_standard", path: "waypoints.6.lng",
    expect: "717961b2bd3a1499", value: null, why: "the longitude half of the same computed point" },

  // -------------------------------------------------------------------------------------------
  // wa_concerto_in_c_for_drill_and_hammer — a DUPLICATE PIN nobody had flagged, found while
  // checking this row for interpolation. waypoints[1] "Grassy saddle (South Face routes)" and
  // waypoints[2] "South Face grassy saddle" carry byte-identical coordinates (48.19575,
  // -121.65485) and the identical elevation 3,249 — one place recorded twice under two names.
  // waypoints[2] is the strictly poorer copy: no distMi and an empty note, against a real
  // 3-mile rung and a full approach description on waypoints[1]. Dropping the empty one and
  // leaving the other untouched; its `type` differs between the two, and choosing between
  // "Topout" and "Base/bivy" is a judgement no verdict covers, so it is left alone.
  { kind: "drop", route: "wa_concerto_in_c_for_drill_and_hammer", path: "waypoints",
    expect: "bd3322edbf9b91aa", drop: [{ i: 2, name: "South Face grassy saddle" }],
    why: "byte-identical coordinate and elevation to waypoints[1], with no mileage and an empty note" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
