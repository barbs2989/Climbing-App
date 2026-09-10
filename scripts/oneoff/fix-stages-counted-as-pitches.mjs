// Fifty roped pitches that do not exist, billed to twelve walking routes.
//
// `pitches` is meant to count roped pitches. On these rows it counts the ENTRIES in pitch_detail,
// and those entries are the stages of a day: "Approach 1: Dosewallips Road (closed to vehicles)",
// "Camp Muir to Gibraltar Rock", "Paradise to base of Finger". Two quantities meaning different
// things holding the identical number is a derivation, not a coincidence.
//
// IT IS NOT COSMETIC — THREE SURFACES READ IT, and one of them is the safety-adjacent one:
//   RouteDetail's header strap renders `route.pitches>0 ? route.pitches+"p · " : ""`, so
//     wa_mount_anderson_eel_glacier advertises "7p" for a Class 1-3 walk with 0 rappels;
//   techHrs(route.pitches, route.avgPitchLength||35, gn(route.grade)) bills the CLIMBING leg of the
//     planner per pitch, so a party is charged technical time for an approach road and a glacier
//     traverse — and with no pitch-length column in this schema that runs on the 35 m default;
//   retH takes an entirely different branch on `route.pitches>0`, so the RETURN estimate changes too.
//
// THE ARRAY IS NOT THE DEFECT AND MUST NOT BE TOUCHED. This catalog uses pitch_detail for the
// segments of a day on scrambles and glacier routes deliberately, and check:pitch-split renders them
// as an ordered ROUTE BREAKDOWN precisely because they are legitimate. Only the COUNT is wrong.
// Setting 0 cannot hide them either: isPitched() reads the DISCIPLINE, not the count, so these
// entries already render as stages and continue to.
//
// MEASURED, AND THE MEASUREMENT IS WHY THIS IS TWELVE ROWS AND NOT A SWEEP.
// 411 WA rows have pitches === pitch_detail.length. Requiring that NO entry carries a pitch
// designation leaves 62; requiring the discipline to be one isPitched() treats as unpitched leaves
// 30. Reading all 30 leaves these 12. The other 18 are excluded for reasons worth recording,
// because the loose version of this rule would have damaged them:
//
//   wa_magic_mountain_west_ridge   its entries include "P1 — shelves to the base", "P2 — the blocky
//                                  open book", "P3 — the slab", "P4 — easy chimney". Real pitches
//                                  interleaved with travel; the right count is ~4, not 0.
//   wa_gunsight_peak_standard      "Lower wall", "Black dihedral (crux)", "Upper chimneys/cracks",
//                                  with two double-rope rappels. That is a climb.
//   wa_mount_meany_standard        has an entry literally called "Crux pitch".
//   wa_tenpeak_mountain_north_couloir, wa_argonaut_peak_northeast_couloir,
//   wa_mount_challenger_challenger_glacier   all name a pitch in a label.
//   wa_mcmillan_spire_west_west_ridge, wa_ottohorn_west_ridge, wa_sahale_mountain_sahale_glacier,
//   wa_the_horn_scramble, wa_dark_peak_dark_glacier_route   carry a technical hint in the GRADE
//                                  rather than the label — "short 5.6 step reported by some
//                                  sources", "5.5 R", "5.0 / 3rd-4th class", "Belayed". A short
//                                  roped step is not four pitches, but it is not clearly zero
//                                  either, and nothing in the array separates it.
//   wa_poltergeist_pinnacle_north_route   all four labels are the EMPTY STRING. A different defect.
//   plus wa_mount_redoubt_south_face, wa_overcoat_peak_southeast_route, wa_dome_peak_dome_glacier,
//   wa_unicorn_peak_r1, wa_tupshin_peak_scramble, wa_baring_mountain_south_route — each carrying
//   rappels or terrain vocabulary that leaves a roped section open.
//
// Every row below has travel-only labels AND no roped vocabulary in any label or grade: they read
// "Class 1 hike/bike", "Class 2-3 snow/ice", "glacier", "40-45° snow couloir", "steep ice".
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const WHY = "pitches counts prose STAGE entries, not roped pitches, on a route with none";
const REPAIRS = [
  { kind: "set", route: "wa_mount_anderson_eel_glacier", path: "pitches", expect: "7902699be42c8a8e", value: 0,
    why: "7 = four entries literally titled 'Approach N', a glacier traverse and two summit legs" },
  { kind: "set", route: "wa_mount_logan_r2", path: "pitches", expect: "e7f6c011776e8db7", value: 0,
    why: "6 = six numbered day stages, trailhead to summit block" },
  { kind: "set", route: "wa_mount_baker_cockscomb_ridge", path: "pitches", expect: "ef2d127de37b942b", value: 0, why: WHY },
  { kind: "set", route: "wa_chikamin_peak_southeast_slopes", path: "pitches", expect: "4b227777d4dd1fc6", value: 0, why: WHY },
  { kind: "set", route: "wa_glacier_peak_disappointment_peak_cleaver", path: "pitches", expect: "4b227777d4dd1fc6", value: 0, why: WHY },
  { kind: "set", route: "wa_mount_adams_north_ridge", path: "pitches", expect: "4b227777d4dd1fc6", value: 0, why: WHY },
  { kind: "set", route: "wa_mount_custer_standard", path: "pitches", expect: "4b227777d4dd1fc6", value: 0, why: WHY },
  { kind: "set", route: "wa_mount_rainier_gibraltar_ledges", path: "pitches", expect: "4b227777d4dd1fc6", value: 0,
    why: "4 = Camp Muir to Gibraltar Rock, the Ledges, the Chute and the summit slopes — glacier, snow and ice" },
  { kind: "set", route: "wa_chiwawa_mountain_southwest", path: "pitches", expect: "4e07408562bedb8b", value: 0, why: WHY },
  { kind: "set", route: "wa_glacier_peak_cool_glacier_gerdine", path: "pitches", expect: "4e07408562bedb8b", value: 0, why: WHY },
  { kind: "set", route: "wa_mount_carrie_standard", path: "pitches", expect: "4e07408562bedb8b", value: 0, why: WHY },
  { kind: "set", route: "wa_mount_rainier_fuhrer_finger", path: "pitches", expect: "4e07408562bedb8b", value: 0,
    why: "3 = Paradise to the base, the Finger, and the upper mountain — glacier traverse and snow couloir" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,pitches",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
