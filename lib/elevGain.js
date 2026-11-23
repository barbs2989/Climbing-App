// Total climb and descent over an elevation profile: the Gain and Loss printed above the profile under
// the route map (src/components/ElevChart.tsx).
//
// TURNING POINTS, NOT A RUNNING SUM. A climb or a descent counts once the elevation has come back a
// threshold from its extreme; the whole swing between two confirmed turning points is then counted. So
// the last feet to a summit are never lost to the threshold, and jitter smaller than the threshold adds
// nothing however many samples it is spread over.
//
// THE THRESHOLD IS 10 FT WHERE THE RECORDING IS CLEAN AND RISES WHERE IT IS JUMPY. Most stored
// elevations are terrain heights read at each GPS point. On steep rock a few metres of sideways GPS
// wander moves the terrain height by tens of feet, so neighbouring samples differ by 40 ft and more and
// a flat 10 ft threshold counted all of it. Measured 2026-11-23 over the 430 profiles the app draws:
// Liberty Bell's Beckey Route read 15,393 ft of gain on a recording that spans 2,372 ft; 23 routes read
// more than twice their whole relief. A wider flat threshold does not cure it (8,248 ft at 80 ft) and a
// smoothing window wide enough to cure it erases real climbing on clean recordings (88 routes read below
// their own net climb at 250 m). So the threshold follows the recording: JITTER_K times the local
// jitter, where jitter is the RMS of each sample's distance from its own SMOOTH_M-metre average, taken
// over JITTER_M metres of track. On the slopes of a clean recording that is under 2 ft and the threshold
// stays 10; a sharp summit turnaround lifts it to 20-30 ft for a few samples, which costs nothing because
// whole swings are counted (0 of 430 profiles read below their own net climb).
//
// WHAT THIS DOES NOT FIX, measured the same day: the worst recordings are halved, not cured (Colfax
// Cosley-Houston 20,427 -> 8,715 ft on 5,800 ft of relief), and a track that covers more ground than its
// route (Dot Mountain: 75 km, 16,000 ft) reads what was walked. Those are questions about the track.
//
// lib/, plain JS: check:profile-gain imports it directly.

export const BASE_THRESHOLD_FT = 10;
export const JITTER_K = 5;
export const SMOOTH_M = 150;
export const JITTER_M = 400;

// The mean of v over a window of `metres` centred on each sample; `km` is distance along the track.
function windowMean(v, km, metres) {
  const n = v.length, half = metres / 2000, out = new Array(n);
  let lo = 0, hi = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    while (hi < n && km[hi] <= km[i] + half) sum += v[hi++];
    while (km[lo] < km[i] - half) sum -= v[lo++];
    out[i] = sum / (hi - lo);
  }
  return out;
}

/**
 * The threshold in feet at each sample. Without distances (or with a threshold given) it is flat.
 * @param {readonly number[]} pts
 * @param {readonly number[] | null | undefined} km
 * @returns {number[]}
 */
export function gainThresholds(pts, km) {
  if (!km || km.length !== pts.length) return pts.map(() => BASE_THRESHOLD_FT);
  const smooth = windowMean(pts, km, SMOOTH_M);
  const jitter = windowMean(pts.map((v, i) => (v - smooth[i]) ** 2), km, JITTER_M);
  return jitter.map((j) => Math.max(BASE_THRESHOLD_FT, JITTER_K * Math.sqrt(j)));
}

/**
 * Total climb and descent in the units of `pts` (feet).
 * @param {readonly number[]} pts elevation of each sample
 * @param {readonly number[] | null} [km] distance along the track to each sample, the same length as
 *   `pts`; without it every sample uses the flat 10 ft threshold
 * @returns {{ gain: number, loss: number }}
 */
export function elevationGainLoss(pts, km) {
  let gain = 0, loss = 0;
  if (!pts || pts.length < 2) return { gain, loss };
  const th = gainThresholds(pts, km);
  // pivot: the last confirmed turning point. dir: 1 climbing from it, -1 descending, 0 not yet known.
  let pivot = pts[0], hi = pts[0], lo = pts[0], dir = 0;
  for (let i = 1; i < pts.length; i++) {
    const v = pts[i], t = th[i];
    if (dir >= 0 && v > hi) hi = v;
    if (dir <= 0 && v < lo) lo = v;
    if (dir !== -1 && hi - v >= t) { gain += hi - pivot; pivot = hi; dir = -1; lo = v; }
    else if (dir !== 1 && v - lo >= t) { loss += pivot - lo; pivot = lo; dir = 1; hi = v; }
  }
  /* Close the swing in progress, then the stretch from its extreme to the last sample, so Gain minus
     Loss is exactly the last elevation minus the first: the two figures printed at the foot of the
     profile. A profile that never moved a threshold from its start (dir 0) counts nothing. */
  const last = pts[pts.length - 1];
  if (dir === 1) { gain += hi - pivot; loss += hi - last; }
  else if (dir === -1) { loss += pivot - lo; gain += last - lo; }
  return { gain, loss };
}
