import { haversineMi } from "./areaBrowserShared.js";

// ── one area's own page: hero + save + View all/View map/Objectives + sub-areas ──
// "Route finder" (it read "View all N routes" until the owner renamed it) opens the finder
// unfiltered — the finder's own default state is every route in the subtree. There used to be a second "Route finder" button in
// the row below wired to the identical handler, i.e. the same screen under two names.
// NEARBY PEAKS — "I'm here for the weekend, what else is in reach." Only on a PEAK that
// carries coordinates. It uses useNearbyPeaks, NOT the older useNearbyAreas: that one caps at
// 500 ordered by route_count, and around Stuart the cap is actually REACHED, so the nearest
// small peak can be truncated away before distance is ever considered. See the hook's note.
//
// Four things this deliberately does NOT do, each measured rather than assumed:
//
//   - It does not rank by `route_count`. That column is a cached SUBTREE aggregate and it
//     drifts whenever an area moves, merges or is deleted (check:counts exists for exactly
//     that). It is fine to PRINT and fine to test for >0; it is not a sort key. Distance is.
//   - It does not dedupe on coordinates. Co-located areas are usually legitimate — a wall and
//     the peak above it share a summit pin — and past sweeps established that deduping on
//     proximity destroys real rows. The >0 route filter is what removes the hollow import
//     stubs (the two Early Winters Spires sit 8 m apart; only one holds routes).
//   - It does not gate on state, and it no longer needs to. That claim used to read "WA-only
//     today" and is now WRONG: measured 2026-08-19, 445 areas are typed `peak` with coordinates
//     and routes — 402 in Washington, 39 in Colorado, 2 each in California and Oregon — and this
//     panel is LIVE on 37 of the 39 Colorado peaks, 28 of them showing a full six rows. What
//     limits it is how many areas are typed `peak`, never the code, which is a plain lat/lng box.
//     Where a peak genuinely has no neighbour inside the box (both California peaks, both Oregon
//     ones) it renders NOTHING rather than an empty "no nearby peaks" panel, which would read as
//     a fact about the mountains rather than about our data. Re-measure before repeating a
//     coverage claim here; this one rotted within weeks.
//   - It does not use one bounding box for lat and lng. A degree of longitude shrinks with
//     latitude — at 48°N it is ~0.67 of a degree of latitude — so a square box searches ~50%
//     too wide east-west up here and drags in peaks over a range.
// The two pure halves are exported so they can be tested without a browser, a DB or a render
// — scripts/oneoff/verify-nearby-peaks.mjs drives them. Keeping the selection inside the
// component would make it provable only by rendering, and the query it depends on is live.
export function nearbyPeaksLive(area) {
  return !!area && area.area_type === "peak" && area.lat != null && area.lng != null;
}
export function nearbyPeaksBounds(area, dLat) {
  if (!nearbyPeaksLive(area)) return null;
  const d = dLat || 0.5; // ~35 mi; a long weekend's radius, not a road trip.
  // cos() is floored so a hypothetical polar area cannot divide by ~0 and ask for the planet.
  const dLng = d / Math.max(0.2, Math.cos(area.lat * Math.PI / 180));
  return { minLat: area.lat - d, maxLat: area.lat + d, minLng: area.lng - dLng, maxLng: area.lng + dLng };
}
export function nearbyPeaksRows(area, rows, limit) {
  if (!nearbyPeaksLive(area)) return [];
  return (rows || [])
    .filter(a => a && a.area_type === "peak" && a.id !== area.id && a.route_count > 0 && a.lat != null && a.lng != null)
    .map(a => ({ a, mi: haversineMi(area, a) }))
    .sort((x, y) => x.mi - y.mi)
    .slice(0, limit || 6);
}
