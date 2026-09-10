// Twenty coordinates the ground refuses, on four rows where the ground has been shown trustworthy.
//
// THE CONTROL IS THE WHOLE METHOD and it is run per row, because a DEM reading is evidence about a
// pin only once the instrument has been shown to agree with that row's OTHER pins. Otherwise a
// systematic offset reads as a per-pin defect. Sampled in this session:
//
//   wa_classic_route_3          trailhead -24 ft, Lane Peak summit  -1 ft
//        -> then wp[2] +381, wp[3] -923, wp[4] -1,158
//   wa_mount_duckabush_standard 10-Mile Camp 0 ft, Upper Duckabush 0 ft, summit -64 ft
//        -> then wp[1] +2,719, wp[5] -2,250
//   wa_sherpa_peak_west_ridge   trailhead +18 ft, summit -40 ft
//        -> then wp[1] -1,164, wp[2] +795
//   wa_mount_blum_south_ridge   trailhead -22 ft, Blum Lakes +18 ft, summit -44 ft
//        -> then wp[2], wp[3], wp[4] are provably COMPUTED (below)
//
// Duckabush's control is the strongest available: 10-Mile Camp stores 1,471 against a measured
// 1,470.7 and Upper Duckabush 2,673 against 2,672.7 — under a foot each. Those are real pins whose
// elevations were read off their own coordinates, which is exactly the calibration this needs.
//
// wa_mount_blum_south_ridge WAS IN NO VERDICT. It surfaced from running the chord test over every
// pin during verification, and its three bad pins are not a judgement call: each lies on a straight
// line between two other pins at EXACTLY its own mileage fraction, to 0.00 m.
//
//   wp[2] "Climbers' path departure"   on chord 0->3, t = 0.2400000, mileage fraction 0.6/2.5
//   wp[3] "Blum Creek Ridge climb"     on chord 0->4, t = 0.6250000, mileage fraction 2.5/4.0
//   wp[4] "Ascending traverse..."      on chord 0->3, t = 1.6000000, mileage fraction 4.0/2.5
//
// All three also carry the interpolation residue in their decimals — 48.75060666666667,
// -121.54794133333333, 48.75031111111111 — against clean 4-to-7-decimal values on every pin that is
// real. This is arithmetic, not a place anybody recorded.
//
// WP[2]'s GROUND HAPPENS TO AGREE (-67 ft) AND IT IS STILL DROPPED, which is worth stating because
// it looks like over-reach. A computed pin is a fabricated POSITION whatever height the chord
// happens to pass through; the ground agreeing is a coincidence of the line, not evidence that the
// climbers' path leaves the trail at 24% of the way to somewhere else. The map draws it and the row
// offers it as a tap.
//
// EQUALLY, wp[0] IS NOT TOUCHED THOUGH THE SAME TEST FLAGS IT. The trailhead reports as lying on
// chord 2->3 at t = -0.3157895 — but that is the mirror artifact of wp[2] and wp[3] having been
// interpolated FROM it. A run's endpoints are its anchors, and this catalog has already spent three
// passes chasing correct pins by expanding a run into a list of findings. Its ground reads -22 ft
// and its coordinate is a clean 4 decimals. Same for Duckabush's wp[0] and wp[4], both flagged by
// extrapolation and both left alone.
//
// ELEVATIONS ARE KEPT THROUGHOUT, as everywhere in this sweep, and on two rows they are corroborated
// from inside the row: Classic Route's 5,400 ft saddle matches its own prose ("the broad 5,440 ft
// saddle"), and Sherpa's 6,200 ft camp and ~6,250 ft Longs Pass both match its own bivy array
// ("you climb to Longs Pass at about 6,200 feet"). The ground under a misplaced pin is a reading
// about the wrong place, so it is never written into the elevation.
//
// NO REPLACEMENT COORDINATES. A 3DEP grid localises a col to a couple of hundred metres, which is
// not a pin, and manufacturing one from the DEM would put back exactly the class being removed.
//
// TWO CANDIDATES DELIBERATELY LEFT, so they are not lost and not swept on thin evidence:
//   wa_sherpa_peak_west_ridge wp[3] "Base of west ridge", +395 ft. Real by its decimals, and 395 ft
//     is inside ordinary hand-placement slop on a steep ridge base. A verdict at the boundary is not
//     a verdict.
//   wa_mount_duckabush_standard wp[4] "Marmot Lake", -521 ft against an unusually good control.
//     Its coordinate is clean, so this is a stored elevation or a lakeside placement rather than an
//     interpolation, and nothing in the row decides which.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // wa_classic_route_3 — the row's own approach_variants warns "THIS ROUTE IS ON THE OTHER SIDE OF
  // THE MOUNTAIN ... THE COULOIR ROUTES STAY LOW IN THE BASIN", and all three pins sit in that basin.
  { kind: "set", route: "wa_classic_route_3", path: "waypoints.2.lat",
    expect: "93859858d6d3edc0", value: null,
    why: "the Tatoosh Creek crossing reads 381 ft above its own stated elevation" },
  { kind: "set", route: "wa_classic_route_3", path: "waypoints.2.lng",
    expect: "5d017b0c8fc45f57", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_classic_route_3", path: "waypoints.3.lat",
    expect: "0243d4eb28da4c4d", value: null,
    why: "the Lane-Denman saddle is pinned 923 ft below itself, out in the basin north of the col" },
  { kind: "set", route: "wa_classic_route_3", path: "waypoints.3.lng",
    expect: "4a4d24a8401cc8f6", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_classic_route_3", path: "waypoints.4.lat",
    expect: "71640b59be4b9679", value: null,
    why: "the gully/rappel-tree pin reads 1,158 ft below its own elevation, NNE of the summit" },
  { kind: "set", route: "wa_classic_route_3", path: "waypoints.4.lng",
    expect: "9dda58dc322b7844", value: null, why: "the longitude half of the same pin" },

  // wa_mount_duckabush_standard
  { kind: "set", route: "wa_mount_duckabush_standard", path: "waypoints.1.lat",
    expect: "81d06db741e29cc4", value: null,
    why: "computed on the chord at t=0.3131314 against a mileage fraction of 0.3131313, and 2,719 ft up a hillside" },
  { kind: "set", route: "wa_mount_duckabush_standard", path: "waypoints.1.lng",
    expect: "d771151dbad89c26", value: null, why: "the longitude half of the same computed point" },
  { kind: "set", route: "wa_mount_duckabush_standard", path: "waypoints.5.lat",
    expect: "953e6165c0d54342", value: null,
    why: "O'Neil Pass is pinned on ground 2,250 ft below the pass, on a row whose camps read the ground to a foot" },
  { kind: "set", route: "wa_mount_duckabush_standard", path: "waypoints.5.lng",
    expect: "4a8b2cdec1bf6667", value: null, why: "the longitude half of the same pin" },

  // wa_sherpa_peak_west_ridge
  { kind: "set", route: "wa_sherpa_peak_west_ridge", path: "waypoints.1.lat",
    expect: "24d0a1714b1df960", value: null,
    why: "Longs Pass is pinned 1,164 ft below the height the row's own bivy array gives it" },
  { kind: "set", route: "wa_sherpa_peak_west_ridge", path: "waypoints.1.lng",
    expect: "27f321965dfbabc7", value: null, why: "the longitude half of the same pin" },
  { kind: "set", route: "wa_sherpa_peak_west_ridge", path: "waypoints.2.lat",
    expect: "50312e81f8324eeb", value: null,
    why: "the 6,200 ft basin camp is pinned 795 ft up the hillside above it" },
  { kind: "set", route: "wa_sherpa_peak_west_ridge", path: "waypoints.2.lng",
    expect: "07ffb3500b9c6aaa", value: null, why: "the longitude half of the same pin" },

  // wa_mount_blum_south_ridge — found by the chord test, in no verdict.
  { kind: "set", route: "wa_mount_blum_south_ridge", path: "waypoints.2.lat",
    expect: "69d2a4874fc06f8c", value: null,
    why: "interpolated at exactly 0.6/2.5 of the way along a chord, to 0.00 m, with a repeating decimal tail" },
  { kind: "set", route: "wa_mount_blum_south_ridge", path: "waypoints.2.lng",
    expect: "35a849c1b21bdb62", value: null, why: "the longitude half of the same computed point" },
  { kind: "set", route: "wa_mount_blum_south_ridge", path: "waypoints.3.lat",
    expect: "dfa559925a486cff", value: null,
    why: "interpolated at exactly 2.5/4.0 along a chord, and 476 ft above its own stated elevation" },
  { kind: "set", route: "wa_mount_blum_south_ridge", path: "waypoints.3.lng",
    expect: "b779ebdf53a7fd5e", value: null, why: "the longitude half of the same computed point" },
  { kind: "set", route: "wa_mount_blum_south_ridge", path: "waypoints.4.lat",
    expect: "f8aa2ce4adab4a03", value: null,
    why: "extrapolated to t=1.6000000 past the end of a chord, and 293 ft above its own elevation" },
  { kind: "set", route: "wa_mount_blum_south_ridge", path: "waypoints.4.lng",
    expect: "faf0fa0b42ae35b4", value: null, why: "the longitude half of the same computed point" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
