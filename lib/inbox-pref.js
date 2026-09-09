// Which messages reach your inbox, remembered across reloads.
//
// This was the LAST setting on the Settings screen that did not survive a page load — found by
// deriving the control list off the screen rather than from a list somebody typed, which is what
// showed the screen has twelve controls and the census covered six.
//
// IT IS SAFE TO REMEMBER ONLY BECAUSE #1625 MADE THE LABEL HONEST. While it read "Who can
// message you" this control claimed a restriction on other people that the app cannot impose —
// nothing gates sending, the messages insert policy is `auth.uid() = sender_id` and no migration
// defines a permission column — so persisting it would have DURABLY kept a promise the app
// cannot keep. Now it says "Which messages reach your inbox", which is a view preference, and a
// view preference is exactly what the two modules beside this one store.
//
// The same reasoning is why `showOnRanks` is NOT here: it has no honest reading to make first,
// because the leaderboard it filters is built client-side from seed climbers.
//
// DEVICE-scoped, like units and the date format. It decides what THIS browser shows you, needs
// no migration or RLS, works signed out, and adds no read that can fail. An account column would
// be defensible too and is a bigger question; the local value is what makes the first render
// correct before any query resolves, so a column would sit on top of this rather than replace it.
import { definePref } from "./prefs.js";

// Every value the select offers. A fourth option added to the UI and not here would persist as
// nothing and silently fall back to "everyone" — the quiet-failure shape these modules remove.
const pref = definePref("climbmatch-inbox-filter", ["everyone", "requests", "friends"], "everyone");

export const loadInboxFilter = pref.load;
export const saveInboxFilter = pref.save;
export const VALID_INBOX_FILTERS = pref.VALID;
export const DEFAULT_INBOX_FILTER = pref.DEFAULT;
