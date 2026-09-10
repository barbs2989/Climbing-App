// Mid-approach pins that the ground refuses, on rows where the ground can be trusted.
//
// THE CONTROL IS THE POINT, and it is what makes these safe. A DEM reading is only evidence
// about a pin if the instrument agrees with that row's OTHER pins — otherwise a systematic
// offset reads as a per-pin defect. Measured in this session, per row:
//
//   colchuck_glacier   trailhead -1 ft, Colchuck Lake -1, Colchuck Col -59, summit -22
//                      -> the endpoints check out, so the three big gaps are those pins.
//   little_big_chief   trailhead -48, Hour Creek Camp -83, Waptus ford -3, summit -9
//                      -> same conclusion.
//   hinman             trailhead -31, Jade Lake -11, La Bohn Gap -25
//                      -> same conclusion.
//
// AND IT DISQUALIFIED ONE REPAIR. wa_silver_star_glacier's "steep snow drop" pin was verdicted
// stored-wrong and is NOT in this batch: it reads +107 ft, while that row's own Burgundy Col
// reads -97, its glacier saddle -115 and its trailhead -85. The DEM does not single it out, the
// case for it was internal, and 182 m is plausibly imprecision rather than a wrong place. Not
// enough to remove a pin over.
//
// In every case below the ELEVATION is kept: it is the sound half, and the ground under a
// misplaced pin is a reading about the wrong place.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // wa_colchuck_peak_colchuck_glacier -----------------------------------------------------
  // wp[1] was NOT in any verdict — found by running the control. The "Stuart Lake / Colchuck
  // Lake trail split" is stored 300 m from the trailhead while claiming distMi 2.5, and the
  // ground under it reads 3,352 ft, essentially the trailhead's own elevation, against a
  // stored 4,500.
  { kind: "set", route: "wa_colchuck_peak_colchuck_glacier", path: "waypoints.1.lat",
    expect: "941811c8094291b2", value: null,
    why: "the trail split sits 300 m from the trailhead on trailhead-height ground while claiming 2.5 mi" },
  { kind: "set", route: "wa_colchuck_peak_colchuck_glacier", path: "waypoints.1.lng",
    expect: "9515f9dcee50fdde", value: null, why: "the longitude half of the same pin" },
  // wp[3] reads 5,568 ft — the surface of Colchuck Lake. A "lateral moraine crest above the
  // lake's shore" is in the water, north-west of a lake whose glacier lies south of it.
  { kind: "set", route: "wa_colchuck_peak_colchuck_glacier", path: "waypoints.3.lat",
    expect: "98f3c652cf04b4c1", value: null,
    why: "a moraine crest above the shore, pinned on the lake surface itself, 1,232 ft below its own elevation" },
  { kind: "set", route: "wa_colchuck_peak_colchuck_glacier", path: "waypoints.3.lng",
    expect: "4db0e7e39921853c", value: null, why: "the longitude half of the same pin" },
  // wp[4] reads 6,057 ft against a stored 7,400, and neither figure exists near it.
  { kind: "set", route: "wa_colchuck_peak_colchuck_glacier", path: "waypoints.4.lat",
    expect: "e931390d850689c1", value: null,
    why: "the glacier toe pin reads 6,057 ft; a +/-150 m box spans 5,732-6,419, so neither 7,400 nor 6,600 is near it" },
  { kind: "set", route: "wa_colchuck_peak_colchuck_glacier", path: "waypoints.4.lng",
    expect: "7d382f881bfbf0c2", value: null, why: "the longitude half of the same pin" },
  // and its ELEVATION is the lone dissenter inside its own row: `approach`,
  // `approach_variants[0].baseFinding` and `climbing_route[0].notes` all put the toe at roughly
  // 6,600-6,800 ft, while the waypoint says 7,400 — which the published extent places near the
  // glacier's HEAD, not its toe. Written as the midpoint of the row's own stated range.
  { kind: "set", route: "wa_colchuck_peak_colchuck_glacier", path: "waypoints.4.elev",
    expect: "7078c7f8564ee030", value: 6700,
    why: "three of the row's own fields put the toe at 6,600-6,800; 7,400 is near the glacier's head" },

  // wa_little_big_chief_mountain_west_route ------------------------------------------------
  // wp[3] reads 5,039 ft against a stored 3,900 — the pin is on the valley wall above the trail.
  { kind: "set", route: "wa_little_big_chief_mountain_west_route", path: "waypoints.3.lat",
    expect: "03afae5ba97bb3e0", value: null,
    why: "the trail junction is pinned 1,139 ft up the valley wall above the trail" },
  { kind: "set", route: "wa_little_big_chief_mountain_west_route", path: "waypoints.3.lng",
    expect: "915badc9c5c785cb", value: null, why: "the longitude half of the same pin" },
  // wp[5] and wp[6] were NOT in any verdict. Both are COMPUTED, not observed: their coordinates
  // carry 15 decimals with repeating tails (47.519672752380956, -121.22668803333333), which is
  // the interpolation residue this catalog already carries hundreds of — and the ground refuses
  // them by 1,778 ft and 838 ft respectively.
  { kind: "set", route: "wa_little_big_chief_mountain_west_route", path: "waypoints.5.lat",
    expect: "26726700ec6150cd", value: null,
    why: "15-decimal computed coordinate, and the ground reads 1,778 ft below what it stores" },
  { kind: "set", route: "wa_little_big_chief_mountain_west_route", path: "waypoints.5.lng",
    expect: "afbe2fa807ed3d82", value: null, why: "the longitude half of the same computed point" },
  { kind: "set", route: "wa_little_big_chief_mountain_west_route", path: "waypoints.6.lat",
    expect: "6f64bb3967e64043", value: null,
    why: "15-decimal computed coordinate, and the ground reads 838 ft below what it stores" },
  { kind: "set", route: "wa_little_big_chief_mountain_west_route", path: "waypoints.6.lng",
    expect: "fdc77e85df125e5d", value: null, why: "the longitude half of the same computed point" },

  // wa_mount_hinman_hinman_glacier ---------------------------------------------------------
  // wp[1] sits 315 m up-trail of the crossing, on the switchbacks at 2,510 ft — 260 ft above the
  // 2,250 it stores. That 2,250 is corroborated twice: it is where this row's own 539-point
  // track stops running flat and breaks uphill, and the row's own approach prose implies it
  // ("the first ~5 miles gain only about 600 ft" from a 1,650 ft trailhead).
  { kind: "set", route: "wa_mount_hinman_hinman_glacier", path: "waypoints.1.lat",
    expect: "1cbe403ec309d80b", value: null,
    why: "pinned 315 m up-trail of the river crossing, on switchbacks 260 ft above it" },
  { kind: "set", route: "wa_mount_hinman_hinman_glacier", path: "waypoints.1.lng",
    expect: "1b09ec4727cc5d41", value: null, why: "the longitude half of the same pin" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
