// lib/db-catalog.js — the catalog: areas and routes, their trees, paths, counts and points.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "./queryClientRef";
import { supabase } from "./supabase";
import { ROUTE_AREA_EMBED, offlineArea, offlineAreaChildren, offlineAreaNamesByIds, offlineAreaRoutes, offlineAreaTrailsByIds, offlineAreasByIds, offlinePackArea, offlinePackSiblings, offlineRoutesByIds } from "./offline";
import { CHILD_SORT_DEFAULT, sortChildren } from "./areaChildSort.js";
import { allRows, deviceFirst, orOffline, orOfflineExact } from "./db-shared.js";

// Immediate children of an area (or the top level when parentId is null).
// GET /areas/:id  ->  select * from areas where parent_id = $1
// `opts.enabled` lets a caller gate the fetch (e.g. the "All areas" tree only
// wants a node's children once it's actually expanded — the DB catalog is
// 47k+ areas, so eagerly fetching every row's children up front doesn't scale).
export function useAreaChildren(parentId, opts) {
  const enabled = !opts || opts.enabled !== false;
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-children", parentId ?? "__root__"],
    enabled: !!supabase && enabled,
    // A -> Z (owner, 2026-11-18: "the default view for all areas should be alphabetical"), sorted again
    // here with the same locale-aware rule the area page's sort uses (lib/areaChildSort.js), so the
    // database's collation can never order "Mt. Si" and "mount Index" differently from the page.
    queryFn: () => deviceFirst(parentId, () => offlineAreaChildren(parentId), () => orOffline(() => allRows(() => {
      let q = supabase.from("areas").select("*");
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      return q.order("name").order("id");
    }), () => offlineAreaChildren(parentId))).then(rows => Array.isArray(rows) ? sortChildren(rows, CHILD_SORT_DEFAULT) : rows),
  });
}

// Routes in a leaf area, in cliff order ("by area").
// GET /areas/:id/routes  ->  select * from routes where area_id = $1 order by sort_order, name
// Embeds the parent area's key fields (elevation_ft, prominence_ft, lat/lng…) so the
// route detail page can show peak info without needing a match in the static
// MOUNTAINS seed array — see dbRouteToCamel's `_dbArea` field.
//
// THE LIST READS A THIN ROW. The literal column list below is what the list's readers read —
// RouteRow and SummitBriefing (lib/DbAreaBrowser.jsx), the grade chain (lib/grade.js), effDistKm
// (lib/outing.js), the route page's sibling rows and its approach picker's reverse link
// (approach_variants) — and nothing else; check:list-row-columns parses those readers and this
// literal and fails when they drift apart. Measured 2026-10-08
// (scripts/oneoff/measure-list-row-bytes.mjs): a full ROUTE_AREA_EMBED row averages 2,384 bytes and
// the list reads 332 of them; Liberty Bell's 20 routes were 635 KB (gpx, approach_variants,
// rappel_detail, access) for a list that renders 17 KB, Stone Fort's 356 were 824 KB for 119.
// Every network row is stamped _thin, and openRoute() reads the full row (fetchRouteRow) before
// the route page renders — a thin row on that page would read as "not recorded" for every column
// the list did not select, which is the claim this codebase keeps shipping by accident. A packed
// state answers from the device with full rows and no stamp. { full: true } keeps the whole row
// for a caller that hands rows on without opening them (the climb picker's log form).
export function useAreaRoutes(areaId, { full = false } = {}) {
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: [full ? "area-routes-full" : "area-routes", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: () => deviceFirst(areaId, () => offlineAreaRoutes(areaId), () => orOffline(() => fetchAreaRoutes(areaId, full), async () => {
      // A downloaded state first; then the neighbours saved with a climb of this area (thin rows, so
      // never for a `full` caller, which hands rows on without opening them).
      const st = await offlineAreaRoutes(areaId);
      return st.length || full ? st : offlinePackSiblings(areaId);
    })),
  });
}
// The network read behind useAreaRoutes, named so a climb's SAVE stores its neighbours from the same
// select the list uses (packRouteWithSnapshot) instead of a second copy of the column list. It sits
// directly under the hook because check:list-row-columns reads the thin literal from here.
export async function fetchAreaRoutes(areaId, full) {
  const q = () => full
    ? supabase.from("routes").select(ROUTE_AREA_EMBED)
    : supabase.from("routes").select("id,name,area_id,discipline,stars,guide_stars,classic,classic_score,sort_order,pitches,length_m,grade,grade_system,grade_num,ice_grade_num,mixed_grade_num,aid_grade_num,snow_grade_num,rock_grade,ice_grade,alpine_grade,commitment,prot_rating,gain_ft,high_point_ft,dist_km,outing_shape,itinerary,approach_variants,areas(name,area_type)");
  const rows = await allRows(() => q().eq("area_id", areaId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name"));
  return full ? rows : rows.map((r) => ({ ...r, _thin: true }));
}

// How long catalog structure (areas, climbs, search) counts as fresh: it changes on an import or an
// approved edit, and those refresh their queries explicitly (invalidation ignores staleTime). The
// global default (60 s, main.jsx) re-read every area and climb list in the background a minute after
// it was shown (2026-11-14, "anything else we can speed up"). Community data (stars, stats, photos)
// keeps the default.
export const CATALOG_STALE_MS = 15 * 60 * 1000;

// ONE full-row read by id, for every path that holds a route's id or a thin list row: the shared
// `?route=` link and openRoute()'s hydration of a `_thin` row. Network first, then the packed copy
// if the network fails; a route that is in neither throws, so the caller can say so rather than
// open a page that reads as empty. Cached under the query client when one is set (main.jsx), so
// opening the same climb twice inside staleTime costs one request.
export function fetchRouteRow(routeId) {
  const read = () => orOffline(async () => {
    if (!supabase) throw new Error("Catalog backend not configured");
    const { data, error } = await supabase.from("routes").select(ROUTE_AREA_EMBED).eq("id", routeId).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("That climb is no longer in the catalog");
    return data;
  }, async () => (await offlineRoutesByIds([routeId]))[0] || null);
  const qc = getQueryClient();
  return qc ? qc.fetchQuery({ queryKey: ["route-row", routeId], queryFn: read }) : read();
}

// A single area's row (name, type, route_count, blurb…).
export function useArea(id) {
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area", id],
    enabled: !!supabase && !!id,
    queryFn: () => deviceFirst(id, () => offlineArea(id), () => orOffline(async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    }, async () => (await offlineArea(id)) || offlinePackArea(id))),
  });
}

// A PEAK's elevation for each area id, for the Route finder's group heading (2026-11-18: a climber filtering
// Peak 8,000+ ft saw no height anywhere on the list). Only peaks: a crag's or a region's elevation_ft is not a
// summit. The map holds the peaks that have one; a failed read leaves the headings without a height, as
// useAreaNamesByIds leaves the wall line off — never a wrong number.
export function useAreaPeakElevationsByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-peak-elev", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: () => orOfflineExact(async () => {
      const { data, error } = await supabase.from("areas").select("id,area_type,elevation_ft").in("id", ids);
      if (error) throw error;
      return peakElevMap(data);
    }, async () => { const rows = await offlineAreasByIds(ids); return rows.length ? peakElevMap(rows) : undefined; }),
  });
}
const peakElevMap = (rows) => { const map = {}; (rows || []).forEach(a => { if (a.area_type === "peak" && a.elevation_ft > 0) map[a.id] = a.elevation_ft; }); return map; };

// Resolves area names for a set of area ids — backs showing "which crag" a
// route in a multi-area Route Finder result list belongs to. A plain lookup
// (not an RPC) since routes_in_subtree returns setof routes and can't add an
// extra joined column without a return-type change.
export function useAreaNamesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-names", key],
    enabled: !!supabase && !!(ids || []).length,
    // orOfflineExact, because the answer is a MAP: an empty one is truthy, so orOffline
    // would substitute it for a failed read and every name would degrade to its placeholder
    // as though it had been resolved. A partial map is a real answer and is kept.
    queryFn: () => orOfflineExact(async () => {
      const { data, error } = await supabase.from("areas").select("id,name").in("id", ids);
      if (error) throw error;
      const map = {};
      (data || []).forEach(a => { map[a.id] = a.name; });
      return map;
    }, () => offlineAreaNamesByIds(ids)),
  });
}

// Each area's line of ancestors, as names: area id → ["City of Rocks", "Circle Creek Overlook"] — the levels
// between the STATE and the area itself (the root country and the state are dropped: the Climbs header already
// names the state). Backs the Route finder's results (owner, 2026-11-14: "it shows the wall, but it needs to show
// City of Rocks or the general area breakdown"). Two id-keyed reads: the areas' paths, then the ancestors' names.
// The same undefined-not-{} offline rule as useAreaNamesByIds.
// THE STATE LEADS each line, marked `state: true` (2026-11-18): a search hit ends its place with the state, and the
// id is already in the path. The Route finder, whose header names the state, drops the marked entry.
export const stateIdOf = (path) => { const p = String(path || "").split(".").filter(Boolean); return p.length > 2 ? p[1] : null; };
export const trailIdsOf = (path) => String(path || "").split(".").filter(Boolean).slice(2, -1);
export function useAreaTrailsByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-trails", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: () => orOfflineExact(async () => {
      const { data, error } = await supabase.from("areas").select("id,path").in("id", ids);
      if (error) throw error;
      const ancIds = [...new Set((data || []).flatMap(a => trailIdsOf(a.path).concat(stateIdOf(a.path) || [])))];
      const { data: anc, error: ancErr } = ancIds.length ? await supabase.from("areas").select("id,name").in("id", ancIds) : { data: [], error: null };
      if (ancErr) throw ancErr;
      const nameOf = Object.fromEntries((anc || []).map(a => [a.id, a.name]));
      const map = {};
      (data || []).forEach(a => { const st = stateIdOf(a.path); map[a.id] = (st ? [{ id: st, name: nameOf[st], state: true }] : []).concat(trailIdsOf(a.path).map(id => ({ id, name: nameOf[id] }))).filter(c => c.name); });
      return map;
    }, () => offlineAreaTrailsByIds(ids)),
  });
}

const areaCard = (a, parentName) => ({ name: a.name, type: a.area_type, lat: a.lat, lng: a.lng, aspect: a.aspect || null, rock: a.rock || null, rockBasis: a.rock_basis || null, disciplines: Array.isArray(a.disciplines) ? a.disciplines : [], dominant: a.dominant_discipline || null, parentId: a.parent_id || null, parentName });
// The same lookup, plus `area_type` — backs the Logbook's Saved view, which files a saved PEAK
// apart from a saved crag or range. A peak IS an area row, so "Save" on a peak page has always
// written the same bookmark; without the type the two could only render as one undifferentiated
// "Saved areas" list. A map of {name, type}, with the same undefined-not-{} offline rule as above.
export function useAreaCardsByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-cards", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: () => orOfflineExact(async () => {
      // lat/lng and the parent so an AREA CREW (0301) has a coordinate for the finder's distance and a
      // breadcrumb parent for its card, from the one read every crew surface already makes.
      // aspect/rock/disciplines travel with the card so a saved AREA carries its own wall and rock.
      const { data, error } = await supabase.from("areas").select("id,name,area_type,lat,lng,aspect,rock,rock_basis,disciplines,dominant_discipline,parent_id,parent:parent_id(name)").in("id", ids);
      if (error) throw error;
      const map = {};
      (data || []).forEach(a => { map[a.id] = areaCard(a, (a.parent && a.parent.name) || null); });
      return map;
    }, async () => {
      const rows = await offlineAreasByIds(ids);
      if (!rows.length) return undefined;
      const map = {};
      for (const a of rows) map[a.id] = areaCard(a, null);
      return map;
    }),
  });
}

// The owner's queue of held AREA edits shows each field's value ON THE PAGE NOW through
// lib/areaFields.js `cur(area)`, which reads the raw `areas` columns. useAreaCardsByIds' camelCase
// card carries none of blurb, approach, approach_min, parking_*, season_months, so the queue said
// "ON THE PAGE NOW: nothing" for five of the eight fields whatever the page showed. This is the
// raw row, those columns only. A queue the owner acts on, so no offline copy: a failed read
// throws and the queue says it could not load.
export function useAreaEditRowsByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["area-edit-rows", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("id,name,area_type,blurb,approach,approach_min,parking_note,parking_lat,parking_lng,parking_name,rock,aspect,season_months").in("id", ids);
      if (error) throw error;
      const map = {};
      (data || []).forEach(a => { map[a.id] = a; });
      return map;
    },
  });
}
