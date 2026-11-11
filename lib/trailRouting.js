// FOLLOW TRAILS: bend one leg of a hand-drawn trail along the mapped footpaths between its two
// anchors. A tap-to-tap line is straight segments, and a switchbacking approach takes thirty taps to
// trace honestly; AllTrails, CalTopo and Komoot route each click along OpenStreetMap paths instead
// ("snap to trail"). This asks BRouter's public server (brouter.de, the OSM hiking router, free for
// fair use; Open-Meteo is fetched from the browser the same way) for a hiking-mountain route and
// returns the points BETWEEN the anchors, simplified. Anything but an array (see routeLeg's contract:
// null, false, "far", "detour") leaves the caller its straight leg: a routed line is a convenience,
// never a requirement.
import { metresBetween } from "./track";
const BROUTER = "https://brouter.de/brouter";
const PROFILE = "hiking-mountain";
const TIMEOUT_MS = 8000; // for the request itself, once it has a slot
const QUEUE_MIN_MS = 45000; // the least a leg waits in the line behind others before it gives up: a long
// line switched to Follow trails at once waits longer, every leg ahead at its own worst (TIMEOUT_MS)
const MAX_LEG_M = 10000; // a crag's walk in; past this a tap is a planning sketch, not a trail
const DETOUR_X = 8; // a routed leg this many times longer than the straight one (+1 km) went round something the climber meant to cross; looser than it looks, because a tight switchback is 6-7x its straight line and is the whole point
const SNAP_TRIM_M = 15; // a routed end within this of the anchor is the anchor, not a spur
const SIMPLIFY_M = 3;

const R = 6371000;
// Metres between two [lat,lng] pairs: lib/track.js's haversine, which takes {lat,lng}.
export const distM = (a, b) => metresBetween({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
// At most this many legs are asked for at once: switching Follow trails on over a long hand-traced
// line asks for every leg, and the public server answers a burst with 429s.
const MAX_IN_FLIGHT = 3;
let inFlight = 0;
const waiting = [];
// A waiter whose caller gave up (Follow off, Undo, Clear) is dropped, so it never takes a slot ahead of a live leg.
const acquire = (signal) => new Promise((res) => {
  if (signal && signal.aborted) { res(false); return; }
  if (inFlight < MAX_IN_FLIGHT) { inFlight++; res(true); return; }
  const w = { res, signal, off: null };
  waiting.push(w);
  // Given up while queued: out of the line now, not when some other request happens to finish.
  if (signal) { const onAbort = () => { const at = waiting.indexOf(w); if (at >= 0) { waiting.splice(at, 1); res(false); } }; w.off = () => signal.removeEventListener("abort", onAbort); signal.addEventListener("abort", onAbort, { once: true }); }
});
// The granted waiter's abort listener comes off (its signal lives on until the leg lands).
const release = () => { let w = waiting.shift(); while (w && w.signal && w.signal.aborted) { if (w.off) w.off(); w.res(false); w = waiting.shift(); } if (w) { if (w.off) w.off(); w.res(true); } else inFlight--; };
// Answers already given this session, by the two anchors: a toggle or an Undo/Redo over the same
// legs asks nothing twice (the public server rate-limits bursts).
const CACHE_MAX = 200;
const cache = new Map();
// Requests on their way live apart from the answers, so the answer cache's eviction can never
// drop one and let a sharer fetch the same leg twice.
const pendingByKey = new Map(); // k -> promise
const owners = new Map(); // k -> the signal of the caller whose request is in flight
const keyOf = (a, b) => a[0] + "," + a[1] + "|" + b[0] + "," + b[1];
const NO_TRAIL_TTL_MS = 5 * 60 * 1000; // a "no trail" can be the server's momentary miss: asked again after this
const noTrailAt = new Map(); // k -> when a null (or a "detour", which can be a segment the server lacked for a while) was remembered
const remember = (k, v) => { if (!cache.has(k) && cache.size >= CACHE_MAX) { const old = cache.keys().next().value; cache.delete(old); noTrailAt.delete(old); } cache.set(k, v); if (v === null || v === "detour") noTrailAt.set(k, Date.now()); else noTrailAt.delete(k); return v; };

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
export function routeLeg(a, b, signal) {
  // One answer for two anchors whichever way the leg runs (a line drawn back from the crag, the
  // desktop tool and the sheet tracing the same path from opposite ends): the pair is asked in one
  // order and the points are turned round for the other.
  const fwd = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
  return fwd ? routeLegDir(a, b, signal) : routeLegDir(b, a, signal).then((v) => (Array.isArray(v) ? v.slice().reverse() : v));
}
async function routeLegDir(a, b, signal) {
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
  if (cache.has(k)) {
    const at = noTrailAt.get(k);
    if (!(at != null && Date.now() - at > NO_TRAIL_TTL_MS)) return cache.get(k);
    cache.delete(k); noTrailAt.delete(k); // stale "no trail": ask again
  }
  if (pendingByKey.has(k)) {
    const own = owners.get(k), v = await pendingByKey.get(k);
    if (!(v === false && own && own.aborted && !(signal && signal.aborted))) return v;
    return routeLegDir(a, b, signal); // the owner gave up: ask again, or share the request someone made meanwhile
  }
  if (signal && signal.aborted) return false;
  // Two clocks: a long one for the wait in the line (a healthy server is slow, not down, when
  // twenty legs are asked at once), and the request's own, started only when it has a slot, so a
  // hanging server costs each leg at most TIMEOUT_MS of its own time.
  const ctl = new AbortController();
  const queueMs = Math.max(QUEUE_MIN_MS, (Math.ceil(waiting.length / MAX_IN_FLIGHT) + 2) * TIMEOUT_MS);
  let t = setTimeout(() => ctl.abort(), queueMs);
  const onOuter = () => ctl.abort();
  if (signal) signal.addEventListener("abort", onOuter, { once: true });
  const p = (async () => {
    const got = await acquire(ctl.signal);
    if (!got) return false;
    clearTimeout(t); t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try { return await routeNow(a, b, straight, ctl.signal); } finally { release(); }
  })().catch(() => false).finally(() => { clearTimeout(t); if (signal) signal.removeEventListener("abort", onOuter); if (pendingByKey.get(k) === p) { pendingByKey.delete(k); owners.delete(k); } });
  pendingByKey.set(k, p); owners.set(k, signal || null);
  const v = await p;
  // Only an answer is remembered: a failure to answer (or an abort) is asked again next time.
  if (v !== false) remember(k, v);
  return v;
}
async function routeNow(a, b, straight, signal) {
  if (signal && signal.aborted) return false;
  try {
    const url = BROUTER + "?lonlats=" + a[1] + "," + a[0] + "|" + b[1] + "," + b[0] + "&profile=" + PROFILE + "&alternativeidx=0&format=geojson";
    const r = await fetch(url, { signal });
    // Any refusal (a 429 while the public server is busy, a 403, a 5xx) is the router not answering, not "no trail".
    if (!r.ok) return false;
    // BRouter answers with HTTP 200 and a plain-text line both when it finds no route ("no track
    // found", "target island detected") AND when its engine gave up ("operation killed by
    // thread-priority-watchdog" under load). The wording says which; anything else in text is
    // "the router didn't answer": a retry is cheap, and a wrong "no trail here" would send the
    // climber off to hand-trace a path that exists.
    const body = await r.text();
    let j = null;
    // A missing data file, or a bare "not found" (a profile, a segment), is the SERVER's problem:
    // asked again later, never remembered as "no trail".
    try { j = JSON.parse(body); } catch (e) { const line = String(body || "").trim(); if (line.length > 200 || line[0] === "<") return false; return /not mapped|no (track|route|path)|island|unreachable/i.test(line) ? null : false; } // anything else in text (a missing data file, a watchdog) is the server's problem
    const g = Array.isArray(j.features) && j.features[0] && j.features[0].geometry;
    // JSON without a line in it is a malformed answer (seen under load), not "no trail": never cached.
    if (!g || g.type !== "LineString" || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return false;
    let pts = g.coordinates.map((c) => [+(+c[1]).toFixed(6), +(+c[0]).toFixed(6)]).filter((p) => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length < 2) return false;
    if (pathLenM(pts) > straight * DETOUR_X + 1000) return "detour";
    pts = simplifyPts(pts, SIMPLIFY_M);
    // BRouter starts and ends on the nearest mapped way. A routed end a few metres from the tap is
    // the tap; one further away is left in, so the gap between the trail and the tap shows honestly.
    while (pts.length && distM(pts[0], a) < SNAP_TRIM_M) pts = pts.slice(1);
    while (pts.length && distM(pts[pts.length - 1], b) < SNAP_TRIM_M) pts = pts.slice(0, -1);
    // Two anchors a few metres apart on one path trim to nothing: every routed point sat within
    // SNAP_TRIM_M of an anchor, so the straight leg IS the path (keeping them would draw the two
    // spurs the trim exists to remove). The answer is still an array, remembered, never a failure.
    return pts;
  } catch (e) {
    return false; // the request itself failed: offline, blocked, or the caller's timeout (routeLeg owns the clock)
  }
}
