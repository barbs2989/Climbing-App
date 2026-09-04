import { definePref } from "./prefs.js";
// The date-format choice, persisted across reloads — and the one place that maps it to a locale.
//
// #1589 made the UNITS toggle survive a reload and stopped there. The Settings screen offers a
// second display preference right beside it, `dateFmt` (auto / US / international), and that one
// was still `useState("auto")` — so a climber who chose day-month-year got month-day-year back on
// the next load, on every date in the app. Same defect, same screen, one control over.
//
// A SIBLING OF lib/units-pref.js RATHER THAN A REWRITE OF IT. The two are five lines each and
// differ only in their key and their valid set, so folding them together would mean rewriting a
// file another session had just landed, for no behaviour change. TWO IS NOT A CLASS. If a THIRD
// stored preference appears, fold all three into one module then — that is the point at which the
// duplicated try/catch starts to be able to drift. THAT HAPPENED: see lib/prefs.js.
//
// EVERY ACCESS IS WRAPPED for the reason units-pref records: localStorage throws rather than
// returning null in Safari private mode and when a profile is out of quota, and the identifier is
// undefined entirely under renderToStaticMarkup, which is how a dozen guards render this app.
const KEY = "climbmatch-datefmt";

/* Validated on READ as well as on write, and MEASURED rather than assumed. My first version of
   this comment claimed any unrecognised value throws; it does not. Node and the browser agree:
   toLocaleDateString("furlongs") is a syntactically valid BCP-47 tag and quietly falls back,
   while toLocaleDateString("") throws RangeError. An EMPTY STRING is the reachable one — it is
   what a cleared or half-written key leaves behind — and this runs inside the Settings render,
   so it would take that screen down. The key is user-writable from devtools and survives across
   deploys, so junk needs nobody to do anything wrong. */
const VALID = ["auto", "us", "intl"];
export const DEFAULT_DATE_FMT = "auto";

/* THE FOLD THIS FILE ASKED FOR HAS HAPPENED. The note above says "if a THIRD stored preference
   appears, fold all three into one module then"; lib/inbox-pref.js is the third, so the guarded
   read/write now lives once in lib/prefs.js. Scoped to that concern: this file keeps its key,
   its valid set and its exported names, because rewriting call sites would be churn. */
const pref = definePref(KEY, VALID, DEFAULT_DATE_FMT);

/** The stored preference, or the default. Safe to call during SSR and in private mode. */
export const loadDateFmt = pref.load;

/** Remember the climber's choice. Refuses to write a value the app cannot read back. */
export const saveDateFmt = pref.save;

/* THE MAPPING LIVED IN THREE PLACES: once feeding __set_DLOCALE, and twice more in the Settings
   preview line ("Dates show like ..."), which calls toLocaleDateString and toLocaleTimeString
   separately. Three copies of one two-branch mapping is how a fourth format gets added to two of
   them — so it lives here, and `auto` returning undefined is deliberate: that is what asks Intl
   for the reader's own locale. */
export const dateFmtToLocale = (f) => (f === "us" ? "en-US" : f === "intl" ? "en-GB" : undefined);

// Exported so a probe can assert this list still covers every option the SELECT offers. A fourth
// format added to the UI and not here would persist as nothing and silently fall back to auto.
export const VALID_DATE_FMTS = VALID;
