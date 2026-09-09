// Three rows that give two or three different answers about what a party must carry and pay.
// These are the fields somebody reads before leaving home, to decide which office to ring and
// whether to reserve — and in each case the row already contains the right answer next to the
// wrong one, so none of this needed a source.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// wa_nooksack_tower_beckey_route — the permit is FREE in two rendered fields and correctly
// $10 + $6 in a third. access.permit ends "Fee is $10/person plus a $6 reservation fee", which
// is the verified figure; itinerary.cal says "(free, day-of...)" and a waypoint's directions say
// "A free backcountry permit is required". A climber reading either of those arrives expecting
// to pick up a free permit on the way in.
const NOOK_ITIN_FIND = "NPS backcountry permit (free, day-of, from the Glacier, WA ranger station) required in North Cascades National Park";
const NOOK_ITIN_REPL = "NPS backcountry permit required in North Cascades National Park for overnight stays — $10 per person plus a $6 reservation fee, reserved on Recreation.gov";

const NOOK_WP_FIND = "A free backcountry permit is required in North Cascades National Park and can be picked up same-day from the ranger station in Glacier, on the way in.";
const NOOK_WP_REPL = "A North Cascades National Park backcountry permit is required for overnight stays: $10 per person plus a $6 reservation fee, reserved on Recreation.gov. In-person pickup is at the Glacier Public Service Center on Thursdays and Fridays in season; a walk-up can be requested by email the morning before.";

// ---------------------------------------------------------------------------------------------
// wa_lincoln_peak_north_ridge — three fields, three answers. `permit` asserts a required free
// self-issue permit; `access.permit` says none is required BUT that free self-issue permits are
// available; `bivy[0].permit` says none is required and none issued. The Forest Service scopes
// the self-issue wilderness permit to ALPINE LAKES, and the Mt Baker Wilderness page lists
// registration as optional — so bivy[0] is the correct one and the other two overstate.
const LINCOLN_PERMIT = "No wilderness permit is required for the Mount Baker Wilderness and none is issued. Trailhead registration is voluntary and worth doing so somebody knows you are up there. A Northwest Forest Pass or an interagency pass is needed at developed trailheads.";
const LINCOLN_ACCESS_PERMIT = "No wilderness permit required, and none is issued for this wilderness — trailhead registration is voluntary. The self-issue wilderness permit some parties expect is an Alpine Lakes requirement and does not apply here.";

// ---------------------------------------------------------------------------------------------
// wa_snowking_mountain_standard — `access.fees` is the one field out of step: three of the row's
// own fields (notes, permit, bivy[0].permit) say the permit is free and that FR-1570 has no
// developed trailhead, so a vehicle pass is not normally needed. `fees` asserts a pass IS needed
// and attaches a day-use figure.
//
// THE FIGURE IS REMOVED RATHER THAN CORRECTED, deliberately. The research established the live
// rate differs from the stored $8, but the standing rule here is that a fee is only reported
// wrong against a live agency page read in the session doing the writing, and I have not read
// one. Dropping a figure I cannot stand behind is honest; substituting one I have not verified
// is the same defect with a different number. The row's own access.parking_pass already carries
// the district-wide pass description for the general case.
const SNOWKING_FEES = "FR-1570 ends at a washout with no developed trailhead, so a recreation pass is not normally required to park there. Where this district does require one at a developed trailhead it is a Northwest Forest Pass or an interagency pass — check the sign at the trailhead you actually use.";

const REPAIRS = [
  { kind: "jsonedit", route: "wa_nooksack_tower_beckey_route", column: "itinerary",
    expect: "b2d8fc02fcd6f13a", find: NOOK_ITIN_FIND, repl: NOOK_ITIN_REPL, count: 1,
    why: "itinerary called the permit free; the row's own access.permit states $10 plus a $6 reservation fee" },
  { kind: "jsonedit", route: "wa_nooksack_tower_beckey_route", column: "waypoints",
    expect: "e276bf61d8828eaf", find: NOOK_WP_FIND, repl: NOOK_WP_REPL, count: 1,
    why: "the trailhead waypoint's directions called the permit free as well" },

  { kind: "set", route: "wa_lincoln_peak_north_ridge", path: "permit",
    expect: "06a0fb24a9369a09", value: LINCOLN_PERMIT,
    why: "asserted a required free self-issue permit that is an Alpine Lakes requirement, not a Mt Baker one" },
  { kind: "set", route: "wa_lincoln_peak_north_ridge", path: "access.permit",
    expect: "6ff980135293d054", value: LINCOLN_ACCESS_PERMIT,
    why: "said no permit is required and then offered one, which is where the confusion starts" },

  { kind: "set", route: "wa_snowking_mountain_standard", path: "access.fees",
    expect: "60e4eff4004d8186", value: SNOWKING_FEES,
    why: "the only field of four claiming a pass is needed at parking the row itself says is undeveloped, with a figure I cannot stand behind" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
