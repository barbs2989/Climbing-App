// CELL COVERAGE, READ OFF THE ROUTE'S OWN WORDS. Seed routes carry a structured {coverage, note}
// (ROUTE_EXTRAS); a DB route stores `comms` as prose ("Spotty Verizon on the ridge, none in the
// basin"), so the Safety tab showed the text with no signal badge, and the float-plan fold never got
// a coverage level. This reads a level from that prose and errs toward the WORSE reading: any mix of
// signals is "spotty", and text that names no level gets no badge at all (null), never a guess.
const NONE = /\b(no|zero|without)\s+(cell(ular)?\s+)?(service|signal|coverage|reception|bars?)\b|\bno\s+cell\b|\bdead\s*zones?\b|\b(absent|non-?existent)\b|\bout of (service|range)\b|\bsat(ellite)?\s+(messenger|device|communicator)\s+(required|needed|essential)\b|\bsatellite only\b/i;
// "No reliable cell coverage" is a NEGATED good phrase. Read as "good" it put a green "Good signal" on
// a peak with none (found on real rows, 2026-11-11), so a negated "reliable" is spotty, and any good
// phrase with a negation just before it never counts as good.
const SPOTTY = /\b(spotty|intermittent|patchy|weak|poor|rare|limited|sporadic|occasional|unreliable|hit[- ]or[- ]miss|in places|some spots|one bar|1[- ]2 bars)\b|\b(no|not|isn'?t|never)\s+(always\s+)?(reliable|dependable)\b|\bdon'?t\s+(count|rely|depend)\s+on\b/i;
const GOOD = /\b(good|solid|strong|reliable|full|excellent|decent)\s+(cell(ular)?\s+)?(service|signal|coverage|reception)\b|\b(service|signal|coverage|reception)\s+(is\s+)?(good|solid|strong|reliable|throughout)\b|\b(service|signal|coverage|reception)\s+(is\s+)?(usually|generally)\s+available\b|\b(lte|4g|5g)\s+(works|throughout|available)\b/gi;
const NEGATED = /\b(no|not|never|without|lacks?|lacking|isn'?t|hardly|rarely)\b[^.;,]{0,20}$/i;

/** A good phrase counts only when nothing just before it negates it. */
function statesGood(text) {
  GOOD.lastIndex = 0;
  for (let m; (m = GOOD.exec(text));) { if (!NEGATED.test(text.slice(Math.max(0, m.index - 30), m.index))) return true; }
  return false;
}

/** "none" | "spotty" | "good" | null — the level a `comms` sentence states, worst wins when mixed. */
export function commsCoverage(text) {
  if (!text || typeof text !== "string") return null;
  const n = NONE.test(text), s = SPOTTY.test(text), g = statesGood(text);
  // WORST WINS: "none" outranks "spotty" ("No cell coverage … sky view is limited" read as spotty
  // and implied some signal). Only text that ALSO says coverage is good somewhere is mixed: spotty.
  if (n) return g ? "spotty" : "none";
  if (s) return "spotty";
  if (g) return "good";
  return null;
}
