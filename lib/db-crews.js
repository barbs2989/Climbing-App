// lib/db-crews.js — objectives, crew safety alignment, partner signals and crews (members, days, rides, gear, invites).
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getQueryClient, invalidateKeys, patchQueries } from "./queryClientRef";
import { supabase } from "./supabase";
import { useLiveQuery } from "./live";
import { profileCols } from "./profileCols";
import { sessionUid } from "./db-profile.js";

// ── objectives ("wishlist") — crews/objectives backend Phase A, see docs/BACKEND.md §2 ──
// route_id is a loose reference (no FK), same reasoning as dbRouteToCamel's route-id
// space spanning both DB routes and local ROUTES seed ids — see 0031_objectives.sql.

// The signed-in user's own saved climbs — used to hydrate wishlist/userLists on load
// so it survives a refresh instead of resetting to the seed demo list every session.
export function useMyObjectives(userId) {
  return useQuery({
    queryKey: ["my-objectives", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("objectives").select("route_id").eq("user_id", userId);
      if (error) throw error;
      return (data || []).map(r => r.route_id);
    },
  });
}

// WHEN each objective was saved, keyed by route id — for the Objectives list's "Recently added"
// sort and the "Saved" date on each row. A separate read so a failure here costs only those dates:
// the list itself still comes from useMyObjectives, and a route with no entry shows no date.
export function useMyObjectiveSavedAt(userId) {
  return useQuery({
    queryKey: ["my-objectives-saved-at", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("objectives").select("route_id,created_at").eq("user_id", userId);
      if (error) throw error;
      const out = {};
      (data || []).forEach(r => { if (r.created_at) out[r.route_id] = r.created_at; });
      return out;
    },
  });
}

// (useObjectivesOfUsers lived here until 0303: every match reads useMatchObjectivesOfUsers now, so a
// crag-route objective cannot reach compat() by any path. `objectives` stays public-read for the counts.)

// Which of these climbers hold a verified email — ONE read for every row on screen (0232).
// verification_records is owner-read only, so this definer is the only way another climber's ✓
// reaches you. Resolves to a Set of ids; an id absent from it is NOT verified. While loading or on
// error `data` is undefined, and callers must read that as UNKNOWN — never as "unverified".
// ── Crew safety alignment (0314) ──────────────────────────────────────────────────────────────
// Your questionnaire answers for ONE crew are readable by you alone (owner-only RLS); the crew sees
// only what crew_alignment() computes from everyone's -- counts, never rows -- which is what the
// questionnaire promises ("No one sees your exact answers — only group-level flags").
const crewSafetyReaders = [["crew-safety-own"], ["crew-alignment"], ["crew-ready-ids"]];
export function useMyCrewSafetyAnswers(crewId, userId) {
  return useQuery({
    queryKey: ["crew-safety-own", crewId, userId],
    enabled: !!supabase && !!crewId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crew_safety_answers")
        .select("risk_tolerance, answers, ready_at").eq("crew_id", crewId).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data || null;
    },
  });
}
export function useCrewAlignment(crewId) {
  return useQuery({
    queryKey: ["crew-alignment", crewId],
    enabled: !!supabase && !!crewId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("crew_alignment", { p_crew: crewId });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) || null;
    },
  });
}
// Who has marked themselves safety-ready, per crew you are confirmed in: { crewId: [uuid, …] }.
export function useCrewReadyIds(crewIds) {
  const ids = [...new Set((crewIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["crew-ready-ids", ids.join(",")],
    enabled: !!supabase && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("crew_ready_ids", { p_crews: ids });
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { out[r.crew_id] = r.ready_ids || []; });
      return out;
    },
  });
}
export async function saveCrewSafetyAnswers(crewId, userId, a) {
  if (!supabase) return null;
  const row = { crew_id: crewId, user_id: userId, risk_tolerance: (a && a.riskTolerance) || null,
    answers: (a && a.preClimbAnswers) || {}, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("crew_safety_answers")
    .upsert(row, { onConflict: "crew_id,user_id" }).select("crew_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("Your answers didn’t save — only confirmed crew members can answer.");
  // Show the saved answers at once (walkthrough 2026-11-14: right after Submit the screen still said
  // "You haven't completed your questionnaire" until the refetch landed).
  const qc = getQueryClient();
  if (qc) qc.setQueryData(["crew-safety-own", crewId, userId], (old) => ({ ready_at: null, ...(old || {}), risk_tolerance: row.risk_tolerance, answers: row.answers }));
  invalidateKeys(crewSafetyReaders);
  return data;
}
export async function markCrewSafetyReady(crewId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crew_safety_answers")
    .update({ ready_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("crew_id", crewId).eq("user_id", userId).select("crew_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("Complete your questionnaire for this crew first.");
  invalidateKeys(crewSafetyReaders);
  return data;
}

export function useVerifiedUsers(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["verified-users", ids.join(",")],
    enabled: !!supabase && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verified_user_ids", { p_ids: ids });
      if (error) throw error;
      return new Set((data || []).map(r => (typeof r === "string" ? r : r.verified_user_ids)));
    },
  });
}

// Level and climbing-since year (0299) for every partner row on screen — ONE read (0295; its trust_score column was dropped in 0335). The EXPERIENCE
// filter and the real-author lookup read these; the example profiles carry them inline, a real profile row does
// not. Resolves to { [id]: { level, since } }. While loading or on error `data` is undefined, and
// callers must read that as UNKNOWN: a failed read must not narrow a list to nobody.
export function usePartnerSignals(userIds, enabled = true) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["partner-signals", ids.join(",")],
    enabled: !!supabase && enabled && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partner_signals", { p_ids: ids });
      if (error) throw error;
      const out = {};
      (data || []).forEach(r => { out[r.id] = { level: r.level || null, since: r.climbing_since == null ? null : Number(r.climbing_since) }; });
      return out;
    },
  });
}

// Public climbs and vouches (0460) for every partner card on screen, in ONE read: the one partner card
// shows "N climbs · N vouches" for real climbers as it does for the example ones. Resolves to
// { [id]: { climbs, vouches } }. While loading or on error `data` is undefined, and the card must
// leave the counts out then rather than show 0: a failed read is not "no climbs".
export function usePartnerCounts(userIds, enabled = true) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort().slice(0, 200);
  return useQuery({
    queryKey: ["partner-counts", ids.join(",")],
    enabled: !!supabase && enabled && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("partner_counts", { p_ids: ids });
      if (error) throw error;
      const out = {};
      (data || []).forEach(r => { out[r.id] = { climbs: Number(r.climbs) || 0, vouches: Number(r.vouches) || 0 }; });
      return out;
    },
  });
}

// RELIABILITY (0519, owner 2026-11-23): what crewmates reported after crew trips, as COUNTS, plus the vouch
// Reliability stars. Resolves to { [id]: { trips, onTime, late, cancelledEarly, cancelledLate, noShow, relN, relAvg } }.
// While loading or on error `data` is undefined, and a caller must read that as UNKNOWN, never as "0 of 0".
// Signed-in only, like usePartnerCounts. Only revealed, undisputed reports count, and the server decides that.
export function useReliabilityOf(userIds, enabled = true) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort().slice(0, 200);
  return useQuery({
    queryKey: ["reliability-of", ids.join(",")],
    enabled: !!supabase && enabled && ids.length > 0,
    // A list's id set grows as its sections land; keep the records already read meanwhile, so cards already scored do
    // not drop back to "Scoring match…" each time (review 2026-11-24). A row whose own record is missing still waits.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reliability_of_users", { p_ids: ids });
      if (error) throw error;
      /** @type {Record<string, {trips: number, onTime: number, late: number, cancelledEarly: number, cancelledLate: number, noShow: number, relN: number, relAvg: number | null}>} */
      const out = {};
      (data || []).forEach(r => {
        out[r.id] = { trips: Number(r.trips) || 0, onTime: Number(r.on_time) || 0, late: Number(r.late) || 0,
          cancelledEarly: Number(r.cancelled_early) || 0, cancelledLate: Number(r.cancelled_late) || 0, noShow: Number(r.no_show) || 0,
          relN: Number(r.rel_n) || 0, relAvg: r.rel_avg == null ? null : Number(r.rel_avg) };
      });
      return out;
    },
  });
}

// The trip recap for one crew, for a confirmed member (0519): every crewmate who can be reported — those who LEFT in
// the 14 days before the day included (`departed`) — with what I filed about each, and `calledOff` when I said the
// crew called it off. `open` is false outside the day..day+14 window. Empty for anyone not on the crew.
export function useCrewRecap(crewId, enabled = true) {
  return useQuery({
    queryKey: ["crew-recap", crewId],
    enabled: !!supabase && enabled && !!crewId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("crew_recap", { p_crew: crewId });
      if (error) throw error;
      const rows = data || [];
      const call = rows.find(r => r.about_id == null);
      return {
        tripDate: rows.length ? rows[0].trip_date : null,
        open: rows.length ? !!rows[0].is_open : false,
        calledOff: !!(call && call.my_outcome === "called_off"),
        mates: rows.filter(r => r.about_id != null).map(r => ({ id: r.about_id, departed: !!r.departed, outcome: r.my_outcome || null,
          theirReply: r.their_reply || null, theirNote: r.their_note || null })),
      };
    },
  });
}

// What crewmates said about ME, once each report is revealed to me (I filed my own recap for that crew, or 7 days
// passed), with my reply. Called-off rows name nobody and are not returned.
export function useTripReportsAboutMe(userId) {
  return useQuery({
    queryKey: ["trip-reports-about-me", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_trip_reports_about_me");
      if (error) throw error;
      return (data || []).map(r => ({ id: r.id, crewId: r.crew_id, reporterId: r.reporter_id, tripDate: r.trip_date,
        outcome: r.outcome, updatedAt: r.updated_at, reply: r.reply || null, note: r.note || null }));
    },
  });
}

// Every cached reader of crew_trip_reports / crew_trip_replies, refreshed after each write (check:write-readers
// cannot see through these RPCs, so they are named by hand).
const tripReportsReaders = [["reliability-of"], ["crew-recap"], ["trip-reports-about-me"], ["my-trip-recaps"]];

// The trips I was ON but have since come off (0526): left, declined, or removed after the day began. The crew is no longer
// in my crews, so this is how the app still asks me "who showed up".
export function useMyTripRecaps(userId) {
  return useQuery({
    queryKey: ["my-trip-recaps", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_trip_recaps");
      if (error) throw error;
      return (data || []).map(r => ({ crewId: r.crew_id, tripDate: r.trip_date, place: r.place || null }));
    },
  });
}
// File, change or (outcome null) take back what I say happened to one crewmate; aboutId null + "called_off" says the
// crew turned back or did not go, which marks nobody. Throws the server's own sentence on a refusal.
export async function submitTripReport(crewId, aboutId, outcome) {
  if (!supabase) throw new Error("not connected");
  const { error } = outcome == null
    ? await supabase.rpc("withdraw_trip_report", { p_crew: crewId, p_about: aboutId || null })
    : await supabase.rpc("submit_trip_report", { p_crew: crewId, p_about: aboutId || null, p_outcome: outcome });
  if (error) throw new Error(error.message || "the trip report did not save");
  invalidateKeys(tripReportsReaders);
}
// My answer to a report about me: "was_there" (it stops counting) or "note" (context; it still counts).
export async function replyToTripReport(reportId, reply, note) {
  if (!supabase) throw new Error("not connected");
  const { error } = await supabase.rpc("reply_to_trip_report", { p_report: reportId, p_reply: reply, p_note: note || null });
  if (error) throw new Error(error.message || "your reply did not save");
  invalidateKeys(tripReportsReaders);
}

// The stated gender (0359) of every partner row on screen, in ONE read, for "Only climbers of my gender"
// in partner search. Most partner lists come from RPCs that do not return it, and `profiles` is
// public-read, so this asks for the two columns by id. Resolves to { [id]: gender|null }. While loading
// or on error `data` is undefined; the caller must not read that as "matches" -- see PartnerSearch.
export function usePartnerGenders(userIds, enabled = true) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["partner-genders", ids.join(",")],
    enabled: !!supabase && enabled && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(profileCols("id,gender", !!(await sessionUid()))).in("id", ids);
      if (error) throw error;
      const out = {};
      (data || []).forEach(r => { out[r.id] = r.gender || null; });
      return out;
    },
  });
}

// The ice, mixed and aid grades (climb_grades, 0237) of every partner row on screen, in ONE read. The
// partner RPCs return only the three grade columns, so an ice climber's row showed no ice grade.
// Resolves to { [id]: climb_grades|null }; while loading or on error the rows show the three columns only.
export function usePartnerClimbGrades(userIds, enabled = true) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["partner-climb-grades", ids.join(",")],
    enabled: !!supabase && enabled && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(profileCols("id,climb_grades", !!(await sessionUid()))).in("id", ids);
      if (error) throw error;
      const out = {};
      (data || []).forEach(r => { out[r.id] = r.climb_grades || null; });
      return out;
    },
  });
}

// "FREE THIS WEEKEND" for the climbers on screen. Only partners_near and the direct profiles reads return
// free_until; the area, my-areas and by-climb searches do not, so a climber who switched it on showed no green
// line and was not sorted first in most lists, the signed-in default among them (review 2026-11-23). One read
// for every row on screen, keyed by id; a climber absent from the answer is unknown, not "not free".
export function usePartnerFreeUntil(userIds, enabled = true) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["partner-free-until", ids.join(",")],
    enabled: !!supabase && enabled && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,free_until").in("id", ids.slice(0, 200));
      if (error) throw error;
      const out = {};
      (data || []).forEach(r => { out[r.id] = r.free_until || null; });
      return out;
    },
  });
}

// How many climbers have each of these routes as an objective — one grouped query
// backing "N want this" counts in PartnerSearch, rather than N per-route queries.
export function useObjectiveCounts(routeIds) {
  const key = (routeIds || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["objective-counts", key],
    enabled: !!supabase && !!(routeIds || []).length,
    queryFn: async () => {
      const { data, error } = await supabase.from("objectives").select("route_id").in("route_id", routeIds);
      if (error) throw error;
      const counts = {};
      (data || []).forEach(r => { counts[r.route_id] = (counts[r.route_id] || 0) + 1; });
      return counts;
    },
  });
}

// Plain async writes (not hooks) — called from toggleWish, an event handler, not render.
// The queries that read the objectives table, refreshed after every write to it. The Logbook's
// own list refetches through its hook today; the saved-at list and the per-route "N climbers
// want this" counts did not, and showed the old number until a reload.
const objectiveReaders = (userId) => [["my-objectives", userId], ["my-objectives-saved-at", userId], ["objective-counts"], ["route-stats"], ["match-objectives-of-users"]];
export async function saveObjective(userId, routeId) {
  if (!supabase) return;
  const { error } = await supabase.from("objectives").insert({ user_id: userId, route_id: routeId });
  if (error && error.code !== "23505") throw error; // 23505 = already saved, not a real failure
  invalidateKeys(objectiveReaders(userId));
}
export async function removeObjective(userId, routeId) {
  if (!supabase) return;
  const { error } = await supabase.from("objectives").delete().eq("user_id", userId).eq("route_id", routeId);
  if (error) throw error;
  invalidateKeys(objectiveReaders(userId));
}

// Saved areas and peaks (migration 0322). Were device-only (IndexedDB), so unsaving an area on
// one device left it saved on every other. The account row decides now; lib/offline.js keeps a
// mirror for offline reads. A failed read THROWS — the caller keeps what it has, never an empty
// list, because an empty list here would read as "you removed everything".
export function useMySavedAreas(userId) {
  return useQuery({
    queryKey: ["my-saved-areas", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_areas").select("area_id, created_at")
        .eq("user_id", userId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((r) => r.area_id);
    },
  });
}
// Every cached reader of saved_areas, refreshed after each write to it (check:write-readers).
const savedAreasReaders = (userId) => [["my-saved-areas", userId]];
export async function saveAreaRow(userId, areaId) {
  if (!supabase) return;
  const { error } = await supabase.from("saved_areas").insert({ user_id: userId, area_id: areaId });
  if (error && error.code !== "23505") throw error; // 23505 = already saved (another device), not a failure
  invalidateKeys(savedAreasReaders(userId));
}
export async function removeAreaRow(userId, areaId) {
  if (!supabase) return;
  const { error } = await supabase.from("saved_areas").delete().eq("user_id", userId).eq("area_id", areaId);
  if (error) throw error;
  invalidateKeys(savedAreasReaders(userId));
}

// ── crews — crews/objectives backend Phase B, see 0032_crews.sql for the schema ──
// and its RLS comments for why float_plan/meet_place never appear in crew_listings.
// NOT YET WIRED into ClimbMatch.jsx's crew mutation flows (formCrew, updateCrew,
// meAgreeDates, crewSetDate, etc. - about 15 call sites) - that's a
// separate, larger pass given the RLS here is unverified against a live database.
// These hooks/writes are ready to use once that wiring happens.

// Public "browse open crews" listing (CrewFinder) — float-plan-free by construction,
// see the crew_listings view. Client-side merges this with local `crews` state the
// same way routeById() merges seed+DB routes.
export function useCrewListings() {
  return useQuery({
    queryKey: ["crew-listings"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase.from("crew_listings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// The signed-in user's own crews (organizer or confirmed member), full detail
// including float_plan — RLS on the base table already restricts this to rows
// the caller is allowed to see, so no extra filtering needed here.
export function useMyCrews(userId) {
  // LIVE (0448 puts the crew tables on Realtime): a crewmate's proposed day, "I can make it", accept or
  // meet-up reaches an open Crews tab without a reload (walkthrough 2026-11-14). The refetch goes back
  // through this queryFn under RLS; each rule only decides whether a change touches a crew held here.
  // Before 0448 is applied the channel hears nothing, and the focus refetch below still applies.
  const held = (data, crewId) => Array.isArray(data) && data.some((c) => c && c.id === crewId);
  return useLiveQuery({
    queryKey: ["my-crews", userId],
    enabled: !!supabase && !!userId,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews").select("*, crew_members(*), crew_day_acks(*), crew_past_state(state), crew_float_filings(user_id,filed_at,return_by)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // NEWEST FOR YOU FIRST: a crew you just joined (accepted an invite, or were approved) sorts by when you
      // joined, not when it was made -- it used to land last, below crews you have had for weeks.
      const mine = (c) => { const m = (c.crew_members || []).find((x) => x && x.user_id === userId); const t = Math.max(Date.parse(c.created_at) || 0, Date.parse(m && m.joined_at) || 0); return t; };
      return (data || []).slice().sort((x, y) => mine(y) - mine(x));
    },
  }, [
    { table: "crews", match: (row, data) => held(data, row.id), cached: (old, data) => held(data, old.id) },
    // A new invite or join adds a crew_members row for a crew not held yet: yours counts too.
    { table: "crew_members", match: (row, data) => row.user_id === userId || held(data, row.crew_id), cached: (old, data) => held(data, old.crew_id) },
    { table: "crew_day_acks", match: (row, data) => held(data, row.crew_id), cached: (old, data) => held(data, old.crew_id) },
  ]);
}

// The public preview behind a crew’s share link (0381, owner decision 2026-10-28). Answers signed out:
// anon may EXECUTE crew_share_preview, which returns the place, dates, size and FIRST NAMES of members
// who show their name, or NULL when sharing is off, the crew is dismissed, or its date has passed. NULL
// is a real answer (the link is dead), distinct from an error (the read failed) -- callers tell them apart.
export function useCrewSharePreview(token) {
  return useQuery({
    queryKey: ["crew-share-preview", token],
    enabled: !!supabase && !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("crew_share_preview", { p_token: token });
      if (error) throw error;
      return data || null;
    },
  });
}

// Every cached reader of crews, refreshed after each write to it (check:write-readers). crew-listings
// is the view over this table: without it a crew you start is invisible in Join a crew for a minute.
const crewsReaders = [["my-crews"], ["crew-listings"], ["crew-share-preview"]];
// Plain async writes (not hooks) — called from event handlers, not render.
// A crew has ONE place (0302): a route (`routeId`) or an area (`areaId` + `discipline`, a crag
// session). The CHECK refuses both and neither, so the caller passes exactly one.
// `private` (0426) is sent only when set, so a listed crew still saves on a database that has not had 0426 applied.
export async function createCrew({ routeId, areaId, discipline, createdBy, dates, meetTime, meetPlace, floatPlan, cap, isPrivate, openNote }) {
  if (!supabase) return null;
  if (!!routeId === !!areaId) throw new Error("a crew is at one place: a route or an area");
  if (areaId && !discipline) throw new Error("an area crew says what it is (sport, trad, bouldering…)");
  const { data, error } = await supabase
    .from("crews").insert({ route_id: routeId || null, area_id: areaId || null, discipline: areaId ? discipline : null, created_by: createdBy, dates: dates || [], meet_time: meetTime, meet_place: meetPlace, float_plan: floatPlan, cap: cap || 4, ...(isPrivate ? { private: true } : {}), ...(openNote ? { open_note: String(openNote).slice(0, 280) } : {}) })
    .select().single();
  if (error) throw error;
  invalidateKeys(crewsReaders);
  return data;
}
export async function updateCrewRow(crewId, patch) {
  if (!supabase) return;
  // .select() makes an RLS rejection visible — same trap updateCrewMemberStatus
  // documents below: the 0036 crews UPDATE policy is organizer-only, so a member's
  // edit matches zero rows and PostgREST returns 200 with no error.
  const { data, error } = await supabase.from("crews").update(patch).eq("id", crewId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — only the crew organizer can change this.");
  invalidateKeys(crewsReaders);
  return data;
}
// ANY CREW MEMBER PUTS A DAY FORWARD (0448). Members cannot UPDATE crews (organiser-only, 0036), so a
// proposal goes through crew_propose_day, which also records the proposer and says they can make it;
// crew_unpropose_day lets that proposer or the organiser take it back (and clears its acks and lock).
export async function proposeCrewDay(crewId, day) {
  if (!supabase) return;
  const { error } = await supabase.rpc("crew_propose_day", { p_crew: crewId, p_date: day });
  if (error) throw error;
  invalidateKeys(crewsReaders);
}
// EXPAND A MAPS SHORT LINK (0484). The phone apps share https://maps.app.goo.gl/… and
// https://maps.apple/p/…, which carry no coordinate; the resolve-map-link edge function follows the
// redirect (a browser cannot) and returns the full link, which lib/meetPin.js then reads. Throws when
// the link leads nowhere readable, so the caller can say so instead of saving a guess.
export async function resolveMapLink(url) {
  if (!supabase) throw new Error("Sign in to use a short maps link.");
  const { data, error } = await supabase.functions.invoke("resolve-map-link", { body: { url } });
  if (error) throw error;
  if (!data || typeof data.url !== "string") throw new Error((data && data.error) || "That link did not lead to a map");
  return data.url;
}
// A MEMBER'S ORDER OF THE PROPOSED DAYS (0483): crew_rank_day puts one day at a place in the caller's
// own order (1 = first choice, 2 = backup, 3 = second backup…), renumbers the rest, and says they can
// make that day when they had not. One call, so two taps cannot leave two days in the same place.
export async function rankCrewDay(crewId, day, rank) {
  if (!supabase) return;
  const { error } = await supabase.rpc("crew_rank_day", { p_crew: crewId, p_date: day, p_rank: rank });
  if (error) throw error;
  invalidateKeys(crewsReaders);
}
export async function unproposeCrewDay(crewId, day) {
  if (!supabase) return;
  const { error } = await supabase.rpc("crew_unpropose_day", { p_crew: crewId, p_date: day });
  if (error) throw error;
  invalidateKeys(crewsReaders);
}
// THE ORGANIZER HANDS THE CREW TO A MEMBER (0474). crews.created_by cannot be moved by an UPDATE
// (the organizer-only policy checks the NEW row too), so it goes through crew_hand_over, which
// also re-points the invites the old organizer sent. The old organizer stays on as a member.
export async function handOverCrew(crewId, toUserId) {
  if (!supabase) return;
  const { error } = await supabase.rpc("crew_hand_over", { p_crew: crewId, p_to: toUserId });
  if (error) throw error;
  invalidateKeys(crewsReaders);
  invalidateKeys(crewMembersReaders);
}
// A past crew's Archive / Clear (0370) -- the caller's own filing only: one row per climber per crew,
// readable by that climber alone, embedded in useMyCrews as crew_past_state. `null` puts the crew back
// on the Past crews list (Restore, Undo). Both writes .select(), so a refused write throws rather than
// reading as saved.
export async function setPastCrewState(crewId, state) {
  if (!supabase) return;
  if (state) {
    const { data, error } = await supabase.from("crew_past_state")
      .upsert({ crew_id: crewId, state, updated_at: new Date().toISOString() }, { onConflict: "user_id,crew_id" }).select("crew_id");
    if (error) throw error;
    if (!data || !data.length) throw new Error("That didn’t save — sign in again and retry.");
  } else {
    const { error } = await supabase.from("crew_past_state").delete().eq("crew_id", crewId).select("crew_id");
    if (error) throw error;
  }
  invalidateKeys([["my-crews"]]);
}
// RIDES on a crew (0377): who is driving (from a rough area, with N seats) and who needs a ride. The table
// answers only the crew's confirmed members and each row's owner, so a climber who has only asked to join
// reads an empty list -- the card does not offer the section to them. `null` data means not read yet.
const crewRidesReaders = [["crew-rides"]];
export function useCrewRides(crewId) {
  return useQuery({
    queryKey: ["crew-rides", crewId || ""],
    enabled: !!supabase && !!crewId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crew_rides").select("user_id,mode,seats,from_area,updated_at").eq("crew_id", crewId);
      if (error) throw error;
      return data || [];
    },
  });
}
// My own ride on a crew: {mode:"driving", seats, fromArea} or {mode:"need", fromArea}; `null` takes it off.
// Both .select(), so a write RLS refused (not a confirmed member) throws instead of reading as saved.
// MY float plan filing on a crew (0450): the date I filed and the crew's agreed return day -- never the plan or a
// contact, which stay on the device. Every confirmed member files their own (the organizer too); the shared
// crews.float_plan stamp, which RLS lets only the organizer write, is no longer used. `null` takes it off.
// Embedded in useMyCrews as crew_float_filings; .select() so a refused write throws instead of reading as saved.
export async function setMyFloatFiling(crewId, filing) {
  if (!supabase) return;
  if (filing) {
    const row = { crew_id: crewId, filed_at: new Date().toISOString().slice(0, 10), return_by: filing.returnBy || null, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("crew_float_filings").upsert(row, { onConflict: "crew_id,user_id" }).select("crew_id");
    if (error) throw error;
    if (!data || !data.length) throw new Error("That didn’t save — only a confirmed member of the crew can file a float plan.");
  } else {
    const { error } = await supabase.from("crew_float_filings").delete().eq("crew_id", crewId).select("crew_id");
    if (error) throw error;
  }
  invalidateKeys([["my-crews"]]);
}
export async function setMyCrewRide(crewId, ride) {
  if (!supabase) return;
  if (ride) {
    const row = { crew_id: crewId, mode: ride.mode, seats: ride.mode === "driving" ? ride.seats || 1 : null, from_area: String(ride.fromArea || "").trim().slice(0, 60), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("crew_rides").upsert(row, { onConflict: "crew_id,user_id" }).select("crew_id");
    if (error) throw error;
    if (!data || !data.length) throw new Error("That didn’t save — only a confirmed member of the crew can add a ride.");
  } else {
    const { error } = await supabase.from("crew_rides").delete().eq("crew_id", crewId).select("crew_id");
    if (error) throw error;
  }
  invalidateKeys(crewRidesReaders);
  pingCrewGear(crewId);
}
// The crew's shared plan (0199). NOT through updateCrewRow: crews UPDATE is organiser-only, and
// the climber sharing a plan is often a member. The definer function admits the organiser or a
// confirmed member, for this one column only. `null` clears it.
export async function shareCrewItinerary(crewId, itinerary) {
  if (!supabase) return;
  const { error } = await supabase.rpc("share_crew_itinerary", { p_crew_id: crewId, p_itinerary: itinerary || null });
  if (error) throw error;
}
// Every cached reader of crew_members, refreshed after each write to it (check:write-readers).
// "crew-listings" too: its "N of M" and spots are counted from crew_members, so an approve, a leave or an invite
// left the open-crews list stale until some crews-table write refreshed it (review 2026-11-23).
const crewMembersReaders = [["my-crew-invites"], ["my-crew-requests"], ["crew-listings"], ["crew-recap"], ["my-trip-recaps"]];
export async function addCrewMember(crewId, userId, status = "invited", note) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_members").insert({ crew_id: crewId, user_id: userId, status, note });
  if (error && error.code !== "23505") throw error;
  invalidateKeys(crewMembersReaders);
}
// Every cached reader of crew_email_invites, refreshed after each write to it (check:write-readers).
const crewEmailInvitesReaders = [["crew-email-invites"]];
// Invite-by-email: hold a crew spot for someone with no account yet (migration
// 0070). A signup with the matching email converts it into a crew_members row.
export async function inviteToCrewByEmail(crewId, email, invitedBy, note) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crew_email_invites").insert({
    crew_id: crewId, email: String(email).trim().toLowerCase(), invited_by: invitedBy, note: note || null,
  }).select().single();
  if (error) throw error;
  invalidateKeys(crewEmailInvitesReaders);
  return data;
}
export function useCrewEmailInvites(crewId) {
  return useQuery({
    queryKey: ["crew-email-invites", crewId],
    enabled: !!supabase && !!crewId,
    queryFn: async () => {
      const { data, error } = await supabase.from("crew_email_invites")
        .select("*").eq("crew_id", crewId).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}
export async function deleteCrewEmailInvite(id) {
  if (!supabase) return;
  // OPTIMISTIC: the withdrawn invite leaves the cached list now; the undo puts it back on failure.
  const undo = patchQueries(["crew-email-invites"], (d) => Array.isArray(d) && d.some((r) => r.id === id) ? d.filter((r) => r.id !== id) : d);
  const { error } = await supabase.from("crew_email_invites").delete().eq("id", id);
  if (error) { undo(); throw error; }
  invalidateKeys(crewEmailInvitesReaders);
}
// W17: 0070's claim trigger only fires at signup, so an invite-by-email addressed to an
// ALREADY-registered account was never converted into a crew_members row. Migration 0076 adds
// an RPC the signed-in user runs for themselves; the app calls it once per sign-in. Returns
// the number of invites claimed. Resolves to 0 (rather than throwing) when the RPC is not
// deployed yet, so a client running ahead of the migration simply does nothing.
export async function claimMyCrewEmailInvites() {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("claim_my_crew_email_invites");
  if (error) {
    if (error.code === "PGRST202" || /function .* does not exist/i.test(error.message || "")) return 0;
    throw error;
  }
  return data || 0;
}
export async function updateCrewMemberStatus(crewId, userId, status) {
  if (!supabase) return;
  // .select() is what makes an RLS rejection visible. PostgREST returns 200 and NO
  // error for an UPDATE whose policy matched zero rows, so checking `error` alone
  // reports success for a write that changed nothing — the same trap patchRow()
  // exists to close for scripts (CLAUDE.md). The 0036 policy is "self or organizer",
  // so a non-organizer confirming someone else lands here.
  const { data, error } = await supabase.from("crew_members").update({ status })
    .eq("crew_id", crewId).eq("user_id", userId).select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — only the member themselves or the crew organizer can change a membership status.");
  invalidateKeys(crewMembersReaders);
  return data;
}
// Add ONE item to a crew's list, as mine (0289). Every crew-gear write is one item: 0209 and 0287
// each REPLACED a whole list, and once crewmates could change that list too, a screen loaded before
// their change wrote it back over them. Through a definer rather than the row update: the membership
// policy refuses a confirmed member who joined by request, and that refusal is a 200 with zero rows,
// not an error. The function raises instead.
export async function addCrewGearItem(crewId, item) {
  if (!supabase) return;
  const { error } = await supabase.rpc("add_crew_gear_item", { p_crew_id: crewId, p_item: item });
  if (error) throw new Error(crewGearErrorText(error, "add"));
  // An RPC writer, so check:write-readers cannot see it: its readers are named by hand.
  invalidateKeys(crewsReaders);
}
// Mark a crew member -- myself or someone else -- as bringing ONE item, or clear it (0286, 0287).
// One item per call, so a stale screen can only change the item that was tapped. 0289 matches the
// item ignoring case, as the card's list does; 0291 refuses a member who is not confirmed (unless it
// is you) and an item that is not on the list. The caller runs these one at a time per crew, after
// the add they depend on (ClimbMatch's queueCrewGear).
export async function assignCrewGear(crewId, userId, item, on) {
  if (!supabase) return;
  const { error } = await supabase.rpc("assign_crew_gear", { p_crew_id: crewId, p_user_id: userId, p_item: item, p_on: !!on });
  if (error) throw new Error(crewGearErrorText(error, "assign"));
  invalidateKeys(crewsReaders);
}
// How many of an item ONE member brings (0328): above one is stored, one or fewer clears it back to
// the default of one. The claim itself is still assignCrewGear's; the caller sends the claim first.
export async function setCrewGearCount(crewId, userId, item, count) {
  if (!supabase) return;
  const { error } = await supabase.rpc("set_crew_gear_count", { p_crew_id: crewId, p_user_id: userId, p_item: item, p_count: count });
  if (error) throw new Error(crewGearErrorText(error, "assign"));
  invalidateKeys(crewsReaders);
}
// How many of an item the crew wants (0328), or null to say no number. Stored on the row of every
// member who added the item; the card reads the largest.
export async function setCrewGearWanted(crewId, item, count) {
  if (!supabase) return;
  const { error } = await supabase.rpc("set_crew_gear_wanted", { p_crew_id: crewId, p_item: item, p_count: count || null });
  if (error) throw new Error(crewGearErrorText(error, "wanted"));
  invalidateKeys(crewsReaders);
}
// Take an item off the crew's list for EVERYONE (0289): every member's copy of it and every claim on
// it, in one statement. Removing only my own copy left a crewmate's copy to put it straight back.
export async function removeCrewGearItem(crewId, item) {
  if (!supabase) return;
  const { error } = await supabase.rpc("remove_crew_gear_item", { p_crew_id: crewId, p_item: item });
  if (error) throw new Error(crewGearErrorText(error, "remove"));
  invalidateKeys(crewsReaders);
}
// The crew-gear functions raise short lower-case fragments (0286-0291, 0328); this is what a climber reads
// in the toast instead. An unknown message passes through as it came, never a blank toast.
function crewGearErrorText(error, op) {
  const m = String((error && error.message) || "").trim();
  const T = {
    "sign in to coordinate gear": "Sign in to coordinate gear.",
    "a gear item must be 1-80 characters": "A gear item must be 1–80 characters.",
    "you are not in this crew": op === "assign" ? "Only a confirmed member of this crew can put someone down for gear." : op === "wanted" ? "Only a confirmed member of this crew can set how many the crew wants." : "You’re not in this crew.",
    "that climber is not in this crew": "That climber isn’t in this crew.",
    "that climber has not been confirmed in this crew": "They haven’t been confirmed in this crew yet, so they can’t be put down for gear.",
    "that item is not on this crew's gear list": "That item isn’t on the crew’s list.",
    "only a climber who added that item can remove it": "Only a climber who added that item can remove it.",
    "a quantity must be 0-999": "A quantity must be 0–999.",
    "too many gear items": op === "add" ? "You’ve added 50 items to this list — remove one first." : "100 items is the most one climber can bring — take one off first.",
  };
  return T[m.toLowerCase()] || m || "That didn’t save — try again";
}
// The crew's gear list, kept live. No crew table is on the realtime publication, so a gear write is
// announced on a per-crew broadcast channel (as crew typing is): the ping carries nothing, and every
// open card that hears it refetches the crews it can read under RLS. Joining also refetches once, so
// a card opened after a minute away does not show the list it was last fetched with.
const crewGearChannels = new Map();
export function useCrewGearSync(crewId) {
  useEffect(() => {
    if (!supabase || !crewId) return undefined;
    const ch = supabase.channel("crew-gear:" + crewId, { config: { broadcast: { self: false } } });
    // A ride (0377) pings the same channel, so the crew's rides refetch with its gear.
    ch.on("broadcast", { event: "changed" }, () => invalidateKeys([...crewsReaders, ["crew-rides", crewId]]))
      .subscribe((status) => { if (status === "SUBSCRIBED") invalidateKeys([...crewsReaders, ["crew-rides", crewId]]); });
    crewGearChannels.set(crewId, ch);
    return () => { if (crewGearChannels.get(crewId) === ch) crewGearChannels.delete(crewId); supabase.removeChannel(ch); };
  }, [crewId]);
}
export function pingCrewGear(crewId) {
  const ch = crewGearChannels.get(crewId);
  // A lost ping costs a crewmate the live update, not the write: it is already saved.
  if (ch) { try { Promise.resolve(ch.send({ type: "broadcast", event: "changed", payload: {} })).catch(() => {}); } catch (e) {} }
}
export async function removeCrewMember(crewId, userId) {
  if (!supabase) return;
  // .select() for the reason updateCrewMemberStatus gives: an RLS-refused DELETE is a 200 with no
  // error, so without it leaving, declining or removing reads as done and the row comes back on reload.
  const { data, error } = await supabase.from("crew_members").delete().eq("crew_id", crewId).eq("user_id", userId).select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — try again.");
  invalidateKeys(crewMembersReaders);
}
// Take back my OWN request to join. Scoped to status `pending` so a second tap on "Requested"
// cannot quietly delete a membership the organiser has accepted in the meantime -- that is a
// leave, and it goes through removeCrewMember. .select() because a delete RLS refuses, or one
// that matched nothing, is a 200 with no error; zero rows back is reported, not swallowed.
export async function withdrawCrewJoinRequest(crewId, userId) {
  if (!supabase) return;
  const { data, error } = await supabase.from("crew_members").delete()
    .eq("crew_id", crewId).eq("user_id", userId).eq("status", "pending").select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("It’s no longer a pending request — the organizer may already have answered it.");
  invalidateKeys(crewMembersReaders);
  return data;
}
// Organiser takes back an invite before it is answered. Scoped to `invited` so it cannot remove
// someone who has since accepted (that is a removal, and the crew votes on it).
export async function withdrawCrewInvite(crewId, userId) {
  if (!supabase) return;
  const { data, error } = await supabase.from("crew_members").delete()
    .eq("crew_id", crewId).eq("user_id", userId).eq("status", "invited").select("user_id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("They’ve already answered that invite.");
  invalidateKeys(crewMembersReaders);
  return data;
}
export async function ackCrewDay(crewId, userId, date) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_day_acks").insert({ crew_id: crewId, user_id: userId, date });
  if (error && error.code !== "23505") throw error;
  // REFRESH THE CREWS (walkthrough 2026-11-14): proposing a day writes the day, then this ack. The day's
  // refetch could land before the ack and show "0 of 1 can make it" until the next refetch.
  invalidateKeys(crewsReaders);
}
export async function unackCrewDay(crewId, userId, date) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_day_acks").delete().eq("crew_id", crewId).eq("user_id", userId).eq("date", date);
  if (error) throw error;
  invalidateKeys(crewsReaders);
}
export async function deleteCrewRow(crewId) {
  if (!supabase) return;
  // .select(): RLS turns a delete the caller may not make into success with nothing deleted, and the screen
  // then said "the crew is disbanded for everyone" over a crew that still existed.
  const { data, error } = await supabase.from("crews").delete().eq("id", crewId).select("id");
  if (error) throw error;
  if (!Array.isArray(data) || !data.length) throw new Error("That didn’t save — only the crew’s organizer can disband it.");
  invalidateKeys(crewsReaders);
}
