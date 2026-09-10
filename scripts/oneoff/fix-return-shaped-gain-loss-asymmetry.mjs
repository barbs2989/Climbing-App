// A route that returns to its start loses exactly what it gains. Seven rows say otherwise.
//
// NOTHING HERE IS TYPED. Every repair is a `copy` from the row's own sibling field, so a fix that
// needed a number the catalog does not already hold cannot be expressed in this file at all — the
// same structural safety the trailhead-disagreement appliers use. That matters more than usual
// here, because gain_ft and loss_ft feed scarfHrs, and therefore Est. summit, Est. return and the
// "After dark" warning.
//
// THE FLOOR IS WHAT DECIDES WHICH HALF IS WRONG, and it is computed from each row's OWN pins:
// a party standing on the high point having started at the lowest pin has gained at least the
// difference, and a party back at that pin has lost at least the same. Every value replaced below
// is BELOW its row's floor, i.e. impossible on its own rather than merely inconsistent with its
// neighbour. Where only one of the two clears the floor, the other is the foreign value.
//
// THE CLIMBING VERTICAL IS CREDITED AGAINST GAIN AND NOT AGAINST LOSS, deliberately, and on two of
// these rows it changes the answer. gain_ft is the APPROACH gain, so pitches x 35 m is properly
// subtracted from its floor (check:gain-floor-stated's rule). A walk-off descent has no such
// credit: the party descends the whole rise on foot. wa_baring_mountain_r1 is the case — its 4
// pitches would excuse a loss of 3,500 against a credited floor of 3,388, but its own descent_text
// says "descending a separate walk-off line rather than rappelling the route", so the real floor is
// the full 3,847 and 3,500 is 347 ft under it.
//
// TWO REPLACED VALUES HAVE AN IDENTIFIABLE ORIGIN, which is what raises them from "inconsistent"
// to "a researched figure in the wrong column":
//   wa_baring_mountain_r1.loss_ft = 3,500 is the American Alpine Journal's "3500-foot high" north
//     FACE, sitting in a column the planner reads as elevation loss.
//   wa_scramble_route.loss_ft = 2,955 is NPS's published gain for the Eagle Peak trail, which ends
//     at the 5,720 ft SADDLE (5,720 - 2,760 = 2,960). It is a gain to a point short of the summit,
//     stored as the descent from it.
// wa_baring_mountain_south_route.gain_ft = 3,925 is the third: it is the sibling r1 row's gain_ft,
// against 3,847 stated three times in this row's own loss_ft, itinerary days and totalNote.
//
// WHAT THIS COSTS, stated because it is a real loss: once loss_ft equals gain_ft the two stop being
// independent records and neither can corroborate the other again. That is worth paying only where
// the stored value is impossible rather than merely odd, which is the bar applied to all seven.
// Rows where BOTH values clear the floor (wa_fortress_mountain_east_ridge,
// wa_mount_rainier_liberty_ridge, wa_forbidden_peak_west_ridge and 16 more) are deliberately left
// alone, as is wa_south_early_winter_spire_east_buttress, where the shortfall is 18 ft — inside the
// noise, and a verdict at the boundary is not a verdict. wa_argonaut_peak_east_ridge is left too,
// for the opposite reason: its gain_ft is ALSO below its floor, so copying it would launder an
// impossible value into a second column and silence the caveat the app already prints.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // gain 7,000 / loss 2,400. Trailhead pin 2,100, summit 8,322, so the bare rise is 6,222 and a
  // party back at the car has lost that whatever line they took — the row's own descent_text says
  // the exit is "over the top and down the other side", not a rappel of the buttress. 2,400 is
  // 3,822 ft under the minimum. gain 7,000 is the rise plus 778 ft of undulation across Luna Cirque.
  { kind: "copy", route: "wa_mount_fury_east_north_buttress", path: "loss_ft",
    expect: "8350242b2df439d2", from: "gain_ft",
    why: "loss 2,400 cannot return a party from an 8,322 ft summit to a 2,100 ft trailhead" },

  // gain 4,000 / loss 6,712 — and 6,712 is EXACTLY this row's own bare rise (8,872 - 2,160), while
  // its itinerary days sum to 6,700 both ways. Two internal records agree on the loss; gain 4,000
  // is 2,712 ft below the rise and still 1,794 ft below it after crediting all 8 pitches.
  { kind: "copy", route: "wa_eldorado_peak_eldorado_glacier_nw", path: "gain_ft",
    expect: "b090147020e03353", from: "loss_ft",
    why: "gain 4,000 is below the row's own 6,712 ft rise, which loss_ft already states exactly" },

  // gain 3,800 / loss 2,040 against a bare rise of 3,840, which the itinerary also states as its
  // day-2 lossFt. 2,040 is 1,800 short — exactly this row's approach_variants gainFt, so it reads
  // as one leg of the approach standing in for the whole descent.
  { kind: "copy", route: "wa_mix_up_peak_east_face", path: "loss_ft",
    expect: "df34d853f2f2f1f1", from: "gain_ft",
    why: "loss 2,040 is 1,800 ft under the row's own rise, and its itinerary says 3,840 both ways" },

  // gain 3,297 / loss 2,955 against a bare rise of 3,198 with no pitches to credit. 2,955 is NPS's
  // published gain to the saddle where the maintained trail ends (5,720 - 2,760 = 2,960).
  { kind: "copy", route: "wa_scramble_route", path: "loss_ft",
    expect: "f44e880825c750bb", from: "gain_ft",
    why: "loss 2,955 is NPS's gain to the saddle, 243 ft under this route's own trailhead-to-summit rise" },

  // gain 4,950 / loss 4,650 against a bare rise of 4,899 and no pitch count to credit. The 4,650 is
  // the row's own itinerary total (2,600+2,050), which stops one bench short of the summit.
  { kind: "copy", route: "wa_kimtah_peak_scramble", path: "loss_ft",
    expect: "3834287db1cc2b10", from: "gain_ft",
    why: "loss 4,650 is 249 ft under the drop from an 8,649 ft summit to a 3,750 ft trailhead" },

  // gain 3,925 / loss 3,500 on a LOOP back to the same trailhead. See the header on why the 4
  // pitches do not excuse it: the descent is a walk-off, so the floor is the full 3,847.
  { kind: "copy", route: "wa_baring_mountain_r1", path: "loss_ft",
    expect: "889e2fc00981675e", from: "gain_ft",
    why: "loss 3,500 is the AAJ's published face height, 347 ft under the loop's own minimum descent" },

  // The mirror, on the sibling: here LOSS is the sound half. 3,847 is the exact bare rise and the
  // row states it three times (loss_ft, itinerary.days[0].gainFt/.lossFt, and totalNote "3,847 ft
  // gain"), against gain_ft 3,925 which is the r1 row's value. 3,847 wins 4-1 inside the row.
  { kind: "copy", route: "wa_baring_mountain_south_route", path: "gain_ft",
    expect: "6686fc4c74906865", from: "loss_ft",
    why: "gain 3,925 is the sibling North Face row's figure; this row says 3,847 in four places" },
  // ...and the fourth figure in the same row, so the edit does not leave a new disagreement behind.
  { kind: "copy", route: "wa_baring_mountain_south_route", path: "approach_variants.0.gainFt",
    expect: "0beca2a0d29301bb", from: "loss_ft",
    why: "a fifth value, 3,911, matching nothing else in the row" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,gain_ft,loss_ft,approach_variants",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
