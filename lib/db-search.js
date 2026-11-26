// lib/db-search.js — search: places, regions, home state, and route search.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { ROUTE_AREA_EMBED } from "./offline";
import { searchBare, searchCanon, searchNorm, searchTokens, splitPlaceSpellings } from "./search";
import { holdWhileTyping, useDebouncedTerm, withPending } from "./db-shared.js";
import { useStates } from "./db-catalog-more.js";
import { useMyZip } from "./db-profile.js";
import { dbRouteToCamel } from "./db-route-row.js";

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
// Every string here is CANONICAL (lib/search.js): "Mt. Goode" and "Mount Goode" are both
// "mount goode", so "mt goode" is an exact match for either rather than a miss (0190).
function routeSearchScore(row, needle) {
  const rn = searchCanon((row && row.name) || "");
  const an = searchCanon((row && row.areas && row.areas.name) || "");
  // Climbers type the peak, not the honorific: "Goode" should reach both "Mount Goode"
  // and "Mt. Goode" ahead of a mid-word hit on "Johnny B. Goode".
  const ap = searchBare(an);
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
// The only honest tie-break is evidence about the climber, and the app has three pieces: the
// home area on their profile, failing that the zip they saved for partner search, and failing
// both the browser's time zone, which narrows it to a few states (see useMyHomeStatePaths). A climber in Washington typing "chimney rock" means the Alpine
// Lakes one; a climber in Idaho does not, and showing them Washington's would be the same
// mistake pointed the other way. So this decides ORDER AMONG NAMESAKES ONLY — it never
// changes a score and never promotes a worse text match. Only a browser reporting no time
// zone this table knows (outside the US and Canada) gets namesakes ordered by size alone.
//
// Deliberately NOT plumbed through props: the four boxes fed by useRouteSearch live in four
// components (GiveVouch, PartnerSearch, AddRoute, CrewFinder) and none of them
// holds the profile. Threading it through all four to reach one ranking decision is a lot of
// wiring to go wrong, and a prop that four call sites must remember to pass is a prop three of
// them will eventually forget.
const REGION_ABBR = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia", AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut" };
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
// THE STATE OR PROVINCE A FREE-TEXT PLACE NAMES, as its full name — "Seattle, WA", "Seattle,
// Washington" and "Washington" all give "Washington". Groups store their location as typed, so
// the Groups screen reads its region through this to search and browse by STATE: a city chip
// only ever reached the climber's own town, and typing "Washington" never found "Seattle, WA".
// Same order of tests as homeStatePath: the trailing abbreviation first, then the longest name.
export function regionOfPlace(location) {
  const loc = String(location || "").trim();
  if (!loc) return null;
  const tail = loc.split(",").pop().trim();
  if (/^[A-Z]{2}$/.test(tail) && REGION_ABBR[tail]) return REGION_ABBR[tail];
  // "Kansas City, Missouri": the last part names the region, whatever an earlier part contains.
  const named = Object.values(REGION_ABBR).find((n) => n.toLowerCase() === tail.toLowerCase());
  if (named) return named;
  const low = loc.toLowerCase();
  const names = Object.values(REGION_ABBR).filter((n) => new RegExp("(^|[^a-z])" + n.toLowerCase() + "($|[^a-z])").test(low));
  names.sort((a, b) => b.length - a.length);
  return names[0] || null;
}
// The two-letter code for a full region name, so a search for "WA" finds a group that typed "Washington".
export function regionAbbr(name) {
  return Object.keys(REGION_ABBR).find((k) => REGION_ABBR[k] === name) || null;
}
// Every state and province, for the group form's "enter a place yourself" picker: the US (with DC)
// first, then Canada, each in REGION_ABBR's order.
export const PLACE_REGION_LIST = Object.keys(REGION_ABBR).map((abbr) => ({ abbr, name: REGION_ABBR[abbr], country: ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "YT", "NT", "NU"].indexOf(abbr) >= 0 ? "Canada" : "United States" }));
// A full region name when `name` is one, else null: the first step of a catalog pick's trail is its
// state, but only when the catalog filed it under one the region table knows.
export function knownRegion(name) {
  return Object.values(REGION_ABBR).find((n) => n === name) || null;
}
// THE STATE A GROUP IS FILED UNDER (0516): the state of the catalog area it climbs at, when it picked
// one, else whatever its typed location names. The database's `groups.region` is the same rule;
// this is for the groups the browser holds itself (examples, and one made before its row is read).
export function groupRegionOf(g) {
  if (!g) return null;
  return g.region || g.areaRegion || regionOfPlace(g.location);
}
// A typed place as the group form's two boxes hold it: "Squamish, BC" is { place: "Squamish", abbr: "BC" },
// "Moab, Utah" is { place: "Moab", abbr: "UT" }, and "North Cascades" is { place: "North Cascades", abbr: "" }.
export function splitTypedPlace(location) {
  const loc = String(location || "").trim();
  const parts = loc.split(",");
  const tail = parts.length > 1 ? parts.pop().trim() : "";
  const head = parts.join(",").trim();
  if (/^[A-Z]{2}$/.test(tail) && REGION_ABBR[tail]) return { place: head, abbr: tail };
  const named = tail && Object.keys(REGION_ABBR).find((k) => REGION_ABBR[k].toLowerCase() === tail.toLowerCase());
  if (named) return { place: head, abbr: named };
  return { place: loc, abbr: regionAbbr(regionOfPlace(loc)) || "" };
}
// THE ZIP IS THE SECOND PIECE OF EVIDENCE. A climber who never filled in "home area" but saved a
// zip for partner search has still told us where they live, and without it every namesake was
// ordered by size: "pinnacle peak" showed 28 Arizona routes and 1 of Washington's 3, "chimney
// rock" none of Washington's at all. The first three digits of a US zip fix its state (USPS
// assigns them by state), so this needs no lookup. Owner-only, like the zip: it never leaves
// the climber's own search. Ranges are [first, last, state]; gaps are unassigned or territories.
const ZIP3_STATE = [[5, 5, "NY"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"], [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"], [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"], [201, 201, "VA"], [202, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"], [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 459, "OH"], [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"], [569, 569, "DC"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"], [730, 732, "OK"], [733, 733, "TX"], [734, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"], [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"]];
export function zipState(zip) {
  const z = String(zip || "");
  if (!/^[0-9]{5}$/.test(z)) return null;
  const n = Number(z.slice(0, 3));
  const hit = ZIP3_STATE.find((r) => n >= r[0] && n <= r[1]);
  return hit ? REGION_ABBR[hit[2]] : null;
}
// THE TIME ZONE IS THE LAST PIECE, AND THE ONLY ONE A SIGNED-OUT VISITOR HAS. The browser
// reports its IANA zone without asking, and a zone narrows the states to a handful: a phone set
// to America/Los_Angeles is in Washington, Oregon, California or Nevada, not Arizona (which has
// its own zone). It cannot pick ONE state, so it returns every state the zone covers and each is
// treated as home; among those, size still decides. Weaker than a home area or a zip, so it is
// read only when neither exists — and it never leaves the browser.
const TZ_STATES = {
  "America/Los_Angeles": ["WA", "OR", "CA", "NV"], "America/Boise": ["ID"], "America/Phoenix": ["AZ"],
  "America/Denver": ["CO", "UT", "WY", "MT", "NM", "ID"], "America/Anchorage": ["AK"], "Pacific/Honolulu": ["HI"],
  "America/Chicago": ["IL", "WI", "MN", "IA", "MO", "AR", "LA", "MS", "AL", "OK", "KS", "NE", "SD", "ND", "TX", "TN"],
  "America/New_York": ["NY", "NJ", "PA", "CT", "RI", "MA", "VT", "NH", "ME", "DE", "MD", "DC", "VA", "WV", "NC", "SC", "GA", "FL", "OH", "MI", "KY", "TN", "IN"],
  "America/Detroit": ["MI"], "America/Vancouver": ["BC"], "America/Edmonton": ["AB"], "America/Regina": ["SK"],
  "America/Winnipeg": ["MB"], "America/Toronto": ["ON", "QC"], "America/Montreal": ["QC"], "America/Halifax": ["NS", "NB", "PE"],
  "America/Moncton": ["NB"], "America/St_Johns": ["NL"], "America/Whitehorse": ["YT"],
};
// Zones that are one state under a family prefix: America/Indiana/Indianapolis, America/Juneau…
const TZ_PREFIX_STATE = [["America/Indiana/", "IN"], ["America/Kentucky/", "KY"], ["America/North_Dakota/", "ND"],
  ["America/Juneau", "AK"], ["America/Sitka", "AK"], ["America/Nome", "AK"], ["America/Yakutat", "AK"], ["America/Metlakatla", "AK"]];
export function timeZoneStatePaths(tz, states) {
  if (!tz || !Array.isArray(states) || !states.length) return [];
  const pre = TZ_PREFIX_STATE.find((p) => String(tz).startsWith(p[0]));
  const abbrs = TZ_STATES[tz] || (pre ? [pre[1]] : []);
  return abbrs.map((a) => homeStatePath(REGION_ABBR[a], states)).filter(Boolean);
}
function browserTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
}
// Every state counted as home, most specific evidence first: the profile's home area, else the
// saved zip, else the browser's time zone. [] when there is none of the three.
export function useMyHomeStatePaths() {
  const { data: states } = useStates();
  const one = useMyHomeStatePath();
  return one ? [one] : timeZoneStatePaths(browserTimeZone(), states);
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
  // The same hook, and so the same cache entry and body, that partner search reads the zip with.
  const { data: zip } = useMyZip(uid);
  return homeStatePath(loc, states) || homeStatePath(zip && zipState(zip.zip), states);
}

// A PLACE NAME IS A WAY TO PICK A CLIMB, AND THE COMMON ONES NAME A HUNDRED PLACES. There are
// 133 areas called "Main Wall" (nine in Washington: Mount Erie's, Minnehaha's, Dishman's...),
// 52 "East Face", 52 "West Face". Typing one used to return thirty routes from six states, every
// row labelled "Main Wall (California)" or "Main Wall (Washington)", with "keep typing to narrow"
// under them — and nothing to type, because "erie main wall" asked for a ROUTE named "main wall"
// on Erie and found none. So a place is found on its own terms, two ways:
//   - its whole name: "main wall" -> every Main Wall, home states first, then by size;
//   - a place it sits under, plus its name, either order: "erie main wall", "main wall dishman",
//     "rocks of sharon east face" (a grandparent works — it is a path prefix, not a parent test).
// Exact names only, compared on name_search, so "mt erie" is Mount Erie and "the main wall" is
// "Main Wall, The"; a loose match would let "wall" stand for every wall in the catalog.
const PLACE_SEL = "id,name,path,area_type,route_count,parent:parent_id(name)";
export function placeSpellings(words) {
  const p = words.join(" ");
  return [...new Set([p, "mount " + p, "the " + p, p + " the"].map(searchNorm))];
}
// ONE REQUEST FOR SEVERAL SUBTREES. "The areas with routes under X" was asked once per matched
// area, per found ancestor and per typo hit — 17 of the 30 requests "cathedral rock" cost and
// 18 of "erie main wall"'s 29 (scripts/oneoff/replay-route-search.mjs) — and the only thing
// that needed each to be its own request was its own cap. ltree `cd` works inside `or`, so
// every subtree is fetched at once and each parent's cap is applied on the way out, in the
// parent's order, with `keep` standing in for the per-parent filters the old requests carried:
// a caller sees exactly the rows its own request returned. The server answers at most 1000
// rows, and a combined answer that reaches that ceiling could have lost a small subtree's
// rows behind a big one's, so that case falls back to one request per parent. `sel` must
// carry `path`. The result is aligned with `parents`: an entry without a path gets [].
const underPath = (p, h) => p === h || String(p || "").startsWith(h + ".");
async function areasUnder(db, parents, { sel, cap, bySize = false, build = (b) => b, keep = () => true }) {
  const rowsFor = (rows, p) => rows.filter((a) => underPath(a.path, p.path) && keep(a, p)).slice(0, cap);
  const run = (b) => { b = build(b.gt("route_count", 0)); return (bySize ? b.order("route_count", { ascending: false }) : b).limit(1000); };
  const ps = parents.filter((p) => p && p.path);
  if (!ps.length) return parents.map(() => []);
  const all = await run(db.from("areas").select(sel).or([...new Set(ps.map((p) => p.path))].map((p) => `path.cd.${p}`).join(",")));
  if (all.error) throw all.error;
  let byParent;
  if ((all.data || []).length < 1000) byParent = ps.map((p) => rowsFor(all.data || [], p));
  else {
    const each = await Promise.all(ps.map((p) => run(db.from("areas").select(sel).filter("path", "cd", p.path))));
    byParent = each.map((r, i) => { if (r.error) throw r.error; return rowsFor(r.data || [], ps[i]); });
  }
  let i = 0;
  return parents.map((p) => (p && p.path ? byParent[i++] : []));
}
export async function findPlaces(toks, atHome = () => false, db = supabase) {
  if (!db || !toks.length || toks.join("").length < 3) return [];
  const cuts = [];
  if (toks.length <= 6) for (let i = 1; i < toks.length; i++) {
    cuts.push({ anc: toks.slice(0, i), kid: toks.slice(i) });
    cuts.push({ anc: toks.slice(i), kid: toks.slice(0, i) });
  }
  for (const c of cuts) { c.ancS = placeSpellings(c.anc); c.kidS = placeSpellings(c.kid); }
  // A NAME THAT CONTAINS THE WORDS, after the names that ARE them (walkthrough 2026-11-18: "yosemite"
  // and "joshua tree" found nothing, because the places are "Yosemite National Park" (3,234 climbs) and
  // "Joshua Tree National Park" (8,238): every leg above wants the WHOLE name). Every typed word, in
  // any spelling, somewhere in `name_search` (the trigram index, areas_name_search_trgm), busiest
  // first, 30 at most. Measured on the live catalog: 85–200 ms for a place name, ~1 s for a word on
  // thousands of names ("rock", "wall"). It is an extra: a slow or failed read drops it, never the search.
  let containsQ = db.from("areas").select(PLACE_SEL).gt("route_count", 0);
  for (const t of toks) containsQ = containsQ.ilike("name_search", "%" + t + "%");
  const [whole, ancs, contains] = await Promise.all([
    db.from("areas").select(PLACE_SEL).in("name_search", placeSpellings(toks)).gt("route_count", 0).order("route_count", { ascending: false }).limit(200),
    cuts.length ? db.from("areas").select("id,name,path,name_search").in("name_search", [...new Set(cuts.flatMap((c) => c.ancS))]).limit(200) : { data: [] },
    containsQ.order("route_count", { ascending: false }).limit(30).then((r) => r, () => ({ data: [] })),
  ]);
  if (whole.error) throw whole.error;
  if (ancs.error) throw ancs.error;
  // One ask per (ancestor, cut), scoped to the ancestor's subtree, so a name shared by a
  // thousand areas still costs only the few under the place the climber named — and all the
  // asks go in ONE request (areasUnder), each keeping its own cap of 20 and its own cut's names.
  const asks = [];
  for (const c of cuts) for (const a of (ancs.data || []).filter((x) => c.ancS.includes(x.name_search)).slice(0, 8))
    asks.push({ a, path: a.path, kidS: c.kidS });
  const kids = await areasUnder(db, asks, {
    sel: PLACE_SEL + ",name_search", cap: 20,
    build: (b) => b.in("name_search", [...new Set(asks.flatMap((x) => x.kidS))]),
    keep: (k, ask) => k.id !== ask.a.id && ask.kidS.includes(k.name_search),
  });
  const seen = new Set(), out = [];
  kids.forEach((rows, i) => {
    for (const { name_search, ...k } of rows) if (!seen.has(k.id)) { seen.add(k.id); out.push({ ...k, via: asks[i].a.name }); }
  });
  const named = (whole.data || []).filter((a) => !seen.has(a.id));
  named.sort((x, y) => (atHome(y) ? 1 : 0) - (atHome(x) ? 1 : 0)); // stable: size order within each
  for (const a of named) seen.add(a.id);
  // Words that START a word in the name rank above a match inside one ("café" → "Cafe Wonderland"
  // before "McAfee's Knob"); busiest first within each (the read's own order, kept by a stable sort).
  const wordStart = (a) => { const ns = " " + searchNorm(a.name) + " "; return toks.every((t) => ns.includes(" " + t)) ? 0 : 1; };
  const near = contains.error ? [] : (contains.data || []).filter((a) => !seen.has(a.id)).sort((x, y) => wordStart(x) - wordStart(y));
  return [...out, ...named, ...near];
}

// The places a picker lists above its routes, labelled so namesakes can be told apart:
// "Main Wall" · "Mount Erie, Washington" · 28 routes. `total` is how many matched before the cap.
export function usePlaceSearch(q, lim = 5) {
  const [qq, typing] = useDebouncedTerm((q || "").trim());
  const homeStates = useMyHomeStatePaths();
  const { data: states } = useStates();
  return withPending(useQuery({
    queryKey: ["place-search", qq, lim, homeStates.join(","), (states || []).length],
    enabled: !!supabase && !!qq,
    placeholderData: holdWhileTyping(qq),
    retry: false,
    queryFn: async () => {
      const under = (a, h) => a.path === h || String(a.path || "").startsWith(h + ".");
      const rows = await findPlaces(searchTokens(qq), (a) => homeStates.some((h) => under(a, h)));
      const stateOf = (a) => ((states || []).find((s) => under(a, s.path)) || {}).name || "";
      return { total: rows.length, rows: rows.slice(0, lim).map((a) => {
        const parent = a.parent && a.parent.name, st = stateOf(a);
        return { ...a, where: [parent && parent !== st ? parent : "", st].filter(Boolean).join(", ") };
      }) };
    },
  }), typing);
}

// TOWNS FOR THE HOME CITY BOX (0544): `places_search` over the town catalog (US Census places,
// GNIS hamlets, Canadian municipalities), best first, the climber's chosen state/province ahead of
// namesakes elsewhere. A failed read is an ERROR the box must say ("couldn't search towns"), never
// "no such town": the query rejects rather than resolving to [].
export async function searchHomeTowns(q, st, lim = 8) {
  const { data, error } = await supabase.rpc("places_search", { q, st: st || null, lim });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}
export function useHomeTowns(q, st, lim = 8) {
  const [qq, typing] = useDebouncedTerm((q || "").trim());
  return withPending(useQuery({
    queryKey: ["home-towns", qq, st || "", lim],
    enabled: !!supabase && qq.length >= 2,
    placeholderData: holdWhileTyping(qq),
    retry: false,
    staleTime: 10 * 60 * 1000,
    queryFn: () => searchHomeTowns(qq, st, lim),
  }), typing);
}

// PICKING A ROUTE BY TYPING ITS PEAK must list the whole peak. The default 8 is a typeahead's
// size, and a peak's routes all score alike (90, "area named exactly that"), so the cut among
// them is arbitrary: "mount shuksan" returned 8 of its 11 and dropped Sulphide Glacier, its most
// climbed route — a climber looking for a partner on it was told it did not exist. Partners and
// Join-a-crew pass this; their own name filter drops the unrelated rows a bigger cap lets in.
export const ROUTE_PICK_LIM = 30;

// THE WHOLE SEARCH IS A PLAIN ASYNC FUNCTION, so it can be replayed outside the browser.
// Every leg, cap and tier below was measured on the live catalog before it shipped (see the
// notes at each one), and the only way to keep that true across a change is to replay the
// function as it is: scripts/oneoff/replay-route-search.mjs runs it against the live catalog
// with a counting client and prints, per query, how many requests it cost and what the top
// rows were. The hook below only debounces, keys and holds. `homeStates` is what
// useMyHomeStatePaths returns (ltree paths of the climber's home states); `db` is the client.
export async function searchRoutesFor(qq, lim, homeStates, db = supabase) {
  if (!db || !qq) return [];
  const SEL = ROUTE_AREA_EMBED;
  const needle = searchCanon(qq);
  // WORDS, NOT A PHRASE (0190). Each leg requires every typed word somewhere in
  // `name_search`, which carries every spelling of each word — so "mt baker", "baker mt",
  // "Mount Baker" and "mount-baker" are one query, and "bobs wall" reaches "Bob's Wall".
  // It used to be `ilike("name", "%mt baker%")`: one verbatim substring, which found a
  // highway called "Bellingham and Mt Baker Hwy" and never the mountain.
  const toks = searchTokens(qq);
  if (!toks.length) return [];
  const words = (b) => toks.reduce((acc, t) => acc.ilike("name_search", `%${t}%`), b);
  // The prefix leg's job is to put rows whose name STARTS with the query in front of the
  // scorer. `name_search` leads with each word's canonical form, so the first word is
  // matched canonically ("mt baker" -> "mount%") OR as typed — "st" may be the start of
  // "Stuart", not "saint", and must not be rewritten into a word the climber never meant.
  const firstForms = [...new Set([toks[0], searchCanon(toks[0])])];
  const startsWith = (b) => b.or(firstForms.map((f) => `name_search.ilike.${f}%`).join(","));
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
  // PEAK AND ROUTE IN ONE BOX. Every leg above asks for ALL the typed words in ONE name, so
  // "stuart west ridge" needs a route called that or an area called that, and there is
  // neither: it returned thirty West Ridges on other peaks and not Mount Stuart's, and
  // "mount stuart west ridge" fell through to the typo fallback and listed Stuart's 14
  // routes in no order. Climbers type exactly this when picking a climb to find partners on.
  //
  // So also try each way of cutting the words into a PLACE and a ROUTE, either order
  // ("stuart west ridge", "west ridge stuart"). The place side must name the area outright —
  // its own words, or those words after "Mount" or "The" — compared on `name_search`, so
  // "mt stuart" and "Mount Stuart" are one place. A loose substring would let "west" stand
  // for every West Face in the catalog and cost a second per keystroke on common words; the
  // exact match keeps each cut to a few rows. Measured over every WA area name and common
  // route name before shipping: see the PR.
  //
  // Scored 77-79: under a route-name PREFIX hit (80), so a query that already named a route
  // ranks as before; over everything a full-query leg finds only by a stray word.
  const splits = [];
  if (toks.length >= 2 && toks.length <= 6) {
    for (let i = 1; i < toks.length; i++) {
      splits.push({ place: toks.slice(0, i), route: toks.slice(i) });
      splits.push({ place: toks.slice(i), route: toks.slice(0, i) });
    }
  }
  // TWO STEPS, NOT ONE JOIN. Filtering routes through an `areas!inner` embed lets the planner
  // scan routes for the ROUTE words first — and a route side of "c" or "the" is most of the
  // 200k-row table: measured, it hit the statement timeout and failed the whole search box.
  // So find the places first (one exact lookup for every cut), then ask for routes only in
  // the areas that exist, by area_id. Most cuts name no place and cost nothing.
  // Also the place half plus a dropped landform word: "liberty bell" names Liberty Bell Mountain.
  for (const s of splits) s.spellings = splitPlaceSpellings(s.place);
  const splitAreasP = splits.length
    ? db.from("areas").select("id,path,name_search").in("name_search", [...new Set(splits.flatMap((s) => s.spellings))]).limit(1000)
    : Promise.resolve({ data: [] });
  const splitP = splitAreasP.then((res) => {
    if (res.error) throw res.error;
    return Promise.all(splits.map((s) => {
      s.areas = (res.data || []).filter((a) => s.spellings.includes(a.name_search));
      if (!s.areas.length) return { data: [] };
      return s.route.reduce((acc, t) => acc.ilike("name_search", `%${t}%`),
        db.from("routes").select(SEL).in("area_id", s.areas.map((a) => a.id))).limit(lim * 2);
    }));
  });
  // A PLACE UNDER A PLACE: "erie main wall" names no route and no single area, so the cuts
  // above find nothing — the "main wall" side is an AREA under Mount Erie, not a route name.
  // findPlaces (above) resolves it; its routes, the whole subtree's when it is a container,
  // score as a split hit that named its route outright. `_placeHint` carries the ancestor's
  // name to the picker, whose own text filter would otherwise drop a row whose route and
  // area names never mention "Erie".
  const viaP = findPlaces(toks, undefined, db).then(async (places) => {
    const vias = places.filter((p) => p.via).slice(0, 3);
    const kids = await areasUnder(db, vias, { sel: "id,path", cap: 200 });
    return Promise.all(vias.map(async (p, i) => {
      const res = await db.from("routes").select(SEL).in("area_id", kids[i].map((k) => k.id)).limit(lim);
      if (res.error) throw res.error;
      return { p, rows: res.data || [] };
    }));
  });
  // The two legs above are awaited further down. If a leg awaited BEFORE them fails, the search
  // has already failed through that await, and a side leg's own rejection must not surface a
  // second time as an unhandled rejection: the handler here only swallows what nobody is left
  // to hear — the later awaits still see the rejection.
  const sideLegs = [splitP, viaP];
  for (const p of sideLegs) p.catch(() => {});
  // ONE OR TWO LETTERS ARE A PREFIX, NOT A SUBSTRING. The substring legs lean on the trigram
  // index on name_search, and a pattern under three characters cannot use it: "%d%" scans all
  // 58k areas and sorts every match by size. It was the leg that hit the statement timeout and
  // failed the whole box for "D" whenever the database was busy, while every other leg
  // answered in under a second. Names CONTAINING a "d" are no answer to typing "d" anyway —
  // names starting with it are, and the prefix and exact legs still run.
  const tooShort = toks.join("").length < 3;
  const [byPrefix, byName, areaHit, areaExact] = await Promise.all([
    words(startsWith(db.from("routes").select(SEL))).limit(lim * 2),
    tooShort ? { data: [] } : words(db.from("routes").select(SEL)).limit(lim * 2),
    tooShort ? { data: [] } : words(db.from("areas").select("id,name,path")).order("route_count", { ascending: false }).limit(5),
    // Exact = the same words in any spelling: name_search is a pure function of the words,
    // so equal name_search means "Mt. Baker" and "mount baker" name the same place.
    db.from("areas").select("id,name,path").eq("name_search", searchNorm(qq)).order("route_count", { ascending: false }).limit(25),
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
  const kids = await areasUnder(db, matched.slice(0, 3), { sel: "id,path", cap: 25, bySize: true });
  const descIds = [];
  for (const k of kids) for (const a of k) if (!matchedIds.includes(a.id) && !descIds.includes(a.id)) descIds.push(a.id);
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
  const home = homeStates.length > 0;
  const atHome = (a) => homeStates.some((h) => a.path === h || String(a.path || "").startsWith(h + "."));
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
  // ONE QUERY PER HOME NAMESAKE, and their rows dealt out in turn. A signed-out visitor's
  // time zone names several home states, so "home" can hold California's three Grottos AND
  // Washington's: cutting to three by route_count, then pooling them under one cap, handed
  // every slot to California and never asked for Washington's (measured, Pacific time:
  // "Grotto, The" 7 of 7 -> 0, "Eagle Peak", "Boulder B" likewise). Dealt in turn, tied
  // scores keep each namesake on the page. With one home state this is the old query.
  const homeExactIds = (areaExact.data || []).filter(atHome).map((a) => a.id).slice(0, 6);
  const exactIds = (areaExact.data || []).filter((a) => !atHome(a)).filter(unclaimed).map((a) => a.id).slice(0, 5);
  const [byMatched, byDesc, byExact, ...byHomeEach] = await Promise.all([
    matchedIds.length ? db.from("routes").select(SEL).in("area_id", matchedIds).limit(lim * 2) : { data: [] },
    descIds.length ? db.from("routes").select(SEL).in("area_id", descIds).limit(lim * 2) : { data: [] },
    exactIds.length ? db.from("routes").select(SEL).in("area_id", exactIds).limit(lim * 2) : { data: [] },
    ...homeExactIds.map((id) => db.from("routes").select(SEL).eq("area_id", id).limit(lim)),
  ]);
  if (byMatched.error) throw byMatched.error;
  if (byDesc.error) throw byDesc.error;
  if (byExact.error) throw byExact.error;
  for (const res of byHomeEach) if (res.error) throw res.error;
  const byHomeExact = { data: [] };
  for (let i = 0; byHomeEach.some((res) => i < (res.data || []).length); i++)
    for (const res of byHomeEach) if (i < (res.data || []).length) byHomeExact.data.push(res.data[i]);
  const byArea = { data: [...(byHomeExact.data || []), ...(byExact.data || []), ...(byMatched.data || []), ...(byDesc.data || [])] };
  // A split hit's score: 79 when the route side IS the route's name, 78 when it starts it,
  // 77 otherwise; a namesake in the climber's own state wins a tie, as everywhere above.
  const splitScore = new Map(), splitRows = [];
  (await splitP).forEach((res, i) => {
    if (res.error) throw res.error;
    const rq = searchCanon(splits[i].route.join(" "));
    for (const r of res.data || []) {
      const rn = searchCanon(r.name || "");
      const a = splits[i].areas.find((x) => x.id === r.area_id);
      const s = (rn === rq ? 79 : rn.startsWith(rq) ? 78 : 77) + (a && atHome(a) ? 0.5 : 0);
      if (s > (splitScore.get(r.id) || 0)) splitScore.set(r.id, s);
      splitRows.push(r);
    }
  });
  const placeHint = new Map();
  for (const { p, rows } of await viaP) for (const r of rows) {
    if (79 + (atHome(p) ? 0.5 : 0) > (splitScore.get(r.id) || 0)) splitScore.set(r.id, 79 + (atHome(p) ? 0.5 : 0));
    if (!placeHint.has(r.id)) placeHint.set(r.id, p.via);
    splitRows.push(r);
  }
  // Prefix rows first, so a duplicate id is kept from the leg that guarantees a high tier.
  const seen = new Set(), merged = [];
  for (const r of [...(byPrefix.data || []), ...(byName.data || []), ...(byArea.data || []), ...splitRows]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id); merged.push(r);
  }
  // A TYPO GETS A SECOND CHANCE, AND ONLY A TYPO. "mt rainer", "shucksan", "forbiden":
  // when no leg found a single row, ask search_names_fuzzy (0190, trigram word similarity)
  // for the nearest names instead of printing nothing. Never blended into a query that
  // matched — a near-miss must not displace a real hit. Every such row scores the scorer's
  // floor, so the similarity order set here survives the stable sort below. Not for one or
  // two letters: there is no typo in "d", and trigram similarity on it timed out too.
  if (!merged.length && !tooShort) {
    const fz = await db.rpc("search_names_fuzzy", { q: qq, lim });
    if (fz.error) throw fz.error;
    const simOf = new Map(); // route id -> the similarity that brought it in
    const fzAreas = (fz.data || []).filter((x) => x.kind === "area").slice(0, 3);
    const fzRoutes = (fz.data || []).filter((x) => x.kind === "route");
    for (const x of fzRoutes) simOf.set(x.id, Number(x.sim) || 0);
    // A matched area is usually a CONTAINER with no direct routes (see the expansion note
    // above), so reach its populated descendants the same way.
    const fzKids = await areasUnder(db, fzAreas, { sel: "id,path", cap: 25, bySize: true });
    const areaSim = new Map();
    fzKids.forEach((k, i) => {
      for (const a of k) if (!areaSim.has(a.id)) areaSim.set(a.id, Number(fzAreas[i].sim) || 0);
    });
    const [byFzRoute, byFzArea] = await Promise.all([
      fzRoutes.length ? db.from("routes").select(SEL).in("id", fzRoutes.map((x) => x.id)) : { data: [] },
      areaSim.size ? db.from("routes").select(SEL).in("area_id", [...areaSim.keys()]).limit(lim * 2) : { data: [] },
    ]);
    if (byFzRoute.error) throw byFzRoute.error;
    if (byFzArea.error) throw byFzArea.error;
    const sim = (r) => Math.max(simOf.get(r.id) || 0, areaSim.get(r.area_id) || 0);
    for (const r of [...(byFzRoute.data || []), ...(byFzArea.data || [])]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id); merged.push(r);
    }
    merged.sort((a, b) => sim(b) - sim(a));
  }
  const scoreOf = (r) => Math.max(routeSearchScore(r, needle), splitScore.get(r.id) || 0);
  merged.sort((a, b) => scoreOf(b) - scoreOf(a));
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
    const an = searchCanon((r.areas && r.areas.name) || "");
    return an === needle || searchBare(an) === needle;
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
  // SAY WHICH ONE. Every row carries its place, area and the levels above it plus the state
  // (dbRouteToCamel builds `_dbArea.chain`, routePlaceDb prints it), so every surface that
  // lists these rows names where each one is. This used to append a region to the area name
  // only when two areas in ONE result set shared a name: two "North Ridge" routes on peaks
  // with different names got nothing, and no row ever said which state it was in (owner,
  // 2026-11-24: on any search by route, show exactly where it is).
  const out = ranked.slice(0, lim);
  return out.map((r) => placeHint.has(r.id) ? { ...dbRouteToCamel(r), _placeHint: placeHint.get(r.id) } : dbRouteToCamel(r));
}
export function useRouteSearch(q, lim = 8) {
  const [qq, typing] = useDebouncedTerm((q || "").trim());
  const homeStates = useMyHomeStatePaths();
  return withPending(useQuery({
    queryKey: ["route-search", qq, lim, homeStates.join(",")],
    enabled: !!supabase && !!qq,
    placeholderData: holdWhileTyping(qq),
    queryFn: () => searchRoutesFor(qq, lim, homeStates),
  }), typing);
}
