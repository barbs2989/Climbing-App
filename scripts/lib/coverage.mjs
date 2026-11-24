// coverage.mjs — the RULES of the route-data coverage measure (audit:coverage), as pure functions.
//
// Owner, 2026-11-23: "build a measurable coverage system by region and discipline. Track which routes have
// verified approach, descent, protection, pitch information, coordinates, and other relevant details. Then
// prioritize the most-used climbing areas."
//
// Three questions per (route, dimension):
//   1. RELEVANT?  Does this route's page draw the dimension at all? Decided by lib/fieldScope.js — the same rule
//      the edit sheet and the route page read — so a boulder is never counted as "missing" a rappel table and a
//      single-pitch sport line is never "missing" a descent. A dimension no rule covers (coordinates, grade) is
//      relevant everywhere.
//   2. TIER?      0 missing · 1 stored (a value, no evidence) · 2 sourced (a research-ledger row with evidence that
//      has not locked — the CEILING for paragraphs, which never lock: owner 2026-11-18) · 3 locked (a locked /
//      locked-1src ledger row, or an owner-approved edit).
//   3. WEIGHT?    How much is this route used? See usageWeight().
//
// The SQL in audit-coverage.mjs only answers "is the column filled"; everything that decides is here, so
// --selftest can pin it without a database.

import { fieldScope, MOUNTAIN } from "../../lib/fieldScope.js";

/** Presence bits the SQL computes per route (audit-coverage.mjs builds its bitmask in this order). */
export const BITS = ["coords", "trailhead_pin", "approach", "descent", "protection", "pitches", "pitch_detail",
  "rappels", "grade", "length", "gain", "track", "season", "access", "hazards", "overview"];
export const bit = (name) => 1 << BITS.indexOf(name);

/**
 * The dimensions measured. `scope` names lib/fieldScope.js keys (relevant when ANY is in scope); null = every
 * route. `ledger` lists the route_field_evidence columns (field before any "/") that back the dimension.
 * `area` names the area-level fallback that also fills it (a crag's parking pin, its walk-in, its season).
 */
export const DIMENSIONS = [
  /* A DB route's map point IS its area's (dbRouteToCamel: lat: r.areas.lat) — 121 of 14,226 WA routes store their
     own. An area flagged coords_approx does NOT count: its page says "Coordinates are approximate". */
  { key: "coords", label: "Coordinates", scope: null, ledger: ["lat", "lng", "location"], area: "coords" },
  { key: "trailhead", label: "Trailhead / parking pin", scope: null, ledger: ["approach_logistics", "waypoints"], area: "parking" },
  { key: "approach", label: "Approach", scope: ["approach"], ledger: ["approach", "approach_variants"], area: "approach" },
  { key: "descent", label: "Descent", scope: ["descentText"], ledger: ["descent", "descent_text"] },
  { key: "protection", label: "Protection / rack", scope: ["rack", "bolts", "pads", "draws", "screws", "protRating"],
    ledger: ["rack", "rack_items", "bolts", "prot_rating", "gear", "pads", "detailed_rack", "pro_needs", "alpine_draws"] },
  { key: "pitches", label: "Pitch count", scope: ["pitchCount"], ledger: ["pitches"] },
  { key: "pitch_detail", label: "Pitch-by-pitch", scope: ["pitchDetail"], ledger: ["pitch_detail"] },
  { key: "rappels", label: "Rappels", scope: ["rappelDetail"], ledger: ["rappels", "rappel_detail"] },
  { key: "grade", label: "Grade", scope: null, ledger: ["grade", "rock_grade", "alpine_grade", "ice_grade", "aid_grade"] },
  { key: "length", label: "Length", scope: ["length"], ledger: ["length_m"] },
  { key: "gain", label: "Elevation gain", scope: ["gain"], ledger: ["gain_ft"] },
  { key: "track", label: "GPS track", scope: "mountain", ledger: ["gpx"] },
  { key: "season", label: "Season", scope: ["season"], ledger: ["season"], area: "season" },
  { key: "access", label: "Access / road / permit", scope: ["access"], ledger: ["access", "road", "permit"] },
  { key: "hazards", label: "Hazards", scope: ["objHaz"], ledger: ["hazards", "obj_haz"] },
  { key: "overview", label: "Overview", scope: null, ledger: ["overview", "description"] },
];
/** Map a dimension key to its presence bit (trailhead's own pin is one of several ways it is filled). */
const PRESENCE = { trailhead: "trailhead_pin" };

/** A pin field in the ledger ("waypoints/<name>") backs the TRAILHEAD only when it names one. */
const TRAILHEAD_PIN = /trail\s*head|parking|\bth\b|gate/i;

/**
 * catOf() from ClimbMatchCore.jsx, for a DB row: the stored discipline, except a trad line on a PEAK reads as
 * alpine, and a mountaineering or scrambling row whose own grade fields carry a YDS 5.x is alpine.
 * (DB rows store the discipline itself; the seed path's rock→style step never applies.)
 * @param {{discipline?: string|null, grade?: string|null, rock_grade?: string|null, alpine_grade?: string|null}} r
 * @param {string|null|undefined} areaType the route's own area's area_type
 */
export function catOfRow(r, areaType) {
  const d = String(r.discipline || "unknown").toLowerCase();
  if (d === "trad" && String(areaType || "").toLowerCase() === "peak") return "alpine";
  if ((d === "mountaineering" || d === "scrambling") && [r.grade, r.rock_grade, r.alpine_grade].some(fifthClass)) return "alpine";
  return d;
}
/** @param {unknown} g */
function fifthClass(g) {
  return typeof g === "string" && /(?<![\d.])5\.\d{1,2}[abcd]?[+-]?(?![\d])(?!\s*(?:mi\b|miles?\b|km\b|hrs?\b|hours?\b))/i.test(g);
}

/**
 * Which dimensions does this route's page draw?
 * @param {string} cat catOfRow()
 * @param {number|null} pitches
 * @param {number} bits the presence bitmask (a stored value keeps its field in scope, as fieldScope says)
 * @returns {Set<string>}
 */
export function relevantDims(cat, pitches, bits) {
  const has = (b) => (bits & bit(b)) !== 0;
  const ctx = {
    cat, multiPitch: pitches != null && pitches > 1, singlePitch: cat === "bouldering" || (pitches != null && pitches <= 1),
    has: { descentText: has("descent"), rap: has("rappels"), rappelDetail: has("rappels"), pitchDetail: has("pitch_detail"),
      rack: has("protection") },
  };
  const out = new Set();
  for (const d of DIMENSIONS) {
    const ok = d.scope === null ? true : d.scope === "mountain" ? MOUNTAIN.includes(cat) : d.scope.some((k) => fieldScope(k, ctx));
    if (ok) out.add(d.key);
  }
  return out;
}

/**
 * Collapse a route's ledger rows into the best tier each dimension's evidence reaches.
 * @param {{field: string, level: string, n: number}[]} rows  n = evidence items
 * @param {string[]} [ownerApproved] routes columns an owner approved on this route (route_field_confidence.set_by)
 * @returns {Record<string, 2|3>} dimension → 2 (sourced) or 3 (locked); disputed rows back nothing
 */
export function ledgerTiers(rows, ownerApproved) {
  /** @type {Record<string, 2|3>} */
  const out = {};
  for (const row of rows || []) {
    const [col, rest] = String(row.field).split("/");
    for (const d of DIMENSIONS) {
      if (!d.ledger.includes(col)) continue;
      if (col === "waypoints" && d.key === "trailhead" && !TRAILHEAD_PIN.test(rest || "")) continue;
      const t = row.level === "locked" || row.level === "locked-1src" ? 3 : row.level === "unconfirmed" && row.n > 0 ? 2 : 0;
      if (t && (!out[d.key] || out[d.key] < t)) out[d.key] = /** @type {2|3} */ (t);
    }
  }
  for (const col of ownerApproved || []) {
    for (const d of DIMENSIONS) if (d.ledger.includes(col)) out[d.key] = 3;
  }
  return out;
}

/**
 * The tier of one dimension on one route: 0 missing, 1 stored, 2 sourced, 3 locked. Evidence only lifts a
 * dimension the page can show — a ledger row cannot make an empty column "covered".
 * @param {string} dim
 * @param {number} bits
 * @param {{parking?: boolean, approach?: boolean, season?: boolean, coords?: boolean}} areaHas the route's area (or an ancestor) fills it
 * @param {Record<string, number>} tiers ledgerTiers()
 */
export function tierOf(dim, bits, areaHas, tiers) {
  const d = DIMENSIONS.find((x) => x.key === dim);
  if (!d) throw new Error(`tierOf: unknown dimension ${dim}`);
  const own = (bits & bit(PRESENCE[dim] || dim)) !== 0;
  const viaArea = !!(d.area && areaHas && areaHas[d.area]);
  if (!own && !viaArea) return 0;
  return Math.max(1, tiers[dim] || 0);
}

/**
 * The DESTINATION a route belongs to — the unit the priority list ranks: what a climber picks a trip by
 * (Frenchman Coulee, Exit 32 / Little Si, Beacon Rock, Mount Rainier), not one wall of it.
 *   a peak                       → the outermost peak itself
 *   a crag (walls nest in crags) → the region directly above the OUTERMOST crag, unless that is the state's own
 *                                  top-level region (depth 3), which is too coarse — then the crag itself
 * Measured on WA 2026-11-23: "South Face" was five different walls; their regions above are the destinations.
 * @param {{id: string, type: string|null, depth: number}[]} chain the route's area first, then each parent
 */
export function destinationOf(chain) {
  const outer = [...chain].reverse().find((a) => a.type === "crag" || a.type === "peak");
  if (!outer) return chain[0];
  if (outer.type === "peak") return outer;
  const parent = chain[chain.indexOf(outer) + 1];
  return parent && parent.type === "region" && parent.depth >= 4 ? parent : outer;
}

/**
 * How much a route is USED, for ranking. Pre-launch the app's own signals are thin (2026-11-23: 14 logs on 10
 * routes, 2,313 view-days on 328), so the catalog's popularity carries most of it; as real use grows, views,
 * climbers and objectives take over — they are log-scaled so one busy route cannot drown an area.
 *   1                          every route counts
 * + 3   classic               flagged a classic (MP Classic Climbs / guidebooks; flag-classics.mjs)
 * + q   quality 0–4           classic_score, else guide_stars, else our climbers' stars
 * + 2   on a named list       routes.lists (Fifty Classics, peak lists…)
 * + 2·log2(1+views_90d) + 3·log2(1+climbers) + 2·log2(1+objectives)
 * @param {{classic?: boolean, classic_score?: number|null, guide_stars?: number|null, stars?: number|null, listed?: boolean}} r
 * @param {{views?: number, climbers?: number, objectives?: number}} [use]
 */
export function usageWeight(r, use) {
  const q = [r.classic_score, r.guide_stars, r.stars].find((v) => v != null && Number.isFinite(Number(v)));
  const u = use || {};
  return 1 + (r.classic ? 3 : 0) + Math.max(0, Math.min(4, Number(q || 0))) + (r.listed ? 2 : 0)
    + 2 * Math.log2(1 + (u.views || 0)) + 3 * Math.log2(1 + (u.climbers || 0)) + 2 * Math.log2(1 + (u.objectives || 0));
}

/**
 * A route's GAP: relevant dimensions MISSING, plus a quarter for each one stored without evidence (verification
 * debt is real, but an empty field is what a climber hits first).
 * @param {Record<string, number>} tiersByDim dim → tier, relevant dimensions only
 */
export function gapOf(tiersByDim) {
  let g = 0;
  for (const t of Object.values(tiersByDim)) g += t === 0 ? 1 : t === 1 ? 0.25 : 0;
  return g;
}

// ── self-test ────────────────────────────────────────────────────────────────────────────────────────────
export function selftest() {
  const fails = [];
  const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fails.push(`${m}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); };
  eq(catOfRow({ discipline: "trad" }, "peak"), "alpine", "trad on a peak is alpine");
  eq(catOfRow({ discipline: "trad" }, "crag"), "trad", "trad on a crag stays trad");
  eq(catOfRow({ discipline: "scrambling", grade: "Class 3, 5.6" }, "peak"), "alpine", "scramble with 5.x is alpine");
  eq(catOfRow({ discipline: "mountaineering", grade: "5.2 miles" }, "peak"), "mountaineering", "a distance is not a grade");
  const sport1 = relevantDims("sport", 1, 0);
  eq(sport1.has("descent"), false, "single-pitch sport: no descent");
  eq(sport1.has("pitch_detail"), false, "single-pitch sport: no pitch-by-pitch");
  eq(sport1.has("protection"), true, "sport: protection (bolts)");
  eq(relevantDims("sport", 4, 0).has("descent"), true, "multi-pitch sport: descent");
  eq(relevantDims("sport", 1, bit("descent")).has("descent"), true, "a stored descent stays in scope");
  const boulder = relevantDims("bouldering", null, 0);
  eq([boulder.has("rappels"), boulder.has("pitches"), boulder.has("protection"), boulder.has("approach")], [false, false, true, true], "boulder scope");
  const scramble = relevantDims("scrambling", null, 0);
  eq([scramble.has("protection"), scramble.has("rappels"), scramble.has("gain"), scramble.has("track")], [false, false, true, true], "scramble scope");
  eq(relevantDims("alpine", 6, 0).has("pitch_detail"), true, "alpine: pitch-by-pitch");
  const lt = ledgerTiers([{ field: "grade", level: "locked", n: 2 }, { field: "approach", level: "unconfirmed", n: 1 },
    { field: "descent", level: "unconfirmed", n: 0 }, { field: "waypoints/Summit", level: "locked", n: 2 },
    { field: "waypoints/Trailhead parking", level: "locked-1src", n: 1 }, { field: "pitches", level: "disputed", n: 3 }]);
  eq(lt, { grade: 3, approach: 2, trailhead: 3 }, "ledger tiers (no evidence/disputed back nothing; only a trailhead pin backs the trailhead)");
  eq(tierOf("approach", 0, { approach: true }, {}), 1, "a crag's walk-in fills a route's approach");
  eq(tierOf("grade", 0, {}, { grade: 3 }), 0, "evidence never lifts an EMPTY column");
  eq(tierOf("coords", 0, { coords: true }, {}), 1, "the crag's exact coordinate is the route's");
  eq(tierOf("coords", 0, { coords: false }, {}), 0, "an approximate area coordinate is not coverage");
  eq(destinationOf([{ id: "w", type: "crag", depth: 6 }, { id: "pr", type: "region", depth: 5 }, { id: "sw", type: "region", depth: 4 }, { id: "r3", type: "region", depth: 3 }]).id, "pr", "a crag's destination is the region above it");
  eq(destinationOf([{ id: "w", type: "crag", depth: 6 }, { id: "c", type: "crag", depth: 5 }, { id: "d", type: "region", depth: 4 }, { id: "r3", type: "region", depth: 3 }]).id, "d", "nested walls: above the OUTERMOST crag");
  eq(destinationOf([{ id: "rainier", type: "peak", depth: 5 }, { id: "sw", type: "region", depth: 4 }]).id, "rainier", "a peak is its own destination");
  eq(destinationOf([{ id: "c", type: "crag", depth: 4 }, { id: "r3", type: "region", depth: 3 }]).id, "c", "never the state's top-level region");
  eq(tierOf("grade", bit("grade"), {}, { grade: 3 }), 3, "locked");
  eq(tierOf("trailhead", bit("trailhead_pin"), {}, {}), 1, "trailhead via its own pin");
  eq(gapOf({ a: 0, b: 1, c: 2, d: 3 }), 1.25, "gap");
  eq(usageWeight({}), 1, "baseline weight");
  eq(usageWeight({ classic: true, classic_score: 3.5, listed: true }), 9.5, "classic weight");
  eq(Math.round(usageWeight({}, { views: 3, climbers: 1 }) * 100) / 100, 8, "use weight");
  for (const d of DIMENSIONS) if (d.key !== "trailhead" && !BITS.includes(d.key)) fails.push(`dimension ${d.key} has no presence bit`);
  return fails;
}
