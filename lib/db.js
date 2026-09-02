// React Query hooks over the Phase-0 schema (areas + routes).
// These are the fetch-on-demand equivalents of reading MOUNTAINS/ROUTES from the bundle.
import { useEffect, useRef } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { offlineAreaChildren, offlineArea, offlineAreaRoutes, offlineStates } from "./offline";
import { tidyWaypoints } from "./waypoints";

// Network-first with an IndexedDB fallback for downloaded states (lib/offline.js).
// Only substitutes offline data when the network genuinely failed AND the local
// store has something for this query — an empty offline result rethrows the
// original error so undownloaded areas still show the normal error state.
async function orOffline(networkFn, offlineFn) {
  try { return await networkFn(); }
  catch (err) {
    try {
      const local = await offlineFn();
      if (local && (Array.isArray(local) ? local.length : true)) return local;
    } catch (e) { /* fall through to the network error */ }
    throw err;
  }
}

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
    queryFn: () => orOffline(async () => {
      let q = supabase.from("areas").select("*");
      q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
      const { data, error } = await q.order("route_count", { ascending: false }).order("name");
      if (error) throw error;
      return data;
    }, () => offlineAreaChildren(parentId)),
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
    queryFn: () => orOffline(async () => {
      const { data, error } = await supabase
        .from("routes").select("*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))").eq("area_id", areaId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return data;
    }, () => offlineAreaRoutes(areaId)),
  });
}

// A single area's row (name, type, route_count, blurb…).
export function useArea(id) {
  return useQuery({
    queryKey: ["area", id],
    enabled: !!supabase && !!id,
    queryFn: () => orOffline(async () => {
      const { data, error } = await supabase.from("areas").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    }, () => offlineArea(id)),
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

// Full-catalog route search by name (no area scope needed) — backs "search for a
// climb" flows outside the area browser (CrewFinder, PartnerSearch), which today
// only fuzzy-match the static ROUTES seed array and can't find a DB-only route.
// Matches the route name OR the name of the area the route is on. Needs no root/scope id,
// unlike useAreaSearch/useSubtreeRoutes.
//
// It was route-name-only until 2026-08-09, and that hid whole peaks. Only ~9% of WA route
// ids are peak-scoped and route names are just the line, so **a peak's name lives only on
// `areas.name`** — Mount Goode's four routes are called Northeast Buttress, Megalodon
// Ridge, Southwest Couloir and Northeast Face. Typing "Goode" matched none of them and the
// peak read as deleted. Every peak named differently from its routes was invisible the
// same way, in all five search boxes this feeds — including Log a climb and the duplicate
// check when adding a route, so "is this already here?" could not see a peak either.
//
// Two queries rather than one `or=(name.ilike…,areas.name.ilike…)`: a single ilike on
// either table is fast, but PostgREST ORs across an embedded table go to a seq scan on
// 205k routes and hit the 3s statement_timeout on the anon role.
//
// The two result sets are RANKED, not concatenated. Taking route-name matches first put
// "Johnny B. Goode", "Dirty No-Gooders" and "More Gooder At Learning" above Mount Goode
// and filled the 8 slots before the peak appeared — a mid-word substring hit on an
// unrelated route must not outrank an exact match on the area the user is clearly naming.
function routeSearchScore(row, needle) {
  const rn = String((row && row.name) || "").toLowerCase();
  const an = String((row && row.areas && row.areas.name) || "").toLowerCase();
  // Climbers type the peak, not the honorific: "Goode" should reach both "Mount Goode"
  // and "Mt. Goode" ahead of a mid-word hit on "Johnny B. Goode".
  const ap = an.replace(/^(mount|mt\.?|the)\s+/, "");
  if (rn === needle) return 100;
  if (an === needle || ap === needle) return 90;
  if (rn.startsWith(needle)) return 80;
  if (an.startsWith(needle) || ap.startsWith(needle)) return 70;
  // A word-boundary hit ("North Ridge" in "Direct North Ridge") beats a mid-word one
  // ("Goode" in "No-Gooders").
  if (new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(rn)) return 50;
  if (new RegExp("\\b" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(an)) return 45;
  if (rn.includes(needle)) return 30;
  return 20;
}

// WHICH "CHIMNEY ROCK" DID THEY MEAN? Peak names repeat across the continent — fourteen
// areas are called Chimney Rock, thirteen Eagle Rock, four Cathedral Rock — and eight result
// slots cannot hold them all. Ranking by size answers "which is biggest", which is a
// different question and buries every small summit: Washington's Chimney Rock is 9th of 14
// by route_count, so no climber in Washington could reach it by name.
//
// The only honest tie-break is evidence about the climber, and the app has one piece: the
// home area on their profile. A climber in Washington typing "chimney rock" means the Alpine
// Lakes one; a climber in Idaho does not, and showing them Washington's would be the same
// mistake pointed the other way. So this decides ORDER AMONG NAMESAKES ONLY — it never
// changes a score, never promotes a worse text match, and returns null for a signed-out or
// location-less climber, in which case search behaves exactly as it did before.
//
// Deliberately NOT plumbed through props: the five boxes fed by useRouteSearch live in five
// components (LogCatch, GiveVouch, PartnerSearch, AddRoute, CrewFinder) and none of them
// holds the profile. Threading it through all five to reach one ranking decision is a lot of
// wiring to go wrong, and a prop that five call sites must remember to pass is a prop four of
// them will eventually forget.
const REGION_ABBR = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia", AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon" };
// Matched against the states/provinces the DATABASE actually holds rather than a hardcoded
// path, so a catalog that gains a country does not need this edited — and a home area naming
// somewhere with no climbs simply resolves to null instead of to a wrong prefix.
export function homeStatePath(location, states) {
  const loc = String(location || "").trim();
  if (!loc || !Array.isArray(states) || !states.length) return null;
  const byName = (nm) => states.find((s) => String(s.name || "").toLowerCase() === String(nm || "").toLowerCase());
  // "Bellingham, WA" — the abbreviation is the last comma-separated part. Checked against the
  // ORIGINAL case: a lowercase "wa" in prose is not a state, and "Washington, DC" must not
  // resolve to Washington state, which is why the abbreviation is tried before the name.
  const tail = loc.split(",").pop().trim();
  const abbr = /^[A-Z]{2}$/.test(tail) ? REGION_ABBR[tail] : null;
  let hit = abbr ? byName(abbr) : null;
  // "Seattle, Washington" or plain "Washington" — longest name first so "West Virginia" is not
  // shadowed by "Virginia".
  if (!hit) {
    const cands = states.filter((s) => s.name && loc.toLowerCase().includes(String(s.name).toLowerCase()));
    cands.sort((a, b) => String(b.name).length - String(a.name).length);
    hit = cands[0] || null;
  }
  return (hit && hit.path) || null;
}
function useMyHomeStatePath() {
  const { data: uid } = useQuery({
    queryKey: ["my-uid"], enabled: !!supabase, staleTime: Infinity,
    // Binds the error like the other 58 supabase awaits inside a queryFn: react-query's isError is
    // the only channel a query has to report failure, so discarding it here made a failed lookup
    // indistinguishable from a signed-out visitor. Signed out still returns null without throwing.
    queryFn: async () => { const { data, error } = await supabase.auth.getUser(); if (error) throw error; return (data && data.user && data.user.id) || null; },
  });
  const { data: loc } = useQuery({
    queryKey: ["my-home-area", uid], enabled: !!supabase && !!uid, staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("location").eq("id", uid).maybeSingle();
      if (error) throw error;
      return (data && data.location) || null;
    },
  });
  /* ONE IMPLEMENTATION OF THIS QUERY, NOT TWO. This used to declare its OWN queryFn on useStates'
     key, ["area-children","roots"], with a comment saying it shared that cache entry "rather than
     adding a fetch" — true about the CACHE and false about the BODY. React Query keeps one Query
     per key and runs the body belonging to whichever observer triggers the fetch, so the two were
     interchangeable at runtime and they disagreed on both things that matter:

       useStates              binds and throws both errors, and wraps in orOffline(…, offlineStates)
       this copy              discarded both errors, returned [], and had no offline fallback

     If this body was the one that fetched, a failed read produced [] with isError FALSE — so
     `statesUnavailable` stayed false and Manage areas told a climber 46 of 50 states have no
     catalog yet. That is precisely the defect check:outage-copy exists for, re-armed through a
     second implementation of one query rather than through the copy it already guards. Being
     offline took the same path, silently bypassing the downloaded catalog.

     Measured before collapsing it: of 12 constant queryKeys in this file, this was the only one
     carrying two bodies (scripts/oneoff/measure-shared-query-keys.mjs). A class of one, so no
     detector — but check:read-failures now asserts the invariant, since a body that cannot throw
     IS a failed read a caller reads as an empty one.

     `enabled` was `!!loc` here and is unconditional in useStates. App mounts useStates already, so
     this adds no fetch; it only stops a second body existing. */
  const { data: states } = useStates();
  return homeStatePath(loc, states);
}

export function useRouteSearch(q, lim = 8) {
  const qq = (q || "").trim();
  const homeState = useMyHomeStatePath();
  return useQuery({
    queryKey: ["route-search", qq, lim, homeState || ""],
    enabled: !!supabase && !!qq,
    queryFn: async () => {
      const SEL = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))";
      const needle = qq.toLowerCase();
      // Both legs run together — the area leg is not a fallback, it is half the answer.
      //
      // THE PREFIX LEG EXISTS BECAUSE THE SUBSTRING LEG'S CAP DECIDES THE ANSWER.
      // `%q%` with limit(16) and no order hands the scorer 16 rows the planner happened to
      // reach, and routeSearchScore then ranks only those. Measured on the live catalog:
      //   "north ridge"  95 matches -> 16 scored,  79 never seen
      //   "north face"  280 matches -> 16 scored, 264 never seen
      //   "mount"       276 matches -> 16 scored, 260 never seen   <- 0 of the 16 were exact
      //   "west ridge"  166 matches -> 16 scored, 150 never seen
      // "mount" came back as Husky Mountaineer / Fire on the Mountain / Tucson Mountain Chaos —
      // mid-word hits scoring 30 while 260 real matches were discarded before scoring. The cap
      // binds on every common route name, which is exactly where the catalog is densest.
      // This is the same defect #943 fixed in the AREA search one layer up, and the same class
      // as useNearbyAreas: a capped query whose ordering is not the caller's selection key.
      //
      // The fix is to put the rows that CAN win in front of the scorer rather than to raise the
      // cap. routeSearchScore's top tiers are an exact route name (100) and a prefix match (80),
      // and `ilike(q%)` returns exactly those — so the prefix leg guarantees the scorer sees the
      // best candidates, and the substring leg only fills the remaining slots.
      //
      // DELIBERATELY NOT `.order("name")` ON THE SUBSTRING LEG. Making a capped substring query
      // deterministic that way would convert an arbitrary cut into a systematically ALPHABETICAL
      // one — which is precisely the bug #943 removed ("mount" returning A–G and stopping at
      // Garfield Mountain). Arbitrary-but-unbiased is better than ordered-by-the-wrong-key here.
      // THE SUBSTRING AREA LEG'S CAP DECIDES WHETHER A PEAK IS FETCHED AT ALL, and its ordering
      // key is `route_count` — how big an area is, not how well it matches what was typed. So a
      // peak sharing a common word with five larger crags is discarded BEFORE routeSearchScore
      // sees it, and no amount of ranking can re-add a row the pre-query already dropped.
      // Measured over all 403 WA peaks that hold routes directly, by replaying this whole
      // function and asking whether any row in the final top N belongs to the peak whose name
      // was typed: 16 could not be reached by typing their own name, and for 5 of them the peak
      // was never fetched — Cathedral Rock ranked #7 of 9 substring matches, Baldy #14 of 15,
      // Half Moon #10 of 10, Sundial #11 of 12, Eagle Peak #9 of 11.
      //
      // The exact leg fixes that the same way the route PREFIX leg above already does: put the
      // rows that can win in front of the scorer rather than raise a cap. An area whose name IS
      // the query is the strongest evidence in this function about what the climber meant, so it
      // is fetched on its own terms and cannot be crowded out by size. `ilike` with no wildcards
      // is an exact, case-insensitive match.
      //
      // It gets its OWN routes query below rather than merging its ids into `matchedIds`, for the
      // reason recorded at that call site: a bounded query whose POOL you enlarged is a different
      // query even though the limit did not change.
      const [byPrefix, byName, areaHit, areaExact] = await Promise.all([
        supabase.from("routes").select(SEL).ilike("name", `${qq}%`).limit(lim * 2),
        supabase.from("routes").select(SEL).ilike("name", `%${qq}%`).limit(lim * 2),
        supabase.from("areas").select("id,name,path").ilike("name", `%${qq}%`).order("route_count", { ascending: false }).limit(5),
        supabase.from("areas").select("id,name,path").ilike("name", qq).order("route_count", { ascending: false }).limit(25),
      ]);
      if (areaExact.error) throw areaExact.error;
      if (byPrefix.error) throw byPrefix.error;
      if (byName.error) throw byName.error;
      if (areaHit.error) throw areaHit.error;

      // MATCHED AREAS ARE USUALLY CONTAINERS, WHICH HOLD NO ROUTES OF THEIR OWN.
      // `trg_areas_leaf_xor` means an area holds child areas OR direct routes, never both, and
      // `route_count` is a SUBTREE aggregate — so ordering the area query by it preferentially
      // selects containers, and the routes query below reads DIRECT children only. The bigger
      // and better known the destination, the more certainly it is a container and the more
      // certainly it contributed nothing. Measured before this expansion:
      //   "washington pass"  1 area matched, 0 direct routes -> WHOLE SEARCH returned nothing
      //   "leavenworth"      4 areas matched, all 0 direct   -> only a route literally so named
      //   "index"            3 of 5 dead; the box returned Windex / Ape Index while Index (589)
      //                      was unreachable
      //   "smith rock"       3 of 5 dead        "stuart"  2 of 4 dead
      // That is worse than an arbitrary cut: the ordering key is ANTI-CORRELATED with what the
      // caller needs. So expand each matched area to its subtree and let the routes query find
      // the leaves. Containers in the id list are harmless — they simply match no rows.
      //
      // Deliberately NOT `routes_in_subtree`, which would be the obvious tool: it returns
      // `setof routes` and cannot carry the embedded `areas(...)` join (see useAreaNamesByIds),
      // and that join is what routeSearchScore's area tiers (90/70/45) and the result row both
      // read. Losing it to gain the subtree would trade one defect for another.
      const matched = areaHit.data || [];
      const matchedIds = matched.map((a) => a.id);
      // Only the top few are expanded: this costs one query each, and a fifth-ranked area
      // contributing routes is not worth another round trip on every keystroke.
      //
      // NOTE FOR WHOEVER RAISES OR LOWERS THE 25. That limit is ordered by `route_count desc`,
      // which is the right key for "which sub-areas are worth showing" — but it is a SUBTREE
      // aggregate, so a container child outranks a populated leaf and can eat a slot, which is
      // this PR's own defect in miniature. Measured today it does NOT bind: leavenworth expands
      // to 33 ids, smith rock 46, index 54, all well under 3 x 25. So it is theoretical, and
      // recorded rather than fixed. If you tighten it, re-measure those three first.
      const kids = await Promise.all(
        matched.slice(0, 3).filter((a) => a.path).map((a) =>
          supabase.from("areas").select("id").filter("path", "cd", a.path).gt("route_count", 0)
            .order("route_count", { ascending: false }).limit(25)
        )
      );
      const descIds = [];
      for (const k of kids) {
        if (k.error) throw k.error;
        for (const a of k.data || []) if (!matchedIds.includes(a.id) && !descIds.includes(a.id)) descIds.push(a.id);
      }
      // TWO CAPPED QUERIES, NOT ONE OVER A WIDER POOL — expansion must only ADD.
      // Merging the ids into a single `in(...)` kept the same limit but enlarged the pool it
      // draws from, and that cap is unordered, so descendants crowded out the direct hits.
      // routeSearchScore reads the LEAF area name, and a descendant of "Smith Rock" is called
      // "(1) Northeast Face" — it scores 20, not 90. Measured on the final top 8, counting rows
      // scoring >=45:  smith rock 8 -> 3,  stuart 8 -> 2,  liberty bell 8 -> 6. The two total
      // failures above still got fixed, so it read as a win while silently degrading the queries
      // that already worked. Splitting the query restores all three to 8 and keeps the fix.
      //
      // A bounded query whose POOL you enlarged is a different query, even though the limit did
      // not change — the same rule that made the original defect, pointed at my own fix.
      // NAMESAKES ARE ORDERED BY WHERE THE CLIMBER IS, THEN BY SIZE — and only then cut.
      // Fetching 25 and taking 5 after this sort is the point: cutting first, by route_count,
      // is what put Washington's Chimney Rock 9th of 14 and out of reach. Size is the
      // tie-break for climbers we know nothing about, which is the old behaviour exactly.
      const home = homeState ? String(homeState) : "";
      const atHome = (a) => !!home && (a.path === home || String(a.path || "").startsWith(home + "."));
      const unclaimed = (a) => !matchedIds.includes(a.id);
      // THE HOME-STATE NAMESAKE GETS ITS OWN QUERY, and it must. Pooling the namesakes into
      // one `in(...)` with a shared cap loses the small one entirely: measured on the live
      // catalog, a limit-16 query over the four areas named "Cathedral Rock" returned 16 rows
      // and NONE from Washington's, because Nevada's holds 30. Same for Pinnacle Peak and
      // Eagle Rock. Ordering the namesakes cannot help when the rows never come back — this is
      // the exact defect the note below records for byMatched/byDesc, committed again one leg
      // over. A bounded query whose POOL you enlarged is a different query.
      // NOT filtered by `unclaimed`, deliberately. Being in matchedIds is no protection: that
      // leg is pooled and capped too, so a home namesake the SUBSTRING leg happened to claim is
      // lost the same way — Washington's Pinnacle Peak (3 routes) against Arizona's (104 and 44)
      // never came back. Duplicate rows are removed by id downstream, so asking twice is free.
      const homeExactIds = (areaExact.data || []).filter(atHome).map((a) => a.id).slice(0, 3);
      const exactIds = (areaExact.data || []).filter((a) => !atHome(a)).filter(unclaimed).map((a) => a.id).slice(0, 5);
      const [byMatched, byDesc, byExact, byHomeExact] = await Promise.all([
        matchedIds.length ? supabase.from("routes").select(SEL).in("area_id", matchedIds).limit(lim * 2) : { data: [] },
        descIds.length ? supabase.from("routes").select(SEL).in("area_id", descIds).limit(lim * 2) : { data: [] },
        exactIds.length ? supabase.from("routes").select(SEL).in("area_id", exactIds).limit(lim * 2) : { data: [] },
        homeExactIds.length ? supabase.from("routes").select(SEL).in("area_id", homeExactIds).limit(lim * 2) : { data: [] },
      ]);
      if (byMatched.error) throw byMatched.error;
      if (byDesc.error) throw byDesc.error;
      if (byExact.error) throw byExact.error;
      if (byHomeExact.error) throw byHomeExact.error;
      const byArea = { data: [...(byHomeExact.data || []), ...(byExact.data || []), ...(byMatched.data || []), ...(byDesc.data || [])] };
      // Prefix rows first, so a duplicate id is kept from the leg that guarantees a high tier.
      const seen = new Set(), merged = [];
      for (const r of [...(byPrefix.data || []), ...(byName.data || []), ...(byArea.data || [])]) {
        if (seen.has(r.id)) continue;
        seen.add(r.id); merged.push(r);
      }
      merged.sort((a, b) => routeSearchScore(b, needle) - routeSearchScore(a, needle));
      // A PLACE NAMED EXACTLY WHAT WAS TYPED KEEPS A FEW SLOTS.
      // routeSearchScore gives 100 to an exact ROUTE-name match and 90 to an exact AREA-name
      // one, so a peak always loses to a route that happens to share its name — and there is
      // usually more than one. Typing "the tooth" returned eight routes literally named "The
      // Tooth", at eight unrelated crags (Rimview Cliffs, Labyrinth Main, Whale Boulder,
      // Pyramid Area...), while the Snoqualmie summit's seven routes appeared nowhere. Same for
      // "the fin" and "baldy". Measured across all 403 WA peaks holding routes: 9 were fetched
      // correctly and then crowded out on this tier boundary alone.
      //
      // NOT a per-area cap, which is the obvious fix and does nothing here — those eight rows
      // sit in eight DIFFERENT areas, so a limit of N-per-area never binds. The crowding is by
      // repeated route NAME across areas, not by one area dominating.
      //
      // So reserve rather than reorder: the first few rows of an area the climber has named
      // outright are moved to the front, and everything else keeps its existing order behind
      // them. Nothing is dropped that would not have been dropped by `slice(lim)` anyway, and no
      // tier is renumbered — a query that already worked returns the same set.
      //
      // The honorific rule is the scorer's own ("climbers type the peak, not the title"), so the
      // two cannot disagree about what counts as naming a place.
      //
      // ONE ROW PER PLACE BEFORE A SECOND ROW FROM ANY OF THEM. Peak names repeat across
      // states — there are four areas named "Cathedral Rock", three "Pinnacle Peak", fourteen
      // "Chimney Rock" — and reserving three slots without this handed all three to whichever
      // one is biggest. Measured: that recovered 7 peaks and left 9 where the winner was simply
      // a larger namesake, which is the same defect wearing the fix's clothes. Round-robin
      // first, extras after, so a smaller namesake still appears on the page.
      const namedAll = merged.filter((r) => {
        const an = String((r.areas && r.areas.name) || "").toLowerCase();
        return an === needle || an.replace(/^(mount|mt\.?|the)\s+/, "") === needle;
      });
      // Home-state namesakes take their slot FIRST. Without this the round-robin hands slot 1
      // to whichever namesake a route-name leg happened to return, which for "chimney rock" is
      // a route literally called Chimney Rock at a different Chimney Rock — fetched by the
      // prefix leg, so ahead of the exact-area rows in merge order.
      const homeAreaIds = new Set([...(areaExact.data || []), ...matched].filter(atHome).map((a) => a.id));
      const namedHomeFirst = home
        ? namedAll.slice().sort((x, y) => (homeAreaIds.has(y.area_id) ? 1 : 0) - (homeAreaIds.has(x.area_id) ? 1 : 0))
        : namedAll;
      const oncePer = new Set(), firstOfEach = [], extras = [];
      for (const r of namedHomeFirst) {
        if (oncePer.has(r.area_id)) extras.push(r);
        else { oncePer.add(r.area_id); firstOfEach.push(r); }
      }
      const named = [...firstOfEach, ...extras].slice(0, 3);
      const reserved = new Set(named.map((r) => r.id));
      const ranked = [...named, ...merged.filter((r) => !reserved.has(r.id))];
      // SAY WHICH ONE. Every search row prints `{area.name} · {grade}`, so once the home-state
      // ordering does its job the page can show Washington's Cathedral Rock and Nevada's side
      // by side, both reading "Cathedral Rock · 5.6" — the climber has no way to tell which is
      // theirs, and picking the wrong one is silent. Measured on the live catalog: a search
      // for "cathedral rock" returns eight rows and all eight print the same subtitle.
      //
      // Only when a name is genuinely ambiguous IN THIS RESULT SET, so the ordinary case keeps
      // its short label. `region` is already fetched and reads better than a state would
      // ("Alpine Lakes" tells a climber more than "Washington"); `parent` is the fallback, and
      // when neither exists nothing is appended rather than an empty bracket.
      const out = ranked.slice(0, lim);
      const areasByName = new Map();
      for (const r of out) {
        const n = String((r.areas && r.areas.name) || "");
        if (!n) continue;
        if (!areasByName.has(n)) areasByName.set(n, new Set());
        areasByName.get(n).add(r.area_id);
      }
      return out.map((r) => {
        const camel = dbRouteToCamel(r);
        const n = String((r.areas && r.areas.name) || "");
        const ambiguous = n && areasByName.get(n) && areasByName.get(n).size > 1;
        if (!ambiguous || !camel._dbArea) return camel;
        const qualifier = (r.areas && (r.areas.region || (r.areas.parent && r.areas.parent.name))) || "";
        if (!qualifier) return camel;
        return { ...camel, _dbArea: { ...camel._dbArea, name: `${n} (${qualifier})` } };
      });
    },
  });
}

// Full ancestor chain for one area, root-first (e.g. ["USA","Washington","North
// Cascades",...,"Mount Baker"]) — the DB-catalog equivalent of walking MOUNTAINS'
// parentId chain (see areaPathNames in ClimbMatch.jsx). The areas table has no
// depth cap, so this walks parent_id one row at a time rather than joining a
// fixed number of levels; capped at 12 hops as a runaway-hierarchy backstop.
async function fetchAreaPath(id) {
  if (!supabase || !id) return [];
  const path = [];
  let currentId = id, guard = 0;
  while (currentId && guard++ < 12) {
    const { data, error } = await supabase.from("areas").select("id,name,parent_id").eq("id", currentId).maybeSingle();
    if (error) throw error;
    if (!data) break;
    path.unshift({ id: data.id, name: data.name });
    currentId = data.parent_id;
  }
  return path;
}

// Single-area version of useAreaPaths, for a lone breadcrumb (e.g. the route
// detail page's own area header).
export function useAreaPath(id) {
  return useQuery({
    queryKey: ["area-path", id],
    enabled: !!supabase && !!id,
    staleTime: Infinity,
    queryFn: () => fetchAreaPath(id),
  });
}

// Ancestor chains for a set of areas at once (e.g. one per row in a contribution
// feed) — a dynamic list of queries via useQueries rather than useAreaPath in a
// loop, since the number of ids varies by render and hooks can't be called
// conditionally. Returns { [id]: [{id,name}, ...] } for whichever ids have
// resolved so far; still-loading/unknown ids are simply absent from the map.
export function useAreaPaths(ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  const results = useQueries({
    queries: uniqueIds.map(id => ({
      queryKey: ["area-path", id],
      enabled: !!supabase,
      staleTime: Infinity,
      queryFn: () => fetchAreaPath(id),
    })),
  });
  const map = {};
  uniqueIds.forEach((id, i) => { if (results[i] && results[i].data) map[id] = results[i].data; });
  return map;
}

// Every route carrying ANY named-list tag — 64 rows today, one query, and the source for
// every list on the Challenges screen.
//
// The screen used to build its lists out of the climber's own completed logs, so the Fifty
// Classics card could only show routes you had already done: never the fifty as objectives,
// and hidden entirely at zero. Asking the catalog instead is what makes a tick-list a
// tick-list.
//
// Membership is NOT filtered here. The column holds slugs on some rows and whole sentences on
// others ("Washington Bulger List (100 Highest Peaks in Washington)"), so a `lists=ov.{…}`
// query on slugs finds the 50 fifty_classics rows and misses every Bulger peak. lib/lists.js
// resolves both spellings; this fetches the small tagged set and lets it decide.
//
// Needs the partial index from migration 0132 — unindexed, this is a 205k-row scan that 500s
// on the anon role's 3s statement_timeout while succeeding on the service key.
export function useRoutesWithLists() {
  return useQuery({
    queryKey: ["routes-with-lists"],
    enabled: !!supabase,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id,name,area_id,grade,discipline,pitches,stars,lists,classic")
        .not("lists", "is", null)
        .limit(2000);
      if (error) throw error;
      return (data || []).map(dbRouteToCamel);
    },
  });
}

// The root countries, most-climbed first. The catalog held exactly one until Canada arrived,
// so nothing ever had to ask this question; the area browser now opens on it.
export function useCountries() {
  return useQuery({
    queryKey: ["area-countries"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*").is("parent_id", null)
        .order("route_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// The top-level regions — every direct child of every ROOT area, not of "usa" specifically.
// The DB-catalog equivalent of the static AreaBrowse "Pick a state" list.
//
// This was `.eq("parent_id", "usa")`, which was correct while the catalog held exactly one
// country and silently wrong the moment it held two: a Canadian province would have been
// loaded, counted and searchable, and completely unreachable from the browser — data with no
// reader, which is the failure this repo keeps finding. Roots are resolved rather than named
// so adding a third country needs no code change at all.
export function useStates() {
  return useQuery({
    queryKey: ["area-children", "roots"],
    enabled: !!supabase,
    queryFn: () => orOffline(async () => {
      const { data: roots, error: rootErr } = await supabase.from("areas").select("id").is("parent_id", null);
      if (rootErr) throw rootErr;
      const rootIds = (roots || []).map(r => r.id);
      if (!rootIds.length) return [];
      const { data, error } = await supabase.from("areas").select("*").in("parent_id", rootIds).order("name");
      if (error) throw error;
      return data;
    }, offlineStates),
  });
}

// Breadcrumb ancestors (root-first, exclusive of "usa") for an area reached by
// something other than drilling — a near-me map pin or a route-finder hit.
// `path` is a materialized ltree whose labels ARE the ancestor ids, so this is
// a plain id lookup, no RPC needed. Plain async (not a hook) since it's used
// from a click handler, not rendered directly.
// Hydrate a partial area (a search hit from areas_in_subtree, a saved-area id) into
// its full row. The search RPC deliberately returns a narrow projection with no
// `path`, and callers that navigate need path/area_type plus the display columns.
export async function fetchArea(id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase.from("areas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function fetchAreaBreadcrumb(area) {
  // Drop the leading label — it is the root country, which the breadcrumb does not show —
  // rather than filtering the literal "usa", which would start rendering "Canada" as a crumb
  // the moment a second country existed.
  const ids = area && area.path ? area.path.split(".").slice(1).filter(id => id !== area.id) : [];
  if (!supabase || !ids.length) return [];
  const { data, error } = await supabase.from("areas").select("*").in("id", ids);
  if (error) throw error;
  const byId = Object.fromEntries(data.map(a => [a.id, a]));
  return ids.map(id => byId[id]).filter(Boolean);
}

// Fetches just the parent-area fields for one route and returns them in _dbArea
// shape. The routes_in_subtree / areas_in_subtree RPCs (and the ?debugRoute
// lookup) return bare route rows with no embedded `areas`, so a route opened
// from search / Route finder / "View all N routes" / Objectives / Suggested
// climbs arrives with _dbArea null. enrichRoute then falls back to the `fa`-only
// branch and the route page silently loses prominence, range and the peak blurb
// — it still renders a PEAK panel, so the loss is invisible. Rather than change
// five RPCs (a migration), the route-open path hydrates the missing area here.
export async function fetchRouteArea(routeId) {
  if (!supabase || !routeId) return null;
  const { data, error } = await supabase
    .from("routes").select("area_id, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))")
    .eq("id", routeId).maybeSingle();
  if (error || !data || !data.areas) return null;
  const a = data.areas;
  return { id: data.area_id, name: a.name, areaType: a.area_type, region: a.region, parentName: a.parent && a.parent.name, lat: a.lat, lng: a.lng, elevation: a.elevation_ft, prominence: a.prominence_ft, avyZone: a.avy_zone, blurb: a.blurb };
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
//
// Rows carry `total`, the full match count BEFORE the limit (added in 0147). It is the
// same number on every row — a window function over the match set — so read it off the
// first row and never sum it. Callers must show it whenever it exceeds what came back:
// until 0147 the cut was alphabetical and silent, so typing "mount" in Washington
// returned A–G and stopped, and Mount Rainier read as absent from the catalog.
export function useAreaSearch(rootId, q, lim = 40) {
  return useQuery({
    queryKey: ["area-search", rootId, q || "", lim],
    enabled: !!supabase && !!rootId && !!(q || "").trim(),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("areas_in_subtree", { root_id: rootId, q, lim });
      if (error) throw error;
      return data;
    },
  });
}

// How many areas matched in total, and how many of them are on screen. `total` is absent
// on a pre-0147 function (the column did not exist), so fall back to the row count rather
// than rendering "40 of undefined" — a client that ships ahead of its migration must
// degrade to saying less, never to saying something false.
export function areaSearchTotal(rows) {
  if (!rows || !rows.length) return 0;
  const t = rows[0].total;
  return Number.isFinite(Number(t)) ? Number(t) : rows.length;
}

// Peaks with routes inside a bounding box — backs NEARBY PEAKS on the area page.
//
// This deliberately does NOT reuse useNearbyAreas, and the reason is measured rather than
// stylistic. That hook fetches peaks AND crags ordered by `route_count desc`, capped at 500.
// Around Mount Stuart that cap is REACHED — the box comes back with exactly 500 rows, most of
// them Icicle Creek boulders — so the 500 you get are the highest-route-count areas in the
// box, not the nearest. A neighbouring peak holding one route sorts at the tail and can be
// truncated away before the caller ever gets to rank by distance. That is the
// `resultRecordCount without a meaningful orderByFields` shape check:fire already records:
// a capped query whose ordering answers a different question than the caller is asking.
//
// Filtering to peaks-with-routes server-side collapses the same box to 41 rows (91 around
// Baker), so the cap stops being reachable and the distance ranking sees everything. No
// ordering is requested because the caller sorts by great-circle distance itself; the limit
// is a runaway backstop, not a selection.
export function useNearbyPeaks(bounds) {
  return useQuery({
    queryKey: ["nearby-peaks", bounds && [bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng].map(n => n.toFixed(2)).join(",")],
    enabled: !!supabase && !!bounds,
    queryFn: async () => {
      const { data, error } = await supabase.from("areas").select("*")
        .gte("lat", bounds.minLat).lte("lat", bounds.maxLat)
        .gte("lng", bounds.minLng).lte("lng", bounds.maxLng)
        .eq("area_type", "peak").gt("route_count", 0)
        .limit(400);
      if (error) throw error;
      return { rows: data };
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
      const { data, error } = await supabase.from("routes")
        // `path` alone is all the ltree filter below needs, and selecting only `path` is what
        // put the literal word "undefined" on the route page. `dbRouteToCamel` builds `_dbArea`
        // from `r.areas` whenever it is TRUTHY, so a path-only embed yields an area object with
        // no `name` -- and because it is truthy, openRoute's async backfill (`!x._dbArea`) is
        // skipped, so it never repairs. Observed live: a wishlisted route opened from search
        // rendered "UNDEFINED" where the peak name goes, permanently. Ask for the same area
        // fields the sibling `useRoutesByIds` asks for, plus `path`.
        .select("*, areas(path,name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))")
        .in("id", ids);
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
      const { data, error } = await supabase
        .from("routes").select("*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))")
        .in("id", ids);
      if (error) throw error;
      return data;
    },
  });
}

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
// `contributor` is stamped here rather than at the call sites: consensus ("3 climbers
// agree", computed client-side from these rows per 0002_contributions.sql) counts
// DISTINCT contributors, so a row that falls back to the column default 'anon' makes
// every submission look like the same person. Defaulting centrally means a new call
// site cannot forget it and silently break the threshold.
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
  return data;
}

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
  const { error } = await supabase.from("user_reports").insert(row);
  if (error) throw error;
  return true;
}

// Top contributors rolled up through an area's subtree (live-catalog leaderboard).
// Returns [{ contributor, n }] via the area_top_contributors RPC (0005, rewritten in 0148).
// `contributor` is the contributor's auth uid — pair with useProfilesByIds to display names.
// Never render it raw: DbAreaBrowser did, and an unresolved row printed a uuid as a person.
// `n` is NOT a row count. Field corrections collapse per (route, field), so refining one value
// scores once however many rows it wrote; photos/reports/ratings count individually. Anonymous
// rows are excluded in both spellings ("anon" and NULL). 0148's header records the two things
// it still cannot weigh — acceptance, and trip reports — and why each is a decision rather
// than arithmetic. Don't re-derive that from the ledger; it is settled there.
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
export async function saveObjective(userId, routeId) {
  if (!supabase) return;
  const { error } = await supabase.from("objectives").insert({ user_id: userId, route_id: routeId });
  if (error && error.code !== "23505") throw error; // 23505 = already saved, not a real failure
}
export async function removeObjective(userId, routeId) {
  if (!supabase) return;
  const { error } = await supabase.from("objectives").delete().eq("user_id", userId).eq("route_id", routeId);
  if (error) throw error;
}

// ── crews — crews/objectives backend Phase B, see 0032_crews.sql for the schema ──
// and its RLS comments for why float_plan/meet_place never appear in crew_listings.
// NOT YET WIRED into ClimbMatch.jsx's crew mutation flows (formCrew, updateCrew,
// crewAccept, meAgreeDates, crewSetDate, etc. - about 15 call sites) - that's a
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
  return useQuery({
    queryKey: ["my-crews", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews").select("*, crew_members(*), crew_day_acks(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Plain async writes (not hooks) — called from event handlers, not render.
export async function createCrew({ routeId, createdBy, dates, meetTime, meetPlace, floatPlan, cap }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("crews").insert({ route_id: routeId, created_by: createdBy, dates: dates || [], meet_time: meetTime, meet_place: meetPlace, float_plan: floatPlan, cap: cap || 4 })
    .select().single();
  if (error) throw error;
  return data;
}
export async function updateCrewRow(crewId, patch) {
  if (!supabase) return;
  // .select() makes an RLS rejection visible — same trap updateCrewMemberStatus
  // documents below: the 0036 crews UPDATE policy is organizer-only, so a member's
  // edit matches zero rows and PostgREST returns 200 with no error.
  const { data, error } = await supabase.from("crews").update(patch).eq("id", crewId).select("id");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That didn’t save — only the crew organiser can change this.");
  return data;
}
export async function addCrewMember(crewId, userId, status = "invited", note) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_members").insert({ crew_id: crewId, user_id: userId, status, note });
  if (error && error.code !== "23505") throw error;
}
// Invite-by-email: hold a crew spot for someone with no account yet (migration
// 0070). A signup with the matching email converts it into a crew_members row.
export async function inviteToCrewByEmail(crewId, email, invitedBy, note) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crew_email_invites").insert({
    crew_id: crewId, email: String(email).trim().toLowerCase(), invited_by: invitedBy, note: note || null,
  }).select().single();
  if (error) throw error;
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
  const { error } = await supabase.from("crew_email_invites").delete().eq("id", id);
  if (error) throw error;
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
  if (!data || !data.length) throw new Error("That didn’t save — only the member themselves or the crew organiser can change a membership status.");
  return data;
}
export async function removeCrewMember(crewId, userId) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_members").delete().eq("crew_id", crewId).eq("user_id", userId);
  if (error) throw error;
}
export async function ackCrewDay(crewId, userId, date) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_day_acks").insert({ crew_id: crewId, user_id: userId, date });
  if (error && error.code !== "23505") throw error;
}
export async function unackCrewDay(crewId, userId, date) {
  if (!supabase) return;
  const { error } = await supabase.from("crew_day_acks").delete().eq("crew_id", crewId).eq("user_id", userId).eq("date", date);
  if (error) throw error;
}
export async function deleteCrewRow(crewId) {
  if (!supabase) return;
  const { error } = await supabase.from("crews").delete().eq("id", crewId);
  if (error) throw error;
}

// Real-user search for inviting an actual signed-in climber to a crew (as opposed
// to the app's demo CLIMBERS/FILLER_CLIMBERS roster). No new RLS needed - profiles
// already has public read from the auth/profiles migration (0009).
// Every column the partner card reads. Kept in one place because the card scores a
// candidate with compat(), and a column missing from the SELECT does not read as missing
// data — it reads as an unknown, which silently downgrades a complete profile.
const PARTNER_COLS = "id,name,username,avatar,bio,location,disciplines,sport_grade,trad_grade,boulder_grade";

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
      let q = supabase.from("profiles").select(PARTNER_COLS).eq("discoverable", true).limit(max || 24);
      if (meId) q = q.neq("id", meId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

// Write the listing preference. Returns the stored row so the caller can reflect what the
// server actually holds rather than what it hoped it set — a PATCH that RLS rejects comes
// back 200 with an empty array, which is exactly how a toggle reports success and changes
// nothing.
export async function setDiscoverable(userId, value) {
  if (!supabase || !userId) throw new Error("not signed in");
  const { data, error } = await supabase
    .from("profiles").update({ discoverable: !!value }).eq("id", userId).select("id,discoverable");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new Error("the update matched no profile row");
  return data[0];
}

export function useProfileSearch(q) {
  const qq = (q || "").trim();
  return useQuery({
    queryKey: ["profile-search", qq],
    enabled: !!supabase && !!qq,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select(PARTNER_COLS).ilike("name", `%${qq}%`).limit(8);
      if (error) throw error;
      return data;
    },
  });
}

// Pending crew invites addressed to a real signed-in user - the accept/decline
// side of useProfileSearch-based invites. Joins the crew row so the invite card
// can show which route/dates without a second round trip.
export function useMyCrewInvites(userId) {
  return useQuery({
    queryKey: ["my-crew-invites", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_members").select("*, crews(*)")
        .eq("user_id", userId).eq("status", "invited");
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
// One real user's full profile row — the profile modal needs more than the
// id/name/avatar that member chips and search rows carry.
export function useFullProfile(userId) {
  return useQuery({
    queryKey: ["full-profile", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
  });
}

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
// An OBJECT must never reach String(v) here: that yields the literal "[object Object]",
// which renders as a bullet and is one of the tokens check:ui exists to catch. Two rows
// hit exactly that — see gearArr below. Returning [] is the floor; gearArr recovers the
// content properly for the one column where it is recoverable.
function toArr(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  if (typeof v === "object") return [];
  return String(v).split(/,\s*/).filter(Boolean);
}

// One column, two shapes. `gear` is an array of strings on 1,065 of its 1,067 rows, but
// wa_mount_baker_boulder_park_cleaver and wa_mount_shuksan_beckey_schmidtke hold a nested
// object — {rack:[…], gearTiers:{…}} — because enrichment wrote the wrong container there.
// Both rendered the literal "[object Object]" TWICE: once as the gear list, and again as
// the RACK box, because `rack` falls back to gear when the rack column is null, which it is
// on both. Their real rack array is one key down, so unwrap rather than blank — the content
// is right and only its shape is wrong. Two marquee WA alpine climbs; check:ui scans for
// this exact token but walks a single sample route, so it never saw them.
function gearArr(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return toArr(v.rack);
  return toArr(v);
}

// watch_out is the ONLY toArr column with string rows: 79 of 1,070, the other 991 being
// arrays — and obj_haz/rack/gear/features/hazards/what_to_bring/pro_tips are 100% arrays,
// measured, so this shape is not lurking elsewhere. Those 79 separate their warnings with
// SEMICOLONS and NEWLINES, never commas, so toArr's comma split rendered each as one
// run-on bullet; on the 30 that also contain commas it broke them mid-clause into
// fragments ("…avalanche activity between Doctor Creek and Victoria Creek at 5," / "500
// ft"). Three are nothing but separators — "; ; ; ; " on Adams' Avalanche Glacier, Adams
// NW Ridge and Rainier's North Mowich Headwall — and drew a bullet of pure punctuation
// under a red WATCH OUT heading.
//
// Applied ONLY to the string form, deliberately. 237 of the 991 array rows contain a
// semicolon INSIDE one item ("the lake may still be snow/ice-covered; some parties have
// crossed…") — that is a single hazard that happens to use a semicolon, and splitting it
// would shred correct data.
// pitch_detail is an array of per-pitch objects on 918 of its 920 rows. Two Hozomeen South
// Peak routes store PROSE there instead, and every reader assumes the array — the Overview
// tab does `route.pitchDetail.reduce(...)`, a string has no .reduce, and both route pages
// THREW on render. Measured, not inferred: rendering the real RouteDetail with the real rows
// fails with "route.pitchDetail.reduce is not a function" on overview, while the array
// control renders clean.
//
// `.length` is what let it through. The guard upstream is
// `route.pitchDetail && route.pitchDetail.length`, and a non-empty STRING satisfies it — the
// same fail-open shape as the gear/watch_out pair above.
function pitchArr(v) {
  return Array.isArray(v) ? v : [];
}

// ...and the prose must not simply vanish. `beta` is NULL on both rows and neither
// `overview` contains this text, so dropping it would lose 477 and 254 characters of the
// only route description those climbs have. It is appended to `beta`, which renders as its
// own block. Prose in a structured column is the failure CLAUDE.md documents for season and
// grade; the reader-side defence here is the same remedy — show the value where it belongs
// rather than where it was written.
function pitchProse(v) {
  if (Array.isArray(v) || typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function toWarnArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string") return [];
  return v.split(/\s*[;\n]+\s*/).map((s) => s.trim()).filter((s) => s.replace(/[;,.\s—–-]/g, "").length);
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
  // Coerce numerics: contributed rows have stored lat/lng/elev as strings, which
  // crashes downstream renderers that call .toFixed() (wa_martin_peak_west_ridge).
  const num = v => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  // Order and de-duplicate at the same boundary, for the same reason: every consumer (the
  // waypoint list, the map, the bail-point picker) assumed the stored array was already
  // walkable and unique, and on a lot of rows it is neither. 51 routes render the summit
  // second — Forbidden Peak's West Ridge lists it at 4.5 mi ahead of a camp at 3 mi — and 10
  // list the same place twice. See lib/waypoints.js for why reordering only happens when
  // every waypoint carries a distMi.
  return tidyWaypoints(wps.map(w => ({
    ...w,
    type: normalizeWaypointType(w.type),
    lat: num(w.lat),
    lng: num(w.lng),
    elev: num(w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft)),
    note: w.note != null ? w.note : w.notes,
  })));
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
// The verification stamps are cleared alongside the status: a 'lapsed' row still carries
// the previous verified_at/verified_expires_at, and a pending row that looks verified is
// exactly the state 0082's policy refuses to let a guide write.
export async function resubmitGuideCredential(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("guide_credentials")
    .update({ status: "pending", rejected_reason: null, verified_at: null, verified_expires_at: null })
    .eq("id", id).select().single();
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
/* THE GUIDE DASHBOARD'S "no profile" SCREEN HAD NO THIRD THING TO SAY, and the two states it
   collapsed are opposites. `useGuideProfile(uid)` handed back `undefined` both when a climber has
   genuinely never applied AND when the read simply failed -- react-query leaves `data` undefined on
   error -- so an approved guide whose profile did not load was told:

       You haven't applied to guide yet.
       Settings -> Become a guide starts an application.

   which denies an application they made and were accepted on, and sends them to make another. A
   worse shape than the usual "you have none": it is a false claim about the user's own HISTORY, and
   the remedy it offers is the wrong action.

   Nothing could have seen it. This screen is one of App's EARLY RETURNS, so it is not a tab that
   check:outage walks; and it is a `position:fixed; inset:0` full-screen view with no role="dialog",
   so check:overlay-discovery does not classify it as an overlay either -- the same blind spot the
   Manage areas screen sat in.

   A pure function so check:outage-copy can execute both branches without standing up the
   dashboard, which needs a session, a portal and four queries. */
export function guideProfileMissingCopy(unavailable) {
  return unavailable
    ? { head: "Couldn’t load your guide profile",
        body: "This is not a claim that you have not applied — the read failed. Check your connection and try again." }
    : { head: "You haven’t applied to guide yet.",
        body: "Settings → Become a guide starts an application." };
}

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
    // `active_disciplines` is a CACHE, and it only goes stale in one direction. The
    // sync_active_disciplines trigger (0021) builds it from primary_track credentials that are
    // 'verified' AND unexpired — but nothing flips a credential to 'lapsed' when it quietly
    // crosses verified_expires_at, so the trigger never re-fires and the column keeps
    // advertising disciplines earned by an expired certification. reconcileGuideVerification
    // repairs it, and is only reached from a guide's OWN dashboard, so a guide who stops
    // logging in stays listed under a discipline they are no longer certified for.
    //
    // isGuideVerified already re-checks expiry at render, which is why the ✓ badge is honest.
    // Apply the same live check here: by that trigger's own definition every entry in the
    // cache requires a currently-valid primary_track credential, so if none is valid now the
    // cached list cannot be right and the safe reading is none. The guide stays listed (they
    // are 'active' by attestation) — they just stop matching a certification they have lost.
    //
    // Callers must embed `guide_credentials(kind, status, verified_expires_at)`; useGuides
    // does, and is the only caller. Without the embed this fails CLOSED (no disciplines),
    // which on a hire-a-guide surface is the right direction to be wrong in.
    disciplines: isGuideVerified(g.guide_credentials) ? (g.active_disciplines || []) : [],
    insuranceCarrierName: g.insurance_carrier_name,
    insuranceAttested: g.insurance_attested, permitAttested: g.permit_attested,
    rating: ratingAvg, reviewCount: revs.length,
    status: g.status,
  };
}

// Map a DB route row (snake_case) to the app's camelCase shape so RouteDetail —
// which reads route.gainFt/objHaz/elevPts/etc. — renders DB routes fully, not blank.
// A class grade (1st-4th) is a SCRAMBLING grade. It cannot describe a bolted sport climb, a
// trad pitch or a boulder problem, so on those disciplines it is not a grade at all -- it is
// an import artifact. 184 catalog routes carry one: "Prism Roof", a sport route at Shady Lane
// West, rendered its grade as "3rd" in the header badge AND the Grade tile.
//
// The grade came faithfully from OpenBeta, so there is nothing upstream to "restore" and no
// trustworthy source to derive a real grade from (audited 2026-08-07/08; the descent and
// approach lines in that same population were separately reclassified, see
// audits/2026-08-08-permits-rappels-class-grades.md). What the app can do without a source is
// stop presenting it as fact: null it here, at the single boundary every DB route crosses, so
// every render site shows "not recorded" and missingFacts() lists "grade" -- which puts the
// route into the contribute flow instead of quietly misinforming a climber.
//
// Deliberately NOT applied to alpine/mountaineering/ice/mixed/scrambling, where a class grade
// is meaningful and correct.
const CRAG_DISC = new Set(["trad", "sport", "bouldering", "rock"]);
const CLASS_GRADE = /^\s*(?:class\s*)?[1-4](?:st|nd|rd|th)?(?:\s*class)?\s*$/i;
function usableGrade(r) {
  if (!r || r.grade == null) return r ? r.grade : null;
  if (!CRAG_DISC.has(r.discipline)) return r.grade;
  return CLASS_GRADE.test(String(r.grade)) ? null : r.grade;
}

export function dbRouteToCamel(r) {
  if (!r) return r;
  return {
    ...r,
    grade: usableGrade(r),
    mountainId: r.area_id,
    gradeSystem: r.grade_system,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainFt: r.gain_ft, lossFt: r.loss_ft, outingShape: r.outing_shape, gainM: r.gain_ft!=null?Math.round(r.gain_ft/3.28084):null, lossM: r.loss_ft!=null?Math.round(r.loss_ft/3.28084):null, distKm: r.dist_km, maxAngle: r.max_angle,
    objHaz: toArr(r.obj_haz), elevPts: r.elev_pts, gpxPts: r.gpx, waypoints: normalizeWaypoints(r.waypoints),
    // Structured trailhead block (2026-07 enrichment): {trailhead, trailheadDirection, trailheadLat/Lng, peakLat/Lng}.
    approachLogistics: r.approach_logistics || null,
    // Migration 0120. Each defaults to an empty array rather than null so every consumer can
    // ask `.length` without guarding — the sections that render them are gated on non-empty,
    // so an absent column and an empty array mean the same thing to the UI and neither
    // renders a heading over nothing.
    approachVariants: Array.isArray(r.approach_variants) ? r.approach_variants : [],
    climbingRoute: Array.isArray(r.climbing_route) ? r.climbing_route : [],
    bivy: Array.isArray(r.bivy) ? r.bivy : [],
    // There is no `rack` column, so this mapped every DB route to an empty array and the
    // spread above could not help. The structured rack a climber wants IS `gear`, so fall
    // back to it — otherwise the protection summary, the gear readout's category matching
    // and the planner's packing list all run on nothing.
    rack: toArr(r.rack).length ? toArr(r.rack) : gearArr(r.gear), gear: gearArr(r.gear), features: toArr(r.features), hazards: toArr(r.hazards),
    /* ONE fact under TWO spellings, and the DB path only ever filled one of them. `routes.rock`
       is NOT unreachable — RouteDetail's TECH STATS reads `route.rock` and renders a "Rock"
       tile, so #828/0132's column does show up. But three other surfaces spell the same fact
       `rockType` and saw nothing on a DB route: passesFilters' rock-type facet (so filtering
       for Granite skipped every DB route that says it is granite), the bouldering header
       strap, and — worst of the three — SuggestFix's `cur:` value, which showed a climber "—"
       for the rock type beside a route that already states it, inviting a re-submission of
       what is on file. Not the descent_text shape (populated, read by nobody); the narrower
       one where a reader exists under a name the mapper never wrote. Seed routes carry
       rockType directly and never come through here, so this cannot clobber one. It is a
       straight read of `rock` and NOT `r.rock ?? r.rockType`: there is no rockType COLUMN, and
       check:schema-drift rejects that fallback — correctly, since PostgREST would return
       undefined rather than error and the guard exists for exactly that silence. */
    rockType: r.rock,
    alpineGrade: r.alpine_grade, rockGrade: r.rock_grade, iceGrade: r.ice_grade,highPointFt:r.high_point_ft,aidGrade:r.aid_grade,descentText:r.descent_text,protRating:r.prot_rating,startType:r.start_type,landing:r.landing,pads:r.pads,rock:r.rock,crux:r.crux,difficulty:r.difficulty,pitchDetail:pitchArr(r.pitch_detail),rappelDetail:r.rappel_detail,rappelCountNote:r.rappel_count_note,lists:r.lists,permits:r.permit,
    timing:r.timing, detailedRack:r.detailed_rack, whatToBring:toArr(r.what_to_bring), proTips:toArr(r.pro_tips), watchOut:toWarnArr(r.watch_out), proNeeds:r.pro_needs, bestSeason:r.best_season, beta:(function(){var b=Array.isArray(r.beta)?r.beta.slice():(r.beta?[r.beta]:[]);var p=pitchProse(r.pitch_detail);if(p)b.push(p);return b;})(),
    slingRack: r.sling_rack || null, alpineDraws: r.alpine_draws, ropeType: r.rope_type, ropeLengthM: r.rope_length_m, ropeNote: r.rope_note, ascender: r.ascender, corrections: r.corrections,
    // When somebody last read this route's road/access claims against a primary source — NOT when
    // the row was last written. 0172 adds the column; it is set explicitly by a script that did the
    // checking, never by a trigger or by patchRow, because a mechanical stamp on every write would
    // date a typo fix as a verification. NULL means the age of those claims is unrecorded, which is
    // the honest state for every row written before the column existed.
    accessCheckedAt: r.access_checked_at,
    // `verif` carries the reviewer's verdict ({status, source, updated, confirms}).
    // It was never mapped, so ProvenancePanel fell back to "unverified" for every
    // route and the reviewer flags on known-bad entries were invisible.
    verif: r.verif,
    // `gear_confidence` is the gear audit's verdict on THIS route's rack — 'verified' (275 WA
    // routes) or 'inferred' (159). It was never mapped, so an inferred rack rendered
    // identically to an audited one. Deliberately NOT joined by `auto_generated`: 138 WA
    // routes are auto_generated=true AND gear_confidence=verified, i.e. the audit went back
    // and confirmed them, so treating auto_generated as a caveat would misreport 138 racks a
    // human checked. That column stays plumbing (it is in audit-column-attribution's PLUMBING
    // set), and this one carries the meaning.
    gearConfidence: r.gear_confidence,
    // Enrichment panel fields (migration 0014) — no static-array equivalent, so no gap-fill needed.
    crowds: r.crowds, partnerRequirements: r.partner_requirements, seasonalGuidance: r.seasonal_guidance, seasonalHazards: r.seasonal_hazards, dataQuality: r.data_quality,
    // `auto_generated` was likewise unmapped and unreachable. sectionProvenance() reads it for
    // the sections that have no verdict column of their own (approach, descent, pitch detail,
    // waypoints, gpx, climate, hazards, beta).
    //
    // "5.4% true" is the catalog-wide figure and it UNDERSTATES this badly. Among the routes
    // that actually carry these fields — the only routes that render these sections — it is true
    // on 39-66% depending on the section (66% of the 584 with a gpx track). Measured in
    // scripts/oneoff/measure-provenance-spread.mjs. That is the flat-coverage trap in reverse:
    // a flag that looks rare across the catalog can be the common case exactly where it renders.
    //
    // The caveat the gear comment above earns, and it generalises: auto_generated=true does NOT
    // mean unreviewed — 138 WA routes are auto_generated AND gear_confidence=verified. So a
    // per-section signal always outranks this flag, which is why sectionProvenance() checks it
    // LAST. For the sections with no such signal it is the best available reading, and no more
    // than that. Do NOT substitute data_quality.confidence: 94.0% "MEDIUM" across 8,367 WA
    // routes, so it cannot distinguish anything.
    autoGenerated: r.auto_generated,
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

// Uploads a trip-report photo, reusing the topo-photos bucket/RLS (same
// {uid}/{uuid}-{filename} path convention as uploadTopoPhoto) rather than
// standing up a separate bucket + migration for climb_logs.photos.
// A climber's own profile photo — their avatar, or one of the shots on their profile strip.
//
// Both used to be `URL.createObjectURL(file)`, and the avatar's PERSISTED: measured on the live
// project, `profiles.avatar` held `blob:https://…/b1ac7240-…`, an in-memory handle that
// resolves to nothing for the owner after a reload and to nothing for anybody else, ever. The
// photo strip had it worse — no `photos` column existed, so the value went to React state and
// the screen toasted "Photo added ✓" over nothing at all (0173 adds the column).
//
// Same bucket, path convention and limits as every other photo in the app: `topo-photos`,
// `{uid}/{uuid}-{name}` so 0026's storage RLS gates writes by the first path segment, and
// 0150's 15 MiB / five-image-type cap. A separate avatars bucket would need all three of those
// decided again for no gain.
export async function uploadProfilePhoto(file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a profile photo other climbers can see.");
  const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file, { contentType: file.type || undefined });
  if (upErr) throw upErr;
  const url = topoPhotoUrl(path);
  if (!url) throw new Error("The photo uploaded but its address could not be resolved.");
  return url;
}

// Persist the profile photo strip, and ONLY that column.
//
// Deliberately not routed through `saveProfile`, which PATCHes whatever object it is handed:
// the strip holds no draft of the rest of the profile, and handing that write a partial object
// is precisely the shape check:profile-edit-gate exists for — seven columns emptied because a
// caller sent fields it had never loaded. One column in, one column out.
//
// Throws on failure rather than resolving, so the caller can keep its success message behind a
// write that actually landed.
export async function saveProfilePhotos(userId, photos) {
  if (!supabase) return null;
  if (!userId) throw new Error("Sign in to save your profile photos.");
  const { data, error } = await supabase
    .from("profiles").update({ photos: photos || [] }).eq("id", userId).select("id").single();
  if (error) throw error;
  return data;
}

export async function uploadLogPhoto(file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to attach a photo.");
  const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file);
  if (upErr) throw upErr;
  return topoPhotoUrl(path);
}

// A photo attached to a ROUTE rather than to a climb log — the "Add a photo" sheet on the
// Photos tab, which exists so you can contribute one without logging an ascent.
//
// Before this, that sheet produced `blob:` URLs held in React state: they uploaded nowhere,
// were invisible to everyone else, and vanished on refresh (the browser revokes them on
// unload). The button worked and the feature did not, which is the shape this repo keeps
// finding — see the `descent_text` note in CLAUDE.md.
//
// Filed as a `contributions` row of kind 'photo', which 0002 has documented as a kind since
// the ledger was created, so nothing new is needed to store or read it: useRouteContributions
// already selects *. It also means a route photo now counts on the area leaderboard, at one
// point per photo, which 0148 is explicit is the right weighting for a distinct artifact.
//
// UPLOAD FIRST, THEN INSERT, and the order is deliberate. Inserting first would publish a row
// pointing at a file that may never arrive — a broken image on someone else's screen. This way
// a failure leaves an orphaned object in a bucket nobody browses, and the caller sees the
// throw. Storage RLS (0026) gates writes on the first path segment, so the {uid}/ prefix is
// load-bearing, not cosmetic.
//
// Refuses without a session rather than falling back to a local-only photo: `contributor`
// would be 'anon', the row would be unattributable, and the climber would have been told
// their photo was shared when only they can see it.
export async function submitRoutePhoto(routeId, file) {
  if (!supabase) return null;
  if (!routeId || !file) throw new Error("Nothing to add.");
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a photo other climbers can see.");
  const path = `${uid}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage
    .from("topo-photos").upload(path, file, { contentType: file.type || undefined });
  if (upErr) throw upErr;
  const url = topoPhotoUrl(path);
  if (!url) throw new Error("The photo uploaded but its address could not be resolved.");
  return submitContribution({ route_id: routeId, kind: "photo", value: { url } });
}

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

// How much is waiting on a reviewer, for the nav badge. 0077's own header predicted the exact
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
      const [r, p, c, g] = await Promise.all([
        head("user_reports").in("status", ["open", "reviewing"]),
        head("content_reports").eq("status", "open"),
        head("contributions").eq("kind", "new_route").eq("status", "pending"),
        head("guide_profiles").eq("status", "submitted"),
      ]);
      // A failed count must not read as an empty queue. Throwing puts the hook in `error`,
      // where the badge renders nothing rather than a confident zero.
      for (const x of [r, p, c, g]) if (x.error) throw x.error;
      const reports = r.count || 0, photos = p.count || 0, proposals = c.count || 0, guides = g.count || 0;
      return { reports, photos, proposals, guides, total: reports + photos + proposals + guides };
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
      const { data, error } = await supabase
        .from("profiles").select("terms_accepted_version, terms_accepted_at").eq("id", uid).maybeSingle();
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
    .eq("id", uid).select("id, terms_accepted_version");
  if (error) throw error;
  if (!data || !data.length) throw new Error("That could not be recorded — try again.");
  return data[0];
}

// The guide application queue. NO MIGRATION NEEDED, and that is the finding: 0021 and 0022
// already grant an admin select on guide_profiles, guide_credentials, guide_documents AND the
// private storage bucket, plus update rights on credentials and profiles. The whole review
// capability was designed and then given no screen, so a guide uploaded a certificate of
// insurance, was told "we'll review your credentials and follow up", and nothing could look.
//
// Same shape as user_reports before 0158 -- except there the policy had to change too. Here
// literally the only thing missing was a reader.
//
// `submitted` only. `draft` is an application the guide has not finished and is none of a
// reviewer's business; `rejected` and `delisted` are settled; `active` is the public directory.
export function useGuideApplications() {
  return useQuery({
    queryKey: ["guide-applications"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_profiles")
        .select("*, profiles(name, avatar, username), guide_credentials(*), guide_documents(id, doc_type, storage_path, credential_id, deleted_at, uploaded_at)")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

// Verify or reject one credential. `reviewed_by` is stamped for the same reason 0158 added it to
// safety reports: a review is attributable to whoever performed it.
//
// An expiry is REQUIRED to verify, and deliberately not defaulted. Every credential this app
// recognises carries one printed on the card, and `is_verified_guide` treats a lapsed
// certification as unverified -- so a guessed date would either expire a valid guide early or,
// worse, keep an expired one listed. Making it mandatory is what stops that being silent.
export async function reviewGuideCredential(id, { status, expiresAt, reason }) {
  if (!supabase) return null;
  if (status === "verified" && !expiresAt) throw new Error("A verified credential needs its expiry date.");
  if (status === "rejected" && !reason) throw new Error("Say why it was rejected — the guide sees this.");
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess && sess.session && sess.session.user && sess.session.user.id;
  const patch = status === "verified"
    ? { status, verified_at: new Date().toISOString(), verified_expires_at: expiresAt, rejected_reason: null, reviewed_by: uid || null }
    : { status, rejected_reason: reason, verified_at: null, verified_expires_at: null, reviewed_by: uid || null };
  const { data, error } = await supabase.from("guide_credentials").update(patch).eq("id", id).select();
  if (error) throw error;
  // RLS refuses by matching zero rows, so a refusal must not read as success.
  if (!data || !data.length) throw new Error("That credential could not be updated — reviewing is admin-only.");
  return data[0];
}

// List or reject the application itself.
//
// `guide_profiles_active_requires_attestations` REFUSES status='active' unless all four
// attestations are true. That is checked here before the write so a reviewer gets a sentence
// rather than a raw constraint violation, and it is checked again by the database, which is the
// half that actually enforces it.
export async function setGuideApplicationStatus(guideId, status, reason) {
  if (!supabase) return null;
  if (status === "rejected" && !reason) throw new Error("Say why it was rejected — the guide sees this.");
  const patch = status === "active"
    ? { status, listed_at: new Date().toISOString(), rejected_reason: null }
    : { status, rejected_reason: reason || null };
  const { data, error } = await supabase.from("guide_profiles").update(patch).eq("id", guideId).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error("That application could not be updated — reviewing is admin-only.");
  return data[0];
}

// The safety-report queue (0158). Until that migration `user_reports` had one write and NO
// reader anywhere in the app — a climber reported somebody for harassment and the report was
// visible to nobody who could act. The four-value `status` CHECK shows the review workflow was
// designed; only the reading half was missing.
//
// Open and reviewing both count as live. A report somebody started looking at has not gone
// away, and dropping it off the queue at the moment a reviewer touches it is how a half-finished
// review becomes an invisible one.
export function useUserReports() {
  return useQuery({
    queryKey: ["user-reports"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reports")
        .select("id, reporter, reporter_label, reported_id, reported_name, reason, detail, status, created_at")
        .in("status", ["open", "reviewing"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

// Move a report through the states 0075's CHECK already models. `status` is validated by the
// database, not here, so a typo is a constraint error rather than a silently stored value.
export async function reviewUserReport(id, status) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  const { data, error } = await supabase.from("user_reports")
    .update({ status, reviewed_by: uid || null, reviewed_at: new Date().toISOString() })
    .eq("id", id).select();
  if (error) throw error;
  // RLS refuses by matching zero rows. Same rule as every other write here: a refusal must not
  // read as success.
  if (!data || !data.length) throw new Error("That report could not be updated — reviewing is admin-only.");
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
  return true;
}

// The reviewer's queue. Returns open reports newest first, with the photo they are about --
// a reviewer cannot judge a report without seeing the thing reported, and the contribution row
// is where the url lives.
//
// Non-admins get an empty list rather than an error: the SELECT policy simply matches none of
// their rows, which is the correct shape for a query the UI only mounts for admins anyway.
export function usePhotoReports() {
  return useQuery({
    queryKey: ["photo-reports"],
    enabled: !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_reports")
        .select("id, contribution_id, route_id, reporter, reason, detail, status, created_at, contributions(id, value, contributor, kind)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });
}

// Leave the photo up. The only other way a report leaves the queue is the photo being deleted,
// which cascades the report away with it (0156) -- so there is no state to forget to clear.
export async function dismissPhotoReport(id) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  const { data, error } = await supabase.from("content_reports")
    .update({ status: "dismissed", reviewed_by: uid || null, reviewed_at: new Date().toISOString() })
    .eq("id", id).select();
  if (error) throw error;
  // RLS refuses by matching zero rows. Same rule as deleteRoutePhoto: a refusal must not read
  // as success.
  if (!data || !data.length) throw new Error("That report could not be updated — reviewing is admin-only.");
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
export async function deleteRoutePhoto(rowId, url) {
  if (!supabase) return null;
  if (!rowId) throw new Error("Nothing to remove.");
  const { data, error } = await supabase
    .from("contributions").delete().eq("id", rowId).eq("kind", "photo").select();
  if (error) throw error;
  // RLS rejects by matching zero rows, not by erroring, so an empty result is a refusal and
  // must not read as success -- the swallowed-write-failure shape this repo keeps finding.
  if (!data || !data.length) throw new Error("That photo could not be removed — it may not be yours.");
  const marker = "/topo-photos/";
  const at = typeof url === "string" ? url.indexOf(marker) : -1;
  if (at >= 0) {
    const key = decodeURIComponent(url.slice(at + marker.length));
    // A failure here is deliberately NOT rethrown: the row is already gone, so the photo has
    // left every screen, and telling the climber their removal failed would be false.
    await supabase.storage.from("topo-photos").remove([key]).catch(() => {});
  }
  return true;
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

// ============================================================================
// FEEDBACK LOOP: LOGS, VOUCHES, & TRUST (Phase 2-3)
// Crew persistence lives earlier in this file (useMyCrews/createCrew/etc.) -
// see supabase/migrations/0036_crews_persistence.sql for why crews specifically
// were kept separate from this section rather than reusing its pattern.
// ============================================================================

// Query: Get user's climb logs
export function useUserLogs(userId) {
  return useQuery({
    queryKey: ["user-logs", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("climb_logs").select("*")
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
const TRIP_REPORT_COLS = "id, user_id, stars, cond_tags, date_climbed, discipline, tick_type, notes, photos, beta, gear_beta, outcome_reasons, outcome_note, approach_minutes, climb_minutes, descent_minutes, car_to_car_minutes, snow_condition, freezing_level_ft, water_level, bug_pressure, trail_condition, party_size, protection_quality, anchor_quality, crowd_level, created_at";
// Same 0121 degrade as the write side, for the same reason: naming a column the database does
// not have yet turns the whole SELECT into a 400, and a route page that shows NO community
// reports is exactly the bug this function exists to fix. Falling back to the pre-0121 column
// list loses four chips, not the reports.
export function useRouteTripReports(routeId, limit = 60) {
  return useQuery({
    queryKey: ["route-trip-reports", routeId, limit],
    enabled: !!supabase && !!routeId,
    queryFn: async () => {
      const run = (cols) => supabase
        .from("climb_logs")
        .select(cols)
        .eq("route_id", routeId)
        .in("trip_report_visibility", ["public", "crew"])
        .order("date_climbed", { ascending: false })
        .limit(limit);
      let { data, error } = await run(TRIP_REPORT_COLS + ", temp_f, snow_depth, seepage, mud");
      if (isUnknownColumn(error)) ({ data, error } = await run(TRIP_REPORT_COLS));
      if (error) throw error;
      return data || [];
    },
  });
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
const LOG_COLS_0121 = ["temp_f", "snow_depth", "seepage", "mud"];
function isUnknownColumn(error) {
  return !!error && (error.code === "PGRST204" || /column .* does not exist/i.test(error.message || ""));
}
function withoutNewLogCols(row) {
  const out = { ...row };
  LOG_COLS_0121.forEach((c) => { delete out[c]; });
  return out;
}

// Mutation: Create a climb log
export async function createClimbLog(userId, routeId, logData) {
  if (!supabase) return null;
  const row = { user_id: userId, route_id: routeId, ...logData, created_at: new Date().toISOString() };
  let { data, error } = await supabase.from("climb_logs").insert(row).select().single();
  if (isUnknownColumn(error)) {
    ({ data, error } = await supabase.from("climb_logs").insert(withoutNewLogCols(row)).select().single());
  }
  if (error) throw error;
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
  return data;
}

// Mutation: Delete a climb log
export async function deleteClimbLog(logId) {
  if (!supabase) return null;
  const { error } = await supabase.from("climb_logs").delete().eq("id", logId);
  if (error) throw error;
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
    queryKey: ["hazard-votes", routeId],
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

// Cast, change, or withdraw a vote. `vote` of null withdraws — that is the UI's toggle-off,
// and it is a delete rather than a third vote state so the aggregate never has to guess
// what an absent-but-present row means.
export async function castHazardVote(userId, routeId, hazardLabel, vote) {
  if (!supabase) return null;
  if (!vote) {
    const { error } = await supabase.from("hazard_votes").delete()
      .eq("user_id", userId).eq("route_id", routeId).eq("hazard_label", hazardLabel);
    if (error) throw error;
    return true;
  }
  // One row per climber per hazard (unique index), so changing a vote is an upsert on that
  // key rather than an insert that would collide.
  const { data, error } = await supabase.from("hazard_votes")
    .upsert({ user_id: userId, route_id: routeId, hazard_label: hazardLabel, vote },
            { onConflict: "route_id,hazard_label,user_id" })
    .select().single();
  if (error) throw error;
  return data;
}

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
        .select("id, requester, addressee, status, created_at, responded_at");
      if (error) throw error;
      const rows = data || [];
      const others = [...new Set(rows.map((r) => (r.requester === userId ? r.addressee : r.requester)))];
      if (!others.length) return [];
      const { data: profs, error: pErr } = await supabase
        .from("profiles").select("id, name, username, avatar, location").in("id", others);
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
          profile: byId[otherId] || null,
        };
      });
    },
  });
}

// Ask to connect. status is left to the column default rather than sent, because the RLS
// insert policy requires status = 'pending' and a client-supplied value is one more thing
// that can drift from it.
export async function sendConnectionRequest(requesterId, addresseeId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("connections").insert({ requester: requesterId, addressee: addresseeId })
    .select().single();
  if (error) throw error;
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
  return data;
}

// Withdraw a request, decline-and-forget, or disconnect. Either party may delete.
export async function removeConnection(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("connections").delete().eq("id", rowId);
  if (error) throw error;
  return true;
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
        .from("profiles").select("id, name, username, avatar").in("id", rows.map((r) => r.blocked));
      if (pErr) throw pErr;
      const byId = {};
      (profs || []).forEach((p) => { byId[p.id] = p; });
      return rows.map((r) => ({ _dbId: r.id, blockedId: r.blocked, profile: byId[r.blocked] || null }));
    },
  });
}

// Block someone. The pair is uniquely indexed, so blocking twice raises 23505 rather than
// quietly creating a second row; the caller treats that as already-blocked.
export async function blockUser(blockerId, blockedId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("blocked_users").insert({ blocker: blockerId, blocked: blockedId })
    .select().single();
  if (error && error.code !== "23505") throw error;
  return data || null;
}

export async function unblockUser(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("blocked_users").delete().eq("id", rowId);
  if (error) throw error;
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

// Mutation: Give a vouch
export async function giveVouch(fromId, toId, reason = "") {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("vouches").upsert({
      from_id: fromId,
      to_id: toId,
      reason: reason || null
    }, { onConflict: "from_id,to_id" }).select().single();
  if (error) throw error;
  return data;
}

// Mutation: Revoke a vouch
export async function revokeVouch(fromId, toId) {
  if (!supabase) return null;
  const { error } = await supabase.from("vouches").delete()
    .eq("from_id", fromId).eq("to_id", toId);
  if (error) throw error;
}

// Query: Get belay catches for a climber
export function useBelajCatches(userId) {
  return useQuery({
    queryKey: ["belay-catches", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("belay_catches").select("*")
        .or(`belayer_id.eq.${userId},climber_id.eq.${userId}`)
        .order("date_occurred", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// Mutation: Log a belay catch
export async function logBelajCatch(belayerId, climberId, dateOccurred, description = "") {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("belay_catches").insert({
      belayer_id: belayerId,
      climber_id: climberId,
      date_occurred: dateOccurred,
      description: description || null
    }).select().single();
  if (error) throw error;
  return data;
}

// Query: Get computed trust score for a user
export async function getTrustScore(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .rpc("compute_trust_score", { user_id: userId });
  if (error) throw error;
  return data;
}

// Mutation: Record a verification
export async function addVerification(userId, verificationType) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("verification_records").upsert({
      user_id: userId,
      verification_type: verificationType,
      status: "pending"
    }, { onConflict: "user_id,verification_type" }).select().single();
  if (error) throw error;
  return data;
}

// Mark this user's email verified. Replaces the old verifyRecord(), which wrote
// status:'verified' straight from the client — RLS gated only user_id = auth.uid(), so any
// user could mark any of their own verifications verified, and the badge feeds the trust
// score. 0085 pins that column and moves the one verification the server can actually
// attest into a definer function that reads auth.users.email_confirmed_at itself.
export async function verifyMyEmail() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("verify_my_email");
  if (error) throw error;
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

// Note: Trip report persistence uses climb_logs table (migration 0037).
// Crew persistence uses crews/crew_members/crew_day_acks tables (migration 0036).
// Enhanced climb_logs with fa_ascent/developed/beta fields (migration 0040).

// ── messaging ──

// Crew messaging
export async function sendCrewMessage(crewId, userId, body, imageUrl = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("crews_messages").insert({ crew_id: crewId, user_id: userId, body, image_url: imageUrl })
    .select().single();
  if (error) throw error;
  return data;
}

// Plain fetch — safe to call from event handlers. useCrewMessages wraps it for
// render-time use; calling the hook itself outside render is an invalid hook call.
export async function fetchCrewMessages(crewId, limit = 100, offset = 0) {
  if (!supabase || !crewId) return [];
  const { data, error } = await supabase
    .from("crews_messages").select("*, user:user_id(id,name,avatar)")
    .eq("crew_id", crewId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

export function useCrewMessages(crewId, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["crew-messages", crewId, limit, offset],
    enabled: !!supabase && !!crewId,
    queryFn: () => fetchCrewMessages(crewId, limit, offset),
  });
}

// Direct messaging
export async function sendDirectMessage(recipientId, userId, body, imageUrl = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("messages").insert({ sender_id: userId, recipient_id: recipientId, body, image_url: imageUrl })
    .select().single();
  if (error) throw error;
  return data;
}

export function useDirectMessages(userId, otherUserId, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ["direct-messages", userId, otherUserId, limit, offset],
    enabled: !!supabase && !!userId && !!otherUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages").select("*, sender:sender_id(id,name,avatar)")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data || [];
    },
  });
}

// Paging BACKWARDS through history for "Load earlier messages".
// Not hooks -- these are called from click handlers, so they must be plain async.
// Keyset, not offset: `before` is the oldest locally-loaded message's timestamp
// (ms epoch or anything Date accepts); we fetch the `limit` rows strictly older
// than it, newest-first, then reverse to chronological for the UI. Offset paging
// double-counted against a shared scalar and skipped pages — and per this repo's
// convention, keyset can't skip or duplicate rows. Pass a falsy `before` for the
// newest page (initial hydration).
//
// THESE THROW ON A FAILED READ, and used to return []. Swallowing the error made a
// database failure indistinguishable from reaching the start of the conversation, and
// every caller drew the wrong conclusion from it: it set `crewMsgMore`/`dmMore` false —
// permanently hiding the "load older" control for that chat — and toasted "No earlier
// messages", a factual claim it had no evidence for. Each call site already had a
// `.catch` saying "Couldn't load earlier messages"; the swallow made that branch
// UNREACHABLE. An error handler nobody can reach, carrying the right wording, is the
// tell that the distinction was intended and lost.
//
// The old comment said returning [] stopped a failed page-load blanking the chat. That
// property is preserved, and it was never the return value doing the work: both paging
// callers catch, toast and reset their in-flight flag, and both hydration callers catch
// and do nothing. NO caller clears message state on rejection. Checked before changing
// this — the fear in that comment was not what the code did.
export async function fetchOlderCrewMessages(crewId, limit = 50, before = null) {
  if (!supabase || !crewId) return [];
  let q = supabase
    .from("crews_messages").select("*, user:user_id(id,name,avatar)")
    .eq("crew_id", crewId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", new Date(before).toISOString());
  const { data, error } = await q;
  if (error) throw error;   // a failed read is not an empty page — see the note above
  return (data || []).reverse();
}

// Every DM thread for a user in one query: the latest `limit` messages either
// sent or received, oldest-first. The caller groups by partner id — this is how
// the inbox discovers threads started by someone the user never opened a chat with.
//
// Throws on a failed read, for the same reason the pagers above do, and this one is the
// worst of the three: [] here is what drives the Inbox's "No friend chats yet" empty state,
// so a transient database error told the user they had no conversations AND invited them to
// go start one. The caller sets its hydration guard BEFORE fetching, so that wrong answer
// then stood for the whole session — it never retried.
export async function fetchMyDirectMessages(userId, limit = 100) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("messages").select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;   // a failed read is not an empty inbox — see the note above
  return (data || []).reverse();
}

export async function fetchOlderDirectMessages(userId, otherUserId, limit = 50, before = null) {
  if (!supabase || !userId || !otherUserId) return [];
  let q = supabase
    .from("messages").select("*, sender:sender_id(id,name,avatar)")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", new Date(before).toISOString());
  const { data, error } = await q;
  if (error) throw error;   // a failed read is not an empty page — see the note above
  return (data || []).reverse();
}

export async function markMessageAsRead(messageId) {
  if (!supabase) return;
  const { error } = await supabase.from("messages").update({ read: true }).eq("id", messageId);
  if (error) throw error;
}

// Mark every unread message from one partner as read (RLS: recipient may update).
export async function markDmThreadRead(userId, partnerId) {
  if (!supabase) return;
  await supabase.from("messages").update({ read: true })
    .eq("recipient_id", userId).eq("sender_id", partnerId).eq("read", false);
}

// Crew chats have no per-message read flag; crew_reads (migration 0072) holds a
// per-member last-read watermark instead. Returns null when the table is absent
// so callers can skip crew unread entirely rather than badge on stale data.
export async function fetchCrewLastReads(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("crew_reads").select("crew_id,last_read_at").eq("user_id", userId);
  if (error) return null;
  return data || [];
}

export async function countCrewUnread(crewId, userId, sinceIso) {
  if (!supabase) return 0;
  let q = supabase.from("crews_messages").select("id", { count: "exact", head: true })
    .eq("crew_id", crewId).neq("user_id", userId);
  if (sinceIso) q = q.gt("created_at", sinceIso);
  const { count, error } = await q;
  return error ? 0 : count || 0;
}

export async function markCrewRead(crewId, userId) {
  if (!supabase) return;
  await supabase.from("crew_reads")
    .upsert({ crew_id: crewId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: "crew_id,user_id" });
}

// Realtime subscriptions for messages - watches for inserts on crew messages
export function useCrewMessagesRealtime(crewId, onNewMessage) {
  const subscription = useRef(null);

  useEffect(() => {
    if (!supabase || !crewId || !onNewMessage) return;

    const channel = supabase.channel(`crews-messages:${crewId}`, { config: { broadcast: { self: false } } });
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "crews_messages", filter: `crew_id=eq.${crewId}` },
      async (payload) => {
        const msg = payload.new;
        // Fetch full user profile for the sender
        if (msg.user_id) {
          const { data: user } = await supabase.from("profiles").select("id,name,avatar").eq("id", msg.user_id).single();
          onNewMessage({ ...msg, user });
        } else {
          onNewMessage(msg);
        }
      }
    ).subscribe();

    subscription.current = channel;
    return () => { if (subscription.current) supabase.removeChannel(subscription.current); };
  }, [crewId, onNewMessage]);
}

// Realtime subscriptions for direct messages
export function useDirectMessagesRealtime(userId, partnerId, onNewMessage) {
  const subscription = useRef(null);

  useEffect(() => {
    if (!supabase || !userId || !partnerId || !onNewMessage) return;

    const channel = supabase.channel(`messages:${userId}:${partnerId}`, { config: { broadcast: { self: false } } });
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const msg = payload.new;
        if ((msg.sender_id === userId && msg.recipient_id === partnerId) || (msg.sender_id === partnerId && msg.recipient_id === userId)) {
          // Fetch full user profile for the sender
          if (msg.sender_id) {
            const { data: sender } = await supabase.from("profiles").select("id,name,avatar").eq("id", msg.sender_id).single();
            onNewMessage({ ...msg, sender });
          } else {
            onNewMessage(msg);
          }
        }
      }
    ).subscribe();

    subscription.current = channel;
    return () => { if (subscription.current) supabase.removeChannel(subscription.current); };
  }, [userId, partnerId, onNewMessage]);
}

// ---------------------------------------------------------------------------
// Comments — route discussion and per-pitch beta (migration 0065).
//
// target_id is the app's existing addressing scheme, passed through unchanged:
// "<route_id>" for the route discussion, "<route_id>__planner" etc. per sub-tab,
// and "<route_id>_pitch_<n>" for one pitch. See 0065_comments.sql.
//
// Rows are returned already shaped for the Comments component: it expects
// `userId`, `ts`, `parentId`, `likedByMe`. The author's display name and avatar
// come from the joined profile, so a comment shows a real identity instead of a
// hardcoded "You".
// ---------------------------------------------------------------------------

function dbCommentToCamel(row) {
  const p = row.profiles || {};
  return {
    id: row.id,
    targetId: row.target_id,
    userId: row.user_id,
    parentId: row.parent_id || undefined,
    text: row.deleted ? "" : row.text,
    edited: !!row.edited,
    deleted: !!row.deleted,
    likes: row.likes || 0,
    ts: row.created_at,
    // { "<user uuid>": "<reaction key>" } — the same shape group-post reactions already
    // use, so reactionCounts() in ClimbMatchCore.jsx counts these without a translation
    // step. Absent when the row came back from a write that did not ask for the embed.
    reactions: (row.comment_reactions || []).reduce((o, r) => { o[r.user_id] = r.reaction; return o; }, {}),
    authorName: p.name || "Climber",
    authorAvatar: p.avatar || null,
    authorUsername: p.username || null,
  };
}

export async function fetchComments(targetIds) {
  if (!supabase) return [];
  const ids = (Array.isArray(targetIds) ? targetIds : [targetIds]).filter(Boolean);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("comments")
    // Reactions ride along as an embed rather than a second round trip: a comment's rows
    // are capped at one per climber (migration 0096) so this cannot fan out.
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name,avatar,username),comment_reactions(user_id,reaction)")
    .in("target_id", ids)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(dbCommentToCamel);
}

// One query per route covering every surface at once — the six mount points share
// a route, so fetching them together avoids six round trips on one page.
export function useComments(targetIds) {
  const ids = (Array.isArray(targetIds) ? targetIds : [targetIds]).filter(Boolean);
  return useQuery({
    queryKey: ["comments", ids.slice().sort().join("|")],
    enabled: !!supabase && ids.length > 0,
    queryFn: () => fetchComments(ids),
  });
}

export async function addComment(targetId, userId, text, parentId = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("comments")
    .insert({ target_id: targetId, user_id: userId, text, parent_id: parentId })
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name,avatar,username)")
    .single();
  if (error) throw error;
  return dbCommentToCamel(data);
}

export async function editComment(id, text) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("comments").update({ text, edited: true }).eq("id", id)
    .select("id,target_id,user_id,parent_id,text,edited,deleted,likes,created_at,profiles(name,avatar,username)")
    .single();
  if (error) throw error;
  return dbCommentToCamel(data);
}

// Tombstone when the comment has replies so the thread below it survives; hard
// delete when it is a leaf. Mirrors what the in-memory version already did.
export async function deleteComment(id) {
  if (!supabase) return null;
  const { count, error: cErr } = await supabase
    .from("comments").select("id", { count: "exact", head: true }).eq("parent_id", id);
  if (cErr) throw cErr;
  if ((count || 0) > 0) {
    const { error } = await supabase
      .from("comments").update({ deleted: true, text: "" }).eq("id", id);
    if (error) throw error;
    return { id, tombstoned: true };
  }
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
  return { id, tombstoned: false };
}

// Counter only — see the NOTE ON LIKES in 0065_comments.sql. This cannot tell who
// liked what, so the caller keeps the viewer's own like in local state and this
// just moves the shared number.
export async function setCommentLike(id, liked, current = 0) {
  if (!supabase) return null;
  const next = Math.max(0, current + (liked ? 1 : -1));
  const { data, error } = await supabase
    .from("comments").update({ likes: next }).eq("id", id).select("id,likes").single();
  if (error) throw error;
  return data;
}

// Set, change, or clear this climber's reaction on one comment (migration 0096). Unlike
// `likes` above there is no counter to move: the row IS the reaction, so the count every
// reader sees is derived from rows and a client cannot inflate it.
//
// `reaction` of null clears — that is the UI's tap-the-one-you-already-gave toggle, and it
// is a delete rather than a third state so an aggregate never has to interpret an empty row.
export async function setCommentReaction(commentId, userId, reaction) {
  if (!supabase) return null;
  if (!reaction) {
    const { error } = await supabase.from("comment_reactions").delete()
      .eq("comment_id", commentId).eq("user_id", userId);
    if (error) throw error;
    return true;
  }
  // (comment_id, user_id) is the primary key, so changing your mind is an upsert on that
  // key rather than an insert that would collide with the reaction you already left.
  const { data, error } = await supabase.from("comment_reactions")
    .upsert({ comment_id: commentId, user_id: userId, reaction }, { onConflict: "comment_id,user_id" })
    .select().single();
  if (error) throw error;
  return data;
}

// Groups (migration 0090). Until now `GROUPS` was DEMO_FILLERS-gated — empty in production —
// and `createdGroups` was a useState array, so a group vanished on refresh and two climbers
// could never be in one.
//
// Returns every group I can see: RLS already allows public groups plus private ones I belong
// to, so there is no filter to add here. `mine` is what the UI needs to decide joined state,
// and it comes from the roster rather than a second query.
//
// SCOPE: membership only. Posts, events and the approval-to-join flow are not backed yet —
// `policy` is stored and rendered but nothing enforces it, so do not read it as a guarantee.
export function useMyGroups(userId) {
  return useQuery({
    queryKey: ["my-groups", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, blurb, location, disciplines, accent, policy, event_policy, visibility, created_by, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const groups = data || [];
      if (!groups.length) return [];
      const { data: mem, error: mErr } = await supabase
        .from("group_members").select("group_id, user_id, role")
        .in("group_id", groups.map((g) => g.id));
      if (mErr) throw mErr;
      const byGroup = {};
      (mem || []).forEach((m) => { (byGroup[m.group_id] = byGroup[m.group_id] || []).push(m); });
      return groups.map((g) => {
        const roster = byGroup[g.id] || [];
        const mine = roster.find((m) => m.user_id === userId) || null;
        return {
          _dbId: g.id, id: g.id, name: g.name, blurb: g.blurb || "", location: g.location || "",
          disciplines: g.disciplines || [], accent: g.accent || "", policy: g.policy,
          eventPolicy: g.event_policy, visibility: g.visibility,
          ownerId: g.created_by, memberIds: roster.map((m) => m.user_id),
          moderatorIds: roster.filter((m) => m.role !== "member").map((m) => m.user_id),
          joined: !!mine, myRole: mine ? mine.role : null, _db: true,
        };
      });
    },
  });
}

// The owner membership row is created by 0090's trigger, not here — doing it client-side
// leaves a window where a group exists with no owner, and the join policy pins role to
// 'member' so the creator could not add themselves as one afterwards.
export async function createGroupRow(userId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("groups").insert({
    name: fields.name, blurb: fields.blurb || null, location: fields.location || null,
    disciplines: fields.disciplines || [], accent: fields.accent || null,
    policy: fields.policy || "open", event_policy: fields.eventPolicy || "anyone",
    visibility: fields.visibility || "public", created_by: userId,
  }).select().single();
  if (error) throw error;
  return data;
}

// role is left to the column default: the RLS policy requires 'member', and a client-supplied
// value is one more thing that can drift from it.
export async function joinGroupRow(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").insert({ group_id: groupId, user_id: userId }).select().single();
  if (error && error.code !== "23505") throw error;
  return data || null;
}

export async function leaveGroupRow(groupId, userId) {
  if (!supabase) return null;
  const { error } = await supabase
    .from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
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
  return data[0];
}

export async function removeGroupMember(groupId, userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)
    .select("group_id, user_id");
  if (error) throw error;
  if (!data || data.length !== 1) throw new Error("not permitted");
  return data[0];
}

// Saved searches (migration 0091). Were React state only — the UI showed them with delete
// buttons in two places, i.e. the affordances of storage with no storage behind them.
// Private by policy; there is no sharing concept.
export function useMySavedSearches(userId) {
  return useQuery({
    queryKey: ["my-saved-searches", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_searches").select("id, name, query, created_at")
        .eq("user_id", userId).order("created_at", { ascending: true });
      if (error) throw error;
      // The stored query is spread back to the flat shape the UI already uses, so callers do
      // not have to know a row ever went through the database.
      return (data || []).map((s) => ({ _dbId: s.id, id: s.id, name: s.name, ...(s.query || {}) }));
    },
  });
}

// `query` is stored opaquely: the filter shape has changed repeatedly, and pinning today's
// keys into columns would guarantee a migration the next time it moves.
export async function createSavedSearchRow(userId, name, query) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("saved_searches").insert({ user_id: userId, name, query: query || {} })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteSavedSearchRow(rowId) {
  if (!supabase) return null;
  const { error } = await supabase.from("saved_searches").delete().eq("id", rowId);
  if (error) throw error;
  return true;
}

// Custom route lists (migration 0092). "My Objectives" (`ul_obj`) is NOT stored here — it
// stays owned by the `objectives` table, so there is exactly one writer per fact.
//
// Only own lists are fetched. The select policy also permits reading anyone's `shared` list,
// but nothing in the UI browses other people's lists yet, so asking for them would be
// fetching data no screen renders.
export function useMyLists(userId) {
  return useQuery({
    queryKey: ["my-lists", userId],
    enabled: !!supabase && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_lists").select("id, name, icon, route_ids, shared, created_at")
        .eq("user_id", userId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((l) => ({
        _dbId: l.id, id: l.id, name: l.name, icon: l.icon || "",
        routeIds: l.route_ids || [], shared: !!l.shared,
      }));
    },
  });
}

export async function createListRow(userId, fields) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("user_lists").insert({
    user_id: userId, name: fields.name, icon: fields.icon || null,
    route_ids: fields.routeIds || [], shared: !!fields.shared,
  }).select().single();
  if (error) throw error;
  return data;
}

// Partial patch — the three call sites each change one thing (routeIds, or shared), and
// sending the whole row would let a stale copy clobber a concurrent edit.
export async function updateListRow(rowId, fields) {
  if (!supabase) return null;
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.icon !== undefined) patch.icon = fields.icon;
  if (fields.routeIds !== undefined) patch.route_ids = fields.routeIds;
  if (fields.shared !== undefined) patch.shared = !!fields.shared;
  const { data, error } = await supabase
    .from("user_lists").update(patch).eq("id", rowId).select().single();
  if (error) throw error;
  return data;
}

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
  return data;
}

export async function rejectNewRoute(contributionId, note) {
  if (!supabase) return null;
  const { error } = await supabase.rpc("reject_new_route", { p_contribution_id: contributionId, p_note: note || null });
  if (error) throw error;
  return true;
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

// So the sheet can say "you already have one open" rather than silently stacking duplicates.
export async function myOpenDataRequests(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from("data_requests").select("id,kind,status,created_at")
    .eq("user_id", userId).eq("status", "open").order("created_at", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return data || [];
}
