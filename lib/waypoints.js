// Ordering and de-duplication for a route's waypoint list.
//
// Two defects this fixes, both reported against real routes and both present on every screen
// that renders waypoints (the list, the map, the bail-point picker), because nothing put the
// list in order or checked it for repeats:
//
//   Forbidden Peak, West Ridge — Trailhead (0 mi), Summit (4.5 mi), Boston Basin camp (3 mi),
//   West Ridge notch (4.2 mi). The summit is the far point of the walk and it renders second.
//
//   Mount Olympus, Blue Glacier standard route — two summit pins on the map, in the same
//   place, because the same summit was recorded twice under slightly different names.
//
// Both live in lib/ rather than in the rows on purpose: normalizeWaypoints() at the DB
// boundary is the single funnel every DB route passes through, so seed routes, contributed
// waypoints and future imports are all covered by one fix.

// ~30 m. Two pins this close on a route of miles are the same place; a genuinely different
// feature (a notch and the summit above it) is always further apart than this.
const SAME_PLACE_DEG = 0.0003;

const norm = s => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Names for the same feature vary between research batches ("Forbidden Peak summit" vs
// "Summit"). Strip the words that carry no distinguishing information before comparing.
const STOP = /\b(the|mount|mt|peak|spire|summit|true|main|west|east|north|south|upper|lower|standard|route)\b/g;
const nameKey = s => norm(s).replace(STOP, " ").replace(/\s+/g, " ").trim();

function sameSpot(a, b) {
  if (a.lat == null || b.lat == null || a.lng == null || b.lng == null) return false;
  return Math.abs(a.lat - b.lat) < SAME_PLACE_DEG && Math.abs(a.lng - b.lng) < SAME_PLACE_DEG;
}

// A type that can only occur once on a route. Two "Summit" pins are the same summit; two
// "Water" or "Junction" pins are ordinary and must not be merged.
const SINGLETON = /^(summit|topout|trailhead)$/i;

function mergePair(keep, drop) {
  const out = { ...keep };
  // Prefer the richer record: fill anything the kept pin is missing.
  for (const k of Object.keys(drop)) {
    if (out[k] == null || out[k] === "") out[k] = drop[k];
  }
  // A longer name usually carries the disambiguating detail ("Forbidden Peak summit").
  if (String(drop.name || "").length > String(keep.name || "").length) out.name = drop.name;
  return out;
}

export function dedupeWaypoints(wps) {
  if (!Array.isArray(wps)) return wps;
  const out = [];
  for (const w of wps) {
    if (!w || typeof w !== "object") { out.push(w); continue; }
    const t = String(w.type || "");
    const idx = out.findIndex(p => {
      if (!p || typeof p !== "object") return false;
      const pt = String(p.type || "");
      if (norm(pt) !== norm(t)) return false;
      // Same singleton type is enough on its own — a route has one summit.
      if (SINGLETON.test(t)) return true;
      if (sameSpot(p, w)) return true;
      const a = nameKey(p.name), b = nameKey(w.name);
      return !!a && a === b;
    });
    if (idx < 0) out.push(w); else out[idx] = mergePair(out[idx], w);
  }
  return out;
}

// Order the list the way somebody walks it. `distMi` is distance from the start, so it is the
// only field that actually encodes sequence.
//
// Reorder ONLY when every waypoint carries a distMi. A partial list has no defined order —
// sorting the measured ones and leaving the rest wherever they fall would scramble a list
// that a human may have put in deliberate order, which is worse than leaving it be.
export function orderWaypoints(wps) {
  if (!Array.isArray(wps) || wps.length < 2) return wps;
  const all = wps.every(w => w && typeof w === "object" && typeof w.distMi === "number" && Number.isFinite(w.distMi));
  if (!all) return wps;
  // Stable: equal distances keep their stored order.
  return wps.map((w, i) => [w, i])
    .sort((a, b) => (a[0].distMi - b[0].distMi) || (a[1] - b[1]))
    .map(p => p[0]);
}

export function tidyWaypoints(wps) {
  return orderWaypoints(dedupeWaypoints(wps));
}
