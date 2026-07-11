// React Query hooks over the Phase-0 schema (areas + routes).
// These are the fetch-on-demand equivalents of reading MOUNTAINS/ROUTES from the bundle.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

// Immediate children of an area (or the top level when parentId is null).
// GET /areas/:id  ->  select * from areas where parent_id = $1
export function useAreaChildren(parentId) {
  return useQuery({
    queryKey: ["area-children", parentId ?? "__root__"],
    enabled: !!supabase,
    queryFn: async () => {
      let q = supabase.from("areas").select("*");
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      const { data, error } = await q.order("route_count", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Routes in a leaf area, in cliff order ("by area").
// GET /areas/:id/routes  ->  select * from routes where area_id = $1 order by sort_order, name
// Embeds the parent area's key fields (elevation_ft, prominence_ft, lat/lng…) so the
// route detail page can show peak info without needing a match in the static
// MOUNTAINS seed array — see dbRouteToCamel's `_dbArea` field.
export function useAreaRoutes(areaId) {
  return useQuery({
    queryKey: ["area-routes", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes").select("*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))").eq("area_id", areaId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// A single area's row (name, type, route_count, blurb…).
export function useArea(id) {
  return useQuery({
    queryKey: ["area", id],
    enabled: !!supabase && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}

// The states (area_type "state"), i.e. the direct children of the "usa" root —
// the DB-catalog equivalent of the static AreaBrowse "Pick a state" list.
export function useStates() {
  return useQuery({
    queryKey: ["area-children", "usa"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("parent_id", "usa").order("route_count", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Breadcrumb ancestors (root-first, exclusive of "usa") for an area reached by
// something other than drilling — a near-me map pin or a route-finder hit.
// `path` is a materialized ltree whose labels ARE the ancestor ids, so this is
// a plain id lookup, no RPC needed. Plain async (not a hook) since it's used
// from a click handler, not rendered directly.
export async function fetchAreaBreadcrumb(area) {
  const ids = area && area.path ? area.path.split(".").filter(id => id !== "usa" && id !== area.id) : [];
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase.from("areas").select("*").in("id", ids);
  if (error) throw error;
  const byId = Object.fromEntries(data.map(a => [a.id, a]));
  return ids.map(id => byId[id]).filter(Boolean);
}

// Paged, filtered route search anywhere under an area's subtree (routes_in_subtree,
// migration 0015) — backs "Route finder" and "View all N routes".
export function useSubtreeRoutes(areaId, { q, disc, page = 0, pageSize = 40 } = {}) {
  return useQuery({
    queryKey: ["subtree-routes", areaId, q || "", disc || "", page, pageSize],
    enabled: !!supabase && !!areaId,
    retry: false, // re-fires on every keystroke — fail fast instead of a slow, flickering retry storm
    queryFn: async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree", { root_id: areaId, q: q || null, disc: disc || null, lim: pageSize, off: page * pageSize });
      if (error) throw error;
      return data;
    },
  });
}

export function useSubtreeRouteCount(areaId, { q, disc } = {}) {
  return useQuery({
    queryKey: ["subtree-route-count", areaId, q || "", disc || ""],
    enabled: !!supabase && !!areaId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree_count", { root_id: areaId, q: q || null, disc: disc || null });
      if (error) throw error;
      return data;
    },
  });
}

// Peaks/crags within a lat/lng box (plain BETWEEN — the areas table is ~47k rows,
// no PostGIS needed) — backs the "Near me" map. Distance/sort is done client-side.
export function useNearbyAreas(center, radiusDeg = 0.6) {
  return useQuery({
    queryKey: ["nearby-areas", center && center.lat.toFixed(2), center && center.lng.toFixed(2), radiusDeg],
    enabled: !!supabase && !!center,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*")
        .gte("lat", center.lat - radiusDeg).lte("lat", center.lat + radiusDeg)
        .gte("lng", center.lng - radiusDeg).lte("lng", center.lng + radiusDeg)
        .in("area_type", ["peak", "crag"])
        .limit(400);
      if (error) throw error;
      return data;
    },
  });
}

// Wishlisted routes that fall under an area's subtree — backs the DB-catalog
// "Objectives" screen (AreaView's onObjectives, static-catalog parity). Fetches
// the (small, bounded) wishlist rows by id, each with its area's path embedded,
// then filters client-side by ltree prefix — no RPC needed at this size.
export function useScopedWishlistRoutes(area, routeIds) {
  const ids = routeIds || [];
  return useQuery({
    queryKey: ["scoped-wishlist", area && area.id, ids.slice().sort().join(",")],
    enabled: !!supabase && !!area && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("routes").select("*, areas(path)").in("id", ids);
      if (error) throw error;
      return data.filter(r => r.areas && r.areas.path && (r.areas.path === area.path || r.areas.path.startsWith(area.path + ".")));
    },
  });
}

// ── full-catalog fetchers (hydrate the in-memory MOUNTAINS/ROUTES arrays) ──
// Supabase caps a single response at 1000 rows, so we page through with .range()
// (from..from+999) until a short page comes back. Otherwise the ~1,827 routes
// silently truncate to the first 1,000 and ~800 climbs vanish.
async function fetchAllPaged(table) {
  if (!supabase) return [];
  const PAGE = 1000;
  let out = [], from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    out = out.concat(data);
    if (data.length < PAGE) break; // short page = last page
    from += PAGE;
  }
  return out;
}

// Every area row (the whole hierarchy tree).
export function fetchAllAreas() { return fetchAllPaged("areas"); }
// Every route row (paged — there are ~1,827, well over the 1000-row cap).
export function fetchAllRoutes() { return fetchAllPaged("routes"); }

// ── contributions (Phase 1 persistence) ───────────────────────────────────
// Every community add/fix/report/rating/photo lands here as an append-only row.

// All contributions for a route, oldest first (consensus is computed client-side).
export function useRouteContributions(routeId) {
  return useQuery({
    queryKey: ["contributions", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions").select("*").eq("route_id", routeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Persist one contribution. Returns the saved row, or null if the DB is off.
// c = { route_id?, area_id?, kind, field?, value, contributor? }
export async function submitContribution(c) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("contributions").insert(c).select().single();
  if (error) throw error;
  return data;
}

// Top contributors rolled up through an area's subtree (live-catalog leaderboard).
// Returns [{ contributor, n }] via the area_top_contributors RPC (migration 0005).
export function useAreaTopContributors(areaId, lim = 3) {
  return useQuery({
    queryKey: ["area-contributors", areaId, lim],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_top_contributors", { aid: areaId, lim });
      if (error) throw error;
      return data;
    },
  });
}

// Coerce a DB value into the array shape the app's consumers assume.
// rack/gear/features/hazards/objHaz are read with .filter/.some/.map all over the
// app; if a row stored one as a string (or null), those calls would throw. Normalize
// here at the boundary: arrays pass through, strings split on commas, blanks -> [].
function toArr(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return String(v).split(/,\s*/).filter(Boolean);
}

// Waypoint `type`/`elev`/`note` field names and casing vary across research
// batches (different agents wrote `elevFt`/`elev_ft` vs `elev`, `notes` vs
// `note`, lowercase/aliased types like "trailhead"/"camp"/"pass"). RouteDetail's
// waypoint list, map, and "Directions to trailhead" button all key off the
// app's native seed-data shape (Title-case type, `elev`), so normalize here at
// the DB boundary rather than special-casing every consumer.
const WAYPOINT_TYPE_ALIASES = {
  trailhead: "Trailhead", start: "Trailhead",
  camp: "Campsite", campsite: "Campsite",
  water: "Water",
  junction: "Junction", pass: "Junction", notch: "Junction", col: "Junction", landmark: "Junction", ridge: "Junction",
  hazard: "Hazard",
  summit: "Summit",
  topout: "Topout",
};
function normalizeWaypointType(t) {
  if (!t) return t;
  return WAYPOINT_TYPE_ALIASES[t.toLowerCase()] || (t[0].toUpperCase() + t.slice(1));
}
function normalizeWaypoints(wps) {
  if (typeof wps === "string") {
    try { wps = JSON.parse(wps); } catch { return null; }
  }
  if (!Array.isArray(wps)) return null;
  return wps.map(w => ({
    ...w,
    type: normalizeWaypointType(w.type),
    elev: w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft),
    note: w.note != null ? w.note : w.notes,
  }));
}

// Map a DB route row (snake_case) to the app's camelCase shape so RouteDetail —
// which reads route.gainFt/objHaz/elevPts/etc. — renders DB routes fully, not blank.
export function dbRouteToCamel(r) {
  if (!r) return r;
  return {
    ...r,
    mountainId: r.area_id,
    gradeSystem: r.grade_system,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainFt: r.gain_ft, lossFt: r.loss_ft, gainM: r.gain_ft!=null?Math.round(r.gain_ft/3.28084):null, lossM: r.loss_ft!=null?Math.round(r.loss_ft/3.28084):null, distKm: r.dist_km, maxAngle: r.max_angle,
    objHaz: toArr(r.obj_haz), elevPts: r.elev_pts, gpxPts: r.gpx, waypoints: normalizeWaypoints(r.waypoints),
    rack: toArr(r.rack), gear: toArr(r.gear), features: toArr(r.features), hazards: toArr(r.hazards),
    alpineGrade: r.alpine_grade, rockGrade: r.rock_grade, iceGrade: r.ice_grade,highPointFt:r.high_point_ft,aidGrade:r.aid_grade,descentText:r.descent_text,pitchDetail:r.pitch_detail,lists:r.lists,permits:r.permit,
    timing:r.timing, detailedRack:r.detailed_rack, whatToBring:toArr(r.what_to_bring), proTips:toArr(r.pro_tips), watchOut:toArr(r.watch_out), proNeeds:r.pro_needs, bestSeason:r.best_season, beta:Array.isArray(r.beta)?r.beta:(r.beta?[r.beta]:[]),
    // Enrichment panel fields (migration 0014) — no static-array equivalent, so no gap-fill needed.
    crowds: r.crowds, partnerRequirements: r.partner_requirements, seasonalGuidance: r.seasonal_guidance, seasonalHazards: r.seasonal_hazards, dataQuality: r.data_quality,
    // The embedded parent area (see useAreaRoutes) — shaped like a MOUNTAINS entry so
    // RouteDetail's `MOUNTAINS.find(...)||route._dbArea||{}` fallback works without the
    // area needing a match in the static seed array.
    _dbArea: r.areas ? { id: r.area_id, name: r.areas.name, areaType: r.areas.area_type, region: r.areas.region, parentName: r.areas.parent && r.areas.parent.name, lat: r.areas.lat, lng: r.areas.lng, elevation: r.areas.elevation_ft, prominence: r.areas.prominence_ft, avyZone: r.areas.avy_zone, blurb: r.areas.blurb } : null,
  };
}
