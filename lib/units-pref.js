import { definePref } from "./prefs.js";
// The units toggle, persisted across reloads.
//
// CLAUDE.md's standing rule is that "saving" means React state unless persistence was explicitly
// asked for. It was asked for here, and the gap was real: `units` was `useState("imperial")` with
// no storage anywhere, so a metric climber re-picked metric on every single load — and not just
// for the forecast, but for every elevation, distance, pace and pack weight in the app. A setting
// that resets is worse than no setting: it is a control that appears to work and silently does not.
//
// WHY localStorage AND NOT A `profiles` COLUMN. Both were on the table and this is the smaller,
// more correct one:
//   - it works SIGNED OUT. The app is browsable without an account, and a column reaches nobody
//     until they sign in — which is exactly when a first-time visitor is deciding whether the
//     numbers make sense to them.
//   - units are a DEVICE DISPLAY preference, not account data. A phone and a laptop can honestly
//     disagree; a climbing grade or a home area cannot.
//   - no migration, no RLS policy, no network round trip on first paint.
// The cost, stated rather than hidden: the preference does NOT follow you to another device. If
// that is wanted later it is a column ON TOP of this, not instead of it — the local value is what
// makes the first render correct before any query resolves.
//
// EVERY ACCESS IS WRAPPED, and that is not defensive habit. `localStorage` THROWS rather than
// returning null in Safari private mode and when a profile is out of quota, and the identifier is
// undefined entirely under `renderToStaticMarkup` — which is how a dozen guards render this app.
// A units preference must never be able to take a screen down with it. `lib/recent.js` records the
// same reasoning; this follows its conventions rather than inventing a second set.
const KEY = "climbmatch-units";

/* The app's own test is `UNITS !== "metric"`, so an unrecognised value already degrades to
   imperial and cannot mis-convert anything. Validating anyway is about not TREATING junk as a
   preference: the key is user-writable from devtools and survives across deploys, so an older
   build or a fat-fingered edit could have left anything here. Shape-check on read, not only on
   write -- the lesson lib/recent.js records for the same reason. */
const VALID = ["imperial", "metric"];
export const DEFAULT_UNITS = "imperial";

/* The guarded read/write moved to lib/prefs.js when a THIRD stored preference appeared, which is
   the point lib/date-pref.js named for folding it: one try/catch rather than three that can
   drift. Nothing else changed — same key, same valid set, same exported names. */
const pref = definePref(KEY, VALID, DEFAULT_UNITS);

/** The stored preference, or the default. Safe to call during SSR and in private mode. */
export const loadUnits = pref.load;

/** Remember the climber's choice. Refuses to write a value the app cannot read back. */
export const saveUnits = pref.save;

// Exported so a probe can assert this list still covers every option the toggle OFFERS. A third
// unit system added to the UI and not here would persist as nothing and silently fall back to
// imperial, which is the quiet-failure shape this file exists to remove.
export const VALID_UNITS = VALID;
