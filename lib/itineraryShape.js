// The ONE definition of what a route's `itinerary` (its Trip plan) may hold (owner, 2026-11-11:
// "text only plans convert day by day, make that a rule in the app when we do other routes and
// states").
//
// A trip plan is either NULL (no plan yet) or a STRUCTURED object:
//   { cal?, totalNote?, days: [{ n, title, objective?, note?, gainFt?, lossFt?, hours?, miles?,
//                                packLb?, schedule?: [{ time?, label, detail? }] }] }
// A prose STRING is not a plan: the page could only guess its days from "Day 1:" markers and could
// show no figures at all. 310 rows held one on 2026-11-11; all were converted, and migration 0409
// makes the database refuse a new one.
//
// Readers: scripts/pipeline/import-alpine.mjs (refuses a catalog pull that carries a bad plan),
// every scripts/oneoff/apply-trip-plans-*.mjs (refuses to write one), audit:itinerary-shape (the
// live table) and check:itinerary-shape (this file's own cases, and that those callers still call it).

const FIGURES = { gainFt: [0, 15000], lossFt: [0, 15000], miles: [0, 40], packLb: [0, 80] };
const HOURS_RANGE = /^\d{1,2}(\.\d)?\s*[-–]\s*\d{1,2}(\.\d)?$/;

/**
 * Every way `it` breaks the trip-plan shape, as short sentences; [] when it is fine.
 * Without options this is the SHAPE every stored plan must have (and migration 0409's check).
 * `opts.complete` is the bar a NEW or CONVERTED plan must clear: every day titled (<= 60 chars) and
 * carrying at least one of hours / miles / gainFt (a stored plan may still have gap days, which the
 * page shows as gaps).
 */
export function itineraryShapeErrors(it, opts) {
  const complete = !!(opts && opts.complete);
  if (it == null) return [];
  if (typeof it === "string") return ["text-only trip plan: write { days: [ … ] }, one object per day, not prose"];
  if (typeof it !== "object" || Array.isArray(it)) return ["trip plan is a " + (Array.isArray(it) ? "list" : typeof it) + ", not an object"];
  const out = [];
  if (!Array.isArray(it.days) || !it.days.length) out.push("trip plan has no days");
  for (const k of ["cal", "totalNote"]) if (it[k] != null && typeof it[k] !== "string") out.push(k + " is not text");
  (Array.isArray(it.days) ? it.days : []).forEach((d, i) => {
    const at = "day " + (i + 1) + ": ";
    if (!d || typeof d !== "object" || Array.isArray(d)) { out.push(at + "not an object"); return; }
    // SHAPE (every stored plan): a title, when present, is text. COMPLETE (a new or converted plan):
    // a title, and one that fits the day card's header. 11 stored plans carry a longer title that wraps
    // fine, and Bacon Peak's three days have none; neither is prose, so neither fails the stored rule.
    if (d.title != null && typeof d.title !== "string") out.push(at + "title is not text");
    if (complete && (typeof d.title !== "string" || !d.title.trim())) out.push(at + "no title");
    else if (complete && d.title.length > 60) out.push(at + "title over 60 characters");
    for (const [k, [lo, hi]] of Object.entries(FIGURES)) {
      const v = d[k];
      if (v != null && !(typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi)) out.push(at + k + " is not a number from " + lo + " to " + hi);
    }
    const h = d.hours;
    if (h != null && !((typeof h === "number" && h >= 0 && h <= 24) || (typeof h === "string" && HOURS_RANGE.test(h.trim())))) out.push(at + "hours is not a number (0-24) or a range like \"8-9\"");
    if (d.schedule != null && (!Array.isArray(d.schedule) || d.schedule.some((s) => !s || typeof s.label !== "string" || !s.label))) out.push(at + "schedule entries need a label");
    if (complete && ![d.hours, d.miles, d.gainFt].some((v) => v != null && v !== "")) out.push(at + "has no hours, miles or gain");
  });
  return out;
}

/** True when `it` is a valid trip plan (or null). */
export function isTripPlanShape(it, opts) { return itineraryShapeErrors(it, opts).length === 0; }
