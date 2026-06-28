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
export function useAreaRoutes(areaId) {
  return useQuery({
    queryKey: ["area-routes", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes").select("*").eq("area_id", areaId)
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
    objHaz: r.obj_haz, elevPts: r.elev_pts, gpxPts: r.gpx,
    alpineGrade: r.alpine_grade, rockGrade: r.rock_grade, iceGrade: r.ice_grade,highPointFt:r.high_point_ft,aidGrade:r.aid_grade,descentText:r.descent_text,pitchDetail:r.pitch_detail,lists:r.lists,
  };
}
