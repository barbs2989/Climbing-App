// The one guarded read/write behind every stored display preference.
//
// lib/date-pref.js said, when it was a sibling of lib/units-pref.js: "TWO IS NOT A CLASS. If a
// THIRD stored preference appears, fold all three into one module then — that is the point at
// which the duplicated try/catch starts to be able to drift." A third has appeared, so this is
// that fold, and it is scoped to the CONCERN that note named: the guard logic, which now exists
// once. Neither existing module is deleted and no call site changes — each keeps its own key,
// its own valid set and its own public names, because those are what the rest of the app knows
// them by, and rewriting another session's just-merged file for no behaviour change is not a
// refactor, it is churn.
//
// EVERY ACCESS IS WRAPPED, and the reason is not defensive habit:
//   - localStorage THROWS rather than returning null in Safari private mode and when a profile
//     is out of quota;
//   - the identifier is undefined ENTIRELY under renderToStaticMarkup, which is how a dozen
//     guards render this app, so an unguarded read throws ReferenceError at MODULE LOAD and
//     takes all of them down. That is not hypothetical — it is a live injection case.
// A display preference must never be able to take a screen down with it.
//
// VALIDATED ON READ AS WELL AS ON WRITE. These keys are user-writable from devtools and survive
// across deploys, so an older build or a fat-fingered edit can leave anything there. Validating
// only on write trusts whatever is already stored.

/**
 * Define one stored preference. Returns its loader and saver, both safe during SSR and in
 * private mode, and both refusing any value the app cannot read back.
 *
 * @param {string} key   the localStorage key, e.g. "climbmatch-units"
 * @param {string[]} valid  every value the control can actually offer
 * @param {string} dflt  what to use when nothing valid is stored
 */
export function definePref(key, valid, dflt) {
  const load = () => {
    try {
      const v = localStorage.getItem(key);
      return valid.indexOf(v) >= 0 ? v : dflt;
    } catch {
      // Includes the ReferenceError when `localStorage` does not exist at all (node, SSR).
      return dflt;
    }
  };
  const save = (v) => {
    if (valid.indexOf(v) < 0) return;
    try { localStorage.setItem(key, v); } catch { /* full or blocked — the in-memory choice stands for this session */ }
  };
  return { load, save, VALID: valid, DEFAULT: dflt };
}
