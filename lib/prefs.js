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

/**
 * Define one stored preference that is a SET OF FLAGS rather than a single value — a group of
 * switches that are read together, like the four under Settings > Notifications.
 *
 * It is a second function rather than a widening of `definePref` because the two validate
 * differently and the difference matters: a scalar preference is one of a short list, while this
 * one is an OBJECT whose keys are known and whose values must each be a boolean. Reading a
 * stored `{crew:"yes"}` back as truthy would persist junk as a preference, which is the thing
 * validating on read exists to stop.
 *
 * An UNKNOWN key is dropped and a MISSING one takes its default, so a switch added to the UI
 * later starts at its default for a climber who already has a value stored, and a switch removed
 * from the UI stops being read back. Neither can throw, and neither leaves a stale key deciding
 * anything.
 *
 * @param {string} key    the localStorage key, e.g. "climbmatch-notif-prefs"
 * @param {string[]} flags  every switch the control group offers
 * @param {boolean} dflt  what an unset switch means
 */
export function defineFlagSet(key, flags, dflt) {
  const base = () => { const o = {}; for (const f of flags) o[f] = dflt; return o; };
  const load = () => {
    const out = base();
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return out;
      const v = JSON.parse(raw);
      if (!v || typeof v !== "object" || Array.isArray(v)) return out;
      for (const f of flags) if (typeof v[f] === "boolean") out[f] = v[f];
      return out;
    } catch {
      // Includes a malformed JSON.parse, and the ReferenceError when `localStorage` does not
      // exist at all (node, SSR). A display preference must never take a screen down with it.
      return out;
    }
  };
  const save = (v) => {
    if (!v || typeof v !== "object") return;
    const out = {};
    for (const f of flags) if (typeof v[f] === "boolean") out[f] = v[f];
    try { localStorage.setItem(key, JSON.stringify(out)); } catch { /* full or blocked — the in-memory choice stands for this session */ }
  };
  return { load, save, FLAGS: flags, DEFAULT: dflt };
}
