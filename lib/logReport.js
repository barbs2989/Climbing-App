// Is this logged climb a TRIP REPORT, or only a tick?
//
// A report is whatever the log form's report sections hold: conditions, hazards, times, road notes, beta, photos,
// a plan, or the typed write-up. The Completed list used to ask only "is there a typed write-up?", so a climber who
// filled in every conditions section and left the write-up box empty was offered "Add trip report" under a report
// they had already filed (owner's own log, 2026-11-18).
//
// A style, a date, a rating and a party size are the TICK, not a report, so a quick log stays a log.

const text = (v) => typeof v === "string" && v.trim() !== "";
const some = (v) => Array.isArray(v) && v.length > 0;
const TICK_ONLY = { partySize: true };

/** @param {object | null | undefined} log a log as App holds it (climb_logs hydrated) */
export function logHasReport(log) {
  if (!log) return false;
  const l = /** @type {Record<string, unknown>} */ (log);
  if (text(l.text) || text(l.beta) || text(l.gearBeta) || text(l.roadNote) || text(l.outcomeNote) || text(l.sunNote)) return true;
  if (l.sunVote || l.itinerary) return true;
  if (some(l.condTags) || some(l.photos) || some(l.outcomeReasons)) return true;
  const cond = l.cond && typeof l.cond === "object" ? /** @type {Record<string, unknown>} */ (l.cond) : {};
  return Object.keys(cond).some((k) => {
    if (TICK_ONLY[k]) return false;
    const v = cond[k];
    return v != null && v !== "" && v !== 0 && !(Array.isArray(v) && !v.length);
  });
}
