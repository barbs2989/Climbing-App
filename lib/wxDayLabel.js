// The weather code a forecast DAY (or part of a day) is labelled with, from its hourly codes.
//
// It used to be the MOST COMMON hourly code. Audit 2026-11-26 (owner note: "Audit the condition score
// versus the forecast per route ... for example rain"): a day with 0.46" of rain in six hours and
// eighteen grey ones was labelled "Overcast" in the forecast panel while the conditions score above
// it, on the same tab, said rain and capped the stars — the two cards disagreed about the one thing a
// climber reads the label for. Open-Meteo's own daily code is "the most severe weather condition on a
// given day", and NWS labels a period by its precipitation once it is measurable (0.01"). So:
//   * a day with MEASURABLE precipitation (>= 0.01") is labelled by its precipitation: thunder if any
//     hour has it (the one that matters most on a wall), else the wet code that brought the most of it
//     (a tie goes to the heavier code);
//   * any other day keeps the most common code, as before.
// Codes are Open-Meteo WMO: 0-3 clear..overcast, 45/48 fog, 51-57 drizzle, 61-67 rain, 71-77 snow,
// 80-82 showers, 85/86 snow showers, 95-99 thunderstorm.

/** Codes that read as a DRY day. */
export const DRY_CODES = [0, 1, 2, 3, 45, 48];
/** Measurable precipitation, inches (the NWS threshold). */
export const MEASURABLE_IN = 0.01;

/** @param {Array<number|null|undefined>} codes */
function modeCode(codes) {
  /** @type {Record<string, number>} */
  const c = {};
  let best = codes[0], bc = 0;
  for (const v of codes) { const k = String(v); c[k] = (c[k] || 0) + 1; if (c[k] > bc) { bc = c[k]; best = v; } }
  return best;
}

/** @param {Array<number|null|undefined>} codes hourly codes @param {Array<number|null|undefined>} [precips] the same hours' precipitation, inches @returns {number|null|undefined} */
export function labelCodeOf(codes, precips) {
  if (!codes || !codes.length) return null;
  let total = 0;
  if (precips) for (const p of precips) total += typeof p === "number" && p > 0 ? p : 0;
  if (precips && total >= MEASURABLE_IN) {
    let thunder = null;
    /** @type {Record<string, number>} */
    const wet = {};
    codes.forEach(function (c, i) {
      if (typeof c !== "number") return;
      if (c >= 95) thunder = thunder == null || c > thunder ? c : thunder;
      const p = precips[i];
      if (c >= 51 && typeof p === "number" && p > 0) wet[c] = (wet[c] || 0) + p;
    });
    if (thunder != null) return thunder;
    let best = null, bs = -1;
    for (const k of Object.keys(wet)) { const c = +k, s = wet[k]; if (s > bs + 1e-9 || (Math.abs(s - bs) <= 1e-9 && best != null && c > best)) { best = c; bs = s; } }
    if (best != null) return best;
  }
  return modeCode(codes);
}
