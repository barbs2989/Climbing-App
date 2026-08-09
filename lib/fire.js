// Live wildfire + fire-weather data from federal sources, for lib/FireMap.jsx.
//
// Leaf module: imports nothing from ClimbMatch.jsx / ClimbMatchCore.jsx (same rule
// as lib/db.js and lib/mapKit.jsx), so the map view can be lazy-loaded without
// dragging the app bundle in behind it.
//
// Three sources, all public-domain federal services. All three were probed from a
// browser origin before this was written: none needs an API key, all three answer
// CORS preflight (NIFC and api.weather.gov send `*`; NOAA mapservices reflects the
// request Origin, which covers localhost and the Pages domain alike), and all three
// support server-side bbox filtering so the client never downloads a national
// dataset to throw most of it away.
//
//   WFIGS  — Wildland Fire Interagency Geospatial Services, hosted by the National
//            Interagency Fire Center. The federal system of record for incident
//            reporting: every wildfire an agency is managing, with acreage and
//            containment, plus mapped perimeters once a fire is big enough to fly.
//   NOAA   — the National Weather Service's watches/warnings/advisories service,
//            filtered to the fire-weather products (Red Flag Warning, Fire Weather
//            Watch). This is the *danger* half: conditions in which a new ignition
//            runs. It is issued as polygons, so it maps directly.
//
// WHAT THIS DATA CANNOT TELL YOU, and why the UI says so out loud: there is no
// national API for land closures or fire restrictions. A closure is a written order
// from whoever manages the land, published per-forest as prose. So this module can
// truthfully say "a 97,000-acre fire is burning 12 miles from that trailhead" and
// can never say "the road is open" — FireMap links out to the managing agency
// instead of implying it knows.

import { useQuery } from "@tanstack/react-query";

const NIFC = "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services";
const INCIDENTS = NIFC + "/WFIGS_Incident_Locations_Current/FeatureServer/0/query";
const PERIMETERS = NIFC + "/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query";
const FIRE_WX = "https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer/1/query";

// Shown in the map's attribution footer. Users should be able to check our work
// against the source, so these are the human pages, not the service endpoints.
export const FIRE_SOURCES = [
  { label: "Fires & perimeters: NIFC / WFIGS", href: "https://data-nifc.opendata.arcgis.com/" },
  { label: "Fire weather: NOAA / National Weather Service", href: "https://www.weather.gov/fire/" },
];

// Per-layer ceiling. WFIGS is national and a zoomed-out viewport can hold every
// fire in the West; a perimeter is a polygon with thousands of vertices, so the
// cap is far lower there than for points. When a query comes back at the cap we
// tell the user (`truncated`) rather than silently drawing a subset — a map that
// quietly drops the fire you were looking for is worse than one that admits it.
const CAP = { incidents: 400, perimeters: 120, wx: 200 };

// ~100m for perimeters, ~500m for fire-weather zones. Perimeter shape is the
// point of that layer (which drainage is it in, has it crossed the ridge), while a
// weather zone is a coarse administrative boundary nobody reads closely. Full
// vertex resolution on 30 WA perimeters is ~106KB; this trims it without changing
// any decision a climber would make at map zoom.
const OFFSET = { perimeters: 0.001, wx: 0.005 };

function bboxParam(b) { return [b.minLng, b.minLat, b.maxLng, b.maxLat].join(","); }

// An ArcGIS REST error arrives as HTTP 200 with an `error` key in the body, and a
// truncated result arrives as a normal FeatureCollection. Both have to be caught
// here: this app's recurring bug is a failed read rendering as a confident empty
// state, and on a wildfire map that reads as "nothing burning near you".
async function arcgis(url, params, cap) {
  const qs = new URLSearchParams({ f: "geojson", outSR: "4326", inSR: "4326", resultRecordCount: String(cap), ...params });
  const res = await fetch(url + "?" + qs.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status + " from " + new URL(url).host);
  const body = await res.json();
  if (body && body.error) throw new Error(body.error.message || "Service error " + body.error.code);
  if (!body || !Array.isArray(body.features)) throw new Error("Unexpected response shape from " + new URL(url).host);
  return { features: body.features, truncated: body.features.length >= cap || !!(body.properties && body.properties.exceededTransferLimit) };
}

// Active wildfire incident points. IncidentTypeCategory 'WF' is a wildfire; the
// same layer also carries 'RX' (prescribed burn), which is deliberately excluded —
// a planned burn is not the hazard this map is about, and showing the two in one
// colour would misrepresent both.
export async function fetchActiveFires(bbox) {
  const r = await arcgis(INCIDENTS, {
    where: "IncidentTypeCategory='WF'",
    outFields: "IncidentName,IncidentSize,PercentContained,FireDiscoveryDateTime,POOCounty,POOState,POOProtectingAgency,IncidentShortDescription,IrwinID",
    geometry: bboxParam(bbox), geometryType: "esriGeometryEnvelope", spatialRel: "esriSpatialRelIntersects",
    // `resultRecordCount` WITHOUT an order is a silent lie. The server returns an
    // arbitrary (OBJECTID-order) slice, and the UI says it is showing "the largest"
    // — so the biggest fire in view could be the one dropped. There are more active
    // wildfires nationally than CAP.incidents and the default view is the whole
    // lower 48, so truncation is the normal case, not an edge one. Sorting
    // server-side makes the cap mean what the copy claims.
    orderByFields: "IncidentSize DESC",
  }, CAP.incidents);
  const fires = r.features.map(f => {
    const p = f.properties || {}, c = (f.geometry && f.geometry.coordinates) || [];
    return {
      id: p.IrwinID || p.IncidentName + ":" + c.join(","),
      name: titleish(p.IncidentName),
      acres: numOrNull(p.IncidentSize),
      contained: numOrNull(p.PercentContained),
      discovered: p.FireDiscoveryDateTime || null,
      county: p.POOCounty || null,
      state: (p.POOState || "").replace(/^US-/, "") || null,
      agency: p.POOProtectingAgency || null,
      note: p.IncidentShortDescription || null,
      lat: c[1], lng: c[0],
    };
  }).filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng));
  // Biggest first: on a map of the Cascades in August, size is the whole story.
  fires.sort((a, b) => (b.acres || 0) - (a.acres || 0));
  return { fires, truncated: r.truncated };
}

// How far out a route's fire check looks. 80km ≈ 50mi: far enough that a fire which
// could close an approach road or fill a valley with smoke is caught, close enough
// that the answer is about *this* objective rather than the state.
export const NEAR_ROUTE_KM = 80;

// Fires near a single point, asked of the server rather than by filtering a bbox
// client-side — ArcGIS does the geodesic distance, and the response is a handful of
// rows instead of a region's worth.
//
// WHAT THE DISTANCE IS, precisely, because the panel has to say so: WFIGS incident
// geometry is the **point of origin**, not the nearest edge of the fire. A
// 138,000-acre fire is roughly 24km across, so its origin can sit 60km away while
// its perimeter is 10km from the trailhead. This returns origin distances and the UI
// labels them as such; the fire map is where you look at actual perimeters.
export async function fetchFiresNear(lat, lng, km = NEAR_ROUTE_KM) {
  const r = await arcgis(INCIDENTS, {
    where: "IncidentTypeCategory='WF'",
    outFields: "IncidentName,IncidentSize,PercentContained,FireDiscoveryDateTime,POOCounty,POOState,IrwinID",
    geometry: lng + "," + lat, geometryType: "esriGeometryPoint",
    distance: String(km), units: "esriSRUnit_Kilometer",
    spatialRel: "esriSpatialRelIntersects",
    orderByFields: "IncidentSize DESC",
  }, 50);
  const fires = r.features.map(f => {
    const p = f.properties || {}, c = (f.geometry && f.geometry.coordinates) || [];
    return {
      id: p.IrwinID || p.IncidentName + ":" + c.join(","),
      name: titleish(p.IncidentName),
      acres: numOrNull(p.IncidentSize),
      contained: numOrNull(p.PercentContained),
      discovered: p.FireDiscoveryDateTime || null,
      county: p.POOCounty || null,
      state: (p.POOState || "").replace(/^US-/, "") || null,
      lat: c[1], lng: c[0],
    };
  }).filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng))
    .map(f => ({ ...f, originMi: fireDistMi(lat, lng, f.lat, f.lng) }));
  // Nearest first here, not biggest: on a single objective, proximity is the question.
  fires.sort((a, b) => a.originMi - b.originMi);
  return { fires, truncated: r.truncated, radiusKm: km };
}

export function useFiresNear(coord, km = NEAR_ROUTE_KM) {
  return useQuery({
    queryKey: ["fire", "near", coord ? Math.round(coord.lat * 100) / 100 + "," + Math.round(coord.lng * 100) / 100 : null, km],
    queryFn: () => fetchFiresNear(coord.lat, coord.lng, km),
    // A route with no resolvable coordinate must not fire this query at all — and the
    // panel must not render an empty state either. "No fires near here" when we do not
    // know where "here" is would be the worst sentence on the screen.
    enabled: !!(coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lng)),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Deliberately NOT `placeholderData: prev => prev`, unlike the map's viewport
    // queries. There, keeping the last result stops a pan from blinking. Here the key
    // is the route's coordinate, so carrying the previous result forward would print
    // the LAST route's fires under THIS route's heading for a moment — a specific,
    // plausible-looking lie about a hazard. Blank while loading is correct.
  });
}

// Mapped perimeters. A perimeter exists only once a fire has been flown or walked,
// so a fire can have a point and no polygon — the two layers are complementary,
// not a hierarchy, and FireMap draws both.
export async function fetchFirePerimeters(bbox) {
  const r = await arcgis(PERIMETERS, {
    // Same 'WF' filter as the incident points. This layer carries
    // attr_IncidentTypeCategory too, and without it a prescribed burn's perimeter
    // draws in the same red as a wildfire with no incident point behind it —
    // contradicting the exclusion the points query makes two functions up. Dormant
    // out of burn season, which is exactly why it would have gone unnoticed.
    where: "attr_IncidentTypeCategory='WF'",
    outFields: "attr_IncidentName,attr_IncidentSize,attr_PercentContained,attr_FireDiscoveryDateTime,attr_IrwinID",
    geometry: bboxParam(bbox), geometryType: "esriGeometryEnvelope", spatialRel: "esriSpatialRelIntersects",
    maxAllowableOffset: String(OFFSET.perimeters),
    orderByFields: "attr_IncidentSize DESC", // see fetchActiveFires — a cap without an order picks arbitrarily
  }, CAP.perimeters);
  const perims = r.features.filter(f => f.geometry).map(f => {
    const p = f.properties || {};
    return {
      id: p.attr_IrwinID || p.attr_IncidentName,
      name: titleish(p.attr_IncidentName),
      acres: numOrNull(p.attr_IncidentSize),
      contained: numOrNull(p.attr_PercentContained),
      geometry: f.geometry,
    };
  });
  return { perims, truncated: r.truncated };
}

// Fire-weather products only. `phenom='FW'` is the NWS code for fire weather, and
// keying on the code rather than matching the display name means a rename or a new
// fire-weather product (or the Spanish-language duplicates NWS now issues) does not
// silently empty this layer.
export async function fetchFireWeather(bbox) {
  const r = await arcgis(FIRE_WX, {
    where: "phenom='FW'",
    outFields: "prod_type,sig,onset,ends,expiration,wfo,url",
    geometry: bboxParam(bbox), geometryType: "esriGeometryEnvelope", spatialRel: "esriSpatialRelIntersects",
    maxAllowableOffset: String(OFFSET.wx),
  }, CAP.wx);
  const zones = r.features.filter(f => f.geometry).map((f, i) => {
    const p = f.properties || {};
    return {
      id: (p.url || "") + ":" + i,
      // sig 'W' is a Warning (conditions are occurring or imminent), 'A' a Watch
      // (they may develop). A climber changes plans for one and notes the other.
      kind: p.sig === "W" ? "warning" : "watch",
      label: p.prod_type || (p.sig === "W" ? "Red Flag Warning" : "Fire Weather Watch"),
      // `onset` was fetched and then dropped, which meant a product starting tomorrow
      // rendered identically to one in effect now — a future warning presented as
      // current danger, on the screen where that matters most. A meaningful slice of
      // the national FW products at any moment have a future onset, so this was not
      // a corner case.
      starts: p.onset || null,
      ends: p.ends || p.expiration || null,
      office: p.wfo || null,
      url: p.url || null,
      geometry: f.geometry,
    };
  });
  return { zones, truncated: r.truncated };
}

// Is this product in effect right now, as opposed to issued for later? A null onset
// means the service did not say, and the honest reading of "no start time given" on
// an actively-published warning is that it applies now.
export function zoneInEffect(z, now = Date.now()) {
  const t = z && z.starts != null ? Date.parse(z.starts) : NaN;
  return !Number.isFinite(t) || t <= now;
}

function numOrNull(v) { return Number.isFinite(+v) && v !== null && v !== "" ? +v : null; }

// WFIGS incident names are entered by hand at a dispatch centre and arrive in a
// mix of cases in the same response — "Kaiser Canyon" next to "SINLAHEKIN" and
// "NUNAMAKER ROAD". Fold the shouted ones to title case and leave the rest alone,
// so a list of fires does not read as a list of alarms.
function titleish(s) {
  const t = (s || "").trim();
  if (!t) return "Unnamed fire";
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s\-/])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

// --- hooks -----------------------------------------------------------------
//
// staleTime reflects how fast each source actually moves. WFIGS incident acreage
// is revised off the daily ICS-209 report plus ad-hoc updates, so ten minutes is
// already fresher than the data; perimeters change when a mapping flight lands.
// Fire-weather products are issued and cancelled through the day, so they get the
// shortest window. Polling these federal services harder than the data changes
// would be rude and would buy the user nothing.
//
// networkMode is not set here: main.jsx sets "always" globally, which is what makes
// a genuinely offline device produce an *error* instead of React Query's paused
// no-data-no-error limbo. That limbo is what the UI would otherwise read as "no
// fires nearby" — see the comment in main.jsx.

// `keepPreviousData` is why a pan does not blink. A moved viewport is a NEW query
// key, so without it `data` is undefined for the duration of the request and the
// list renders its empty branch mid-drag — the same "no data yet" reading as "no
// fires", which is the one thing this screen must never do.
const common = { refetchOnWindowFocus: false, placeholderData: prev => prev };

// Round the viewport to ~1km before it becomes a query key. `moveend` fires for
// every nudge and a raw float bbox makes each one a distinct key, so staleTime can
// never hit and a few drags fan out into dozens of requests against NIFC and NOAA —
// exactly the hammering the header of this file says to avoid. Rounding collapses
// insignificant movement onto the same key, so it is served from cache.
function bboxKey(b) {
  if (!b) return null;
  const r = n => Math.round(n * 100) / 100;
  return [r(b.minLng), r(b.minLat), r(b.maxLng), r(b.maxLat)].join(",");
}

export function useActiveFires(bbox, enabled = true) {
  return useQuery({
    queryKey: ["fire", "incidents", bboxKey(bbox)],
    queryFn: () => fetchActiveFires(bbox),
    enabled: !!bbox && enabled,
    staleTime: 10 * 60 * 1000,
    ...common,
  });
}

export function useFirePerimeters(bbox, enabled = true) {
  return useQuery({
    queryKey: ["fire", "perimeters", bboxKey(bbox)],
    queryFn: () => fetchFirePerimeters(bbox),
    enabled: !!bbox && enabled,
    staleTime: 15 * 60 * 1000,
    ...common,
  });
}

export function useFireWeather(bbox, enabled = true) {
  return useQuery({
    queryKey: ["fire", "wx", bboxKey(bbox)],
    queryFn: () => fetchFireWeather(bbox),
    enabled: !!bbox && enabled,
    staleTime: 5 * 60 * 1000,
    ...common,
  });
}

// --- presentation helpers --------------------------------------------------

// Colour is driven by containment, not size, because that is what changes a plan.
// A 100,000-acre fire at 100% containment is a smoke source you can climb next to;
// a 200-acre fire at 0% has an undefined edge and is the one that closes a road
// overnight. `null` containment means the agency has not reported a figure — it is
// treated as uncontained, since the alternative is flattering a fire we know
// nothing about.
export function fireLevel(f) {
  const c = f && f.contained;
  if (c != null && c >= 100) return "contained";
  if (c != null && c >= 50) return "partial";
  return "active";
}

export function fireColor(f, C) {
  const l = fireLevel(f);
  return l === "contained" ? C.textMuted : l === "partial" ? C.orange : C.red;
}

export function fmtAcres(n) {
  if (n == null) return "size not reported";
  if (n < 10) return (Math.round(n * 10) / 10) + " acres";
  return Math.round(n).toLocaleString() + " acres";
}

export function fmtContained(n) { return n == null ? "containment not reported" : Math.round(n) + "% contained"; }

// Great-circle miles. Duplicated rather than imported from ClimbMatchCore so this
// stays a leaf module (see the header) — it is six lines and one constant.
export function fireDistMi(aLat, aLng, bLat, bLng) {
  const R = 3958.8, tr = x => (x * Math.PI) / 180;
  const dLat = tr(bLat - aLat), dLng = tr(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(tr(aLat)) * Math.cos(tr(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function fmtDiscovered(iso) {
  if (!iso) return null;
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days < 0) return null;
  if (days === 0) return "started today";
  if (days === 1) return "burning 1 day";
  return "burning " + days + " days";
}

// "until 11:00 PM" for a product ending today, "until Sun 6:00 AM" otherwise —
// a Red Flag Warning that expires tonight and one that runs into tomorrow are
// different pieces of news.
export function fmtEnds(iso, locale) { return clockPhrase(iso, locale, "until "); }

// "from Sun 11:00 AM" for a product that has not started yet. The distinction from
// fmtEnds is the whole point: "until 8PM" and "from 11AM tomorrow" are opposite
// instructions and must never be rendered by the same code path.
export function fmtStarts(iso, locale) { return clockPhrase(iso, locale, "from "); }

function clockPhrase(iso, locale, prefix) {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t), now = new Date();
  const time = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const sameDay = d.toDateString() === now.toDateString();
  return prefix + (sameDay ? time : d.toLocaleDateString(locale, { weekday: "short" }) + " " + time);
}
