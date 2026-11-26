// lib/db-contributions.js — what climbers contribute about a place: contributions, area stats, pairings, condition reports, ranks, log tags.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { invalidateKeys, patchQueries } from "./queryClientRef";
import { supabase } from "./supabase";
import { offlinePackContribs } from "./offline";
import { orOfflineExact } from "./db-shared.js";
import { fetchSharedLogs } from "./db-logs.js";

// fetchAllAreas / fetchAllRoutes / fetchAllPaged lived here until they were removed as
// uncalled. They paged the WHOLE table with select("*"), and the comment above them said
// "the ~1,827 routes" — the table holds 205,543. Anyone who read that number would have
// thought calling it was cheap; it would have pulled every jsonb and prose column for the
// entire catalog into the browser. Nothing called either one. If a full-catalog read is
// ever genuinely needed, write a scoped query for the columns it needs rather than
// restoring a select("*") over 205k rows.

// ── contributions (Phase 1 persistence) ───────────────────────────────────
// Every community add/fix/report/rating/photo lands here as an append-only row.

// All contributions for a route, oldest first (consensus is computed client-side).
// With no signal a PACKED route answers from the copy saved with it (photos excluded — see
// lib/offline.js), stamped `_packedAt`; structuralSharing is off so that stamp reaches the page.
export async function fetchRouteContributions(routeId) {
  const { data, error } = await supabase
    .from("contributions").select("*").eq("route_id", routeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}
export function useRouteContributions(routeId) {
  return useQuery({
    queryKey: ["contributions", routeId],
    enabled: !!supabase && !!routeId,
    structuralSharing: false,
    queryFn: () => orOfflineExact(() => fetchRouteContributions(routeId), () => offlinePackContribs(routeId)),
  });
}

// One area's climber edits (0304): contributions rows carrying area_id and no route_id. Read by
// the area page's pending banner and by the editor's "N of 3" rows.
async function fetchAreaContributions(areaId) {
  const { data, error } = await supabase
    .from("contributions").select("*").eq("area_id", areaId).is("route_id", null).eq("kind", "field")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}
export function useAreaContributions(areaId) {
  return useQuery({
    queryKey: ["area-contributions", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: () => fetchAreaContributions(areaId),
  });
}
// Climbs per discipline and per grade bucket over an area's SUBTREE (area_climb_stats, 0304):
// { total, graded, by_disc: [{disc, n}], by_grade: [{sys, bucket, n}], by_grade_disc: [{disc, sys, bucket, n}] }
// (by_grade_disc since 0476: the grade spread's one chip per discipline). Backs the CLIMBS HERE
// chart. Not called on world/country: the whole catalog in one call exceeds the statement timeout.
// CLASSIC CLIMBS HERE on an area ABOVE a wall (0391 area_classics): every classic route under it (500 at most, each row
// carrying the full `total`), best
// first. A wall's own page ranks the rows it already loaded (areaClassics in DbAreaBrowser) and asks nothing.
export function useAreaClassics(areaId, enabled) {
  return useQuery({
    queryKey: ["area-classics", areaId],
    enabled: !!supabase && !!areaId && enabled !== false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_classics", { p_area_id: areaId, p_limit: 500 });
      if (error) throw error;
      // A list row, not a route: `_thin` makes openRoute load the whole row before the route page renders it.
      return (data || []).map((r) => ({ ...r, _thin: true }));
    },
  });
}

export function useAreaClimbStats(areaId) {
  return useQuery({
    queryKey: ["area-climb-stats", areaId],
    enabled: !!supabase && !!areaId,
    // Catalog counts change only on an import: revisiting an area within 5 min draws the
    // charts from cache without asking again (the area page's other stats hooks do the same).
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_climb_stats", { aid: areaId });
      if (error) throw error;
      return data;
    },
  });
}

// CRAG REGULAR (crag_regular, 0404): the climber with the most logged days under an area in the last
// 90 days — {user_id, name, username, show_name, avatar, days, logs, last_day, is_me} — or null when
// nobody has two days there yet. Signed-in only (the RPC raises for a guest), so `enabled` is the uid.
export function useCragRegular(areaId, enabled) {
  return useQuery({
    queryKey: ["crag-regular", areaId],
    enabled: !!supabase && !!areaId && !!enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("crag_regular", { p_area_id: areaId });
      if (error) throw error;
      return Array.isArray(data) && data.length ? data[0] : null;
    },
  });
}

// Logged climbs under an area by calendar month (area_logged_months, 0403): twelve counts, January
// first, over the whole subtree — every visible log, counts only. Backs MOST LOGGED HERE beside the
// Season strip on the area page. null areaId asks nothing.
export function useAreaLoggedMonths(areaId) {
  return useQuery({
    queryKey: ["area-logged-months", areaId],
    enabled: !!supabase && !!areaId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_logged_months", { aid: areaId });
      if (error) throw error;
      return Array.isArray(data) ? data.map(Number) : [];
    },
  });
}

// LATEST FROM THIS AREA (area_latest_reports, 0414): the newest public reports under an area's whole
// subtree, and the condition tags of every visible log there in the last 45 days (no author, no climb)
// for the hazard badge. The function hands back report IDS only; the rows come through
// useAreaLatestReportRows (fetchSharedLogs), the same read and visibility rule as the route page's
// community reports. Since 0428 it also hands back each report's climb and author ids (`refs`), so the
// card starts the report, climb and profile reads together: two round trips, where it took three
// (2026-11-14). `refs` is null from a database without 0428; the card then waits for the rows.
// Since 0478 it also sorts and filters over the WHOLE area: `opts` is { disc, since, sort, kind } (one
// primary discipline; a YYYY-MM-DD day; "newest" | "oldest"; "report" = has a write-up, "log" = a logged
// climb with tags only), `limit` reaches 100, each ref carries its climb's discipline and its kind, and
// the answer counts what matches (`total`), what there is unfiltered (`totalAll`) and per discipline
// (`discs`). A wider page or a new filter keeps the rows in hand on screen until the new ones land.
export function useAreaLatestReports(areaId, limit = 4, opts) {
  const o = opts || {};
  const disc = o.disc || null, since = o.since || null, kind = o.kind || null;
  const sort = o.sort === "oldest" ? "oldest" : "newest";
  return useQuery({
    queryKey: ["area-latest-reports", areaId, limit, disc, since, sort, kind],
    enabled: !!supabase && !!areaId,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_latest_reports", { aid: areaId, lim: limit, days: 45, disc, since, sort, kind });
      if (error) throw error;
      const ids = Array.isArray(data && data.latest) ? data.latest : [];
      const refs = Array.isArray(data && data.latest_refs) ? data.latest_refs.filter((x) => x && x.id) : null;
      const recentTags = Array.isArray(data && data.recent_tags) ? data.recent_tags.filter(Array.isArray) : [];
      const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : ids.length);
      const discs = data && data.discs && typeof data.discs === "object" && !Array.isArray(data.discs) ? data.discs : {};
      return { ids, refs, recentTags, total: num(data && data.total), totalAll: num(data && data.total_all), discs };
    },
  });
}
// The report rows for useAreaLatestReports' ids, in that order. Keyed under "area-latest-reports" so
// a climb-log write refreshes it with the ids (logReaders).
export function useAreaLatestReportRows(ids) {
  const list = Array.isArray(ids) ? ids : [];
  return useQuery({
    queryKey: ["area-latest-reports", "rows", list.join(",")],
    enabled: !!supabase && list.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const rows = await fetchSharedLogs("id", list, list.length);
      const order = new Map(list.map((id, i) => [id, i]));
      return rows.slice().sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
    },
  });
}

// Graded climbs under each CHILD of an area, per grade system and whole-number bucket
// (area_children_grade_counts, 0402): {childId: [{sys, bucket, n}]}. ONE call for the whole list of
// wall cards; a child with nothing graded is absent. Backs WallGradeBars on the area page.
// Each child area's climbs BY DISCIPLINE (0455), for the sub-area list's "Most sport / trad / bouldering"
// sorts: { childId: { discipline: n } }. A failed read leaves those sorts out of the menu rather than
// sorting every child as if it held none.
export function useAreaChildrenDiscCounts(areaId, opts) {
  const enabled = !opts || opts.enabled !== false;
  return useQuery({
    queryKey: ["area-children-disc-counts", areaId],
    enabled: !!supabase && !!areaId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_children_disc_counts", { aid: areaId });
      if (error) throw error;
      return data || {};
    },
  });
}

export function useAreaChildrenGradeCounts(areaId) {
  return useQuery({
    queryKey: ["area-children-grade-counts", areaId],
    enabled: !!supabase && !!areaId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_children_grade_counts", { aid: areaId });
      if (error) throw error;
      return data || {};
    },
  });
}

// Every cached reader of contributions, refreshed after each write to it (check:write-readers).
// The RPC readers (area_top_contributors, user_top_contributor_areas, leaderboard) are listed by
// hand — the guard cannot see them. An approved area edit (0319) rewrites the AREA row, so the
// area readers are refreshed as well.
export const contributionsReaders = [["contributions"], ["area-photo-feed"], ["route-pairings"], ["my-contributions"], ["route-proposals"], ["field-contributions"], ["admin-queue-counts"], ["route-field-confidence"], ["area-contributions"], ["area"], ["area-children"], ["area-contributors"], ["user-top-contrib-areas"], ["leaderboard"], ["desk-history"], ["desk-field-history"], ["desk-climbers"], ["desk-climber"], ["desk-health"]];
// Persist one contribution. Returns the saved row, or null if the DB is off.
// c = { route_id?, area_id?, kind, field?, value, contributor? }
// `contributor` is stamped here rather than at the call sites: consensus ("3 climbers
// agree", computed client-side from these rows per 0002_contributions.sql) counts
// DISTINCT contributors, so a row that falls back to the column default 'anon' makes
// every submission look like the same person. Defaulting centrally means a new call
// site cannot forget it and silently break the threshold.
// 0351: the review_note the database puts on a route edit that TAKES SOMETHING OFF the page
// (fewer waypoints, pitches or rows; a pin removed; a field cleared). Such an edit waits for the
// owner however many climbers send it; the edit sheet, the toast and the owner's queue read it.
export const REMOVAL_NOTE = "Removes something from the page — waits for ClimbMatch to check it";

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
  invalidateKeys(contributionsReaders);
  return data;
}

// A climber's OWN sun votes on a route, removed (0515 lets a climber delete their own kind 'sun' rows).
// The log form files ONE vote per climber per route: correcting it removes the old row before filing the
// new one, and clearing it on edit removes it outright, so neither piles up on the Review desk.
export async function withdrawMySunVotes(routeId) {
  if (!supabase || !routeId) return 0;
  const { data: u } = await supabase.auth.getUser();
  const me = u && u.user && u.user.id;
  if (!me) return 0;
  const { data, error } = await supabase.from("contributions").delete()
    .eq("route_id", routeId).eq("kind", "sun").eq("contributor", me).select("id");
  if (error) throw error;
  invalidateKeys(contributionsReaders);
  return (data || []).length;
}

// ── "Pairs well with" (0223) ──
// A pairing is a contributions row of kind 'pair' on ONE route, value {with, withName, note}, and
// it belongs on BOTH routes' pages -- so this reads the rows filed on this route AND the rows that
// name it as `with`. Two reads rather than one `.or()` over a JSON path, which PostgREST spells in
// a way that is easy to get silently wrong.
export function useRoutePairings(routeId) {
  return useQuery({
    queryKey: ["route-pairings", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        supabase.from("contributions").select("id, route_id, value, contributor, created_at").eq("kind", "pair").eq("route_id", routeId),
        supabase.from("contributions").select("id, route_id, value, contributor, created_at").eq("kind", "pair").eq("value->>with", routeId),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      const seen = new Set();
      return [...(a.data || []), ...(b.data || [])].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    },
  });
}
// Other routes the same climber logged on the same day, from SHARED logs only, as counts.
export function useRouteLoggedWith(routeId) {
  return useQuery({
    queryKey: ["route-logged-with", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("route_logged_with", { p_route_id: routeId, p_limit: 5 });
      if (error) throw error;
      return data || [];
    },
  });
}
// LINK-UPS (0395): every researched link-up this climb is a leg of. One row renders on every member
// climb's page, so the read is "route_ids contains this id" (GIN-indexed). A failure throws, so the
// section says it could not load rather than reading as "no link-ups".
export function useRouteLinkUps(routeId) {
  return useQuery({
    queryKey: ["route-link-ups", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase.from("route_link_ups")
        .select("id, name, region, route_ids, legs, duration, how, descent, logistics")
        .contains("route_ids", [routeId]).order("name");
      if (error) throw error;
      return data || [];
    },
  });
}
export async function submitRoutePairing(routeId, withRoute, note) {
  if (!supabase) return null;
  const n = String(note || "").trim().slice(0, 280);
  return submitContribution({ route_id: routeId, kind: "pair", value: { with: withRoute.id, withName: withRoute.name || null, note: n || null } });
}
// RLS refuses by matching zero rows, so an empty result is a refusal, not a success.
export async function deleteRoutePairing(rowId) {
  if (!supabase) return null;
  // OPTIMISTIC: the suggestion leaves the cached pairings on the tap; a refusal puts it back.
  const undo = patchQueries(["route-pairings"], (d) => Array.isArray(d) && d.some((r) => r.id === rowId) ? d.filter((r) => r.id !== rowId) : d);
  const { data, error } = await supabase.from("contributions").delete().eq("id", rowId).eq("kind", "pair").select();
  if (error) { undo(); throw error; }
  if (!data || !data.length) { undo(); throw new Error("That suggestion could not be removed — it may not be yours."); }
  invalidateKeys(contributionsReaders);
  return data[0];
}

// Every cached reader of user_reports, refreshed after each write to it (check:write-readers).
const userReportsReaders = [["my-filed-reports"]];
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
  // Signed IN, the reporter may read their own row back, so ask for its id and page the reviewer
  // (notify-safety-report only acts for the report's own reporter). Signed OUT keeps the plain insert.
  if (uid) {
    const { data: ins, error: e2 } = await supabase.from("user_reports").insert(row).select("id").single();
    if (e2) throw e2;
    try { if (ins && ins.id) supabase.functions.invoke("notify-safety-report", { body: { reportId: ins.id } }).catch(() => {}); } catch (_e) { /* ignore */ }
    return true;
  }
  const { error } = await supabase.from("user_reports").insert(row);
  if (error) throw error;
  invalidateKeys(userReportsReaders);
  return true;
}

// Top contributors rolled up through an area's subtree (live-catalog leaderboard).
// Returns [{ contributor, n }] via the area_top_contributors RPC (0005, rewritten in 0148, 0333).
// `contributor` is the contributor's auth uid — pair with useProfilesByIds to display names.
// Never render it raw: DbAreaBrowser did, and an unresolved row printed a uuid as a person.
// `n` is POINTS, summed from contribution_points() (0333) — the one ledger the profile badge and
// the Ranks › Contributions board read too: only live work, each kind once per place, weighted
// (new climb 10, photo/topo 5, edit/topo line 2, report 1). 0333's header has the table and why.
// Trip reports still do not count (private to their author — 0148).
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

// The areas where one climber tops the contributor leaderboard (0222), for the profile's
// Top Contributor badge. Keyed by uid; the old seed badge matched display names.
export function useUserTopContribAreas(uid) {
  return useQuery({
    queryKey: ["user-top-contrib-areas", uid],
    enabled: !!supabase && !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("user_top_contributor_areas", { p_uid: uid });
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Ranks (0194) ──
// The leaderboard is computed server-side: climb_logs is author-only under RLS, so no client
// can count anybody else's climbs. One row per rankable climber, every board's number in
// `stats.all` / `stats.backed` (backed = partner-confirmed or carrying a photo/GPS track).
// 0194's header states the counting rules; do not re-derive them here. `version` is a cheap
// signature of the caller's own logs, so logging a climb re-reads the board.
export function useLeaderboard({ scope, areaId, radiusMi, enabled, version }) {
  return useQuery({
    queryKey: ["leaderboard", scope, areaId || null, radiusMi || null, version || ""],
    enabled: !!supabase && !!enabled && (scope !== "area" || !!areaId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("leaderboard", {
        p_scope: scope, p_area_id: areaId || null, p_radius_mi: radiusMi || 120,
      });
      if (error) throw error;
      return data || [];
    },
  });
}

// The logs behind one climber's numbers on Ranks (0357): what each one adds to every board, with
// the ones the viewer may not read returned hidden. Read only while the breakdown sheet is open.
export function useRankBreakdown({ userId, areaId, enabled, version }) {
  return useQuery({
    queryKey: ["rank_breakdown", userId || null, areaId || null, version || ""],
    enabled: !!supabase && !!enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rank_breakdown", { p_user: userId, p_area_id: areaId || null });
      if (error) throw error;
      return data || [];
    },
  });
}

// The "Top climbs" board: most climbers with a PUBLIC trip report on the route.
export function useTopClimbs({ scope, areaId, disc, radiusMi, enabled, version }) {
  return useQuery({
    queryKey: ["leaderboard-top-climbs", scope, areaId || null, disc || "all", radiusMi || null, version || ""],
    enabled: !!supabase && !!enabled && (scope !== "area" || !!areaId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("leaderboard_top_climbs", {
        p_scope: scope, p_area_id: areaId || null, p_disc: disc || "all", p_radius_mi: radiusMi || 120,
      });
      if (error) throw error;
      return data || [];
    },
  });
}

// Climbs a connection tagged ME on ("Climbed with"), unanswered first. Confirming one is what
// makes it count fully on Ranks; denying one takes it off every board.
export function useLogTagsForMe(userId) {
  return useQuery({
    queryKey: ["log-tags-for-me", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("log_tags_for_me");
      if (error) throw error;
      return data || [];
    },
  });
}

// verdict: "confirmed" | "denied". Throws on refusal (not tagged, not a connection, blocked).
export async function respondToLogTag(logId, verdict) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("respond_to_log_tag", { p_log_id: logId, p_verdict: verdict });
  if (error) throw error;
  return data;
}
