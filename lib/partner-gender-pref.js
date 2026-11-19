// Which genders partner search is narrowed to, remembered on this device.
//
// A SAFETY PREFERENCE, so it is remembered rather than reset on every visit: the climber who picks
// "Women" and "Non-binary" (RockBase, GoWith and Bumble offer the same kind of filter, for the same
// reason) should not meet the unfiltered list again the next time the tab opens. DEVICE-scoped,
// like lib/browse-visibility-pref.js: it decides only what THIS browser shows its owner, so it needs
// no column, no migration and no read that can fail before the list renders.
//
// It is a LIST since 2026-11-18 (owner: "they should also be able to select multiple at a time").
// Before that it was one yes/no, "only climbers of my gender", under the key LEGACY reads. A device
// that still holds that "yes" and has stored no list keeps its filter: the caller turns it into the
// climber's own gender once that is known (see PartnerSearch). The first pick made in the new
// control stores a list, and the old key is never read again.
import { definePref } from "./prefs.js";

const KEY = "climbmatch-partners-genders";
const LEGACY = definePref("climbmatch-partners-my-gender", ["yes", "no"], "no");

// The stored list of gender keys, or NULL when no list has ever been stored on this device.
// The caller keeps only keys the app still offers. Every access is wrapped for the reasons
// lib/prefs.js gives: localStorage throws in private mode and does not exist under SSR.
export const partnerGendersPref = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return null;
  }
};

export const savePartnerGenders = (list) => {
  try { localStorage.setItem(KEY, JSON.stringify((Array.isArray(list) ? list : []).filter((x) => typeof x === "string"))); } catch { /* full or blocked — the in-memory choice stands for this session */ }
};

// Was the old single switch left ON? Only meaningful while partnerGendersPref() is null.
export const partnersMyGenderLegacy = () => LEGACY.load() === "yes";
