// Display preferences that survive a reload: the units toggle and the date/time format.
//
// CLAUDE.md's standing rule is that "saving" means React state unless persistence was explicitly
// asked for. It was asked for. The gap was real and identical in both: each was a `useState`
// with no storage anywhere, so a climber re-picked metric — and re-picked their date format — on
// every single load. A setting that silently resets is worse than no setting: it is a control
// that appears to work.
//
// WHY localStorage AND NOT `profiles` COLUMNS. Both were on the table; this is the smaller and
// more correct one:
//   - it works SIGNED OUT. The app is browsable without an account, and a column reaches nobody
//     until they sign in — which is exactly when a first-time visitor is deciding whether the
//     numbers and dates make sense to them.
//   - these are DEVICE DISPLAY preferences, not account data. A phone and a laptop can honestly
//     disagree about units; a climbing grade or a home area cannot.
//   - no migration, no RLS policy, no network round trip before the first paint.
// The cost, stated rather than hidden: they do NOT follow you to another device. If that is
// wanted later it is a column ON TOP of this, not instead of it — the local value is what makes
// the first render correct before any query resolves.
//
// WHAT IS DELIBERATELY *NOT* HERE. `showOnRanks` and `notifPrefs` look like the same defect and
// are not. `showOnRanks` is `showOnRanks?[me]:[]` against a CLIENT-SIDE board built from seed
// climbers — a local view filter whose label ("Show me on leaderboards") reads as a claim about
// what other people see. Persisting it would make a promise the app cannot keep *permanent*
// instead of merely temporary. Both need real columns to mean what their labels say.
//
// EVERY ACCESS IS WRAPPED, and not from habit: `localStorage` THROWS rather than returning null
// in Safari private mode and when a profile is out of quota, and the identifier does not exist at
// all under `renderToStaticMarkup` — which is how a dozen guards render this app. A display
// preference must never be able to take a screen down with it. `lib/recent.js` records the same
// reasoning; this follows its conventions rather than inventing a second set.

/* ONE read and ONE write, shared. Two near-identical try/catch pairs is how this codebase ended
   up with four grade parsers, and a preference module is exactly where that starts. */
function read(key, valid, dflt) {
  try {
    const v = localStorage.getItem(key);
    return valid.indexOf(v) >= 0 ? v : dflt;
  } catch {
    // Includes the ReferenceError when `localStorage` does not exist at all (node, SSR).
    return dflt;
  }
}

function write(key, valid, v) {
  if (valid.indexOf(v) < 0) return;
  try { localStorage.setItem(key, v); } catch { /* full or blocked — the in-memory choice still stands for this session */ }
}

/* Shape-checked on READ as well as on write. Both keys are user-writable from devtools and
   survive across deploys, so an older build or a fat-fingered edit could have left anything
   there. The lesson lib/recent.js records, for the same reason. */

// ── Units ───────────────────────────────────────────────────────────────────────────────────
const KEY_UNITS = "climbmatch-units";
export const VALID_UNITS = ["imperial", "metric"];
export const DEFAULT_UNITS = "imperial";

/** The stored units preference, or the default. Safe during SSR and in private mode. */
export function loadUnits() { return read(KEY_UNITS, VALID_UNITS, DEFAULT_UNITS); }
/** Remember the choice. Refuses to write a value the app cannot read back. */
export function saveUnits(u) { write(KEY_UNITS, VALID_UNITS, u); }

// ── Date and time format ────────────────────────────────────────────────────────────────────
const KEY_DATE_FMT = "climbmatch-date-format";
export const VALID_DATE_FMTS = ["auto", "us", "intl"];
export const DEFAULT_DATE_FMT = "auto";

export function loadDateFmt() { return read(KEY_DATE_FMT, VALID_DATE_FMTS, DEFAULT_DATE_FMT); }
export function saveDateFmt(v) { write(KEY_DATE_FMT, VALID_DATE_FMTS, v); }

/* The BCP-47 tag for a format choice, written once. This expression appeared THREE times in
   ClimbMatch.jsx — once driving `__set_DLOCALE`, twice in the Settings preview line — so the
   thing a climber is shown as an example and the thing the app actually formats with were two
   copies of one rule, free to drift.
   `undefined` is the meaningful answer for "auto", NOT a missing value: `toLocaleDateString`
   treats it as "use the runtime's own locale", which is exactly what "Match my device" promises.
   Returning a concrete tag there would silently override the device. */
export function dateFmtToLocale(f) {
  return f === "us" ? "en-US" : f === "intl" ? "en-GB" : undefined;
}
