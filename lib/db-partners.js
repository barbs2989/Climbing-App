// lib/db-partners.js — finding partners: by objective, area listings (0300), route listings (0489), profile search, crew requests, profiles by id.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQueries, useQuery } from "@tanstack/react-query";
import { invalidateKeys, patchQueries } from "./queryClientRef";
import { supabase } from "./supabase";
import { useLiveQuery } from "./live";
import { offlinePackProfiles } from "./offline";
import { FULL_PROFILE_COLS, PARTNER_COLS, profileCols } from "./profileCols";
import { holdWhileTyping, orOfflineExact, useDebouncedTerm, withPending } from "./db-shared.js";
import { CATALOG_STALE_MS } from "./db-catalog.js";
import { sessionUid } from "./db-profile.js";

// Discoverable climbers within `radiusMi` of an origin, nearest first, each with `dist_mi` rounded
// UP to the next 5 miles. The origin is used for this query and stored nowhere. The key rounds the
// origin to 2 decimals (~1 km) so a phone's jitter does not refetch on every reading.
export function usePartnersNear(origin, radiusMi, enabled) {
  const lat = origin && Number.isFinite(origin.lat) ? Math.round(origin.lat * 100) / 100 : null;
  const lng = origin && Number.isFinite(origin.lng) ? Math.round(origin.lng * 100) / 100 : null;
  return useQuery({
    queryKey: ["partners-near", lat, lng, radiusMi],
    enabled: !!supabase && !!enabled && lat != null && lng != null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partners_near", { p_lat: lat, p_lng: lng, p_radius_mi: radiusMi, p_limit: 50 });
      if (error) throw error;
      return data || [];
    },
  });
}

// Discoverable climbers who saved one of `routeIds` as an objective, or any route filed under
// `areaId` (0211) -- My Objectives / By Route / By Area. Most shared objectives first. With an
// origin it is also a radius search on the same terms as partners_near, and climbers with no zip
// drop out; without one, dist_mi is null. Each row carries shared_route_ids (up to 20) and
// shared_count, so the card can say WHY this climber was found.
export function usePartnersByObjective(routeIds, areaId, origin, radiusMi, enabled) {
  const ids = Array.isArray(routeIds) && routeIds.length ? [...new Set(routeIds.map(String))].sort().slice(0, 500) : null;
  const area = areaId || null;
  const lat = origin && Number.isFinite(origin.lat) ? Math.round(origin.lat * 100) / 100 : null;
  const lng = origin && Number.isFinite(origin.lng) ? Math.round(origin.lng * 100) / 100 : null;
  return useQuery({
    queryKey: ["partners-by-objective", ids, area, lat, lng, lat != null ? radiusMi : null],
    enabled: !!supabase && !!enabled && (!!ids || !!area),
    queryFn: async () => {
      const args = { p_route_ids: ids, p_area_id: area, p_limit: 50 };
      if (lat != null && lng != null) Object.assign(args, { p_lat: lat, p_lng: lng, p_radius_mi: radiusMi });
      const { data, error } = await supabase.rpc("partners_by_objective", args);
      if (error) throw error;
      return data || [];
    },
  });
}

// ── partner_areas (0300): a climber LISTS THEMSELVES AT AN AREA, and crag partners are found by area ──
// The table is owner-only. Every cross-climber read is a definer RPC that applies the discoverable
// opt-out and the block list (partners_in_area, partners_for_my_areas, partner_area_counts,
// partner_areas_of_users). Reachability is two-way on the area tree: a listing at Wasatch surfaces at
// Hellgate (listed_above=true), a listing at Hellgate surfaces at Wasatch.
// Where nobody may list themselves (the partner_areas trigger refuses the same three, 0542): the world, a country, and a
// STATE OR PROVINCE (owner note, 2026-11-25: "too broad"). A state stays SEARCHABLE (By Area on Utah finds everyone listed
// inside it); a listing must name a region, range, canyon, crag, wall or peak. Every List-me control reads this one set.
export const UNLISTABLE_AREA_TYPES = new Set(["world", "country", "state"]);
const partnerAreaReaders = (userId) => [["my-partner-areas", userId], ["partners-in-area"], ["partners-for-my-areas"], ["partner-area-counts"], ["partner-areas-of-users"]];
const PARTNER_AREA_SELECT = "id,area_id,disciplines,free_from,free_to,note,created_at,areas(name,area_type,path)";
const partnerAreaRow = (r) => ({ id: r.id, areaId: r.area_id, name: (r.areas && r.areas.name) || r.area_id, areaType: (r.areas && r.areas.area_type) || null, path: (r.areas && r.areas.path) || null, disciplines: r.disciplines || [], freeFrom: r.free_from || null, freeTo: r.free_to || null, note: r.note || "", createdAt: r.created_at || null });
// My own listings, with the area's name, type and ltree path (the path feeds compat()'s shared-areas term).
export function useMyPartnerAreas(userId) {
  return useQuery({
    queryKey: ["my-partner-areas", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_areas").select(PARTNER_AREA_SELECT).eq("user_id", userId);
      if (error) throw error;
      return (data || []).map(partnerAreaRow);
    },
  });
}
// Upsert one listing. Returns the stored row so the caller reflects what the server holds — an
// insert RLS refuses comes back as an empty array, which this turns into an error (setDiscoverable's rule).
/** @param {string} userId @param {{ areaId: string, disciplines?: string[], freeFrom?: string | null, freeTo?: string | null, note?: string | null }} listing */
export async function savePartnerArea(userId, { areaId, disciplines, freeFrom, freeTo, note }) {
  if (!supabase || !userId) throw new Error("not signed in");
  const row = { user_id: userId, area_id: areaId, disciplines: Array.isArray(disciplines) ? disciplines : [], free_from: freeFrom || null, free_to: freeTo || null, note: note ? String(note).slice(0, 140) : null };
  const { data, error } = await supabase.from("partner_areas").upsert(row, { onConflict: "user_id,area_id" }).select(PARTNER_AREA_SELECT);
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("the listing was not stored");
  invalidateKeys(partnerAreaReaders(userId));
  return partnerAreaRow(data[0]);
}
// LIST ME, and nothing else: an insert that leaves an existing listing exactly as it is (addRouteListing's rule,
// for areas). The one-tap List me buttons used savePartnerArea, an upsert of a whole row, so a tap made while the
// climber's own listings were loading or had failed to load — when the button reads "not listed" — wrote blank
// dates, a blank note and no climbing types over the stored ones (review 2026-11-23).
export async function addPartnerArea(userId, areaId, disciplines) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase.from("partner_areas").upsert({ user_id: userId, area_id: areaId, disciplines: Array.isArray(disciplines) ? disciplines : [] }, { onConflict: "user_id,area_id", ignoreDuplicates: true }).select(PARTNER_AREA_SELECT);
  if (error) throw error;
  invalidateKeys(partnerAreaReaders(userId));
  return Array.isArray(data) && data[0] ? partnerAreaRow(data[0]) : null;
}
export async function removePartnerArea(userId, areaId) {
  if (!supabase || !userId) throw new Error("not signed in");
  // OPTIMISTIC: the listing leaves my cached listings now, so both callers' lists move on the tap.
  const undo = patchQueries(["my-partner-areas", userId], (d) => Array.isArray(d) ? d.filter((l) => l.areaId !== areaId) : d);
  try {
    const { error } = await supabase.from("partner_areas").delete().eq("user_id", userId).eq("area_id", areaId);
    if (error) throw error;
  } catch (e) { undo(); throw e; }
  invalidateKeys(partnerAreaReaders(userId));
}

// ── route_partner_listings (0489): a climber LISTS THEMSELVES AS A PARTNER FOR ONE ROUTE ──
// The route-level half of partner_areas, for every route that is not a crag route (those list by area).
// Owner-only table; the one cross-climber read is partners_by_objective, which returns a listed climber
// first with `listed`, `listing_note`, `free_from`, `free_to` under the discoverable + block gate. So a
// write here refreshes that search as well as my own list — the route page and the finder both read it.
const routeListingReaders = (userId) => [["my-route-listings", userId], ["partners-by-objective"]];
const ROUTE_LISTING_SELECT = "route_id,free_from,free_to,note,created_at,routes(name,grade)";
const routeListingRow = (r) => ({ routeId: r.route_id, name: (r.routes && r.routes.name) || r.route_id, grade: (r.routes && r.routes.grade) || null, freeFrom: r.free_from || null, freeTo: r.free_to || null, note: r.note || "", createdAt: r.created_at || null });
// My own route listings, with the route's name and grade for the list that manages them.
export function useMyRouteListings(userId) {
  return useQuery({
    queryKey: ["my-route-listings", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("route_partner_listings").select(ROUTE_LISTING_SELECT).eq("user_id", userId);
      if (error) throw error;
      return (data || []).map(routeListingRow);
    },
  });
}
// Upsert one listing. Returns the stored row — an insert RLS refuses comes back as an empty array,
// which this turns into an error (savePartnerArea's rule), so the screen never says Listed over nothing.
/** @param {string} userId @param {{ routeId: string, freeFrom?: string | null, freeTo?: string | null, note?: string | null }} listing */
export async function saveRouteListing(userId, { routeId, freeFrom, freeTo, note }) {
  if (!supabase || !userId) throw new Error("not signed in");
  const row = { user_id: userId, route_id: routeId, free_from: freeFrom || null, free_to: freeTo || null, note: note ? String(note).slice(0, 140) : null };
  const { data, error } = await supabase.from("route_partner_listings").upsert(row, { onConflict: "user_id,route_id" }).select(ROUTE_LISTING_SELECT);
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("the listing was not stored");
  invalidateKeys(routeListingReaders(userId));
  return routeListingRow(data[0]);
}
// LIST ME, and nothing else: an insert that leaves an existing listing exactly as it is. The box's List me
// button used saveRouteListing, an upsert of a bare row, so a tap made while the climber's own listings were
// still loading (the box reads "not listed" then) wrote null dates and a null note over the stored ones
// (review of 0489, 2026-11-23). Returns the new row, or null when a listing was already there.
export async function addRouteListing(userId, routeId) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase.from("route_partner_listings").upsert({ user_id: userId, route_id: routeId }, { onConflict: "user_id,route_id", ignoreDuplicates: true }).select(ROUTE_LISTING_SELECT);
  if (error) throw error;
  invalidateKeys(routeListingReaders(userId));
  return Array.isArray(data) && data[0] ? routeListingRow(data[0]) : null;
}
export async function removeRouteListing(userId, routeId) {
  if (!supabase || !userId) throw new Error("not signed in");
  // OPTIMISTIC: the listing leaves my cached listings now, so the route page and My areas move on the tap.
  const undo = patchQueries(["my-route-listings", userId], (d) => Array.isArray(d) ? d.filter((l) => l.routeId !== routeId) : d);
  try {
    const { error } = await supabase.from("route_partner_listings").delete().eq("user_id", userId).eq("route_id", routeId);
    if (error) throw error;
  } catch (e) { undo(); throw e; }
  invalidateKeys(routeListingReaders(userId));
}
const roundedOrigin =(origin) => ({
  lat: origin && Number.isFinite(origin.lat) ? Math.round(origin.lat * 100) / 100 : null,
  lng: origin && Number.isFinite(origin.lng) ? Math.round(origin.lng * 100) / 100 : null,
});
// The same search over SEVERAL areas at once — the climber's saved areas (Partners › Saved areas). One
// partners_in_area read per area, under that hook's own key, so a listing write invalidates both and a
// saved area already searched alone is not read twice. Merged by climber: the nearest distance wins, a
// listing at or inside an area beats one only across a wider area, and `via_area_ids` names which of the
// asked areas matched. Saved areas stay owner-only (saved_areas RLS): only who LISTED is ever returned.
export function usePartnersInAreas(areaIds, origin, radiusMi, enabled, limit = 50) {
  const { lat, lng } = roundedOrigin(origin);
  const ids = [...new Set((areaIds || []).filter(Boolean))];
  const results = useQueries({
    queries: ids.map(areaId => ({
      queryKey: ["partners-in-area", areaId, lat, lng, lat != null ? radiusMi : null, limit],
      enabled: !!supabase && !!enabled,
      queryFn: async () => {
        const args = { p_area_id: areaId, p_limit: limit };
        if (lat != null && lng != null) Object.assign(args, { p_lat: lat, p_lng: lng, p_radius_mi: radiusMi });
        const { data, error } = await supabase.rpc("partners_in_area", args);
        if (error) throw error;
        return data || [];
      },
    })),
  });
  const byId = new Map();
  results.forEach((r, i) => {
    for (const p of (r && r.data) || []) {
      const was = byId.get(p.id);
      if (!was) { byId.set(p.id, { ...p, via_area_ids: [ids[i]] }); continue; }
      was.via_area_ids.push(ids[i]);
      if (p.dist_mi != null && (was.dist_mi == null || p.dist_mi < was.dist_mi)) was.dist_mi = p.dist_mi;
      if (!p.listed_above) was.listed_above = false;
    }
  });
  const data = [...byId.values()].sort((a, b) => (b.via_area_ids.length - a.via_area_ids.length) || ((a.listed_above ? 1 : 0) - (b.listed_above ? 1 : 0)) || ((a.dist_mi == null ? Infinity : a.dist_mi) - (b.dist_mi == null ? Infinity : b.dist_mi)));
  return {
    data,
    isLoading: !!enabled && results.some(r => r.isLoading),
    // A failed read of ANY area must not read as "nobody listed there".
    error: (results.find(r => r.error) || {}).error || null,
  };
}
// Climbers listed at `areaId`, inside it, or across an area that contains it. Same optional origin +
// radius as partners_near; without one dist_mi is null and nobody drops out for having no zip.
export function usePartnersInArea(areaId, origin, radiusMi, enabled, limit = 50) {
  const { lat, lng } = roundedOrigin(origin);
  return useQuery({
    queryKey: ["partners-in-area", areaId || null, lat, lng, lat != null ? radiusMi : null, limit],
    enabled: !!supabase && !!enabled && !!areaId,
    queryFn: async () => {
      const args = { p_area_id: areaId, p_limit: limit };
      if (lat != null && lng != null) Object.assign(args, { p_lat: lat, p_lng: lng, p_radius_mi: radiusMi });
      const { data, error } = await supabase.rpc("partners_in_area", args);
      if (error) throw error;
      return data || [];
    },
  });
}
// "Near my areas": climbers whose listings overlap any of the caller's. Empty when the caller has
// listed nowhere — the screen shows the "List me here" banner on that, not on a failed read.
export function usePartnersForMyAreas(origin, radiusMi, enabled) {
  const { lat, lng } = roundedOrigin(origin);
  return useQuery({
    queryKey: ["partners-for-my-areas", lat, lng, lat != null ? radiusMi : null],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const args = { p_limit: 50 };
      if (lat != null && lng != null) Object.assign(args, { p_lat: lat, p_lng: lng, p_radius_mi: radiusMi });
      const { data, error } = await supabase.rpc("partners_for_my_areas", args);
      if (error) throw error;
      return data || [];
    },
  });
}
// "12 climbers listed here" for up to 50 areas in one call, keyed by area id.
export function usePartnerAreaCounts(areaIds, enabled = true) {
  const ids = [...new Set((areaIds || []).filter(Boolean))].sort().slice(0, 50);
  return useQuery({
    queryKey: ["partner-area-counts", ids.join(",")],
    enabled: !!supabase && enabled && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partner_area_counts", { p_area_ids: ids });
      if (error) throw error;
      const out = {};
      ids.forEach((id) => { out[id] = 0; });
      (data || []).forEach((r) => { out[r.area_id] = Number(r.listed_count) || 0; });
      return out;
    },
  });
}
export function usePartnerAreaCount(areaId, enabled = true) {
  const q = usePartnerAreaCounts(areaId ? [areaId] : [], enabled);
  return { ...q, data: q.data && areaId ? q.data[areaId] : undefined };
}
// The listings of several climbers in ONE read, keyed by user id (the useObjectivesOfUsers analogue):
// every real row on screen gets its "Listed at Hellgate · Sport" line and its area paths for compat()
// from here. A climber with none is present as [], so "has no listings" differs from "was not read".
export function usePartnerAreasOfUsers(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort().slice(0, 200);
  return useQuery({
    queryKey: ["partner-areas-of-users", ids.join(",")],
    enabled: !!supabase && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partner_areas_of_users", { p_ids: ids });
      if (error) throw error;
      const by = {};
      ids.forEach((id) => { by[id] = []; });
      (data || []).forEach((r) => { (by[r.user_id] = by[r.user_id] || []).push({ areaId: r.area_id, name: r.area_name, areaType: r.area_type, path: r.area_path, disciplines: r.disciplines || [], freeFrom: r.free_from || null, freeTo: r.free_to || null, note: r.note || null }); });
      return by;
    },
  });
}
// The objectives that STILL COUNT for a match (0300): a crag-route objective is a tick list, not a
// partner signal, so this is what feeds compat() instead of useObjectivesOfUsers. Same shape.
export function useMatchObjectivesOfUsers(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort().slice(0, 200);
  return useQuery({
    queryKey: ["match-objectives-of-users", ids.join(",")],
    enabled: !!supabase && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("match_objectives_of_users", { p_ids: ids });
      if (error) throw error;
      const by = {};
      ids.forEach((id) => { by[id] = []; });
      (data || []).forEach((r) => { (by[r.user_id] = by[r.user_id] || []).push(r.route_id); });
      return by;
    },
  });
}

// Every cached reader of profiles, refreshed after each write to it (check:write-readers).
export const profilesReaders = [["my-restricted"], ["partner-genders"], ["partner-climb-grades"], ["partner-free-until"], ["people-you-may-know"], ["my-home-area"], ["discoverable-profiles"], ["profile-search"], ["full-profile"], ["profiles-by-ids"], ["contribution-standings"], ["open-route-flags"], ["policy-acceptance"], ["my-connections"], ["my-blocked"], ["is-admin"], ["can-review"], ["desk-climbers"]];
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
  invalidateKeys(profilesReaders);
  return data[0];
}

// Write the photo-strip visibility preference. Same shape as setDiscoverable above, and the
// same reason for re-reading what the server stored: an RLS-rejected PATCH is a 200 with an
// empty array, indistinguishable from success unless the row count is checked.
export async function setPhotosPublic(userId, value) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase
    .from("profiles").update({ photos_public: !!value }).eq("id", userId).select("id,photos_public");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("the update matched no profile row");
  invalidateKeys(profilesReaders);
  return data[0];
}

export function useProfileSearch(q) {
  const [qq, typing] = useDebouncedTerm((q || "").trim());
  return withPending(useQuery({
    queryKey: ["profile-search", qq],
    enabled: !!supabase && !!qq,
    placeholderData: holdWhileTyping(qq),
    queryFn: async () => {
      // By @handle, or by name only where the climber shows it: matching a hidden real name would tell
      // the searcher whose handle it is (0434 makes the hidden name unreadable anyway).
      // "@" alone, or only punctuation, strips to nothing: the pattern would be `**`, which matches
      // EVERY profile and listed 8 arbitrary climbers under a crew-invite or partner field.
      const term = qq.replace(/^@/, "").replace(/[^\p{L}\p{N} _'-]/gu, " ").trim();
      if (!term) return [];
      const pat = `*${term}*`;
      const { data, error } = await supabase.from("profiles").select(profileCols(PARTNER_COLS, !!(await sessionUid())))
        .or(`public_name.ilike.${pat},username.ilike.${pat}`).limit(8);
      if (error) throw error;
      return data;
    },
  }), typing);
}

// Pending crew invites addressed to a real signed-in user - the accept/decline
// side of useProfileSearch-based invites. Joins the crew row so the invite card
// can show which route/dates without a second round trip.
// LIVE (walkthrough 2026-11-18: Avery's invite reached Blake's open tab only after a reload). crew_members
// is on Realtime since 0448; a row for you (a new invite) or for a crew you hold refetches this.
// THE ACCESS POINT THE OTHER CLIMBS ON THIS AREA AGREE ON (walkthrough 2026-11-18: The Barber Pole stores no road, no trailhead
// pin, and Liberty Bell Mountain no parking; the Beckey Route beside it names Blue Lake Trailhead). One row, and only
// asked while a crew's Meet-up sheet is open, so it costs nothing on the Crews tab.
export function useAreaAccessPoint(areaId) {
  return useQuery({
    queryKey: ["area-access-point", areaId],
    enabled: !!supabase && !!areaId,
    staleTime: CATALOG_STALE_MS,
    queryFn: async () => {
      // Only when every climb here that names an access point names the SAME one: Liberty Bell's climbs start from
      // Blue Lake Trailhead OR an East Face pullout, and the first row found would send a crew to the wrong one.
      const { data, error } = await supabase.from("routes").select("road").eq("area_id", areaId).not("road", "is", null).limit(50);
      if (error) throw error;
      const names = [...new Set((data || []).map((x) => x && x.road && typeof x.road.name === "string" ? x.road.name.trim() : "").filter(Boolean))];
      return names.length === 1 ? names[0] : null;
    },
  });
}
// THE CREWS I HAVE ASKED TO JOIN and not heard back from: my own pending crew_members rows. A pending requester
// cannot read the crews row (0180), so useMyCrews never returns these, and "Requested" lived in session state
// alone: after a reload the button read "Request join" again and nothing could withdraw (review 2026-11-23).
export function useMyCrewRequests(userId) {
  return useQuery({
    queryKey: ["my-crew-requests", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crew_members").select("crew_id,joined_at").eq("user_id", userId).eq("status", "pending");
      if (error) throw error;
      return (data || []).map((r) => r.crew_id);
    },
  });
}
export function useMyCrewInvites(userId) {
  return useLiveQuery({
    queryKey: ["my-crew-invites", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        // crews(*, crew_members(status)): the invite card says how many are already in (an invitee reads the
        // roster -- 0426), not who; names stay on the crew card once you have answered.
        .from("crew_members").select("*, crews(*, crew_members(status))")
        .eq("user_id", userId).eq("status", "invited");
      if (error) throw error;
      return data;
    },
  }, [
    { table: "crew_members", match: (row) => row.user_id === userId, cached: (old, data) => Array.isArray(data) && data.some((r) => r && r.crew_id === old.crew_id) },
  ]);
}
// WHICH OF YOUR CREWS HAVE ANY CHAT MESSAGE (walkthrough 2026-11-18). Ready up's "Said hi in crew chat" read only
// the messages already loaded on this device -- a crew's chat loads when you open it -- so after a reload both
// climbers who had chatted read "next: said hi". One row per crew, by crew_id: cheap, and enough to say yes.
export function useCrewHasMessages(crewIds) {
  const ids = [...new Set((crewIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["crew-has-messages", ids.join(",")],
    enabled: !!supabase && ids.length > 0,
    staleTime: 60000,
    queryFn: async () => {
      const out = {};
      await Promise.all(ids.map(async (id) => {
        const { data, error } = await supabase.from("crews_messages").select("id").eq("crew_id", id).limit(1);
        if (error) throw error;
        out[id] = !!(data && data.length);
      }));
      return out;
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
        .from("contributions").select("*, routes(name, area_id), areas(name)")
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
      // Your own row in full; anyone else's through the columns you may read (0434).
      const me = await sessionUid();
      const { data, error } = me === userId
        ? await supabase.rpc("my_profile").single()
        : await supabase.from("profiles").select(profileCols(FULL_PROFILE_COLS, !!me)).eq("id", userId).single();
      if (error) throw error;
      return /** @type {any} */ (data);
    },
  });
}

export function useProfilesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["profiles-by-ids", key],
    enabled: !!supabase && !!key,
    // No signal: the reporters of a PACKED route's saved trip reports were stored with them, already
    // mapped by fetchProfilesByIds below, so their names render exactly as they do online.
    queryFn: () => orOfflineExact(() => fetchProfilesByIds(ids), () => offlinePackProfiles(ids)),
  });
}
export async function fetchProfilesByIds(ids) {
      const { data, error } = await supabase
        .from("profiles").select(profileCols("id,name,avatar,show_name,username,availability,avail_week", !!(await sessionUid()))).in("id", ids);
      if (error) throw error;
      // NAME THE CLIMBER THE WAY THEY ASKED TO BE NAMED. 0175 made "Show my real name publicly"
      // real, and pubName() honours it — but it reads `showName`, and postgrest hands back
      // `show_name`, so every consumer of a RAW row silently answered "no" and fell through to a
      // handle DERIVED from the real name (username was not selected either). Consumers that skip
      // pubName and read `.name` did the opposite and published the real name whatever the switch
      // said — vouchRowsFrom did, and FullProfile builds ANOTHER climber's vouch rows with it.
      // Mapped ADDITIVELY: the snake_case fields stay, so nothing reading `p.show_name` breaks.
      // AVAILABILITY rides along for the same reason: both crew "who is free" grids (the crew card's
      // typical week and the Safety tab's heatmap) say they are built "from each member's profile",
      // and hasSlot()/weekOf() read `availWeek` + `availability`. Without them every REAL crewmate
      // read as never free, so the grid said no slot worked for the crew whatever they had saved.
      return (data || []).map((p) => ({ ...p, showName: !!p.show_name, availability: Array.isArray(p.availability) ? p.availability : [], availWeek: Array.isArray(p.avail_week) ? p.avail_week : [] }));
}
