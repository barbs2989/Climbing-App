// Which alerts reach your notification list, remembered across reloads.
//
// TWO THINGS WERE WRONG WITH THIS CONTROL GROUP AND THE SECOND IS WHY THE FIRST WAS SAFE TO FIX.
//
// 1. ONE OF THE FOUR SWITCHES SUPPRESSED NOTHING. The filter is
//    `n => !n.cat || notifPrefs[n.cat] !== false`, so a switch only reaches notifications tagged
//    with its own key — and `cat:"messages"` appears on NO notification anywhere in the app,
//    signed in or signed out. Unread direct and crew messages surface as BADGES on the Crew tab,
//    not as entries in this list, so there was nothing for that switch to hide and never had
//    been. It is gone. A control that appears to work and silently does not is the shape
//    lib/units-pref.js was written to remove, and offering a switch for a delivery the app does
//    not have is the same defect wearing a settings label.
//
// 2. THE REMAINING THREE DID NOT SURVIVE A RELOAD. `useState({crew:true,...})`, no storage
//    anywhere — so a climber who muted crew updates had them back on the next load. That is the
//    defect lib/units-pref.js, lib/date-pref.js and lib/inbox-pref.js each closed for one control.
//
// PERSISTING FIRST WOULD HAVE BEEN WRONG, and lib/inbox-pref.js states the rule this follows:
// it is safe to remember a preference only once the control is honest, because remembering a
// switch that governs nothing DURABLY keeps a promise the app cannot keep. So the inert switch
// came out in the same change that gave the others a home.
//
// DEVICE-scoped, like the three modules beside this one. It decides what THIS browser shows its
// owner — not what anyone else can see or do — so it needs no migration, no RLS policy and no
// read that can fail, and it works signed out, which is how most of this app is browsed. An
// account column would be defensible on top of this later; it would not replace it, because the
// local value is what makes the first render correct before any query resolves.
import { defineFlagSet } from "./prefs.js";

/* Every switch the control group offers, and the ONLY keys read back out of storage. A switch
   added to the UI and not here would persist as nothing and silently revert on every load — the
   quiet-failure shape these modules exist to remove — so `check:notification-switches` asserts
   this list still matches the group the Settings screen renders, in both directions.

   It is also the list that decides what a stored value may contain: an unknown key is dropped on
   read, so the `messages` key already sitting in a returning climber's localStorage stops being
   read back rather than lingering as a preference for a switch that no longer exists. */
const FLAGS = ["crew", "conditions", "requests"];

/* Unset means SHOWN. A notification the climber has not chosen to mute must arrive, so the
   default has to be the permissive one — and it matches what the state was seeded with before
   anything was stored, so an existing climber sees no change until they touch a switch. */
export const DEFAULT_NOTIF_ON = true;

const pref = defineFlagSet("climbmatch-notif-prefs", FLAGS, DEFAULT_NOTIF_ON);

/** The stored preferences, or all-on. Safe to call during SSR and in private mode. */
export const loadNotifPrefs = pref.load;

/** Remember the climber's choices. Ignores any key the control group does not offer. */
export const saveNotifPrefs = pref.save;

// Exported so a guard can assert this covers every switch the UI offers, and nothing it does not.
export const NOTIF_FLAGS = FLAGS;
