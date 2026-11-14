// "Only climbers of my gender" in partner search, remembered on this device.
//
// A SAFETY PREFERENCE, so it is remembered rather than reset on every visit: the climber who turns it
// on (RockBase and GoWith offer the same filter, for the same reason -- climbing with someone of your
// own gender) should not meet the unfiltered list again the next time the tab opens. DEVICE-scoped,
// like lib/browse-visibility-pref.js: it decides only what THIS browser shows its owner, so it needs
// no column, no migration and no read that can fail before the list renders.
import { definePref } from "./prefs.js";

const pref = definePref("climbmatch-partners-my-gender", ["yes", "no"], "no");

export const partnersMyGenderPref = () => pref.load() === "yes";
export const savePartnersMyGender = (on) => pref.save(on ? "yes" : "no");
