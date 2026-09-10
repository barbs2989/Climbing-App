// Seven steep-snow angles that no part of their own route supports.
//
// WHAT THE FIELD MEANS, from the app's own help text: "Steepest snow or ice angle on the route."
// It is display-only — RouteDetail renders `route.maxAngle+"°"` in the TECH STATS tile and nothing
// else reads it — so a wrong value is purely a false statement to a climber sizing up a line, and
// removing one costs no warning logic.
//
// THE TEST IS WHETHER THE ROW STATES AN ANGLE ANYWHERE. Every string leaf of each row was scanned
// for a figure followed by °, "deg" or "degree", allowing a hyphen (the first pass used a narrower
// pattern and missed "45-degree", which would have made one of these look better-founded than it is).
//
//   wa_mount_sefrit_southwest_ridge     35   NO ANGLE STATED ANYWHERE. pitch grades Class 2 / 2-3 / 3-4,
//                                            technical 1, ice_grade null. The SIBLING
//                                            wa_mount_sefrit_southeast_ridge also stores 35 and DOES
//                                            source it — its pitch table reads "Snow, 30-35°" and its
//                                            prose says 35. That row starts at a different trailhead and
//                                            crosses a snow couloir this one does not touch.
//   wa_kololo_peaks_standard            42   NO ANGLE STATED. grade "Class 2-3 / snow", technical 1,
//                                            pitch grades Trail / Class 2 / PD (glacier) / Class 2-3.
//   wa_mount_daniel_daniel_glacier      56   NO ANGLE STATED. pitch grades Class 1 trail through
//                                            "Class 2 glacier", technical 2, no screws and no second
//                                            tool in the rack.
//   wa_mount_torment_south_ridge        55   pitch grades ALL ROCK (5.5 / 5.4-5.5 / 5.5 / 5.4). The row's
//                                            one angle, "~45-degree snow/ice", is in descent_text and
//                                            belongs explicitly to the Torment-Forbidden Traverse
//                                            "if that's the day's objective" — a different climb.
//   wa_mount_constance_finger_traverse  50   NO ANGLE STATED. And byte-identical to
//                                            wa_mount_constance_west_arete's 50, a rock arete on the
//                                            other side of the peak, which also states no angle.
//   wa_mount_carrie_se_route            45   NO ANGLE STATED, technical 1. Not inherited — the sibling
//                                            wa_mount_carrie_standard stores 50, not 45.
//
// THE DISTRIBUTION CORROBORATES TWO OF THESE INDEPENDENTLY, and it is checkable rather than asserted.
// Of 317 WA rows carrying max_angle the values pile onto round numbers — 45:63, 50:52, 40:43, 35:25,
// 55:25, 60:21, 30:18 — while fourteen values appear exactly ONCE. 56 is one of those singletons and
// so is 42. A lone 56 in a round-number distribution is a number nobody measured.
//
// ONE IS CORRECTED RATHER THAN CLEARED. wa_ottohorn_southeast_route stores 50 on a route whose pitch
// grades are Class 3-4 and 5.6-5.7 rock — but the row states 35 three separate times, in `approach`,
// in approach_variants[0].notes and in its hazards, all describing early-season snow or ice in the
// Barrier gully. That gully is on the route, so 35 is the steepest snow the record actually carries
// and clearing the field would drop a real one.
//
// TWO CANDIDATES DELIBERATELY LEFT:
//   wa_mount_crowder_southwest_route (45) — its own pitch_detail carries a stage graded "Steep snow /
//     Class 3-4". The claim that this stage belongs to a Pickets-traverse bypass rather than to the
//     route needs knowledge outside the row, and clearing the number while the row still describes
//     steep snow is the under-warning direction.
//   wa_mount_torment_torment_forbidden_traverse (65) — 15 degrees over its own pitch_detail's "up to
//     ~50°", so the value is wrong; but this is a genuine ice line (ice_grade "AI2-AI3") and the
//     honest repair is 50 from its own text rather than nothing. Recorded, not written.
//
// Two more rows found while checking these state no angle either and are NOT in any verdict:
// wa_mount_constance_west_arete (50) and wa_mount_carrie_standard (50). Flagged, not swept.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "set", route: "wa_mount_sefrit_southwest_ridge", path: "max_angle",
    expect: "9f14025af0065b30", value: null,
    why: "the sibling route's sourced 35, on a row that states no angle and climbs no snow" },
  { kind: "set", route: "wa_kololo_peaks_standard", path: "max_angle",
    expect: "73475cb40a568e8d", value: null,
    why: "42 is a catalog singleton on a Class 2-3 walk-up whose technical score is 1 of 5" },
  { kind: "set", route: "wa_mount_daniel_daniel_glacier", path: "max_angle",
    expect: "7688b6ef52555962", value: null,
    why: "the only 56 in 317 rows, on a glacier route carrying no screws and no second tool" },
  { kind: "set", route: "wa_mount_torment_south_ridge", path: "max_angle",
    expect: "02d20bbd7e394ad5", value: null,
    why: "55 on a route whose pitches are all 5.4-5.5 rock; its one angle belongs to a different climb" },
  { kind: "set", route: "wa_mount_constance_finger_traverse", path: "max_angle",
    expect: "1a6562590ef19d10", value: null,
    why: "50 copied from a rock arete on the other side of the peak; neither row states an angle" },
  { kind: "set", route: "wa_mount_carrie_se_route", path: "max_angle",
    expect: "811786ad1ae74adf", value: null,
    why: "45-degree snow on a Class 2 finish an ice axe is merely 'advisable' for" },

  { kind: "set", route: "wa_ottohorn_southeast_route", path: "max_angle",
    expect: "1a6562590ef19d10", value: 35,
    why: "the row states 35 three times for the Barrier gully; nothing anywhere supports 50" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,max_angle",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
