// Tier 1, the one scalar class that is safe to write mechanically: an OUT-AND-BACK route's
// total loss equals its total gain BY DEFINITION. A party that returns to the car has given
// back every foot it climbed, so a loss_ft far below gain_ft is not an estimate, it is
// impossible - it would leave the party finishing thousands of feet above the trailhead.
//
// Each of these three rows says in its OWN descent_text that it reverses the ascent, so the
// route shape is established from the row rather than assumed. The value is COPIED from the
// row's own gain_ft; no figure is typed here, so a route whose gain is itself wrong cannot
// have a wrong loss invented for it - it just inherits the same number, which is what "equal
// by definition" means.
//
// DELIBERATELY NOT IN THIS BATCH, and both exclusions are documented rules rather than caution:
//   * the gain_ft FLOOR class (~7 findings). Those establish a MINIMUM from the row's own pins,
//     not a value. check:gain-floor-stated exists for exactly this and its own entry says it
//     REPORTS and does not substitute: the row may be measuring from a high camp it never
//     recorded, and TECH STATS renders gain_ft, so writing the floor puts two answers on one
//     screen. The app already states the caveat where it matters.
//   * wa_argonaut_peak_east_ridge.loss_ft. Its stored 4157 is provably an artifact - 8457
//     (high_point_ft) minus 4300 (gain_ft) is 4157 exactly, so the field holds the IMPLIED
//     START ELEVATION. But the same verdict finds gain_ft too small as well, so copying gain
//     onto loss would propagate a wrong number into a second field. It needs both fixed at once.
//   * dist_km (40 findings). CLAUDE.md is explicit that this column holds two conventions and
//     must never be normalised in bulk; 40 rows at once IS a bulk normalisation however
//     individually researched each verdict is. Its own reviewed batch.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // descent_text: "The standard descent reverses the south-ridge climbers' trail back down to
  // Virgin Lake and out Blanca Lake Trail #1052 to the trailhead"
  { kind: "copy", route: "wa_kyes_peak_glaciated_scramble", path: "loss_ft", from: "gain_ft",
    expect: "5b60f221d4a1852a",
    why: "loss_ft 707 against gain_ft 6023 on a route its own descent_text says returns to the trailhead" },

  // descent_text: "This is a walk-off/downclimb ... From the summit, reverse the exposed
  // Class 3 south-ridge scramble"
  { kind: "copy", route: "wa_whatcom_peak_southwest_route", path: "loss_ft", from: "gain_ft",
    expect: "117019447c8cafa1",
    why: "loss_ft 1374 against gain_ft 6840 on a route its own descent_text says is a walk-off reversal" },

  // descent_text: "Descend by reversing the ascent line: downclimb the Southwest Gully's
  // Class 3 loose scree ... back to the ridge saddle"
  { kind: "copy", route: "wa_katsuk_peak_gully", path: "loss_ft", from: "gain_ft",
    expect: "b0193ceb57d22ae3",
    why: "loss_ft 1450 against gain_ft 6000 on a route its own descent_text says reverses the ascent" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
