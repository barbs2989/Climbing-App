// lib/db-groups.js — groups: discovery, membership, invites, bans, prefs, reports, posts, events.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { inFilter, useLiveQuery } from "./live";
import { useDebouncedTerm, withPending } from "./db-shared.js";
import { heldIds } from "./db-comments.js";

// Groups (migration 0090). Until now `GROUPS` was DEMO_FILLERS-gated — empty in production —
// and `createdGroups` was a useState array, so a group vanished on refresh and two climbers
// could never be in one.
//
// Returns the groups I have a ROW in: the ones I belong to, asked to join, or am invited to.
// Until 0487 this read every group RLS let me see (every public group) plus its roster, and
// Discover filtered that in the browser, so the read grew with the number of groups in the app.
// The groups I am NOT in are now listed by useDiscoverGroups, a page at a time. `mine` is what the
// UI needs to decide joined state, and it comes from the roster rather than a second query.
//
// SCOPE: groups and their rosters. `policy` is enforced since 0178 (who may self-seat, who must
// ask), posts/events since 0230, and membership questions since 0258. Since 0258 a non-manager
// reads ACTIVE rows only, so `invitedIds` is filled for a group's managers and empty for everyone
// else — which is who the invite sheet is for.
const GROUP_COLS = "id, name, blurb, location, region, area_id, lat, lng, home_area:areas(name), disciplines, accent, avatar_url, cover_url, policy, event_policy, visibility, join_questions, rules, invite_policy, welcome_text, announcement, links, mod_title, created_by, created_at";
// One group row as the app holds it. `roster` is the member rows the caller could read (none for a
// group they are not in, 0318), `count` the active member count or null when it was not read.
function groupToClient(g, roster, count, userId) {
  // 0178 SPLIT "HAS A ROW" FROM "IS A MEMBER", and every count here means the second.
  // A `pending` row is a request and an `invited` row is somebody else's offer; treating
  // either as membership would list a group you merely asked about among your own, and
  // would count a requester against the group's capacity.
  const active = roster.filter((m) => m.status === "active");
  const mine = roster.find((m) => m.user_id === userId) || null;
  return {
    _dbId: g.id, id: g.id, name: g.name, blurb: g.blurb || "", location: g.location || "",
    // The catalog area it climbs from (0396), and the point that area stands for -- set by a trigger, never by the client.
    areaId: g.area_id || null, areaName: (g.home_area && g.home_area.name) || g.area_name || "", lat: g.lat, lng: g.lng,
    // The state it is filed under (0516: its area's state, else what its location names).
    region: g.region || null,
    disciplines: g.disciplines || [], accent: /^#a371f7$/i.test(g.accent || "") ? "" : (g.accent || ""), policy: g.policy, /* the picker no longer offers Purple (owner 2026-11-25: no purple text); a group that chose it falls back to its name colour, check:no-purple-text */
    // Its own pictures (0454), or "" for the drawn initial and colour band.
    avatarUrl: g.avatar_url || "", coverUrl: g.cover_url || "",
    // What its organizers customized (0506): a welcome note for members, a banner, links, the moderators' title.
    welcomeText: g.welcome_text || "", announcement: g.announcement || "",
    links: Array.isArray(g.links) ? g.links : [], modTitle: g.mod_title || "",
    eventPolicy: g.event_policy, visibility: g.visibility,
    joinQuestions: Array.isArray(g.join_questions) ? g.join_questions : [],
    rules: Array.isArray(g.rules) ? g.rules : [], invitePolicy: g.invite_policy || "members",
    // OWNER IS THE ROSTER'S OWNER ROW since 0260 (ownership can be handed over); created_by
    // stays the immutable creator. Falls back to it only if the owner row is not readable.
    ownerId: (active.find((m) => m.role === "owner") || {}).user_id || g.created_by, creatorId: g.created_by,
    memberIds: active.map((m) => m.user_id),
    memberCount: typeof count === "number" ? count : null,
    moderatorIds: active.filter((m) => m.role !== "member").map((m) => m.user_id),
    // Outstanding invites, so the invite sheet can show who is already asked (and withdraw it).
    invitedIds: roster.filter((m) => m.status === "invited").map((m) => m.user_id),
    joined: !!mine && mine.status === "active",
    myStatus: mine ? mine.status : null,
    myRole: mine && mine.status === "active" ? mine.role : null, _db: true,
  };
}
// The named groups with their rosters and member counts. Throws on a failed read of the groups
// or the rosters; a failed COUNT falls back to unknown (null), never to zero.
async function readGroupsByIds(userId, ids) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("groups").select(GROUP_COLS).in("id", ids).order("created_at", { ascending: false });
  if (error) throw error;
  const groups = data || [];
  if (!groups.length) return [];
  const { data: mem, error: mErr } = await supabase
    .from("group_members").select("group_id, user_id, role, status, invited_by")
    .in("group_id", groups.map((g) => g.id));
  if (mErr) throw mErr;
  // Since 0318 a non-member reads NO roster rows, so the count comes from a definer function
  // that returns numbers only. A failed count read falls back to the roster's own length.
  const { data: counts, error: cErr } = await supabase
    .rpc("group_member_counts", { gids: groups.map((g) => g.id) });
  const countOf = {};
  if (!cErr) (counts || []).forEach((c) => { countOf[c.group_id] = c.member_count; });
  const byGroup = {};
  (mem || []).forEach((m) => { (byGroup[m.group_id] = byGroup[m.group_id] || []).push(m); });
  return groups.map((g) => groupToClient(g, byGroup[g.id] || [], countOf[g.id], userId));
}
export function useMyGroups(userId) {
  return useQuery({
    queryKey: ["my-groups", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      // MY ROWS FIRST ("group_members read own", 0178): active, pending and invited alike.
      const { data: rows, error } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
      if (error) throw error;
      return readGroupsByIds(userId, [...new Set((rows || []).map((r) => r.group_id))]);
    },
  });
}

// ONE group by id, for a group the caller is not in: opened from Discover, a shared link or a
// notification. The open group's page reads this rather than the Discover list, so changing a
// filter (or joining, which takes the group off that list) cannot pull the page out from under it.
// Null when the group does not exist or the caller may not read it.
const GROUP_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function useGroupById(userId, groupId) {
  return useQuery({
    queryKey: ["group-by-id", userId, groupId],
    enabled: !!supabase && !!userId && GROUP_UUID.test(String(groupId || "")),
    queryFn: async () => (await readGroupsByIds(userId, [groupId]))[0] || null,
  });
}

// DISCOVER, A PAGE AT A TIME (0487). The search box, the state, the distance from a picked place
// and the sort all run in discover_groups(); the browser holds only the pages it has shown.
//   f.q        the typed search (debounced here, as every other search box is)
//   f.region   a full state/province name, "Other", or ""
//   f.near     { lat, lng, mi } or null
//   f.sort     "match" | "active" | "members"
//   f.discs / f.home / f.climb   what "Recommended" ranks by: my disciplines, my home state, the
//              states of the areas I listed myself at
//   f.limit    rows per page (20)
// Returns the useInfiniteQuery result plus `rows` (every loaded page, flattened, de-duplicated:
// an offset page can repeat a row when a group is created between two reads) and `total`, the
// number the filters match in all. A failed read is isError, never an empty list.
export const DISCOVER_GROUPS_PAGE = 20;
export function useDiscoverGroups(userId, f, enabled = true) {
  const [q, pending] = useDebouncedTerm(String((f && f.q) || "").trim());
  const near = f && f.near && f.near.lat != null && f.near.lng != null ? f.near : null;
  const limit = (f && f.limit) || DISCOVER_GROUPS_PAGE;
  const args = {
    q, p_region: (f && f.region) || null,
    near_lat: near ? near.lat : null, near_lng: near ? near.lng : null, near_mi: near ? near.mi : null,
    p_sort: (f && f.sort) || "match", my_discs: (f && f.discs) || [],
    home_region: (f && f.home) || null, climb_regions: (f && f.climb) || [], p_limit: limit,
  };
  const res = useInfiniteQuery({
    queryKey: ["discover-groups", userId, args],
    enabled: !!supabase && !!userId && !!enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("discover_groups", { ...args, p_offset: pageParam });
      if (error) throw error;
      const rows = data || [];
      return {
        offset: pageParam,
        total: rows.length ? Number(rows[0].total_count) : null,
        rows: rows.map((g) => ({
          ...groupToClient(g, [], g.member_count, userId),
          // The caller's own row, if any: a request already sent reads as sent.
          myStatus: g.my_status || null, region: g.region || null,
        })),
      };
    },
    getNextPageParam: (last, pages) => {
      const seen = pages.reduce((n, p) => n + p.rows.length, 0);
      const total = pages.reduce((t, p) => (p.total != null ? p.total : t), 0);
      return last.rows.length && seen < total ? seen : undefined;
    },
    // The list stays on screen while the next filter's answer is on its way.
    placeholderData: (prev) => prev,
  });
  const pages = (res.data && res.data.pages) || [];
  const ids = new Set();
  const rows = [];
  pages.forEach((p) => p.rows.forEach((g) => { if (!ids.has(g.id)) { ids.add(g.id); rows.push(g); } }));
  const total = pages.reduce((t, p) => (p.total != null ? p.total : t), 0);
  return { ...withPending(res, pending), rows, total: Math.max(total, rows.length) };
}

// What the chips above Discover's list count (0487): groups per state or province ("Other" when
// the typed location names none), the disciplines some joinable group lists, and how many groups
// there are to join in all. Counted in the database over the same groups useDiscoverGroups lists
// with no filter.
export function useDiscoverGroupFacets(userId, enabled = true) {
  return useQuery({
    queryKey: ["discover-group-facets", userId],
    enabled: !!supabase && !!userId && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("discover_group_facets");
      if (error) throw error;
      const out = { byRegion: {}, discs: [], total: 0 };
      const discN = {};
      (data || []).forEach((r) => {
        if (r.kind === "region") out.byRegion[r.key] = r.n;
        else if (r.kind === "discipline") discN[r.key] = r.n;
        else if (r.kind === "total") out.total = r.n;
      });
      // ONE CHIP PER DISCIPLINE, however a group spelled it: "alpine" and "Alpine" were two chips that
      // searched for the same thing. The spelling most groups use names the chip.
      const byLower = {};
      Object.keys(discN).forEach((k) => {
        const low = k.trim().toLowerCase();
        if (!low) return;
        const cur = byLower[low] || (byLower[low] = { label: k.trim(), top: 0, n: 0 });
        cur.n += discN[k];
        if (discN[k] > cur.top || (discN[k] === cur.top && k.trim() < cur.label)) { cur.top = discN[k]; cur.label = k.trim(); }
      });
      out.discs = Object.values(byLower).sort((x, y) => (y.n - x.n) || x.label.localeCompare(y.label)).map((d) => d.label);
      return out;
    },
  });
}
// The cached reads of the groups the caller is NOT in. App calls this whenever its own groups are
// re-read, which is after every join, leave, request and group edit.
const groupDiscoveryReaders = [["discover-groups"], ["discover-group-facets"], ["group-by-id"]];
export function refreshGroupDiscovery() { invalidateKeys(groupDiscoveryReaders); }

// Every cached reader of groups, refreshed after each write to it (check:write-readers).
const groupsReaders = [["my-groups"], ["my-group-invites"], ["discover-groups"], ["discover-group-facets"], ["group-by-id"]];
// The owner membership row is created by 0090's trigger, not here — doing it client-side
// leaves a window where a group exists with no owner, and the join policy pins role to
// 'member' so the creator could not add themselves as one afterwards.
//
// THE ID IS MINTED HERE AND NOTHING IS READ BACK, which is what makes a PRIVATE group creatable.
// `.select()` turns the insert into INSERT ... RETURNING, and Postgres checks the returned row
// against the SELECT policy — `visibility = 'public' or is_group_member(id)`. The owner row comes
// from an AFTER trigger that the same statement's snapshot cannot see, so a private group failed
// that check and the whole insert came back 42501. Every private group had to be created public
// and flipped afterwards, which is a window where it is listed for everybody.
export async function createGroupRow(userId, fields) {
  if (!supabase) return null;
  const id = fields.id || crypto.randomUUID();
  const { error } = await supabase.from("groups").insert({
    id, name: fields.name, blurb: fields.blurb || null, location: fields.location || null, area_id: fields.areaId || null,
    disciplines: fields.disciplines || [], accent: fields.accent || null,
    avatar_url: fields.avatarUrl || null, cover_url: fields.coverUrl || null,
    welcome_text: fields.welcomeText || null, announcement: fields.announcement || null,
    links: fields.links || [], mod_title: fields.modTitle || null,
    policy: fields.policy || "open", event_policy: fields.eventPolicy || "mods",
    visibility: fields.visibility || "public", join_questions: fields.joinQuestions || [],
    created_by: userId,
  });
  if (error) throw error;
  invalidateKeys(groupsReaders);
  return { id };
}

// Edit a group's settings — name, about, location, disciplines, who may join, the membership
// questions, who may host events, and whether it is listed. RLS admits a manager (owner or
// moderator); anyone else matches zero rows, which is reported rather than read as success.
export async function updateGroupSettings(groupId, fields) {
  if (!supabase) return null;
  const row = {};
  if (fields.name != null) row.name = fields.name;
  if (fields.blurb != null) row.blurb = fields.blurb || null;
  if (fields.location != null) row.location = fields.location || null;
  if (fields.areaId !== undefined) row.area_id = fields.areaId || null;
  if (fields.disciplines) row.disciplines = fields.disciplines;
  if (fields.policy) row.policy = fields.policy;
  if (fields.eventPolicy) row.event_policy = fields.eventPolicy;
  if (fields.visibility) row.visibility = fields.visibility;
  if (fields.joinQuestions) row.join_questions = fields.joinQuestions;
  if (fields.rules) row.rules = fields.rules;
  if (fields.invitePolicy) row.invite_policy = fields.invitePolicy;
  // "" removes a picture (back to the drawn one); undefined leaves it alone.
  if (fields.avatarUrl !== undefined) row.avatar_url = fields.avatarUrl || null;
  if (fields.coverUrl !== undefined) row.cover_url = fields.coverUrl || null;
  // What the organizers customized (0506); "" clears a text, [] the links. The database holds each to its limit.
  if (fields.accent !== undefined) row.accent = fields.accent || null;
  if (fields.welcomeText !== undefined) row.welcome_text = fields.welcomeText || null;
  if (fields.announcement !== undefined) row.announcement = fields.announcement || null;
  if (fields.links !== undefined) row.links = fields.links || [];
  if (fields.modTitle !== undefined) row.mod_title = fields.modTitle || null;
  const { data, error } = await supabase.from("groups").update(row).eq("id", groupId).select("id");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("Only the group’s organizer or a moderator can change its settings.");
  invalidateKeys(groupsReaders);
  return data[0];
}

// Only the owner may delete a group (0090's "groups delete by creator"). Its members, posts,
// events and requests go with it by cascade.
export async function deleteGroupRow(groupId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("groups").delete().eq("id", groupId).select("id");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("Only the person who created this group can delete it.");
  invalidateKeys(groupsReaders);
  return true;
}

// Every cached reader of group_members, refreshed after each write to it (check:write-readers).
const groupMembersReaders = [["my-groups"], ["group-join-requests"], ["my-group-invites"], ["discover-groups"], ["discover-group-facets"], ["group-by-id"]];
// role is left to the column default: the RLS policy requires 'member', and a client-supplied
// value is one more thing that can drift from it.
export async function joinGroupRow(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").insert({ group_id: groupId, user_id: userId }).select().single();
  if (error && error.code !== "23505") throw error;
  invalidateKeys(groupMembersReaders);
  return data || null;
}

// REQUESTS WAITING ON YOU, for every group you manage. Before 0178 this list was `groupReqs`, a
// useState seeded only by DEMO_FILLERS — so a real organiser had nothing to approve and a real
// climber's request reached nobody.
//
// RLS does the scoping rather than a trusted client filter: reading `group_members` needs
// is_group_member() or a public group, and the manager test is re-applied by the approve policy
// anyway, so a caller who tampered with the group list would be refused at the write.
export function useGroupJoinRequests(userId) {
  return useQuery({
    queryKey: ["group-join-requests", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data: mine, error: mErr } = await supabase
        .from("group_members").select("group_id, role")
        .eq("user_id", userId).eq("status", "active").in("role", ["owner", "moderator"]);
      if (mErr) throw mErr;
      const ids = (mine || []).map((r) => r.group_id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("group_members").select("group_id, user_id, created_at:joined_at")
        .in("group_id", ids).eq("status", "pending");
      if (error) throw error;
      const reqs = data || [];
      if (!reqs.length) return [];
      // Their answers to the group's membership questions (0258), readable by managers only. A
      // failed read is thrown rather than returned as "no answers": an organiser deciding on a
      // request must not be shown a blank questionnaire the climber actually filled in.
      const { data: ans, error: aErr } = await supabase
        .from("group_join_answers").select("group_id, user_id, answers")
        .in("group_id", [...new Set(reqs.map((r) => r.group_id))]);
      if (aErr) throw aErr;
      const key = (g, u) => g + "|" + u;
      const byKey = Object.fromEntries((ans || []).map((a) => [key(a.group_id, a.user_id), a.answers]));
      return reqs.map((r) => ({ ...r, answers: byKey[key(r.group_id, r.user_id)] || [] }));
    },
  });
}

// Invitations waiting on YOU. `group_members read own` (0178) is what makes this readable at all:
// an invitation to a PRIVATE group sits on a roster the recipient cannot see, so without a
// row-level read of their own row the invite would be invisible to the one person it is for.
export function useMyGroupInvites(userId) {
  return useQuery({
    queryKey: ["my-group-invites", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members").select("group_id, invited_by, joined_at").eq("user_id", userId).eq("status", "invited");
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) return [];
      // is_group_invited() (0178) is what lets these names resolve; without it an invitation
      // would name a group the recipient cannot read.
      const { data: gs, error: gErr } = await supabase
        .from("groups").select("id, name, visibility, policy, rules").in("id", rows.map((r) => r.group_id));
      if (gErr) throw gErr;
      const byId = Object.fromEntries((gs || []).map((g) => [g.id, g]));
      // joined_at is set when the row is written, so on an invited row it is when the invite was sent.
      return rows.map((r) => ({ groupId: r.group_id, invitedBy: r.invited_by || null, since: r.joined_at || null, group: byId[r.group_id] || null }));
    },
  });
}

// THE FOUR DOORS 0178 OPENED, so that tightening the gate did not simply forbid joining.
//
// Which one a caller reaches for is decided by the GROUP, not by the climber: an open public
// group takes `joinGroupRow`, a public gated one takes a request, and a private one takes an
// invitation from a manager. `groupJoinPath()` in the app makes that choice in one place so the
// two join handlers cannot disagree about it.
//
// Each of these is one row and one status transition, and every one is enforced by RLS as well —
// so a client that reaches for the wrong door is refused rather than quietly doing the other
// thing. `.select()` then a length check, because PostgREST answers a zero-row PATCH 200: a
// refusal and a success are the same status code, which this repo has now recorded three times.
//
// A REQUEST GOES THROUGH request_to_join_group() (0258), not a bare insert: it writes the pending
// row and the answers to the group's membership questions together, and it is where a REQUIRED
// question is enforced — a group with questions refuses the self-written pending row outright.
// `answers` is one string per question, in the group's question order. The RPC's own message is
// passed through, because it names the question that still needs an answer.
export async function requestToJoinGroup(groupId, userId, answers, agreedRules) {
  return joinGroupViaRpc(groupId, answers, agreedRules);
}

// THE ONE DOOR since 0260 for joining an open group that has RULES and for asking to join a gated
// one: join_group() records the agreement, the answers and the row together, refuses a banned
// climber, and returns 'active' or 'pending' so the caller says what actually happened.
export async function joinGroupViaRpc(groupId, answers, agreedRules) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("join_group", { gid: groupId, answers: answers || [], agreed_rules: !!agreedRules });
  if (error && error.code !== "23505") throw error;   // 23505: already asked or joined, which is not a failure
  return error ? "already" : data;
}

export async function inviteToGroup(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").insert({ group_id: groupId, user_id: userId, status: "invited" }).select().single();
  if (error && error.code !== "23505") throw error;
  invalidateKeys(groupMembersReaders);
  return data || null;
}

// Accepting and approving are the same UPDATE from the database's point of view and two
// different permissions: the first is yours over your own invitation, the second a manager's over
// somebody else's request. Kept as two functions so a call site names which one it means.
export async function acceptGroupInvite(groupId, userId, agreedRules) {
  if (!supabase) return null;
  // A group with rules admits the invitee only with the agreement in the same write (0260).
  const { data, error } = await supabase
    .from("group_members").update(agreedRules ? { status: "active", rules_agreed_at: new Date().toISOString() } : { status: "active" })
    .eq("group_id", groupId).eq("user_id", userId).eq("status", "invited")
    .select("group_id, user_id, status");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("that invitation is no longer open");
  invalidateKeys(groupMembersReaders);
  return data[0];
}

export async function approveGroupMember(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").update({ status: "active" })
    .eq("group_id", groupId).eq("user_id", userId).eq("status", "pending")
    .select("group_id, user_id, status");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("not permitted");
  invalidateKeys(groupMembersReaders);
  return data[0];
}

// Declining a request and withdrawing your own are the same DELETE, and the delete policy covers
// both (your own row; since 0258 a moderator on a MEMBER row and the owner on any but their own).
// `removeGroupMember` is that DELETE and is reused rather than duplicated.

// Take back my own request to join a group. Scoped to `pending` so a second tap on "Requested"
// cannot leave a group the organiser approved in the meantime; zero rows back is reported.
export async function withdrawGroupJoinRequest(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("group_members").delete()
    .eq("group_id", groupId).eq("user_id", userId).eq("status", "pending").select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("It’s no longer a pending request — the organizer may already have answered it.");
  invalidateKeys(groupMembersReaders);
  return true;
}
// Zero rows back is a refusal, not a leave: since 0258 the OWNER cannot delete their own row (a
// group with no owner can no longer be managed by anyone), and that refusal is a 200 with [].
export async function leaveGroupRow(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").delete().eq("group_id", groupId).eq("user_id", userId).select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("You run this group, so you can’t leave it — delete it from Group settings instead.");
  invalidateKeys(groupMembersReaders);
  return true;
}

// A group's organizer or moderator takes a comment down in their group (0258). It is tombstoned
// rather than deleted so the replies under it keep their thread.
export async function removeGroupComment(commentId) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("remove_group_comment", { cid: commentId });
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
  invalidateKeys(groupsReaders);
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
  invalidateKeys(groupMembersReaders);
  return data[0];
}

// Take back an invite before it is answered. Scoped to `invited` so it cannot remove somebody who
// has since joined; zero rows back is reported rather than read as success.
export async function withdrawGroupInvite(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("group_members").delete()
    .eq("group_id", groupId).eq("user_id", userId).eq("status", "invited").select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("They’ve already answered that invite.");
  invalidateKeys(groupMembersReaders);
  return true;
}
export async function removeGroupMember(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)
    .select("group_id, user_id");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("not permitted");
  invalidateKeys(groupMembersReaders);
  return data[0];
}

// ── 0260: approve all, decline with a message, bans, ownership ──
// Approve every waiting request in one UPDATE (the manager policy from 0178 is unchanged). Returns
// how many were admitted, read off the rows that came back rather than assumed.
export async function approveAllGroupRequests(groupId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("group_members").update({ status: "active" })
    .eq("group_id", groupId).eq("status", "pending").select("user_id");
  if (error) throw error;
  invalidateKeys(groupMembersReaders);
  return (data || []).length;
}
// Removes the request; a non-empty message is left for the climber to read (0260).
export async function declineGroupRequest(groupId, userId, message) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("decline_group_request", { gid: groupId, who: userId, message: message || null });
  if (error) throw error;
  return true;
}
// A decline someone left YOU, with its message. Dismissing deletes your copy.
export function useMyGroupDeclines(userId) {
  return useQuery({
    queryKey: ["my-group-declines", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_join_declines")
        .select("group_id, message, declined_at").eq("user_id", userId).order("declined_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
// The ban list, for a group's managers (RLS returns nothing to anyone else).
export function useGroupBans(groupId, enabled) {
  return useQuery({
    queryKey: ["group-bans", groupId],
    enabled: !!supabase && !!groupId && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_bans")
        .select("user_id, reason, created_at").eq("group_id", groupId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
export async function banGroupMember(groupId, userId, reason) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("ban_group_member", { gid: groupId, who: userId, reason: reason || null });
  if (error) throw error;
  return true;
}
export async function unbanGroupMember(groupId, userId) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("unban_group_member", { gid: groupId, who: userId });
  if (error) throw error;
  return true;
}
export async function transferGroupOwnership(groupId, newOwner) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("transfer_group_ownership", { gid: groupId, new_owner: newOwner });
  if (error) throw error;
  return true;
}

// ── 0260: per-group notification level + last seen, saved posts ──
export function useMyGroupPrefs(userId) {
  return useQuery({
    queryKey: ["my-group-prefs", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_member_prefs")
        .select("group_id, notify, last_seen_at").eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
  });
}
// Every cached reader of group_member_prefs, refreshed after each write to it (check:write-readers).
const groupMemberPrefsReaders = [["my-group-prefs"]];
// Upsert: the row may not exist yet. `fields` is {notify} and/or {last_seen_at}.
export async function setGroupPrefs(groupId, userId, fields) {
  if (!supabase) return null;
  const row = { group_id: groupId, user_id: userId };
  if (fields.notify) row.notify = fields.notify;
  if (fields.lastSeenAt) row.last_seen_at = fields.lastSeenAt;
  const { data, error } = await supabase.from("group_member_prefs")
    .upsert(row, { onConflict: "group_id,user_id" }).select("group_id, notify, last_seen_at");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("That setting didn’t save — try again.");
  invalidateKeys(groupMemberPrefsReaders);
  return data[0];
}
export function useMyGroupPostSaves(userId) {
  return useQuery({
    queryKey: ["my-group-post-saves", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_post_saves").select("post_id").eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((r) => r.post_id);
    },
  });
}
// Every cached reader of group_post_saves, refreshed after each write to it (check:write-readers).
const groupPostSavesReaders = [["my-group-post-saves"]];
export async function setGroupPostSaved(postId, userId, saved) {
  if (!supabase) return null;
  if (saved) {
    const { error } = await supabase.from("group_post_saves").insert({ post_id: postId, user_id: userId });
    if (error && error.code !== "23505") throw error;
    invalidateKeys(groupPostSavesReaders);
    return true;
  }
  const { error } = await supabase.from("group_post_saves").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) throw error;
  invalidateKeys(groupPostSavesReaders);
  return true;
}

// Every cached reader of group_reports, refreshed after each write to it (check:write-readers).
const groupReportsReaders = [["group-reports"]];
// ── 0260: reports to a group's own moderators ──
// `row` = {group_id, target_kind: post|comment|member, target_id, reported_user, reason, detail,
// snapshot}. No .select(): the reporter can read their row back, but nothing here needs it.
export async function fileGroupReport(row) {
  if (!supabase) return null;
  const { error } = await supabase.from("group_reports").insert({ ...row, status: "open" });
  if (error) throw error;
  invalidateKeys(groupReportsReaders);
  return true;
}
// Open reports for the groups the caller manages; RLS scopes it, the id list only narrows the read.
export function useGroupReports(groupIds) {
  const ids = [...new Set((groupIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["group-reports", ids],
    enabled: !!supabase && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_reports")
        .select("id, group_id, target_kind, target_id, reported_user, reason, detail, snapshot, created_at")
        .in("group_id", ids).eq("status", "open").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}
export async function closeGroupReport(reportId, status) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("group_reports").update({ status }).eq("id", reportId).select("id");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("Only the group’s organizer or a moderator can close a report.");
  invalidateKeys(groupReportsReaders);
  return true;
}

// ── Group posts, reactions, events, RSVPs and event invites (0230) ──
// Until 0230 all five were React state in a REAL group: seen by their author alone, gone on
// reload. RLS decides who may read and write (members; managers pin and delete; the author edits;
// events follow the group's event_policy; capacity is enforced by a trigger). Every write that can
// be refused by RLS asks for the row back, because a refused UPDATE/DELETE is a 200 with no rows.
// LIVE (lib/live.js): a post, edit, pin, delete or reaction in any of these groups refetches
// the feed. Only members can read group_posts (RLS), and Realtime applies the same policy.
export function useGroupFeed(groupIds) {
  const ids = [...new Set((groupIds || []).filter(Boolean))].sort();
  return useLiveQuery({
    queryKey: ["group-feed", ids],
    enabled: !!supabase && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_posts")
        .select("id, group_id, author, body, photos, photo_alts, pinned, pinned_at, edited, topic, moderation, created_at, group_post_reactions(user_id, reaction)")
        .in("group_id", ids).order("created_at", { ascending: false }).limit(400);
      if (error) throw error;
      return data || [];
    },
  }, [
    { table: "group_posts", filter: inFilter("group_id", ids), match: (row) => ids.includes(row.group_id), cached: (old, data) => heldIds(data, old.id) },
    { table: "group_post_reactions", match: (row, data) => heldIds(data, row.post_id), cached: (old, data) => heldIds(data, old.post_id) },
  ]);
}
// Every cached reader of group_posts, refreshed after each write to it (check:write-readers).
const groupPostsReaders = [["group-feed"]];
export async function createGroupPost(groupId, userId, body, photos, photoAlts, topic) {
  const { data, error } = await supabase.from("group_posts")
    .insert({ group_id: groupId, author: userId, body, photos: photos || [], photo_alts: photoAlts || {}, topic: topic || null })
    .select("id").single();
  if (error) throw error;
  invalidateKeys(groupPostsReaders);
  return data;
}
export async function updateGroupPost(postId, fields) {
  const { data, error } = await supabase.from("group_posts").update(fields).eq("id", postId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — try again.");
  invalidateKeys(groupPostsReaders);
}
export async function deleteGroupPost(postId) {
  const { data, error } = await supabase.from("group_posts").delete().eq("id", postId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That post couldn’t be deleted.");
  invalidateKeys(groupPostsReaders);
}
// `reaction` null clears it. One row per (post, climber), so setting is an upsert.
export async function setGroupPostReaction(postId, userId, reaction) {
  if (!reaction) {
    const { error } = await supabase.from("group_post_reactions").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("group_post_reactions")
    .upsert({ post_id: postId, user_id: userId, reaction }, { onConflict: "post_id,user_id" });
  if (error) throw error;
}

export function useGroupEventsFor(groupIds) {
  const ids = [...new Set((groupIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["group-events", ids],
    enabled: !!supabase && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_events")
        .select("id, group_id, host, title, event_date, event_time, location, descr, capacity, repeat, series_id, group_event_rsvps(user_id), group_event_invites(invitee)")
        .in("group_id", ids).order("event_date", { ascending: true }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}
// Every cached reader of group_events, refreshed after each write to it (check:write-readers).
const groupEventsReaders = [["group-events"]];
// Rows are inserted together so a series is all-or-nothing; the host's own RSVP follows.
export async function createGroupEvents(rows, hostId) {
  const { data, error } = await supabase.from("group_events").insert(rows).select("id, event_date");
  if (error) throw error;
  if (!data || data.length !== rows.length) throw new Error("Not every date was saved — try again.");
  const { error: rErr } = await supabase.from("group_event_rsvps")
    .insert(data.map((e) => ({ event_id: e.id, user_id: hostId })));
  // The events exist whether or not the host's RSVP landed, so the calendar is refreshed either way.
  invalidateKeys(groupEventsReaders);
  if (rErr) throw rErr;
  return data;
}
export async function deleteGroupEvent(eventId) {
  const { data, error } = await supabase.from("group_events").delete().eq("id", eventId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("Only the host or an organizer can cancel this event.");
  invalidateKeys(groupEventsReaders);
}
// Cancel several events of one series in one statement. RLS drops a row the caller may not delete, so the count
// is checked: fewer back than asked means some are still there.
export async function deleteGroupEvents(eventIds) {
  const { data, error } = await supabase.from("group_events").delete().in("id", eventIds).select("id");
  if (error) throw error;
  invalidateKeys(groupEventsReaders);
  invalidateKeys(groupEventInvitesReaders);
  if (!data || data.length !== eventIds.length) throw new Error("Not every event could be cancelled — only the host or an organizer can cancel one.");
}
// Edit one event, or several of a series, with the same values. Only the host passes the update policy, and a row
// RLS refuses comes back as no row at all, so the count is checked. An invite's card reads the title and date.
export async function updateGroupEvents(eventIds, patch) {
  const { data, error } = await supabase.from("group_events").update(patch).in("id", eventIds).select("id");
  if (error) throw error;
  invalidateKeys(groupEventsReaders);
  invalidateKeys(groupEventInvitesReaders);
  if (!data || data.length !== eventIds.length) throw new Error("Only the host can edit this event.");
}
export async function rsvpGroupEvent(eventId, userId, going) {
  if (going) {
    const { error } = await supabase.from("group_event_rsvps").insert({ event_id: eventId, user_id: userId });
    if (error && error.code !== "23505") throw error;
    return;
  }
  const { error } = await supabase.from("group_event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
  if (error) throw error;
}
// Decline an event invite: the invitee may delete their own row (0230 policy "declined by the invitee").
export async function declineGroupEventInvite(eventId, userId) {
  const { error } = await supabase.from("group_event_invites").delete().eq("event_id", eventId).eq("invitee", userId);
  if (error) throw error;
  invalidateKeys(groupEventInvitesReaders);
}
// Every cached reader of group_event_invites, refreshed after each write to it (check:write-readers).
const groupEventInvitesReaders = [["my-event-invites"]];
export async function inviteToGroupEvent(eventId, invitee, userId) {
  const { error } = await supabase.from("group_event_invites").insert({ event_id: eventId, invitee, invited_by: userId });
  if (error && error.code !== "23505") throw error;
  invalidateKeys(groupEventInvitesReaders);
}
// Event invites addressed to me, with what the bell needs to say and where to go.
export function useMyEventInvites(userId) {
  return useQuery({
    queryKey: ["my-event-invites", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("group_event_invites")
        .select("event_id, invited_by, created_at, group_events(title, event_date, event_time, group_id, groups(name))")
        .eq("invitee", userId).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data || [];
    },
  });
}
