// lib/db-logs.js — climb logs and trip reports, kudos, packing a route for offline, hazard votes, ratings, route views.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { getQueryClient, invalidateKeys } from "./queryClientRef";
import { supabase } from "./supabase";
import { offlinePackReports, offlinePackTracks, packMeta, packMetaStrict, packRouteOffline, packedRouteIds, registerStateExtras, saveMediaOffline, savePackSnapshot, savedMediaList } from "./offline";
import { removeRouteMapOffline, saveRouteMapOffline } from "./offlineTiles";
import { orOfflineExact } from "./db-shared.js";
import { fetchAreaRoutes } from "./db-catalog.js";
import { fetchRouteContributions } from "./db-contributions.js";
import { fetchProfilesByIds } from "./db-partners.js";
import { topoPhotoUrl } from "./db-photos.js";

// ============================================================================
// FEEDBACK LOOP: LOGS, VOUCHES, & TRUST (Phase 2-3)
// Crew persistence lives earlier in this file (useMyCrews/createCrew/etc.) -
// see supabase/migrations/0036_crews_persistence.sql for why crews specifically
// were kept separate from this section rather than reusing its pattern.
// ============================================================================

// Partners typed by NAME on your own logs (0236). climb_logs.partners holds only account uuids, so
// a name typed under CLIMBED WITH ("they don't need ClimbMatch") lives here, readable by the
// climber alone. Never feeds Ranks, trust or confirmation.
export function useMyLogPartnerNames(userId) {
  return useQuery({
    queryKey: ["log-partner-names", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("climb_log_partner_names").select("log_id,names").eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
  });
}

// Every cached reader of climb_log_partner_names, refreshed after each write to it (check:write-readers).
const climbLogPartnerNamesReaders = [["log-partner-names"]];
// Replace one log's typed partner names; an empty list deletes the row. Throws unless the write
// came back, because RLS answers a write it refused with 200 and an empty array.
export async function saveLogPartnerNames(logId, names) {
  if (!supabase || !logId) return;
  const clean = Array.from(new Set((names || []).map((s) => String(s || "").trim().slice(0, 100)).filter(Boolean))).slice(0, 20);
  if (!clean.length) {
    const { error } = await supabase.from("climb_log_partner_names").delete().eq("log_id", logId);
    if (error) throw error;
    invalidateKeys(climbLogPartnerNamesReaders);
    return;
  }
  const { data, error } = await supabase.from("climb_log_partner_names")
    .upsert({ log_id: logId, names: clean, updated_at: new Date().toISOString() }, { onConflict: "log_id" })
    .select("log_id");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("the typed partner names were not saved");
  invalidateKeys(climbLogPartnerNamesReaders);
}

// Query: YOUR OWN climb logs, every column the app reads back -- App hydrates `logs` from these rows (the write-up,
// conditions, times, camps, beta, photos, partners...), and a log opened for editing is filled from
// them, so a missing column there reads as "you left it blank" and the next save WIPES it. Named, not `*`
// (check:profile-privacy refuses `*` on climb_logs); check:log fails if a column the hydration reads is
// missing from this list. This is
// a different reader from useUserLogs below: 0501 (#3736) narrowed that one to four columns for
// the résumé and took this hydration down with it, since both shared the hook. The key
// sits under ["user-logs", id], so logReaders' invalidation still refreshes it after a write.
export function useMyLogs(userId) {
  return useQuery({
    queryKey: ["user-logs", userId, "own"],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climb_logs").select("id, user_id, route_id, discipline, date_climbed, created_at, trip_report_visibility, crew_id, tick_type, summited, stars, cond_tags, notes, photos, pitches_climbed, grade_feel, beta, gear_beta, fa_ascent, developed, sun_vote, sun_note, road_note, outcome_reasons, outcome_note, gpx_track, itinerary, partners, approach_minutes, climb_minutes, descent_minutes, car_to_car_minutes, snow_condition, freezing_level_ft, rappel_count, rappel_longest_m, rappel_rope, nights_out, camp_names, water_level, bug_pressure, trail_condition, temp_f, snow_depth, seepage, mud, protection_quality, anchor_quality, crowd_level, party_size")
        .eq("user_id", userId)
        .order("date_climbed", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Query: ANOTHER climber's logs as trip reports, for their profile's Activity, where a tick opens the
// same report the route page opens (tripRowToActivity). The route page's own report columns, never
// `*`: a signed-out reader may not select climb_logs.partners (0500/0501). Which ROWS come back is
// climb_logs' policy (0273): Everyone reports to anyone, friends' and crew reports to them.
export function useClimberReports(userId) {
  return useQuery({
    queryKey: ["user-logs", userId, "reports"],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const run = (cols) => supabase.from("climb_logs").select("route_id, " + cols)
        .eq("user_id", userId)
        .order("date_climbed", { ascending: false });
      let { data, error } = await run(TRIP_REPORT_COLS + ", temp_f, snow_depth, seepage, mud, road_note, rappel_count, rappel_longest_m, rappel_rope, nights_out, camp_names, pitches_climbed, grade_feel");
      if (isUnknownColumn(error)) ({ data, error } = await run(TRIP_REPORT_COLS));
      if (error) throw error;
      return data || [];
    },
  });
}

// Query: another climber's climb logs, for their résumé (its only reader since #3787 -- your OWN logs read useMyLogs above -- which reads these four
// fields). Named columns, never `*`: since 0500 a signed-out reader may not select climb_logs.partners,
// and `*` names it, so a guest opening a résumé would get an error instead of the climbs.
export function useUserLogs(userId) {
  return useQuery({
    queryKey: ["user-logs", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climb_logs").select("id, route_id, date_climbed, stars, tick_type")
        .eq("user_id", userId)
        .order("date_climbed", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Query: other climbers' trip reports for a route.
//
// This used to call `get_trip_reports_for_consensus`, which returns FIVE columns -- id,
// user_id, stars, cond_tags, date_climbed. That is enough to compute a conditions
// consensus and nothing else, so a climber could write a full public report (notes,
// photos, send beta, rack beta, what turned them around, snow, freezing level, water,
// bugs, trail, approach/climb/descent splits), have every one of those columns PERSIST
// via syncLogToDb, and no other climber would ever see a word of it. The route page
// still promised otherwise: "log yours and your conditions, beta & rating appear here
// automatically."
//
// Nothing was missing server-side. climb_logs already carries every column, and 0081's
// "view crew logs" policy already decides who may read a row: public -> anyone including
// signed-out, crew -> confirmed members of that crew, everything else -> author only.
// The only thing missing was the SELECT. So this reads the table directly rather than
// widening the RPC -- one fewer piece of schema to keep in step with the client, and the
// policy stays the single authority on visibility.
//
// The `in.(public,crew)` filter is redundant against that policy but deliberate: without
// it "view own logs" would also hand back the caller's own PRIVATE rows, which would then
// render on the route page as though they were community reports.
//
// No date cutoff, unlike the RPC's 180 days. Recency is buildConsensus's job -- it
// separates all-time from recent tags and weights by age -- and seed `activity` has never
// been cut off by date either, so an old report now behaves the same whichever it came
// from. `limit` bounds the read instead.
// fa_ascent/developed/sun_vote/sun_note/itinerary: RouteDetail has always MAPPED all five into
// the report another climber opens, and nothing ever SELECTED them -- so the FA panel could only
// credit yourself and a logged day-by-day plan was never offered to anyone. gpx_track stays out:
// up to 500 points per row, on a read of 60 rows.
const TRIP_REPORT_COLS = "id, user_id, stars, cond_tags, date_climbed, discipline, tick_type, summited, notes, photos, beta, gear_beta, outcome_reasons, outcome_note, approach_minutes, climb_minutes, descent_minutes, car_to_car_minutes, snow_condition, freezing_level_ft, water_level, bug_pressure, trail_condition, party_size, protection_quality, anchor_quality, crowd_level, fa_ascent, developed, sun_vote, sun_note, itinerary, created_at";
// Same 0121 degrade as the write side, for the same reason: naming a column the database does
// not have yet turns the whole SELECT into a 400, and a route page that shows NO community
// reports is exactly the bug this function exists to fix. Falling back to the pre-0121 column
// list loses four chips, not the reports.
async function fetchRouteTripReports(routeId, limit) {
  const run = (cols) => supabase
    .from("climb_logs")
    .select(cols)
    .eq("route_id", routeId)
    .in("trip_report_visibility", ["public", "crew", "friends"])
    .order("date_climbed", { ascending: false })
    .limit(limit);
  let { data, error } = await run(TRIP_REPORT_COLS + ", temp_f, snow_depth, seepage, mud, road_note, rappel_count, rappel_longest_m, rappel_rope, nights_out, camp_names, pitches_climbed, grade_feel");
  if (isUnknownColumn(error)) ({ data, error } = await run(TRIP_REPORT_COLS));
  if (error) throw error;
  return data || [];
}
// ONE report by id, for the `?report=` link a shared trip report carries. climb_logs' own policy
// (0273) decides who gets it: anyone for an Everyone report, signed out included; friends or the crew
// for theirs. A row the reader may not see is `null` -- not shared with them, or deleted -- and a
// failed read throws, so the link can say which of the two happened.
export async function fetchTripReportById(id) {
  if (!supabase) throw new Error("Catalog backend not configured");
  const run = (cols) => supabase.from("climb_logs").select("route_id, " + cols).eq("id", id)
    .in("trip_report_visibility", ["public", "crew", "friends"]).maybeSingle();
  let { data, error } = await run(TRIP_REPORT_COLS + ", temp_f, snow_depth, seepage, mud, road_note, rappel_count, rappel_longest_m, rappel_rope, nights_out, camp_names, pitches_climbed, grade_feel");
  if (isUnknownColumn(error)) ({ data, error } = await run(TRIP_REPORT_COLS));
  if (error) throw error;
  return data || null;
}
// The Today tab's "Recent friend activity": your connections' shared climbs, newest first, in ONE
// read. It was built from the seed ROUTES' `activity`, so a real account's friends never appeared
// in it. Same columns and the same visibility filter as the route page, for the same reasons —
// 0081's policy decides what a friend's row shows you; the filter keeps it to what they shared.
export async function fetchSharedLogs(col, ids, limit, sinceDays) {
  const run = (cols) => {
    let q = supabase
      .from("climb_logs")
      .select("route_id, " + cols)
      .in(col, ids)
      .in("trip_report_visibility", ["public", "crew", "friends"]);
    if (sinceDays) q = q.gte("date_climbed", new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10));
    return q.order("date_climbed", { ascending: false }).limit(limit);
  };
  let { data, error } = await run(TRIP_REPORT_COLS + ", temp_f, snow_depth, seepage, mud, road_note, rappel_count, rappel_longest_m, rappel_rope, nights_out, camp_names, pitches_climbed, grade_feel");
  if (isUnknownColumn(error)) ({ data, error } = await run(TRIP_REPORT_COLS));
  if (error) throw error;
  return data || [];
}
export function useFriendsActivity(userIds, limit = 40) {
  const ids = [...new Set((userIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["friends-activity", ids, limit],
    enabled: !!supabase && ids.length > 0,
    queryFn: () => fetchSharedLogs("user_id", ids, limit),
  });
}
// ── Kudos (0229) ──
// One row per (giver, climb log). Readable only by the two people involved. The giver reads
// their own to show the tick; the receiver reads theirs into the notification bell.
export function useKudosGiven(userId) {
  return useQuery({
    queryKey: ["kudos-given", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("kudos").select("id, climb_log_id").eq("giver", userId);
      if (error) throw error;
      return data || [];
    },
  });
}
export function useKudosReceived(userId, limit = 30) {
  return useQuery({
    queryKey: ["kudos-received", userId, limit],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("kudos")
        .select("id, giver, climb_log_id, route_name, created_at")
        .eq("receiver", userId).order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}
// Every cached reader of kudos, refreshed after each write to it (check:write-readers).
const kudosReaders = [["kudos-given"], ["kudos-received"]];
export async function giveKudosRow(giver, receiver, climbLogId, routeName) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("kudos")
    .insert({ giver, receiver, climb_log_id: climbLogId, route_name: routeName ? String(routeName).slice(0, 200) : null })
    .select("id").single();
  // 23505: already given (a second device, or a double tap) -- the kudos stands, which is the intent.
  if (error && error.code !== "23505") throw error;
  invalidateKeys(kudosReaders);
  return data;
}
// .select() for the reason removeCrewMember gives: an RLS-refused DELETE is a 200 with no rows.
export async function takeBackKudosRow(giver, climbLogId) {
  if (!supabase) return;
  const { data, error } = await supabase.from("kudos").delete()
    .eq("giver", giver).eq("climb_log_id", climbLogId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — try again.");
  invalidateKeys(kudosReaders);
}
// ...and the Logbook's "Recent condition reports": the last 90 days of shared reports on the
// routes in your objectives. It read each route's seed `activity`, which a catalog route never has.
export function useRecentReportsOnRoutes(routeIds, limit = 60) {
  const ids = [...new Set((routeIds || []).filter(Boolean))].sort();
  return useQuery({
    queryKey: ["recent-reports-on-routes", ids, limit],
    enabled: !!supabase && ids.length > 0,
    queryFn: () => fetchSharedLogs("route_id", ids, limit, 90),
  });
}
// HOW MANY trip reports each listed route has, for the "✓ N reports" line on a sibling climb. The
// seed rows count their own `activity`; a DB row has none, so the line never showed on a real crag.
// Only route_id is read (the rows are counted here, not shown), filtered by an id list, which is the
// read this table answers quickly — never a scan. Same visibility rule as the report lists.
export function useRouteReportCounts(routeIds) {
  const ids = [...new Set((routeIds || []).filter(Boolean).map(String))].sort().slice(0, 100);
  return useQuery({
    queryKey: ["route-report-counts", ids],
    enabled: !!supabase && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climb_logs").select("route_id")
        .in("route_id", ids)
        .in("trip_report_visibility", ["public", "crew", "friends"])
        .limit(2000);
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { out[r.route_id] = (out[r.route_id] || 0) + 1; });
      return out;
    },
  });
}
// No signal: a PACKED route answers with the reports saved when it was packed or last refreshed,
// stamped `_packedAt` (structuralSharing off so the stamp reaches the page, which says how old).
// LOAD MORE (the full tracks page, lib/RouteTracksPage.jsx) asks the same question with a larger limit.
// The rows already on screen stay there while the larger read runs, but ONLY this route's: the limit
// is the last part of the key, so a plain "keep the previous data" would show the last route's rows
// on the next route until its own read landed.
const sameRouteWhileLoadingMore = (routeId) => (prev, prevQuery) => (prevQuery && prevQuery.queryKey[1] === routeId ? prev : undefined);
export const ROUTE_REPORTS_CAP = 60;
export function useRouteTripReports(routeId, limit = ROUTE_REPORTS_CAP) {
  return useQuery({
    queryKey: ["route-trip-reports", routeId, limit],
    enabled: !!supabase && !!routeId,
    structuralSharing: false,
    placeholderData: sameRouteWhileLoadingMore(routeId),
    queryFn: () => orOfflineExact(() => fetchRouteTripReports(routeId, limit), () => offlinePackReports(routeId)),
  });
}
// ...and the reports the caller CANNOT read: kept to friends, a crew or the climber alone. 0329 hands
// back what each one recorded about the conditions, with no author and no words, so every report
// feeds the route's conditions (Mountain Project counts a private tick the same way). The rows go
// through anonRowToActivity and reach the consensus cards only, never a list of reports.
export function useRoutePrivateConditions(routeId) {
  return useQuery({
    queryKey: ["route-private-conditions", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("route_private_conditions", { p_route: routeId });
      if (error) throw error;
      return data || [];
    },
  });
}

// ...and the bell's half of it (0368): reports on YOUR objectives that you cannot read, so the alert that
// somebody was just on a climb you want says so without naming them. Route, day and tick type only.
export function useObjectivePrivateLogs(userId, days = 30) {
  return useQuery({
    queryKey: ["objective-private-logs", userId, days],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("objective_private_logs", { p_days: days });
      if (error) throw error;
      return data || [];
    },
  });
}

// ── packing a route: the row AND what the page needs beside it ──────────────
// packRouteOffline stores the route row; this adds the snapshot (agreed corrections, the latest
// reports and their authors' public names). The pack itself is the promise the button makes, so a
// failed SNAPSHOT does not fail it — the result says so and the caller words its toast from it.
// Also the REFRESH: a repack keeps packedAt and replaces the snapshot with a fresh one.
export const PACK_REPORT_LIMIT = 20;
export async function packRouteWithSnapshot(routeId, opts) {
  const res = await packRouteOffline(routeId, opts);
  if (res.seed || !supabase) return { ...res, snapshot: false, map: null };
  const { row, ...out } = res;
  let snapshot = false, walkIn = null, photoRows = [], people = [], reportRows = [];
  try {
    const [contribs, reports] = await Promise.all([fetchRouteContributions(routeId), fetchRouteTripReports(routeId, PACK_REPORT_LIMIT)]);
    // The rest of what the page draws (lib/offline.js "WHAT ELSE THE ROUTE PAGE DRAWS"). Each is its
    // own read and is LEFT OUT when it fails, so its reader keeps "couldn't load" for that part
    // instead of the whole save failing over a list of neighbours.
    const areaId = row && row.area_id;
    const [tracks, area, siblings] = await Promise.all([
      fetchRouteTracks(routeId).catch(() => null),
      areaId ? supabase.from("areas").select("*").eq("id", areaId).maybeSingle().then((r) => (r.error ? null : r.data), () => null) : null,
      areaId ? fetchAreaRoutes(areaId, false).catch(() => null) : null,
    ]);
    photoRows = (contribs || []).filter((c) => c.kind === "photo");
    const ids = [...new Set((reports || []).concat(tracks || []).map((r) => r.user_id).concat(photoRows.map((c) => c.contributor)).filter((x) => x && x !== "anon"))];
    const profiles = ids.length ? await fetchProfilesByIds(ids) : [];
    people = profiles; reportRows = reports || [];
    const snap = { contribs: (contribs || []).filter((c) => c.kind !== "photo"), reports: reports || [], profiles };
    if (tracks) snap.tracks = tracks;
    if (area) { snap.area = area; walkIn = area.walkin_gpx; }
    if (siblings) snap.siblings = siblings;
    await savePackSnapshot(routeId, snap);
    snapshot = true;
  } catch (e) { /* the result says so */ }
  // PHOTOS AND TOPOS (owner, 2026-11-19: a saved climb keeps "everything that is on that route page").
  // Like the map, this cannot fail the save; the result says how many landed.
  let media = null;
  try { media = await savePackMedia(routeId, row, photoRows, people, reportRows); } catch (e) { media = null; }
  // The MAP from the trailhead to the climb (lib/offlineTiles.js). Like the snapshot it cannot fail
  // the pack; the result carries how much of it landed so the toast states that and no more.
  let map = null;
  try {
    // The crag's walk-in line is on the AREA row, not the route's: hand it over so its ground is saved too.
    map = await saveRouteMapOffline(routeId, row, opts && opts.onMapProgress, walkIn);
    // Taken off the pack while its map was downloading: do not leave the tiles behind.
    if (!(await packedRouteIds()).includes(routeId)) { await removeRouteMapOffline(routeId); map = null; }
  } catch (e) { map = null; }
  return { ...out, snapshot, map, media };
}

/* The images of ONE saved climb, into the same `media` store the per-image "Save offline" chip
   writes (lib/offline.js), so the Photos tab and the topo section read them back with no new reader.
   The 2026-10-07 rule that images never ride in a download is about a whole STATE (thousands of
   climbs); one climb is bounded: the newest PACK_PHOTO_LIMIT photos and every topo. An image already
   on the device is not fetched again. A full device stops the loop and says so. Bylines honour "show
   my real name": a hidden name is stored as the handle, or not at all. */
export const PACK_PHOTO_LIMIT = 40;
async function savePackMedia(routeId, row, photoRows, people, reportRows) {
  const have = new Set((await savedMediaList()).map((m) => m.url));
  const byId = {}; (people || []).forEach((p) => { byId[p.id] = p; });
  const jobs = [];
  (photoRows || []).slice(-PACK_PHOTO_LIMIT).forEach((r) => {
    const v = r.value, url = v && typeof v === "object" ? v.url : (typeof v === "string" ? v : null);
    if (!url) return;
    const p = byId[r.contributor];
    const by = p ? (p.showName && p.name ? p.name : (p.username ? "@" + p.username : null)) : null;
    jobs.push({ url, kind: "photo", routeId, pack: true, row: { url, alt: v && typeof v === "object" && typeof v.alt === "string" ? v.alt : null, by, avatar: (p && p.avatar) || null, date: r.created_at ? String(r.created_at).slice(0, 10) : null } });
  });
  // The photos the saved TRIP REPORTS carry. The Photos tab builds these from the reports themselves,
  // so they are stored as `report-photo`: on the device for MediaImg to draw by URL, and not listed a
  // second time among the route's own photos (savedRoutePhotos reads kind "photo").
  const seen = new Set(jobs.map((j) => j.url));
  (reportRows || []).forEach((r) => (Array.isArray(r.photos) ? r.photos : []).forEach((x) => {
    // A report's photo is a URL, or { url, alt } since descriptions were added.
    const u = typeof x === "string" ? x : (x && x.url);
    if (typeof u !== "string" ||!/^https?:/.test(u) || seen.has(u) || seen.size >= 2 * PACK_PHOTO_LIMIT) return;
    seen.add(u); jobs.push({ url: u, kind: "report-photo", routeId, pack: true, row: { url: u } });
  }));
  let topoRows = [];
  try {
    const { data, error } = await supabase.from("topos").select("*, topo_lines(*)").eq("route_id", routeId).order("created_at", { ascending: false });
    if (!error) topoRows = data || [];
  } catch (e) { topoRows = []; }
  topoRows.forEach((t) => { const url = topoPhotoUrl(t.storage_path); if (url) jobs.push({ url, kind: "topo", areaId: row && row.area_id, routeId, pack: true, row: t }); });
  const out = { photos: 0, photosTotal: jobs.filter((j) => j.kind !== "topo").length, topos: 0, toposTotal: jobs.filter((j) => j.kind === "topo").length, full: false };
  for (const j of jobs) {
    if (!have.has(j.url)) {
      try { await saveMediaOffline(j); }
      catch (e) { if (e && e.code === "no_write") { out.noWrite = true; break; } if (/storage/i.test((e && e.message) || "")) { out.full = true; break; } continue; }
    }
    if (j.kind === "topo") out.topos++; else out.photos++;
  }
  const qc = getQueryClient();
  if (qc) { qc.invalidateQueries({ queryKey: ["saved-media"] }); qc.invalidateQueries({ queryKey: ["media-src"] }); }
  return out;
}

// ── a downloaded state carries what climbers have said, too ─────────────────
// The state download (lib/offline.js) pages routes in id windows and asks these for each window, so
// the column lists and the pre-0121 fallback stay in ONE place: the route page's own readers above.
// Each returns { data, error } like a PostgREST call, which is what the download's retry expects.
if (supabase) registerStateExtras({
  contribsInWindow: (from, to, after) => {
    let q = supabase.from("contributions").select("*").gte("route_id", from).lte("route_id", to).neq("kind", "photo");
    if (after) q = q.gt("id", after);
    return q.order("id").limit(1000);
  },
  reportsInWindow: async (stateId, from, to, perRoute, after) => {
    const run = (cols) => {
      let q = supabase.rpc("state_trip_reports", { p_state: stateId, p_from: from, p_to: to, p_per_route: perRoute }).select(cols);
      if (after) q = q.gt("id", after);
      return q.order("id").limit(1000);
    };
    let res = await run(TRIP_REPORT_COLS + ", route_id, temp_f, snow_depth, seepage, mud, road_note, rappel_count, rappel_longest_m, rappel_rope, nights_out, camp_names, pitches_climbed, grade_feel");
    if (isUnknownColumn(res.error)) res = await run(TRIP_REPORT_COLS + ", route_id");
    return res;
  },
  profiles: (ids) => fetchProfilesByIds(ids),
});

// When each packed route was chosen and last refreshed — the ages the pack's rows print. Device-only,
// so it runs with or without a backend; callers refetch it after a pack, refresh or forecast save.
export function usePackMeta() {
  return useQuery({ queryKey: ["pack-meta"], queryFn: packMeta, staleTime: 0 });
}
// The same read for the Saved offline list: a store that cannot be opened is an ERROR there, never
// an empty list. Keyed under "pack-meta" so every save and remove that invalidates one refreshes both.
export function usePackMetaStrict() {
  return useQuery({ queryKey: ["pack-meta", "strict"], queryFn: packMetaStrict, staleTime: 0, retry: 1 });
}

// Columns added by migration 0121. The log form has collected temperature, snow depth,
// seepage and mud since long before there was anywhere to put them: syncLogToDb simply did
// not name them, so all four were shown back to the author for the length of the session and
// then dropped on save. They are written now — but a checkout whose database has not had 0121
// applied yet would have every log write fail outright on an unknown column, which is a far
// worse failure than the one being fixed. So the write degrades: PostgREST answers an unknown
// column with PGRST204, and on exactly that code the row is re-sent without these four.
//
// This is deliberately NOT a permanent compatibility shim. Once 0121 is applied the retry can
// never fire; the branch exists so that applying the migration and deploying the client are
// independent events rather than a flag day.
// road_note (0205) rides the same degrade: the road-conditions section of the log form writes it,
// and a database without the column must still save the rest of the log.
// rappel_count / rappel_longest_m / rappel_rope (0207) ride it too: the log form's RAPPELS answers.
// nights_out / camp_names (0358) too: the log form's WHERE YOU CAMPED answers.
// summited (0373) too: the log form's Also reached the summit answer.
// pitches_climbed (0500) too: the log form's Pitches climbed answer on a multipitch climb it did not finish.
// grade_feel (0537) too: the log form's HOW THE GRADE FELT answer (soft / right / stiff).
const LOG_COLS_0121 = ["temp_f", "snow_depth", "seepage", "mud", "road_note", "rappel_count", "rappel_longest_m", "rappel_rope", "nights_out", "camp_names", "summited", "pitches_climbed", "grade_feel"];
export function isUnknownColumn(error) {
  return !!error && (error.code === "PGRST204" || /column .* does not exist/i.test(error.message || ""));
}
function withoutNewLogCols(row) {
  const out = { ...row };
  LOG_COLS_0121.forEach((c) => { delete out[c]; });
  return out;
}

// Mutation: Create a climb log
// The queries that read climb_logs, refreshed after every write to it. Before this, a logged
// climb reached the Logbook (its own state) but the route's REPORTS tab, Today's recent reports
// and a friend's activity feed kept the pre-write answer until a reload.
// route-logged-with and log-tags-for-me read climb_logs through an RPC, which check:write-readers
// cannot see; they are named here by hand.
const logReaders = (userId, routeId) => [["user-logs", userId], ["partner-counts"], ["route-trip-reports", routeId], ["route-private-conditions", routeId], ["friends-activity"], ["recent-reports-on-routes"], ["route-report-counts"], ["area-latest-reports"], ["route-logged-with", routeId], ["log-tags-for-me", userId], ["log-track"], ["route-stats", routeId], ["route-tracks", routeId]];

// A reporter's OWN recorded track, read when their report is OPENED. TRIP_REPORT_COLS leaves
// gpx_track out on purpose (up to 500 points a row, 60 rows a page), so a report opened from the
// route page carried no track at all -- and TripReport drew the ROUTE's line in its place, under
// a GPS TRACK heading, as though the reporter had recorded it (Northeast Buttress of Goode,
// 2026-10-15). One row, one column, only once the modal is up; RLS decides who may read it,
// exactly as it decides the report. null = this report carries no track.
export function useLogTrack(logId) {
  return useQuery({
    queryKey: ["log-track", logId],
    enabled: !!supabase && !!logId,
    queryFn: async () => {
      const { data, error } = await supabase.from("climb_logs").select("gpx_track").eq("id", logId).maybeSingle();
      if (error) throw error;
      return (data && data.gpx_track) || null;
    },
  });
}
// EVERY RECORDED TRACK climbers shared on one route, for the route page's CLIMBERS' TRACKS list and
// the tracks it overlays on the 2D and 3D maps. The same readers as the Reports list (the visibility
// filter of fetchRouteTripReports, and climb_logs' own policy beneath it), so a track is shown to
// exactly the people who may open the report it came with. Up to 500 points a row, so capped at 30
// rows, newest first; the list says when it holds the cap.
export const ROUTE_TRACKS_CAP = 30;
async function fetchRouteTracks(routeId, limit = ROUTE_TRACKS_CAP) {
  const { data, error } = await supabase
    .from("climb_logs")
    .select("id, user_id, date_climbed, car_to_car_minutes, gpx_track")
    .eq("route_id", routeId)
    .in("trip_report_visibility", ["public", "crew", "friends"])
    .not("gpx_track", "is", null)
    .order("date_climbed", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
// With no signal: the tracks saved with the climb (lib/offline.js offlinePackTracks), stamped
// `_packedAt`; structuralSharing is off so the stamp reaches the page. A climb saved before tracks
// rode along answers undefined and the read fails as it always did. The saved copy is the first
// page (ROUTE_TRACKS_CAP), whatever `limit` a Load more has reached.
export function useRouteTracks(routeId, limit = ROUTE_TRACKS_CAP) {
  return useQuery({
    queryKey: ["route-tracks", routeId, limit],
    enabled: !!supabase && !!routeId,
    structuralSharing: false,
    placeholderData: sameRouteWhileLoadingMore(routeId),
    queryFn: () => orOfflineExact(() => fetchRouteTracks(routeId, limit), () => offlinePackTracks(routeId)),
  });
}
export async function createClimbLog(userId, routeId, logData) {
  if (!supabase) return null;
  const row = { user_id: userId, route_id: routeId, ...logData, created_at: new Date().toISOString() };
  let { data, error } = await supabase.from("climb_logs").insert(row).select().single();
  if (isUnknownColumn(error)) {
    ({ data, error } = await supabase.from("climb_logs").insert(withoutNewLogCols(row)).select().single());
  }
  if (error) throw error;
  invalidateKeys(logReaders(userId, routeId));
  return data;
}

// Mutation: Update a climb log
export async function updateClimbLog(logId, fields) {
  if (!supabase) return null;
  const row = { ...fields, updated_at: new Date().toISOString() };
  let { data, error } = await supabase.from("climb_logs").update(row).eq("id", logId).select().single();
  if (isUnknownColumn(error)) {
    ({ data, error } = await supabase.from("climb_logs").update(withoutNewLogCols(row)).eq("id", logId).select().single());
  }
  if (error) throw error;
  invalidateKeys(logReaders(data && data.user_id, data && data.route_id));
  return data;
}

// Mutation: give every report I have already written one visibility (0272) -- Settings' "apply to my
// past reports". Returns the rows it changed, so the caller can patch the logs it hydrated once.
export async function setAllMyTripReportVisibility(userId, visibility) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase.from("climb_logs")
    .update({ trip_report_visibility: visibility, updated_at: new Date().toISOString() })
    .eq("user_id", userId).neq("trip_report_visibility", visibility).select("id,route_id");
  if (error) throw error;
  const rows = data || [];
  invalidateKeys(logReaders(userId, null));
  Array.from(new Set(rows.map(r => r.route_id))).forEach(rid => invalidateKeys(logReaders(userId, rid)));
  return rows;
}

// Mutation: Delete a climb log
export async function deleteClimbLog(logId) {
  if (!supabase) return null;
  // select() returns the deleted row, which is the only way to know whose readers to refresh.
  const { data, error } = await supabase.from("climb_logs").delete().eq("id", logId).select("user_id,route_id");
  if (error) throw error;
  const gone = data && data[0];
  invalidateKeys(logReaders(gone && gone.user_id, gone && gone.route_id));
}

// Query: Get user's vouches
// Hazard "still there" / "gone now" votes for one route (migration 0089). Read is public
// because this is route safety information — a signed-out climber checking conditions needs
// it as much as a member does.
//
// Returns the shape the UI already speaks: { "<routeId>|<label>": {still, gone, mine} }.
// Counting here rather than in a view keeps one round trip and lets `mine` be resolved in
// the same pass; a route's vote rows are small.
export function useRouteHazardVotes(routeId, userId) {
  return useQuery({
    queryKey: ["hazard-votes", routeId, userId || null], // `mine` is this viewer's, so the key must say who
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hazard_votes").select("hazard_label, user_id, vote").eq("route_id", routeId);
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => {
        const k = routeId + "|" + r.hazard_label;
        if (!out[k]) out[k] = { still: 0, gone: 0, mine: null };
        if (r.vote === "still") out[k].still++; else if (r.vote === "gone") out[k].gone++;
        if (userId && r.user_id === userId) out[k].mine = r.vote;
      });
      return out;
    },
  });
}

// Every cached reader of hazard_votes, refreshed after each write to it (check:write-readers).
const hazardVotesReaders = [["hazard-votes"]];
// Cast, change, or withdraw a vote. `vote` of null withdraws — that is the UI's toggle-off,
// and it is a delete rather than a third vote state so the aggregate never has to guess
// what an absent-but-present row means.
export async function castHazardVote(userId, routeId, hazardLabel, vote) {
  if (!supabase) return null;
  if (!vote) {
    const { error } = await supabase.from("hazard_votes").delete()
      .eq("user_id", userId).eq("route_id", routeId).eq("hazard_label", hazardLabel);
    if (error) throw error;
    invalidateKeys(hazardVotesReaders);
    return true;
  }
  // One row per climber per hazard (unique index), so changing a vote is an upsert on that
  // key rather than an insert that would collide.
  const { data, error } = await supabase.from("hazard_votes")
    .upsert({ user_id: userId, route_id: routeId, hazard_label: hazardLabel, vote },
            { onConflict: "route_id,hazard_label,user_id" })
    .select().single();
  if (error) throw error;
  invalidateKeys(hazardVotesReaders);
  return data;
}

// Climbers' 1-5 reads on DIFFICULTY BREAKDOWN's five axes (migration 0234). Public read, like
// hazard votes: it is route information, and the UI renders only an average and a count.
//
// Returns the shape DiffRadar already speaks: { "<axis>": { "<userId>": rating } }.
export function useRouteDifficultyRatings(routeId) {
  return useQuery({
    queryKey: ["difficulty-ratings", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_difficulty_ratings").select("axis, user_id, rating").eq("route_id", routeId);
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { (out[r.axis] = out[r.axis] || {})[r.user_id] = r.rating; });
      return out;
    },
  });
}

// Every cached reader of route_difficulty_ratings, refreshed after each write to it (check:write-readers).
const routeDifficultyRatingsReaders = [["difficulty-ratings"]];
// Set, change, or withdraw one climber's read on one axis. A null rating withdraws it — the
// UI's tap-your-own-number-again — as a delete, so the average never counts an empty row.
export async function setDifficultyRating(userId, routeId, axis, rating) {
  if (!supabase) return null;
  if (rating == null) {
    const { error } = await supabase.from("route_difficulty_ratings").delete()
      .eq("user_id", userId).eq("route_id", routeId).eq("axis", axis);
    if (error) throw error;
    invalidateKeys(routeDifficultyRatingsReaders);
    return true;
  }
  const { data, error } = await supabase.from("route_difficulty_ratings")
    .upsert({ user_id: userId, route_id: routeId, axis, rating }, { onConflict: "route_id,axis,user_id" })
    .select().single();
  if (error) throw error;
  invalidateKeys(routeDifficultyRatingsReaders);
  return data;
}

// The route page's header stars (migration 0294). They were React state, so a rating was gone
// on the next visit and nobody else ever counted it. One row per climber per route.
//
// Your own rating. RLS returns only your row, so `null` is "you have not rated it" — but only
// when the read SUCCEEDED; a caller must check `error` before showing empty stars.
export function useMyRouteRating(routeId, userId) {
  return useQuery({
    queryKey: ["route-rating-mine", routeId, userId || null],
    enabled: !!supabase && !!routeId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_ratings").select("stars").eq("route_id", routeId).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? data.stars : null;
    },
  });
}

// The route's rating for everyone: the average of ONE vote per climber — their header rating,
// else their latest public trip report's stars. { stars: number|null, raters: number }.
export function useRouteStarSummary(routeId) {
  return useQuery({
    queryKey: ["route-star-summary", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("route_star_summary", { p_route_id: routeId });
      if (error) throw error;
      const r = (data && data[0]) || {};
      return { stars: r.stars == null ? null : Number(r.stars), raters: r.raters || 0 };
    },
  });
}

// ROUTE STATS (0353): page views, logged climbs and sends, objectives, the star breakdown and sends
// by month, as counts only. Private logs count here with no author, as on Mountain Project. It
// reads route_ratings, climb_logs and objectives through an RPC, which check:write-readers cannot
// see, so "route-stats" is named by hand in routeRatingsReaders, logReaders and objectiveReaders.
export function useRouteStats(routeId) {
  return useQuery({
    queryKey: ["route-stats", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("route_stats", { p_route: routeId });
      if (error) throw error;
      return data || null;
    },
  });
}

// One page view: one visitor, one route, one UTC day (0353). The server takes a signed-in viewer
// from auth.uid(); a signed-out one sends a random key kept on this device. A failure is
// swallowed: a view that did not count must never break the page it was counting.
function viewDeviceKey() {
  try {
    let k = localStorage.getItem("cm-view-key");
    if (!k) { k = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("cm-view-key", k); }
    return k;
  } catch { return null; }
}
export async function recordRouteView(routeId) {
  if (!supabase || !routeId) return;
  try { await supabase.rpc("record_route_view", { p_route: routeId, p_device: viewDeviceKey() }); invalidateKeys([["route-stats", routeId]]); } catch { /* not counted; nothing to show */ }
}

// Every cached reader of route_ratings, refreshed after each write to it (check:write-readers).
// The summary reads it through route_star_summary(), so it is a reader too.
const routeRatingsReaders = [["route-rating-mine"], ["route-star-summary"], ["route-stats"]];
// Rate, re-rate or withdraw. The primary key makes it one vote: a second rating replaces the
// first. A null rating is the UI's tap-your-own-star-again, a delete.
export async function setRouteRating(userId, routeId, stars) {
  if (!supabase) return null;
  if (stars == null) {
    const { error } = await supabase.from("route_ratings").delete()
      .eq("user_id", userId).eq("route_id", routeId);
    if (error) throw error;
    invalidateKeys(routeRatingsReaders);
    return true;
  }
  const { data, error } = await supabase.from("route_ratings")
    .upsert({ user_id: userId, route_id: routeId, stars }, { onConflict: "route_id,user_id" })
    .select().single();
  if (error) throw error;
  invalidateKeys(routeRatingsReaders);
  return data;
}
