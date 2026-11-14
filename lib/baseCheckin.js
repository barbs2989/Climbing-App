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
// THE CONSENSUS IS THE DATABASE'S (0363 route_base_spots): check-ins within 25 m of the best-
// supported one are a spot, its centre is their median, and the top spot is CONFIRMED when at
// least this many climbers stood in it and they are a majority of everyone who checked in. A
// confirmed spot becomes the route's own Base pin (moved when within 200 m of the pin on file,
// held for review when further). Kept here only for the words the panel prints.
export const BASE_CONFIRM_MIN = 3;

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

// "How far am I from the base?" — a live distance and compass direction from the climber's phone to
// the start, the way Topo Guru's compass-and-distance tool walks you to a boulder. GPS alone cannot
// tell two neighbouring lines apart (a phone is good to ±5–15 m under a wall at best), so inside
// that error the readout stops pointing and the panel shows the route's own location note instead.
const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
export function bearingDeg(a, b) {
  const rad = Math.PI / 180, y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
export const compassWord = (deg) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
// Within this, or within the fix's own accuracy if that is worse, "you are there" is all GPS can say.
export const BASE_ARRIVED_M = 15;
// you: {lat,lng,accuracy}; base: {lat,lng}. Returns {arrived, d, line}; `dist` formats metres.
export function baseGuide(you, base, dist) {
  const d = distM(you, base), acc = Number.isFinite(you.accuracy) ? you.accuracy : 0;
  const accTxt = acc ? " (your GPS: ±" + dist(Math.round(acc)) + ")" : "";
  if (d <= Math.max(BASE_ARRIVED_M, acc)) return { arrived: true, d, line: "You’re at the base, as near as your phone’s GPS can tell" + accTxt + "." };
  return { arrived: false, d, line: "About " + dist(Math.round(d)) + " " + compassWord(bearingDeg(you, base)) + " of you" + accTxt + "." };
}

// POINT THE WAY: an arrow that turns with the phone, the way a compass-and-distance tool does once you
// are off the trail and looking for one line among many. A browser's compass is MAGNETIC (Safari fills
// webkitCompassHeading from Core Location's magneticHeading; Android's absolute orientation follows the
// geomagnetic field), and bearingDeg is TRUE, so the heading is corrected by the local declination
// (lib/declination.js) before the two are compared — ~15° in the Cascades, which from 100 m out is the
// difference between two neighbouring lines.
const norm360 = (d) => ((d % 360) + 360) % 360;
// ev: a DeviceOrientationEvent. screenAngle: screen.orientation.angle (0 held upright). decl: degrees
// east. Returns {heading, accuracy} in degrees from TRUE north, or null when the event carries no
// north-referenced reading: plain `alpha` on a non-absolute event is measured from wherever the phone
// faced when the page started listening, so it must never be read as a compass.
export function headingFromOrientation(ev, screenAngle, decl) {
  if (!ev) return null;
  let mag = null, accuracy = null;
  if (Number.isFinite(ev.webkitCompassHeading) && ev.webkitCompassHeading >= 0) {
    mag = ev.webkitCompassHeading;
    accuracy = Number.isFinite(ev.webkitCompassAccuracy) ? ev.webkitCompassAccuracy : null;
  } else if (ev.absolute === true && Number.isFinite(ev.alpha)) mag = 360 - ev.alpha; // alpha turns counter-clockwise
  if (mag == null) return null;
  return { heading: norm360(mag + (Number.isFinite(screenAngle) ? screenAngle : 0) + (Number.isFinite(decl) ? decl : 0)), accuracy };
}
// Where the base lies relative to the way the phone points: degrees clockwise (0 = straight ahead).
export const relativeBearing = (bearing, heading) => norm360(bearing - heading);
const TURN = ["Straight ahead", "Ahead, to your right", "To your right", "Behind you, to your right", "Behind you", "Behind you, to your left", "To your left", "Ahead, to your left"];
export const turnWord = (rel) => TURN[Math.round(norm360(rel) / 45) % 8];
// A magnetometer reads noisy; average headings as unit vectors so 359° and 1° average to 0°, not 180°.
export function smoothHeading(prev, next, k = 0.25) {
  if (!Number.isFinite(prev)) return next;
  const r = Math.PI / 180, x = (1 - k) * Math.cos(prev * r) + k * Math.cos(next * r), y = (1 - k) * Math.sin(prev * r) + k * Math.sin(next * r);
  return norm360(Math.atan2(y, x) / r);
}
