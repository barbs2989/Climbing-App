// FOLLOW TRAILS: bend one leg of a hand-drawn trail along the mapped footpaths between its two
// anchors. A tap-to-tap line is straight segments, and a switchbacking approach takes thirty taps to
// trace honestly; AllTrails, CalTopo and Komoot route each click along OpenStreetMap paths instead
// ("snap to trail"). This asks BRouter's public server (brouter.de, the OSM hiking router, free for
// fair use; Open-Meteo is fetched from the browser the same way) for a hiking-mountain route and
// returns the points BETWEEN the anchors, simplified. Every failure returns null and the caller
// keeps the straight leg: a routed line is a convenience, never a requirement.
import { metresBetween } from "./track";
const BROUTER = "https://brouter.de/brouter";
const PROFILE = "hiking-mountain";
const TIMEOUT_MS = 8000;
const MAX_LEG_M = 10000; // a crag's walk in; past this a tap is a planning sketch, not a trail
const DETOUR_X = 4; // a routed leg this many times longer than the straight one (+300 m) went round something the climber meant to cross
const SNAP_TRIM_M = 15; // a routed end within this of the anchor is the anchor, not a spur
const SIMPLIFY_M = 3;

const R = 6371000;
// Metres between two [lat,lng] pairs: lib/track.js's haversine, which takes {lat,lng}.
const distM = (a, b) => metresBetween({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
// At most this many legs are asked for at once: switching Follow trails on over a long hand-traced
// line asks for every leg, and the public server answers a burst with 429s.
const MAX_IN_FLIGHT = 3;
let inFlight = 0;
const waiting = [];
// A waiter whose caller gave up (Follow off, Undo, Clear) is dropped, so it never takes a slot ahead of a live leg.
const acquire = (signal) => new Promise((res) => { if (inFlight < MAX_IN_FLIGHT) { inFlight++; res(true); } else waiting.push({ res, signal }); });
const release = () => { let w = waiting.shift(); while (w && w.signal && w.signal.aborted) { w.res(false); w = waiting.shift(); } if (w) w.res(true); else inFlight--; };
// Answers already given this session, by the two anchors: a toggle or an Undo/Redo over the same
// legs asks nothing twice (the public server rate-limits bursts).
const CACHE_MAX = 200;
const cache = new Map();
const owners = new Map(); // k -> the signal of the caller whose request is in flight
const keyOf = (a, b) => a[0] + "," + a[1] + "|" + b[0] + "," + b[1];
const remember = (k, v) => { if (!cache.has(k) && cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); cache.set(k, v); return v; };

// Douglas-Peucker on a local equirectangular projection (metres). Keeps the first and last point.
function simplifyPts(pts, tolM) {
  if (!Array.isArray(pts) || pts.length < 3) return (pts || []).slice();
  const lat0 = pts[0][0] * Math.PI / 180, kx = R * Math.cos(lat0) * Math.PI / 180, ky = R * Math.PI / 180;
  const xy = pts.map((p) => [p[1] * kx, p[0] * ky]);
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    if (e - s < 2) continue;
    const [ax, ay] = xy[s], [bx, by] = xy[e];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let worst = -1, worstI = -1;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = xy[i];
      let d;
      if (len2 === 0) d = Math.hypot(px - ax, py - ay);
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > worst) { worst = d; worstI = i; }
    }
    if (worst > tolM) { keep[worstI] = true; stack.push([s, worstI], [worstI, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function pathLenM(pts) { let m = 0; for (let i = 1; i < pts.length; i++) m += distM(pts[i - 1], pts[i]); return m; }

/**
 * The points between anchors `a` and `b` ([lat,lng]) along mapped trails, or null when there is no
 * usable route (offline, timeout, too far, a detour, a server error). `signal` aborts the request.
 * `null` means there is no trail to follow here; `"detour"` that the mapped trail goes a long way round
 * (a point where the climber crosses fixes it); `"far"` that the leg is longer
 * than a walk in and needs a point between; `false` that the router could not be asked (offline, a
 * timeout, a refused request), so the climber can try again rather than conclude there is no path.
 * @returns {Promise<Array<[number,number]>|null|false|"far"|"detour">}
 */
export async function routeLeg(a, b, signal) {
  const straight = distM(a, b);
  if (!(straight > 0)) return null;
  if (straight > MAX_LEG_M) return "far";
  const k = keyOf(a, b);
  // An answer, or the one request already on its way for these two anchors (a quick Follow
  // off/on, Redo after Undo): never two fetches for one leg.
  // The request we share may be its owner's. If the OWNER gave it up (an Undo aborts and asks again
  // in one tick) we ask for ourselves; if it failed on its own (429, timeout) we take that answer
  // and do not double the burst the server just refused. Two sharers of one abandoned request
  // take turns: the second finds the first's fresh request in the cache and shares THAT.
  while (cache.has(k)) {
    const shared = cache.get(k), own = owners.get(k), v = await shared;
    if (!(v === false && own && own.aborted && !(signal && signal.aborted))) return v;
    if (cache.get(k) !== shared) continue; // someone already asked again: share theirs
    break;
  }
  if (signal && signal.aborted) return false;
  const p = (async () => {
    const got = await acquire(signal);
    if (!got) return false;
    try { return await routeNow(a, b, straight, signal); } finally { release(); }
  })().catch(() => false);
  remember(k, p); owners.set(k, signal || null);
  const v = await p;
  // Only an answer is remembered: a failure to answer (or an abort) is asked again next time.
  if (owners.get(k) === (signal || null)) owners.delete(k);
  if (v === false) { if (cache.get(k) === p) cache.delete(k); }
  else remember(k, v);
  return v;
}
async function routeNow(a, b, straight, signal) {
  if (signal && signal.aborted) return false; // gave up, not "no trail": never remembered as one
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  const onOuter = () => ctl.abort();
  if (signal) { if (signal.aborted) { clearTimeout(t); return false; } signal.addEventListener("abort", onOuter); }
  try {
    const url = BROUTER + "?lonlats=" + a[1] + "," + a[0] + "|" + b[1] + "," + b[0] + "&profile=" + PROFILE + "&alternativeidx=0&format=geojson";
    const r = await fetch(url, { signal: ctl.signal });
    // Any refusal (a 429 while the public server is busy, a 403, a 5xx) is the router not answering, not "no trail".
    if (!r.ok) return false;
    // BRouter answers with HTTP 200 and a plain-text line both when it finds no route ("no track
    // found", "target island detected") AND when its engine gave up ("operation killed by
    // thread-priority-watchdog" under load). The wording says which; anything else in text is
    // "the router didn't answer": a retry is cheap, and a wrong "no trail here" would send the
    // climber off to hand-trace a path that exists.
    const body = await r.text();
    let j = null;
    try { j = JSON.parse(body); } catch (e) { return /no (track|route|path)|not found|island|unreachable/i.test(body) ? null : false; }
    const g = Array.isArray(j.features) && j.features[0] && j.features[0].geometry;
    if (!g || g.type !== "LineString" || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return null;
    let pts = g.coordinates.map((c) => [+(+c[1]).toFixed(6), +(+c[0]).toFixed(6)]).filter((p) => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length < 2) return null;
    if (pathLenM(pts) > straight * DETOUR_X + 300) return "detour";
    pts = simplifyPts(pts, SIMPLIFY_M);
    // BRouter starts and ends on the nearest mapped way. A routed end a few metres from the tap is
    // the tap; one further away is left in, so the gap between the trail and the tap shows honestly.
    if (distM(pts[0], a) < SNAP_TRIM_M) pts = pts.slice(1);
    if (pts.length && distM(pts[pts.length - 1], b) < SNAP_TRIM_M) pts = pts.slice(0, -1);
    return pts;
  } catch (e) {
    return false; // the request itself failed: offline, blocked, or our own timeout
  } finally {
    clearTimeout(t);
    if (signal) signal.removeEventListener("abort", onOuter);
  }
}
