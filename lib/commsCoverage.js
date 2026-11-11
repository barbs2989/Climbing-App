// CELL COVERAGE, READ OFF THE ROUTE'S OWN WORDS. Seed routes carry a structured {coverage, note}
// (ROUTE_EXTRAS); a DB route stores `comms` as prose ("Spotty Verizon on the ridge, none in the
// basin"), so the Safety tab showed the text with no signal badge, and the float-plan fold never got
// a coverage level. This reads a level from that prose and errs toward the WORSE reading: any mix of
// signals is "spotty", and text that names no level gets no badge at all (null), never a guess.
const NONE = /\b(no|zero|without)\s+(cell(ular)?\s+)?(service|signal|coverage|reception|bars?)\b|\bno\s+cell\b|\bdead\s*zone\b|\bout of (service|range)\b|\bsat(ellite)?\s+(messenger|device|communicator)\s+(required|needed|essential)\b|\bsatellite only\b/i;
const SPOTTY = /\b(spotty|intermittent|patchy|weak|limited|sporadic|occasional|unreliable|hit[- ]or[- ]miss|in places|some spots|one bar|1[- ]2 bars)\b/i;
const GOOD = /\b(good|solid|strong|reliable|full|excellent|decent)\s+(cell(ular)?\s+)?(service|signal|coverage|reception)\b|\b(service|signal|coverage|reception)\s+(is\s+)?(good|solid|strong|reliable|throughout)\b|\b(lte|4g|5g)\s+(works|throughout|available)\b/i;

/** "none" | "spotty" | "good" | null — the level a `comms` sentence states, worst wins when mixed. */
export function commsCoverage(text) {
  if (!text || typeof text !== "string") return null;
  const n = NONE.test(text), s = SPOTTY.test(text), g = GOOD.test(text);
  if (s || (n && g)) return "spotty";
  if (n) return "none";
  if (g) return "good";
  return null;
}
