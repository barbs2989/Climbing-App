// A pin 3,000 ft below the summit it names, on four rows — plus two elevations with an answer.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// THE SQUIRE CREEK WALL PIN IS AT THE WALL'S BASE, and four rows share it. Measured here against
// USGS 3DEP at 48.1854,-121.6493, the coordinate all four store for "Squire Creek Wall (true
// summit/high point)" at a stated 4,958 ft:
//
//     ground under the pin            1,943 ft
//     ground ~0.5 km out              2,738 ft
//     ground ~1.0 km out              3,518 ft
//     ground ~1.5 km out              4,098 ft
//
// The stated elevation is not merely missed — it is ABSENT from the whole neighbourhood, and the
// pin sits some 3,000 ft below the summit it names. That is far outside any hand-placement error.
//
// WHICH HALF IS WRONG matters here, because the repair differs: 4,958 ft is the formation's
// published high point and the rows use it consistently elsewhere, so the ELEVATION stays and the
// COORDINATE goes. Nothing establishes where the true summit is, so it is dropped rather than
// moved — the four rows will render "No coordinate on file" for that point, which is true.
//
// ALL FOUR ROWS, not just the one the finding named. wa_concerto_in_c_for_drill_and_hammer was
// examined in an earlier batch and its summit pin deliberately left alone, because the DEM claim
// had not been checked in-session at the time. It has now, so the same pin is fixed everywhere it
// appears rather than on the row that happened to carry the verdict.

const REPAIRS = [
  { kind: "set", route: "wa_concerto_in_c_for_drill_and_hammer", path: "waypoints.2.lat",
    expect: "6c960190ea9e3b50", value: null, why: "ground 1,943 ft under a pin claiming 4,958; the wall's base, not its top" },
  { kind: "set", route: "wa_concerto_in_c_for_drill_and_hammer", path: "waypoints.2.lng",
    expect: "506441063c09b440", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_doorway_flake", path: "waypoints.3.lat",
    expect: "6c960190ea9e3b50", value: null, why: "the same base pin, on a second row" },
  { kind: "set", route: "wa_doorway_flake", path: "waypoints.3.lng",
    expect: "506441063c09b440", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_skeena26", path: "waypoints.3.lat",
    expect: "6c960190ea9e3b50", value: null, why: "the same base pin, on a third row" },
  { kind: "set", route: "wa_skeena26", path: "waypoints.3.lng",
    expect: "506441063c09b440", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_western_dihedral", path: "waypoints.3.lat",
    expect: "6c960190ea9e3b50", value: null, why: "the same base pin, on a fourth row" },
  { kind: "set", route: "wa_western_dihedral", path: "waypoints.3.lng",
    expect: "506441063c09b440", value: null, why: "the longitude half of the same pin" },

  // -------------------------------------------------------------------------------------------
  // wa_mount_hinman_hinman_glacier.waypoints[4] — stored 6,900 ft; the ground reads 7,310.
  // The DEM is usable HERE specifically because the coordinate is confirmed: the pin sits 1.7 m
  // from a point on this row's own 539-point track, which resolves switchback detail and is
  // therefore a real recording rather than the waypoints joined up. A DEM reading at a SUSPECT
  // coordinate says nothing about an elevation; at a confirmed one it is the ground the point
  // stands on. Written as 7,300 — the measurement rounded to the hundred this catalog's waypoint
  // elevations use, rather than implying a precision a 10 m DEM does not have.
  { kind: "set", route: "wa_mount_hinman_hinman_glacier", path: "waypoints.4.elev",
    expect: "d16542a7bfcce708", value: 7300,
    why: "410 ft low against the ground at a coordinate confirmed on the row's own recorded track" },

  // -------------------------------------------------------------------------------------------
  // wa_mount_shuksan_white_salmon_glacier — the summit waypoint says 9,127 ft while the row's OWN
  // high_point_ft says 9,131, as do all nine Shuksan rows and the published figures. Copied from
  // the row's own column, so nothing is typed. The COORDINATE is left alone: it is 17 m from the
  // published summit point, which is inside the quantisation of a 4-decimal coordinate, and the
  // siblings' alternative is three times further out — so this pin is the better one, and an
  // earlier note claiming the reverse had it backwards.
  { kind: "copy", route: "wa_mount_shuksan_white_salmon_glacier", path: "waypoints.4.elev",
    expect: "e993b985dfdaefa4", from: "high_point_ft",
    why: "the summit waypoint disagreed with its own row's high_point_ft by 4 ft" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints,high_point_ft",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
