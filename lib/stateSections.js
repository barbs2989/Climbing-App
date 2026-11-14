/* STATE SECTIONS for the Logbook lists (Objectives and Completed).

   A DB area's `region` column is NOT always its state: some areas carry a sub-region there
   ("Chilliwack / Picket", "Monte Cristo"), and the Objectives list then filed those climbs under
   headers that are not states at all (seen live 2026-11-14). The area's materialized `path`
   (ltree, root-first: "usa.washington.wa_northwest.…") always names the real state as its
   second label — the direct child of a root country, the same rows useStates() lists. */

// Top-level ids whose name is not just the id in title case (checked against all 61 live roots).
const ROOT_CHILD_NAMES = {
  ab: "Alberta", bc: "British Columbia", mb: "Manitoba", nb: "New Brunswick",
  nl: "Newfoundland and Labrador", nt: "Northwest Territories", ns: "Nova Scotia",
  nu: "Nunavut", on: "Ontario", qc: "Quebec", sk: "Saskatchewan", yt: "Yukon",
};
const SMALL = { of: 1, and: 1, the: 1 };

export function stateNameForId(id) {
  if (!id) return "";
  if (ROOT_CHILD_NAMES[id]) return ROOT_CHILD_NAMES[id];
  return String(id).split("_").filter(Boolean)
    .map((w, i) => (i > 0 && SMALL[w]) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// The state an area sits in, from its ltree path; "" when the path is missing or is a root itself.
export function stateFromPath(path) {
  if (!path) return "";
  const labels = String(path).split(".");
  return labels.length >= 2 ? stateNameForId(labels[1]) : "";
}

// The one label every list uses for a climb whose state can't be worked out; always sorted last.
export const UNKNOWN_STATE = "Location unknown";

export function compareStateKeys(a, b) {
  if (a === b) return 0;
  if (a === UNKNOWN_STATE) return 1;
  if (b === UNKNOWN_STATE) return -1;
  return String(a).localeCompare(String(b));
}

/* Ordered sections from an already sorted list: [{key, items}], first-seen order kept inside each
   section so the chosen sort still holds, sections ordered by `compareKeys`. */
export function groupInto(items, keyFn, compareKeys = compareStateKeys) {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  return Array.from(map.keys()).sort(compareKeys).map(key => ({ key, items: map.get(key) }));
}
