/* A repeating group event is a SERIES: separate group_events rows sharing a series_id. This file is the one place
   that decides its dates -- the create form, and the event sheet's "Add more" for a series that is running out. */

/** How many events one round of a series schedules. @type {Record<string, number>} */
export const SERIES_COUNTS = { weekly: 10, biweekly: 8, monthly: 6 };
/** @type {Record<string, number>} */
const SERIES_STEP_DAYS = { weekly: 7, biweekly: 14 };

/** @param {number} v */
const pad = (v) => String(v).padStart(2, "0");

/** Dates of a series as YYYY-MM-DD, built from calendar fields and never through UTC (toISOString moved the day in
    zones far ahead of it). Monthly keeps the day of the month and CLAMPS it to the month's last day: setMonth()
    rolled Jan 31 into Mar 3, skipping February.
    @param {string} start the first date, YYYY-MM-DD
    @param {string} rep weekly | biweekly | monthly; anything else is a single date
    @param {{ from?: number, count?: number, anchorDay?: number }} [opt] `from` 1 starts at the step AFTER `start`;
      `anchorDay` is the day of the month a monthly series aims for when `start` is itself a clamped date
    @returns {string[]} */
export function seriesDates(start, rep, opt) {
  const o = opt || {};
  const [y, m, d] = String(start).split("-").map(Number);
  const from = o.from || 0, n = o.count || SERIES_COUNTS[rep] || 1, day = o.anchorDay || d;
  /** @type {string[]} */
  const out = [];
  for (let i = from; i < from + n; i++) {
    const dt = rep === "monthly"
      ? new Date(y, m - 1 + i, Math.min(day, new Date(y, m + i, 0).getDate()))
      : new Date(y, m - 1, d + i * (SERIES_STEP_DAYS[rep] || 0));
    out.push(dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate()));
  }
  return out;
}

/** The next round of dates for a series that already has `dates`: it continues from the LAST one, and a monthly
    series aims for the latest day of the month any of its events sits on (so Jan 31, Feb 28 continues Mar 31).
    @param {string[]} dates @param {string} rep @returns {string[]} */
export function seriesExtension(dates, rep) {
  const have = (dates || []).filter(Boolean).slice().sort();
  if (!have.length || !SERIES_COUNTS[rep]) return [];
  const anchorDay = Math.max.apply(null, have.map((s) => Number(s.split("-")[2]) || 1));
  return seriesDates(have[have.length - 1], rep, { from: 1, anchorDay });
}

/** The events of `ev`'s series dated after it, soonest first.
    @template {{ id: string|number, date: string, seriesId?: string|null }} E
    @param {E[]} list @param {E} ev @returns {E[]} */
export function seriesLater(list, ev) {
  if (!ev || !ev.seriesId) return [];
  return (list || []).filter((e) => e && e.seriesId === ev.seriesId && e.id !== ev.id && e.date > ev.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
