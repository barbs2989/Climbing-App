// Six routes whose GRADES panel prints two different roman numerals for what a reader takes as one
// scale — repaired only where the row itself says which is right. Nothing is typed: every value is
// copied from the row's other field.
//
// THE COLUMN HOLDS THREE VOCABULARIES AT ONCE, measured before touching anything. Of 502 WA rows
// carrying alpine_grade:
//     188  a bare ROMAN numeral (I-VI) — which is the NCCS COMMITMENT vocabulary
//     184  the FRENCH adjectival scale (F/PD/AD/D/TD/ED) the contribute form actually offers
//     130  neither — "Grade II" x35, "II-III" x16, and even "Class 2-3" x4 and "Class 3-4" x3
//
// RouteDetail's GRADES panel pushes commitment and alpine_grade onto one row, so a route storing a
// roman in both prints "Commitment II" beside "Alpine III". 179 rows do exactly that; 159 (89%)
// store the SAME numeral, which is harmless duplication, and 20 store different ones, which reads as
// a contradiction on screen.
//
// WHETHER alpine_grade SHOULD CARRY ROMANS AT ALL IS NOT DECIDED HERE, and deliberately so: 188
// against 184 is not a majority and a minority, it is a column used two ways in equal measure.
// Clearing the roman half would touch 188 rows on a judgement about what the column is FOR, which is
// a product decision rather than a data repair. Recorded for the owner; only the visible
// contradictions are fixed.
//
// TWO ARE DECIDED BY THE ROW'S OWN SHAPE, and both are extreme:
//
//   wa_smears_jugs_and_rock_roll   alpine_grade VI+ against commitment I. NCCS Grade VI means a
//     multi-day big wall. This row records pitches 1, length_m 9 — NINE METRES — grade 5.10a, and an
//     overview reading "A single-pitch alpine granite route ... accessible as top-rope or traditional
//     lead", with difficulty.commitment 2 of 5. The stored I is right and VI+ is off by the whole
//     scale.
//   wa_north_ridge_west_side       alpine_grade IV against commitment II, on 3 pitches of 5.4 over
//     152 m with difficulty.commitment 2 and a 9-hour day. Grade IV is a very long committing route;
//     II fits what the row describes.
//
// FOUR ARE ARBITRATED BY A THIRD RECORD — the roman stated inside the row's OWN grade string, which
// neither of the two fields produced:
//
//   wa_east_ridge_4                grade "IV, 5.9"                 -> IV   (alpine_grade was right)
//   wa_frying_pan_whitman_glaciers grade "Grade II+, Class 3-4"    -> II+  (alpine_grade was right)
//   wa_little_tahoma_east_shoulder grade "Grade II+, Class 3-4"    -> II+  (alpine_grade was right)
//   wa_the_temple_south_ridge      grade "Grade II, Class 3 to 4"  -> II   (commitment was right)
//
// Note the last one runs the other way, which is what makes this an arbitration rather than a rule
// about which column to trust.
//
// FOURTEEN OF THE TWENTY ARE LEFT, because nothing in them decides it. Two are not even
// disagreements: wa_mount_rainier_disappointment_cleaver and wa_mount_rainier_emmons_glacier both
// store grade "Grade II-III glacier" and hold II and III — the two ENDS of the range the row itself
// states. The panel presents them awkwardly, but neither value is wrong, and picking one would
// discard half of what the row says.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "copy", route: "wa_smears_jugs_and_rock_roll", path: "alpine_grade",
    expect: "385739dc20edb34b", from: "commitment",
    why: "Grade VI+ (a multi-day big wall) on a 1-pitch, 9 m route its own overview calls top-ropeable" },
  { kind: "copy", route: "wa_north_ridge_west_side", path: "alpine_grade",
    expect: "2c65a48513a36d84", from: "commitment",
    why: "Grade IV on 3 pitches of 5.4 over 152 m, with difficulty.commitment 2 of 5" },

  { kind: "copy", route: "wa_east_ridge_4", path: "commitment",
    expect: "399dbc8659309a24", from: "alpine_grade",
    why: "the row's own grade string reads \"IV, 5.9\", which is alpine_grade's value, not commitment's" },
  { kind: "copy", route: "wa_frying_pan_whitman_glaciers", path: "commitment",
    expect: "2e561ff2355c0648", from: "alpine_grade",
    why: "the row's own grade string reads \"Grade II+\", including the plus commitment had dropped" },
  { kind: "copy", route: "wa_little_tahoma_east_shoulder", path: "commitment",
    expect: "2e561ff2355c0648", from: "alpine_grade",
    why: "the same, on the sibling row carrying the same grade string" },
  { kind: "copy", route: "wa_the_temple_south_ridge", path: "alpine_grade",
    expect: "ffc624ad6149a6d1", from: "commitment",
    why: "the arbitration running the other way — the grade string reads \"Grade II\", with no plus" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,alpine_grade,commitment,grade",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
