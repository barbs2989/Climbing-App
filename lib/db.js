// React Query hooks over the Phase-0 schema (areas + routes).
// These are the fetch-on-demand equivalents of reading MOUNTAINS/ROUTES from the bundle.
import { useEffect, useRef } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { offlineAreaChildren, offlineArea, offlineAreaRoutes, offlineStates } from "./offline";

// Network-first with an IndexedDB fallback for downloaded states (lib/offline.js).
// Only substitutes offline data when the network genuinely failed AND the local
// store has something for this query — an empty offline result rethrows the
// original error so undownloaded areas still show the normal error state.
async function orOffline(networkFn, offlineFn) {
  try { return await networkFn(); }
  catch (err) {
    try {
      const local = await offlineFn();
      if (local && (Array.isArray(local) ? local.length : true)) return local;
    } catch (e) { /* fall through to the network error */ }
    throw err;
  }
}

// Immediate children of an area (or the top level when parentId is null).
// GET /areas/:id  ->  select * from areas where parent_id = $1
// `opts.enabled` lets a caller gate the fetch (e.g. the "All areas" tree only
// wants a node's children once it's actually expanded — the DB catalog is
// 47k+ areas, so eagerly fetching every row's children up front doesn't scale).
export function useAreaChildren(parentId, opts) {
  const enabled = !opts || opts.enabled !== false;
  return useQuery({
    queryKey: ["area-children", parentId ?? "__root__"],
    enabled: !!supabase && enabled,
    queryFn: () => orOffline(async () => {
      let q = supabase.from("areas").select("*");
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      const { data, error } = await q.order("route_count", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    }, () => offlineAreaChildren(parentId)),
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
    queryFn: () => orOffline(async () => {
      const { data, error } = await supabase
        .from("routes").select("*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))").eq("area_id", areaId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return data;
    }, () => offlineAreaRoutes(areaId)),
  });
}

// A single area's row (name, type, route_count, blurb…).
export function useArea(id) {
  return useQuery({
    queryKey: ["area", id],
    enabled: !!supabase && !!id,
    queryFn: () => orOffline(async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    }, () => offlineArea(id)),
  });
}

// Resolves area names for a set of area ids — backs showing "which crag" a
// route in a multi-area Route Finder result list belongs to. A plain lookup
// (not an RPC) since routes_in_subtree returns setof routes and can't add an
// extra joined column without a return-type change.
export function useAreaNamesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["area-names", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("id,name").in("id", ids);
      if (error) throw error;
      const map = {};
      (data || []).forEach(a => { map[a.id] = a.name; });
      return map;
    },
  });
}

// Full-catalog route search by name (no area scope needed) — backs "search for a
// climb" flows outside the area browser (CrewFinder, PartnerSearch), which today
// only fuzzy-match the static ROUTES seed array and can't find a DB-only route.
// Matches the route name OR the name of the area the route is on. Needs no root/scope id,
// unlike useAreaSearch/useSubtreeRoutes.
//
// It was route-name-only until 2026-08-09, and that hid whole peaks. Only ~9% of WA route
// ids are peak-scoped and route names are just the line, so **a peak's name lives only on
// `areas.name`** — Mount Goode's four routes are called Northeast Buttress, Megalodon
// Ridge, Southwest Couloir and Northeast Face. Typing "Goode" matched none of them and the
// peak read as deleted. Every peak named differently from its routes was invisible the
// same way, in all five search boxes this feeds — including Log a climb and the duplicate
// check when adding a route, so "is this already here?" could not see a peak either.
//
// Two queries rather than one `or=(name.ilike…,areas.name.ilike…)`: a single ilike on
// either table is fast, but PostgREST ORs across an embedded table go to a seq scan on
// 205k routes and hit the 3s statement_timeout on the anon role.
//
// The two result sets are RANKED, not concatenated. Taking route-name matches first put
// "Johnny B. Goode", "Dirty No-Gooders" and "More Gooder At Learning" above Mount Goode
// and filled the 8 slots before the peak appeared — a mid-word substring hit on an
// unrelated route must not outrank an exact match on the area the user is clearly naming.
function routeSearchScore(row, needle) {
  const rn = String((row && row.name) || "").toLowerCase();
  const an = String((row && row.areas && row.areas.name) || "").toLowerCase();
  // Climbers type the peak, not the honorific: "Goode" should reach both "Mount Goode"
  // and "Mt. Goode" ahead of a mid-word hit on "Johnny B. Goode".
  const ap = an.replace(/^(mount|mt\.?|the)\s+/, "");
  if (rn === needle) return 100;
  if (an === needle || ap === needle) return 90;
  if (rn.startsWith(needle)) return 80;
  if (an.startsWith(needle) || ap.startsWith(needle)) return 70;
  // A word-boundary hit ("North Ridge" in "Direct North Ridge") beats a mid-word one
  // ("Goode" in "No-Gooders").
  if (new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(rn)) return 50;
  if (new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(an)) return 45;
  if (rn.includes(needle)) return 30;
  return 20;
}
export function useRouteSearch(q, lim = 8) {
  const qq = (q || "").trim();
  return useQuery({
    queryKey: ["route-search", qq, lim],
    enabled: !!supabase && !!qq,
    queryFn: async () => {
      const SEL = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))";
      const needle = qq.toLowerCase();
      // Both legs run together — the area leg is not a fallback, it is half the answer.
      const [byName, areaHit] = await Promise.all([
        supabase.from("routes").select(SEL).ilike("name", `%${qq}%`).limit(lim * 2),
        supabase.from("areas").select("id,name").ilike("name", `%${qq}%`).order("route_count", { ascending: false }).limit(5),
      ]);
      if (byName.error) throw byName.error;
      if (areaHit.error) throw areaHit.error;
      const ids = (areaHit.data || []).map((a) => a.id);
      let byArea = { data: [] };
      if (ids.length) {
        byArea = await supabase.from("routes").select(SEL).in("area_id", ids).limit(lim * 2);
        if (byArea.error) throw byArea.error;
      }
      const seen = new Set(), merged = [];
      for (const r of [...(byName.data || []), ...(byArea.data || [])]) {
        if (seen.has(r.id)) continue;
        seen.add(r.id); merged.push(r);
      }
      merged.sort((a, b) => routeSearchScore(b, needle) - routeSearchScore(a, needle));
      return merged.slice(0, lim).map(dbRouteToCamel);
    },
  });
}

// Full ancestor chain for one area, root-first (e.g. ["USA","Washington","North
// Cascades",...,"Mount Baker"]) — the DB-catalog equivalent of walking MOUNTAINS'
// parentId chain (see areaPathNames in ClimbMatch.jsx). The areas table has no
// depth cap, so this walks parent_id one row at a time rather than joining a
// fixed number of levels; capped at 12 hops as a runaway-hierarchy backstop.
async function fetchAreaPath(id) {
  if (!supabase || !id) return [];
  const path = [];
  let currentId = id, guard = 0;
  while (currentId && guard++ < 12) {
    const { data, error } = await supabase.from("areas").select("id,name,parent_id").eq("id", currentId).maybeSingle();
    if (error) throw error;
    if (!data) break;
    path.unshift({ id: data.id, name: data.name });
    currentId = data.parent_id;
  }
  return path;
}

// Single-area version of useAreaPaths, for a lone breadcrumb (e.g. the route
// detail page's own area header).
export function useAreaPath(id) {
  return useQuery({
    queryKey: ["area-path", id],
    enabled: !!supabase && !!id,
    staleTime: Infinity,
    queryFn: () => fetchAreaPath(id),
  });
}

// Ancestor chains for a set of areas at once (e.g. one per row in a contribution
// feed) — a dynamic list of queries via useQueries rather than useAreaPath in a
// loop, since the number of ids varies by render and hooks can't be called
// conditionally. Returns { [id]: [{id,name}, ...] } for whichever ids have
// resolved so far; still-loading/unknown ids are simply absent from the map.
export function useAreaPaths(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  const results = useQueries({
    queries: uniqueIds.map(id => ({
      queryKey: ["area-path", id],
      enabled: !!supabase,
      staleTime: Infinity,
      queryFn: () => fetchAreaPath(id),
    })),
  });
  const map = {};
  uniqueIds.forEach((id, i) => { if (results[i] && results[i].data) map[id] = results[i].data; });
  return map;
}

// The states (area_type "state"), i.e. the direct children of the "usa" root —
// the DB-catalog equivalent of the static AreaBrowse "Pick a state" list.
export function useStates() {
  return useQuery({
    queryKey: ["area-children", "usa"],
    enabled: !!supabase,
    queryFn: () => orOffline(async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("parent_id", "usa").order("name");
      if (error) throw error;
      return data;
    }, offlineStates),
  });
}

// Breadcrumb ancestors (root-first, exclusive of "usa") for an area reached by
// something other than drilling — a near-me map pin or a route-finder hit.
// `path` is a materialized ltree whose labels ARE the ancestor ids, so this is
// a plain id lookup, no RPC needed. Plain async (not a hook) since it's used
// from a click handler, not rendered directly.
// Hydrate a partial area (a search hit from areas_in_subtree, a saved-area id) into
// its full row. The search RPC deliberately returns a narrow projection with no
// `path`, and callers that navigate need path/area_type plus the display columns.
export async function fetchArea(id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from("areas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function fetchAreaBreadcrumb(area) {
  const ids = area && area.path ? area.path.split(".").filter(id => id !== "usa" && id !== area.id) : [];
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase.from("areas").select("*").in("id", ids);
  if (error) throw error;
  const byId = Object.fromEntries(data.map(a => [a.id, a]));
  return ids.map(id => byId[id]).filter(Boolean);
}

// Fetches just the parent-area fields for one route and returns them in _dbArea
// shape. The routes_in_subtree / areas_in_subtree RPCs (and the ?debugRoute
// lookup) return bare route rows with no embedded `areas`, so a route opened
// from search / Route finder / "View all N routes" / Objectives / Suggested
// climbs arrives with _dbArea null. enrichRoute then falls back to the `fa`-only
// branch and the route page silently loses prominence, range and the peak blurb
// — it still renders a PEAK panel, so the loss is invisible. Rather than change
// five RPCs (a migration), the route-open path hydrates the missing area here.
export async function fetchRouteArea(routeId) {
  if (!supabase || !routeId) return null;
  const { data, error } = await supabase
    .from("routes").select("area_id, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))")
    .eq("id", routeId).maybeSingle();
  if (error || !data || !data.areas) return null;
  const a = data.areas;
  return { id: data.area_id, name: a.name, areaType: a.area_type, region: a.region, parentName: a.parent && a.parent.name, lat: a.lat, lng: a.lng, elevation: a.elevation_ft, prominence: a.prominence_ft, avyZone: a.avy_zone, blurb: a.blurb };
}

// Paged, filtered route search anywhere under an area's subtree (routes_in_subtree,
// migration 0015; grade/stars/pitches/length/sort added in 0018) — backs
// "Route finder" and "View all N routes".
export function useSubtreeRoutes(areaId, { q, disc, minGrade, maxGrade, minStars, minPitches, minLengthM, maxLengthM, sortBy, page = 0, pageSize = 40 } = {}) {
  return useQuery({
    queryKey: ["subtree-routes", areaId, q || "", disc || "", minGrade ?? "", maxGrade ?? "", minStars ?? "", minPitches ?? "", minLengthM ?? "", maxLengthM ?? "", sortBy || "", page, pageSize],
    enabled: !!supabase && !!areaId,
    retry: false, // re-fires on every keystroke — fail fast instead of a slow, flickering retry storm
    queryFn: async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree", { root_id: areaId, q: q || null, disc: disc || null, min_grade: minGrade ?? null, max_grade: maxGrade ?? null, min_stars: minStars ?? null, min_pitches: minPitches ?? null, min_length_m: minLengthM ?? null, max_length_m: maxLengthM ?? null, sort_by: sortBy || "name", lim: pageSize, off: page * pageSize });
      if (error) throw error;
      return data;
    },
  });
}

export function useSubtreeRouteCount(areaId, { q, disc, minGrade, maxGrade, minStars, minPitches, minLengthM, maxLengthM } = {}) {
  return useQuery({
    queryKey: ["subtree-route-count", areaId, q || "", disc || "", minGrade ?? "", maxGrade ?? "", minStars ?? "", minPitches ?? "", minLengthM ?? "", maxLengthM ?? ""],
    enabled: !!supabase && !!areaId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree_count", { root_id: areaId, q: q || null, disc: disc || null, min_grade: minGrade ?? null, max_grade: maxGrade ?? null, min_stars: minStars ?? null, min_pitches: minPitches ?? null, min_length_m: minLengthM ?? null, max_length_m: maxLengthM ?? null });
      if (error) throw error;
      return data;
    },
  });
}

// Areas (any depth) matching a name under a subtree — backs the "All areas" tree
// modal's filter box (areas_in_subtree, migration 0015), the DB-catalog
// equivalent of the static AreaTree's flat client-side name search.
export function useAreaSearch(rootId, q) {
  return useQuery({
    queryKey: ["area-search", rootId, q || ""],
    enabled: !!supabase && !!rootId && !!(q || "").trim(),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("areas_in_subtree", { root_id: rootId, q, lim: 40 });
      if (error) throw error;
      return data;
    },
  });
}

// Peaks/crags within the CURRENT map viewport (plain BETWEEN — the areas table
// is ~47k rows, no PostGIS needed) — backs the "Near me" map. Takes a live
// bounds box (not a fixed center+radius) so panning/zooming the map re-fetches,
// same as the static OverviewMap's moveend/zoomend-driven re-render — a fixed
// one-shot box around the initial center would silently stop showing areas as
// soon as you moved off it. Ordered by route_count desc so a capped, zoomed-out
// view still surfaces the areas most worth seeing; `total` lets the UI say so.
export function useNearbyAreas(bounds) {
  return useQuery({
    queryKey: ["nearby-areas", bounds && [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].map(n => n.toFixed(2)).join(",")],
    enabled: !!supabase && !!bounds,
    queryFn: async () => {
      const { data, error, count } = await supabase.from("areas").select("*", { count: "exact" })
        .gte("lat", bounds.minLat).lte("lat", bounds.maxLat)
        .gte("lng", bounds.minLng).lte("lng", bounds.maxLng)
        .in("area_type", ["peak", "crag"])
        .order("route_count", { ascending: false })
        .limit(500);
      if (error) throw error;
      return { rows: data, total: count };
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

// Unscoped route lookup by id — backs Home/Logbook wishlist views, which (unlike
// ObjectivesPanel) aren't rendered within a single area and so can't filter by path.
export function useRoutesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["routes-by-ids", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes").select("*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))")
        .in("id", ids);
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
// `contributor` is stamped here rather than at the call sites: consensus ("3 climbers
// agree", computed client-side from these rows per 0002_contributions.sql) counts
// DISTINCT contributors, so a row that falls back to the column default 'anon' makes
// every submission look like the same person. Defaulting centrally means a new call
// site cannot forget it and silently break the threshold.
export async function submitContribution(c) {
  if (!supabase) return null;
  let row = c;
  if (row.contributor == null) {
    const { data: u } = await supabase.auth.getUser();
    row = { ...c, contributor: (u && u.user && u.user.id) || "anon" };
  }
  const { data, error } = await supabase
    .from("contributions").insert(row).select().single();
  if (error) throw error;
  return data;
}

// File a safety report against another climber (migration 0075).
// r = { reported_id, reported_name?, reason, detail? }
//
// Returns the saved row, or null when the DB is off — and the caller MUST treat
// null/throw as "not filed" rather than showing a success message. The whole
// finding this replaces was a success toast over a discarded report.
//
// `reporter` is stamped from the session like submitContribution's contributor.
// It can legitimately be null: RLS allows a signed-out insert on purpose, because
// someone being harassed must not be blocked from reporting by being logged out.
// `reporter_label` keeps whatever the app knows in that case, so a null reporter
// is still traceable to something.
export async function submitReport(r) {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const uid = u && u.user && u.user.id;
  const row = {
    reported_id: String(r.reported_id),
    reported_name: r.reported_name || null,
    reason: r.reason,
    detail: r.detail || null,
    reporter: uid || null,
    reporter_label: uid ? null : (r.reporter_label || "signed-out"),
  };
  // No .select() on purpose. PostgREST turns it into INSERT ... RETURNING, and
  // Postgres applies SELECT policies to a returned row — so a signed-out reporter,
  // whose row has reporter = null, fails `reporter = auth.uid()` and the whole
  // statement comes back 42501 "violates row-level security policy" even though the
  // INSERT itself was allowed. Verified live: identical insert returns 201 without
  // the RETURNING and 401 with it.
  //
  // Reading the row back was never needed — the caller only distinguishes filed from
  // failed — and a signed-out reporter is not permitted to read it anyway, which is
  // the intended privacy behaviour rather than something to work around.
  const { error } = await supabase.from("user_reports").insert(row);
  if (error) throw error;
  return true;
}

// Top contributors rolled up through an area's subtree (live-catalog leaderboard).
// Returns [{ contributor, n }] via the area_top_contributors RPC (migration 0005).
// `contributor` is the contributor's auth uid — pair with useProfilesByIds to display names.
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

// ── objectives ("wishlist") — crews/objectives backend Phase A, see docs/BACKEND.md §2 ──
// route_id is a loose reference (no FK), same reasoning as dbRouteToCamel's route-id
// space spanning both DB routes and local ROUTES seed ids — see 0031_objectives.sql.

// The signed-in user's own saved climbs — used to hydrate wishlist/userLists on load
// so it survives a refresh instead of resetting to the seed demo list every session.
export function useMyObjectives(userId) {
  return useQuery({
    queryKey: ["my-objectives", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("objectives").select("route_id").eq("user_id", userId);
      if (error) throw error;
      return (data || []).map(r => r.route_id);
    },
  });
}

// How many climbers have each of these routes as an objective — one grouped query
// backing "N want this" counts in PartnerSearch, rather than N per-route queries.
export function useObjectiveCounts(routeIds) {
  const key = (routeIds || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["objective-counts", key],
    enabled: !!supabase && !!(routeIds || []).length,
    queryFn: async () => {
      const { data, error } = await supabase.from("objectives").select("route_id").in("route_id", routeIds);
      if (error) throw error;
      const counts = {};
      (data || []).forEach(r => { counts[r.route_id] = (counts[r.route_id] || 0) + 1; });
      return counts;
    },
  });
}

// Plain async writes (not hooks) — called from toggleWish, an event handler, not render.
export async function saveObjective(userId, routeId) {
  if (!supabase) return;
  const { error } = await supabase.from("objectives").insert({ user_id: userId, route_id: routeId });
  if (error && error.code !== "23505") throw error; // 23505 = already saved, not a real failure
}
export async function removeObjective(userId, routeId) {
  if (!supabase) return;
  const { error } = await supabase.from("objectives").delete().eq("user_id", userId).eq("route_id", routeId);
  if (error) throw error;
}

// ── crews — crews/objectives backend Phase B, see 0032_crews.sql for the schema ──
// and its RLS comments for why float_plan/meet_place never appear in crew_listings.
// NOT YET WIRED into ClimbMatch.jsx's crew mutation flows (formCrew, updateCrew,
// crewAccept, meAgreeDates, crewSetDate, etc. - about 15 call sites) - that's a
// separate, larger pass given the RLS here is unverified against a live database.
// These hooks/writes are ready to use once that wiring happens.

// Public "browse open crews" listing (CrewFinder) — float-plan-free by construction,
// see the crew_listings view. Client-side merges this with local `crews` state the
// same way routeById() merges seed+DB routes.
export function useCrewListings() {
  return useQuery({
    queryKey: ["crew-listings"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase.from("crew_listings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// The signed-in user's own crews (organizer or confirmed member), full detail
// including float_plan — RLS on the base table already restricts this to rows
// the caller is allowed to see, so no extra filtering needed here.
export function useMyCrews(userId) {
  return useQuery({
    queryKey: ["my-crews", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews").select("*, crew_members(*), crew_day_acks(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Plain async writes (not hooks) — called from event handlers, not render.
export async function createCrew({ routeId, createdBy, dates, meetTime, meetPlace, floatPlan, cap }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("crews").insert({ route_id: routeId, created_by: createdBy, dates: dates || [], meet_time: meetTime, meet_place: meetPlace, float_plan: floatPlan, cap: cap || 4 })
    .select().single();
  if (error) throw error;
  return data;
}
export async function updateCrewRow(crewId, patch) {
  if (!supabase) return;
  // .select() makes an RLS rejection visible — same trap updateCrewMemberStatus
  // documents below: the 0036 crews UPDATE policy is organizer-only, so a member's
  // edit matches zero rows and PostgREST returns 200 with no error.
  const { data, error } = await supabase.from("crews").update(patch).eq("id", crewId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — only the crew organiser can change this.");
  return data;
}
export async function addCrewMember(crewId, userId, status = "invited", note) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_members").insert({ crew_id: crewId, user_id: userId, status, note });
  if (error && error.code !== "23505") throw error;
}
// Invite-by-email: hold a crew spot for someone with no account yet (migration
// 0070). A signup with the matching email converts it into a crew_members row.
export async function inviteToCrewByEmail(crewId, email, invitedBy, note) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crew_email_invites").insert({
    crew_id: crewId, email: String(email).trim().toLowerCase(), invited_by: invitedBy, note: note || null,
  }).select().single();
  if (error) throw error;
  return data;
}
export function useCrewEmailInvites(crewId) {
  return useQuery({
    queryKey: ["crew-email-invites", crewId],
    enabled: !!supabase && !!crewId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crew_email_invites")
        .select("*").eq("crew_id", crewId).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}
export async function deleteCrewEmailInvite(id) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_email_invites").delete().eq("id", id);
  if (error) throw error;
}
// W17: 0070's claim trigger only fires at signup, so an invite-by-email addressed to an
// ALREADY-registered account was never converted into a crew_members row. Migration 0076 adds
// an RPC the signed-in user runs for themselves; the app calls it once per sign-in. Returns
// the number of invites claimed. Resolves to 0 (rather than throwing) when the RPC is not
// deployed yet, so a client running ahead of the migration simply does nothing.
export async function claimMyCrewEmailInvites() {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("claim_my_crew_email_invites");
  if (error) {
    if (error.code === "PGRST202" || /function .* does not exist/i.test(error.message || "")) return 0;
    throw error;
  }
  return data || 0;
}
export async function updateCrewMemberStatus(crewId, userId, status) {
  if (!supabase) return;
  // .select() is what makes an RLS rejection visible. PostgREST returns 200 and NO
  // error for an UPDATE whose policy matched zero rows, so checking `error` alone
  // reports success for a write that changed nothing — the same trap patchRow()
  // exists to close for scripts (CLAUDE.md). The 0036 policy is "self or organizer",
  // so a non-organizer confirming someone else lands here.
  const { data, error } = await supabase.from("crew_members").update({ status })
    .eq("crew_id", crewId).eq("user_id", userId).select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — only the member themselves or the crew organiser can change a membership status.");
  return data;
}
export async function removeCrewMember(crewId, userId) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_members").delete().eq("crew_id", crewId).eq("user_id", userId);
  if (error) throw error;
}
export async function ackCrewDay(crewId, userId, date) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_day_acks").insert({ crew_id: crewId, user_id: userId, date });
  if (error && error.code !== "23505") throw error;
}
export async function unackCrewDay(crewId, userId, date) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_day_acks").delete().eq("crew_id", crewId).eq("user_id", userId).eq("date", date);
  if (error) throw error;
}
export async function deleteCrewRow(crewId) {
  if (!supabase) return;
  const { error } = await supabase.from("crews").delete().eq("id", crewId);
  if (error) throw error;
}

// Real-user search for inviting an actual signed-in climber to a crew (as opposed
// to the app's demo CLIMBERS/FILLER_CLIMBERS roster). No new RLS needed - profiles
// already has public read from the auth/profiles migration (0009).
// Every column the partner card reads. Kept in one place because the card scores a
// candidate with compat(), and a column missing from the SELECT does not read as missing
// data — it reads as an unknown, which silently downgrades a complete profile.
const PARTNER_COLS = "id,name,username,avatar,bio,location,disciplines,sport_grade,trad_grade,boulder_grade";

// Real climbers who have opted to be listed. profiles.discoverable (0104) is a LISTING
// preference, not an access control: the row is public-read by policy either way and stays
// findable by name through useProfileSearch. What it governs is whether we put someone in a
// browse list they never asked to be in — which is the thing that cannot be walked back.
//
// So this filters client-side-visible listing only, and deliberately does NOT pretend to be
// privacy enforcement. .eq("discoverable", true) is a query, not a policy.
export function useDiscoverableProfiles(meId, max) {
  return useQuery({
    queryKey: ["discoverable-profiles", meId || "anon", max || 24],
    // Requires a signed-in id, not just a configured client. The caller gates the UI on the
    // same condition; making the hook itself refuse is what stops a future caller from
    // re-publishing the list by forgetting the gate.
    enabled: !!supabase && !!meId,
    queryFn: async () => {
      let q = supabase.from("profiles").select(PARTNER_COLS).eq("discoverable", true).limit(max || 24);
      if (meId) q = q.neq("id", meId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// Write the listing preference. Returns the stored row so the caller can reflect what the
// server actually holds rather than what it hoped it set — a PATCH that RLS rejects comes
// back 200 with an empty array, which is exactly how a toggle reports success and changes
// nothing.
export async function setDiscoverable(userId, value) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase
    .from("profiles").update({ discoverable: !!value }).eq("id", userId).select("id,discoverable");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("the update matched no profile row");
  return data[0];
}

export function useProfileSearch(q) {
  const qq = (q || "").trim();
  return useQuery({
    queryKey: ["profile-search", qq],
    enabled: !!supabase && !!qq,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(PARTNER_COLS).ilike("name", `%${qq}%`).limit(8);
      if (error) throw error;
      return data;
    },
  });
}

// Pending crew invites addressed to a real signed-in user - the accept/decline
// side of useProfileSearch-based invites. Joins the crew row so the invite card
// can show which route/dates without a second round trip.
export function useMyCrewInvites(userId) {
  return useQuery({
    queryKey: ["my-crew-invites", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_members").select("*, crews(*)")
        .eq("user_id", userId).eq("status", "invited");
      if (error) throw error;
      return data;
    },
  });
}

// One user's own contribution ledger, newest first — powers "Your contributions".
export function useMyContributions(userId, lim = 50) {
  return useQuery({
    queryKey: ["my-contributions", userId, lim],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions").select("*, routes(name, area_id)")
        .eq("contributor", userId)
        .order("created_at", { ascending: false })
        .limit(lim);
      if (error) throw error;
      return data;
    },
  });
}

// Name/avatar for a batch of contributor ids (auth uids) — pair with
// useAreaTopContributors, whose RPC only returns raw ids.
// One real user's full profile row — the profile modal needs more than the
// id/name/avatar that member chips and search rows carry.
export function useFullProfile(userId) {
  return useQuery({
    queryKey: ["full-profile", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProfilesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["profiles-by-ids", key],
    enabled: !!supabase && !!key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, name, avatar").in("id", ids);
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
  junction: "Junction", pass: "Junction", notch: "Junction", col: "Junction", landmark: "Junction", ridge: "Junction", viewpoint: "Junction",
  hazard: "Hazard", glacier: "Hazard", crevasse: "Hazard",
  summit: "Summit",
  topout: "Topout",
  bailout: "Bailout", bail: "Bailout",
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
  // Coerce numerics: contributed rows have stored lat/lng/elev as strings, which
  // crashes downstream renderers that call .toFixed() (wa_martin_peak_west_ridge).
  const num = v => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  return wps.map(w => ({
    ...w,
    type: normalizeWaypointType(w.type),
    lat: num(w.lat),
    lng: num(w.lng),
    elev: num(w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft)),
    note: w.note != null ? w.note : w.notes,
  }));
}

// ── guides (Phase 1 persistence — directory/lead-gen, no payment) ────────
// Every guide-hire write here binds to auth.uid() server-side (never a client-
// supplied id), same convention submitContribution/0009 established.

// Display labels for the two guide-domain vocabularies — shared across
// DbGuideApply/DbGuides/DbGuideDashboard so the taxonomy is spelled out once.
export const CERT_TRACK_LABELS = {
  SPI: "Single Pitch Instructor (SPI)",
  MPI: "Multi-Pitch Instructor (MPI)",
  RockGuide: "AMGA Rock Guide",
  AlpineGuide: "AMGA Alpine Guide",
  SkiGuide: "AMGA Ski Guide",
  IFMGA: "IFMGA / Mountain Guide",
};
export const DISCIPLINE_LABELS = {
  single_pitch: "Single-pitch",
  multi_pitch_instructing: "Multi-pitch (instructing)",
  multi_pitch_guiding: "Multi-pitch guiding",
  alpine: "Alpine",
  glacier: "Glacier",
  mountaineering: "Mountaineering",
  ski_touring: "Ski touring",
  ski_mountaineering: "Ski mountaineering",
};

// Static SPI/MPI/RockGuide/AlpineGuide/SkiGuide/IFMGA -> discipline lookup —
// backs the cert-track picker in GuideApply and the discipline legend in Guides.
export function useCertTrackDisciplines() {
  return useQuery({
    queryKey: ["cert-track-disciplines"],
    enabled: !!supabase,
    staleTime: Infinity, // static reference table, never changes at runtime
    queryFn: async () => {
      const { data, error } = await supabase.from("cert_track_disciplines").select("*");
      if (error) throw error;
      return data;
    },
  });
}

// Active (status='active') guide listings for the browse screen. Embeds
// guide_credentials so the list view can compute isGuideVerified() per card
// without an N+1 query per guide.
export function useGuides() {
  return useQuery({
    queryKey: ["guides"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_profiles").select("*, profiles(name, avatar), reviews(rating), guide_credentials(kind, status, verified_expires_at)")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });
}

// One guide's own profile row, regardless of status (draft/submitted/rejected too) —
// backs GuideApply (resume an in-progress application) and GuideDashboard.
export function useGuideProfile(guideId) {
  return useQuery({
    queryKey: ["guide-profile", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_profiles").select("*, profiles(name, avatar)").eq("id", guideId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGuideCredentials(guideId) {
  return useQuery({
    queryKey: ["guide-credentials", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_credentials").select("*").eq("guide_id", guideId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

// Inquiries a guide has received, newest first — backs GuideDashboard's inbox.
export function useGuideInquiries(guideId) {
  return useQuery({
    queryKey: ["guide-inquiries", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries").select("*, profiles(name, avatar)").eq("guide_id", guideId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// A climber's own inquiries with one guide — gates the review form (requirement:
// only a climber with a real inquiry can review) and lets the UI show "pending review".
export function useMyInquiriesWithGuide(climberId, guideId) {
  return useQuery({
    queryKey: ["my-inquiries", climberId, guideId],
    enabled: !!supabase && !!climberId && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries").select("*, reviews(id)").eq("climber_id", climberId).eq("guide_id", guideId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useGuideReviews(guideId) {
  return useQuery({
    queryKey: ["guide-reviews", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews").select("*, profiles(name, avatar)").eq("guide_id", guideId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Upsert (create-or-continue) a guide's own application/listing row.
export async function submitGuideApplication(fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_profiles").upsert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function updateGuideProfile(guideId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_profiles").update(fields).eq("id", guideId).select().single();
  if (error) throw error;
  return data;
}

export async function addGuideCredential(c) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_credentials").insert(c).select().single();
  if (error) throw error;
  return data;
}

// Resubmit a rejected/lapsed credential for re-review — same row, back to 'pending'.
// The verification stamps are cleared alongside the status: a 'lapsed' row still carries
// the previous verified_at/verified_expires_at, and a pending row that looks verified is
// exactly the state 0082's policy refuses to let a guide write.
export async function resubmitGuideCredential(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_credentials")
    .update({ status: "pending", rejected_reason: null, verified_at: null, verified_expires_at: null })
    .eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Uploads a sensitive document (insurance COI / cert card) to the private
// guide-documents bucket and records it. storage_path is never a public URL —
// use getSignedDocUrl to view it.
export async function uploadGuideDocument(guideId, docType, file, credentialId) {
  if (!supabase) return null;
  const path = `${guideId}/${docType}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("guide-documents").upload(path, file);
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("guide_documents").insert({ guide_id: guideId, doc_type: docType, storage_path: path, credential_id: credentialId || null })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getSignedDocUrl(storagePath, expiresInSec = 300) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from("guide-documents").createSignedUrl(storagePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// Admin-only in practice (storage.objects delete is is_admin-gated by RLS) —
// used when discarding a rejected applicant's or a lapsed guide's documents.
export async function deleteGuideDocument(docId, storagePath) {
  if (!supabase) return null;
  await supabase.storage.from("guide-documents").remove([storagePath]);
  const { error } = await supabase.from("guide_documents").update({ deleted_at: new Date().toISOString() }).eq("id", docId);
  if (error) throw error;
}

// Persists a real inquiry (today's UI collects objective/dates/party/message and
// discards them on submit — this is what actually stores them, plus the
// climber_disclaimer_accepted_at timestamp and includes_minor flag).
export async function submitInquiry(fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("inquiries").insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function updateInquiryStatus(id, status) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("inquiries").update({ status, guide_responded_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Only succeeds (per RLS) if the climber has a real inquiry with this guide.
export async function submitReview(fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("reviews").insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function postGuideReply(reviewId, text) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("reviews").update({ guide_reply: text, guide_reply_at: new Date().toISOString() }).eq("id", reviewId).select().single();
  if (error) throw error;
  return data;
}

// Flips any credential that's quietly crossed verified_expires_at to 'lapsed' and
// (via the sync_active_disciplines trigger) recomputes active_disciplines. No cron
// exists (static hosting) — call this opportunistically whenever a guide profile
// loads, so the badge is never more than one page-load stale.
export async function reconcileGuideVerification(guideId) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("reconcile_guide_verification", { p_guide_id: guideId });
  if (error) throw error;
}

// True only for a currently-verified-and-unexpired primary-track credential — the
// single legally-meaningful "Verified" signal. Having any other verified credential
// (e.g. a lone WFR) must NOT satisfy this (a guide's cert scope is gated by track).
export function isGuideVerified(credentials) {
  const now = Date.now();
  return (credentials || []).some(c =>
    c.kind === "primary_track" && c.status === "verified" &&
    (!c.verified_expires_at || new Date(c.verified_expires_at).getTime() > now));
}

// Map a DB guide_profiles row (snake_case, with embedded profiles/reviews) to the
// shape Guides/GuideDashboard render — mirrors dbRouteToCamel's role for routes.
export function dbGuideToCamel(g) {
  if (!g) return g;
  const revs = Array.isArray(g.reviews) ? g.reviews : [];
  const ratingAvg = revs.length ? revs.reduce((s, r) => s + (r.rating || 0), 0) / revs.length : null;
  return {
    id: g.id,
    name: (g.profiles && g.profiles.name) || "Guide",
    avatar: g.profiles && g.profiles.avatar,
    title: g.title, base: g.base_location, specialty: g.specialty, bio: g.bio,
    cancellationPolicy: g.cancellation_policy,
    lat: g.lat, lng: g.lng, rate: g.day_rate, groupMax: g.group_max, responseHrs: g.response_hrs,
    regions: g.regions || [], languages: g.languages || [],
    // `active_disciplines` is a CACHE, and it only goes stale in one direction. The
    // sync_active_disciplines trigger (0021) builds it from primary_track credentials that are
    // 'verified' AND unexpired — but nothing flips a credential to 'lapsed' when it quietly
    // crosses verified_expires_at, so the trigger never re-fires and the column keeps
    // advertising disciplines earned by an expired certification. reconcileGuideVerification
    // repairs it, and is only reached from a guide's OWN dashboard, so a guide who stops
    // logging in stays listed under a discipline they are no longer certified for.
    //
    // isGuideVerified already re-checks expiry at render, which is why the ✓ badge is honest.
    // Apply the same live check here: by that trigger's own definition every entry in the
    // cache requires a currently-valid primary_track credential, so if none is valid now the
    // cached list cannot be right and the safe reading is none. The guide stays listed (they
    // are 'active' by attestation) — they just stop matching a certification they have lost.
    //
    // Callers must embed `guide_credentials(kind, status, verified_expires_at)`; useGuides
    // does, and is the only caller. Without the embed this fails CLOSED (no disciplines),
    // which on a hire-a-guide surface is the right direction to be wrong in.
    disciplines: isGuideVerified(g.guide_credentials) ? (g.active_disciplines || []) : [],
    insuranceCarrierName: g.insurance_carrier_name,
    insuranceAttested: g.insurance_attested, permitAttested: g.permit_attested,
    rating: ratingAvg, reviewCount: revs.length,
    status: g.status,
  };
}

// Map a DB route row (snake_case) to the app's camelCase shape so RouteDetail —
// which reads route.gainFt/objHaz/elevPts/etc. — renders DB routes fully, not blank.
// A class grade (1st-4th) is a SCRAMBLING grade. It cannot describe a bolted sport climb, a
// trad pitch or a boulder problem, so on those disciplines it is not a grade at all -- it is
// an import artifact. 184 catalog routes carry one: "Prism Roof", a sport route at Shady Lane
// West, rendered its grade as "3rd" in the header badge AND the Grade tile.
//
// The grade came faithfully from OpenBeta, so there is nothing upstream to "restore" and no
// trustworthy source to derive a real grade from (audited 2026-08-07/08; the descent and
// approach lines in that same population were separately reclassified, see
// audits/2026-08-08-permits-rappels-class-grades.md). What the app can do without a source is
// stop presenting it as fact: null it here, at the single boundary every DB route crosses, so
// every render site shows "not recorded" and missingFacts() lists "grade" -- which puts the
// route into the contribute flow instead of quietly misinforming a climber.
//
// Deliberately NOT applied to alpine/mountaineering/ice/mixed/scrambling, where a class grade
// is meaningful and correct.
const CRAG_DISC = new Set(["trad", "sport", "bouldering", "rock"]);
const CLASS_GRADE = /^\s*(?:class\s*)?[1-4](?:st|nd|rd|th)?(?:\s*class)?\s*$/i;
function usableGrade(r) {
  if (!r || r.grade == null) return r ? r.grade : null;
  if (!CRAG_DISC.has(r.discipline)) return r.grade;
  return CLASS_GRADE.test(String(r.grade)) ? null : r.grade;
}

export function dbRouteToCamel(r) {
  if (!r) return r;
  return {
    ...r,
    grade: usableGrade(r),
    mountainId: r.area_id,
    gradeSystem: r.grade_system,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainFt: r.gain_ft, lossFt: r.loss_ft, outingShape: r.outing_shape, gainM: r.gain_ft!=null?Math.round(r.gain_ft/3.28084):null, lossM: r.loss_ft!=null?Math.round(r.loss_ft/3.28084):null, distKm: r.dist_km, maxAngle: r.max_angle,
    objHaz: toArr(r.obj_haz), elevPts: r.elev_pts, gpxPts: r.gpx, waypoints: normalizeWaypoints(r.waypoints),
    // Structured trailhead block (2026-07 enrichment): {trailhead, trailheadDirection, trailheadLat/Lng, peakLat/Lng}.
    approachLogistics: r.approach_logistics || null,
    // There is no `rack` column, so this mapped every DB route to an empty array and the
    // spread above could not help. The structured rack a climber wants IS `gear`, so fall
    // back to it — otherwise the protection summary, the gear readout's category matching
    // and the planner's packing list all run on nothing.
    rack: toArr(r.rack).length ? toArr(r.rack) : toArr(r.gear), gear: toArr(r.gear), features: toArr(r.features), hazards: toArr(r.hazards),
    alpineGrade: r.alpine_grade, rockGrade: r.rock_grade, iceGrade: r.ice_grade,highPointFt:r.high_point_ft,aidGrade:r.aid_grade,descentText:r.descent_text,pitchDetail:r.pitch_detail,rappelDetail:r.rappel_detail,rappelCountNote:r.rappel_count_note,lists:r.lists,permits:r.permit,
    timing:r.timing, detailedRack:r.detailed_rack, whatToBring:toArr(r.what_to_bring), proTips:toArr(r.pro_tips), watchOut:toArr(r.watch_out), proNeeds:r.pro_needs, bestSeason:r.best_season, beta:Array.isArray(r.beta)?r.beta:(r.beta?[r.beta]:[]),
    slingRack: r.sling_rack || null, alpineDraws: r.alpine_draws, ropeType: r.rope_type, ropeLengthM: r.rope_length_m, ropeNote: r.rope_note, ascender: r.ascender, corrections: r.corrections,
    // `verif` carries the reviewer's verdict ({status, source, updated, confirms}).
    // It was never mapped, so ProvenancePanel fell back to "unverified" for every
    // route and the reviewer flags on known-bad entries were invisible.
    verif: r.verif,
    // Enrichment panel fields (migration 0014) — no static-array equivalent, so no gap-fill needed.
    crowds: r.crowds, partnerRequirements: r.partner_requirements, seasonalGuidance: r.seasonal_guidance, seasonalHazards: r.seasonal_hazards, dataQuality: r.data_quality,
    // The embedded parent area (see useAreaRoutes) — shaped like a MOUNTAINS entry so
    // RouteDetail's `MOUNTAINS.find(...)||route._dbArea||{}` fallback works without the
    // area needing a match in the static seed array.
    _dbArea: r.areas ? { id: r.area_id, name: r.areas.name, areaType: r.areas.area_type, region: r.areas.region, parentName: r.areas.parent && r.areas.parent.name, lat: r.areas.lat, lng: r.areas.lng, elevation: r.areas.elevation_ft, prominence: r.areas.prominence_ft, avyZone: r.areas.avy_zone, blurb: r.areas.blurb } : null,
  };
}

// ── Topos (route-overlay photos) — see docs/BACKEND.md §9 and migration 0026. ──
// A topo is per-wall (area), not per-route: one photo can carry lines for several
// routes. Applies to every discipline, not just pitched rock.

// All topo photos for a wall/crag/face, each with its topo_lines rows. The caller
// picks, per route, the most-recent line as canonical and older ones as alternates
// (no trust_score on profiles yet, so this can't be trust-weighted like the
// client-side conditions consensus — see the migration note).
export function useAreaTopos(areaId) {
  return useQuery({
    queryKey: ["area-topos", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topos").select("*, topo_lines(*)").eq("area_id", areaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Public URL for a topo-photos storage path (the bucket is public — no signed URL needed).
export function topoPhotoUrl(storagePath) {
  if (!supabase || !storagePath) return null;
  return supabase.storage.from("topo-photos").getPublicUrl(storagePath).data.publicUrl;
}

// Uploads a new wall photo and records it. Path is {uid}/{uuid}-{filename} so
// storage RLS (migration 0026) can gate writes by the first path segment.
export async function uploadTopoPhoto(areaId, file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a topo photo.");
  const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file);
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("topos").insert({ area_id: areaId, storage_path: path }).select().single();
  if (error) throw error;
  return data;
}

// Uploads a trip-report photo, reusing the topo-photos bucket/RLS (same
// {uid}/{uuid}-{filename} path convention as uploadTopoPhoto) rather than
// standing up a separate bucket + migration for climb_logs.photos.
export async function uploadLogPhoto(file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to attach a photo.");
  const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file);
  if (upErr) throw upErr;
  return topoPhotoUrl(path);
}

// Draws this route's line + markers on a topo photo. created_by defaults to
// auth.uid() at the DB level, so RLS enforces ownership without threading the
// caller's own id through every component.
export async function submitTopoLine(topoId, routeId, points, pins, label) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("topo_lines").insert({ topo_id: topoId, route_id: routeId, points, pins: pins || [], label: label || null })
    .select().single();
  if (error) throw error;
  return data;
}

// Re-saves an existing line's points/pins — RLS restricts this to the line's own creator.
export async function updateTopoLine(lineId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("topo_lines").update(fields).eq("id", lineId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTopoLine(lineId) {
  if (!supabase) return null;
  const { error } = await supabase.from("topo_lines").delete().eq("id", lineId);
  if (error) throw error;
}

// Removes a whole photo (and, via cascade, every route's line drawn on it) —
// RLS restricts this to the photo's own uploader.
export async function deleteTopoPhoto(topoId, storagePath) {
  if (!supabase) return null;
  if (storagePath) await supabase.storage.from("topo-photos").remove([storagePath]);
  const { error } = await supabase.from("topos").delete().eq("id", topoId);
  if (error) throw error;
}

// ============================================================================
// FEEDBACK LOOP: LOGS, VOUCHES, & TRUST (Phase 2-3)
// Crew persistence lives earlier in this file (useMyCrews/createCrew/etc.) -
// see supabase/migrations/0036_crews_persistence.sql for why crews specifically
// were kept separate from this section rather than reusing its pattern.
// ============================================================================

// Query: Get user's climb logs
export function useUserLogs(userId) {
  return useQuery({
    queryKey: ["user-logs", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climb_logs").select("*")
        .eq("user_id", userId)
        .order("date_climbed", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Query: Get trip reports for a route (for consensus building).
//
// NOT WIRED UP YET -- nothing in the app calls this. Route detail builds its consensus
// from `route.activity` (seed data) concat the current user's own logs, so on a
// DB-backed route the "community consensus" is really a solo view; other users' public
// trip reports are never read. Wiring this in is a product decision, not a cleanup.
//
// Kept rather than deleted because the pieces it needs are deliberately in place: 0081
// added the "view crew logs" RLS policy for exactly this, and 0084 fixed the RPC below,
// which until then took a uuid while route ids are text -- every call returned 400.
// That bug survived because this wrapper was never called ([[dormant-code-is-not-pre-verified]]).
export function useRouteTripReports(routeId) {
  return useQuery({
    queryKey: ["route-trip-reports", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_trip_reports_for_consensus", { p_route_id: routeId });
      if (error) throw error;
      return data || [];
    },
  });
}

// Mutation: Create a climb log
export async function createClimbLog(userId, routeId, logData) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("climb_logs").insert({
      user_id: userId,
      route_id: routeId,
      ...logData,
      created_at: new Date().toISOString()
    }).select().single();
  if (error) throw error;
  return data;
}

// Mutation: Update a climb log
export async function updateClimbLog(logId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("climb_logs").update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", logId).select().single();
  if (error) throw error;
  return data;
}

// Mutation: Delete a climb log
export async function deleteClimbLog(logId) {
  if (!supabase) return null;
  const { error } = await supabase.from("climb_logs").delete().eq("id", logId);
  if (error) throw error;
}

// Query: Get user's vouches
// Hazard "still there" / "gone now" votes for one route (migration 0089). Read is public
// because this is route safety information — a signed-out climber checking conditions needs
// it as much as a member does.
//
// Returns the shape the UI already speaks: { "<routeId>|<label>": {still, gone, mine} }.
// Counting here rather than in a view keeps one round trip and lets `mine` be resolved in
// the same pass; a route's vote rows are small.
export function useRouteHazardVotes(routeId, userId) {
  return useQuery({
    queryKey: ["hazard-votes", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hazard_votes").select("hazard_label, user_id, vote").eq("route_id", routeId);
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => {
        const k = routeId + "|" + r.hazard_label;
        if (!out[k]) out[k] = { still: 0, gone: 0, mine: null };
        if (r.vote === "still") out[k].still++; else if (r.vote === "gone") out[k].gone++;
        if (userId && r.user_id === userId) out[k].mine = r.vote;
      });
      return out;
    },
  });
}

// Cast, change, or withdraw a vote. `vote` of null withdraws — that is the UI's toggle-off,
// and it is a delete rather than a third vote state so the aggregate never has to guess
// what an absent-but-present row means.
export async function castHazardVote(userId, routeId, hazardLabel, vote) {
  if (!supabase) return null;
  if (!vote) {
    const { error } = await supabase.from("hazard_votes").delete()
      .eq("user_id", userId).eq("route_id", routeId).eq("hazard_label", hazardLabel);
    if (error) throw error;
    return true;
  }
  // One row per climber per hazard (unique index), so changing a vote is an upsert on that
  // key rather than an insert that would collide.
  const { data, error } = await supabase.from("hazard_votes")
    .upsert({ user_id: userId, route_id: routeId, hazard_label: hazardLabel, vote },
            { onConflict: "route_id,hazard_label,user_id" })
    .select().single();
  if (error) throw error;
  return data;
}

// Connections between climbers (migration 0087). Every row involving me, in either
// direction — RLS already restricts this to rows where I am requester or addressee, so
// there is no filter to add here beyond the user check.
//
// The profile join is what makes a row usable: a connection is two uuids, and the UI needs
// a name and avatar. `profiles` has a public read policy, so this costs one round trip and
// nothing is exposed that a profile search would not already show.
export function useMyConnections(userId) {
  return useQuery({
    queryKey: ["my-connections", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("id, requester, addressee, status, created_at, responded_at");
      if (error) throw error;
      const rows = data || [];
      const others = [...new Set(rows.map((r) => (r.requester === userId ? r.addressee : r.requester)))];
      if (!others.length) return [];
      const { data: profs, error: pErr } = await supabase
        .from("profiles").select("id, name, username, avatar, location").in("id", others);
      if (pErr) throw pErr;
      const byId = {};
      (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.map((r) => {
        const otherId = r.requester === userId ? r.addressee : r.requester;
        return {
          _dbId: r.id,
          otherId,
          // "in" = they asked me, "out" = I asked them. The UI's friendState() speaks this.
          direction: r.requester === userId ? "out" : "in",
          status: r.status,
          profile: byId[otherId] || null,
        };
      });
    },
  });
}

// Ask to connect. status is left to the column default rather than sent, because the RLS
// insert policy requires status = 'pending' and a client-supplied value is one more thing
// that can drift from it.
export async function sendConnectionRequest(requesterId, addresseeId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("connections").insert({ requester: requesterId, addressee: addresseeId })
    .select().single();
  if (error) throw error;
  return data;
}

// Answer a request. Only the addressee may call this and only from 'pending' — that is
// enforced by the policy, not here, so a wrong caller fails at the database rather than
// silently doing nothing.
export async function respondToConnection(rowId, accept) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("connections").update({ status: accept ? "accepted" : "declined" })
    .eq("id", rowId).select().single();
  if (error) throw error;
  return data;
}

// Withdraw a request, decline-and-forget, or disconnect. Either party may delete.
export async function removeConnection(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("connections").delete().eq("id", rowId);
  if (error) throw error;
  return true;
}

// Blocked climbers (migration 0088). RLS restricts select to rows where I am the blocker,
// so there is no filter to add beyond the user check — and deliberately no way to ask who
// has blocked ME, which would turn a safety tool into a notification.
//
// The profile join mirrors useMyConnections: a block row is two uuids and the list needs a
// name and avatar to be usable.
export function useMyBlocked(userId) {
  return useQuery({
    queryKey: ["my-blocked", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_users").select("id, blocked, created_at");
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) return [];
      const { data: profs, error: pErr } = await supabase
        .from("profiles").select("id, name, username, avatar").in("id", rows.map((r) => r.blocked));
      if (pErr) throw pErr;
      const byId = {};
      (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.map((r) => ({ _dbId: r.id, blockedId: r.blocked, profile: byId[r.blocked] || null }));
    },
  });
}

// Block someone. The pair is uniquely indexed, so blocking twice raises 23505 rather than
// quietly creating a second row; the caller treats that as already-blocked.
export async function blockUser(blockerId, blockedId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("blocked_users").insert({ blocker: blockerId, blocked: blockedId })
    .select().single();
  if (error && error.code !== "23505") throw error;
  return data || null;
}

export async function unblockUser(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("blocked_users").delete().eq("id", rowId);
  if (error) throw error;
  return true;
}

export function useUserVouches(userId) {
  return useQuery({
    queryKey: ["user-vouches", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouches").select("*")
        .eq("from_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Query: Get vouches for a climber (trust signals from others)
export function useClimberVouches(climberId) {
  return useQuery({
    queryKey: ["climber-vouches", climberId],
    enabled: !!supabase && !!climberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouches").select("*")
        .eq("to_id", climberId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Mutation: Give a vouch
export async function giveVouch(fromId, toId, reason = "") {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("vouches").upsert({
      from_id: fromId,
      to_id: toId,
      reason: reason || null
    }, { onConflict: "from_id,to_id" }).select().single();
  if (error) throw error;
  return data;
}

// Mutation: Revoke a vouch
export async function revokeVouch(fromId, toId) {
  if (!supabase) return null;
  const { error } = await supabase.from("vouches").delete()
    .eq("from_id", fromId).eq("to_id", toId);
  if (error) throw error;
}

// Query: Get belay catches for a climber
export function useBelajCatches(userId) {
  return useQuery({
    queryKey: ["belay-catches", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("belay_catches").select("*")
        .or(`belayer_id.eq.${userId},climber_id.eq.${userId}`)
        .order("date_occurred", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Mutation: Log a belay catch
export async function logBelajCatch(belayerId, climberId, dateOccurred, description = "") {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("belay_catches").insert({
      belayer_id: belayerId,
      climber_id: climberId,
      date_occurred: dateOccurred,
      description: description || null
    }).select().single();
  if (error) throw error;
  return data;
}

// Query: Get computed trust score for a user
export async function getTrustScore(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .rpc("compute_trust_score", { user_id: userId });
  if (error) throw error;
  return data;
}

// Mutation: Record a verification
export async function addVerification(userId, verificationType) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("verification_records").upsert({
      user_id: userId,
      verification_type: verificationType,
      status: "pending"
    }, { onConflict: "user_id,verification_type" }).select().single();
  if (error) throw error;
  return data;
}

// Mark this user's email verified. Replaces the old verifyRecord(), which wrote
// status:'verified' straight from the client — RLS gated only user_id = auth.uid(), so any
// user could mark any of their own verifications verified, and the badge feeds the trust
// score. 0085 pins that column and moves the one verification the server can actually
// attest into a definer function that reads auth.users.email_confirmed_at itself.
export async function verifyMyEmail() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("verify_my_email");
  if (error) throw error;
  return data;
}

// Query: Get verification records for a user
export function useVerificationRecords(userId) {
  return useQuery({
    queryKey: ["verification-records", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_records").select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
  });
}

// Note: Trip report persistence uses climb_logs table (migration 0037).
// Crew persistence uses crews/crew_members/crew_day_acks tables (migration 0036).
// Enhanced climb_logs with fa_ascent/developed/beta fields (migration 0040).

// ── messaging ──

// Crew messaging
export async function sendCrewMessage(crewId, userId, body, imageUrl = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("crews_messages").insert({ crew_id: crewId, user_id: userId, body, image_url: imageUrl })
    .select().single();
  if (error) throw error;
  return data;
}

// Plain fetch — safe to call from event handlers. useCrewMessages wraps it for
// render-time use; calling the hook itself outside render is an invalid hook call.
export async function fetchCrewMessages(crewId, limit = 100, offset = 0) {
  if (!supabase || !crewId) return [];
  const { data, error } = await supabase
    .from("crews_messages").select("*, user:user_id(id,name,avatar)")
    .eq("crew_id", crewId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

export function useCrewMessages(crewId, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["crew-messages", crewId, limit, offset],
    enabled: !!supabase && !!crewId,
    queryFn: () => fetchCrewMessages(crewId, limit, offset),
  });
}

// Direct messaging
export async function sendDirectMessage(recipientId, userId, body, imageUrl = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("messages").insert({ sender_id: userId, recipient_id: recipientId, body, image_url: imageUrl })
    .select().single();
  if (error) throw error;
  return data;
}

export function useDirectMessages(userId, otherUserId, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["direct-messages", userId, otherUserId, limit, offset],
    enabled: !!supabase && !!userId && !!otherUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages").select("*, sender:sender_id(id,name,avatar)")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data || [];
    },
  });
}

// Paging BACKWARDS through history for "Load earlier messages".
// Not hooks -- these are called from click handlers, so they must be plain async.
// Keyset, not offset: `before` is the oldest locally-loaded message's timestamp
// (ms epoch or anything Date accepts); we fetch the `limit` rows strictly older
// than it, newest-first, then reverse to chronological for the UI. Offset paging
// double-counted against a shared scalar and skipped pages — and per this repo's
// convention, keyset can't skip or duplicate rows. Pass a falsy `before` for the
// newest page (initial hydration). Returns [] on failure rather than throwing,
// so a failed page-load can never blank the chat.
export async function fetchOlderCrewMessages(crewId, limit = 50, before = null) {
  if (!supabase || !crewId) return [];
  let q = supabase
    .from("crews_messages").select("*, user:user_id(id,name,avatar)")
    .eq("crew_id", crewId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", new Date(before).toISOString());
  const { data, error } = await q;
  if (error) return [];
  return (data || []).reverse();
}

// Every DM thread for a user in one query: the latest `limit` messages either
// sent or received, oldest-first. The caller groups by partner id — this is how
// the inbox discovers threads started by someone the user never opened a chat with.
export async function fetchMyDirectMessages(userId, limit = 100) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("messages").select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).reverse();
}

export async function fetchOlderDirectMessages(userId, otherUserId, limit = 50, before = null) {
  if (!supabase || !userId || !otherUserId) return [];
  let q = supabase
    .from("messages").select("*, sender:sender_id(id,name,avatar)")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", new Date(before).toISOString());
  const { data, error } = await q;
  if (error) return [];
  return (data || []).reverse();
}

export async function markMessageAsRead(messageId) {
  if (!supabase) return;
  const { error } = await supabase.from("messages").update({ read: true }).eq("id", messageId);
  if (error) throw error;
}

// Mark every unread message from one partner as read (RLS: recipient may update).
export async function markDmThreadRead(userId, partnerId) {
  if (!supabase) return;
  await supabase.from("messages").update({ read: true })
    .eq("recipient_id", userId).eq("sender_id", partnerId).eq("read", false);
}

// Crew chats have no per-message read flag; crew_reads (migration 0072) holds a
// per-member last-read watermark instead. Returns null when the table is absent
// so callers can skip crew unread entirely rather than badge on stale data.
export async function fetchCrewLastReads(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crew_reads").select("crew_id,last_read_at").eq("user_id", userId);
  if (error) return null;
  return data || [];
}

export async function countCrewUnread(crewId, userId, sinceIso) {
  if (!supabase) return 0;
  let q = supabase.from("crews_messages").select("id", { count: "exact", head: true })
    .eq("crew_id", crewId).neq("user_id", userId);
  if (sinceIso) q = q.gt("created_at", sinceIso);
  const { count, error } = await q;
  return error ? 0 : count || 0;
}

export async function markCrewRead(crewId, userId) {
  if (!supabase) return;
  await supabase.from("crew_reads")
    .upsert({ crew_id: crewId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: "crew_id,user_id" });
}

// Realtime subscriptions for messages - watches for inserts on crew messages
export function useCrewMessagesRealtime(crewId, onNewMessage) {
  const subscription = useRef(null);

  useEffect(() => {
    if (!supabase || !crewId || !onNewMessage) return;

    const channel = supabase.channel(`crews-messages:${crewId}`, { config: { broadcast: { self: false } } });
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "crews_messages", filter: `crew_id=eq.${crewId}` },
      async (payload) => {
        const msg = payload.new;
        // Fetch full user profile for the sender
        if (msg.user_id) {
          const { data: user } = await supabase.from("profiles").select("id,name,avatar").eq("id", msg.user_id).single();
          onNewMessage({ ...msg, user });
        } else {
          onNewMessage(msg);
        }
      }
    ).subscribe();

    subscription.current = channel;
    return () => { if (subscription.current) supabase.removeChannel(subscription.current); };
  }, [crewId, onNewMessage]);
}

// Realtime subscriptions for direct messages
export function useDirectMessagesRealtime(userId, partnerId, onNewMessage) {
  const subscription = useRef(null);

  useEffect(() => {
    if (!supabase || !userId || !partnerId || !onNewMessage) return;

    const channel = supabase.channel(`messages:${userId}:${partnerId}`, { config: { broadcast: { self: false } } });
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const msg = payload.new;
        if ((msg.sender_id === userId && msg.recipient_id === partnerId) || (msg.sender_id === partnerId && msg.recipient_id === userId)) {
          // Fetch full user profile for the sender
          if (msg.sender_id) {
            const { data: sender } = await supabase.from("profiles").select("id,name,avatar").eq("id", msg.sender_id).single();
            onNewMessage({ ...msg, sender });
          } else {
            onNewMessage(msg);
          }
        }
      }
    ).subscribe();

    subscription.current = channel;
    return () => { if (subscription.current) supabase.removeChannel(subscription.current); };
  }, [userId, partnerId, onNewMessage]);
}

// ---------------------------------------------------------------------------
// Comments — route discussion and per-pitch beta (migration 0065).
//
// target_id is the app's existing addressing scheme, passed through unchanged:
// "<route_id>" for the route discussion, "<route_id>__planner" etc. per sub-tab,
// and "<route_id>_pitch_<n>" for one pitch. See 0065_comments.sql.
//
// Rows are returned already shaped for the Comments component: it expects
// `userId`, `ts`, `parentId`, `likedByMe`. The author's display name and avatar
// come from the joined profile, so a comment shows a real identity instead of a
// hardcoded "You".
// ---------------------------------------------------------------------------

function dbCommentToCamel(row) {
  const p = row.profiles || {};
  return {
    id: row.id,
    targetId: row.target_id,
    userId: row.user_id,
    parentId: row.parent_id || undefined,
    text: row.deleted ? "" : row.text,
    edited: !!row.edited,
    deleted: !!row.deleted,
    likes: row.likes || 0,
    ts: row.created_at,
    // { "<user uuid>": "<reaction key>" } — the same shape group-post reactions already
    // use, so reactionCounts() in ClimbMatchCore.jsx counts these without a translation
    // step. Absent when the row came back from a write that did not ask for the embed.
    reactions: (row.comment_reactions || []).reduce((o, r) => { o[r.user_id] = r.reaction; return o; }, {}),
    authorName: p.name || "Climber",
    authorAvatar: p.avatar || null,
    authorUsername: p.username || null,
  };
}

export async function fetchComments(targetIds) {
  if (!supabase) return [];
  const ids = (Array.isArray(targetIds) ? targetIds : [targetIds]).filter(Boolean);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("comments")
    // Reactions ride along as an embed rather than a second round trip: a comment's rows
    // are capped at one per climber (migration 0096) so this cannot fan out.
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name,avatar,username),comment_reactions(user_id,reaction)")
    .in("target_id", ids)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(dbCommentToCamel);
}

// One query per route covering every surface at once — the six mount points share
// a route, so fetching them together avoids six round trips on one page.
export function useComments(targetIds) {
  const ids = (Array.isArray(targetIds) ? targetIds : [targetIds]).filter(Boolean);
  return useQuery({
    queryKey: ["comments", ids.slice().sort().join("|")],
    enabled: !!supabase && ids.length > 0,
    queryFn: () => fetchComments(ids),
  });
}

export async function addComment(targetId, userId, text, parentId = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("comments")
    .insert({ target_id: targetId, user_id: userId, text, parent_id: parentId })
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name,avatar,username)")
    .single();
  if (error) throw error;
  return dbCommentToCamel(data);
}

export async function editComment(id, text) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("comments").update({ text, edited: true }).eq("id", id)
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name,avatar,username)")
    .single();
  if (error) throw error;
  return dbCommentToCamel(data);
}

// Tombstone when the comment has replies so the thread below it survives; hard
// delete when it is a leaf. Mirrors what the in-memory version already did.
export async function deleteComment(id) {
  if (!supabase) return null;
  const { count, error: cErr } = await supabase
    .from("comments").select("id", { count: "exact", head: true }).eq("parent_id", id);
  if (cErr) throw cErr;
  if ((count || 0) > 0) {
    const { error } = await supabase
      .from("comments").update({ deleted: true, text: "" }).eq("id", id);
    if (error) throw error;
    return { id, tombstoned: true };
  }
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
  return { id, tombstoned: false };
}

// Counter only — see the NOTE ON LIKES in 0065_comments.sql. This cannot tell who
// liked what, so the caller keeps the viewer's own like in local state and this
// just moves the shared number.
export async function setCommentLike(id, liked, current = 0) {
  if (!supabase) return null;
  const next = Math.max(0, current + (liked ? 1 : -1));
  const { data, error } = await supabase
    .from("comments").update({ likes: next }).eq("id", id).select("id,likes").single();
  if (error) throw error;
  return data;
}

// Set, change, or clear this climber's reaction on one comment (migration 0096). Unlike
// `likes` above there is no counter to move: the row IS the reaction, so the count every
// reader sees is derived from rows and a client cannot inflate it.
//
// `reaction` of null clears — that is the UI's tap-the-one-you-already-gave toggle, and it
// is a delete rather than a third state so an aggregate never has to interpret an empty row.
export async function setCommentReaction(commentId, userId, reaction) {
  if (!supabase) return null;
  if (!reaction) {
    const { error } = await supabase.from("comment_reactions").delete()
      .eq("comment_id", commentId).eq("user_id", userId);
    if (error) throw error;
    return true;
  }
  // (comment_id, user_id) is the primary key, so changing your mind is an upsert on that
  // key rather than an insert that would collide with the reaction you already left.
  const { data, error } = await supabase.from("comment_reactions")
    .upsert({ comment_id: commentId, user_id: userId, reaction }, { onConflict: "comment_id,user_id" })
    .select().single();
  if (error) throw error;
  return data;
}

// Groups (migration 0090). Until now `GROUPS` was DEMO_FILLERS-gated — empty in production —
// and `createdGroups` was a useState array, so a group vanished on refresh and two climbers
// could never be in one.
//
// Returns every group I can see: RLS already allows public groups plus private ones I belong
// to, so there is no filter to add here. `mine` is what the UI needs to decide joined state,
// and it comes from the roster rather than a second query.
//
// SCOPE: membership only. Posts, events and the approval-to-join flow are not backed yet —
// `policy` is stored and rendered but nothing enforces it, so do not read it as a guarantee.
export function useMyGroups(userId) {
  return useQuery({
    queryKey: ["my-groups", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, blurb, location, disciplines, accent, policy, event_policy, visibility, created_by, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const groups = data || [];
      if (!groups.length) return [];
      const { data: mem, error: mErr } = await supabase
        .from("group_members").select("group_id, user_id, role")
        .in("group_id", groups.map((g) => g.id));
      if (mErr) throw mErr;
      const byGroup = {};
      (mem || []).forEach((m) => { (byGroup[m.group_id] = byGroup[m.group_id] || []).push(m); });
      return groups.map((g) => {
        const roster = byGroup[g.id] || [];
        const mine = roster.find((m) => m.user_id === userId) || null;
        return {
          _dbId: g.id, id: g.id, name: g.name, blurb: g.blurb || "", location: g.location || "",
          disciplines: g.disciplines || [], accent: g.accent || "", policy: g.policy,
          eventPolicy: g.event_policy, visibility: g.visibility,
          ownerId: g.created_by, memberIds: roster.map((m) => m.user_id),
          moderatorIds: roster.filter((m) => m.role !== "member").map((m) => m.user_id),
          joined: !!mine, myRole: mine ? mine.role : null, _db: true,
        };
      });
    },
  });
}

// The owner membership row is created by 0090's trigger, not here — doing it client-side
// leaves a window where a group exists with no owner, and the join policy pins role to
// 'member' so the creator could not add themselves as one afterwards.
export async function createGroupRow(userId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("groups").insert({
    name: fields.name, blurb: fields.blurb || null, location: fields.location || null,
    disciplines: fields.disciplines || [], accent: fields.accent || null,
    policy: fields.policy || "open", event_policy: fields.eventPolicy || "anyone",
    visibility: fields.visibility || "public", created_by: userId,
  }).select().single();
  if (error) throw error;
  return data;
}

// role is left to the column default: the RLS policy requires 'member', and a client-supplied
// value is one more thing that can drift from it.
export async function joinGroupRow(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").insert({ group_id: groupId, user_id: userId }).select().single();
  if (error && error.code !== "23505") throw error;
  return data || null;
}

export async function leaveGroupRow(groupId, userId) {
  if (!supabase) return null;
  const { error } = await supabase
    .from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  if (error) throw error;
  return true;
}

// 0090 shipped the columns AND the policies for these three — "groups update by manager",
// "group_members promote by manager" and "group_members leave or be removed" — but the
// permission checks in the UI compared against the seed id 0, so a uuid owner never saw the
// controls and these were never called. No migration is needed to turn them on.
//
// Each asserts a row came back. A statement RLS filters out returns 200 with an EMPTY array
// rather than an error, so "no error" is not evidence anything changed.
export async function setGroupVisibility(groupId, visibility) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("groups").update({ visibility }).eq("id", groupId).select("id, visibility");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("not permitted");
  return data[0];
}

// The policy caps role at 'member'/'moderator' and refuses to touch an 'owner' row, so this
// can only ever swap the two lower roles — a client cannot mint an owner or demote one.
export async function setGroupMemberRole(groupId, userId, role) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").update({ role }).eq("group_id", groupId).eq("user_id", userId)
    .select("group_id, user_id, role");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("not permitted");
  return data[0];
}

export async function removeGroupMember(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)
    .select("group_id, user_id");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("not permitted");
  return data[0];
}

// Saved searches (migration 0091). Were React state only — the UI showed them with delete
// buttons in two places, i.e. the affordances of storage with no storage behind them.
// Private by policy; there is no sharing concept.
export function useMySavedSearches(userId) {
  return useQuery({
    queryKey: ["my-saved-searches", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_searches").select("id, name, query, created_at")
        .eq("user_id", userId).order("created_at", { ascending: true });
      if (error) throw error;
      // The stored query is spread back to the flat shape the UI already uses, so callers do
      // not have to know a row ever went through the database.
      return (data || []).map((s) => ({ _dbId: s.id, id: s.id, name: s.name, ...(s.query || {}) }));
    },
  });
}

// `query` is stored opaquely: the filter shape has changed repeatedly, and pinning today's
// keys into columns would guarantee a migration the next time it moves.
export async function createSavedSearchRow(userId, name, query) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("saved_searches").insert({ user_id: userId, name, query: query || {} })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteSavedSearchRow(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("saved_searches").delete().eq("id", rowId);
  if (error) throw error;
  return true;
}

// Custom route lists (migration 0092). "My Objectives" (`ul_obj`) is NOT stored here — it
// stays owned by the `objectives` table, so there is exactly one writer per fact.
//
// Only own lists are fetched. The select policy also permits reading anyone's `shared` list,
// but nothing in the UI browses other people's lists yet, so asking for them would be
// fetching data no screen renders.
export function useMyLists(userId) {
  return useQuery({
    queryKey: ["my-lists", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lists").select("id, name, icon, route_ids, shared, created_at")
        .eq("user_id", userId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((l) => ({
        _dbId: l.id, id: l.id, name: l.name, icon: l.icon || "",
        routeIds: l.route_ids || [], shared: !!l.shared,
      }));
    },
  });
}

export async function createListRow(userId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("user_lists").insert({
    user_id: userId, name: fields.name, icon: fields.icon || null,
    route_ids: fields.routeIds || [], shared: !!fields.shared,
  }).select().single();
  if (error) throw error;
  return data;
}

// Partial patch — the three call sites each change one thing (routeIds, or shared), and
// sending the whole row would let a stale copy clobber a concurrent edit.
export async function updateListRow(rowId, fields) {
  if (!supabase) return null;
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.icon !== undefined) patch.icon = fields.icon;
  if (fields.routeIds !== undefined) patch.route_ids = fields.routeIds;
  if (fields.shared !== undefined) patch.shared = !!fields.shared;
  const { data, error } = await supabase
    .from("user_lists").update(patch).eq("id", rowId).select().single();
  if (error) throw error;
  return data;
}
