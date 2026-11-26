// lib/db-admin.js — admin and the review desk: route/area proposals, placement and wall-order claims, data rights, accessibility reports, app feedback, GPS review.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { announceCatalogChange, invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { allRows } from "./db-shared.js";
import { contributionsReaders, submitContribution } from "./db-contributions.js";
import { fetchProfilesByIds } from "./db-partners.js";

// ── route proposals: the consume half of AddRoute (migration 0125) ────────────────
// AddRoute has filed `new_route` rows into `contributions` since #794 and NOTHING read
// them — no `createRoute` existed anywhere in this file, so a climber's proposal was
// accepted, toasted as "Submitted for review", and could never become a route. These
// four are the review path.
//
// Approval is an RPC, not an insert: `routes` is a 205k-row catalog and stays ungranted,
// so the id convention and the (area_id, name) duplicate refusal live in SQL where no
// caller can skip them. See 0125 for why.

// Does the signed-in account hold the admin flag? Read from `profiles`, never trusted
// from client state — the review UI is gated on this, and the RPCs re-check it in SQL
// anyway, so a tampered client gets a P0001 rather than a write.
export function useIsAdmin(userId) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("is_admin").eq("id", userId).maybeSingle();
      if (error) throw error;
      return !!(data && data.is_admin);
    },
  });
}

// Pending route proposals, newest first. `contributions` is publicly readable (0002), so
// this resolves for anyone — the point of gating the UI on useIsAdmin is that only an
// admin is shown an approve button that would actually work.
export function useRouteProposals(status = "pending") {
  return useQuery({
    queryKey: ["route-proposals", status],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("id,area_id,value,contributor,created_at,status,review_note,reviewed_at")
        .eq("kind", "new_route").eq("status", status)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}

// Returns the NEW ROUTE ID on success. Throws with the SQL function's own message on a
// refusal — "area X already holds a route named Y" is the one worth surfacing verbatim,
// because it means a human has to decide whether it is really the same climb.
// `gradeNum` is computed by the CALLER from the proposal it already has in hand (see
// RouteProposals.jsx) and passed through, because `routes` has no client INSERT/UPDATE
// policy — only "routes public read" from 0001 — so the row can only be written by the
// SECURITY DEFINER function. Sending null is fine and means "unparseable", which is exactly
// what a catalog route with an unparseable grade carries too.
export async function approveNewRoute(contributionId, gradeNum) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("approve_new_route", {
    p_contribution_id: contributionId,
    p_grade_num: Number.isFinite(gradeNum) ? gradeNum : null,
  });
  if (error) throw error;
  // A new routes row changes every listing that counts or lists routes under its area. The
  // proposals screen refreshed area-routes alone; the finder, "View all N routes", the route
  // count on the area card and search kept the old answer until a reload.
  invalidateKeys([["area-routes"], ["subtree-routes"], ["subtree-route-count"], ["route-search"], ["area-children"]]);
  return data;
}

// ── New AREA proposals (0360) ──
// A climber proposes a place the catalog lacks: kind 'new_area', area_id = the PARENT, value =
// {name, areaType, description, lat, lng}. Nothing shows until an admin approves it, and
// approve_new_area writes the areas row (the area triggers still refuse a duplicate place).
export async function submitNewArea(parentId, v) {
  return submitContribution({ kind: "new_area", area_id: parentId, route_id: null, field: null, value: v });
}
export function useAreaProposals(status = "pending") {
  return useQuery({
    queryKey: ["route-proposals", "areas", status],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("id,area_id,value,contributor,created_at,status,review_note,reviewed_at")
        .eq("kind", "new_area").eq("status", status)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}
// ── "Wrong place?" claims on an AREA (0372) ──
// A climber says an area is filed under the wrong place. Kind 'area_placement', area_id = the area,
// value = {note, suggested}. Nothing on the page changes: the owner moves the area by hand and then
// resolves the claim (resolve_area_placement). A signed-out climber gets a code, not a write.
export async function submitAreaPlacementClaim(areaId, note, suggested) {
  if (!supabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const uid = u && u.user && u.user.id;
  if (!uid) { const e = new Error("Sign in to tell us where this area belongs."); e.code = "signed-out"; throw e; }
  await submitContribution({ kind: "area_placement", area_id: areaId, route_id: null, field: null, contributor: uid, value: { note, suggested: suggested || null } });
  return true;
}
export function useAreaPlacementClaims(status = "pending") {
  return useQuery({
    queryKey: ["route-proposals", "area-placement", status],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("id,area_id,value,contributor,created_at,status,review_note,reviewed_at,areas(name,parent_id)")
        .eq("kind", "area_placement").eq("status", status)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}
// status 'approved' = the owner moved the area; 'rejected' = it was already right.
export async function resolveAreaPlacement(contributionId, status, note) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("resolve_area_placement", { p_contribution_id: contributionId, p_status: status, p_note: note || null });
  if (error) throw error;
  // The resolved claim leaves the pending list: without this the card stayed, and a second tap was refused.
  invalidateKeys([["route-proposals", "area-placement"]]);
  return true;
}
// ── "Order wrong?" on a WALL's climb list (0485) ──
// A climber puts the wall's climbs in left-to-right order. Kind 'wall_order', area_id = the wall,
// value = {order: [route ids, left to right], note} -- the climbs the climber has in the line, not
// the ones still without a place. Nothing on the page changes: the owner reads it on the Review desk
// (review.html), in the same table as held route edits and flags (owner, 2026-11-23: "I receive it in
// the admin like what would happen when people suggest edits"), and approving it writes
// routes.sort_order (resolve_wall_order) -- the ONE order every climber sees. A signed-out climber gets
// a code, not a write. Who is signed in is read from the session ON THE DEVICE: getUser() is a
// network call, and at a crag with a weak signal its failure read as "signed out".
export async function submitWallOrderSuggestion(areaId, order, note) {
  if (!supabase) return null;
  const { data: s } = await supabase.auth.getSession();
  const uid = s && s.session && s.session.user && s.session.user.id;
  if (!uid) { const e = new Error("Sign in to suggest an order for this wall."); e.code = "signed-out"; throw e; }
  const value = { order: (order || []).map(String), note: note || null };
  // contributions.value is capped at 20,000 characters (contributions_value_len_ck).
  if (JSON.stringify(value).length > 19500) throw new Error("This wall has too many climbs to send as one order. Tell us through Feedback instead.");
  await submitContribution({ kind: "wall_order", area_id: areaId, route_id: null, field: null, contributor: uid, value });
  return true;
}
export function useWallOrderSuggestions(status = "pending") {
  return useQuery({
    queryKey: ["route-proposals", "wall-order", status],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("id,area_id,value,contributor,created_at,status,review_note,reviewed_at,areas(name)")
        .eq("kind", "wall_order").eq("status", status)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}
// The climbs of the walls that have a suggestion waiting, for the Review desk: {area_id: [rows]}.
// Its own key, refreshed by resolveWallOrder: under "area-routes" every desk write that refreshes the
// app's climb lists re-read every pending wall.
export function useWallRoutesByAreaIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["wall-order-walls", key],
    enabled: !!supabase && !!(ids || []).length,
    // The key changes whenever a suggestion is resolved or a new one arrives. Without this every other
    // wall's row fell back to "Loading" and raw ids until the new read landed.
    placeholderData: (prev) => prev,
    queryFn: async () => {
      // 40 walls per request: an area id is a long slug, and up to 200 of them in one URL is more than the
      // gateway accepts -- one refused read would block every wall order on the desk.
      const rows = [];
      for (let i = 0; i < ids.length; i += 40) {
        const part = ids.slice(i, i + 40);
        rows.push(...(await allRows(() => supabase.from("routes").select("id,name,area_id,sort_order,discipline").in("area_id", part).order("id"))));
      }
      const map = {};
      (ids || []).forEach((id) => { map[id] = []; });
      rows.forEach((r) => { (map[r.area_id] || (map[r.area_id] = [])).push(r); });
      return map;
    },
  });
}
// status 'approved' = the order is written to the wall's climbs; 'rejected' = the wall keeps its order.
// An approval rewrites routes.sort_order, so the cached climb lists that sort by it are refreshed
// in the tab that approved, and that tab ANNOUNCES it (announceCatalogChange) so the owner's other
// ClimbMatch tabs in this browser re-read the wall at once: the Review desk (review.html) has its own
// query cache. Another climber's device still keeps the list it loaded until its next read
// (CATALOG_STALE_MS, 15 minutes). A state
// downloaded to the device keeps the order it was packed with until it is downloaded again. The
// decision also files a notice for the sender, so the bell is refreshed (it matters when the owner
// reviews their own suggestion; anyone else's bell re-reads on its own timer).
export async function resolveWallOrder(contributionId, status, note) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("resolve_wall_order", { p_contribution_id: contributionId, p_status: status, p_note: note || null });
  if (error) throw error;
  invalidateKeys([...contributionsReaders, ["area-routes"], ["area-routes-full"], ["subtree-routes"], ["wall-order-walls"], ["my-notices"]]);
  announceCatalogChange([["area-routes"], ["area-routes-full"], ["subtree-routes"], ["my-notices"]]);
  return true;
}

// Returns the NEW AREA ID. A refusal (a same-named place nearby, a parent that holds climbs) is
// thrown with the database's own words, for the reviewer to read.
export async function approveNewArea(contributionId) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("approve_new_area", { p_contribution_id: contributionId });
  if (error) throw error;
  invalidateKeys([...contributionsReaders, ["area-search"], ["catalog-area-search"]]);
  return data;
}

// Rejects a new_route OR a new_area proposal (0505 checks the kind). The note is the reason the
// proposer is shown and must be at least 10 characters; `strike` false = an honest mistake, no strike.
export async function rejectNewRoute(contributionId, note, strike = true) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("reject_new_route", { p_contribution_id: contributionId, p_note: note || null, p_strike: strike !== false });
  if (error) throw error;
  invalidateKeys([...contributionsReaders]);
  return true;
}

// Catalog rows a proposal may duplicate (0214 catalog_find_route / catalog_find_area), for the owner's
// proposal queues. A climb is looked up near its area; an area across the state its parent is in (the
// path's second label is the state id), nearest first. A hit is a candidate to READ, not proof.
export function useProposalDuplicates(kind, name, areaId, lat, lng) {
  const nm = (name || "").trim();
  return useQuery({
    queryKey: ["proposal-duplicates", kind, nm, areaId || null, lat ?? null, lng ?? null],
    enabled: !!supabase && nm.length > 1 && (kind !== "new_route" || !!areaId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (kind === "new_route") {
        const { data, error } = await supabase.rpc("catalog_find_route", { p_name: nm, p_area_id: areaId });
        if (error) throw error;
        return (data || []).map(function (h) { return { id: h.route_id, kind: "route", label: h.breadcrumb, grade: h.grade, km: h.km, match: h.match }; });
      }
      let state = null;
      if (areaId) {
        const { data: par, error: pe } = await supabase.from("areas").select("path").eq("id", areaId).maybeSingle();
        if (pe) throw pe;
        state = par && par.path ? String(par.path).split(".")[1] || null : null;
      }
      const { data, error } = await supabase.rpc("catalog_find_area", { p_name: nm, p_state: state, p_lat: lat ?? null, p_lng: lng ?? null });
      if (error) throw error;
      return (data || []).map(function (h) { return { id: h.area_id, kind: "area", label: h.breadcrumb, km: h.km, match: h.match, routeCount: h.route_count }; });
    },
  });
}

// ── data-rights requests (0143) ──────────────────────────────────────────────────────
// The Privacy Policy grants access / correction / export / deletion / opt-out. Until now
// every route to exercise one was a dead end: two addresses on the reserved .example TLD, a
// deletion modal saying "contact support" with no support anywhere in the app, and a Feedback
// button whose own toast reads "nothing was sent". This is the mechanism behind those words.
//
// There is no mailbox, by design -- the owner reads these in the Supabase dashboard. What
// matters for honesty is that the request is RECORDED, so the message shown in front of it
// is true.

// A table that does not exist yet answers PGRST205. The client ships ahead of the migration
// (the same way the climb_logs column work did), so "not migrated yet" has to be
// distinguishable from a real failure rather than thrown as one.
function isMissingTable(error) {
  return !!error && (error.code === "PGRST205" || error.code === "42P01" ||
    /relation .* does not exist|Could not find the table/i.test(error.message || ""));
}

// DELETE MY ACCOUNT (0266 + the delete-account edge function). Actually deletes: uploaded files,
// contributions, then the auth user, which cascades to everything else -- and reads the profile back
// before answering. Throws with the server's own sentence (e.g. an admin is refused), so the caller
// can say exactly why nothing happened; it never resolves unless the account is gone.
export async function deleteMyAccount() {
  if (!supabase) throw new Error("Deleting an account needs a connection to ClimbMatch.");
  const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } });
  if (error) {
    let msg = "";
    try { const b = error.context && typeof error.context.json === "function" ? await error.context.json() : null; msg = (b && b.error) || ""; } catch (_e) { /* fall through */ }
    throw new Error(msg || "Your account could not be deleted right now — try again in a moment.");
  }
  if (!data || data.deleted !== true) throw new Error("Your account could not be deleted right now — try again in a moment.");
  return data;
}

// Returns "recorded" | "unavailable", and never a bare success it cannot back. Telling
// someone their deletion request is logged when the write failed is the swallowed-write shape
// check:writes exists to forbid, and it is worse here than anywhere else in the app.
export async function raiseDataRequest(userId, kind, note) {
  if (!supabase || !userId) return "unavailable";
  const { error } = await supabase.from("data_requests").insert({
    user_id: userId, kind, note: (note || "").trim() || null, status: "open",
  });
  if (error) {
    if (isMissingTable(error)) return "unavailable";
    throw error;
  }
  return "recorded";
}

// The Accessibility statement's report form (0343, 0354). "recorded" only when the row landed,
// "unavailable" when there is no backend, and a throw otherwise -- carrying the server's own sentence
// when it refused (a guest with no email, or a daily limit), so the form can say exactly why.
//
// Filed through file_accessibility_report(), the one path for a guest AND a signed-in climber: the
// publishable key cannot insert into a table as anon (0078), but it can call a definer function, as
// record_route_view() (0353) already does. The client ships ahead of its migration, so while that
// function does not exist yet a signed-in climber falls back to 0343's direct insert.
// Then page the owner (notify-accessibility-report). Fire-and-forget: the report is already filed,
// and an unconfigured mailer degrades to the Review badge, never to a claim that an email went out.
export async function fileAccessibilityReport(userId, { screen, problem, assistive, email }) {
  if (!supabase) return "unavailable";
  const { data, error } = await supabase.rpc("file_accessibility_report", {
    p_problem: (problem || "").trim(), p_screen: (screen || "").trim() || null,
    p_assistive: (assistive || "").trim() || null, p_email: (email || "").trim() || null,
  });
  if (error) {
    const missingFn = error.code === "PGRST202" || /function .* does not exist/i.test(error.message || "");
    if (!missingFn) throw error;
    if (!userId) return "unavailable";
    const ins = await supabase.from("accessibility_reports").insert({
      user_id: userId, screen: (screen || "").trim() || null, problem: (problem || "").trim(),
      assistive: (assistive || "").trim() || null, status: "open",
    });
    if (ins.error) {
      if (isMissingTable(ins.error)) return "unavailable";
      throw ins.error;
    }
    invalidateKeys(accessibilityReportsReaders);
    return "recorded";
  }
  invalidateKeys(accessibilityReportsReaders);
  try { if (data) supabase.functions.invoke("notify-accessibility-report", { body: { reportId: data } }).catch(() => {}); } catch (_e) { /* ignore */ }
  return "recorded";
}

// Every cached reader of accessibility_reports, refreshed after each write to it (check:write-readers).
const accessibilityReportsReaders = [["accessibility-report-queue"], ["admin-queue-counts"]];

// The owner's queue (0354): reports oldest first, each with the address to reply to. The sign-in
// email lives in auth.users, which no client can read, so this is an admin-only definer function
// rather than a table read. A non-admin is refused by the function (42501), not shown an empty list.
export function useAccessibilityReportQueue(enabled, status = "open") {
  return useQuery({
    queryKey: ["accessibility-report-queue", status],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("accessibility_report_queue", { p_status: status });
      if (error) throw error;
      return data || [];
    },
  });
}

// Move a report on (open -> in_progress -> done). The UPDATE policy is admin-only, and RLS refuses by
// matching zero rows, so an empty answer is a refusal, not a success.
export async function setAccessibilityReportStatus(id, status) {
  if (!supabase) throw new Error("No connection to ClimbMatch right now.");
  const { data, error } = await supabase.from("accessibility_reports").update({ status }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That report could not be updated — reviewing is admin-only.");
  invalidateKeys(accessibilityReportsReaders);
  return true;
}

// The Menu's Feedback note and Rate app stars (0365). Same contract as fileAccessibilityReport:
// "recorded" only when the row landed, "unavailable" with no backend or before the migration, and a
// throw otherwise -- carrying the server's own sentence when it refused (a daily limit), so the sheet
// can say exactly why. Filed through file_app_feedback(), the one path for a guest AND a signed-in climber.
export async function fileAppFeedback({ kind, message, stars, email, platform, version }) {
  if (!supabase) return "unavailable";
  const { error } = await supabase.rpc("file_app_feedback", {
    p_kind: kind, p_message: (message || "").trim() || null, p_stars: stars || null,
    p_email: (email || "").trim() || null, p_platform: platform || null, p_version: version || null,
  });
  if (error) {
    if (error.code === "PGRST202" || /function .* does not exist/i.test(error.message || "")) return "unavailable";
    throw error;
  }
  invalidateKeys(appFeedbackReaders);
  return "recorded";
}

// Every cached reader of app_feedback, refreshed after each write to it (check:write-readers).
const appFeedbackReaders = [["app-feedback-queue"], ["app-rating-summary"], ["admin-queue-counts"]];

// The owner's queue (0365): open notes oldest first, each with the address to reply to (the guest's,
// else the account's sign-in email, which only the definer function can read). Admin-only; a
// non-admin is refused (42501), not shown an empty list.
export function useAppFeedbackQueue(enabled, status = "open") {
  return useQuery({
    queryKey: ["app-feedback-queue", status],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("app_feedback_queue", { p_status: status });
      if (error) throw error;
      return data || [];
    },
  });
}

// How many climbers rated the app, and the average: each account's latest rating counted once.
export function useAppRatingSummary(enabled) {
  return useQuery({
    queryKey: ["app-rating-summary"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("app_rating_summary");
      if (error) throw error;
      return (data && data[0]) || null;
    },
  });
}

// Mark a note read (open -> done). RLS refuses by matching zero rows, so an empty answer is a refusal.
export async function setAppFeedbackStatus(id, status) {
  if (!supabase) throw new Error("No connection to ClimbMatch right now.");
  const { data, error } = await supabase.from("app_feedback").update({ status }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That message could not be updated — reviewing is admin-only.");
  invalidateKeys(appFeedbackReaders);
  return true;
}

// The owner's GPS queue (0397): recorded tracks and traced crag trails waiting for review, oldest
// first, with the route, its crag, the parking pin, and whether an approval would replace a line.
// Admin-only; a non-admin is refused (42501), not shown an empty list.
export function useGpsSubmissionQueue(enabled) {
  return useQuery({
    queryKey: ["gps-submission-queue"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("gps_submission_queue");
      if (error) throw error;
      return data || [];
    },
  });
}

// Approve or reject one. `toArea` saves the line as the CRAG's walk in (areas.walkin_gpx), drawn on
// every climb there; otherwise it becomes the route's own line. Either way it REPLACES what was
// there (kept in gps_submissions.replaced_gpx), never appends to it. Every reader of the line it
// wrote is refreshed: the crag's area row, and each cached route read.
const gpsReviewReaders = [["gps-submission-queue"], ["admin-queue-counts"], ["area"], ["route-row"], ["routes-by-ids"], ["route-rows-by-ids"], ["area-routes"]];
export async function reviewGpsSubmission(id, action, toArea, notes) {
  if (!supabase) throw new Error("No connection to ClimbMatch right now.");
  const { data, error } = await supabase.rpc("review_gps_submission", { p_id: id, p_action: action, p_to_area: !!toArea, p_notes: notes || null });
  if (error) throw error;
  invalidateKeys(gpsReviewReaders);
  return data;
}


// ── Review desk additions (0530, owner 2026-11-24: "do all" of the admin-page list) ─────────────────────
// Every read below is RLS-gated to an admin (or, where 0530 says so, a reviewer); every write is an
// is_admin() / can_review() RPC. The desk (review/DeskSections.jsx) is the only caller.
const deskReaders = [["desk-history"], ["desk-field-history"], ["desk-climbers"], ["desk-climber"], ["desk-appeals"], ["desk-locks"], ["desk-worklist"], ["desk-health"], ["can-review"], ["safety-appeals"], ["safety-reports"], ["admin-queue-counts"]];
const deskNames = async (ids) => {
  const uniq = [...new Set(ids.filter((x) => x && x !== "anon"))];
  if (!uniq.length) return {};
  const profs = await fetchProfilesByIds(uniq);
  const by = {}; (profs || []).forEach((p) => { by[p.id] = p; });
  return by;
};

// Admin, or a reviewer an admin named (profiles.is_reviewer, 0530). { admin, reviewer }.
export function useCanReview(userId) {
  return useQuery({
    queryKey: ["can-review", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("is_admin,is_reviewer").eq("id", userId).maybeSingle();
      if (error) throw error;
      return { admin: !!(data && data.is_admin), reviewer: !!(data && (data.is_admin || data.is_reviewer)) };
    },
  });
}

// What was decided, newest first: moderation_actions (admin reads all; a reviewer reads edit and flag rows).
export function useModerationHistory(enabled, lim = 300) {
  return useQuery({
    queryKey: ["desk-history", lim],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("moderation_actions")
        .select("id,actor,action,target_kind,target_id,target_owner,note,created_at").order("created_at", { ascending: false }).limit(lim);
      if (error) throw error;
      const rows = data || [];
      const cids = [...new Set(rows.filter((r) => r.target_kind === "contribution").map((r) => r.target_id))];
      const contrib = {};
      if (cids.length) {
        const { data: cs, error: ce } = await supabase.from("contributions")
          .select("id,kind,field,route_id,area_id,status,value,applied_value,prior_value,reviewed_at,routes(name),areas(name)").in("id", cids);
        if (ce) throw ce;
        (cs || []).forEach((c) => { contrib[c.id] = c; });
      }
      const people = await deskNames(rows.flatMap((r) => [r.actor, r.target_owner]));
      return rows.map((r) => ({ ...r, contribution: contrib[r.target_id] || null, actorProfile: people[r.actor] || null, ownerProfile: people[r.target_owner] || null }));
    },
  });
}

// Every edit ever sent for one route (or area) field, newest first, with who sent and who decided.
export function useFieldHistory(routeId, areaId, field) {
  return useQuery({
    queryKey: ["desk-field-history", routeId || "", areaId || "", field || ""],
    enabled: !!supabase && !!(routeId || areaId) && !!field,
    queryFn: async () => {
      let q = supabase.from("contributions").select("id,status,value,applied_value,prior_value,reason,review_note,contributor,created_at,reviewed_at,reviewed_by")
        .eq("kind", "field").eq("field", field).order("created_at", { ascending: false }).limit(100);
      q = routeId ? q.eq("route_id", routeId) : q.eq("area_id", areaId).is("route_id", null);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      const people = await deskNames(rows.flatMap((r) => [r.contributor, r.reviewed_by]));
      return rows.map((r) => ({ ...r, by: people[r.contributor] || null, decider: people[r.reviewed_by] || null }));
    },
  });
}

// Everyone who has sent an edit, flag or proposal: counts by status, standing, reviewer flag.
export function useDeskClimbers(enabled) {
  return useQuery({
    queryKey: ["desk-climbers"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const [cs, st, fl] = await Promise.all([
        supabase.from("contributions").select("contributor,kind,status").in("kind", ["field", "new_route", "new_area", "wall_order"]).limit(20000),
        supabase.from("contribution_standing").select("user_id,status,strikes,until,reason"),
        supabase.from("route_flags").select("reporter,status").limit(20000),
      ]);
      for (const r of [cs, st, fl]) if (r.error) throw r.error;
      const by = {};
      const get = (id) => (by[id] || (by[id] = { id, sent: 0, approved: 0, rejected: 0, pending: 0, flags: 0, standing: null }));
      (cs.data || []).forEach((c) => { if (!c.contributor || c.contributor === "anon") return; const g = get(c.contributor); g.sent++; if (g[c.status] != null) g[c.status]++; });
      (fl.data || []).forEach((f) => { if (f.reporter) get(f.reporter).flags++; });
      (st.data || []).forEach((s) => { get(s.user_id).standing = s; });
      const ids = Object.keys(by);
      const people = await deskNames(ids);
      const { data: rv, error: re } = ids.length ? await supabase.from("profiles").select("id,is_reviewer,is_admin,created_at").in("id", ids) : { data: [], error: null };
      if (re) throw re;
      const flags = {}; (rv || []).forEach((p) => { flags[p.id] = p; });
      return ids.map((id) => ({ ...by[id], profile: people[id] || null, reviewer: !!(flags[id] && flags[id].is_reviewer), admin: !!(flags[id] && flags[id].is_admin), joined: flags[id] ? flags[id].created_at : null }))
        .sort((a, b) => b.sent + b.flags - (a.sent + a.flags));
    },
  });
}

// One climber's whole record for the drawer: their contributions and flags, newest first.
export function useDeskClimber(userId) {
  return useQuery({
    queryKey: ["desk-climber", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const [cs, fl] = await Promise.all([
        supabase.from("contributions").select("id,kind,field,route_id,area_id,status,value,applied_value,review_note,reason,created_at,reviewed_at,routes(name),areas(name)")
          .eq("contributor", userId).order("created_at", { ascending: false }).limit(300),
        supabase.from("route_flags").select("id,route_id,field,note,status,resolution_note,created_at,routes(name)").eq("reporter", userId).order("created_at", { ascending: false }).limit(200),
      ]);
      if (cs.error) throw cs.error;
      if (fl.error) throw fl.error;
      return { contributions: cs.data || [], flags: fl.data || [] };
    },
  });
}

// Admin. Make a climber a reviewer (can approve, turn down and take back field edits and resolve flags) or not.
export async function setReviewer(userId, on) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("set_reviewer", { p_user: userId, p_on: !!on });
  if (error) throw error;
  invalidateKeys(deskReaders);
  return true;
}

// Take an approved field edit back (0530): no strike, the page's earlier value returns, the climber is told.
export async function withdrawApproval(id, reason) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("withdraw_approval", { p_id: id, p_reason: reason });
  if (error) throw error;
  invalidateKeys([...contributionsReaders, ...deskReaders]);
  return true;
}

// Appeals against a contributing restriction or ban (kind 'contributing'), open first.
export function useContributingAppeals(enabled) {
  return useQuery({
    queryKey: ["desk-appeals"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("moderation_appeals")
        .select("id,appellant,target_kind,target_id,message,status,created_at,decided_at,decision_note")
        .eq("target_kind", "contributing").order("status", { ascending: true }).order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      const rows = data || [];
      const people = await deskNames(rows.map((r) => r.appellant));
      const { data: st, error: se } = rows.length ? await supabase.from("contribution_standing").select("user_id,status,strikes,until,reason").in("user_id", rows.map((r) => r.appellant)) : { data: [], error: null };
      if (se) throw se;
      const s = {}; (st || []).forEach((x) => { s[x.user_id] = x; });
      return rows.map((r) => ({ ...r, profile: people[r.appellant] || null, standing: s[r.appellant] || null }));
    },
  });
}
// Admin. 'reversed' resets the climber's contribution standing to ok (decide_appeal, 0309); 'upheld' keeps it.
export async function decideAppeal(id, decision, note) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("decide_appeal", { p_appeal: id, p_decision: decision, p_note: note || null });
  if (error) throw error;
  invalidateKeys([...deskReaders, ["contribution-standings"], ["my-contribution-standing"]]);
  return true;
}

// The hand-set confidence levels (route_field_confidence), newest first; search by route id or name.
export function useFieldLocks(enabled, search) {
  const s = String(search || "").trim().replace(/[,()%*]/g, " ");
  return useQuery({
    queryKey: ["desk-locks", s],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      let ids = null;
      if (s) {
        const { data: rs, error: re } = await supabase.from("routes").select("id").or(`id.ilike.%${s}%,name.ilike.%${s}%`).limit(200);
        if (re) throw re;
        ids = (rs || []).map((r) => r.id);
        if (!ids.length) return { rows: [], total: 0 };
      }
      let q = supabase.from("route_field_confidence").select("route_id,field,level,reason,set_by,set_at,routes(name)", { count: "exact" }).order("set_at", { ascending: false, nullsFirst: false }).limit(300);
      if (ids) q = q.in("route_id", ids);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data || [], total: count == null ? (data || []).length : count };
    },
  });
}

// The audit worklist (review_worklist, 0530), filled by scripts/review-worklist-load.mjs.
export function useReviewWorklist(enabled, status = "open") {
  return useQuery({
    queryKey: ["desk-worklist", status],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      let q = supabase.from("review_worklist").select("id,audit,item_key,route_id,area_id,title,detail,found_at,last_seen,status,note,resolved_at,routes(name),areas(name)")
        .order("found_at", { ascending: true }).limit(1000);
      if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}
export async function resolveWorklistItem(id, status, note) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("resolve_worklist_item", { p_id: id, p_status: status, p_note: note || null });
  if (error) throw error;
  invalidateKeys(deskReaders);
  return true;
}

// The desk's health strip: how long the oldest item has waited, how fast decisions come, when the AI last
// ran, app errors in the last day, and whether the live site serves the newest main (public GitHub API).
// Each part is read on its own; a part that fails is null, never a zero.
export function useDeskHealth(enabled) {
  return useQuery({
    queryKey: ["desk-health"],
    enabled: !!supabase && !!enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const part = async (fn) => { try { return await fn(); } catch (_e) { return null; } };
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [oldest, decided, ai, errors, deploy] = await Promise.all([
        part(async () => {
          const { data, error } = await supabase.from("contributions").select("created_at").eq("status", "pending").in("kind", ["field", "new_route", "new_area", "wall_order"]).order("created_at", { ascending: true }).limit(1);
          if (error) throw error;
          const { data: f, error: fe } = await supabase.from("route_flags").select("created_at").eq("status", "open").order("created_at", { ascending: true }).limit(1);
          if (fe) throw fe;
          const all = [...(data || []), ...(f || [])].map((r) => r.created_at).sort();
          return all[0] || "";
        }),
        part(async () => {
          const { data, error } = await supabase.from("contributions").select("created_at,reviewed_at").gte("reviewed_at", since).not("reviewed_by", "is", null).in("kind", ["field", "new_route", "new_area"]).limit(5000);
          if (error) throw error;
          const h = (data || []).map((r) => (Date.parse(r.reviewed_at) - Date.parse(r.created_at)) / 36e5).filter((x) => x >= 0).sort((a, b) => a - b);
          return { n: h.length, medianH: h.length ? h[Math.floor(h.length / 2)] : null };
        }),
        part(async () => {
          const { data, error } = await supabase.from("review_ai_verdicts").select("checked_at").order("checked_at", { ascending: false }).limit(1);
          if (error) throw error;
          return (data && data[0] && data[0].checked_at) || "";
        }),
        part(async () => {
          const { count, error } = await supabase.from("app_errors").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 864e5).toISOString());
          if (error) throw error;
          return count || 0;
        }),
        part(async () => {
          const gh = (p) => fetch("https://api.github.com/repos/barbs2989/Climbing-App/" + p, { headers: { Accept: "application/vnd.github+json" } }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
          const [head, deps] = await Promise.all([gh("commits/main"), gh("deployments?environment=github-pages&per_page=1")]);
          const d = deps && deps[0];
          return { headSha: head.sha, headAt: head.commit && head.commit.committer && head.commit.committer.date, liveSha: d ? d.sha : null, liveAt: d ? d.created_at : null };
        }),
      ]);
      return { oldest, decided, ai, errors, deploy };
    },
  });
}
