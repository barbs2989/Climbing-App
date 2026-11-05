// FOLLOW TRAILS: bend one leg of a hand-drawn trail along the mapped footpaths between its two
// anchors. A tap-to-tap line is straight segments, and a switchbacking approach takes thirty taps to
// trace honestly; AllTrails, CalTopo and Komoot route each click along OpenStreetMap paths instead
// ("snap to trail"). This asks BRouter's public server (brouter.de, the OSM hiking router, free for
// fair use; Open-Meteo is fetched from the browser the same way) for a hiking-mountain route and
// returns the points BETWEEN the anchors, simplified. Every failure returns null and the caller
// keeps the straight leg: a routed line is a convenience, never a requirement.
const BROUTER = "https://brouter.de/brouter";
const PROFILE = "hiking-mountain";
const TIMEOUT_MS = 8000;
const MAX_LEG_M = 10000; // a crag's walk in; past this a tap is a planning sketch, not a trail
const DETOUR_X = 4; // a routed leg this many times longer than the straight one (+300 m) went round something the climber meant to cross
const SNAP_TRIM_M = 15; // a routed end within this of the anchor is the anchor, not a spur
const SIMPLIFY_M = 3;

const R = 6371000;
// Metres between two [lat,lng] pairs (lib/track.js's metresBetween is the same formula over {lat,lng} objects).
export function distM(a, b) {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, h)));
}

// Douglas-Peucker on a local equirectangular projection (metres). Keeps the first and last point.
export function simplifyPts(pts, tolM) {
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

function pathLenM(pts) { let m = 0; for (let i = 1; i < pts.length; i++) m += distM(pts[i - 1], pts[i]); return m; }

/**
 * The points between anchors `a` and `b` ([lat,lng]) along mapped trails, or null when there is no
 * usable route (offline, timeout, too far, a detour, a server error). `signal` aborts the request.
 * `null` means there is no trail to follow here (no route, too far, a detour); `false` means the
 * router could not be asked (offline, a timeout, a server error), so the climber can try again
 * rather than conclude there is no path.
 * @returns {Promise<Array<[number,number]>|null|false>}
 */
export async function routeLeg(a, b, signal) {
  const straight = distM(a, b);
  if (!(straight > 0) || straight > MAX_LEG_M) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  const onOuter = () => ctl.abort();
  if (signal) { if (signal.aborted) { clearTimeout(t); return null; } signal.addEventListener("abort", onOuter); }
  try {
    const url = BROUTER + "?lonlats=" + a[1] + "," + a[0] + "|" + b[1] + "," + b[0] + "&profile=" + PROFILE + "&alternativeidx=0&format=geojson";
    const r = await fetch(url, { signal: ctl.signal });
    if (r.status >= 500) return false;
    if (!r.ok) return null;
    // BRouter answers a route it cannot find as plain text, not JSON: that is "no trail", not a failure.
    const j = await r.json().catch(() => null);
    const g = j && Array.isArray(j.features) && j.features[0] && j.features[0].geometry;
    if (!g || g.type !== "LineString" || !Array.isArray(g.coordinates) || g.coordinates.length < 2) return null;
    let pts = g.coordinates.map((c) => [+(+c[1]).toFixed(6), +(+c[0]).toFixed(6)]).filter((p) => isFinite(p[0]) && isFinite(p[1]));
    if (pts.length < 2) return null;
    if (pathLenM(pts) > straight * DETOUR_X + 300) return null;
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
