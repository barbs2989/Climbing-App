// lib/db-social.js — connections, base check-ins, blocking and restricting, vouches, verification.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { profileCols } from "./profileCols";
import { fetchProfilesByIds } from "./db-partners.js";

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
        .select("id, requester, addressee, status, note, created_at, responded_at");
      if (error) throw error;
      const rows = data || [];
      const others = [...new Set(rows.map((r) => (r.requester === userId ? r.addressee : r.requester)))];
      if (!others.length) return [];
      const { data: profs, error: pErr } = await supabase
        .from("profiles").select(profileCols("id,name,username,avatar,location,show_name,resume_public", true)).in("id", others);
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
          // The requester's note (0257). Only the two people on the row can read it, same as the row.
          note: r.note || "",
          // 0267: a pending request expires after 90 days; an accept is news for a fortnight.
          createdAt: r.created_at || null,
          respondedAt: r.responded_at || null,
          profile: byId[otherId] || null,
        };
      });
    },
    // Friend state used to be read once per sign-in, so a request sent to me after that never
    // appeared. A minute is often enough for "did they accept?" and costs one small query.
    refetchInterval: 60000,
  });
}

// Every cached reader of connections, refreshed after each write to it (check:write-readers).
const connectionsReaders = [["my-connections"], ["mutual-connections"]];
// Ask to connect. status is left to the column default rather than sent, because the RLS
// insert policy requires status = 'pending' and a client-supplied value is one more thing
// that can drift from it.
// The optional note is what the Add-friend sheet has always offered; until 0257 there was no column,
// so it was kept in the SENDER's local state and the recipient never saw it.
export async function sendConnectionRequest(requesterId, addresseeId, note) {
  if (!supabase) return null;
  const row = { requester: requesterId, addressee: addresseeId };
  const n = (note || "").trim().slice(0, 300);
  if (n) row.note = n;
  const { data, error } = await supabase
    .from("connections").insert(row)
    .select().single();
  if (error) throw error;
  invalidateKeys(connectionsReaders);
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
  invalidateKeys(connectionsReaders);
  return data;
}

// Take back a friend request I sent. Scoped to NOT-accepted so a second tap on "Requested" cannot
// quietly unfriend someone who accepted in the meantime; zero rows back says so rather than
// reading as success (RLS and a no-match delete are both a 200 with no error). A request they
// DECLINED still reads "Requested" to me (the decline is quiet), so withdrawing must reach it too.
export async function withdrawConnectionRequest(rowId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("connections").delete()
    .eq("id", rowId).neq("status", "accepted").select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("It’s no longer a pending request — they may already have answered it.");
  invalidateKeys(connectionsReaders);
  return true;
}
// Withdraw a request, decline-and-forget, or disconnect. Either party may delete.
export async function removeConnection(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("connections").delete().eq("id", rowId);
  if (error) throw error;
  invalidateKeys(connectionsReaders);
  return true;
}

// "I'm at the base" check-ins (0188). The write goes ONLY through check_in_at_route_base(), which
// re-applies the proximity rules server-side; a refusal comes back as {ok:false, reason} rather
// than an error, because "you are 2 km from this crag" is an answer, not a failure. A real failure
// (network, auth) throws, so no caller can report a check-in that did not land.
export async function checkInAtRouteBase(routeId, fix) {
  if (!supabase) throw new Error("no database");
  const { data, error } = await supabase.rpc("check_in_at_route_base", {
    p_route_id: routeId, p_lat: fix.lat, p_lng: fix.lng,
    p_accuracy_m: fix.accuracy, p_samples: fix.samples || 1, p_fixed_at: fix.fixedAt,
  });
  if (error) throw error;
  if (!data || typeof data.ok !== "boolean") throw new Error("unexpected check-in answer");
  if (data.ok) invalidateKeys(routeBaseCheckinsReaders);
  return data;
}

// The reader of route_base_checkins goes through an RPC, which check:write-readers cannot see;
// named by hand so a withdrawn check-in leaves the map at once. A check-in can also MOVE the
// route's Base pin (0363's trigger writes routes.waypoints), so the cached route row goes too.
const routeBaseCheckinsReaders = [["route-base-checkins"], ["route-row"]];
// Withdraw your own check-in. Selects the row back so a delete RLS refused (zero rows, 200) is not
// read as success.
export async function withdrawBaseCheckin(userId, routeId) {
  if (!supabase) throw new Error("no database");
  const { data, error } = await supabase.from("route_base_checkins").delete()
    .eq("route_id", routeId).eq("user_id", userId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("nothing was removed");
  invalidateKeys(routeBaseCheckinsReaders);
  return data.length;
}

// The base-of-the-climb SPOTS, most-confirmed first: {lat, lng, n, mine, spread_m, confirmed}.
// The database clusters them (0363), so the map, the panel and the route's Base pin read one
// answer. No identity and no time ever leave the database.
export function useRouteBaseCheckins(routeId) {
  return useQuery({
    queryKey: ["route-base-checkins", routeId],
    enabled: !!supabase && !!routeId,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("route_base_spots", { p_route_id: routeId });
      if (error) throw error;
      return data || [];
    },
  });
}

// PEOPLE YOU MAY KNOW (0267). "People you may know" drew only on seed CLIMBERS, so a real account
// never saw a suggestion. people_you_may_know() is a definer (connections are readable only by
// their two people, so no client could compute friends-of-friends) and already leaves out you,
// anyone you have any row with, anyone blocked either way, restricted accounts, and anyone closed to
// requests. Profiles are fetched by id after, through the same mapper every other row uses.
export function usePeopleYouMayKnow(userId) {
  return useQuery({
    queryKey: ["people-you-may-know", userId],
    enabled: !!supabase && !!userId,
    staleTime: 300000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("people_you_may_know", { p_limit: 12 });
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) return [];
      const profs = await fetchProfilesByIds(rows.map((r) => r.id));
      const byId = {}; (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.filter((r) => byId[r.id]).map((r) => ({
        id: r.id, mutuals: r.mutuals || 0, crewsTogether: r.crews_together || 0, loggedTogether: r.logged_together || 0,
        profile: byId[r.id],
      }));
    },
  });
}

// Mutual friends. `mutualIds()` in core took no arguments and returned `[]`, so every consumer
// rendered `mutualCount(...) ? control : null` and the feature was invisible — including the
// Mutual friends sheet, which no entry point in the app could open.
//
// IT HAS TO BE AN RPC, and that is not a preference. `0087` restricts reading `connections` to
// the two people on the row ("A connection is not public"), so the other climber's edges are
// unreadable from here by construction — no client-side query can compute an intersection with
// them. `0182` supplies a SECURITY DEFINER function; see its header for what that discloses and
// why blocks are honoured inside it.
//
// ONE CALL FOR MANY CLIMBERS, because the friends list renders several rows at once and a
// per-row hook would be N round trips for one screen. The SQL answers NOTHING AT ALL for an ask
// over 64, so the ask goes in chunks of 64 -- it used to be SLICED to 64, which silently dropped
// whoever sorted last once friends + requests + partner cards passed 64 (audit 2026-11-25).
export function useMutualConnections(userId, otherIds, firstIds) {
  // The key is the SORTED id list: the same set asked in a different order is the same
  // question, and keying on the raw array would refetch on every render that rebuilt it.
  const ids = [...new Set((otherIds || []).filter(Boolean))].sort();
  // `firstIds` (the open profile, the open mutuals sheet) go first and into the key, so an answer
  // cached without them is not reused for a question about them.
  const first = [...new Set((firstIds || []).filter(Boolean))];
  const ask = [...new Set(first.concat(ids))];
  const chunks = [];
  for (let i = 0; i < ask.length; i += 64) chunks.push(ask.slice(i, i + 64));
  const key = first.join(",") + "|" + ids.join(",");
  return useQuery({
    queryKey: ["mutual-connections", userId, key],
    enabled: !!supabase && !!userId && ask.length > 0,
    // The ask set changes as partner cards scroll in, and every change is a new key: without this the
    // mutual rows already on screen would blink out while the wider answer loads. Only the SAME
    // account's previous answer is held, so a sign-in as somebody else never shows the last one's.
    placeholderData: (prev, prevQuery) => (prevQuery && prevQuery.queryKey[1] === userId ? prev : undefined),
    queryFn: async () => {
      const answers = await Promise.all(chunks.map((others) => supabase.rpc("mutual_connections", { others })));
      const failed = answers.find((a) => a.error);
      if (failed) throw failed.error;
      const map = {};
      answers.flatMap((a) => a.data || []).forEach((r) => {
        if (!r || !r.other_id || !r.mutual_id) return;
        (map[r.other_id] = map[r.other_id] || []).push(r.mutual_id);
      });
      return map;
    },
  });
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
        .from("profiles").select(profileCols("id,name,username,avatar,show_name", true)).in("id", rows.map((r) => r.blocked));
      if (pErr) throw pErr;
      const byId = {};
      (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.map((r) => ({ _dbId: r.id, blockedId: r.blocked, profile: byId[r.blocked] || null }));
    },
  });
}

// Every cached reader of blocked_users, refreshed after each write to it (check:write-readers).
const blockedUsersReaders = [["my-blocked"]];
// Block someone. The pair is uniquely indexed, so blocking twice raises 23505 rather than
// quietly creating a second row; the caller treats that as already-blocked.
export async function blockUser(blockerId, blockedId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("blocked_users").insert({ blocker: blockerId, blocked: blockedId })
    .select().single();
  if (error && error.code !== "23505") throw error;
  invalidateKeys(blockedUsersReaders);
  return data || null;
}

export async function unblockUser(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("blocked_users").delete().eq("id", rowId);
  if (error) throw error;
  invalidateKeys(blockedUsersReaders);
  return true;
}

// RESTRICT (0270): a private, directional list. Changes only what the restrictor SEES — the restricted
// climber's DMs skip the inbox and badges, their friend requests stop pinging — and nothing refuses them,
// so they cannot tell. Read only by its owner (RLS), like blocked_users.
const restrictedUsersReaders = [["my-restricted"]];
export function useMyRestricted(userId) {
  return useQuery({
    queryKey: ["my-restricted", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("restricted_users").select("id, restricted, created_at");
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) return [];
      const profs = await fetchProfilesByIds(rows.map((r) => r.restricted));
      const byId = {}; (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.map((r) => ({ _dbId: r.id, restrictedId: r.restricted, profile: byId[r.restricted] || null }));
    },
  });
}
export async function restrictUser(restrictorId, restrictedId) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.from("restricted_users").insert({ restrictor: restrictorId, restricted: restrictedId });
  if (error && error.code !== "23505") throw error;
  invalidateKeys(restrictedUsersReaders);
  return true;
}
export async function unrestrictUser(restrictorId, restrictedId) {
  if (!supabase) throw new Error("no database");
  const { data, error } = await supabase.from("restricted_users").delete()
    .eq("restrictor", restrictorId).eq("restricted", restrictedId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That climber wasn’t restricted.");
  invalidateKeys(restrictedUsersReaders);
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

// Every cached reader of vouches, refreshed after each write to it (check:write-readers).
const vouchesReaders = [["user-vouches"], ["climber-vouches"], ["partner-counts"], ["reliability-of"]];
// Mutation: Give a vouch. A plain INSERT, never an upsert: ON CONFLICT DO UPDATE needs UPDATE
// rights on every column it sets, even when no row conflicts, and 0238 grants UPDATE on `reason`
// only -- so an upsert here is "permission denied" for EVERY new vouch. Changing an existing vouch
// is updateVouch's job; a second vouch for the same climber is the unique key's 23505.
export async function giveVouch(fromId, toId, reason = "") {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("vouches").insert({
      from_id: fromId,
      to_id: toId,
      reason: reason || null
    }).select().single();
  if (error && error.code === "23505") throw new Error("you've already vouched for them.");
  if (error) throw error;
  invalidateKeys(vouchesReaders);
  return data;
}

// Mutation: Edit your own vouch. Only `reason` is writable (0238): who it is for and when it was
// given stay fixed. RLS turns someone else's row into zero rows rather than an error, so count them.
export async function updateVouch(fromId, toId, reason = "") {
  if (!supabase) return null;
  const { data, error } = await supabase.from("vouches").update({ reason: reason || null })
    .eq("from_id", fromId).eq("to_id", toId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("that vouch is no longer there.");
  invalidateKeys(vouchesReaders);
  return data[0];
}

// Mutation: Revoke a vouch
export async function revokeVouch(fromId, toId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("vouches").delete()
    .eq("from_id", fromId).eq("to_id", toId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("that vouch is already gone.");
  invalidateKeys(vouchesReaders);
}

// Every cached reader of verification_records, refreshed after each write to it (check:write-readers).
const verificationRecordsReaders = [["verification-records"]];

// Mark this user's email verified. Replaces the old verifyRecord(), which wrote
// status:'verified' straight from the client — RLS gated only user_id = auth.uid(), so any
// user could mark any of their own verifications verified, and the badge feeds the trust
// score. 0085 pins that column and moves the one verification the server can actually
// attest into a definer function that reads auth.users.email_confirmed_at itself.
//
// Since 0306 it also needs a session that came from the inbox in the last 30 minutes (an emailed code
// or link) -- `email_confirmed_at` alone no longer counts, because autoconfirm sets it for everyone.
// Its write is read by your own records and everyone's ✓ (verified_user_ids).
export async function verifyMyEmail() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("verify_my_email");
  if (error) throw error;
  invalidateKeys(verificationRecordsReaders.concat([["verified-users"]]));
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
