// The second cut from the controlled catalog sweep — selected by SEPARATION, not by a threshold.
//
// The first batch out of that sweep used "the row's worst anchor must read inside 100 ft". That
// number was arbitrary, and being arbitrary it left real defects behind: rows whose control was 102
// to 145 ft but whose interior pins were out by one to three THOUSAND feet. A 145 ft anchor is still
// a good control; what matters is whether the gap dwarfs the instrument error the row has actually
// demonstrated.
//
// So the rule here is a ratio: the gap must be at least 8x the row's own worst anchor reading. That
// is the same discipline used elsewhere in this sweep — "demand a separation, never a verdict at the
// boundary" — and it is why an 18 ft shortfall on South Early Winters Spire was left alone while a
// 2,904 ft one here is not.
//
//   wa_philadelphia_mountain_scramble  control 124 ft  ->  -2,904 (23x) and -1,894 (15x)
//   wa_mount_sefrit_southwest_ridge    control 124 ft  ->  +2,630 (21x) and +1,718 (14x)
//   wa_mount_lawson_standard           control 145 ft  ->  +1,657 (11x) and +1,170 (8x)
//   wa_mount_olympus_blue_glacier      control 144 ft  ->  -1,594 (11x)
//   wa_mount_skokomish_standard        control 125 ft  ->  -1,363 (11x)
//   wa_little_sister_scramble          control 102 ft  ->  -1,078 (11x)
//   wa_mount_stickney_scramble         control 126 ft  ->  -1,048 (8x) and -1,008 (8x)
//   wa_azurite_peak_southeast          control 118 ft  ->  -1,021 (9x)
//
// THE CLEAREST IS PHILADELPHIA: a pin named "South-Side Cliff Band", storing 3,800 ft, sitting on
// ground of 896 ft — valley floor. That row already has a recorded history of displaced pins; its
// Lake Serene pin was repaired earlier for sitting 1,678 ft above its own elevation.
//
// THE NAME IS THE CORROBORATION ON ALMOST ALL OF THESE, and it is what keeps the elevation as the
// sound half. A ford is where the river is; a glacier crossing is on the glacier; Snow Dome is Snow
// Dome. In every case the stored elevation is what the pin's own name implies and the ground under
// the coordinate is not, so the coordinate goes and the elevation stays.
//
// THREE ROWS THE SWEEP FLAGGED ARE STILL EXCLUDED, each on evidence rather than on arithmetic:
//   wa_chimney_rock_west_face and wa_summit_chief_mountain_south_route both flag a "PCT Junction
//     near Lemah Meadow" pin. CLAUDE.md records that researching this exact class found the pins
//     were mostly ALREADY RIGHT — they name a feature that is an area rather than a point, or one on
//     a different approach to the same peak, and of three researched only one was wrong. A ground
//     reading cannot distinguish "the pin is wrong" from "the meadow is large".
//   wa_mount_fernow_southeast_face at 6.5x, below the ratio.
//   wa_mount_skokomish_standard's Huckleberry Creek crossing at 7x, likewise — its basin saddle on
//     the same row IS repaired at 11x, which is the ratio doing its job rather than a row-level call.
//   wa_mount_barnes_scramble, for the reason the first batch records: it holds two complete records
//     of different approaches, so its pins may be coherent for the other one.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // wa_philadelphia_mountain_scramble wp[5] "South-Side Cliff Band"  elev 3800  (23x its row's worst anchor)
  { kind: "set", route: "wa_philadelphia_mountain_scramble", path: "waypoints.5.lat",
    expect: "d4dc366c38a26de1", value: null,
    why: "a cliff band at 3,800 ft pinned on 896 ft valley floor" },
  { kind: "set", route: "wa_philadelphia_mountain_scramble", path: "waypoints.5.lng",
    expect: "46e863bf6fcae617", value: null,
    why: "the longitude half of the same pin" },
  // wa_philadelphia_mountain_scramble wp[4] "West Ridge Gain (~3,200 ft)"  elev 3200  (15x its row's worst anchor)
  { kind: "set", route: "wa_philadelphia_mountain_scramble", path: "waypoints.4.lat",
    expect: "42bcbe1efe657ee6", value: null,
    why: "a ridge gain the pin's own name puts at ~3,200 ft, pinned on 1,306 ft ground" },
  { kind: "set", route: "wa_philadelphia_mountain_scramble", path: "waypoints.4.lng",
    expect: "29a88b64a736c7c4", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_sefrit_southwest_ridge wp[1] "Leave Trail #750 roadbed"  elev 2700  (21x its row's worst anchor)
  { kind: "set", route: "wa_mount_sefrit_southwest_ridge", path: "waypoints.1.lat",
    expect: "886de087210a3aba", value: null,
    why: "a leave-the-roadbed junction at 2,700 ft pinned 2,630 ft above it" },
  { kind: "set", route: "wa_mount_sefrit_southwest_ridge", path: "waypoints.1.lng",
    expect: "3b463b20958cd22d", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_sefrit_southwest_ridge wp[2] "Brushy ascending traverse"  elev 3800  (14x its row's worst anchor)
  { kind: "set", route: "wa_mount_sefrit_southwest_ridge", path: "waypoints.2.lat",
    expect: "09c2b864869f7bd3", value: null,
    why: "a brushy traverse at 3,800 ft pinned 1,718 ft above it" },
  { kind: "set", route: "wa_mount_sefrit_southwest_ridge", path: "waypoints.2.lng",
    expect: "cc62d2f87a851523", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_lawson_standard wp[5] "North Fork Quinault River Ford / Leave Trail"  elev 1050  (11x its row's worst anchor)
  { kind: "set", route: "wa_mount_lawson_standard", path: "waypoints.5.lat",
    expect: "3226798301c2c122", value: null,
    why: "a river ford at 1,050 ft pinned 1,657 ft up the hillside" },
  { kind: "set", route: "wa_mount_lawson_standard", path: "waypoints.5.lng",
    expect: "1f7cebeddfc38a52", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_lawson_standard wp[2] "Wild Rose Creek Ford"  elev 750  (8x its row's worst anchor)
  { kind: "set", route: "wa_mount_lawson_standard", path: "waypoints.2.lat",
    expect: "d0e7ddd910911672", value: null,
    why: "a creek ford at 750 ft pinned 1,170 ft above it" },
  { kind: "set", route: "wa_mount_lawson_standard", path: "waypoints.2.lng",
    expect: "e5fc93ef73f9e02e", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_olympus_blue_glacier wp[2] "Snow Dome"  elev 6700  (11x its row's worst anchor)
  { kind: "set", route: "wa_mount_olympus_blue_glacier", path: "waypoints.2.lat",
    expect: "b169816023930cf7", value: null,
    why: "Snow Dome pinned 1,594 ft below itself" },
  { kind: "set", route: "wa_mount_olympus_blue_glacier", path: "waypoints.2.lng",
    expect: "50881c10f6491c20", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_skokomish_standard wp[4] "Basin/saddle below Skokomish's south peak"  elev 5500  (11x its row's worst anchor)
  { kind: "set", route: "wa_mount_skokomish_standard", path: "waypoints.4.lat",
    expect: "d97ffdeb74e2409e", value: null,
    why: "a basin saddle pinned 1,363 ft below itself" },
  { kind: "set", route: "wa_mount_skokomish_standard", path: "waypoints.4.lng",
    expect: "c4ad7314057e9a75", value: null,
    why: "the longitude half of the same pin" },
  // wa_little_sister_scramble wp[5] "Green Creek (Sisters) Glacier crossing"  elev 5700  (11x its row's worst anchor)
  { kind: "set", route: "wa_little_sister_scramble", path: "waypoints.5.lat",
    expect: "a5757b5d70472a8b", value: null,
    why: "a glacier crossing pinned 1,078 ft below the glacier" },
  { kind: "set", route: "wa_little_sister_scramble", path: "waypoints.5.lng",
    expect: "dfce52e5a48fa928", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_stickney_scramble wp[4] "Upper Drainage Tarns"  elev 4500  (8x its row's worst anchor)
  { kind: "set", route: "wa_mount_stickney_scramble", path: "waypoints.4.lat",
    expect: "1250d9ff7e156dbd", value: null,
    why: "tarns pinned 1,048 ft below themselves" },
  { kind: "set", route: "wa_mount_stickney_scramble", path: "waypoints.4.lng",
    expect: "af233ffc07e9e414", value: null,
    why: "the longitude half of the same pin" },
  // wa_mount_stickney_scramble wp[2] "Ridge Path Fade-Out"  elev 4050  (8x its row's worst anchor)
  { kind: "set", route: "wa_mount_stickney_scramble", path: "waypoints.2.lat",
    expect: "320fa5f8500b8d17", value: null,
    why: "a path fade-out pinned 1,008 ft below its own elevation" },
  { kind: "set", route: "wa_mount_stickney_scramble", path: "waypoints.2.lng",
    expect: "d58697e3f461fd84", value: null,
    why: "the longitude half of the same pin" },
  // wa_azurite_peak_southeast wp[4] "Jet Creek crossing"  elev 5300  (9x its row's worst anchor)
  { kind: "set", route: "wa_azurite_peak_southeast", path: "waypoints.4.lat",
    expect: "4b13ac4bbebaaca1", value: null,
    why: "a creek crossing pinned 1,021 ft above the creek" },
  { kind: "set", route: "wa_azurite_peak_southeast", path: "waypoints.4.lng",
    expect: "990551cd774ed337", value: null,
    why: "the longitude half of the same pin" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
