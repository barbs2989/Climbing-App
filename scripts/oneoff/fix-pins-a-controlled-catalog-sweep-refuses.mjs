// Eighteen pins a CONTROLLED sweep of the whole WA catalog refuses.
//
// THE METHOD, and why the number it produces is worth more than the flat one already on record.
// CLAUDE.md states that across 100 swept routes, 66% have a pin more than 800 ft from the ground
// beneath it — and correctly says that is far too high to be a defect rate, because a hand-placed
// pin on alpine terrain is easily 100 m out horizontally, which on a headwall is 1,000+ ft
// vertically. A flat threshold cannot separate a bad pin from steep ground.
//
// A PER-ROW CONTROL can. Sample every placed pin on every WA route against USGS 3DEP; keep only the
// rows whose own ANCHOR pins — trailhead, lake, pass, col, camp, summit, the kinds whose position is
// well defined — read within 150 ft of what they store. On those rows the coordinates are
// demonstrably sound and the instrument is demonstrably working, so a four-figure gap at an interior
// pin is that pin.
//
//   4,028 placed pins carrying an elevation, across 987 routes
//     183 rows have >= 2 anchor pins and a worst anchor inside 150 ft
//      34 of those have an interior pin more than 800 ft from the ground   <- 46 pins
//
// 34 of 183 is 19%, against the uncontrolled 66%. The control is doing the work.
//
// THE FIRST RUN REPORTED 58 ROWS AND 72 PINS, AND 26 OF THOSE WERE MY OWN BUG. The sweep coerced the
// elevation with `Number(w.elev ?? w.elevFt)`. When BOTH spellings are absent that yields null, and
// `Number(null)` is 0 while `Number.isFinite(0)` is true — so a pin with no elevation read as a pin
// at sea level, and every alpine ground reading under it looked like a +8,000 ft defect. Measured
// afterwards: 0 WA waypoints actually store 0, and 259 store no elevation at all. This is the exact
// trap audit:map-pins records from a 12,215 km "disagreement", and CLAUDE.md warns about it in four
// separate places. Reject null BEFORE coercing.
//
// SELECTED FROM THE 46 BY TWO RULES, both stated so the residue is readable rather than arbitrary:
// the row's worst anchor must be inside ~100 ft (tighter than the sweep's own 150), and the gap must
// be at least 900 ft. That leaves these 18. The rest are a reading list, not a backlog.
//
// TWO SHARED PINS FELL OUT OF IT, which is independent corroboration rather than a coincidence:
// "Stream crossing near meadow" (stored 5,750, ground 7,028) is the same pin on THREE Liberty Bell
// rows, and "Base of access couloir" / "Base of CJ Couloir" (stored 3,700, ground 4,967) is one
// coordinate shared by wa_cascade_peak_east_ridge and wa_johannesburg_mountain_cj_couloir. A single
// bad pin propagated across rows is the fingerprint this catalog already records for zone files and
// trailhead blobs.
//
// ELEVATIONS ARE KEPT, as everywhere in this sweep. On these rows the stored elevation is the half
// that fits the pin's own NAME — a creek crossing at 1,700 ft, a stream crossing near a meadow at
// 5,750, Snow Dome at 6,700 — while the ground under the coordinate does not. The ground under a
// misplaced pin is a reading about the wrong place.
//
// DELIBERATELY EXCLUDED, so they are not lost:
//   wa_mount_barnes_scramble  (-1,969 and -1,634 on a 5-anchor control) — CLAUDE.md records this row
//     as holding two COMPLETE records of different approaches: all eight waypoints on the Sol Duc
//     side and a 438-point gpx on the Elwha. Its pins may be a coherent set for the other approach,
//     which is a different repair from a displaced pin.
//   wa_mount_stickney_scramble, wa_summit_chief_mountain_south_route, wa_mount_fernow_southeast_face,
//     wa_mount_skokomish_standard, wa_azurite_peak_southeast, wa_little_sister_scramble,
//     wa_foggy_peak_scramble, wa_chimney_rock_west_face, wa_mount_olympus_blue_glacier,
//     wa_mount_lawson_standard, wa_mount_sefrit_southwest_ridge, wa_philadelphia_mountain_scramble,
//     wa_dragontail_peak_r3 — each has a worst anchor beyond 100 ft, a gap under 900, or both.
//
// wa_mount_terror_north_face is included despite a 120 ft worst anchor because it was verified
// independently: its trailhead reads +7 ft, the 120 is a sharp-summit under-read, and its
// "Treeline stream break (~5,000')" sits 311 m from the peak's own 8,151 ft summit coordinate.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // wa_mount_saul_se_route wp[2] "Leave-trail point near Airplane Creek"  elev 3300
  { kind: "set", route: "wa_mount_saul_se_route", path: "waypoints.2.lat",
    expect: "9c21afda92b520ed", value: null,
    why: "a leave-trail point on the creek, pinned 1,997 ft above it" },
  { kind: "set", route: "wa_mount_saul_se_route", path: "waypoints.2.lng",
    expect: "c2c2738979f03765", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_saul_se_route wp[3] "Snow line on Airplane Creek bushwhack"  elev 4300
  { kind: "set", route: "wa_mount_saul_se_route", path: "waypoints.3.lat",
    expect: "6a7a619dbba0b513", value: null,
    why: "a snow line on a creek bushwhack, pinned 1,417 ft above it" },
  { kind: "set", route: "wa_mount_saul_se_route", path: "waypoints.3.lng",
    expect: "743042032a4bbec0", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_saul_se_route wp[1] "White River bridge crossing"  elev 2350
  { kind: "set", route: "wa_mount_saul_se_route", path: "waypoints.1.lat",
    expect: "794a57cb7b5cee02", value: null,
    why: "a river bridge crossing, pinned 1,005 ft above the river" },
  { kind: "set", route: "wa_mount_saul_se_route", path: "waypoints.1.lng",
    expect: "4a28cd7a7298e7cd", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_carrie_standard wp[6] "Carrie Glacier crossing"  elev 6400
  { kind: "set", route: "wa_mount_carrie_standard", path: "waypoints.6.lat",
    expect: "9de3ce62039a96d6", value: null,
    why: "a glacier crossing pinned 1,512 ft below the glacier" },
  { kind: "set", route: "wa_mount_carrie_standard", path: "waypoints.6.lng",
    expect: "d2de3e6fb95f18c7", value: null,
    why: "the longitude half of the same pin" },
  // wa_gardner_mountain_west_ridge wp[3] "Off-trail turnoff toward the Gardner/North Gardner b"  elev 6200
  { kind: "set", route: "wa_gardner_mountain_west_ridge", path: "waypoints.3.lat",
    expect: "32816af06bf8a4a1", value: null,
    why: "an off-trail turnoff pinned 1,482 ft above the trail" },
  { kind: "set", route: "wa_gardner_mountain_west_ridge", path: "waypoints.3.lng",
    expect: "a3d35cd81e0f33ba", value: null,
    why: "the longitude half of the same pin" },
  // wa_the_incisor_scramble wp[3] "Talus slopes and creek crossings below Royal Basin"  elev 4200
  { kind: "set", route: "wa_the_incisor_scramble", path: "waypoints.3.lat",
    expect: "cce9a8676362fd15", value: null,
    why: "creek crossings below the ridge, pinned 1,333 ft above them" },
  { kind: "set", route: "wa_the_incisor_scramble", path: "waypoints.3.lng",
    expect: "d4d22649877dd2c2", value: null,
    why: "the longitude half of the same pin" },
  // wa_liberty_bell_east_face wp[1] "Stream crossing near meadow"  elev 5750
  { kind: "set", route: "wa_liberty_bell_east_face", path: "waypoints.1.lat",
    expect: "5b93e6048c80a6b2", value: null,
    why: "a stream crossing near a meadow, pinned 1,278 ft above it" },
  { kind: "set", route: "wa_liberty_bell_east_face", path: "waypoints.1.lng",
    expect: "282e0776edd21d9a", value: null,
    why: "the longitude half of the same pin" },
  // wa_liberty_bell_independence_route wp[1] "Stream crossing near meadow"  elev 5750
  { kind: "set", route: "wa_liberty_bell_independence_route", path: "waypoints.1.lat",
    expect: "5b93e6048c80a6b2", value: null,
    why: "the same shared pin, second row" },
  { kind: "set", route: "wa_liberty_bell_independence_route", path: "waypoints.1.lng",
    expect: "282e0776edd21d9a", value: null,
    why: "the longitude half of the same pin" },
  // wa_liberty_bell_thin_red_line wp[1] "Stream crossing near meadow"  elev 5750
  { kind: "set", route: "wa_liberty_bell_thin_red_line", path: "waypoints.1.lat",
    expect: "5b93e6048c80a6b2", value: null,
    why: "the same shared pin, third row" },
  { kind: "set", route: "wa_liberty_bell_thin_red_line", path: "waypoints.1.lng",
    expect: "282e0776edd21d9a", value: null,
    why: "the longitude half of the same pin" },
  // wa_cascade_peak_east_ridge wp[1] "Base of access couloir"  elev 3700
  { kind: "set", route: "wa_cascade_peak_east_ridge", path: "waypoints.1.lat",
    expect: "a213ecbe296ac524", value: null,
    why: "the base of an access couloir, pinned 1,267 ft above it" },
  { kind: "set", route: "wa_cascade_peak_east_ridge", path: "waypoints.1.lng",
    expect: "aebf9efb05ba6c21", value: null,
    why: "the longitude half of the same pin" },
  // wa_johannesburg_mountain_cj_couloir wp[1] "Base of CJ Couloir"  elev 3700
  { kind: "set", route: "wa_johannesburg_mountain_cj_couloir", path: "waypoints.1.lat",
    expect: "a213ecbe296ac524", value: null,
    why: "the same shared coordinate, on the neighbouring route" },
  { kind: "set", route: "wa_johannesburg_mountain_cj_couloir", path: "waypoints.1.lng",
    expect: "aebf9efb05ba6c21", value: null,
    why: "the longitude half of the same pin" },
  // wa_pyramid_peak_colonial_standard wp[6] "Pinnacle-Pyramid Saddle"  elev 6600
  { kind: "set", route: "wa_pyramid_peak_colonial_standard", path: "waypoints.6.lat",
    expect: "4ad600a3a247e435", value: null,
    why: "a saddle pinned 1,209 ft below itself" },
  { kind: "set", route: "wa_pyramid_peak_colonial_standard", path: "waypoints.6.lng",
    expect: "538d3fe9b5e47c84", value: null,
    why: "the longitude half of the same pin" },
  // wa_pyramid_peak_colonial_standard wp[5] "Timberline Tarns"  elev 5600
  { kind: "set", route: "wa_pyramid_peak_colonial_standard", path: "waypoints.5.lat",
    expect: "3631ac10e0722882", value: null,
    why: "tarns pinned 828 ft below themselves on the same row" },
  { kind: "set", route: "wa_pyramid_peak_colonial_standard", path: "waypoints.5.lng",
    expect: "7aaf690faa219002", value: null,
    why: "the longitude half of the same pin" },
  // wa_lena_lake_to_mt_stone_traverse wp[4] "St. Peter's Gate"  elev 5950
  { kind: "set", route: "wa_lena_lake_to_mt_stone_traverse", path: "waypoints.4.lat",
    expect: "22b4aa9c4b367c79", value: null,
    why: "a named gate pinned 1,148 ft below itself" },
  { kind: "set", route: "wa_lena_lake_to_mt_stone_traverse", path: "waypoints.4.lng",
    expect: "b0c6c13894d34f6c", value: null,
    why: "the longitude half of the same pin" },
  // wa_johannesburg_mountain_northeast_buttress wp[1] "Toe of northeast buttress"  elev 3800
  { kind: "set", route: "wa_johannesburg_mountain_northeast_buttress", path: "waypoints.1.lat",
    expect: "e05257949cb31dd3", value: null,
    why: "the toe of the buttress, pinned 1,098 ft above it" },
  { kind: "set", route: "wa_johannesburg_mountain_northeast_buttress", path: "waypoints.1.lng",
    expect: "beaff74be52e92ca", value: null,
    why: "the longitude half of the same pin" },
  // wa_mix_up_peak_east_face wp[3] "Gunsight Notch"  elev 7000
  { kind: "set", route: "wa_mix_up_peak_east_face", path: "waypoints.3.lat",
    expect: "4c8c19597506e970", value: null,
    why: "Gunsight Notch pinned 986 ft below itself" },
  { kind: "set", route: "wa_mix_up_peak_east_face", path: "waypoints.3.lng",
    expect: "857341fc83c25a09", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_terror_north_face wp[1] "Terror Creek cairned crossing"  elev 1700
  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.1.lat",
    expect: "d00a2f3612dc4e38", value: null,
    why: "a creek crossing at 1,700 ft, pinned on 3,865 ft ground" },
  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.1.lng",
    expect: "e573786f70d011a1", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_terror_north_face wp[2] "Treeline stream break (~5,000')"  elev 5000
  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.2.lat",
    expect: "417e98182354230f", value: null,
    why: "a 5,000 ft treeline break pinned 311 m from an 8,151 ft summit" },
  { kind: "set", route: "wa_mount_terror_north_face", path: "waypoints.2.lng",
    expect: "094cb02f2972edb6", value: null,
    why: "the longitude half of the same pin" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
