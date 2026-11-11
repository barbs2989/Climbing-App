// A pencil that covers SEVERAL fields (the ROUTE FACTS / TECHNICAL STATS card, a crag facts section)
// opens the editor at the first field a climber can still write: an empty (low) field first, then a
// medium one. Only when every listed field is locked (high) does it return the first key, whose pencil
// then opens the flag sheet (openFix in RouteDetail.jsx). One locked field — a crag route's grade is
// always high (0406) — must never lock the empty fields beside it; the database guard is per field
// too (guard_field_contribution, 0308). A key the levels map does not carry is never chosen as open.
// Plain JS (no JSX) so scripts/check-facts-pencil-open.mjs can import it; lib/confidence.jsx re-exports it.

/** @param {Record<string, string> | null | undefined} levels @param {Array<string | null | undefined>} keys @returns {string | null} */
export function firstEditable(levels, keys) {
  const ks = (keys || []).filter(function (k) { return !!k; });
  if (!ks.length) return null;
  if (!levels) return /** @type {string} */ (ks[0]);
  return ks.find(function (k) { return levels[/** @type {string} */ (k)] === "low"; })
    || ks.find(function (k) { const l = levels[/** @type {string} */ (k)]; return l != null && l !== "high"; })
    || /** @type {string} */ (ks[0]);
}
