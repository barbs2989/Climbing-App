// HOW THE SUB-AREAS ON AN AREA PAGE ARE ORDERED (owner, 2026-11-18: "sort areas a to Z and Z to a, by
// most climbs, by most sport, bouldering, trad, etc disciplines ... The default view for all areas
// should be alphabetical a to z").
//
// One list of sort keys and one comparator, so the phone's section and the website's sidebar order
// the children the same way. A key is offered only when the rows can answer it: "Most sport" only
// when at least one child holds a sport climb, "Highest" only when a child has an elevation, and so
// on -- a sort the data cannot decide would just be A -> Z under another name.
//
// Every comparator ends on the name, so equal counts read alphabetically, and every key that a row
// cannot answer (no coordinate, no walk-in time) puts that row LAST rather than first.
import { DISC_LABELS } from "./discLabels.js";

export const CHILD_SORT_DEFAULT = "az";

/** @typedef {{ id: string|number, name: string, route_count?: number|null, lat?: number|null, lng?: number|null, elevation_ft?: number|null, approach_min?: number|null, [k: string]: unknown }} ChildSortRow */
/** @typedef {Record<string, Record<string, number>>} ChildDiscCounts child id -> discipline -> climbs in its whole subtree */
/** @typedef {{ lat: number, lng: number }} ChildSortPoint */
/** @typedef {{ key: string, label: string, group: string }} ChildSortOption */

// The disciplines a "Most …" sort is offered for, in the order the menu lists them.
const DISC_ORDER = ["sport", "trad", "bouldering", "toprope", "alpine", "ice", "mixed", "aid", "mountaineering", "scrambling"];

const byName = (/** @type {ChildSortRow} */ a, /** @type {ChildSortRow} */ b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base", numeric: true });
const num = (/** @type {unknown} */ v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/** Kilometres between two points (haversine). */
export function kmBetween(/** @type {ChildSortPoint} */ a, /** @type {ChildSortPoint} */ b) {
  const r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLn = (b.lng - a.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLn / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The discipline's label for the menu ("Most sport", "Most bouldering"), lower-case after "Most". */
function discWord(/** @type {string} */ d) {
  const l = /** @type {Record<string,string>} */ (DISC_LABELS)[d] || d;
  return l.toLowerCase();
}

/**
 * The sorts these rows can answer.
 * @param {ChildSortRow[]} rows
 * @param {{ discCounts?: ChildDiscCounts | null, objectives?: Record<string, number> | null }} [opts]
 * @returns {ChildSortOption[]}
 */
export function childSortOptions(rows, opts = {}) {
  const { discCounts, objectives } = opts;
  /** @type {ChildSortOption[]} */
  const out = [
    { key: "az", label: "Name: A → Z", group: "Name" },
    { key: "za", label: "Name: Z → A", group: "Name" },
    { key: "most", label: "Most climbs", group: "Climbs" },
    { key: "fewest", label: "Fewest climbs", group: "Climbs" },
  ];
  if (discCounts) {
    /** @type {Record<string, number>} how many children hold at least one climb of each discipline */
    const held = {};
    for (const r of rows) { const c = discCounts[String(r.id)]; if (c) for (const d in c) if (c[d] > 0) held[d] = (held[d] || 0) + 1; }
    for (const d of DISC_ORDER) if (held[d]) out.push({ key: "disc:" + d, label: "Most " + discWord(d), group: "By type" });
  }
  if (objectives && rows.some(r => (objectives[String(r.id)] || 0) > 0)) out.push({ key: "obj", label: "Most of my objectives", group: "More" });
  if (rows.some(r => num(r.lat) != null && num(r.lng) != null)) out.push({ key: "near", label: "Nearest to me", group: "More" });
  if (rows.some(r => num(r.elevation_ft) != null)) out.push({ key: "high", label: "Highest first", group: "More" });
  if (rows.some(r => num(r.approach_min) != null)) out.push({ key: "walk", label: "Shortest walk-in", group: "More" });
  return out;
}

/**
 * The rows in `key` order. A key the rows cannot answer (a discipline sort before the counts load,
 * Nearest before a location) falls back to A -> Z.
 * @template {ChildSortRow} T
 * @param {T[]} rows
 * @param {string} key
 * @param {{ discCounts?: ChildDiscCounts | null, objectives?: Record<string, number> | null, here?: ChildSortPoint | null }} [opts]
 * @returns {T[]}
 */
export function sortChildren(rows, key, opts = {}) {
  const { discCounts, objectives, here } = opts;
  const list = [...rows];
  /** Rows with no value go last; ties read A -> Z. `dir` 1 = biggest first. */
  const byValue = (/** @type {(r: T) => number | null} */ val, /** @type {1 | -1} */ dir) => list.sort((a, b) => {
    const va = val(a), vb = val(b);
    return Number(va == null) - Number(vb == null) || (va != null && vb != null ? dir * (vb - va) : 0) || byName(a, b);
  });
  if (key === "za") return list.sort((a, b) => byName(b, a));
  if (key === "most") return byValue(r => num(r.route_count) ?? 0, 1);
  if (key === "fewest") return byValue(r => num(r.route_count) ?? 0, -1);
  if (key.startsWith("disc:") && discCounts) { const d = key.slice(5); return byValue(r => (discCounts[String(r.id)] || {})[d] || 0, 1); }
  if (key === "obj" && objectives) return byValue(r => objectives[String(r.id)] || 0, 1);
  if (key === "near" && here) return byValue(r => { const la = num(r.lat), ln = num(r.lng); return la == null || ln == null ? null : kmBetween(here, { lat: la, lng: ln }); }, -1);
  if (key === "high") return byValue(r => num(r.elevation_ft), 1);
  if (key === "walk") return byValue(r => num(r.approach_min), -1);
  return list.sort(byName);
}

/**
 * What the row's right-hand figure should say under this sort: the count the list is ordered by, so
 * "Most bouldering" shows each area's boulder problems, not its total.
 * @param {ChildSortRow} row
 * @param {string} key
 * @param {{ discCounts?: ChildDiscCounts | null }} [opts]
 * @returns {{ n: number, noun: string } | null} null = the row's usual climb count
 */
export function childSortFigure(row, key, opts = {}) {
  const { discCounts } = opts;
  if (!key.startsWith("disc:") || !discCounts) return null;
  const d = key.slice(5);
  const n = (discCounts[String(row.id)] || {})[d] || 0;
  return { n, noun: d === "bouldering" ? (n === 1 ? "problem" : "problems") : discWord(d) };
}

// The choice lasts for the visit, so drilling from a state into its areas keeps "Most sport" -- but
// every visit starts A -> Z (the owner's default), so nothing is remembered on the device.
let sessionKey = CHILD_SORT_DEFAULT;
export const getChildSort = () => sessionKey;
export const setChildSort = (/** @type {string} */ k) => { sessionKey = k; };
