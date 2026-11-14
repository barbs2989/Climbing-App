// One username rule for onboarding and Edit profile (0420).
//
// The LOCK itself is the database's (profiles_username_lock): a username can be changed once within
// 7 days of first choosing it, then never from the app. This file only mirrors that rule so the
// screens can say so before a Save is refused, and turns the database's refusals into sentences.
import { hasVulgarity } from "../ClimbMatchCore.jsx";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_GRACE_DAYS = 7;

/** What a username box keeps as you type: lowercase letters, digits and underscores, capped. */
export const cleanUsername = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, USERNAME_MAX);

/** The reason a username cannot be saved, or "" when it can. */
export function usernameProblem(u) {
  const s = String(u || "").trim();
  if (s.length < USERNAME_MIN) return "Pick a username with at least " + USERNAME_MIN + " characters.";
  if (s.length > USERNAME_MAX) return "Keep it to " + USERNAME_MAX + " characters or fewer.";
  if (!/^[a-z0-9_]+$/.test(s)) return "Use lowercase letters, numbers and underscores only.";
  if (hasVulgarity(s)) return "Please choose a username without offensive language.";
  return "";
}

/**
 * Where an account stands under the lock.
 *   { state: "unset" }                       no username yet: choose freely
 *   { state: "grace", until: Date }          one change left, until `until`
 *   { state: "locked" }                      no more changes from the app
 * `setAt` null with a username means the row predates 0420's backfill: treat it as locked rather
 * than promise a change the database would refuse.
 */
export function usernameLock(username, setAt, changes) {
  if (!String(username || "").trim()) return { state: "unset" };
  const t = setAt ? Date.parse(setAt) : NaN;
  if (!Number.isFinite(t) || (changes || 0) >= 1) return { state: "locked" };
  const until = new Date(t + USERNAME_GRACE_DAYS * 86400000);
  return until.getTime() > Date.now() ? { state: "grace", until } : { state: "locked" };
}

/** A save refused by the database, in words for the climber. Falls back to `fallback`. */
export function usernameSaveError(err, wanted, fallback) {
  if (!err) return fallback || "";
  if (err.code === "23505") return "@" + wanted + " is taken — try another.";
  const m = String(err.message || "");
  if (/username_locked/.test(m)) return m.replace(/^.*username_locked:\s*/, "").replace(/^./, (c) => c.toUpperCase()) + ".";
  return fallback || "Couldn’t save your username. Check your connection and try again.";
}
