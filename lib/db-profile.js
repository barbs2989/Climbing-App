// lib/db-profile.js — the signed-in climber's own profile settings: discoverability, zip, condition prefs, tracked lists, notification state, résumé.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { PARTNER_COLS, profileCols } from "./profileCols";
import { isUnknownColumn } from "./db-logs.js";

// Real-user search for inviting an actual signed-in climber to a crew (as opposed
// to the app's demo CLIMBERS/FILLER_CLIMBERS roster). No new RLS needed - profiles
// already has public read from the auth/profiles migration (0009); which COLUMNS a reader gets is
// lib/profileCols.js (0434).

// Who is asking, from the stored session (no network). Signed out -> null. Decides which profile
// columns a read may ask for (lib/profileCols.js, 0434).
export async function sessionUid() {
  const { data } = await supabase.auth.getSession();
  return (data && data.session && data.session.user && data.session.user.id) || null;
}

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
      let q = supabase.from("profiles").select(profileCols(PARTNER_COLS, true)).eq("discoverable", true).limit(max || 24);
      if (meId) q = q.neq("id", meId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// A climber's zip code, and "within N miles" of it (0189). The zip lives in `profile_zips`, which
// only its OWNER can read -- `profiles` is public-read, so a zip there would publish everyone's
// home area. Other climbers see a rounded distance, never the zip, and only through
// `partners_near`, which is the one door onto that table.
export function useMyZip(userId) {
  return useQuery({
    queryKey: ["my-zip", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_zips").select("zip, zip_centroids(lat,lng)").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const c = data.zip_centroids || {};
      return { zip: data.zip, lat: c.lat, lng: c.lng };
    },
  });
}

// Is this zip one partner search can PLACE? The editor asks while the climber types, so an
// unrecognised zip is caught on the field rather than in a toast after the editor has closed.
// zip_centroids is public (0189), and the answer is the same row saveMyZip's foreign key checks.
// null = no such zip; a failed read THROWS, so the caller can tell "unknown" from "couldn't ask".
export function useZipCentroid(zip) {
  const z = String(zip || "");
  return useQuery({
    queryKey: ["zip-centroid", z],
    enabled: !!supabase && /^[0-9]{5}$/.test(z),
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("zip_centroids").select("zip").eq("zip", z).maybeSingle();
      if (error) throw error;
      return data ? data.zip : null;
    },
  });
}

// Every cached reader of profile_zips, refreshed after each write to it (check:write-readers).
const profileZipsReaders = [["my-zip"]];
// IS THIS USERNAME FREE? Setup's live "✓ available" line (lib/Onboarding.jsx). Case-insensitive, the
// way 0432's profiles_username_lower_key decides, so "Nate" counts as taken by "nate". `_` and `%` are
// LIKE wildcards and `_` is legal in a username, so both are escaped -- unescaped, "a_b" matched "axb".
// The caller's own row never counts against them. A climber who has BLOCKED the caller is invisible to
// them (0095), so this can call a name free that the save then refuses with 23505; the save's own
// "taken" message covers that. A failed read THROWS: "available" on a network error would be a lie.
export async function isUsernameFree(name, myId) {
  if (!supabase) return true;
  const u = String(name || "").trim();
  if (!u) return false;
  const pat = u.replace(/[\\%_]/g, (ch) => "\\" + ch);
  let q = supabase.from("profiles").select("id").ilike("username", pat).limit(1);
  if (myId) q = q.neq("id", myId);
  const { data, error } = await q;
  if (error) throw error;
  return !(data && data.length);
}
// Store (or clear, when blank) the caller's zip. A zip the Census has no centroid for is refused by
// the foreign key (23503) and reported as unrecognised rather than stored unplaceable. Re-reads the
// row it wrote: an RLS refusal is a 200 with nothing in it.
export async function saveMyZip(userId, zip) {
  if (!supabase || !userId) throw new Error("not signed in");
  const z = String(zip || "").trim();
  if (!z) {
    const { error } = await supabase.from("profile_zips").delete().eq("user_id", userId);
    if (error) throw error;
    invalidateKeys(profileZipsReaders);
    return null;
  }
  if (!/^[0-9]{5}$/.test(z)) throw new Error("A zip code is five digits.");
  const { data, error } = await supabase.from("profile_zips")
    .upsert({ user_id: userId, zip: z, updated_at: new Date().toISOString() }).select("zip");
  if (error) {
    if (error.code === "23503") throw new Error("We don't recognise zip code " + z + ".");
    throw error;
  }
  if (!Array.isArray(data) || data.length !== 1) throw new Error("the zip was not saved");
  invalidateKeys(profileZipsReaders);
  return data[0].zip;
}

// A climber's conditions-score preferences (0290): the temperature range per discipline, the wind
// range they accept, rain caution and the optional extras. Owner-only, like the zip above. `null` = no row yet.
// The object is returned as stored; lib/CondPrefs.jsx cleans it before anything scores with it.
export function useMyCondPrefs(userId) {
  return useQuery({
    queryKey: ["my-cond-prefs", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_condition_prefs").select("prefs").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? data.prefs : null;
    },
  });
}
// Every cached reader of profile_condition_prefs, refreshed after each write to it (check:write-readers).
const profileConditionPrefsReaders = [["my-cond-prefs"]];
// Re-reads the row it wrote: an RLS refusal is a 200 with nothing in it.
export async function saveMyCondPrefs(userId, prefs) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase.from("profile_condition_prefs")
    .upsert({ user_id: userId, prefs: prefs || {}, updated_at: new Date().toISOString() }).select("prefs");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("your conditions were not saved");
  invalidateKeys(profileConditionPrefsReaders);
  return data[0].prefs;
}

// The climbing lists a climber chose to show on Home (0337), in the order picked. Owner-only.
// `[]` = no row yet (Home shows none); progress itself is derived from logs and never stored.
export function useMyTrackedLists(userId) {
  return useQuery({
    queryKey: ["my-tracked-lists", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profile_tracked_lists").select("keys").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data && Array.isArray(data.keys) ? data.keys : [];
    },
  });
}
// Every cached reader of profile_tracked_lists, refreshed after each write to it (check:write-readers).
const profileTrackedListsReaders = [["my-tracked-lists"]];
// Re-reads the row it wrote: an RLS refusal is a 200 with nothing in it.
export async function saveMyTrackedLists(userId, keys) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase.from("profile_tracked_lists")
    .upsert({ user_id: userId, keys: keys || [], updated_at: new Date().toISOString() }).select("keys");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("your Home lists were not saved");
  invalidateKeys(profileTrackedListsReaders);
  return data[0].keys;
}

// The alert ids this climber has seen and cleared (0346), so read and Clear survive a reload.
export function useMyNotificationState(userId) {
  return useQuery({
    queryKey: ["my-notification-state", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      // prefs (0469): the Settings > Notifications switches, saved with the account. Read without it
      // when the column is not there yet, so the read-state never fails on a deploy that outran the migration.
      const run = (cols) => supabase.from("notification_state").select(cols).eq("user_id", userId).maybeSingle();
      // deleted_ids (0543): alerts swiped away for good, so a DERIVED one does not come back on a reload.
      let { data, error } = await run("seen_ids, dismissed_ids, prefs, deleted_ids");
      if (isUnknownColumn(error)) ({ data, error } = await run("seen_ids, dismissed_ids, prefs"));
      if (isUnknownColumn(error)) ({ data, error } = await run("seen_ids, dismissed_ids"));
      if (error) throw error;
      const prefs = data && data.prefs && typeof data.prefs === "object" && !Array.isArray(data.prefs) ? data.prefs : {};
      return { seen: (data && data.seen_ids) || [], dismissed: (data && data.dismissed_ids) || [], deleted: (data && data.deleted_ids) || [], prefs };
    },
  });
}
// Every cached reader of notification_state, refreshed after each write to it (check:write-readers).
const notificationStateReaders = [["my-notification-state"]];
// Keeps the most recent 300 of each (the table's bound). Re-reads the row it wrote: an RLS refusal is a 200 with nothing in it.
// `prefs` (0469), when given, is the switches as { key: true|false }; left out, the stored switches are untouched.
// `deleted` (0543), when given, is the ids swiped away for good; left out, the stored list is untouched.
export async function saveMyNotificationState(userId, seen, dismissed, prefs, deleted) {
  if (!supabase || !userId) throw new Error("not signed in");
  const last = (a) => Array.from(new Set(a || [])).slice(-300);
  const row = { user_id: userId, seen_ids: last(seen), dismissed_ids: last(dismissed), updated_at: new Date().toISOString() };
  if (prefs && typeof prefs === "object") row.prefs = prefs;
  if (Array.isArray(deleted)) row.deleted_ids = last(deleted);
  const put = (r) => supabase.from("notification_state").upsert(r).select("user_id");
  let { data, error } = await put(row);
  // A deploy that outran a migration: drop the newest optional column first, then the next.
  if (isUnknownColumn(error) && "deleted_ids" in row) { const { deleted_ids: _d, ...rest } = row; void _d; ({ data, error } = await put(rest)); if (!error) delete row.deleted_ids; }
  if (isUnknownColumn(error) && row.prefs) { const { prefs: _p, deleted_ids: _d2, ...rest } = row; void _p; void _d2; ({ data, error } = await put(rest)); }
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("your alerts were not saved");
  invalidateKeys(notificationStateReaders);
}

// The hand-written parts of a climber's résumé (0342): headline, courses, past climbs added by hand.
// Yours always; anyone else's only while their résumé is public (RLS). `null` = no row yet, which is
// an empty résumé -- a failed read THROWS, so a caller can tell "nothing written" from "not loaded".
export function useClimberResume(userId) {
  return useQuery({
    queryKey: ["climber-resume", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climber_resumes").select("headline, courses, climbs, conditioning, hidden_logs").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? { headline: data.headline || "", courses: Array.isArray(data.courses) ? data.courses : [], climbs: Array.isArray(data.climbs) ? data.climbs : [], conditioning: data.conditioning || "", hiddenLogs: Array.isArray(data.hidden_logs) ? data.hidden_logs : [] } : null;
    },
  });
}
// Every cached reader of climber_resumes, refreshed after each write to it (check:write-readers).
const climberResumesReaders = [["climber-resume"]];
// Re-reads the row it wrote: an RLS refusal is a 200 with nothing in it.
// Every field is sent on every write (the caller holds the whole résumé), so a write never leaves a column behind.
export async function saveClimberResume(userId, { headline, courses, climbs, conditioning, hiddenLogs }) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase.from("climber_resumes")
    .upsert({ user_id: userId, headline: String(headline || "").slice(0, 200), courses: courses || [], climbs: climbs || [], conditioning: String(conditioning || "").slice(0, 400), hidden_logs: hiddenLogs || [], updated_at: new Date().toISOString() }).select("user_id");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("your résumé was not saved");
  invalidateKeys(climberResumesReaders);
  return true;
}
