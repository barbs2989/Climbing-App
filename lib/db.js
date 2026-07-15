// React Query hooks over the Phase-0 schema (areas + routes).
// These are the fetch-on-demand equivalents of reading MOUNTAINS/ROUTES from the bundle.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

// Immediate children of an area (or the top level when parentId is null).
// GET /areas/:id  ->  select * from areas where parent_id = $1
// `opts.enabled` lets a caller gate the fetch (e.g. the "All areas" tree only
// wants a node's children once it's actually expanded — the DB catalog is
// 47k+ areas, so eagerly fetching every row's children up front doesn't scale).
export function useAreaChildren(parentId, opts) {
  const enabled = !opts || opts.enabled !== false;
  return useQuery({
    queryKey: ["area-children", parentId ?? "__root__"],
    enabled: !!supabase && enabled,
    queryFn: async () => {
      let q = supabase.from("areas").select("*");
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      const { data, error } = await q.order("route_count", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Routes in a leaf area, in cliff order ("by area").
// GET /areas/:id/routes  ->  select * from routes where area_id = $1 order by sort_order, name
// Embeds the parent area's key fields (elevation_ft, prominence_ft, lat/lng…) so the
// route detail page can show peak info without needing a match in the static
// MOUNTAINS seed array — see dbRouteToCamel's `_dbArea` field.
export function useAreaRoutes(areaId) {
  return useQuery({
    queryKey: ["area-routes", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes").select("*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))").eq("area_id", areaId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// A single area's row (name, type, route_count, blurb…).
export function useArea(id) {
  return useQuery({
    queryKey: ["area", id],
    enabled: !!supabase && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
}

// Resolves area names for a set of area ids — backs showing "which crag" a
// route in a multi-area Route Finder result list belongs to. A plain lookup
// (not an RPC) since routes_in_subtree returns setof routes and can't add an
// extra joined column without a return-type change.
export function useAreaNamesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["area-names", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("id,name").in("id", ids);
      if (error) throw error;
      const map = {};
      (data || []).forEach(a => { map[a.id] = a.name; });
      return map;
    },
  });
}

// The states (area_type "state"), i.e. the direct children of the "usa" root —
// the DB-catalog equivalent of the static AreaBrowse "Pick a state" list.
export function useStates() {
  return useQuery({
    queryKey: ["area-children", "usa"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("parent_id", "usa").order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Breadcrumb ancestors (root-first, exclusive of "usa") for an area reached by
// something other than drilling — a near-me map pin or a route-finder hit.
// `path` is a materialized ltree whose labels ARE the ancestor ids, so this is
// a plain id lookup, no RPC needed. Plain async (not a hook) since it's used
// from a click handler, not rendered directly.
export async function fetchAreaBreadcrumb(area) {
  const ids = area && area.path ? area.path.split(".").filter(id => id !== "usa" && id !== area.id) : [];
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase.from("areas").select("*").in("id", ids);
  if (error) throw error;
  const byId = Object.fromEntries(data.map(a => [a.id, a]));
  return ids.map(id => byId[id]).filter(Boolean);
}

// Paged, filtered route search anywhere under an area's subtree (routes_in_subtree,
// migration 0015; grade/stars/pitches/length/sort added in 0018) — backs
// "Route finder" and "View all N routes".
export function useSubtreeRoutes(areaId, { q, disc, minGrade, maxGrade, minStars, minPitches, minLengthM, maxLengthM, sortBy, page = 0, pageSize = 40 } = {}) {
  return useQuery({
    queryKey: ["subtree-routes", areaId, q || "", disc || "", minGrade ?? "", maxGrade ?? "", minStars ?? "", minPitches ?? "", minLengthM ?? "", maxLengthM ?? "", sortBy || "", page, pageSize],
    enabled: !!supabase && !!areaId,
    retry: false, // re-fires on every keystroke — fail fast instead of a slow, flickering retry storm
    queryFn: async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree", { root_id: areaId, q: q || null, disc: disc || null, min_grade: minGrade ?? null, max_grade: maxGrade ?? null, min_stars: minStars ?? null, min_pitches: minPitches ?? null, min_length_m: minLengthM ?? null, max_length_m: maxLengthM ?? null, sort_by: sortBy || "name", lim: pageSize, off: page * pageSize });
      if (error) throw error;
      return data;
    },
  });
}

export function useSubtreeRouteCount(areaId, { q, disc, minGrade, maxGrade, minStars, minPitches, minLengthM, maxLengthM } = {}) {
  return useQuery({
    queryKey: ["subtree-route-count", areaId, q || "", disc || "", minGrade ?? "", maxGrade ?? "", minStars ?? "", minPitches ?? "", minLengthM ?? "", maxLengthM ?? ""],
    enabled: !!supabase && !!areaId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("routes_in_subtree_count", { root_id: areaId, q: q || null, disc: disc || null, min_grade: minGrade ?? null, max_grade: maxGrade ?? null, min_stars: minStars ?? null, min_pitches: minPitches ?? null, min_length_m: minLengthM ?? null, max_length_m: maxLengthM ?? null });
      if (error) throw error;
      return data;
    },
  });
}

// Areas (any depth) matching a name under a subtree — backs the "All areas" tree
// modal's filter box (areas_in_subtree, migration 0015), the DB-catalog
// equivalent of the static AreaTree's flat client-side name search.
export function useAreaSearch(rootId, q) {
  return useQuery({
    queryKey: ["area-search", rootId, q || ""],
    enabled: !!supabase && !!rootId && !!(q || "").trim(),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("areas_in_subtree", { root_id: rootId, q, lim: 40 });
      if (error) throw error;
      return data;
    },
  });
}

// Peaks/crags within the CURRENT map viewport (plain BETWEEN — the areas table
// is ~47k rows, no PostGIS needed) — backs the "Near me" map. Takes a live
// bounds box (not a fixed center+radius) so panning/zooming the map re-fetches,
// same as the static OverviewMap's moveend/zoomend-driven re-render — a fixed
// one-shot box around the initial center would silently stop showing areas as
// soon as you moved off it. Ordered by route_count desc so a capped, zoomed-out
// view still surfaces the areas most worth seeing; `total` lets the UI say so.
export function useNearbyAreas(bounds) {
  return useQuery({
    queryKey: ["nearby-areas", bounds && [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].map(n => n.toFixed(2)).join(",")],
    enabled: !!supabase && !!bounds,
    queryFn: async () => {
      const { data, error, count } = await supabase.from("areas").select("*", { count: "exact" })
        .gte("lat", bounds.minLat).lte("lat", bounds.maxLat)
        .gte("lng", bounds.minLng).lte("lng", bounds.maxLng)
        .in("area_type", ["peak", "crag"])
        .order("route_count", { ascending: false })
        .limit(500);
      if (error) throw error;
      return { rows: data, total: count };
    },
  });
}

// Wishlisted routes that fall under an area's subtree — backs the DB-catalog
// "Objectives" screen (AreaView's onObjectives, static-catalog parity). Fetches
// the (small, bounded) wishlist rows by id, each with its area's path embedded,
// then filters client-side by ltree prefix — no RPC needed at this size.
export function useScopedWishlistRoutes(area, routeIds) {
  const ids = routeIds || [];
  return useQuery({
    queryKey: ["scoped-wishlist", area && area.id, ids.slice().sort().join(",")],
    enabled: !!supabase && !!area && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("routes").select("*, areas(path)").in("id", ids);
      if (error) throw error;
      return data.filter(r => r.areas && r.areas.path && (r.areas.path === area.path || r.areas.path.startsWith(area.path + ".")));
    },
  });
}

// Unscoped route lookup by id — backs Home/Logbook wishlist views, which (unlike
// ObjectivesPanel) aren't rendered within a single area and so can't filter by path.
export function useRoutesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["routes-by-ids", key],
    enabled: !!supabase && !!(ids || []).length,
    queryFn: async () => {
      const { data, error } = await supabase.from("routes").select("*").in("id", ids);
      if (error) throw error;
      return data;
    },
  });
}

// ── full-catalog fetchers (hydrate the in-memory MOUNTAINS/ROUTES arrays) ──
// Supabase caps a single response at 1000 rows, so we page through with .range()
// (from..from+999) until a short page comes back. Otherwise the ~1,827 routes
// silently truncate to the first 1,000 and ~800 climbs vanish.
async function fetchAllPaged(table) {
  if (!supabase) return [];
  const PAGE = 1000;
  let out = [], from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    out = out.concat(data);
    if (data.length < PAGE) break; // short page = last page
    from += PAGE;
  }
  return out;
}

// Every area row (the whole hierarchy tree).
export function fetchAllAreas() { return fetchAllPaged("areas"); }
// Every route row (paged — there are ~1,827, well over the 1000-row cap).
export function fetchAllRoutes() { return fetchAllPaged("routes"); }

// ── contributions (Phase 1 persistence) ───────────────────────────────────
// Every community add/fix/report/rating/photo lands here as an append-only row.

// All contributions for a route, oldest first (consensus is computed client-side).
export function useRouteContributions(routeId) {
  return useQuery({
    queryKey: ["contributions", routeId],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions").select("*").eq("route_id", routeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Persist one contribution. Returns the saved row, or null if the DB is off.
// c = { route_id?, area_id?, kind, field?, value, contributor? }
export async function submitContribution(c) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("contributions").insert(c).select().single();
  if (error) throw error;
  return data;
}

// Top contributors rolled up through an area's subtree (live-catalog leaderboard).
// Returns [{ contributor, n }] via the area_top_contributors RPC (migration 0005).
// `contributor` is the contributor's auth uid — pair with useProfilesByIds to display names.
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

// One user's own contribution ledger, newest first — powers "Your contributions".
export function useMyContributions(userId, lim = 50) {
  return useQuery({
    queryKey: ["my-contributions", userId, lim],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions").select("*, routes(name, area_id)")
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
export function useProfilesByIds(ids) {
  const key = (ids || []).slice().sort().join(",");
  return useQuery({
    queryKey: ["profiles-by-ids", key],
    enabled: !!supabase && !!key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("id, name, avatar").in("id", ids);
      if (error) throw error;
      return data;
    },
  });
}

// Coerce a DB value into the array shape the app's consumers assume.
// rack/gear/features/hazards/objHaz are read with .filter/.some/.map all over the
// app; if a row stored one as a string (or null), those calls would throw. Normalize
// here at the boundary: arrays pass through, strings split on commas, blanks -> [].
function toArr(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return String(v).split(/,\s*/).filter(Boolean);
}

// Waypoint `type`/`elev`/`note` field names and casing vary across research
// batches (different agents wrote `elevFt`/`elev_ft` vs `elev`, `notes` vs
// `note`, lowercase/aliased types like "trailhead"/"camp"/"pass"). RouteDetail's
// waypoint list, map, and "Directions to trailhead" button all key off the
// app's native seed-data shape (Title-case type, `elev`), so normalize here at
// the DB boundary rather than special-casing every consumer.
const WAYPOINT_TYPE_ALIASES = {
  trailhead: "Trailhead", start: "Trailhead",
  camp: "Campsite", campsite: "Campsite",
  water: "Water",
  junction: "Junction", pass: "Junction", notch: "Junction", col: "Junction", landmark: "Junction", ridge: "Junction", viewpoint: "Junction",
  hazard: "Hazard", glacier: "Hazard", crevasse: "Hazard",
  summit: "Summit",
  topout: "Topout",
  bailout: "Bailout", bail: "Bailout",
};
function normalizeWaypointType(t) {
  if (!t) return t;
  return WAYPOINT_TYPE_ALIASES[t.toLowerCase()] || (t[0].toUpperCase() + t.slice(1));
}
function normalizeWaypoints(wps) {
  if (typeof wps === "string") {
    try { wps = JSON.parse(wps); } catch { return null; }
  }
  if (!Array.isArray(wps)) return null;
  return wps.map(w => ({
    ...w,
    type: normalizeWaypointType(w.type),
    elev: w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft),
    note: w.note != null ? w.note : w.notes,
  }));
}

// ── guides (Phase 1 persistence — directory/lead-gen, no payment) ────────
// Every guide-hire write here binds to auth.uid() server-side (never a client-
// supplied id), same convention submitContribution/0009 established.

// Display labels for the two guide-domain vocabularies — shared across
// DbGuideApply/DbGuides/DbGuideDashboard so the taxonomy is spelled out once.
export const CERT_TRACK_LABELS = {
  SPI: "Single Pitch Instructor (SPI)",
  MPI: "Multi-Pitch Instructor (MPI)",
  RockGuide: "AMGA Rock Guide",
  AlpineGuide: "AMGA Alpine Guide",
  SkiGuide: "AMGA Ski Guide",
  IFMGA: "IFMGA / Mountain Guide",
};
export const DISCIPLINE_LABELS = {
  single_pitch: "Single-pitch",
  multi_pitch_instructing: "Multi-pitch (instructing)",
  multi_pitch_guiding: "Multi-pitch guiding",
  alpine: "Alpine",
  glacier: "Glacier",
  mountaineering: "Mountaineering",
  ski_touring: "Ski touring",
  ski_mountaineering: "Ski mountaineering",
};

// Static SPI/MPI/RockGuide/AlpineGuide/SkiGuide/IFMGA -> discipline lookup —
// backs the cert-track picker in GuideApply and the discipline legend in Guides.
export function useCertTrackDisciplines() {
  return useQuery({
    queryKey: ["cert-track-disciplines"],
    enabled: !!supabase,
    staleTime: Infinity, // static reference table, never changes at runtime
    queryFn: async () => {
      const { data, error } = await supabase.from("cert_track_disciplines").select("*");
      if (error) throw error;
      return data;
    },
  });
}

// Active (status='active') guide listings for the browse screen. Embeds
// guide_credentials so the list view can compute isGuideVerified() per card
// without an N+1 query per guide.
export function useGuides() {
  return useQuery({
    queryKey: ["guides"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_profiles").select("*, profiles(name, avatar), reviews(rating), guide_credentials(kind, status, verified_expires_at)")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });
}

// One guide's own profile row, regardless of status (draft/submitted/rejected too) —
// backs GuideApply (resume an in-progress application) and GuideDashboard.
export function useGuideProfile(guideId) {
  return useQuery({
    queryKey: ["guide-profile", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_profiles").select("*, profiles(name, avatar)").eq("id", guideId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGuideCredentials(guideId) {
  return useQuery({
    queryKey: ["guide-credentials", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_credentials").select("*").eq("guide_id", guideId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

// Inquiries a guide has received, newest first — backs GuideDashboard's inbox.
export function useGuideInquiries(guideId) {
  return useQuery({
    queryKey: ["guide-inquiries", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries").select("*, profiles(name, avatar)").eq("guide_id", guideId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// A climber's own inquiries with one guide — gates the review form (requirement:
// only a climber with a real inquiry can review) and lets the UI show "pending review".
export function useMyInquiriesWithGuide(climberId, guideId) {
  return useQuery({
    queryKey: ["my-inquiries", climberId, guideId],
    enabled: !!supabase && !!climberId && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries").select("*, reviews(id)").eq("climber_id", climberId).eq("guide_id", guideId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useGuideReviews(guideId) {
  return useQuery({
    queryKey: ["guide-reviews", guideId],
    enabled: !!supabase && !!guideId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews").select("*, profiles(name, avatar)").eq("guide_id", guideId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Upsert (create-or-continue) a guide's own application/listing row.
export async function submitGuideApplication(fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_profiles").upsert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function updateGuideProfile(guideId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_profiles").update(fields).eq("id", guideId).select().single();
  if (error) throw error;
  return data;
}

export async function addGuideCredential(c) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_credentials").insert(c).select().single();
  if (error) throw error;
  return data;
}

// Resubmit a rejected/lapsed credential for re-review — same row, back to 'pending'.
export async function resubmitGuideCredential(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_credentials").update({ status: "pending", rejected_reason: null }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Uploads a sensitive document (insurance COI / cert card) to the private
// guide-documents bucket and records it. storage_path is never a public URL —
// use getSignedDocUrl to view it.
export async function uploadGuideDocument(guideId, docType, file, credentialId) {
  if (!supabase) return null;
  const path = `${guideId}/${docType}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("guide-documents").upload(path, file);
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("guide_documents").insert({ guide_id: guideId, doc_type: docType, storage_path: path, credential_id: credentialId || null })
    .select().single();
  if (error) throw error;
  return data;
}

export async function getSignedDocUrl(storagePath, expiresInSec = 300) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from("guide-documents").createSignedUrl(storagePath, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

// Admin-only in practice (storage.objects delete is is_admin-gated by RLS) —
// used when discarding a rejected applicant's or a lapsed guide's documents.
export async function deleteGuideDocument(docId, storagePath) {
  if (!supabase) return null;
  await supabase.storage.from("guide-documents").remove([storagePath]);
  const { error } = await supabase.from("guide_documents").update({ deleted_at: new Date().toISOString() }).eq("id", docId);
  if (error) throw error;
}

// Persists a real inquiry (today's UI collects objective/dates/party/message and
// discards them on submit — this is what actually stores them, plus the
// climber_disclaimer_accepted_at timestamp and includes_minor flag).
export async function submitInquiry(fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("inquiries").insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function updateInquiryStatus(id, status) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("inquiries").update({ status, guide_responded_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Only succeeds (per RLS) if the climber has a real inquiry with this guide.
export async function submitReview(fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("reviews").insert(fields).select().single();
  if (error) throw error;
  return data;
}

export async function postGuideReply(reviewId, text) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("reviews").update({ guide_reply: text, guide_reply_at: new Date().toISOString() }).eq("id", reviewId).select().single();
  if (error) throw error;
  return data;
}

// Flips any credential that's quietly crossed verified_expires_at to 'lapsed' and
// (via the sync_active_disciplines trigger) recomputes active_disciplines. No cron
// exists (static hosting) — call this opportunistically whenever a guide profile
// loads, so the badge is never more than one page-load stale.
export async function reconcileGuideVerification(guideId) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("reconcile_guide_verification", { p_guide_id: guideId });
  if (error) throw error;
}

// True only for a currently-verified-and-unexpired primary-track credential — the
// single legally-meaningful "Verified" signal. Having any other verified credential
// (e.g. a lone WFR) must NOT satisfy this (a guide's cert scope is gated by track).
export function isGuideVerified(credentials) {
  const now = Date.now();
  return (credentials || []).some(c =>
    c.kind === "primary_track" && c.status === "verified" &&
    (!c.verified_expires_at || new Date(c.verified_expires_at).getTime() > now));
}

// Map a DB guide_profiles row (snake_case, with embedded profiles/reviews) to the
// shape Guides/GuideDashboard render — mirrors dbRouteToCamel's role for routes.
export function dbGuideToCamel(g) {
  if (!g) return g;
  const revs = Array.isArray(g.reviews) ? g.reviews : [];
  const ratingAvg = revs.length ? revs.reduce((s, r) => s + (r.rating || 0), 0) / revs.length : null;
  return {
    id: g.id,
    name: (g.profiles && g.profiles.name) || "Guide",
    avatar: g.profiles && g.profiles.avatar,
    title: g.title, base: g.base_location, specialty: g.specialty, bio: g.bio,
    cancellationPolicy: g.cancellation_policy,
    lat: g.lat, lng: g.lng, rate: g.day_rate, groupMax: g.group_max, responseHrs: g.response_hrs,
    regions: g.regions || [], languages: g.languages || [],
    disciplines: g.active_disciplines || [],
    insuranceCarrierName: g.insurance_carrier_name,
    insuranceAttested: g.insurance_attested, permitAttested: g.permit_attested,
    rating: ratingAvg, reviewCount: revs.length,
    status: g.status,
  };
}

// Map a DB route row (snake_case) to the app's camelCase shape so RouteDetail —
// which reads route.gainFt/objHaz/elevPts/etc. — renders DB routes fully, not blank.
export function dbRouteToCamel(r) {
  if (!r) return r;
  return {
    ...r,
    mountainId: r.area_id,
    gradeSystem: r.grade_system,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainFt: r.gain_ft, lossFt: r.loss_ft, gainM: r.gain_ft!=null?Math.round(r.gain_ft/3.28084):null, lossM: r.loss_ft!=null?Math.round(r.loss_ft/3.28084):null, distKm: r.dist_km, maxAngle: r.max_angle,
    objHaz: toArr(r.obj_haz), elevPts: r.elev_pts, gpxPts: r.gpx, waypoints: normalizeWaypoints(r.waypoints),
    rack: toArr(r.rack), gear: toArr(r.gear), features: toArr(r.features), hazards: toArr(r.hazards),
    alpineGrade: r.alpine_grade, rockGrade: r.rock_grade, iceGrade: r.ice_grade,highPointFt:r.high_point_ft,aidGrade:r.aid_grade,descentText:r.descent_text,pitchDetail:r.pitch_detail,lists:r.lists,permits:r.permit,
    timing:r.timing, detailedRack:r.detailed_rack, whatToBring:toArr(r.what_to_bring), proTips:toArr(r.pro_tips), watchOut:toArr(r.watch_out), proNeeds:r.pro_needs, bestSeason:r.best_season, beta:Array.isArray(r.beta)?r.beta:(r.beta?[r.beta]:[]),
    slingRack: Array.isArray(r.sling_rack) ? r.sling_rack : null, alpineDraws: r.alpine_draws, ropeType: r.rope_type, ropeLengthM: r.rope_length_m, ropeNote: r.rope_note, ascender: r.ascender, corrections: r.corrections,
    // Enrichment panel fields (migration 0014) — no static-array equivalent, so no gap-fill needed.
    crowds: r.crowds, partnerRequirements: r.partner_requirements, seasonalGuidance: r.seasonal_guidance, seasonalHazards: r.seasonal_hazards, dataQuality: r.data_quality,
    // The embedded parent area (see useAreaRoutes) — shaped like a MOUNTAINS entry so
    // RouteDetail's `MOUNTAINS.find(...)||route._dbArea||{}` fallback works without the
    // area needing a match in the static seed array.
    _dbArea: r.areas ? { id: r.area_id, name: r.areas.name, areaType: r.areas.area_type, region: r.areas.region, parentName: r.areas.parent && r.areas.parent.name, lat: r.areas.lat, lng: r.areas.lng, elevation: r.areas.elevation_ft, prominence: r.areas.prominence_ft, avyZone: r.areas.avy_zone, blurb: r.areas.blurb } : null,
  };
}

// ── Topos (route-overlay photos) — see docs/BACKEND.md §9 and migration 0026. ──
// A topo is per-wall (area), not per-route: one photo can carry lines for several
// routes. Applies to every discipline, not just pitched rock.

// All topo photos for a wall/crag/face, each with its topo_lines rows. The caller
// picks, per route, the most-recent line as canonical and older ones as alternates
// (no trust_score on profiles yet, so this can't be trust-weighted like the
// client-side conditions consensus — see the migration note).
export function useAreaTopos(areaId) {
  return useQuery({
    queryKey: ["area-topos", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topos").select("*, topo_lines(*)").eq("area_id", areaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Public URL for a topo-photos storage path (the bucket is public — no signed URL needed).
export function topoPhotoUrl(storagePath) {
  if (!supabase || !storagePath) return null;
  return supabase.storage.from("topo-photos").getPublicUrl(storagePath).data.publicUrl;
}

// Uploads a new wall photo and records it. Path is {uid}/{uuid}-{filename} so
// storage RLS (migration 0026) can gate writes by the first path segment.
export async function uploadTopoPhoto(areaId, file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a topo photo.");
  const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file);
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("topos").insert({ area_id: areaId, storage_path: path }).select().single();
  if (error) throw error;
  return data;
}

// Draws this route's line + markers on a topo photo. created_by defaults to
// auth.uid() at the DB level, so RLS enforces ownership without threading the
// caller's own id through every component.
export async function submitTopoLine(topoId, routeId, points, pins, label) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("topo_lines").insert({ topo_id: topoId, route_id: routeId, points, pins: pins || [], label: label || null })
    .select().single();
  if (error) throw error;
  return data;
}

// Re-saves an existing line's points/pins — RLS restricts this to the line's own creator.
export async function updateTopoLine(lineId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("topo_lines").update(fields).eq("id", lineId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTopoLine(lineId) {
  if (!supabase) return null;
  const { error } = await supabase.from("topo_lines").delete().eq("id", lineId);
  if (error) throw error;
}

// Removes a whole photo (and, via cascade, every route's line drawn on it) —
// RLS restricts this to the photo's own uploader.
export async function deleteTopoPhoto(topoId, storagePath) {
  if (!supabase) return null;
  if (storagePath) await supabase.storage.from("topo-photos").remove([storagePath]);
  const { error } = await supabase.from("topos").delete().eq("id", topoId);
  if (error) throw error;
}
