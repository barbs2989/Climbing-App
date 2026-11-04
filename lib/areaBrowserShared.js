import { displayGrade } from "./grade";
import { DISC_LABELS as DL, DISC_SHORT as DS } from "./discLabels";

// Grade for a compact row. Two things happen inside displayGrade(): a qualifier carried inline
// ("Class 3 (short 4th-class crux)") is dropped, and the route page's Composite Grade panel shows
// it instead; and a column holding a COMMITMENT grade rather than a difficulty is skipped when the
// row has a real one — this used to write the column chain out again, snake_case only, and showed
// a bare NCCS roman numeral on 30 routes. An area list is where a wrong grade is read fastest:
// every row carries one.
export function rowGrade(r) { return displayGrade(r) || "—"; }
// WHERE a climb is, for a row read with the `areas(name, parent:parent_id(name))` embed: its peak or
// crag, then the place that holds it ("Mount Stuart · Stuart-Enchantments"), as the Logbook's
// objectives rows print it. A list gathered from a whole state needs it: "North Buttress" and
// "Standard Scramble" are names many peaks share (owner, 2026-10-24).
export function placeOf(r) {
  const a = r && r.areas;
  if (!a || !a.name) return null;
  const p = a.parent && a.parent.name;
  return p && p !== a.name ? a.name + " · " + p : a.name;
}
export const ATYPE = { world: "World", country: "Country", state: "State", range: "Range", canyon: "Canyon", peak: "Peak", crag: "Crag", region: "Region", wall: "Wall" };
// These keys are sent verbatim to routes_in_subtree, which filters on the raw
// `routes.discipline` column (`r.discipline = disc`) — so a discipline with no
// entry here is unreachable by any filter, however well the rest of the app
// understands it. "toprope" (7,437 rows) was stored as "rock" until 0202: they are
// OpenBeta's top-rope-only climbs (its count matched ours crag for crag), typed the way
// Mountain Project types them. There is no "Rock" type anywhere (owner decision).
export const DISCIPLINES = [["", "All"], ["sport", DL.sport], ["trad", DL.trad], ["toprope", DL.toprope], ["bouldering", DS.bouldering], ["alpine", DL.alpine], ["ice", DL.ice], ["mixed", DL.mixed], ["mountaineering", DL.mountaineering], ["aid", DL.aid], ["scrambling", DS.scrambling]];
export function haversineMi(a, b) {
  const R = 3958.8, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
