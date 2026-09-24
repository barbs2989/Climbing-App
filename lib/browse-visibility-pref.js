// Whether this browser attaches your name and photo to your presence on a route.
//
// THE ENFORCEMENT IS OMISSION AT BROADCAST, WHICH IS STRONGER THAN A COLUMN AND A POLICY.
// `useRoutePresence` reads this and calls `channel.track(visible ? {id,name,avatar,visible:true}
// : {id,visible:false})`. With it off your name and avatar are NEVER TRANSMITTED, so there is no
// row anywhere for a policy to protect and no other client has anything to filter. Compare the
// column-backed switches beside it in Settings, where the value sits in a publicly-readable
// `profiles` row and the switch only governs whether a reader's app chooses to surface it.
//
// DEVICE-SCOPED RATHER THAN A `profiles` COLUMN, and the asymmetry is deliberate rather than the
// cheap option:
//   - PRESENCE IS ALREADY PER-DEVICE. You are "viewing now" from the browser you are browsing in,
//     so "should this browser announce me" is the question actually being asked. A column would
//     answer a question nobody posed.
//   - THE COST OF NOT TRAVELLING IS IN THE SAFE DIRECTION. The default is "no", so a second device
//     starts INVISIBLE and the climber opts in again. A column that travelled would carry an
//     opt-in onto a device the climber has not thought about — which is the direction
//     `resume_public` guards against with `!!p.resume_public`, where an absent column HIDES rather
//     than exposes.
//   - IT NEEDS NO READ THAT CAN FAIL. The value is in hand before any query resolves, so there is
//     no window in which a failed profile read makes a climber more visible than they chose.
//
// The trade is stated rather than hidden: turn it on at home and your phone at the crag is still
// anonymous until you turn it on there too.
//
// See lib/inbox-pref.js for the rule this follows — it is only safe to REMEMBER a control once
// the control is honest. This one governs something real, which is what separates it from the
// four privacy switches still behind `PRIVACY_CONTROLS_LIVE`: each of those is read by nothing
// but its own `aria-checked`, so persisting one would durably keep a promise the app cannot keep.
import { definePref } from "./prefs.js";

// Two values rather than a raw boolean because `definePref` validates against a list on READ as
// well as on write, so anything else left in the key by an older build or a devtools edit reads
// as the default rather than persisting junk as a privacy preference.
//
// The default is "no" — INVISIBLE. It is the value a climber who has never seen this control
// already has, so shipping the switch cannot make anybody more visible than they were.
const pref = definePref("climbmatch-visible-browsing", ["yes", "no"], "no");

export const visibleWhileBrowsingPref = () => pref.load() === "yes";
export const saveVisibleWhileBrowsing = (on) => pref.save(on ? "yes" : "no");
