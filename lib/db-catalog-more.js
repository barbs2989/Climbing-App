// lib/db-catalog-more.js — the catalog, continued: area paths, classics, countries and states, nearby places, routes by id.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQueries, useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { ROUTE_AREA_EMBED, deviceAreaSearch, deviceRouteSearch, deviceSearchScope, offlineArea, offlineAreaSearch, offlineAreasByIds, offlinePackRouteAreaRow, offlineRoutesByIds, offlineStates, offlineSubtreeRouteCount, offlineSubtreeRoutes } from "./offline";
import { upCragFacts } from "./areaInherit.js";
import { expandPlaceNickname, searchBare, searchCanon, searchTokens } from "./search";
import { deviceFirst, deviceFirstScan, holdWhileTyping, orOffline, orOfflineExact, useDebouncedTerm, withPending } from "./db-shared.js";
import { CATALOG_STALE_MS } from "./db-catalog.js";
import { placeSpellings } from "./db-search.js";
import { dbRouteToCamel } from "./db-route-row.js";

// Full ancestor chain for one area, root-first (e.g. ["USA","Washington","North
// Cascades",...,"Mount Baker"]) — the DB-catalog equivalent of walking MOUNTAINS'
// parentId chain (see areaPathNames in ClimbMatch.jsx).
//
// TWO requests, not one per ancestor. `areas.path` is the ltree of ancestor IDS, root
// included ("usa.washington.wa_north_cascades.…"), measured equal to the parent_id walk on
// every row probed — so the chain is the row's own path, fetched in one `.in()`. The walk
// this replaced made up to 12 SERIAL round trips per area, and useAreaPaths runs one chain
// per row of a feed. The walk stays only as the fallback for a row with no path.
async function fetchAreaPath(id) {
  if (!supabase || !id) return [];
  const { data: self, error: selfErr } = await supabase.from("areas").select("id,name,parent_id,path").eq("id", id).maybeSingle();
  if (selfErr) throw selfErr;
  if (!self) return [];
  const ids = self.path ? String(self.path).split(".").filter(Boolean) : [];
  if (ids.length && ids[ids.length - 1] === self.id) {
    const { data, error } = await supabase.from("areas").select("id,name").in("id", ids);
    if (error) throw error;
    const byId = Object.fromEntries((data || []).map((a) => [a.id, a]));
    return ids.map((aid) => byId[aid]).filter(Boolean).map((a) => ({ id: a.id, name: a.name }));
  }
  const path = [{ id: self.id, name: self.name }];
  let currentId = self.parent_id, guard = 0;
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

// THE CRAG'S PARKING ON A WALL'S OWN PAGE (owner note 2026-11-25: "is this common where we actually do have a parking
// spot but it's just not showing up?"). A climb's page has shown its crag's parking since #3800 (upCragFacts), but the
// area page of the wall itself read only its own row, so a wall under a crag that holds the lot said "No directions on
// file yet" and drew no P. Same rule as upCragFacts: only a CRAG above passes it down, nearest first, the walk stops at
// the first area that is not a crag, and a note and its pin come from the same area. Asked only when the area has no
// parking of its own. One small keyed read of the ancestors named in `path`.
export function useCragParkingAbove(area) {
  const own = !!area && ((area.parking_note && String(area.parking_note).trim()) || (area.parking_lat != null && area.parking_lng != null));
  const ids = area && area.path && !own && (area.area_type === "crag" || area.area_type === "wall") ? String(area.path).split(".").filter(Boolean).slice(0, -1).reverse() : [];
  return useQuery({
    queryKey: ["crag-parking-above", area ? area.id : null, ids.join(".")],
    enabled: !!supabase && ids.length > 0,
    staleTime: CATALOG_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("id,name,area_type,parking_note,parking_lat,parking_lng,parking_name").in("id", ids);
      if (error) throw error;
      const byId = Object.fromEntries((data || []).map((a) => [a.id, a]));
      const fake = ids.reduceRight((child, id) => (byId[id] ? { ...byId[id], parent: child } : child), null);
      return upCragFacts(fake).upParking;
    },
  });
}

// Ancestor chains for a set of areas at once (e.g. one per row in a contribution
// feed) — a dynamic list of queries via useQueries rather than useAreaPath in a
// loop, since the number of ids varies by render and hooks can't be called
// conditionally. Returns { [id]: [{id,name}, ...] } for whichever ids have
// resolved so far; still-loading/unknown ids are simply absent from the map.
/** @param {ReadonlyArray<string|number|null|undefined>|null|undefined} ids
 *  @returns {Record<string, {id?: string|number, name?: string|null}[]>} */
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
  /** @type {Record<string, {id?: string|number, name?: string|null}[]>} */
  const map = {};
  uniqueIds.forEach((id, i) => { if (results[i] && results[i].data) map[id] = results[i].data; });
  return map;
}

// Every route carrying ANY named-list tag — 64 rows today, one query, and the source for
// every list on the Challenges screen.
//
// The screen used to build its lists out of the climber's own completed logs, so the Fifty
// Classics card could only show routes you had already done: never the fifty as objectives,
// and hidden entirely at zero. Asking the catalog instead is what makes a tick-list a
// tick-list.
//
// Membership is NOT filtered here. The column holds slugs on some rows and whole sentences on
// others ("Washington Bulger List (100 Highest Peaks in Washington)"), so a `lists=ov.{…}`
// query on slugs finds the 50 fifty_classics rows and misses every Bulger peak. lib/lists.js
// resolves both spellings; this fetches the small tagged set and lets it decide.
//
// A route whose ONLY list is its state's classics comes through useStateClassics instead: up to
// 100 a state would otherwise crowd the named lists out of this capped read.
//
// An RPC, not a table filter (0419): the filter left ~64 rows out of the ~3,900 the 0132 index
// matches only after reading every one from the table, 2,320 pages a call, and it was the query
// that timed out most in the 2026-11-12 outage. The function states the predicate as a literal so
// its partial index applies; PostgREST's bind parameter could not.
export function useRoutesWithLists() {
  return useQuery({
    queryKey: ["routes-with-lists"],
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("routes_with_named_lists");
      if (error) throw error;
      return (data || []).map(dbRouteToCamel);
    },
  });
}

// THE CLIMBER'S STATE'S CLASSICS (0390): the routes tagged `state_classics` under their home state, for the
// Challenges card. Null path (no home state) asks nothing.
export function useStateClassics(statePath) {
  return useQuery({
    queryKey: ["state-classics", statePath],
    enabled: !!supabase && !!statePath,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("state_classics", { p_state_path: statePath });
      if (error) throw error;
      return (data || []).map(dbRouteToCamel);
    },
  });
}

// The root countries, most-climbed first. The catalog held exactly one until Canada arrived,
// so nothing ever had to ask this question; the area browser now opens on it.
export function useCountries() {
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-countries"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").is("parent_id", null)
        .order("route_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// The top-level regions — every direct child of every ROOT area, not of "usa" specifically.
// The DB-catalog equivalent of the static AreaBrowse "Pick a state" list.
//
// This was `.eq("parent_id", "usa")`, which was correct while the catalog held exactly one
// country and silently wrong the moment it held two: a Canadian province would have been
// loaded, counted and searchable, and completely unreachable from the browser — data with no
// reader, which is the failure this repo keeps finding. Roots are resolved rather than named
// so adding a third country needs no code change at all.
export function useStates() {
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-children", "roots"],
    enabled: !!supabase,
    queryFn: () => orOffline(async () => {
      const { data: roots, error: rootErr } = await supabase.from("areas").select("id").is("parent_id", null);
      if (rootErr) throw rootErr;
      const rootIds = (roots || []).map(r => r.id);
      if (!rootIds.length) return [];
      const { data, error } = await supabase.from("areas").select("*").in("parent_id", rootIds).order("name");
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
  // Offline this is the FIRST half of opening a search hit: the hit carries no `path`, so
  // without the full row the breadcrumb below has nothing to walk and jumpToArea bails
  // after it has already switched screens.
  return orOffline(async () => {
    const { data, error } = await supabase.from("areas").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data || null;
  }, () => offlineArea(id));
}

export async function fetchAreaBreadcrumb(area) {
  // Drop the leading label — it is the root country, which the breadcrumb does not show —
  // rather than filtering the literal "usa", which would start rendering "Canada" as a crumb
  // the moment a second country existed.
  const ids = area && area.path ? area.path.split(".").slice(1).filter(id => id !== area.id) : [];
  if (!supabase || !ids.length) return [];
  // The SECOND half. The dropped leading label is the root country, which is the one
  // ancestor `downloadStateOffline` never stores (it keeps descendants of the state only) —
  // so the ids that survive that slice are exactly the ones a downloaded state holds.
  return orOffline(async () => {
    const { data, error } = await supabase.from("areas").select("*").in("id", ids);
    if (error) throw error;
    const byId = Object.fromEntries(data.map(a => [a.id, a]));
    return ids.map(id => byId[id]).filter(Boolean);
  }, async () => {
    const rows = await offlineAreasByIds(ids);
    const byId = Object.fromEntries(rows.map(a => [a.id, a]));
    return ids.map(id => byId[id]).filter(Boolean);
  });
}

// Fetches just the parent-area fields for one route and returns them in _dbArea
// shape. The routes_in_subtree / areas_in_subtree RPCs (and the ?debugRoute
// lookup) return bare route rows with no embedded `areas`, so a route opened
// from search / Route finder / "View all N routes" / Objectives / Suggested
// climbs arrives with _dbArea null. enrichRoute then falls back to the `fa`-only
// branch and the route page silently loses prominence, range and the peak blurb
// — it still renders a PEAK panel, so the loss is invisible. Rather than change
// five RPCs (a migration), the route-open path hydrates the missing area here.
// The nearest ancestor's researched season (areas.season_months), from the four-deep
// parent:parent_id(season_months, parent:…) embed. A crag system's season speaks for everything
// filed inside it, as its own area page says; the route header uses it when the route and its own
// area have none (lib/seasonText.js routeSeasonShort).
export function ancestorSeason(p) {
  for (let d = 0; p && d < 4; d++, p = p.parent) if (Array.isArray(p.season_months) && p.season_months.length) return p.season_months;
  return null;
}

// With no signal the facts come from the saved climb's own row, which stores this same embed
// (ROUTE_AREA_EMBED); a route saved nowhere rethrows, so the page keeps "couldn't load the area".
export async function fetchRouteArea(routeId) {
  if (!supabase || !routeId) return null;
  const data = await orOffline(async () => {
    const r = await supabase
    .from("routes").select("area_id, areas(path,name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,approach,approach_min,rock,rock_basis,aspect,parking_lat,parking_lng,parking_name,parking_note,season_months,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note)))))")
    .eq("id", routeId).maybeSingle();
    if (r.error) throw r.error; // null is "this route has no area"; a failed read must not pose as it
    return r.data;
  }, () => offlinePackRouteAreaRow(routeId));
  if (!data || !data.areas) return null;
  const a = data.areas;
  // approach/approachMin are SELECTED above and were left out of this object, so a crag opened
  // from a shared link or search lost its WALK-IN that the area-browser path (dbRouteToCamel) shows.
  return { id: data.area_id, path: a.path || null, name: a.name, areaType: a.area_type, region: a.region, parentName: a.parent && a.parent.name, lat: a.lat, lng: a.lng, elevation: a.elevation_ft, prominence: a.prominence_ft, avyZone: a.avy_zone, blurb: a.blurb, approach: a.approach || null, approachMin: a.approach_min ?? null, rock: a.rock, rockBasis: a.rock_basis, aspect: a.aspect, parkingLat: a.parking_lat ?? null, parkingLng: a.parking_lng ?? null, parkingName: a.parking_name || null, parkingNote: a.parking_note || null, seasonMonths: Array.isArray(a.season_months) ? a.season_months : null, ancestorSeasonMonths: ancestorSeason(a.parent), ...upCragFacts(a.parent) };
}

// Paged, filtered route search anywhere under an area's subtree (routes_in_subtree,
// migration 0015; grade/stars/pitches/length/sort added in 0018; gain, round trip, peak elevation,
// prominence and distance away in 0369) — backs
// "Route finder" and "View all N routes".
// `gradeSys` restricts a grade RANGE to rows whose grade_system says which scale grade_num is on
// (0196) — WI4 and 5.4 are both 4, so a range is only meaningful within one scale.
/** @param {string|number|null|undefined} areaId
 *  @param {Partial<Record<string, string|number|boolean|null|undefined|Record<string, Array<number|null>>>>} [opts] — the filters below; typed here on the JS side because a destructuring with `= {}` makes TypeScript infer only the fields that carry defaults */
export function useSubtreeRoutes(areaId, { q, disc, gradeSys, minGrade, maxGrade, gradeRanges, minStars, minPitches, minLengthM, maxLengthM, minGainFt, maxGainFt, minTripKm, maxTripKm, minElevFt, minPromFt, nearLat, nearLng, withinKm, sortBy, page = 0, pageSize = 40 } = {}) {
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["subtree-routes", areaId, q || "", disc || "", gradeSys || "", minGrade ?? "", maxGrade ?? "", gradeRanges ? JSON.stringify(gradeRanges) : "", minStars ?? "", minPitches ?? "", minLengthM ?? "", maxLengthM ?? "", minGainFt ?? "", maxGainFt ?? "", minTripKm ?? "", maxTripKm ?? "", minElevFt ?? "", minPromFt ?? "", nearLat ?? "", nearLng ?? "", withinKm ?? "", sortBy || "", page, pageSize],
    enabled: !!supabase && !!areaId,
    retry: false, // re-fires on every keystroke — fail fast instead of a slow, flickering retry storm
    queryFn: () => deviceFirstScan(areaId, () => offlineSubtreeRoutes(areaId, { q, disc, gradeSys, minGrade, maxGrade, gradeRanges, minStars, minPitches, minLengthM, maxLengthM, minGainFt, maxGainFt, minTripKm, maxTripKm, minElevFt, minPromFt, nearLat, nearLng, withinKm, sortBy, page, pageSize }), () => orOfflineExact(async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree", { root_id: areaId, q: q || null, disc: disc || null, grade_sys: gradeSys || null, min_grade: minGrade ?? null, max_grade: maxGrade ?? null, grade_ranges: gradeRanges || null, min_stars: minStars ?? null, min_pitches: minPitches ?? null, min_length_m: minLengthM ?? null, max_length_m: maxLengthM ?? null, min_gain_ft: minGainFt ?? null, max_gain_ft: maxGainFt ?? null, min_trip_km: minTripKm ?? null, max_trip_km: maxTripKm ?? null, min_elev_ft: minElevFt ?? null, min_prom_ft: minPromFt ?? null, near_lat: nearLat ?? null, near_lng: nearLng ?? null, within_km: withinKm ?? null, sort_by: sortBy || "name", lim: pageSize, off: page * pageSize });
      if (error) throw error;
      return data;
    }, () => offlineSubtreeRoutes(areaId, { q, disc, gradeSys, minGrade, maxGrade, gradeRanges, minStars, minPitches, minLengthM, maxLengthM, minGainFt, maxGainFt, minTripKm, maxTripKm, minElevFt, minPromFt, nearLat, nearLng, withinKm, sortBy, page, pageSize }))),
  });
}

export function useSubtreeRouteCount(areaId, { q, disc, gradeSys, minGrade, maxGrade, gradeRanges, minStars, minPitches, minLengthM, maxLengthM, minGainFt, maxGainFt, minTripKm, maxTripKm, minElevFt, minPromFt, nearLat, nearLng, withinKm } = {}) {
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["subtree-route-count", areaId, q || "", disc || "", gradeSys || "", minGrade ?? "", maxGrade ?? "", gradeRanges ? JSON.stringify(gradeRanges) : "", minStars ?? "", minPitches ?? "", minLengthM ?? "", maxLengthM ?? "", minGainFt ?? "", maxGainFt ?? "", minTripKm ?? "", maxTripKm ?? "", minElevFt ?? "", minPromFt ?? "", nearLat ?? "", nearLng ?? "", withinKm ?? ""],
    enabled: !!supabase && !!areaId,
    retry: false,
    queryFn: () => deviceFirstScan(areaId, () => offlineSubtreeRouteCount(areaId, { q, disc, gradeSys, minGrade, maxGrade, gradeRanges, minStars, minPitches, minLengthM, maxLengthM, minGainFt, maxGainFt, minTripKm, maxTripKm, minElevFt, minPromFt, nearLat, nearLng, withinKm }), () => orOfflineExact(async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree_count", { root_id: areaId, q: q || null, disc: disc || null, grade_sys: gradeSys || null, min_grade: minGrade ?? null, max_grade: maxGrade ?? null, grade_ranges: gradeRanges || null, min_stars: minStars ?? null, min_pitches: minPitches ?? null, min_length_m: minLengthM ?? null, max_length_m: maxLengthM ?? null, min_gain_ft: minGainFt ?? null, max_gain_ft: maxGainFt ?? null, min_trip_km: minTripKm ?? null, max_trip_km: maxTripKm ?? null, min_elev_ft: minElevFt ?? null, min_prom_ft: minPromFt ?? null, near_lat: nearLat ?? null, near_lng: nearLng ?? null, within_km: withinKm ?? null });
      if (error) throw error;
      return data;
    }, () => offlineSubtreeRouteCount(areaId, { q, disc, gradeSys, minGrade, maxGrade, gradeRanges, minStars, minPitches, minLengthM, maxLengthM, minGainFt, maxGainFt, minTripKm, maxTripKm, minElevFt, minPromFt, nearLat, nearLng, withinKm }))),
  });
}

// Areas (any depth) matching a name under a subtree — backs the "All areas" tree
// modal's filter box (areas_in_subtree, migration 0015), the DB-catalog
// equivalent of the static AreaTree's flat client-side name search.
//
// Rows carry `total`, the full match count BEFORE the limit (added in 0147). It is the
// same number on every row — a window function over the match set — so read it off the
// first row and never sum it. Callers must show it whenever it exceeds what came back:
// until 0147 the cut was alphabetical and silent, so typing "mount" in Washington
// returned A–G and stopped, and Mount Rainier read as absent from the catalog.
export function useAreaSearch(rootId, q0, lim = 40) {
  const [q, typing] = useDebouncedTerm(q0 || "");
  return withPending(useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: ["area-search", rootId, q || "", lim],
    enabled: !!supabase && !!rootId && !!(q || "").trim(),
    placeholderData: holdWhileTyping(q),
    retry: false,
    queryFn: () => deviceFirst(rootId, () => offlineAreaSearch(rootId, q, lim), () => orOfflineExact(async () => {
      const { data, error } = await supabase.rpc("areas_in_subtree", { root_id: rootId, q, lim });
      if (error) throw error;
      return data;
    }, () => offlineAreaSearch(rootId, q, lim))),
  }), typing);
}

// THE PHONE'S CLIMBS SEARCH reads only what is ON THIS DEVICE (owner 2026-11-18): every downloaded
// state and every climb saved to the trip pack (lib/offline.js deviceAreaSearch / deviceRouteSearch).
// No network at all, so it answers the same with no signal. `salt` is App's list of downloaded state
// names: a download finishing or a state removed starts a fresh read rather than serving the old one.
// A failed device read is an ERROR, never an empty list (check:read-failures).
export function useDeviceSearch(kind, q0, salt, lim = 40) {
  const [q, typing] = useDebouncedTerm(q0 || "");
  return withPending(useQuery({
    staleTime: 60 * 1000,
    queryKey: ["device-search", kind, q || "", lim, salt || ""],
    enabled: !!(q || "").trim(),
    placeholderData: holdWhileTyping(q),
    retry: false,
    queryFn: () => (kind === "routes" ? deviceRouteSearch(q, lim) : deviceAreaSearch(q, lim)),
  }), typing);
}
// Which downloaded states (and how many packed climbs) that search covers.
export function useDeviceSearchScope(salt) {
  return useQuery({ staleTime: 60 * 1000, queryKey: ["device-search-scope", salt || ""], retry: false, queryFn: deviceSearchScope });
}

// THE SAME SEARCH OVER THE WHOLE CATALOG, for a picker that must not make you name the state
// first. Add a climb hid its search box until a country AND a state were chosen, so the one box
// a climber saw on opening it was "Crag not listed? Type a new one" — typing "Jack Mountain"
// there filed a proposal for a NEW crag beside the existing peak.
// NOT areas_in_subtree: it takes one root, and over the `usa` root it hit the statement timeout
// on every term tried (2026-10-22: "jack mountain", "squamish", "castle rock" — all 57014). This
// reads the trigram-indexed `name_search` (0225) directly, with the Climbs tab's own spelling
// rules: every word of the query must appear in the name's every-spelling form, so "jack mtn"
// and "mt baker" match as the route finder's do. A second ask for the EXACT name in all its
// spellings (the findPlaces rule) runs beside it, so an exact match with no climbs yet is never
// cut by the broad ask's size order. Ranked exact, then starts-with, then the rest, each by size.
// Each row gains `trail`, its ancestors' names from the state down to the parent — two requests
// for the whole page, not a path walk per hit — so namesakes ("Castle Rock") can be told apart.
const CAT_SEL = "id,name,area_type,route_count,parent_id,path,name_search";
// The search itself, as a plain async function so a probe can replay it outside the browser
// (scripts/oneoff/audit-area-search.mjs). `db` is the client. A climber nickname typed whole
// ("rrg", "jtree") searches the full name (lib/search.js PLACE_NICKNAMES).
export async function searchCatalogAreas(q0, lim = 12, db = supabase) {
  const q = expandPlaceNickname(q0 || "");
  const toks = searchTokens(q);
  if (!db || toks.join("").length < 2) return { total: 0, rows: [] };
  let broad = db.from("areas").select(CAT_SEL, { count: "exact" });
  for (const t of toks) broad = broad.ilike("name_search", "%" + t + "%");
  const [b, e] = await Promise.all([
    broad.order("route_count", { ascending: false }).order("name").limit(60),
    db.from("areas").select(CAT_SEL).in("name_search", placeSpellings(toks)).order("route_count", { ascending: false }).limit(lim),
  ]);
  if (b.error) throw b.error;
  if (e.error) throw e.error;
  const cq = searchBare(searchCanon(q)), canon = (a) => searchBare(searchCanon(a.name));
  const tier = (a) => (canon(a) === cq ? 0 : canon(a).startsWith(cq) ? 1 : 2);
  const seen = new Set(), all = [];
  for (const a of [...(e.data || []), ...(b.data || [])]) if (!seen.has(a.id)) { seen.add(a.id); all.push(a); }
  let hits = all.map((a, i) => ({ a, i })).sort((x, y) => tier(x.a) - tier(y.a) || x.i - y.i).map((x) => x.a).slice(0, lim);
  const total = Math.max(b.count || 0, all.length);
  // A TYPO GETS A SECOND CHANCE, AND ONLY A TYPO — the route finder's rule (search_names_fuzzy, 0190).
  // "yosemitie", "squamsih", "joshau tree" matched nothing here (audit 2026-11-14) while the old
  // one-state box found two of them. Only when nothing matched, never at three letters or fewer, and
  // the rows come back marked `fuzzy` so the screen can say "Closest names", not claim a match.
  let fuzzy = false;
  if (!hits.length && toks.join("").length > 3) {
    const fz = await db.rpc("search_names_fuzzy", { q, lim });
    if (fz.error) throw fz.error;
    const near = (fz.data || []).filter((x) => x.kind === "area");
    if (near.length) {
      const { data: rows, error } = await db.from("areas").select(CAT_SEL).in("id", near.map((x) => x.id));
      if (error) throw error;
      const order = new Map(near.map((x, i) => [x.id, i]));
      hits = (rows || []).sort((x, y) => order.get(x.id) - order.get(y.id));
      fuzzy = hits.length > 0;
    }
  }
  const chainOf = (a) => String(a.path || "").split(".").filter(Boolean).slice(1, -1);
  const ancIds = [...new Set(hits.flatMap(chainOf))];
  const { data: anc, error: ancErr } = ancIds.length ? await db.from("areas").select("id,name").in("id", ancIds) : { data: [] };
  if (ancErr) throw ancErr;
  const nameOf = Object.fromEntries((anc || []).map((a) => [a.id, a.name]));
  return { total: fuzzy ? hits.length : total, fuzzy, rows: hits.map((h) => ({ id: h.id, name: h.name, area_type: h.area_type, route_count: h.route_count, parent_id: h.parent_id, path: h.path, trail: chainOf(h).map((id) => nameOf[id]).filter(Boolean) })) };
}
export function useCatalogAreaSearch(q0, lim = 12) {
  const [q, typing] = useDebouncedTerm((q0 || "").trim());
  const toks = searchTokens(q || "");
  return withPending(useQuery({
    queryKey: ["catalog-area-search", toks.join(" "), lim],
    enabled: !!supabase && toks.join("").length >= 2,
    placeholderData: holdWhileTyping(q),
    retry: false,
    queryFn: () => searchCatalogAreas(q, lim),
  }), typing);
}

// The point an area stands for (0396 area_point): its own coordinate, else its descendants' average,
// else its nearest ancestor's. Groups Discover measures "near <place>" from it. null when the area
// has no coordinate anywhere in its line; a failed read is an error, not "nowhere".
export function useAreaPoint(areaId) {
  return useQuery({
    queryKey: ["area-point", areaId],
    enabled: !!supabase && !!areaId,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_point", { aid: areaId });
      if (error) throw error;
      const p = (data || [])[0];
      return p && p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;
    },
  });
}

// How many areas matched in total, and how many of them are on screen. `total` is absent
// on a pre-0147 function (the column did not exist), so fall back to the row count rather
// than rendering "40 of undefined" — a client that ships ahead of its migration must
// degrade to saying less, never to saying something false.
export function areaSearchTotal(rows) {
  if (!rows || !rows.length) return 0;
  const t = rows[0].total;
  return Number.isFinite(Number(t)) ? Number(t) : rows.length;
}

// Peaks with routes inside a bounding box — backs NEARBY PEAKS on the area page.
//
// This deliberately does NOT reuse useNearbyAreas, and the reason is measured rather than
// stylistic. That hook fetches peaks AND crags ordered by `route_count desc`, capped at 500.
// Around Mount Stuart that cap is REACHED — the box comes back with exactly 500 rows, most of
// them Icicle Creek boulders — so the 500 you get are the highest-route-count areas in the
// box, not the nearest. A neighbouring peak holding one route sorts at the tail and can be
// truncated away before the caller ever gets to rank by distance. That is the
// `resultRecordCount without a meaningful orderByFields` shape check:fire already records:
// a capped query whose ordering answers a different question than the caller is asking.
//
// Filtering to peaks-with-routes server-side collapses the same box to 41 rows (91 around
// Baker), so the cap stops being reachable and the distance ranking sees everything. No
// ordering is requested because the caller sorts by great-circle distance itself; the limit
// is a runaway backstop, not a selection.
export function useNearbyPeaks(bounds) {
  return useQuery({
    queryKey: ["nearby-peaks", bounds && [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].map(n => n.toFixed(2)).join(",")],
    enabled: !!supabase && !!bounds,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*")
        .gte("lat", bounds.minLat).lte("lat", bounds.maxLat)
        .gte("lng", bounds.minLng).lte("lng", bounds.maxLng)
        .eq("area_type", "peak").gt("route_count", 0)
        .limit(400);
      if (error) throw error;
      return { rows: data };
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
//
// ONLY THE COLUMNS THE MAP DRAWS. With select("*") a state-wide view (Washington's box holds ~3,900
// peaks and crags) sorted every wide row — blurbs, approach prose, jsonb — and timed out ("canceling
// statement due to statement timeout"), so the map opened on a state showed nothing. Measured
// 2026-11-11 over that box: select("*") timed out with or without the count; these columns with the
// exact count answered in ~360 ms. Rows are marked `_narrow` so opening one (DbAreaBrowser
// jumpToArea) loads the full row before the area page renders it.
const NEARBY_AREA_COLS = "id,name,lat,lng,route_count,dominant_discipline,disciplines,path,area_type,parent_id";
export function useNearbyAreas(bounds) {
  return useQuery({
    queryKey: ["nearby-areas", bounds && [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].map(n => n.toFixed(2)).join(","), "narrow"],
    enabled: !!supabase && !!bounds,
    // THE COUNT IS ITS OWN READ (2026-11-18). Over the whole country an exact count of every peak and
    // crag took 2.3 s on a cold cache against the 3 s anon limit, and asked in the same request as the
    // rows (0.2 s) it took the rows down with it: the map said "Couldn't load nearby areas" on Home's
    // Near me, which opens on the country. Now a slow or failed count only leaves `total` null (the
    // "busiest N of M" line and Home's "See all M" then go unsaid); the rows decide success.
    // The rows themselves can time out too on a cold cache over a whole-country box (measured
    // 2026-11-18: 57014 at 3.5 s, then 0.2 s once warm), and the app-wide rule never retries a
    // timeout. This read is retried ONCE on a statement timeout: the first attempt warms the pages
    // the second reads. The count runs AFTER the rows, so the two never compete for the same cold
    // pages, and its failure is not this query's failure.
    retry: (n, err) => n < 1 && !!err && err.code === "57014",
    retryDelay: 300,
    queryFn: async () => {
      const box = (q) => q.gte("lat", bounds.minLat).lte("lat", bounds.maxLat).gte("lng", bounds.minLng).lte("lng", bounds.maxLng).in("area_type", ["peak", "crag"]);
      const rowsRes = await box(supabase.from("areas").select(NEARBY_AREA_COLS)).order("route_count", { ascending: false }).limit(500);
      if (rowsRes.error) throw rowsRes.error;
      const rows = rowsRes.data || [];
      let total = rows.length < 500 ? rows.length : null;
      if (total == null) {
        const countRes = await box(supabase.from("areas").select("id", { count: "exact", head: true }));
        if (!countRes.error && countRes.count != null) total = countRes.count;
      }
      return { rows: rows.map((r) => ({ ...r, _narrow: true })), total };
    },
  });
}

// THE AREA THE MAP WAS OPENED FROM, as the map draws it (owner, 2026-11-23: "When you are on a certain
// area, peak, crag etc and click on view map, it should be highlighted on the map"). Every peak and
// crag under it (the area itself included, `cd` is <@, descendant-or-self) with a coordinate: the map
// frames them on open (NearMePanel), its bullseye included. Busiest first and capped, like the viewport
// read; a state's ~4k pins are framed well by the busiest 1,000. Only the points and their climb counts are read
// (the frame is where the climbs are: climbCore in NearMePanel). A failed read
// is an error, never "no footprint": the map then opens as it did before, on the area's own point.
export function useAreaFootprint(area) {
  const path = area && area.path;
  return useQuery({
    queryKey: ["area-footprint", path || null],
    enabled: !!supabase && !!path,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("lat,lng,route_count")
        .filter("path", "cd", path).in("area_type", ["peak", "crag"]).not("lat", "is", null).not("lng", "is", null)
        .order("route_count", { ascending: false }).limit(1000);
      if (error) throw error;
      return { points: (data || []).filter((r) => r.lat != null && r.lng != null) };
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
    // Keyed on the ids ONLY (2026-11-14): the rows are the same for every area, so one read serves
    // every area page a climber opens, and each page filters the cached rows to its subtree in
    // `select`. Keyed on the area as well, each area visit re-read every saved climb in full.
    queryKey: ["scoped-wishlist", ids.slice().sort().join(",")],
    enabled: !!supabase && !!area && ids.length > 0,
    select: (rows) => rows.filter(r => r.areas && r.areas.path && area && (r.areas.path === area.path || r.areas.path.startsWith(area.path + "."))),
    queryFn: async () => {
      const { data, error } = await supabase.from("routes")
        // `path` alone is all the ltree filter below needs, and selecting only `path` is what
        // put the literal word "undefined" on the route page. `dbRouteToCamel` builds `_dbArea`
        // from `r.areas` whenever it is TRUTHY, so a path-only embed yields an area object with
        // no `name` -- and because it is truthy, openRoute's async backfill (`!x._dbArea`) is
        // skipped, so it never repairs. Observed live: a wishlisted route opened from search
        // rendered "UNDEFINED" where the peak name goes, permanently. Ask for the same area
        // fields the sibling `useRoutesByIds` asks for, plus `path`.
        .select("*, areas(path,name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,approach,approach_min,rock,rock_basis,aspect,parking_lat,parking_lng,parking_name,parking_note,season_months,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note,parent:parent_id(id,name,area_type,season_months,approach,approach_min,parking_lat,parking_lng,parking_name,parking_note)))))")
        .in("id", ids);
      if (error) throw error;
      return data || [];
    },
  });
}

// Unscoped route lookup by id — backs Home/Logbook wishlist views, which (unlike
// ObjectivesPanel) aren't rendered within a single area and so can't filter by path.
// THE OFFLINE FALLBACK IS WHAT MAKES THE TRIP PACK REAL. Every route the pack, the wishlist
// and the logbook resolve comes through here, so with no signal this query failed and
// `dbRouteById` was empty — the pack rendered `routeById(id)` as undefined and dropped every
// row, i.e. a climber who had packed six climbs opened the app at the trailhead and saw an
// empty pack. Packing writes the row (lib/offline.js `packRouteOffline`); this is the read.
//
// Deliberately partial-tolerant, unlike the sibling readers: `offlineRoutesByIds` returns the
// ids it HAS, so six packed routes still resolve when a seventh wishlisted one was never
// stored. orOffline only substitutes on a non-empty result, so a query for ids none of which
// are on the device still surfaces the network error rather than reading as "no such routes".
//
// `{ partialIsFailure: true }` (App's own logs/lists read only) turns that off: a reader that tells
// the climber which of THEIR climbs could not be loaded must not take a partial offline answer as
// the whole one. With it on, the few climbs saved offline came back as a SUCCESS, the persisted
// query cache kept that partial answer across reloads, and every logged climb missing from it read
// "no longer in the catalog" (found testing real logs, 2026-11-11). Under the option only an
// offline answer covering EVERY id succeeds; otherwise the read fails (errors are never persisted)
// and carries the rows the device does have as `partialRows`, which App still shows, so what is
// missing reads "Couldn't load", with a retry. Its own cache key keeps the two behaviours apart.
export function useRoutesByIds(ids, { partialIsFailure = false } = {}) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    staleTime: CATALOG_STALE_MS,
    queryKey: partialIsFailure ? ["routes-by-ids", key, "strict"] : ["routes-by-ids", key],
    enabled: !!supabase && !!(ids || []).length,
    // The key is the whole id set, so saving or removing ONE objective starts a new query.
    // Without this the rows already in hand vanished until it landed, and on a slow day
    // Logbook › Objectives said "Nothing here yet" over a list of saved climbs.
    placeholderData: (prev) => prev,
    queryFn: !partialIsFailure ? () => orOffline(async () => {
      const { data, error } = await supabase
        .from("routes").select(ROUTE_AREA_EMBED)
        .in("id", ids);
      if (error) throw error;
      return data;
    }, () => offlineRoutesByIds(ids)) : async () => {
      try {
        const { data, error } = await supabase
          .from("routes").select(ROUTE_AREA_EMBED)
          .in("id", ids);
        if (error) throw error;
        return data;
      } catch (err) {
        let local = null;
        try { local = await offlineRoutesByIds(ids); } catch (e) { /* the network error stands */ }
        if (Array.isArray(local) && local.length && new Set(local.map((r) => r && r.id)).size >= new Set(ids).size) return local;
        const e = err instanceof Error ? err : new Error((err && err.message) || "Couldn't load these climbs");
        e.partialRows = Array.isArray(local) ? local : [];
        throw e;
      }
    },
  });
}
