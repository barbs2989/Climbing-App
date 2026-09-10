// Whether this browser has already opened the onboarding sheet by itself.
//
// ONE ACCOUNT FACT AND ONE DEVICE PREFERENCE, and keeping the two apart is the whole design.
// "Has this climber onboarded?" is a property of the ACCOUNT, so it is derived from the profile
// row -- no disciplines recorded means they never finished -- which is right on a second device,
// survives a reinstall, and needs no column. "Have I already had this sheet opened at me?" is a
// property of THIS BROWSER, so it lives here. Storing the first one locally would re-onboard a
// climber every time they signed in somewhere new; deriving the second from the account would
// need a column to record something no other screen cares about.
//
// WITHOUT IT THE AUTO-OPEN IS A NAG, and that is exactly why the journey walk reported this as a
// product call rather than building it. `onboarded` is `useState(DEMO_AUTOLOGIN)` -- false on
// EVERY load for a real account -- so keying the sheet on the account fact alone reopens it on
// every single page load until the climber completes it.
//
// The sheet opens ONCE per device. After that the "Set up your climbing profile" card on Home is
// the way back in, and that card stays until the account has genuinely onboarded -- so skipping
// the sheet costs the climber nothing, and does not cost them the path.
//
// DEVICE-scoped for the reason lib/inbox-pref.js records: it decides what THIS browser does, it
// needs no migration and no RLS, it works before any query resolves, and it adds no read that
// can fail. Losing it (private mode, cleared site data) reopens the sheet once, which is the
// harmless direction -- the account fact still decides whether it opens at all.
import { definePref } from "./prefs.js";

// Two values rather than a raw boolean because `definePref` validates against a list on READ as
// well as on write, so anything else left in the key by an older build reads as "not prompted"
// and costs one reopen rather than persisting junk as a preference.
const pref = definePref("climbmatch-onboard-prompted", ["yes", "no"], "no");

export const onboardPrompted = () => pref.load() === "yes";
export const markOnboardPrompted = () => pref.save("yes");
