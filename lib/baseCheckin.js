// "I'm at the base" — recording where a climb starts from the climber's own device (0188).
//
// TWO HALVES, AND WHICH ONE DECIDES WHAT. This module judges the FIX: is the GPS signal good
// enough, steady enough, and still enough that it describes where somebody is standing? Those are
// things only the device can see. Whether that point is at THIS climb — distance from the crag or
// peak, not at the trailhead, not an impossible jump from your last check-in — is decided by
// check_in_at_route_base() in the database, because a rule a browser applies can be skipped by a
// crafted request. So nothing here claims the climber is at the base; it only refuses to send a
// fix too poor to say anything, and the server's answer is what the screen reports.
//
// Pure functions plus one browser adapter (acquireBaseFix), so the rules can be executed in node
// against constructed samples rather than read.

// The server enforces the same accuracy bar; keep them equal.
export const BASE_MAX_ACCURACY_M = 50;
// A single fix is one reading of a noisy instrument. Several that agree are a position.
export const BASE_MIN_SAMPLES = 3;
export const BASE_MAX_SPREAD_M = 30;
// Walking pace is ~1.3 m/s. Faster than this and the reading is of somebody passing through.
export const BASE_MAX_SPEED_MS = 1.8;
// Stop collecting once we have this many good fixes spanning at least BASE_MIN_SPAN_MS.
export const BASE_TARGET_SAMPLES = 5;
export const BASE_MIN_SPAN_MS = 6000;
export const BASE_TIMEOUT_MS = 30000;
// Points within this distance are one spot on the route page.
export const BASE_CLUSTER_M = 25;

export function distM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// samples: [{lat, lng, accuracy, speed, t}] as read from the device.
// Returns {ok:true, lat, lng, accuracy, samples, spread, fixedAt} or {ok:false, reason, ...}.
export function summariseFixes(samples) {
  const all = (samples || []).filter((s) => s && Number.isFinite(s.lat) && Number.isFinite(s.lng) && Number.isFinite(s.accuracy));
  if (!all.length) return { ok: false, reason: "no_fix" };
  // Moving is judged on EVERY reading, not only the precise ones: a coarse reading at driving speed
  // still says the phone was in a car.
  if (all.some((s) => Number.isFinite(s.speed) && s.speed > BASE_MAX_SPEED_MS)) return { ok: false, reason: "moving" };
  const good = all.filter((s) => s.accuracy <= BASE_MAX_ACCURACY_M);
  if (good.length < BASE_MIN_SAMPLES) {
    const best = Math.min(...all.map((s) => s.accuracy));
    return { ok: false, reason: "accuracy", accuracy: Math.round(best), limit: BASE_MAX_ACCURACY_M };
  }
  const c = { lat: median(good.map((s) => s.lat)), lng: median(good.map((s) => s.lng)) };
  const spread = Math.max(...good.map((s) => distM(c, s)));
  if (spread > BASE_MAX_SPREAD_M) return { ok: false, reason: "unsteady", spread: Math.round(spread) };
  return {
    ok: true, lat: c.lat, lng: c.lng,
    accuracy: Math.round(median(good.map((s) => s.accuracy)) * 10) / 10,
    samples: good.length, spread: Math.round(spread),
    fixedAt: new Date(Math.max(...good.map((s) => s.t || 0)) || Date.now()).toISOString(),
  };
}

// Browser adapter. Resolves with summariseFixes' result, or {ok:false, reason:"denied"|"unsupported"}.
// maximumAge 0 and enableHighAccuracy: a cached or network-derived fix is exactly what this must refuse.
export function acquireBaseFix(geo, opts = {}) {
  const timeoutMs = opts.timeoutMs || BASE_TIMEOUT_MS;
  const onProgress = opts.onProgress || (() => {});
  return new Promise((resolve) => {
    if (!geo || !geo.watchPosition) { resolve({ ok: false, reason: "unsupported" }); return; }
    const samples = [];
    let done = false, id = null, timer = null;
    const finish = (res) => { if (done) return; done = true; try { if (id != null) geo.clearWatch(id); } catch (e) {} clearTimeout(timer); resolve(res); };
    timer = setTimeout(() => finish(summariseFixes(samples)), timeoutMs);
    id = geo.watchPosition(
      (pos) => {
        const c = pos.coords || {};
        samples.push({ lat: c.latitude, lng: c.longitude, accuracy: c.accuracy, speed: c.speed, t: pos.timestamp || Date.now() });
        const good = samples.filter((s) => s.accuracy <= BASE_MAX_ACCURACY_M);
        onProgress({ n: samples.length, good: good.length, accuracy: c.accuracy });
        if (good.length >= BASE_TARGET_SAMPLES && good[good.length - 1].t - good[0].t >= BASE_MIN_SPAN_MS) finish(summariseFixes(samples));
      },
      (err) => {
        // A permission refusal is final. A transient error mid-watch is not — keep what we have.
        if (err && err.code === 1) finish({ ok: false, reason: "denied" });
        else if (!samples.length && err && err.code === 2) finish({ ok: false, reason: "unavailable" });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );
  });
}

// Group the unattributed points the server returns into spots, most-confirmed first.
// Each point is ONE climber (the table is one row per climber per route), so a count is climbers.
export function clusterBasePoints(points) {
  const clusters = [];
  (points || []).forEach((p) => {
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
    let c = clusters.find((k) => distM(k, p) <= BASE_CLUSTER_M);
    if (!c) { c = { lat: p.lat, lng: p.lng, pts: [] }; clusters.push(c); }
    c.pts.push(p);
    c.lat = c.pts.reduce((s, q) => s + q.lat, 0) / c.pts.length;
    c.lng = c.pts.reduce((s, q) => s + q.lng, 0) / c.pts.length;
  });
  return clusters
    .map((c) => ({ lat: c.lat, lng: c.lng, n: c.pts.length, mine: c.pts.some((q) => q.mine === true) }))
    .sort((a, b) => b.n - a.n);
}

// What to tell the climber. `dist` formats metres in their own units.
export function baseCheckinMessage(res, dist) {
  const r = res || {};
  const d = (m) => (Number.isFinite(m) ? dist(m) : "");
  switch (r.reason) {
    case "denied": return "Location access is off for this site, so we can’t tell where you are. Allow it in your browser settings and try again.";
    case "unsupported": return "This browser can’t read your location.";
    case "unavailable": case "no_fix": return "Your phone couldn’t get a GPS fix. Step out from under trees or the wall and try again.";
    case "moving": return "You look to be moving. Check in once you’re standing at the start of the climb.";
    case "accuracy": return "Your GPS signal is too vague to place you at the base" + (r.accuracy ? " (±" + d(r.accuracy) + "; we need ±" + d(r.limit || BASE_MAX_ACCURACY_M) + " or better)" : "") + ". Give it a minute in the open and try again.";
    case "unsteady": return "Your position kept jumping around" + (r.spread ? " (" + d(r.spread) + " between readings)" : "") + ". Stand still for a moment and try again.";
    case "too_far": return "You’re " + d(r.distance_m) + " from this " + (r.anchor === "peak" ? "peak" : r.anchor === "base pin" ? "route’s recorded start" : "crag") + " as we have it on file — a check-in has to be within " + d(r.radius_m) + ". If you are at the base, the location on file may be wrong.";
    case "trailhead": return "You’re at the trailhead, not the base of the climb. Check in when you reach the start.";
    case "travel": return "That’s too far from your last check-in for the time between them.";
    case "rate": return "You’ve checked in a lot today. Try again tomorrow.";
    case "stale": return "That GPS reading is too old to use.";
    case "no_location": return "This climb has no location on file, so there is nothing to check your position against yet.";
    case "bad_fix": return "Your phone returned a position we couldn’t read.";
    default: return "Couldn’t check you in — try again.";
  }
}

// A fix taken with no signal is kept on this phone and sent later; the server still judges it,
// and refuses one older than seven days. Keyed by account so a shared phone does not send one
// climber's check-in as another's. localStorage can throw (private mode) — every access is guarded.
const pendKey = (uid) => "cm-base-pending:" + uid;
export function pendingBaseCheckins(uid) {
  if (!uid) return [];
  try { const v = JSON.parse(localStorage.getItem(pendKey(uid)) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
export function savePendingBaseCheckins(uid, list) {
  if (!uid) return false;
  try { if (list && list.length) localStorage.setItem(pendKey(uid), JSON.stringify(list)); else localStorage.removeItem(pendKey(uid)); return true; } catch (e) { return false; }
}
