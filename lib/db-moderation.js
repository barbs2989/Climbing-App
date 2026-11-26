// lib/db-moderation.js — moderation and route quality control: reports, standing, appeals, field confidence and contributions review, notices, topo lines.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { contributionsReaders } from "./db-contributions.js";
import { fetchProfilesByIds, profilesReaders } from "./db-partners.js";
import { toposReaders } from "./db-photos.js";

// What the REPORTER can see of their own report. 0077 has always allowed this read
// (`reporter = auth.uid()`) and nothing has ever used it, so a climber filed a harassment
// report and then had no way to learn whether it still existed, let alone whether anybody had
// looked at it.
//
// Needs no migration -- the policy was already there and only the reader was missing. Same
// shape as the queue itself one row down: a capability nobody had wired to a screen.
export function useMyFiledReports(enabled) {
  return useQuery({
    queryKey: ["my-filed-reports"],
    enabled: !!supabase && enabled !== false,
    queryFn: async () => {
      /* THIS QUERY'S OWN OUTAGE FLAG COULD NOT FIRE FOR HALF ITS FAILURES. `filedReportsUnavailable`
         keys on isError, and the session read discarded its error and then `return []` — so a
         failed getSession() handed the Profile an empty list WITHOUT throwing, and the screen said
         a climber has filed no reports. The table read below has always thrown correctly; the
         failure that could not be reported was the one above it.

         Throwing on a missing uid is right rather than harsh: the caller is `useMyFiledReports(!!uid)`,
         so this body only runs when the app already believes someone is signed in. If getSession
         then disagrees we cannot tell WHOSE reports to fetch, and "you have none" is a claim about
         the climber's own history that nothing here supports. */
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;
      const uid = sess && sess.session && sess.session.user && sess.session.user.id;
      if (!uid) throw new Error("no session while signed in — cannot tell whose filed reports these are");
      const { data, error } = await supabase
        .from("user_reports")
        .select("id, reported_name, reason, status, created_at")
        .eq("reporter", uid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

// How much is waiting on a reviewer, counted beside each section's tab on the Review desk (review.html). It
// badged the app Menu until 2026-11-25, when the Menu's admin Review section was removed (owner: the desk replaces it).
// Its history: 0077's own header predicted the exact
// failure this closes -- "reports will sit unseen ... whoever owns moderation needs a habit of
// checking it" -- and a habit is not a mechanism. The queue shipped in 0158 still had to be
// gone looking for, on a tab nobody opens in order to moderate.
//
// `head: true` with an exact count transfers no rows: this runs for an admin on every load and
// there is no reason to pull report bodies to learn that three exist. Gated on `enabled`, so a
// non-admin issues none of it. RLS would return zero anyway -- which is the point, a zero that
// would cost three round trips per session for every climber in the app.
//
// THE `kind` FILTER ON PROPOSALS IS LOAD-BEARING. `contributions` holds every field edit
// climbers submit, and those are `pending` too; counting status alone would badge the Profile
// tab with the size of the whole contribution backlog rather than the review queue. Mirror
// `useRouteProposals`, which is the query the landing surface actually runs -- a badge whose
// count does not match the list it points at is worse than no badge.
export function useAdminQueueCounts(enabled) {
  return useQuery({
    queryKey: ["admin-queue-counts"],
    enabled: !!supabase && !!enabled,
    refetchInterval: 120000,
    queryFn: async () => {
      const head = (table) => supabase.from(table).select("id", { count: "exact", head: true });
      const [c, fe, fl, ax, fb, gp, wo, pl, bp, sr, sp, sa] = await Promise.all([
        head("contributions").in("kind", ["new_route", "new_area"]).eq("status", "pending"),
        // Held route edits and open flags (0307): every field edit waits here for the owner.
        // Area edits (route_id null, area_id set) are rows of the same table, so they count too (2026-11-25).
        head("contributions").eq("kind", "field").eq("status", "pending"),
        head("route_flags").eq("status", "open"),
        // Accessibility reports (0343/0354): the statement promises a reply, so they wait here too.
        head("accessibility_reports").eq("status", "open"),
        // Feedback notes and commented ratings (0365). A bare rating is filed 'done', so it never badges.
        head("app_feedback").eq("status", "open"),
        // Recorded tracks and traced crag trails (0397: the admin may read pending rows).
        head("gps_submissions").eq("status", "pending"),
        // Suggested wall orders (0485): rows of the desk's edits table, counted for its tab only.
        head("contributions").eq("kind", "wall_order").eq("status", "pending"),
        // "Wrong place?" claims on an area (0372), the desk's Wrong place claims section (2026-11-25).
        head("contributions").eq("kind", "area_placement").eq("status", "pending"),
        // Held base pins (0363/0547): a confirmed check-in spot more than 200 m from the route's Base pin.
        head("route_base_pin_changes").eq("action", "held").is("resolved_at", null),
        // SAFETY (2026-11-26): reports about climbers and content, reported photos, and appeals against a removal,
        // suspension or ban -- the desk's Safety section. Oldest first, so the 24-hour clock can be shown.
        supabase.from("user_reports").select("created_at", { count: "exact" }).in("status", ["open", "reviewing"]).order("created_at", { ascending: true }).limit(1),
        supabase.from("content_reports").select("created_at", { count: "exact" }).eq("status", "open").order("created_at", { ascending: true }).limit(1),
        supabase.from("moderation_appeals").select("created_at", { count: "exact" }).eq("status", "open").neq("target_kind", "contributing").order("created_at", { ascending: true }).limit(1),
      ]);
      // A failed count must not read as an empty queue. Throwing puts the hook in `error`,
      // where the badge renders nothing rather than a confident zero.
      for (const x of [c, fe, fl, ax, fb, gp, wo, pl, bp, sr, sp, sa]) if (x.error) throw x.error;
      const safety = (sr.count || 0) + (sp.count || 0) + (sa.count || 0);
      const safetyOldestAt = [sr, sp, sa].map((x) => x.data && x.data[0] && x.data[0].created_at).filter(Boolean).sort()[0] || null;
      const proposals = c.count || 0;
      const fieldEdits = fe.count || 0, flags = fl.count || 0, access = ax.count || 0, feedback = fb.count || 0, trails = gp.count || 0;
      return { proposals, fieldEdits, flags, access, feedback, trails, wallOrders: wo.count || 0, placements: pl.count || 0, basepins: bp.count || 0, safety, safetyOldestAt, edits: fieldEdits + flags + (wo.count || 0) /* the desk's first tab: held edits, open flags and suggested wall orders */ };
    },
  });
}

// Which policy version this account has accepted, if any.
//
// 0145 stamps `terms_accepted_version` from the metadata a NEW signup sends, and that works.
// What has never existed is a way to re-obtain acceptance when the documents CHANGE: the
// version moved on 2026-08-19 and not one existing account was asked. Measured the same day,
// every profile carried a null — so "can you evidence that this user agreed to your Terms?"
// had no answer for anybody.
export function useMyPolicyAcceptance(uid) {
  return useQuery({
    queryKey: ["policy-acceptance", uid],
    enabled: !!supabase && !!uid,
    queryFn: async () => {
      // Owner-only columns (0434): read through my_profile, which returns the caller's own row.
      const { data, error } = await supabase
        .rpc("my_profile").select("terms_accepted_version, terms_accepted_at").maybeSingle();
      if (error) throw error;
      return data || null;
    },
  });
}

// Record acceptance of the version currently on screen.
//
// The client supplies the version, exactly as it does at signup where it rides in the auth
// metadata — this adds no weakness the acceptance record did not already have. What it must not
// do is claim success on a refusal, so a zero-row update throws like every other write here.
export async function acceptCurrentPolicy(uid, version) {
  if (!supabase) return null;
  if (!uid || !version) throw new Error("Nothing to accept.");
  const { data, error } = await supabase
    .from("profiles")
    .update({ terms_accepted_version: version, terms_accepted_at: new Date().toISOString() })
    .eq("id", uid).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That could not be recorded — try again.");
  invalidateKeys(profilesReaders);
  // terms_accepted_version is owner-only (0434) and so not RETURNED; the row holds what was sent.
  return { ...data[0], terms_accepted_version: version };
}

// Report a piece of content (0263). The database copies WHAT was reported into the report, from a
// row the reporter can actually read -- so the reviewer sees the reported DM, post or comment as it
// was, and nobody can file a report quoting words somebody else never wrote. Signed-in only; throws
// on refusal ("not available", your own content, 30 a day) so no caller can toast over a failure.
export async function reportContent(kind, id, reason, detail) {
  if (!supabase) throw new Error("Reporting needs a connection to ClimbMatch.");
  const { data, error } = await supabase.rpc("report_content", {
    p_kind: kind, p_id: String(id), p_reason: reason, p_detail: detail || null,
  });
  if (error) throw error;
  if (!data) throw new Error("The report did not reach ClimbMatch Safety — try again.");
  // Page the reviewer (notify-safety-report). Fire-and-forget: the report is already filed, and
  // nothing on screen claims an email went -- an unconfigured mailer just means the badge is the signal.
  try { supabase.functions.invoke("notify-safety-report", { body: { reportId: data } }).catch(() => {}); } catch (_e) { /* ignore */ }
  return data;
}

// ACCOUNT STANDING (0264). A climber reads only their own row (RLS); no row means active. A
// lapsed suspension still has its row, so "restricted" is decided here exactly as is_active_user()
// decides it in SQL: banned, or suspended with `until` in the future.
export function useMyStanding(userId) {
  return useQuery({
    queryKey: ["my-standing", userId],
    enabled: !!supabase && !!userId,
    refetchInterval: 300000,
    queryFn: async () => {
      const { data, error } = await supabase.from("account_standing")
        .select("status, until, reason, set_at").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const restricted = data.status === "banned" || (data.status === "suspended" && (!data.until || new Date(data.until).getTime() > Date.now()));
      return restricted ? data : null;
    },
  });
}
// The author of taken-down content, or a restricted account ('account'), asks for another look.
export async function fileAppeal(kind, id, message) {
  if (!supabase) throw new Error("Appeals need a connection to ClimbMatch.");
  const { data, error } = await supabase.rpc("file_appeal", { p_kind: kind, p_id: String(id || ""), p_message: message });
  if (error) throw error;
  if (!data) throw new Error("The appeal did not reach ClimbMatch Safety — try again.");
  return data;
}

// ── route quality control (0307–0309) ───────────────────────────────────────────────
// Every field edit is HELD until the owner approves it (0382 withdrew 0325's empty-field and
// two-climber exits); a field has a confidence level
// (high = locked, flag-only); rejections are strikes against a contribution-scoped standing;
// a climber can FLAG a section without supplying the value; the climber is told through
// user_notices. See docs/features/route-quality-control.md.

// The route page's confidence map: {grade:"high", approach:"low", …, _reasons:{field:{reason,set_at}}}
// over every contribute-form key. One RPC per route; computed from the routes row plus the
// explicit overrides in route_field_confidence, so it cannot disagree with the insert guard.
export function useRouteFieldConfidence(routeId) {
  return useQuery({
    queryKey: ["route-field-confidence", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("route_field_confidence_map", { p_route_id: routeId });
      if (error) throw error;
      return data || {};
    },
  });
}
// The form key → routes column map with the label each field shows under (0307). Static, public
// read; the owner's queue uses it to name a field and to read the route's CURRENT value.
export function useContributionFields() {
  return useQuery({
    queryKey: ["contribution-fields"],
    enabled: !!supabase,
    staleTime: 3600000,
    queryFn: async () => {
      const { data, error } = await supabase.from("contribution_fields").select("form_key, column_name, label, is_prose, is_gear");
      if (error) throw error;
      const byKey = {}; (data || []).forEach((r) => { byKey[r.form_key] = r; });
      return byKey;
    },
  });
}
// The raw routes rows for a set of ids (the queue shows the CURRENT value beside a proposed one).
export function useRouteRowsByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["route-rows-by-ids", key],
    enabled: !!supabase && !!key,
    queryFn: async () => {
      const { data, error } = await supabase.from("routes").select("*").in("id", key.split(","));
      if (error) throw error;
      const byId = {}; (data || []).forEach((r) => { byId[r.id] = r; });
      return byId;
    },
  });
}
// Admin: lock (level 'high'), set, or clear (level null → computed) one field's level.
export async function setRouteFieldConfidence(routeId, field, level, reason) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("set_route_field_confidence", {
    p_route_id: routeId, p_field: field, p_level: level || null, p_reason: reason || null,
  });
  if (error) throw error;
  invalidateKeys([["route-field-confidence", routeId]]);
  return true;
}

// Admin: the held field edits, oldest first, with the route's name and area so the queue can
// say where each one lands. `contributions` is publicly readable (0002); the gate is the RPC.
export function useFieldContributions(status = "pending", lim = 300) {
  // Route AND area rows (0319): an area-keyed field row (area_id set, route_id null) is held for the
  // owner like a route one, and approve_field_contribution writes the areas column on approval.
  return useQuery({
    queryKey: ["field-contributions", status, lim],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("id,route_id,area_id,field,value,applied_value,reason,contributor,created_at,status,review_note,reviewed_at,routes(name,area_id,discipline),areas(name,area_type)")
        .eq("kind", "field").eq("status", status)
        .order("created_at", { ascending: status === "pending" ? true : false }).limit(lim);
      if (error) throw error;
      return data || [];
    },
  });
}
// Admin. `value` = the owner's edited value (null = as submitted); `also` = ids of the other
// pending rows the queue clustered with this one (same route + field, sameEditValue-equal).
// Approving makes the field HIGH confidence and notifies each contributor.
export async function approveFieldContribution(id, value, also) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("approve_field_contribution", {
    p_id: id, p_value: value === undefined ? null : value, p_also: also && also.length ? also : [],
  });
  if (error) throw error;
  invalidateKeys(contributionsReaders);
  return true;
}
// Admin. A reason (≥10 chars) is required: it is shown to the climber, and unless `strike` is
// false it counts against their contribution standing (warn 1 · restrict 3 · ban 5).
export async function rejectFieldContribution(id, reason, also, strike) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("reject_field_contribution", {
    p_id: id, p_reason: reason, p_also: also && also.length ? also : [], p_strike: strike !== false,
  });
  if (error) throw error;
  invalidateKeys(contributionsReaders.concat([["contribution-standings"], ["my-contribution-standing"]]));
  return true;
}

// The caller's own contribution standing, or null when nothing has ever been recorded.
// {status:'ok'|'warned'|'restricted'|'banned', strikes, until, reason, last_strike_at}
export function useMyContributionStanding(userId) {
  return useQuery({
    queryKey: ["my-contribution-standing", userId],
    enabled: !!supabase && !!userId,
    refetchInterval: 300000,
    queryFn: async () => {
      const { data, error } = await supabase.from("contribution_standing")
        .select("status, strikes, until, reason, last_strike_at, set_at").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const lapsed = data.status === "restricted" && data.until && new Date(data.until).getTime() <= Date.now();
      return lapsed ? { ...data, status: "warned" } : data;
    },
  });
}
// Admin: every climber with a standing row (strikes or a hand-set status), worst first.
export function useContributionStandings(enabled) {
  return useQuery({
    queryKey: ["contribution-standings"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("contribution_standing")
        .select("user_id, status, strikes, until, reason, last_strike_at, set_at")
        .order("strikes", { ascending: false }).limit(200);
      if (error) throw error;
      const rows = data || [];
      const ids = rows.map((r) => r.user_id);
      if (!ids.length) return [];
      const profs = await fetchProfilesByIds(ids);
      const byId = {}; (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.map((r) => ({ ...r, profile: byId[r.user_id] || null }));
    },
  });
}
// Admin: reset strikes ('ok'), restrict (days, default 90), ban from contributing, or warn.
export async function setContributionStanding(userId, status, strikes, days, reason) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("set_contribution_standing", {
    p_user: userId, p_status: status, p_strikes: strikes == null ? null : strikes,
    p_days: days == null ? null : days, p_reason: reason || null,
  });
  if (error) throw error;
  invalidateKeys([["contribution-standings"], ["my-contribution-standing", userId]]);
  return true;
}

// A climber flags a section (or the whole route, field null) as wrong, with a note. Returns the
// flag id. Refusals (not signed in, banned from contributing, 5 a day) throw the server's sentence.
export async function fileRouteFlag(routeId, field, note) {
  if (!supabase) throw new Error("Flags need a connection to ClimbMatch.");
  const { data, error } = await supabase.rpc("file_route_flag", { p_route_id: routeId, p_field: field || null, p_note: note });
  if (error) throw error;
  invalidateKeys([["open-route-flags"], ["admin-queue-counts"], ["route-field-confidence", routeId]]);
  return data;
}
// Admin: open flags, oldest first, with the route and the reporter's public name.
export function useOpenRouteFlags(enabled) {
  return useQuery({
    queryKey: ["open-route-flags"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("route_flags")
        .select("id, route_id, field, note, reporter, status, created_at, routes(name, area_id, discipline)")
        .eq("status", "open").order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      const rows = data || [];
      const ids = [...new Set(rows.map((r) => r.reporter))];
      if (!ids.length) return [];
      const profs = await fetchProfilesByIds(ids);
      const byId = {}; (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.map((r) => ({ ...r, reporterProfile: byId[r.reporter] || null }));
    },
  });
}
export async function resolveRouteFlag(id, status, note) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("resolve_route_flag", { p_id: id, p_status: status, p_note: note || null });
  if (error) throw error;
  invalidateKeys([["open-route-flags"], ["admin-queue-counts"], ["route-field-confidence"]]);
  return true;
}

// The caller's notices (rejection reasons, warnings, standing changes, flag outcomes), newest
// first. Read by NotifPanel through mergedNotifs; `read_at` is the only column a client may set.
export function useMyNotices(userId) {
  return useQuery({
    queryKey: ["my-notices", userId],
    enabled: !!supabase && !!userId,
    refetchInterval: 120000,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_notices")
        .select("id, kind, title, body, link, created_at, read_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}
const noticeReaders = [["my-notices"]];
export async function markNoticeRead(id) {
  if (!supabase) return null;
  const { error } = await supabase.from("user_notices").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) throw error;
  invalidateKeys(noticeReaders);
  return true;
}
// Restore from Archived: archiving a notice IS setting read_at, so restoring one clears it — clearing only
// the session's dismissed list left a notice with read_at under Archived, and Restore did nothing.
export async function markNoticeUnread(id) {
  if (!supabase) return null;
  const { error } = await supabase.from("user_notices").update({ read_at: null }).eq("id", id);
  if (error) throw error;
  invalidateKeys(noticeReaders);
  return true;
}
// Swipe LEFT on a notification deletes it ("notices delete own", 0307). `.select()` returns the rows
// removed, so an RLS no-op (200, nothing deleted) throws instead of passing for a delete.
export async function deleteNotice(id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("user_notices").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("notice not deleted");
  invalidateKeys(noticeReaders);
  return true;
}


// Report a photo (0156). Files into content_reports, whose SELECT policy an admin can read --
// which is the whole reason it is not user_reports, see 0156's header.
//
// The reporter is stamped from the session and NOT from the caller, the same rule
// submitContribution follows: the INSERT policy requires reporter = auth.uid(), so a wrong
// value here is a rejection rather than a mislabelled report, but stamping centrally means a
// new call site cannot get it wrong in the first place.
//
// A second report of the same photo by the same climber is a UNIQUE violation (23505), not an
// error worth showing: they already told us. It resolves as success, because from where they
// are standing the outcome is identical -- the report is on file.
export async function reportPhoto(contributionId, routeId, reason, detail) {
  if (!supabase) return null;
  if (!contributionId || !reason) throw new Error("Nothing to report.");
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to report a photo.");
  const { error } = await supabase.from("content_reports").insert({
    contribution_id: contributionId, route_id: routeId || null,
    reporter: uid, reason, detail: detail || null, status: "open",
  });
  if (error && error.code !== "23505") throw error;
  invalidateKeys([["safety-photo-reports"], ["admin-queue-counts"]]);
  return true;
}


// Withdraw a photo you contributed: the ledger row AND the stored object.
//
// ROW FIRST, THEN OBJECT — the exact mirror of submitRoutePhoto's upload-then-insert, and for
// the same reason. Delete the object first and a surviving row points at a file that is gone,
// which is a broken image on every screen showing this route. This order can only ever leave
// an orphan object in a bucket nobody browses, which is invisible.
//
// The storage path is derived from the public URL rather than stored beside it, because the
// URL is what the row has carried since #971 and older rows would have no path column to read.
// Everything after `/topo-photos/` IS the object key — getPublicUrl only appends, so this is a
// reversal of a known transformation, not a guess at a URL shape.
//
// Both halves are gated by RLS rather than by this function: 0151 allows the row delete only
// for kind='photo' AND contributor = auth.uid(), and 0026 allows the object delete only under
// your own {uid}/ prefix. So a caller who tampers with the arguments deletes nothing — the
// checks below are for a good error message, not for safety.
// The storage object key behind one of our public photo URLs. Everything after
// `/topo-photos/` IS the object key -- getPublicUrl only appends -- so this is the reversal of
// a known transformation rather than a guess at a URL shape.
//
// Returns null for anything that is not one of ours, which is what a `blob:` preview and a
// seed https:// photo both look like. A caller must read null as "there is no object of ours
// to remove", never as a key it can pass on.
export function photoStorageKey(url) {
  const marker = "/topo-photos/";
  const at = typeof url === "string" ? url.indexOf(marker) : -1;
  return at >= 0 ? decodeURIComponent(url.slice(at + marker.length)) : null;
}

export async function deleteRoutePhoto(rowId, url) {
  if (!supabase) return null;
  if (!rowId) throw new Error("Nothing to remove.");
  const { data, error } = await supabase
    .from("contributions").delete().eq("id", rowId).eq("kind", "photo").select();
  if (error) throw error;
  // RLS rejects by matching zero rows, not by erroring, so an empty result is a refusal and
  // must not read as success -- the swallowed-write-failure shape this repo keeps finding.
  if (!data || !data.length) throw new Error("That photo could not be removed — it may not be yours.");
  const key = photoStorageKey(url);
  if (key) {
    // A failure here is deliberately NOT rethrown: the row is already gone, so the photo has
    // left every screen, and telling the climber their removal failed would be false.
    await supabase.storage.from("topo-photos").remove([key]).catch(() => {});
  }
  invalidateKeys(contributionsReaders);
  return true;
}

// Draws this route's line + markers on a topo photo. created_by defaults to
// auth.uid() at the DB level, so RLS enforces ownership without threading the
// caller's own id through every component.
// `variants` are the route's variations, each its own [{x,y}, …] line (0330), drawn yellow.
// variantLabels is aligned by index with variants (0362): label i names variation i, "" when none.
export async function submitTopoLine(topoId, routeId, points, pins, label, variants, variantLabels) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("topo_lines").insert({ topo_id: topoId, route_id: routeId, points, pins: pins || [], label: label || null, variants: variants || [], variant_labels: variantLabels || [] })
    .select().single();
  if (error) throw error;
  invalidateKeys(toposReaders);
  return data;
}

// Re-saves an existing line's points/pins — RLS restricts this to the line's own creator.
export async function updateTopoLine(lineId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("topo_lines").update(fields).eq("id", lineId).select().single();
  if (error) throw error;
  invalidateKeys(toposReaders);
  return data;
}

export async function deleteTopoLine(lineId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("topo_lines").delete().eq("id", lineId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("Couldn't delete that line — only the climber who drew it can.");
  invalidateKeys(toposReaders);
}

// Removes a whole photo (and, via cascade, every route's line drawn on it) —
// RLS restricts this to the photo's own uploader. The ROW goes first and must be seen to go: RLS
// answers a delete it refuses with no error and no row, and removing the file first would have left
// a live topo pointing at a deleted image. Only once the row is gone is the file removed.
export async function deleteTopoPhoto(topoId, storagePath) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("topos").delete().eq("id", topoId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("Couldn't delete that photo — only the climber who posted it can.");
  invalidateKeys(toposReaders);
  if (storagePath) await supabase.storage.from("topo-photos").remove([storagePath]);
}

// ── The Review desk's SAFETY section (owner, 2026-11-26: reports "pushed to my admin dashboard so that I can
// review it" and act on them; App Store 1.2 and Google Play's UGC policy both require acting on reports) ──────
// The in-app queues that did this were removed in #2727 ("I don't need that feature"); this brings the same
// reads and the same audited RPCs (0158, 0156, 0263, 0264) back on review.html#safety, not in the app.
// Every read is RLS-gated to an admin; every write is is_admin()-checked in the database.
const safetyReaders = [["safety-reports"], ["safety-photo-reports"], ["safety-appeals"], ["admin-queue-counts"], ["desk-history"], ["my-filed-reports"]];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isAccountId = (id) => UUID_RE.test(String(id || ""));

// Reports about climbers and content. `open` = open + reviewing (oldest first: the oldest sets the 24-hour clock);
// otherwise the 100 most recently closed. Each row carries the reporter's and the reported climber's profile,
// the reported climber's account standing, and how many reports (ever) name them.
export function useSafetyReports(enabled, open) {
  return useQuery({
    queryKey: ["safety-reports", open ? "open" : "closed"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      let q = supabase.from("user_reports")
        .select("id, reporter, reporter_label, reported_id, reported_name, reason, detail, status, created_at, reviewed_at, target_kind, target_id, snapshot, snapshot_media, snapshot_at");
      q = open ? q.in("status", ["open", "reviewing"]).order("created_at", { ascending: true }).limit(300)
        : q.in("status", ["actioned", "dismissed"]).order("reviewed_at", { ascending: false, nullsFirst: false }).limit(100);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      const accounts = [...new Set(rows.map((r) => r.reported_id).filter(isAccountId))];
      const people = [...new Set([...accounts, ...rows.map((r) => r.reporter).filter(Boolean)])];
      const [profs, st, prior] = await Promise.all([
        people.length ? fetchProfilesByIds(people) : [],
        accounts.length ? supabase.from("account_standing").select("user_id, status, until, reason, set_at").in("user_id", accounts) : { data: [], error: null },
        accounts.length ? supabase.from("user_reports").select("reported_id").in("reported_id", accounts).limit(5000) : { data: [], error: null },
      ]);
      if (st.error) throw st.error;
      if (prior.error) throw prior.error;
      const byP = {}; (profs || []).forEach((p) => { byP[p.id] = p; });
      const byS = {}; (st.data || []).forEach((s) => { byS[s.user_id] = s; });
      const n = {}; (prior.data || []).forEach((r) => { n[r.reported_id] = (n[r.reported_id] || 0) + 1; });
      return rows.map((r) => ({ ...r, reporterProfile: byP[r.reporter] || null, reportedProfile: byP[r.reported_id] || null, standing: byS[r.reported_id] || null, reportsAbout: n[r.reported_id] || 1 }));
    },
  });
}

// Move a report through 0075's states (reviewing / actioned / dismissed). RLS refuses by matching zero rows.
export async function reviewUserReport(id, status) {
  if (!supabase) throw new Error("no database");
  const { data: s } = await supabase.auth.getSession();
  const uid = s && s.session && s.session.user && s.session.user.id;
  const { data, error } = await supabase.from("user_reports")
    .update({ status, reviewed_by: uid || null, reviewed_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That report could not be updated — reviewing is admin-only.");
  invalidateKeys(safetyReaders);
  return true;
}

// Take reported content down ('remove'), hide it pending a decision ('hold'), or put it back ('restore').
// moderate_content (0263) logs it and closes EVERY open report about the same item.
export async function moderateContent(kind, id, action, reportId, note) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("moderate_content", { p_kind: kind, p_id: String(id), p_action: action, p_report: reportId || null, p_note: note || null });
  if (error) throw error;
  invalidateKeys(safetyReaders);
  return true;
}

// Suspend (1-365 days, read-only), ban (no sign-in; with removeContent, everything they posted is removed),
// or reinstate ('active'). set_account_standing (0264) shows the climber the reason and lets them appeal.
export async function setAccountStanding(userId, status, days, reason, removeContent, reportId) {
  if (!supabase) throw new Error("no database");
  const { error } = await supabase.rpc("set_account_standing", {
    p_user: userId, p_status: status, p_days: days == null ? null : days, p_reason: reason || null,
    p_remove_content: !!removeContent, p_report: reportId || null,
  });
  if (error) throw error;
  invalidateKeys(safetyReaders);
  return true;
}

// Reported route photos (content_reports, 0156), with the photo itself.
export function usePhotoReports(enabled) {
  return useQuery({
    queryKey: ["safety-photo-reports"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_reports")
        .select("id, contribution_id, route_id, reporter, reason, detail, status, created_at, contributions(id, value, contributor, kind)")
        .eq("status", "open").order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}
export async function dismissPhotoReport(id) {
  if (!supabase) throw new Error("no database");
  const { data: s } = await supabase.auth.getSession();
  const uid = s && s.session && s.session.user && s.session.user.id;
  const { data, error } = await supabase.from("content_reports")
    .update({ status: "dismissed", reviewed_by: uid || null, reviewed_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That report could not be updated — reviewing is admin-only.");
  invalidateKeys(safetyReaders);
  return true;
}
// Take a reported photo down: the ledger row (its reports cascade away with it) and the stored file.
export async function takeDownReportedPhoto(contributionId, url) {
  await deleteRoutePhoto(contributionId, url);
  invalidateKeys(safetyReaders);
  return true;
}

// Appeals against a removal, a suspension or a ban (everything but 'contributing', which the desk's Appeals
// section holds). Open first, then the decided ones. decideAppeal (db-admin) decides them.
export function useSafetyAppeals(enabled) {
  return useQuery({
    queryKey: ["safety-appeals"],
    enabled: !!supabase && !!enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("moderation_appeals")
        .select("id, appellant, target_kind, target_id, message, status, created_at, decided_at, decision_note")
        .neq("target_kind", "contributing").order("status", { ascending: true }).order("created_at", { ascending: true }).limit(150);
      if (error) throw error;
      const rows = data || [];
      const ids = [...new Set(rows.map((r) => r.appellant))];
      const targets = [...new Set(rows.map((r) => r.target_id))];
      const [profs, st, acts] = await Promise.all([
        ids.length ? fetchProfilesByIds(ids) : [],
        ids.length ? supabase.from("account_standing").select("user_id, status, until, reason").in("user_id", ids) : { data: [], error: null },
        targets.length ? supabase.from("moderation_actions").select("target_kind, target_id, action, note, created_at").in("target_id", targets).order("created_at", { ascending: false }).limit(500) : { data: [], error: null },
      ]);
      if (st.error) throw st.error;
      if (acts.error) throw acts.error;
      const byP = {}; (profs || []).forEach((p) => { byP[p.id] = p; });
      const byS = {}; (st.data || []).forEach((s) => { byS[s.user_id] = s; });
      const lastAct = {}; (acts.data || []).forEach((a) => { const k = a.target_kind + ":" + a.target_id; if (!lastAct[k]) lastAct[k] = a; });
      return rows.map((r) => ({ ...r, profile: byP[r.appellant] || null, standing: byS[r.appellant] || null, lastAction: lastAct[r.target_kind + ":" + r.target_id] || null }));
    },
  });
}
