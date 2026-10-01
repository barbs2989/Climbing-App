// WHICH WAY IN — one route, more than one approach, and every panel follows the climber's pick.
//
// THE PROBLEM THIS EXISTS FOR. A route row stores ONE trailhead, ONE track, ONE camp list, ONE
// set of gain/distance/time and ONE trip plan. Mount Shuksan's Southeast Ridge is a summit-pyramid
// FINISH reached by two different routes — the Sulphide Glacier from the Shannon Ridge trailhead
// and the Fisher Chimneys from Lake Ann — and the row could only describe one of them: its pins,
// camps and stats were the Sulphide's while its road and hazard prose described Lake Ann and the
// Curtis Glacier. The page contradicted itself, and every number on it silently belonged to one
// way in. Measured catalog-wide on 2026-10-01: 125 routes list ≥2 approaches against one stat
// set, and 31 more name a second approach in prose the data never recorded.
//
// THE SHAPE. An `approach_variants` entry may carry `viaRouteId`: the id of a SIBLING catalog route
// that IS the way in (Shuksan SE Ridge → Sulphide Glacier | Fisher Chimneys). Selecting it overlays
// that route's trailhead, road, access, track, waypoints, camps, gain/loss/distance, approach/descent
// times and trip plan onto this route, and leaves this route's own CLIMB (grade, pitches, rack,
// descent of the climbing, hazards) alone. Nothing is copied into the row and nothing is computed:
// the numbers shown are the sibling route's own, labelled as such — the fabricated-pins lesson is
// that a track truncated at a guessed junction is a manufactured measurement.
//
// WHAT IS DELIBERATELY NOT OVERLAID. The sibling's `summitTimeHrs` / `totalHrs`: they time ITS
// finish (the Sulphide's 600 ft summit gully), which this route replaces. Dropping them sends the
// planner to `techHrs(this route's pitches)` for the climbing — the part that actually differs.
//
// A variant may instead carry `trip`: an object holding any of the same camelCase keys (shape B —
// one climb, several trailheads, no sibling row). Only keys PRESENT are overlaid; a variant's
// legacy `distMi`/`gainFt` are the APPROACH leg and are never promoted to whole-route totals.
//
// lib/, not ClimbMatchCore or RouteDetail, for the reason lib/outing.js records: core cannot import
// the lazily loaded route page, and the guards and the area browser import only lib/.

import { displayGrade } from "./grade.js";

/* The keys a way in owns. Everything else on the route is the climb and stays. `itinerary` belongs
   here because its days carry the walk's miles — lib/outing.js prefers it over dist_km — so leaving
   it behind would let the planner add one approach's distance to another's gain. */
export const APPROACH_OWNED_KEYS = [
  "approachLogistics", "road", "access", "permits",
  "waypoints", "gpxPts", "elevPts", "bivy",
  "gainFt", "gainM", "lossFt", "lossM", "distKm", "outingShape",
  "itinerary", "approach",
];

/* A stable key for a variant: the sibling's id when it is one, else its name. Used for the
   selection state and the `?approach=` link, so a renamed CARD does not orphan a shared link to a
   sibling route. */
export const approachKeyOf = (v, i) =>
  (v && v.viaRouteId) || (v && v.name ? String(v.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "") || "approach-" + i;

/* A variant is SWITCHABLE only when choosing it changes something on screen. 125 routes already
   list several ways in as prose cards with no data of their own; offering a picker there would be
   a control that changes nothing (check:preview-claims' class), so they keep their cards. */
export const isSwitchableVariant = (v) =>
  !!(v && (v.viaRouteId || (v.trip && typeof v.trip === "object" && APPROACH_OWNED_KEYS.some((k) => v.trip[k] != null))));

/* The picker offers every LINKED way in, plus the route's MAIN way in when that one is not linked:
   its data is the row as stored, so choosing it is a real choice (it puts the stored trailhead
   back). Other unlinked cards stay out of the picker — selecting one would show the main way in's
   trailhead and numbers under another way in's name. */
export function approachOptions(route) {
  const vars = route && Array.isArray(route.approachVariants) ? route.approachVariants.filter(Boolean) : [];
  const opts = vars.map((v, i) => ({ key: approachKeyOf(v, i), index: i, variant: v, switchable: isSwitchableVariant(v) }));
  if (!opts.some((o) => o.switchable)) return [];
  /* `storedRow:true` names the way in the row's OWN trailhead and numbers describe, when that is
     not the most-used one: Sloan's Corkscrew stores the Cougar Creek pullout while most parties go
     up Bedal Creek. Without it, the picker would label the stored Cougar Creek data "Bedal Creek". */
  const si = vars.findIndex((v) => v.storedRow === true && !isSwitchableVariant(v));
  const pi = vars.findIndex((v) => v.primary === true);
  const main = opts[si >= 0 ? si : pi >= 0 ? pi : 0];
  return opts.filter((o) => o.switchable || o === main).map((o) => (o.switchable ? o : { ...o, stored: true }));
}

export const defaultApproachKey = (opts) => {
  if (!opts || !opts.length) return null;
  const p = opts.find((o) => o.variant && o.variant.primary === true);
  return (p || opts[0]).key;
};

/* THE TRIP RECORD'S TRAILHEAD, to and from the edit sheet's boxes. Here and not in RouteDetail
   because it is the record's SHAPE, not a decision about where a trailhead is: check:waypoint-placement
   holds RouteDetail to ONE trailhead resolver (trailheadPoint), and an editor reading a way in's
   stored pin into a text box is not a second one. The resolver still decides — applyApproach turns
   this pin into the Trailhead waypoint trailheadPoint reads first. */
export const tripTrailheadDraft = (trip) => {
  const al = (trip && trip.approachLogistics) || {};
  return { thName: al.trailhead || "", thLat: al.trailheadLat != null ? String(al.trailheadLat) : "", thLng: al.trailheadLng != null ? String(al.trailheadLng) : "" };
};
export const tripTrailheadStore = (name, lat, lng) => {
  const al = {};
  const n = String(name || "").trim();
  if (n) al.trailhead = n;
  const la = parseFloat(lat), ln = parseFloat(lng);
  // (0, 0) is the Gulf of Guinea: an emptied box parsed as zero, never a trailhead.
  if (isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0)) { al.trailheadLat = la; al.trailheadLng = ln; }
  return Object.keys(al).length ? al : null;
};

/* The edit sheet's trailhead boxes written back OVER a stored approachLogistics: the boxes own the
   name and the pin, and everything else the record carries (directions, a road note) is kept. */
export const tripTrailheadMerge = (stored, name, lat, lng) => {
  const al = stored && typeof stored === "object" ? { ...stored } : {};
  delete al.trailhead; delete al.trailheadLat; delete al.trailheadLng;
  return Object.assign(al, tripTrailheadStore(name, lat, lng) || {});
};

/* The sibling route a variant points at, from the area's own routes (already loaded for the
   "More on this peak" list). `toCamel` is passed in so this file stays free of lib/db.js. A sibling
   that has not loaded, or does not exist, returns null — and the overlay then changes NOTHING
   rather than half-applying: a page that shows the Sulphide's pins under a "via Fisher" label is
   the defect this module exists to remove. */
export function viaRouteOf(variant, sibRows, toCamel) {
  if (!variant || !variant.viaRouteId || !Array.isArray(sibRows)) return null;
  const row = sibRows.find((r) => r && r.id === variant.viaRouteId);
  if (!row) return null;
  return toCamel && row.area_id !== undefined && row.gpxPts === undefined ? toCamel(row) : row;
}

export function applyApproach(route, option, viaRoute) {
  if (!route || !option || !option.variant) return route;
  const v = option.variant;
  // The main way in, unlinked: the stored row IS its data. Labelled, never changed.
  if (option.stored) {
    const out = { ...route, _approach: { key: option.key, name: v.name || null, stored: true } };
    /* The row's camp list was written for the whole climb, so it holds the OTHER way in's camps
       too (Stuart's North Ridge stores Goat Pass, the south-side camp, beside the Mountaineer Creek
       basin). `camps` names the ones this way in uses; a camp both ways share is named on both. */
    if (Array.isArray(v.camps) && Array.isArray(route.bivy)) {
      const keep = new Set(v.camps.map((n) => String(n).trim().toLowerCase()));
      out.bivy = route.bivy.filter((c) => c && keep.has(String(c.name || "").trim().toLowerCase()));
    }
    return out;
  }
  /* A linked route can itself have more than one way in. It lends the one its own page opens on,
     so the camps, trailhead and numbers here match what a climber reading that route sees. */
  const viaOwn = v.viaRouteId && viaRoute && !viaRoute._approach ? (() => { const o = approachOptions(viaRoute); const d = o.find((x) => x.key === defaultApproachKey(o)); return d ? applyApproach(viaRoute, d, null) : viaRoute; })() : viaRoute;
  const src = v.viaRouteId ? viaOwn : (v.trip && typeof v.trip === "object" ? v.trip : null);
  if (!src) return route;
  const out = { ...route };
  for (const k of APPROACH_OWNED_KEYS) {
    // EVERY key a way in owns is replaced, including the ones it leaves EMPTY. Its absence is a
    // fact about that way in (nobody recorded camps on it); keeping the stored row's would draw the
    // other approach's camps, pins and track under this one's name — the Shuksan defect again.
    out[k] = src[k] === undefined ? (Array.isArray(route[k]) ? [] : null) : src[k];
    /* ...and its RAW column spelling too. dbRouteToCamel spreads the row, so `dist_km` rides along
       beside `distKm`, and lib/outing.js falls back to it when distKm is null — Sloan's Bedal Creek
       way in, which records no distance, showed Cougar Creek's 4.8 mi through that fallback. */
    const snake = k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
    if (snake !== k && snake in route) out[snake] = out[k];
  }
  /* A way in typed as a trailhead (a `trip` with no pins of its own) still has to put that
     trailhead on the MAP: trailheadPoint() reads a Trailhead waypoint first, and with the stored
     pins cleared above there would be none. The SUMMIT pin is the one stored pin that belongs to
     every way in, so it stays. */
  if (!v.viaRouteId && !Array.isArray(src.waypoints)) {
    const al = src.approachLogistics || {};
    const summit = (Array.isArray(route.waypoints) ? route.waypoints : []).filter((w) => w && /summit/i.test(String(w.type || "")));
    const th = al.trailheadLat != null && al.trailheadLng != null ? [{ type: "Trailhead", name: al.trailhead || "Trailhead", lat: al.trailheadLat, lng: al.trailheadLng, elev: al.trailheadElevFt != null ? al.trailheadElevFt : null }] : [];
    out.waypoints = th.concat(summit);
  }
  const st = src.timing && typeof src.timing === "object" ? src.timing : null;
  if (st || v.viaRouteId) {
    const t = { ...(route.timing || {}) };
    // A via route REPLACES every leg this route timed from its stored trailhead — including when
    // the sibling timed none, because the stored approach hours are the OTHER way in's. Its
    // summit/total are dropped too: they time the sibling's own finish, not this climb.
    if (v.viaRouteId) ["approachTimeHrs", "descentTimeHrs", "recommendedStart", "summitTimeHrs", "totalHrs"].forEach((k) => { delete t[k]; });
    if (st) ["approachTimeHrs", "descentTimeHrs", "recommendedStart"].forEach((k) => { if (st[k] != null) t[k] = st[k]; });
    out.timing = Object.keys(t).length ? t : null;
  }
  out._approach = { key: option.key, name: v.name || (viaRoute && viaRoute.name) || null, viaRouteId: v.viaRouteId || null, viaName: viaRoute ? viaRoute.name : null, viaGrade: viaRoute ? (displayGrade(viaRoute) || null) : null };
  return out;
}
