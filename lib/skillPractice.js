/* "Last practiced" per skill (owner, 2026-11-14, after the technique research, PR #3331). Stored in
   profiles.skill_practiced (0430) as {skillKey: "YYYY-MM"} -- keyed by SKILLS key, never by label, so a
   renamed label cannot orphan it -- and self-reported, like the skills themselves.
   Why a refresher hint at all: a 2025 meta-analysis (Psychological Bulletin, 457 reports) found about half of a
   procedural skill gain is lost after ~6.5 months unused, and rescue skills are exactly the ones nobody uses.
   The hint shows on your OWN profile only and sends nothing: a reminder that pushes is opt-in and not built. */

import { currentDateLocale } from "./date-pref.js";

/** Months after which your own profile suggests a refresher. */
export const REFRESH_MONTHS = 12;

const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** @param {unknown} ym @returns {boolean} */
export function isPracticedMonth(ym) {
  return typeof ym === "string" && YM.test(ym);
}

/** "2026-03" -> "Mar 2026"; anything else -> "". @param {unknown} ym @returns {string} */
export function practicedLabel(ym) {
  if (!isPracticedMonth(ym)) return "";
  const [y, m] = String(ym).split("-").map(Number);
  try { return new Date(y, m - 1, 15).toLocaleDateString(currentDateLocale(), { month: "short", year: "numeric" }); } catch { return String(ym); }
}

/** Whole months from `ym` to `now`; null for no date. @param {unknown} ym @param {Date} [now] @returns {number|null} */
export function monthsSincePracticed(ym, now) {
  if (!isPracticedMonth(ym)) return null;
  const [y, m] = String(ym).split("-").map(Number);
  const d = now || new Date();
  return (d.getFullYear() - y) * 12 + (d.getMonth() + 1 - m);
}

/** Today's month as "YYYY-MM", the input's max. @param {Date} [now] @returns {string} */
export function thisMonth(now) {
  const d = now || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
