// WHICH HOME CARDS YOU CLOSED, kept on this device.
//
// Home's ✕ buttons write to `homeDismiss`, which was plain React state: closing *Finish setting
// up* hid it until the next reload, then it came back (owner, 2026-11-14: "why does finish
// setting up sometimes show and sometimes doesn't?"). The owner asked for it to stick; this is
// the explicit persistence CLAUDE.md asks for before touching storage.
//
// Stored per account ("guest" when signed out), because two people can share a browser and a
// guest's ✕ must not hide the card from the account that signs in next.
//
// Only the keys in PERSISTED are kept. "climbsetup" (Set up your climbing profile) is left out
// on purpose: onboarding is required, so closing that card still lasts only until reload.
// Closing *Finish setting up* is not silence either -- the bell raises "Finish setting up"
// while the card is dismissed and the profile is still incomplete (ClimbMatch's profile_setup).

const KEY = "climbmatch-home-dismiss.";
export const PERSISTED = ["setup"];

// localStorage throws in Safari private mode and when over quota; Home must not break on it.
export function loadHomeDismiss(uid) {
  try {
    const raw = localStorage.getItem(KEY + (uid || "guest"));
    if (raw == null) return [];
    const v = JSON.parse(raw);
    // Shape-checked on read: the key is user-writable and outlives deploys.
    return Array.isArray(v) ? v.filter((x) => PERSISTED.includes(x)) : [];
  } catch {
    return [];
  }
}

export function saveHomeDismiss(uid, keys) {
  try {
    const kept = (keys || []).filter((x, i, a) => PERSISTED.includes(x) && a.indexOf(x) === i);
    localStorage.setItem(KEY + (uid || "guest"), JSON.stringify(kept));
  } catch {
    /* a convenience, not a record: a failed write keeps today's in-memory state */
  }
}
