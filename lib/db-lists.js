// lib/db-lists.js — tick lists and itineraries.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { cacheItineraries, cachedItineraries } from "./offline";
import { orOfflineExact } from "./db-shared.js";

// Custom route lists (migration 0092). "My Objectives" (`ul_obj`) is NOT stored here — it
// stays owned by the `objectives` table, so there is exactly one writer per fact.
//
// Only own lists are fetched here. Other climbers' `shared` lists are read by usePublicLists
// (their profile) and useSharedList (a `?list=` link), below.
export function useMyLists(userId) {
  return useQuery({
    queryKey: ["my-lists", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lists").select("id, name, icon, description, route_ids, shared, created_at")
        .eq("user_id", userId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((l) => ({
        _dbId: l.id, id: l.id, name: l.name, icon: l.icon || "", description: l.description || "",
        routeIds: l.route_ids || [], shared: !!l.shared,
      }));
    },
  });
}

// Every cached reader of user_lists, refreshed after each write to it (check:write-readers).
const userListsReaders = [["my-lists"], ["public-lists"], ["shared-list"]];
export async function createListRow(userId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("user_lists").insert({
    user_id: userId, name: fields.name, icon: fields.icon || null,
    description: (fields.description || "").trim() || null,
    route_ids: fields.routeIds || [], shared: !!fields.shared,
  }).select().single();
  if (error) throw error;
  invalidateKeys(userListsReaders);
  return data;
}

// Partial patch — the three call sites each change one thing (routeIds, or shared), and
// sending the whole row would let a stale copy clobber a concurrent edit.
export async function updateListRow(rowId, fields) {
  if (!supabase) return null;
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.icon !== undefined) patch.icon = fields.icon;
  if (fields.description !== undefined) patch.description = (fields.description || "").trim() || null;
  if (fields.routeIds !== undefined) patch.route_ids = fields.routeIds;
  if (fields.shared !== undefined) patch.shared = !!fields.shared;
  const { data, error } = await supabase
    .from("user_lists").update(patch).eq("id", rowId).select().single();
  if (error) throw error;
  invalidateKeys(userListsReaders);
  return data;
}

// Another climber's PUBLIC lists, for their profile. The 0092 select policy already admits any
// `shared = true` row; the `.eq("shared", true)` is still stated here, because a climber viewing
// THEIR OWN profile would otherwise be shown their private lists as if others could see them.
export function usePublicLists(userId) {
  return useQuery({
    queryKey: ["public-lists", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lists").select("id, user_id, name, description, route_ids")
        .eq("user_id", userId).eq("shared", true).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((l) => ({ id: l.id, userId: l.user_id, name: l.name, description: l.description || "", routeIds: l.route_ids || [] }));
    },
  });
}

// One list, opened from a shared link (`?list=<id>`). RLS answers a PRIVATE or deleted list with
// zero rows and a 200, so `null` here means "not public, or gone" — distinct from a thrown error,
// which is a failed read and must not be shown as "this list is private".
export function useSharedList(listId) {
  return useQuery({
    queryKey: ["shared-list", listId],
    enabled: !!supabase && !!listId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lists").select("id, user_id, name, description, route_ids, shared")
        .eq("id", listId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { id: data.id, userId: data.user_id, name: data.name, description: data.description || "", routeIds: data.route_ids || [], shared: !!data.shared };
    },
  });
}

// ── my itineraries (migration 0199) ──
// Before 0199 a climber's own day-by-day plan lived in one useState and a refresh erased it,
// under a toast that said "Saved your plan". One row per (user, route); owner-only RLS.
export function useMyItineraries(userId) {
  return useQuery({
    queryKey: ["my-itineraries", userId],
    enabled: !!supabase && !!userId,
    // Mirrored to this device on every good read (keyed by account), and served from there when the
    // read fails — a plan made for a packed route must still be on the Plan tab at the trailhead.
    queryFn: () => orOfflineExact(async () => {
      const { data, error } = await supabase.from("user_itineraries").select("route_id, itinerary").eq("user_id", userId);
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { if (r.itinerary && Array.isArray(r.itinerary.days) && r.itinerary.days.length) out[r.route_id] = r.itinerary; });
      cacheItineraries(userId, out).catch(() => {});
      return out;
    }, () => cachedItineraries(userId)),
  });
}
// Every cached reader of user_itineraries, refreshed after each write to it (check:write-readers).
const userItinerariesReaders = [["my-itineraries"]];
// .select() so an RLS refusal (200 + zero rows) surfaces as a failure, not a silent success.
export async function saveItineraryRow(userId, routeId, itinerary) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("user_itineraries")
    .upsert({ user_id: userId, route_id: routeId, itinerary, updated_at: new Date().toISOString() }, { onConflict: "user_id,route_id" })
    .select("route_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — try again.");
  invalidateKeys(userItinerariesReaders);
  return data;
}
