// What the "you are here" dot on every map does with the phone's location readings (used by
// useFollowMe in lib/mapKit.jsx; checked by scripts/check-fix-filter.mjs).
//
// 1. acceptFix -- which readings count at all. A better or equal one always; a coarser one only if
//    the current one is stale or the two cannot both be true (you really moved). Without it a stray
//    tower fix arriving between GPS fixes yanked the dot hundreds of metres and back. A reading
//    stamped OLDER than the one shown is dropped: a late delivery must not pull the dot backwards.
//
// 2. smoothFix -- where the dot goes. Drawing every raw GPS reading made the dot hop 5-30 m while
//    you stood at the base of a route: each reading is a noisy sample, and the phone's accuracy
//    figure says how noisy. So the dot is a running estimate (a one-dimensional Kalman filter on
//    each axis): each reading pulls it in proportion to how much it is trusted, a tight reading a
//    lot and a loose one a little, and the estimate's own uncertainty grows with time at walking
//    pace, so a climber on the move is followed rather than averaged away. A reading the estimate
//    cannot explain (far outside both uncertainties: a car, a lift, a wrong first fix) resets it.
//    The RING and the "±" label stay the phone's own figure for the latest reading: the filter's
//    tighter number assumes independent errors, which GPS errors are not, so showing it would
//    overstate how sure the dot is.
//
// 3. FIX_GOOD_M -- the first reading is often the network fix (wifi / cell tower, 100 m - 2 km).
//    Zooming to street level on it showed a confident dot in the wrong place; a coarse first fix
//    now frames its whole ring, and the map zooms in when the first GPS-grade reading lands.
export const FIX_STALE_MS = 15000;
export const FIX_LOST_MS = 45000;
export const FIX_GOOD_M = 100;
// How fast the estimate is allowed to drift between readings: brisk walking / scrambling pace.
// Faster travel (driving to the trailhead) trips the reset in smoothFix instead.
export const FIX_MOVE_MPS = 3;

export function fixDistM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function acceptFix(cur, next) {
  if (!next || !Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return false;
  if (!cur) return true;
  if (Number.isFinite(next.t) && Number.isFinite(cur.t) && next.t < cur.t) return false;
  const acc = Number.isFinite(next.acc) ? next.acc : Infinity;
  // GPS-grade readings always move the dot, even a little worse than the last: holding out for
  // the best one ever seen left a walking climber's dot 20-30 m behind them.
  if (acc <= Math.max(cur.acc * 2, 30)) return true;
  if (next.t - cur.t > FIX_STALE_MS) return true;
  return fixDistM(cur, next) > acc + cur.acc;
}

// A reading with no accuracy figure is treated as a loose one, not an exact one.
const accOf = (f) => (Number.isFinite(f.acc) && f.acc > 0 ? f.acc : 1000);

/**
 * @param {{lat:number,lng:number,v:number,t:number}|null} est the current estimate (v = variance, m^2)
 * @param {{lat:number,lng:number,acc:number,t:number}} fix an ACCEPTED reading
 * @returns {{lat:number,lng:number,v:number,t:number}}
 */
export function smoothFix(est, fix) {
  const a = accOf(fix), r = a * a;
  const fresh = { lat: fix.lat, lng: fix.lng, v: r, t: fix.t };
  if (!est || !Number.isFinite(est.v) || !Number.isFinite(est.lat) || !Number.isFinite(est.lng)) return fresh;
  const dt = Math.max(0, ((fix.t || 0) - (est.t || 0)) / 1000);
  const step = FIX_MOVE_MPS * dt;
  const v = est.v + step * step + 1; // +1 m^2: never so sure of itself that it stops listening
  // Cannot both be true: you moved faster than walking, or the estimate began on a bad fix.
  if (fixDistM(est, fix) > 2 * (Math.sqrt(v) + a)) return fresh;
  const k = v / (v + r);
  return { lat: est.lat + k * (fix.lat - est.lat), lng: est.lng + k * (fix.lng - est.lng), v: (1 - k) * v, t: fix.t };
}
