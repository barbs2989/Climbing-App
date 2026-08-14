// The DB-catalog area finder: state picker -> drill-down area pages -> Route
// finder / Near-me map / Objectives / "View all N routes". Deliberately mirrors
// the static catalog's AreaBrowse -> AreaView -> RouteFinder/OverviewMap chain
// (same layout, copy, and C-palette styling) so the two feel like one product —
// just fetched on demand from Supabase instead of walking the in-memory
// MOUNTAINS/ROUTES arrays, since the DB catalog (47k+ areas / 200k+ routes) is
// far too large to hold in memory. Rendered only when USE_DB is on.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchArea, useArea, useAreaChildren, useAreaRoutes, useStates, useCountries, useSubtreeRoutes, useSubtreeRouteCount, useNearbyAreas, useNearbyPeaks, useScopedWishlistRoutes, useRoutesByIds, useAreaSearch, areaSearchTotal, useAreaNamesByIds, fetchAreaBreadcrumb } from "./db";
import { useRecentRouteIds } from "./recent";
import { loadLeaflet, applyBaseLayer, BaseLayerToggle, ViewToggle, pinHtml } from "./mapKit";
import { discIconMarkup, DISC_COLORS } from "./disciplines";
import { DISC_LABELS as DL, DISC_SHORT as DS } from "./discLabels";
import { shortGrade, gradeNumFrom } from "./grade";
import { clickable } from "./clickable";

// Grade for a compact row. Catalog grades often carry a qualifier inline
// ("Class 3 (short 4th-class crux)"); shortGrade drops it here, and the route
// page's Composite Grade panel shows it instead.
function rowGrade(r) { return shortGrade(r.rock_grade || r.ice_grade || r.alpine_grade || r.grade || r.commitment || "") || "—"; }

const HERO_BG = "linear-gradient(160deg,#0a0e16,#142a47)";
const HERO_SHEEN = "inset 0 1px 0 rgba(255,255,255,0.07)";
const ATYPE = { world: "World", country: "Country", state: "State", range: "Range", canyon: "Canyon", peak: "Peak", crag: "Crag", region: "Region", wall: "Wall" };
const CHILD_NOUN = { crag: "Areas", peak: "Peaks", canyon: "Canyons", range: "Ranges", region: "Areas", wall: "Areas", state: "States", country: "Countries" };
// These keys are sent verbatim to routes_in_subtree, which filters on the raw
// `routes.discipline` column (`r.discipline = disc`) — so a discipline with no
// entry here is unreachable by any filter, however well the rest of the app
// understands it. "rock" (7,444 rows) and "mixed" (59) were both missing:
// "rock" is what the catalog stores when the source never split sport from trad,
// and the route rows already title-case it to "Rock", so filtering by Rock now
// matches the label the list shows. It is deliberately not folded into Trad —
// there is no `style` column in the DB to tell the two apart.
const DISCIPLINES = [["", "All"], ["sport", DL.sport], ["trad", DL.trad], ["rock", DL.rock], ["bouldering", DS.bouldering], ["alpine", DL.alpine], ["ice", DL.ice], ["mixed", DL.mixed], ["mountaineering", DL.mountaineering], ["aid", DL.aid], ["scrambling", DS.scrambling]];

function haversineMi(a, b) {
  const R = 3958.8, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
function childNoun(children) {
  const types = [...new Set((children || []).map(c => c.area_type))];
  return (types.length === 1 && CHILD_NOUN[types[0]]) || "Areas";
}
const SL = ({ children, C }) => <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 18, marginBottom: 9 }}><span style={{ width: 3, height: 14, borderRadius: 2, background: C.blueSolid, flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</span></div>;
const Pill = ({ label, color, bg, sm }) => <span style={{ background: bg, color, padding: sm ? "2px 7px" : "3px 10px", borderRadius: 20, fontSize: sm ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>{label}</span>;
const backRow = (onBack, title, C) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
    <button onClick={onBack} style={{ background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "6px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
    <span style={{ color: C.text, fontSize: 16, fontWeight: 700, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>{title}</span>
  </div>
);

// TOP CONTRIBUTORS used to be forked here — a second implementation of the panel that
// ClimbMatchCore already owns. The fork is why the crag page rendered `c.contributor`, an auth
// uid, as a person's name: the good copy resolved profiles and this one never learned to, and
// nothing tied them together. #945 fixed the symptom; deleting the fork is what stops it
// recurring. The shared component arrives as a prop for the same reason `C` and `ActionIcon`
// do — this file must not import ClimbMatchCore, which lazy-imports this module and would make
// the cycle static.

function RouteRow({ r, onOpen, C, areaName }) {
  const stars = r.stars ? Math.round(r.stars) : 0;
  const sub = [areaName || null, r.discipline ? r.discipline[0].toUpperCase() + r.discipline.slice(1) : null, r.sort_order != null ? "#" + r.sort_order + " in this area" : null].filter(Boolean).join(" · ");
  return (
    <div {...clickable(() => onOpen(r))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 11, cursor: "pointer" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
        <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
          {stars ? <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0 }}>{"★".repeat(stars)}</span> : null}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, maxWidth: "38%", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rowGrade(r)}</span>
    </div>
  );
}

// Suggested Climbs: mirrors the static catalog's SuggestedClimbs (ClimbMatch.jsx)
// — same layout/copy, but sourced from useScopedWishlistRoutes/useSubtreeRoutes
// instead of the in-memory ROUTES array. `profile`/`completedIds`/`rankSuggested`
// are computed once in App (grade/gain scoring lives in ClimbMatch.jsx, which
// this file doesn't import — see its own header comment on why) and passed down.
function DbSuggestedClimbs({ area, profile, completedIds, wishlist, onOpen, rankSuggested, discSlots, C }) {
  const [open, setOpen] = useState(false);
  const recentIds = useRecentRouteIds();
  const { data: objRoutes } = useScopedWishlistRoutes(area, wishlist);
  /* THE POOL IS NO LONGER FILTERED BY DISCIPLINE, and that is the actual fix.
     It used to be `{disc: profile.disc}` — the single most-logged discipline — so every other
     discipline was excluded by the QUERY and no amount of client-side ranking could recover
     it. Now one mixed pool comes back and `rankSuggested` (which already filters on catOf)
     picks per slot. Same one round trip, so the multi-discipline rows cost nothing extra.
     pageSize is up from 30 because the 30 now have to cover every discipline, not one. */
  const { data: pool } = useSubtreeRoutes(area.id, { sortBy: "name", pageSize: 120 });
  /* Recently-opened climbs, twice over, because the two answers are different questions.
     Scoped: which of them are in THIS area — that is the "pick up where you left off" row.
     Unscoped: what has this climber been looking at ANYWHERE — that is the taste that earns a
     discipline a row here even when every climb they browsed was in another range. Both are
     `.in("id", …)` over at most RECENT_MAX primary keys, so neither is an expensive read. */
  const { data: recentScoped } = useScopedWishlistRoutes(area, recentIds);
  const { data: recentAll } = useRoutesByIds(recentIds);
  const objectives = (objRoutes || []).filter(r => !completedIds.has(r.id));
  const objIds = new Set(objectives.map(r => r.id));
  /* Keep the click order the climber actually produced. The query returns rows in whatever
     order Postgres hands back, and "recent" is a claim about sequence — sorting by the stored
     position is the only thing that makes the heading true. */
  const recentPos = {}; (recentIds || []).forEach((id, i) => { recentPos[id] = i; });
  const recent = (recentScoped || [])
    .filter(r => !completedIds.has(r.id) && !objIds.has(r.id))
    .sort((a, b) => (recentPos[a.id] ?? 99) - (recentPos[b.id] ?? 99))
    .slice(0, 5);
  const recentSet = new Set(recent.map(r => r.id));
  const candidates = (pool || []).filter(r => !completedIds.has(r.id) && !(wishlist || []).includes(r.id) && !recentSet.has(r.id));
  /* One climb, one row — two slots can rank the same route and a repeated name reads as a bug. */
  const slots = discSlots ? discSlots(profile, recentAll || []) : [];
  const claimed = {};
  const bands = slots.map(s => {
    const rows = rankSuggested(candidates.filter(r => !claimed[r.id]), s, { limit: 5 });
    rows.forEach(r => { claimed[r.id] = 1; });
    return { slot: s, rows };
  }).filter(b => b.rows.length);
  const popular = (!objectives.length && !recent.length && !bands.length) ? [...candidates].sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 5) : [];
  const total = objectives.length + recent.length + bands.reduce((n, b) => n + b.rows.length, 0) + popular.length;
  if (!total) return null;
  const lbl = { fontSize: 11.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.3, margin: "2px 0 7px" };
  const discLabel = d => (DISCIPLINES.find(x => x[0] === d) || [, d])[1];
  /* Two headings, because they are two different claims and only one of them can be true of a
     climb you have actually done. Never say "you've been climbing X" off a page view. */
  const bandTitle = s => (s.src === "viewed" ? "Because you've been looking at " : "Because you've been climbing ") + discLabel(s.disc);
  return (
    <div style={{ marginTop: 14 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", cursor: "pointer" }}>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 700, color: C.text }}>{"Suggested climbs · " + total}</span>
        <span style={{ color: C.blue, fontSize: 13, fontWeight: 700 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div style={{ marginTop: 9 }}>
          {objectives.length ? <div><div style={lbl}>From your objectives</div>{objectives.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div> : null}
          {recent.length ? <div><div style={lbl}>Pick up where you left off</div>{recent.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div> : null}
          {bands.map(b => <div key={b.slot.src + ":" + b.slot.disc}><div style={lbl}>{bandTitle(b.slot)}</div>{b.rows.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div>)}
          {/* `popular` sorts on (stars || 0), and only 6 routes in the whole 205k catalog carry
              a star rating -- so for essentially every area every candidate ties at 0, the sort
              is a no-op, and a stable sort hands back the pool's own order, which is sortBy:"name".
              Calling five alphabetically-first routes "Popular in this area" invents a signal we
              do not have. Claim popularity only when the rows actually carry it. */}
          {popular.length ? <div><div style={lbl}>{popular.some(r => r.stars) ? "Popular in this area" : "More climbs in this area"}</div>{popular.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

// ── state picker: exact match for the static "Pick a state" AreaBrowse ──
// The subdivision noun differs by country and there is no column that carries it — Canadian
// provinces are stored with area_type "state" like everywhere else. Named explicitly rather
// than inferred, with a neutral fallback so a third country reads sensibly on the day it
// lands instead of calling Bavaria a state.
const SUBDIVISION = { usa: "state", canada: "province or territory" };
const subdivisionNoun = id => SUBDIVISION[id] || "region";

function StatePicker({ onPick, C }) {
  const { data: countries, isLoading: lc, error: ec } = useCountries();
  const { data: states, isLoading, error } = useStates();
  const [countryId, setCountryId] = useState("");
  // One country is not a choice, it is a dead tap — so skip the step until there are two.
  // The catalog ran on a single root for its whole life and would have shown a pointless
  // "pick a country" select the entire time.
  const only = countries && countries.length === 1 ? countries[0].id : null;
  const country = countryId || only || "";
  const noun = subdivisionNoun(country);
  // `path` is the materialized ltree and its first label is the root, so this needs no
  // extra query and cannot disagree with the tree.
  const inCountry = (states || []).filter(x => !country || String(x.path || "").split(".")[0] === country);
  const selStyle = { width: "100%", WebkitAppearance: "none", appearance: "none", background: C.card, color: C.text, border: "1px solid " + C.border, borderRadius: 12, padding: "13px 34px 13px 13px", fontSize: 15, fontWeight: 600 };
  return (
    <div style={{ marginBottom: 14 }}>
      {only ? null : (
        <div style={{ marginBottom: 10 }}>
          <SL C={C}>Pick a country</SL>
          <select aria-label="Select a country" value={country} disabled={lc || !countries}
            onChange={e => setCountryId(e.target.value)}
            style={{ ...selStyle, cursor: lc || !countries ? "default" : "pointer" }}>
            <option value="">{lc ? "Loading countries…" : (countries && countries.length) ? "Select a country…" : ec ? "Couldn’t load countries" : "No countries found"}</option>
            {(countries || []).map(c => <option key={c.id} value={c.id}>{c.name + (c.route_count != null ? ` — ${c.route_count.toLocaleString()} climbs` : "")}</option>)}
          </select>
        </div>
      )}
      <SL C={C}>{`Pick a ${noun}`}</SL>
      {/* The placeholder used to fall back on `isLoading || !states`, so a FAILED load -- where
          isLoading is false but states is undefined -- left the control reading "Loading states…"
          forever, directly above the error message saying it could not load. Two statements
          contradicting each other, and the app looks hung rather than broken. This is the
          poor-signal path, which for a climbing app is not an edge case. */}
      <select aria-label={`Select a ${noun}`} value="" disabled={isLoading || !states || !country} onChange={e => { const s = (states || []).find(x => x.id === e.target.value); if (s) onPick(s); }} style={{ ...selStyle, opacity: country ? 1 : 0.55, cursor: isLoading || !states || !country ? "default" : "pointer" }}>
        {/* Data outranks error. A failed REFETCH leaves the previous list intact, so the
            options below are still listed and still work — saying "Couldn’t load states"
            above a populated dropdown contradicts what the user can plainly see, and
            hides a list that is genuinely usable. Only claim failure when there is
            nothing to show. Offline this is the common case, not a rare one: the refetch
            cannot succeed, and the list it already has is exactly what was wanted. */}
        <option value="">{!country ? "Choose a country first" : isLoading ? `Loading ${noun}s…` : inCountry.length ? `Select a ${noun}…` : error ? `Couldn’t load ${noun}s` : `No ${noun}s found`}</option>
        {inCountry.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 9, lineHeight: 1.5 }}>Tap through to drill in to its crags and climbs. Open any area's route list to filter and search by type, grade, stars and more.</div>
      {isLoading ? <div style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Loading states…</div> : null}
      {/* Same split: red is for "you have nothing", muted is for "this may be out of date".
          Telling someone to check their connection is useless advice when the list they
          asked for is already on screen and working. */}
      {error && !(states && states.length) ? <div style={{ color: C.red, fontSize: 12.5, marginTop: 8 }}>Couldn't load states — check your connection and try again.</div> : null}
      {error && states && states.length ? <div style={{ color: C.textMuted, fontSize: 12.5, marginTop: 8 }}>Couldn't refresh just now — showing the list from your last load.</div> : null}
    </div>
  );
}

// ── in-page area/route search — the DB-catalog equivalent of the static
// catalog's SearchSplit, embedded on any non-leaf area page so you can jump
// straight to a sub-area or route anywhere in this subtree instead of
// drilling down one level at a time. Area hits can be at any depth, so they
// navigate via onJumpToArea (rebuilds the real breadcrumb from the area's
// path) rather than onDrill (which assumes a direct child). ──
function DbSearchSplit({ scope, onJumpToArea, onOpenRoute, C, onModeChange }) {
  const [mode, setMode] = useState("areas");
  const [q, setQ] = useState("");
  const qq = q.trim();
  const { data: areaHits, isLoading: la, error: ea } = useAreaSearch(scope.id, qq);
  const { data: routeHits, isLoading: lr, error: er } = useSubtreeRoutes(scope.id, { q: qq, page: 0, pageSize: 40 });
  useEffect(() => { if (onModeChange) onModeChange(mode); }, [mode, onModeChange]);
  const tab = on => ({ flex: 1, padding: "7px 0", textAlign: "center", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: 7, background: on ? C.blueSolid : "transparent", color: on ? "#fff" : C.textSub });
  const row = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", cursor: "pointer", borderBottom: "1px solid " + C.borderLight };
  return (
    <div style={{ marginBottom: 14 }}>
      <SL C={C}>{"Search " + scope.name}</SL>
      <div style={{ display: "flex", gap: 4, background: C.surface, border: "1px solid " + C.border, borderRadius: 9, padding: 3, marginBottom: 8 }}>
        <div {...clickable(() => setMode("areas"))} aria-pressed={mode === "areas"} style={tab(mode === "areas")}>Areas</div>
        <div {...clickable(() => setMode("routes"))} aria-pressed={mode === "routes"} style={tab(mode === "routes")}>Routes</div>
      </div>
      <input aria-label={mode === "areas" ? "Search areas, crags, peaks" : "Search routes"} value={q} onChange={e => setQ(e.target.value)} placeholder={mode === "areas" ? "Search areas, crags, peaks…" : "Search routes…"} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
      {qq ? (
        <div style={{ marginTop: 6, maxHeight: "46vh", overflowY: "auto" }}>
          {mode === "areas" ? (
            la ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>Loading…</div>
            : ea ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search areas.</div>
            : !areaHits || !areaHits.length ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>No areas match.</div>
            : <>
              {areaHits.map(a => (
                <div key={a.id} {...clickable(() => onJumpToArea(a))} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(ATYPE[a.area_type] || a.area_type) + (a.parent_name ? " · " + a.parent_name : "")}</div>
                  </div>
                  {a.route_count > 0 ? <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{a.route_count}</span> : null}
                </div>
              ))}
              {areaSearchTotal(areaHits) > areaHits.length ? <div style={{ fontSize: 11.5, color: C.textMuted, padding: "10px 4px", textAlign: "center" }}>{"Closest " + areaHits.length + " of " + areaSearchTotal(areaHits).toLocaleString() + " — keep typing to narrow."}</div> : null}
            </>
          ) : (
            lr ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>Loading…</div>
            : er ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search routes.</div>
            : !routeHits || !routeHits.length ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>No routes match.</div>
            : routeHits.map(r => (
              <div key={r.id} {...clickable(() => onOpenRoute(r))} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                </div>
                <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, maxWidth: "38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rowGrade(r)}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── SUMMIT BRIEFING: what a peak page knows that its route rows never say ──
//
// Reaching a peak on the alpine/scrambling/mountaineering side of the catalog used to give
// you a name, an elevation and a list of route names. Everything that is true of the
// MOUNTAIN rather than of one line on it — which permit the trailhead needs, who manages
// the land, how far the shortest way in is, how many ways up there even are — was one tap
// further in, on a route page, and you had to open several routes to learn it was the same
// answer every time. On Mount Baker all nine routes carry the identical permit string.
//
// Everything here comes from `useAreaRoutes`, which the page has already fetched and which
// selects `*` — so this is a new READING of rows already in memory, not a new query, and it
// cannot fail separately from the route list it sits above.
//
// The honesty rule this panel is built on: a fact is a PEAK fact only when the routes that
// state it AGREE. Where they disagree the panel says so and names no value, because picking
// one would attribute a Teanaway-side permit to an Enchantments-side route. Where only some
// routes carry it, the denominator is on screen.
const ALPINE_FAMILY = ["alpine", "mountaineering", "scrambling", "ice", "mixed"];

// Comparison form only — never displayed. Enrichment reached these routes one at a time,
// so the same fact arrives spelled several ways: Mount Baker's nine routes carry BOTH
// "Northwest Forest Pass" and "NW Forest Pass", and both "U.S. Forest Service" and "USDA
// Forest Service — Mount Baker-Snoqualmie National Forest…". Comparing raw strings calls
// that a disagreement and makes the panel refuse to answer a question it knows the answer
// to — which is worse than saying nothing, because it teaches you the panel is useless.
const ALIAS = { nw: "northwest", usda: "us", usa: "us", mt: "mount", mtn: "mountain", natl: "national", nat: "national", nf: "national forest", np: "national park", nra: "national recreation area", usfs: "us forest service", nps: "national park service" };
function normFact(s) {
  // Periods go FIRST and separately, so an initialism collapses to one token: "U.S." must
  // become "us" and not "u s", or it stops matching the "USDA" the alias table folds onto
  // it and the two Forest Service spellings read as two different agencies.
  return String(s).toLowerCase().replace(/\./g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").map(w => ALIAS[w] || w).join(" ");
}
// Routes that state this fact, and whether they agree on it.
//
// "Agree" means identical once spelling is set aside, OR that every version is a PREFIX of
// the longest one — one route stating the manager as "U.S. Forest Service" and another as
// "USDA Forest Service — Mount Baker-Snoqualmie NF" are not in conflict, the second is
// simply more specific, and the specific one is what gets displayed. Anything else is a
// real conflict and the caller must not name a winner: Mount Stuart's Teanaway-side permit
// explicitly says the Enchantment quota does NOT apply, while its north-side routes say it
// does. Both are correct about their own approach.
function sharedFact(routes, pick) {
  const said = routes.map(pick).filter(v => v != null && String(v).trim() !== "").map(v => String(v).trim());
  if (!said.length) return null;
  const byLength = said.slice().sort((a, b) => b.length - a.length);
  const longest = byLength[0], longestNorm = normFact(longest);
  const agreed = said.every(v => longestNorm.startsWith(normFact(v)));
  return { value: longest, agreed, said: said.length, of: routes.length };
}
// Smallest and largest of a numeric column, each with the route it came from.
function numericSpan(routes, pick) {
  const vals = routes.map(r => ({ r, v: Number(pick(r)) })).filter(x => Number.isFinite(x.v) && x.v > 0);
  if (!vals.length) return null;
  vals.sort((a, b) => a.v - b.v);
  return { lo: vals[0], hi: vals[vals.length - 1], said: vals.length, of: routes.length };
}
const accessOf = r => (r.access && typeof r.access === "object") ? r.access : {};

// Exported so it can be rendered on its own against real catalog rows. Everything it
// claims is a reading of other rows, and the only way to check a reading is to render it
// — the lesson `check:field-renders` is built on.
export function SummitBriefing({ area, routes, uElev, uDistMi, C }) {
  const rows = useMemo(() => {
    const rs = routes || [];
    if (rs.length < 2) return null;
    // Gate on the disciplines the request named. A sport crag filed as a "peak" gets
    // nothing here: its routes share a base, not a summit, and "shortest approach" and
    // "ways up" are not the questions anyone asks of it.
    const family = rs.filter(r => ALPINE_FAMILY.includes(r.discipline));
    if (family.length * 2 < rs.length) return null;

    const out = [];

    // How many ways up, and of what kind. `discipline` is populated on every catalog row,
    // so this is a count rather than a derivation.
    const byDisc = {};
    rs.forEach(r => { if (r.discipline) byDisc[r.discipline] = (byDisc[r.discipline] || 0) + 1; });
    const discList = Object.entries(byDisc).sort((a, b) => b[1] - a[1]).map(([d, n]) => n + " " + (DL[d] || d).toLowerCase());
    if (discList.length) out.push(["Ways up", discList.length === 1 ? discList[0] + " route" + (rs.length !== 1 ? "s" : "") : rs.length + " routes — " + discList.join(" · "), null]);

    // Hardest rock pitch, from `rock_grade` ONLY.
    //
    // Deliberately NOT from `grade_num`, and this is the trap worth knowing: `gradeNumFrom`
    // falls through to a ROMAN commitment grade (`^(VII|VI|IV|III|II|I|V)`) on the same 0-15
    // scale it uses for YDS and class, so Mount Baker's "III+" and "IV" store as 4 — every
    // one of that peak's nine routes scores as a "class 3-4 scramble". A span computed from
    // that column would read "Class 2 to Class 4" for a mountain whose routes run to Grade
    // IV ice. `rock_grade` is a single scale (YDS plus class), so a span across it means
    // one thing. `lib/grade.js` records that the stored `grade_num` disagrees with itself
    // on 1.9% of rows for the same four-importers reason.
    const gr = numericSpan(rs, r => gradeNumFrom(r.rock_grade, "yds"));
    // Suppressed on a thin minority, because the span then describes the exception rather
    // than the mountain. Mount Baker is the case: 2 of its 9 routes carry a rock grade (a
    // 3rd-class band and a 4th-class step on two glacier climbs), and "3rd class to 4th
    // class" across the top of a page whose other seven routes are Grade II-IV glacier and
    // ice reads as "this is a scramble". A denominator underneath does not undo a headline.
    if (gr && gr.said * 2 >= gr.of) {
      const lo = shortGrade(gr.lo.r.rock_grade), hi = shortGrade(gr.hi.r.rock_grade);
      out.push(["Rock difficulty", (lo === hi || gr.lo.v === gr.hi.v) ? lo : lo + " to " + hi, gr.said < gr.of ? gr.said + " of " + gr.of + " routes list a rock grade" : null]);
    }

    // Approach and gain vary legitimately by trailhead — Mount Baker's routes run 4.0 km to
    // 25.7 km because they start on opposite sides of the mountain — so this is a range with
    // the short one NAMED, never an average. An average of two trailheads describes neither.
    const ap = numericSpan(rs, r => r.dist_km);
    if (ap) {
      const mi = km => uDistMi ? uDistMi(km * 0.621371) : (Math.round(km * 10) / 10) + " km";
      out.push(["Approach", ap.lo.v === ap.hi.v ? mi(ap.lo.v) : mi(ap.lo.v) + " to " + mi(ap.hi.v), "Shortest is " + ap.lo.r.name + (ap.said < ap.of ? " · " + ap.said + " of " + ap.of + " routes give a distance" : "")]);
    }
    const gain = numericSpan(rs, r => r.gain_ft);
    if (gain) {
      const e = ft => uElev ? uElev(ft) : Math.round(ft).toLocaleString() + " ft";
      out.push(["Elevation gain", gain.lo.v === gain.hi.v ? e(gain.lo.v) : e(gain.lo.v) + " to " + e(gain.hi.v), gain.said < gain.of ? gain.said + " of " + gain.of + " routes give a figure" : null]);
    }

    // Only worth a row when it says something the hero strap does not already carry.
    const hp = numericSpan(rs, r => r.high_point_ft);
    if (hp && (!area.elevation_ft || Math.abs(hp.hi.v - area.elevation_ft) > 50)) {
      out.push(["High point", uElev ? uElev(hp.hi.v) : Math.round(hp.hi.v).toLocaleString() + " ft", "Highest point reached by a route here"]);
    }
    return out;
  }, [routes, area.elevation_ft, uElev, uDistMi]);

  // The access half is built separately because it is the part that must refuse to answer.
  const access = useMemo(() => {
    const rs = routes || [];
    if (rs.length < 2) return null;
    const family = rs.filter(r => ALPINE_FAMILY.includes(r.discipline));
    if (family.length * 2 < rs.length) return null;
    return [
      ["Permit", sharedFact(rs, r => r.permit)],
      // Two spellings of one fact live in this jsonb: `land_manager` on essentially every
      // row, `landManager` on a few. Read both, exactly as the route page's ACCESS &
      // REGULATIONS panel does — preferring one silently drops the other's routes.
      ["Land manager", sharedFact(rs, r => accessOf(r).land_manager || accessOf(r).landManager)],
      ["Parking / entrance", sharedFact(rs, r => accessOf(r).parking_pass || accessOf(r).passRequired)],
    ].filter(x => x[1]);
  }, [routes]);

  if (!rows || !rows.length) return null;
  const lbl = { fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 };
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "13px 15px", marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.blue, marginBottom: 10, letterSpacing: 0.4 }}>ACROSS EVERY ROUTE HERE</div>
      {rows.map(([label, value, note]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={lbl}>{label}</div>
          <div style={{ fontSize: 13.5, color: C.text, fontWeight: 600, marginTop: 3, lineHeight: 1.45 }}>{value}</div>
          {note ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{note}</div> : null}
        </div>
      ))}
      {access && access.length ? (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.borderLight }}>
          <div style={{ ...lbl, color: C.amber, marginBottom: 8 }}>Access &amp; permits</div>
          {access.map(([label, f]) => (
            <div key={label} style={{ marginBottom: 9 }}>
              <div style={lbl}>{label}</div>
              {f.agreed
                ? <div style={{ fontSize: 13, color: C.textSub, marginTop: 3, lineHeight: 1.5 }}>{f.value}{f.said < f.of ? <span style={{ color: C.textMuted }}>{" — stated by " + f.said + " of " + f.of + " routes"}</span> : null}</div>
                /* Routes on the same summit can genuinely need different permits: Mount
                   Stuart's Teanaway-side approach never enters the Enchantment quota
                   boundary that its north-side routes do. Naming one of them here would be
                   a wrong answer delivered with a mountain's authority, so the panel sends
                   you to the route instead. */
                : <div style={{ fontSize: 13, color: C.textMuted, marginTop: 3, lineHeight: 1.5, fontStyle: "italic" }}>Differs by route — check the one you are climbing.</div>}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, fontStyle: "italic", lineHeight: 1.45 }}>Confirm current permits and closures with the land manager before you go.</div>
        </div>
      ) : null}
      {/* NOT here, deliberately: a season window. Combining the routes' own `season` strings
          means reading English — and these legitimately wrap the year end ("May-Oct (snow
          climb Dec-Apr)"), so a min-to-max of the months mentioned renders Mount Stuart's
          Cascadian Couloir as "Apr to Dec". The same class of mistake CLAUDE.md records for
          `rappels` and for `season` itself. Season stays on the route, where it belongs. */}
    </div>
  );
}

// ── one area's own page: hero + save + View all/View map/Objectives + sub-areas ──
// "View all N routes" IS the route finder, opened unfiltered — the finder's own default
// state is every route in the subtree. There used to be a second "Route finder" button in
// the row below wired to the identical handler, i.e. the same screen under two names.
// NEARBY PEAKS — "I'm here for the weekend, what else is in reach." Only on a PEAK that
// carries coordinates. It uses useNearbyPeaks, NOT the older useNearbyAreas: that one caps at
// 500 ordered by route_count, and around Stuart the cap is actually REACHED, so the nearest
// small peak can be truncated away before distance is ever considered. See the hook's note.
//
// Four things this deliberately does NOT do, each measured rather than assumed:
//
//   - It does not rank by `route_count`. That column is a cached SUBTREE aggregate and it
//     drifts whenever an area moves, merges or is deleted (check:counts exists for exactly
//     that). It is fine to PRINT and fine to test for >0; it is not a sort key. Distance is.
//   - It does not dedupe on coordinates. Co-located areas are usually legitimate — a wall and
//     the peak above it share a summit pin — and past sweeps established that deduping on
//     proximity destroys real rows. The >0 route filter is what removes the hollow import
//     stubs (the two Early Winters Spires sit 8 m apart; only one holds routes).
//   - It does not claim to work outside Washington. `area_type='peak'` is WA-only today, so
//     elsewhere this finds nothing and renders NOTHING rather than an empty "no nearby peaks"
//     panel, which would read as a fact about the mountains rather than about our data.
//   - It does not use one bounding box for lat and lng. A degree of longitude shrinks with
//     latitude — at 48°N it is ~0.67 of a degree of latitude — so a square box searches ~50%
//     too wide east-west up here and drags in peaks over a range.
// The two pure halves are exported so they can be tested without a browser, a DB or a render
// — scripts/oneoff/verify-nearby-peaks.mjs drives them. Keeping the selection inside the
// component would make it provable only by rendering, and the query it depends on is live.
export function nearbyPeaksLive(area) {
  return !!area && area.area_type === "peak" && area.lat != null && area.lng != null;
}
export function nearbyPeaksBounds(area, dLat) {
  if (!nearbyPeaksLive(area)) return null;
  const d = dLat || 0.5; // ~35 mi; a long weekend's radius, not a road trip.
  // cos() is floored so a hypothetical polar area cannot divide by ~0 and ask for the planet.
  const dLng = d / Math.max(0.2, Math.cos(area.lat * Math.PI / 180));
  return { minLat: area.lat - d, maxLat: area.lat + d, minLng: area.lng - dLng, maxLng: area.lng + dLng };
}
export function nearbyPeaksRows(area, rows, limit) {
  if (!nearbyPeaksLive(area)) return [];
  return (rows || [])
    .filter(a => a && a.area_type === "peak" && a.id !== area.id && a.route_count > 0 && a.lat != null && a.lng != null)
    .map(a => ({ a, mi: haversineMi(area, a) }))
    .sort((x, y) => x.mi - y.mi)
    .slice(0, limit || 6);
}
function NearbyPeaks({ area, onJumpToArea, C, uDistMi }) {
  const bounds = nearbyPeaksBounds(area);
  // Called unconditionally — the hook is gated by `enabled: !!bounds`, not by a conditional
  // call, because a hook behind an `if` is the #377 shape check:hooks exists to catch.
  const { data } = useNearbyPeaks(bounds);
  const rows = useMemo(() => nearbyPeaksRows(area, data && data.rows, 6),
    [data, area && area.id, area && area.lat, area && area.lng, area && area.area_type]);
  if (!rows.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <SL C={C}>Nearby peaks</SL>
      <div style={{ fontSize: 11.5, color: C.textMuted, margin: "-4px 0 9px", lineHeight: 1.5 }}>Other peaks with routes on file, by straight-line distance from this summit — not driving distance, and not a claim they share a trailhead.</div>
      {rows.map(({ a, mi }) => (
        <div key={a.id} {...clickable(() => onJumpToArea(a))} style={{ background: C.card, borderRadius: 12, padding: "11px 14px", marginBottom: 9, border: "1px solid " + C.borderHi, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 600, flexShrink: 0 }}>{(uDistMi ? uDistMi(mi) : mi.toFixed(1) + " mi") + " · " + a.route_count + " →"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
function AreaPage({ area, uElev, uDistMi, booked, onToggleSave, onDrill, onFinder, onNear, onObjectives, onAllAreas, onOpenRoute, onJumpToArea, C, wishlist, profile, completedIds, rankSuggested, discSlots , onAddClimb, TopContributors}) {
  const [searchMode, setSearchMode] = useState("areas");
  const { data: children, isLoading: lc, error: ec } = useAreaChildren(area.id);
  const { data: routes, isLoading: lr, error: er } = useAreaRoutes(area.id);
  const isLeaf = Array.isArray(children) && children.length === 0;
  const loading = lc || (isLeaf && lr);
  const error = ec || er;
  // dominant_discipline used to reach only the map pin's colour and icon, so the DB
  // browser was missing a chip the seed browser has always shown. Same gate as seed:
  // it only means something on a formation, not on a range/state/country.
  const domDisc = ["peak", "crag", "wall"].includes(area.area_type) ? area.dominant_discipline : null;
  const chips = [domDisc ? DL[domDisc] || domDisc : null, area.avy_zone].filter(Boolean);
  const noun = childNoun(children).toLowerCase();
  // parent_peak is stored two ways: 67 areas hold a display name (sometimes with a
  // trailing "— …per…" note), 28 hold a raw area id. Resolve the ids to names rather
  // than printing "wa_mount_anderson_olympic" at someone.
  const rawParent = area.parent_peak || null;
  const parentIsId = !!rawParent && /^[a-z]{2}_[a-z0-9_]+$/.test(rawParent);
  const { data: parentNames } = useAreaNamesByIds(parentIsId ? [rawParent] : []);
  const parentPeak = !rawParent ? null : parentIsId ? (parentNames && parentNames[rawParent]) || null : String(rawParent).split(" — ")[0].trim();

  return (
    <div>
      <div style={{ background: HERO_BG, boxShadow: HERO_SHEEN, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 14, padding: 16, marginBottom: 14, position: "relative", border: "1px solid " + C.border }}>
        {area.area_type !== "country" && area.area_type !== "state" ? (
          <button onClick={onToggleSave} aria-label={booked ? "Remove from Saved Areas" : "Save this area"} style={{ position: "absolute", top: 13, right: 13, display: "flex", alignItems: "center", gap: 5, height: 34, padding: "0 12px", background: booked ? C.amber : "rgba(255,255,255,0.08)", border: "1px solid " + (booked ? C.amber : C.border), borderRadius: 9, fontSize: 12, fontWeight: 800, color: booked ? "#1a1200" : C.text, cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap" }}>{booked ? "Saved" : "Save area"}</button>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap", paddingRight: 118 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{area.name}</div>
          <Pill label={ATYPE[area.area_type] || "Area"} color={C.blue} bg={C.blueBg} sm />
        </div>
        {(() => { const parts = [area.region && area.region !== area.name ? area.region : null, area.elevation_ft ? (uElev ? uElev(area.elevation_ft) : area.elevation_ft.toLocaleString() + " ft") : null, area.prominence_ft ? ((uElev ? uElev(area.prominence_ft) : area.prominence_ft.toLocaleString() + " ft") + " prom") : null].filter(Boolean); return parts.length ? <div style={{ fontSize: 12, color: C.textSub }}>{parts.join(" · ")}</div> : null; })()}
        {parentPeak ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{"Parent peak — " + parentPeak}</div> : null}
        {area.source === "approx-picket-range" ? <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4, lineHeight: 1.45 }}>Coordinates are approximate — the map pin and any distance shown are rough.</div> : null}
        {chips.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>{chips.map((t, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: C.text, background: "rgba(255,255,255,0.12)", border: "1px solid " + C.border, borderRadius: 7, padding: "3px 9px" }}>{t}</span>)}</div> : null}
        {area.blurb ? <div style={{ marginTop: 8, fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>{area.blurb}</div> : null}
        <div style={{ fontSize: 13, color: C.blue, marginTop: 8 }}>{children && children.length ? children.length + " " + noun + " · " + area.route_count + " climbs" : area.route_count + " climb" + (area.route_count !== 1 ? "s" : "")}</div>
      </div>

      {area.route_count > 0 ? (
        <button onClick={onFinder} style={{ width: "100%", padding: 13, marginBottom: 8, borderRadius: 11, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {"View all " + area.route_count + " routes"}<span style={{ fontSize: 16 }}>{"→"}</span>
        </button>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={onNear} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>View map</button>
        <button onClick={onObjectives} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Objectives</button>
      </div>
      <button onClick={onAllAreas} style={{ width: "100%", padding: 15, borderRadius: 11, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 14 }}>All areas</button>
      {!loading && (!error || (children && children.length > 0)) && isLeaf === false ? <DbSearchSplit scope={area} onJumpToArea={onJumpToArea} onOpenRoute={onOpenRoute} C={C} onModeChange={setSearchMode} /> : null}

      {/* The seed browser has had "Don't see a climb? Add it" since forever, but it lives
          behind `selArea`, which is null under USE_DB — so on every real area page the
          affordance did not exist. Opens the same AddRoute sheet with THIS area filled in.
          It sits directly BELOW the Areas/Routes search rather than above it: the moment a
          climber knows a route is missing is the moment a search for it came back empty, so
          this is the next thing under their thumb. It is NOT gated on the search rendering —
          a leaf crag has no DbSearchSplit and is exactly where a missing route is likeliest. */}
      {onAddClimb ? (
        <button onClick={() => onAddClimb(area)} style={{ width: "100%", padding: 13, borderRadius: 11, border: "1px dashed " + C.border, background: C.surface, color: C.blue, fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginBottom: 14, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {"Don’t see a climb here? Add it to " + area.name}<span style={{ fontSize: 15 }}>{"→"}</span>
        </button>
      ) : null}

      {/* Sits directly above the route rows it summarises, so the page reads: this is the
          mountain, this is what is true of every way up it, here are the ways up. It renders
          nothing at all unless the routes support it — see SummitBriefing's own gates. */}
      {!loading && routes && routes.length ? <SummitBriefing area={area} routes={routes} uElev={uElev} uDistMi={uDistMi} C={C} /> : null}
      {loading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {/* Data outranks error, as in the state picker: a failed REFETCH leaves the previous
          children/routes intact, and hiding a list the user can still use is worse than showing
          it. Red stays for "there is nothing here", where "check your connection" is actionable;
          a surviving list gets a muted staleness note instead. */}
      {error && !((children && children.length) || (routes && routes.length)) ? <div style={{ color: C.red, fontSize: 12.5, lineHeight: 1.5 }}>Couldn't load this area — check your connection and try again.</div> : null}
      {error && ((children && children.length) || (routes && routes.length)) ? <div style={{ color: C.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>Couldn't refresh just now — showing what loaded last.</div> : null}

      {!loading && children && children.length > 0 && searchMode === "areas" ? (
        <div style={{ marginBottom: 10 }}>
          <SL C={C}>{childNoun(children)}</SL>
          {children.map(a => (
            <div key={a.id} {...clickable(() => onDrill(a))} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 11, border: "1px solid " + C.borderHi, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{a.name}</span>
                <span style={{ fontSize: 12, color: a.route_count > 0 ? C.blue : C.textMuted, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{a.route_count + " climb" + (a.route_count !== 1 ? "s" : "") + " →"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && isLeaf && (
        routes && routes.length > 0
          ? routes.map(r => <RouteRow key={r.id} r={r} onOpen={onOpenRoute} C={C} />)
          /* Only claim the crag is empty when the load actually succeeded — otherwise a
             failed refetch reports "no routes" about a crag it never managed to read. */
          : !error ? <div style={{ color: C.textMuted, fontSize: 12 }}>No routes in this crag yet.</div> : null
      )}

      <NearbyPeaks area={area} onJumpToArea={onJumpToArea} C={C} uDistMi={uDistMi} />

      {TopContributors ? <TopContributors areaId={area.id} mb={8}/> : null}

      <DbSuggestedClimbs area={area} profile={profile} completedIds={completedIds} wishlist={wishlist} onOpen={onOpenRoute} rankSuggested={rankSuggested} discSlots={discSlots} C={C} />
    </div>
  );
}

// ── Route finder: search + Filters sheet (discipline, sort, stars, pitches,
// length), paged via routes_in_subtree (0015; filters added in 0018). Grade
// range is deliberately NOT offered here: grade_num is only comparable
// within a single grading system (a YDS 5.9 and a V9 boulder problem both
// have grade_num≈9 but mean nothing alike), and for alpine routes the
// static catalog's own display grades ("Grade I", "Class 3") don't match
// the import pipeline's grade_num parser, so a range filter there could
// silently exclude routes it shouldn't. Sorting by grade still works safely
// since unparsed routes just sort last, so it's offered once a single
// discipline is picked (where the comparison is at least meaningful). ──
const LEN_BUCKETS = [["any", "Any", null, null], ["u200", "< 200 ft", null, 61], ["200", "200–600 ft", 61, 183], ["600", "600–1500 ft", 183, 457], ["1500", "1500+ ft", 457, null]];
function RouteFinderPanel({ scope, onOpen, onBack, C }) {
  const DEF = { disc: "", sortBy: "name", minStars: 0, minPitches: 0, len: "any" };
  const [q, setQ] = useState("");
  const [af, setAf] = useState(DEF);
  const [df, setDf] = useState(DEF);
  const [sheet, setSheet] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [page, setPage] = useState(0);
  const [all, setAll] = useState([]);
  const lenRange = (LEN_BUCKETS.find(l => l[0] === af.len) || LEN_BUCKETS[0]);
  const queryArgs = { q, disc: af.disc, minStars: af.minStars || null, minPitches: af.minPitches || null, minLengthM: lenRange[2], maxLengthM: lenRange[3], sortBy: af.sortBy, page };
  const { data: batch, isLoading, error } = useSubtreeRoutes(scope.id, queryArgs);
  const { data: total } = useSubtreeRouteCount(scope.id, queryArgs);

  const saveSearch = () => {
    const name = q.trim() || "Untitled search";
    const newSearch = { id: Date.now(), name, q, filters: af };
    setSavedSearches(prev => [newSearch, ...prev]);
  };
  const loadSearch = (search) => {
    setQ(search.q);
    setAf(search.filters);
    setShowSaved(false);
    setPage(0);
    setAll([]);
  };
  const deleteSearch = (id) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  };
  useEffect(() => { setPage(0); setAll([]); }, [q, af, scope.id]);
  useEffect(() => {
    if (!batch) return;
    setAll(prev => page === 0 ? batch : [...prev, ...batch]);
  }, [batch, page]);
  const areaIds = useMemo(() => [...new Set(all.map(r => r.area_id).filter(Boolean))], [all]);
  const { data: areaNames } = useAreaNamesByIds(areaIds);

  const nF = (af.disc ? 1 : 0) + (af.minStars ? 1 : 0) + (af.minPitches ? 1 : 0) + (af.len !== "any" ? 1 : 0) + (af.sortBy !== "name" ? 1 : 0);
  const afChips = [];
  if (af.disc) afChips.push({ k: "d", label: (DISCIPLINES.find(d => d[0] === af.disc) || [, af.disc])[1], clear: () => setAf(a => ({ ...a, disc: "", sortBy: a.sortBy === "grade_asc" || a.sortBy === "grade_desc" ? "name" : a.sortBy })) });
  if (af.minStars) afChips.push({ k: "s", label: af.minStars + "★+", clear: () => setAf(a => ({ ...a, minStars: 0 })) });
  if (af.minPitches) afChips.push({ k: "p", label: af.minPitches + "+ pitches", clear: () => setAf(a => ({ ...a, minPitches: 0 })) });
  if (af.len !== "any") afChips.push({ k: "len", label: lenRange[1], clear: () => setAf(a => ({ ...a, len: "any" })) });
  if (af.sortBy !== "name") afChips.push({ k: "sort", label: { name_desc: "Z→A", area: "By area", grade_asc: "↓ Easiest", grade_desc: "↑ Hardest", stars_desc: "Most starred" }[af.sortBy], clear: () => setAf(a => ({ ...a, sortBy: "name" })) });

  const chip = (label, on, fn) => <button key={label} onClick={fn} style={{ padding: "7px 12px", borderRadius: 20, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>;
  const lab = s => <div style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 0 8px", borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>{s}</div>;

  return (
    <div>
      {backRow(onBack, "Route finder" + (scope ? " · " + scope.name : ""), C)}
      <input aria-label="Search routes" value={q} onChange={e => setQ(e.target.value)} placeholder="Search routes…" style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => { setDf(af); setSheet(true); }} style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid " + (nF ? C.blue : C.border), background: nF ? C.blueBg : C.surface, color: nF ? C.blue : C.text, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{"Filters" + (nF ? " (" + nF + ")" : "")}</button>
        <button onClick={saveSearch} style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Save search</button>
        {savedSearches.length > 0 && <button onClick={() => setShowSaved(!showSaved)} style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{savedSearches.length} saved</button>}
      </div>
      {showSaved && savedSearches.length > 0 && (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: 10, marginBottom: 10, maxHeight: 200, overflowY: "auto" }}>
          {savedSearches.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderBottom: "1px solid " + C.borderLight, cursor: "pointer" }} {...clickable(() => loadSearch(s))}>
              <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 600 }}>{s.name}</div>
              <button aria-label="Remove saved search" onClick={e => { e.stopPropagation(); deleteSearch(s.id); }} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 16, cursor: "pointer", padding: 4 }}>×</button>
            </div>
          ))}
        </div>
      )}
      {afChips.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 9 }}>
          {afChips.map(c => <button key={c.k} onClick={c.clear} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px 7px 12px", borderRadius: 16, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c.label}<span style={{ opacity: 0.7 }}>✕</span></button>)}
          <button onClick={() => setAf(DEF)} style={{ padding: "5px 8px", background: "none", border: "none", color: C.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Clear all</button>
        </div>
      ) : null}
      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8, padding: "0 2px" }}>{(total != null ? total : all.length) + " route" + ((total != null ? total : all.length) !== 1 ? "s" : "") + " · sorted by " + ({ name: "name", name_desc: "name (Z→A)", area: "area", grade_asc: "easiest", grade_desc: "hardest", stars_desc: "most starred" }[af.sortBy])}</div>
      {error && !all.length ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't search routes — check your connection and try again.</div> : null}
      {error && all.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Couldn't refresh just now — showing the results from your last load.</div> : null}
      {all.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} areaName={areaNames && areaNames[r.area_id]} />)}
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {!isLoading && all.length > 0 && total != null && all.length < total && (
        <button onClick={() => setPage(p => p + 1)} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Load more</button>
      )}
      {/* A star minimum is almost always the real reason a search comes back empty: the RPC
          filters on coalesce(stars,0), and 6 routes in 205,492 have a rating, so 4★+ matches
          nothing anywhere in the catalog and 3★+ matches four. Left unexplained the climber
          reads "no routes match" as "this crag is no good" rather than "we have no ratings". */}
      {!isLoading && !error && !all.length && <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "26px 12px", lineHeight: 1.5 }}>{af.minStars ? "No routes match these filters. Almost no climb in the catalog has a star rating yet, so a minimum-star filter rules out nearly everything — try setting it back to Any." : "No routes match these filters."}</div>}

      {/* Portalled to <body>, and not because 300 was too low a z-index. #appscroll — the
          tab's scroll container — carries `animation-fill-mode: both`, which makes it a
          permanent stacking context at z-index auto. Every fixed overlay rendered inside it
          is therefore trapped below the app header + primary nav (z-index 30), whatever
          z-index it asks for. This sheet opens at 88vh, so its top 81px — the whole title
          row and the × — sat behind the tabs, with the × not even clickable. Same reason
          RouteDetail portals its own sheets. Keep the title row sticky so it survives a
          scroll too. */}
      {sheet ? createPortal(
        <div onClick={() => setSheet(false)} role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 440, borderRadius: "16px 16px 0 0", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 2, background: C.bg, borderRadius: "16px 16px 0 0", borderBottom: "1px solid " + C.border, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 12px" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Filter routes</div>
              <button onClick={() => setSheet(false)} aria-label="Close" style={{ background: C.borderLight, border: "none", color: C.textSub, borderRadius: 8, width: 34, height: 34, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "0 16px 18px", overflowY: "auto", flex: 1, minHeight: 0 }}>
            {lab("Discipline")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {DISCIPLINES.filter(d => d[0]).map(d => chip(d[1], df.disc === d[0], () => setDf(x => ({ ...x, disc: x.disc === d[0] ? "" : d[0], sortBy: (x.sortBy === "grade_asc" || x.sortBy === "grade_desc") && x.disc === d[0] ? "name" : x.sortBy }))))}
            </div>
            {lab("Sort by")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[["name", "Name A→Z"], ["name_desc", "Name Z→A"], ["area", "By area"], ["stars_desc", "Most starred"]].map(o => chip(o[1], df.sortBy === o[0], () => setDf(d => ({ ...d, sortBy: o[0] }))))}
              {df.disc ? [["grade_asc", "↓ Easiest"], ["grade_desc", "↑ Hardest"]].map(o => chip(o[1], df.sortBy === o[0], () => setDf(d => ({ ...d, sortBy: o[0] })))) : null}
            </div>
            {!df.disc ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>Pick a discipline above to sort by grade — grades aren't comparable across climbing types.</div> : null}
            {lab("Minimum stars")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{[[0, "Any"], [2, "★★+"], [3, "★★★+"], [4, "★★★★+"]].map(o => chip(o[1], df.minStars === o[0], () => setDf(d => ({ ...d, minStars: o[0] }))))}</div>
            {df.minStars ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>Star ratings are still missing for almost every climb, so this will hide nearly all of them.</div> : null}
            {lab("Pitches")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{[[0, "Any"], [1, "1+ (single)"], [2, "2+ (multi-pitch)"], [3, "3+"], [5, "5+"], [10, "10+"]].map(o => chip(o[1], df.minPitches === o[0], () => setDf(d => ({ ...d, minPitches: o[0] }))))}</div>
            {lab("Length")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{LEN_BUCKETS.map(o => chip(o[1], df.len === o[0], () => setDf(d => ({ ...d, len: o[0] }))))}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setDf(DEF)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Clear all</button>
              <button onClick={() => { setAf(df); setSheet(false); }} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: C.blueSolid, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Show routes</button>
            </div>
            </div>
          </div>
        </div>, document.body) : null}
    </div>
  );
}

// ── Objectives: your wishlisted routes that fall within the current area ──
function ObjectivesPanel({ area, wishlist, onOpen, onBack, C }) {
  const { data, isLoading, error } = useScopedWishlistRoutes(area, wishlist);
  return (
    <div>
      {backRow(onBack, "My objectives" + (area ? " · " + area.name : ""), C)}
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {error && !(data && data.length) ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load your objectives — check your connection and try again.</div> : null}
      {error && data && data.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Couldn't refresh just now — showing the list from your last load.</div> : null}
      {!isLoading && !error && (!data || !data.length) && (
        <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "26px 12px", lineHeight: 1.5 }}>No objectives here yet — open a climb and tap to add it to your objectives.</div>
      )}
      {(data || []).map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}
    </div>
  );
}

// ── Near me: real Leaflet map (same CDN as the static OverviewMap), geolocated,
// pins from useNearbyAreas driven by the LIVE map viewport — panning/zooming
// re-fetches (mirrors the static OverviewMap's moveend/zoomend re-render), so
// the map never gets stuck showing only what was near the very first center. ──
// Pin markup now comes from the shared lib/mapKit.jsx `pinHtml` (same curved
// name-around-the-circle technique, promoted from the static catalog's map so
// both maps render identical-looking pins from one implementation).

// Initial zoom keyed to how big a footprint each area_type actually covers —
// a whole state needs a far wider view than a single crag, and using one
// fixed zoom for every level (the old behavior) zoomed a state-scale "View
// map" in absurdly tight since it centered on the state's single lat/lng
// point at the same zoom used for a crag.
const ZOOM_BY_AREA_TYPE = { world: 2, country: 3, state: 6, range: 8, region: 8, canyon: 10, peak: 12, crag: 13, wall: 14 };
function NearMePanel({ center0, areaType, onBack, onOpenArea, C, uDistMi }) {
  const mapDiv = useRef(null), mapRef = useRef(null), markRef = useRef(null), userRef = useRef(null), tileRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [center, setCenter] = useState(center0 || null);
  const [baseLayer, setBaseLayer] = useState("sat");
  const [sel, setSel] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  // Full screen just resizes the same Leaflet instance in place (same map div,
  // same markers, same zoom/pan) rather than tearing it down and rebuilding it
  // elsewhere — collapsing back drops you exactly where you were, no reload.
  useEffect(() => {
    if (!mapRef.current) return;
    const t = setTimeout(() => { try { mapRef.current.invalidateSize(); } catch (e) {} }, 220);
    return () => clearTimeout(t);
  }, [fullscreen]);
  const { data, isLoading, error } = useNearbyAreas(bounds);
  const nearby = data && data.rows;

  const readBounds = map => {
    try {
      const b = map.getBounds();
      setBounds({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
    } catch (e) {}
  };

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L;
      const map = L.map(mapDiv.current, { attributionControl: false }).setView(center ? [center.lat, center.lng] : [39.5, -98.5], center ? (ZOOM_BY_AREA_TYPE[areaType] || 10) : 4);
      applyBaseLayer(map, tileRef, baseLayer);
      markRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      map.on("moveend", () => readBounds(map));
      map.on("movestart", () => setSel(null));
      setTimeout(() => { try { map.invalidateSize(); readBounds(map); } catch (e) {} }, 150);
    };
    loadLeaflet(init, () => setMapFail(true));
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => { cancelled = true; clearTimeout(ft); if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} mapRef.current = null; markRef.current = null; userRef.current = null; tileRef.current = null; } };
  }, []);
  useEffect(() => { if (!mapRef.current) return; applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);

  // Screen-space clustering: at national/state scale a single viewport can hold
  // hundreds of crags, and one dot per area (the first version of this map) is
  // unreadable and gives no sense of "zoom in to see more" the way the static
  // map's own zoom-keyed clustering did. Bucket by on-screen proximity — cheap,
  // needs no extra dependency, and naturally uncluster as you zoom in since
  // pixel distances between the same two areas grow with zoom.
  useEffect(() => {
    if (!ready || !nearby) return;
    const L = window.L, map = mapRef.current, grp = markRef.current;
    if (!L || !map || !grp) return;
    setSel(s => (s && nearby.some(a => a.id === s.id)) ? s : null);
    grp.clearLayers();
    // Kept comfortably above the max single-pin size below (52px) so tightly
    // spaced but distinct areas cluster instead of visually overlapping.
    const CLUSTER_PX = 56;
    const pts = nearby.filter(a => a.lat != null && a.lng != null).map(a => ({ a, pt: map.latLngToContainerPoint([a.lat, a.lng]) }));
    const used = new Array(pts.length).fill(false);
    for (let i = 0; i < pts.length; i++) {
      if (used[i]) continue;
      const group = [pts[i]]; used[i] = true;
      for (let j = i + 1; j < pts.length; j++) {
        if (used[j]) continue;
        if (Math.hypot(pts[i].pt.x - pts[j].pt.x, pts[i].pt.y - pts[j].pt.y) < CLUSTER_PX) { group.push(pts[j]); used[j] = true; }
      }
      if (group.length === 1) {
        const a = group[0].a;
        // Bigger circles for longer names — a fixed 34px pin only ever fits ~9
        // characters before ellipsis, so a name like "Index Town Walls" reads
        // as "Index To…". Growing the circle with name length buys more arc
        // length for the curved label without blowing up short names.
        const sz = Math.max(36, Math.min(52, 28 + (a.name || "").length * 1.4));
        const color = DISC_COLORS[a.dominant_discipline] || C.blue;
        const html = pinHtml(a.name, null, sz, color, "#ffffff", discIconMarkup(a.dominant_discipline, 18));
        const mk = L.marker([a.lat, a.lng], { icon: L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }) });
        mk.bindTooltip(a.name + " · " + a.route_count + " climb" + (a.route_count !== 1 ? "s" : ""), { direction: "top" });
        mk.on("click", () => setSel({ ...a, _mi: viewCenter ? haversineMi(viewCenter, a) : null }));
        grp.addLayer(mk);
      } else {
        const areas = group.map(g => g.a);
        const n = areas.length;
        const climbs = areas.reduce((s, a) => s + (a.route_count || 0), 0);
        const avgLat = areas.reduce((s, a) => s + a.lat, 0) / n, avgLng = areas.reduce((s, a) => s + a.lng, 0) / n;
        const sz = Math.min(22 + n, 44);
        const html = "<div style='width:" + sz + "px;height:" + sz + "px;border-radius:50%;background:" + C.blueSolid + ";border:2px solid #fff;color:#fff;font-weight:700;font-size:" + (n > 99 ? 10 : 12) + "px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.55);'>" + n + "</div>";
        const mk = L.marker([avgLat, avgLng], { icon: L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }) });
        mk.bindTooltip(n + " areas · " + climbs + " climbs — tap to zoom in", { direction: "top" });
        mk.on("click", () => {
          try { map.fitBounds(L.latLngBounds(areas.map(a => [a.lat, a.lng])), { padding: [50, 50], maxZoom: 15 }); } catch (e) {}
        });
        grp.addLayer(mk);
      }
    }
  }, [ready, nearby]);

  const locate = () => {
    if (!navigator.geolocation) { setGeoErr("Location isn't available on this device."); return; }
    setLocating(true); setGeoErr("");
    navigator.geolocation.getCurrentPosition(pos => {
      setLocating(false);
      const la = pos.coords.latitude, ln = pos.coords.longitude;
      setCenter({ lat: la, lng: ln });
      const L = window.L, map = mapRef.current;
      if (L && map) {
        if (userRef.current) userRef.current.setLatLng([la, ln]);
        else userRef.current = L.circleMarker([la, ln], { radius: 7, color: "#ffffff", weight: 3, fillColor: C.green, fillOpacity: 1 }).addTo(map).bindTooltip("You are here", { direction: "top" });
        map.setView([la, ln], 10);
        setTimeout(() => readBounds(map), 350); // after the pan/zoom animation settles
      }
    }, err => {
      setLocating(false);
      setGeoErr(err && err.code === 1 ? "Location permission denied — enable it to see climbs near you." : "Couldn't get your location right now.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };

  // Sort the list by distance from the CURRENT viewport center, not the fixed
  // point the map opened at — otherwise, once you've panned somewhere else, the
  // "closest" areas at the top of the list stop matching what's actually
  // showing on screen, which reads as broken.
  const viewCenter = bounds ? { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 } : center;
  const sorted = useMemo(() => {
    if (!nearby) return [];
    const withDist = viewCenter ? nearby.map(a => ({ ...a, _mi: haversineMi(viewCenter, a) })) : nearby.map(a => ({ ...a, _mi: null }));
    return withDist.sort((a, b) => (a._mi ?? 1e9) - (b._mi ?? 1e9)).slice(0, 60);
  }, [nearby, bounds, center]);

  return (
    <div>
      {!fullscreen ? <ViewToggle mode="map" onList={onBack} onMap={() => {}} C={C} /> : null}
      {!fullscreen ? (
        <>
          <button onClick={locate} disabled={locating} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 13.5, fontWeight: 700, cursor: locating ? "default" : "pointer", marginBottom: 8 }}>{locating ? "Locating…" : "Use my location"}</button>
          {geoErr ? <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{geoErr}</div> : null}
        </>
      ) : null}
      <div style={{ position: "relative", marginBottom: fullscreen ? 0 : 8 }}>
        <div ref={mapDiv} style={{ width: "100%", height: fullscreen ? "calc(100vh - 210px)" : 260, borderRadius: fullscreen ? 0 : 12, overflow: "hidden", background: C.surface, transition: "height 0.2s" }} />
        {!ready ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 12.5, pointerEvents: "none", textAlign: "center", padding: 16 }}>{mapFail ? "Map couldn't load — the nearest areas are listed below." : "Loading map…"}</div> : null}
        <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} />
        <button onClick={() => setFullscreen(f => !f)} aria-label={fullscreen ? "Exit full screen" : "Full screen"} style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "rgba(13,17,23,0.85)", border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{fullscreen ? "✕ Exit full screen" : "⤢ Full screen"}</button>
        {sel ? (
          <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 1000, background: C.surface, border: "1px solid " + C.blue + "66", borderRadius: 12, padding: "10px 12px", boxShadow: "0 6px 20px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.name}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted }}>{sel.route_count + " climb" + (sel.route_count !== 1 ? "s" : "") + (sel._mi != null ? " · " + (uDistMi ? uDistMi(sel._mi) : sel._mi.toFixed(1) + " mi") : "")}</div>
            </div>
            <button onClick={() => { onOpenArea(sel); setSel(null); }} style={{ padding: "7px 14px", background: C.blueSolid, color: "#fff", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Open</button>
            <button onClick={() => setSel(null)} title="Close" style={{ background: "none", border: "none", color: C.textMuted, fontSize: 17, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
          </div>
        ) : null}
      </div>
      {!fullscreen ? (
        <>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8 }}>Pan or zoom the map to see areas anywhere else.</div>
          {!center && !bounds ? <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>{'Tap "Use my location" to find climbs near you.'}</div> : null}
          {error && !sorted.length ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load nearby areas — check your connection and try again.</div> : null}
          {error && sorted.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Couldn't refresh just now — showing the areas from your last load.</div> : null}
          {isLoading && bounds ? <div style={{ color: C.textMuted, fontSize: 12 }}>Loading nearby climbs…</div> : null}
          {data && data.total != null && data.total > sorted.length ? <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 8 }}>{"Showing the busiest " + sorted.length + " of " + data.total + " areas in view — zoom in to see more."}</div> : null}
          {sorted.map(a => (
            <div key={a.id} {...clickable(() => onOpenArea(a))} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text }}>{a.name}</span>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{a._mi != null ? a._mi.toFixed(1) + " mi · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
            </div>
          ))}
          {!isLoading && bounds && !sorted.length && !error ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>No climbs in view — pan or zoom out to see more.</div> : null}
        </>
      ) : null}
    </div>
  );
}

// ── All areas: full-screen expandable tree, DB-catalog equivalent of the static
// AreaTree. Only WA's hierarchy is deep enough to matter here, and even a single
// state can run to thousands of areas, so unlike the static version (which
// preloads and expands the whole subtree from the in-memory MOUNTAINS array)
// this fetches each node's children only once it's actually expanded. ──
function DbAreaTreeNode({ area, depth, currentId, expanded, onToggle, onNavigate, C }) {
  const isOpen = expanded.has(area.id);
  // `error` is destructured because without it a FAILED children fetch left `children`
  // undefined and fell through to "No sub-areas." — an affirmative claim that a
  // formation holds nothing, on a node that may hold plenty. main.jsx sets
  // networkMode "always", so an offline device errors immediately rather than pausing,
  // which makes this the common case rather than a rare one.
  const { data: children, isLoading, error } = useAreaChildren(area.id, { enabled: isOpen });
  const cur = area.id === currentId;
  const n = area.route_count;
  const pad = 14 + depth * 22;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 12px " + pad + "px", borderBottom: "1px solid " + C.borderLight, background: cur ? C.blueBg : "transparent" }}>
        <button onClick={() => onToggle(area.id)} aria-label={isOpen ? "Collapse" : "Expand"} style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: "1.5px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 18, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isOpen ? "▾" : "▸"}</button>
        <button onClick={() => onNavigate(area)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
          <div style={{ fontSize: 14.5, fontWeight: cur ? 800 : 700, color: cur ? C.blue : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{area.name}{cur ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px" }}>You are here</span> : null}</div>
        </button>
        {n > 0 ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{n}</span> : null}
        <span {...clickable(() => onNavigate(area))} aria-label={"Open " + area.name} style={{ flexShrink: 0, color: C.textMuted, fontSize: 16, cursor: "pointer", padding: "0 2px" }}>{"›"}</span>
      </div>
      {isOpen ? (
        isLoading
          ? <div style={{ padding: "10px 14px 10px " + (pad + 22) + "px", color: C.textMuted, fontSize: 12 }}>Loading…</div>
          : children && children.length
            ? children.map(k => <DbAreaTreeNode key={k.id} area={k} depth={depth + 1} currentId={currentId} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} C={C} />)
            : error
              ? <div style={{ padding: "10px 14px 10px " + (pad + 22) + "px", color: C.amber, fontSize: 12 }}>Couldn’t load what’s inside.</div>
              : <div style={{ padding: "10px 14px 10px " + (pad + 22) + "px", color: C.textMuted, fontSize: 12 }}>No sub-areas.</div>
      ) : null}
    </div>
  );
}

// The top of the tree is the top of the CATALOG — the same root the drill-down calls
// "All areas" in its own breadcrumb. This used to render `stateRoot` as depth 0, so a
// screen titled "All areas" began at Washington and silently omitted the two levels
// above it (usa > washington), which is precisely the level the breadcrumb beside it
// labels "All areas". The tree and the drill-down agreed at every level below the state
// and disagreed about where the hierarchy starts.
//
// `useCountries` rather than a fresh useAreaChildren(null): it is the same query the
// country picker on the area screen has already run, so opening the tree costs no
// request. Children below this are still fetched only on expand — the catalog is 47k
// areas and eagerly walking it has never been affordable.
function DbAreaTreeRoots({ currentId, expanded, onToggle, onNavigate, C }) {
  const { data: roots, isLoading, error } = useCountries();
  const pad = { padding: "14px 16px", color: C.textMuted, fontSize: 12.5 };
  if (isLoading) return <div style={pad}>Loading…</div>;
  if (error) return <div style={{ ...pad, color: C.amber }}>Couldn’t load the area tree.</div>;
  if (!roots || !roots.length) return <div style={pad}>No areas.</div>;
  return roots.map(r => <DbAreaTreeNode key={r.id} area={r} depth={0} currentId={currentId} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} C={C} />);
}

function DbAreaTree({ stateRoot, current, ancestorIds, onNavigate, onClose, C }) {
  // Open on the path you are actually standing on: the country above the state, the
  // state, and every area you have drilled through. Without the country the new root
  // level would render collapsed and the tree would open showing two rows.
  const [expanded, setExpanded] = useState(() => new Set([stateRoot.parent_id, stateRoot.id, ...(ancestorIds || [])].filter(Boolean)));
  const [q, setQ] = useState("");
  // 60 rather than the 40 the in-page search box uses: this is a full-screen list with
  // nothing else competing for the height, so the same cap that suits an inline dropdown
  // just truncates more often here.
  const { data: results, isLoading: searching, error: searchError } = useAreaSearch(stateRoot.id, q.trim(), 60);
  const toggle = id => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const total = areaSearchTotal(results);

  // Portal to <body> — this component mounts deep inside the tab content tree,
  // and an ancestor there creates its own stacking context, which traps a plain
  // position:fixed child under the app's own sticky top nav despite a higher
  // z-index. Escaping to <body> sidesteps that entirely.
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 400, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Back" style={{ flexShrink: 0, background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, padding: "9px 13px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{"← Back"}</button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: C.text, fontSize: 17, fontWeight: 800, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>All areas</div>
          {/* The subtitle used to read "<state> — tap a name to jump, ▸ to expand", which
              answers "what can I do here" and never "where am I". This screen is opened
              from an area page and covers it completely, so without naming the area you
              came from there is nothing on screen tying the tree back to it — the "You
              are here" badge is the only marker and it can be many scrolls down a
              collapsed tree. The instructions moved under the filter box, where they sit
              beside the control they describe. */}
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current && current.id !== stateRoot.id ? "Viewing " + current.name + " · " + stateRoot.name : stateRoot.name}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, width: 38, height: 38, fontSize: 18, cursor: "pointer" }}>{"×"}</button>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <input aria-label="Search areas, crags and peaks" value={q} onChange={e => setQ(e.target.value)} placeholder={"Search " + stateRoot.name + "’s areas, crags and peaks…"} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
        {/* Say what each of the two tap targets does. They look alike and do opposite
            things: the name OPENS the area (closing this screen), the ▸ only reveals
            what is inside it without going anywhere. */}
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 7, lineHeight: 1.45 }}>
          {q.trim()
            ? (total > 0 ? "Best matches first — tap one to open its climbs." : "Searches every area under " + stateRoot.name + ", at any depth.")
            : "Tap a name to open that area’s climbs · tap ▸ to see what’s inside it"}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 30 }}>
        {q.trim() ? (
          searching ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading…</div>
          : searchError ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.red, fontSize: 13 }}>Couldn't search areas — check your connection and try again.</div>
          : !results || !results.length ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>{'No areas match "' + q.trim() + '"'}</div>
          : <>
            {results.map(m => (
              <div key={m.id} {...clickable(() => onNavigate(m))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + C.borderLight, cursor: "pointer", background: m.id === current.id ? C.blueBg : "transparent" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: m.id === current.id ? C.blue : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}{m.id === current.id ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px" }}>You are here</span> : null}</div>
                  {/* The RPC has always returned area_type and this row threw it away, so a
                      hit read as a bare name with no way to tell a summit from a boulder —
                      while the in-page Areas search two screens over renders exactly this
                      line. Same data, same shape, so the two searches now agree. */}
                  <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[ATYPE[m.area_type] || m.area_type, m.parent_name].filter(Boolean).join(" · ")}</div>
                </div>
                {m.route_count > 0 ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{m.route_count + " climb" + (m.route_count !== 1 ? "s" : "")}</span> : null}
                <span style={{ color: C.textMuted, fontSize: 16, flexShrink: 0 }}>{"›"}</span>
              </div>
            ))}
            {/* Never truncate silently. Before 0147 this list was the alphabetically-first
                40 of however many matched, with nothing on screen admitting it — so a
                search for "mount" in Washington showed A–G of 216 and Mount Rainier read
                as missing from the catalog. */}
            {total > results.length ? (
              <div style={{ padding: "14px 16px", textAlign: "center", color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>
                {"Showing the " + results.length + " closest matches of " + total.toLocaleString() + " — keep typing to narrow it down."}
              </div>
            ) : null}
          </>
        ) : (
          <DbAreaTreeRoots currentId={current.id} expanded={expanded} onToggle={toggle} onNavigate={onNavigate} C={C} />
        )}
      </div>
    </div>,
    document.body
  );
}

export default function DbAreaBrowser({ onOpenRoute, C, bookmarks, onToggleBookmark, wishlist, profile, completedIds, rankSuggested, discSlots, jumpToStateReq, jumpToAreaReq, uElev, uDistMi, onAreaContext, onAddClimb, TopContributors }) {
  const [stateNode, setStateNode] = useState(null);
  const [stack, setStack] = useState([]); // drill path within the state; last entry is "current"
  const [screen, setScreen] = useState("areas"); // "areas" | "finder" | "near" | "objectives"
  const [treeOpen, setTreeOpen] = useState(false);
  const handledJumpId = useRef(null);

  const current = stack.length ? stack[stack.length - 1] : stateNode;
  const crumbs = stateNode ? [stateNode, ...stack] : [];

  // The crumb strip is one non-wrapping scrollable line, so on a deep path the area you are
  // actually standing in — the LAST crumb — is the part scrolled off the right edge. Pin it
  // back into view whenever the path changes, so the sticky bar always answers "where am I"
  // rather than "which state did you start in".
  const crumbStrip = useRef(null);
  useEffect(() => {
    const el = crumbStrip.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [crumbs.length, current && current.id]);

  // Report where the user is browsing to the parent. This exists because App's
  // `selArea` is only ever written on the SEED catalog path, and production builds
  // set VITE_USE_DB=true — so anything outside this component that wanted "the area
  // being looked at" got null in the deployed app. The Fire map's focus point was
  // exactly that: it worked locally on seed data and could never fire in production.
  // Reported as a plain {id,name,lat,lng,areaType} rather than the row itself, so the
  // consumer cannot come to depend on the DB shape.
  useEffect(() => {
    if (!onAreaContext) return;
    onAreaContext(current && current.lat != null && current.lng != null
      ? { id: current.id, name: current.name, lat: current.lat, lng: current.lng, areaType: current.area_type }
      : null);
  }, [onAreaContext, current && current.id, current && current.lat, current && current.lng]);

  const jump = i => {
    setScreen("areas");
    if (i < 0) { setStateNode(null); setStack([]); return; }
    if (i === 0) { setStack([]); return; }
    setStack(crumbs.slice(1, i + 1));
  };
  const back = () => jump(crumbs.length - 2);
  const drill = a => { setScreen("areas"); setStack(s => [...s, a]); };
  const pickState = s => { setStateNode(s); setStack([]); setScreen("areas"); };

  // Lets a parent screen (e.g. the "Manage areas" list) jump straight into a
  // state from outside this component's own drill-down navigation.
  useEffect(() => {
    if (!jumpToStateReq || handledJumpId.current === jumpToStateReq.id) return;
    handledJumpId.current = jumpToStateReq.id;
    pickState(jumpToStateReq.state);
  }, [jumpToStateReq]);
  // Jump straight to any area reached by something other than drilling — a
  // near-me map pin, a tree-search hit, or a tree-node tap — by rebuilding its
  // real state/region breadcrumb from the area's own ltree path.
  // Every await below is guarded by a sequence number: two jumps in flight at once
  // (tap a search hit, tap another before the first resolves) could otherwise land
  // out of order and leave the browser on the earlier area.
  const jumpSeq = useRef(0);
  const jumpToArea = async a => {
    const seq = ++jumpSeq.current;
    setTreeOpen(false);
    setStateNode(a); setStack([]); setScreen("areas");
    // areas_in_subtree returns a narrow projection with no `path`, so a search hit
    // cannot build its own breadcrumb and every panel keyed on path renders empty.
    // Hydrate the full row before navigating.
    let full = a;
    if (!a.path) {
      const row = await fetchArea(a.id).catch(() => null);
      if (jumpSeq.current !== seq) return;
      if (row) { full = row; setStateNode(row); }
    }
    const ancestors = await fetchAreaBreadcrumb(full).catch(() => []);
    if (jumpSeq.current !== seq) return;
    const state = ancestors.find(x => x.area_type === "state");
    if (!state) return;
    setStateNode(state);
    setStack([...ancestors.filter(x => x.area_type !== "state"), full]);
  };
  // Saved-areas chips (and anything outside the browser) jump to a DB area by id;
  // the full row is fetched here because jumpToArea needs area_type + ltree path.
  const handledAreaJump = useRef(null);
  const jumpAreaRowQ = useArea(jumpToAreaReq ? jumpToAreaReq.areaId : null);
  useEffect(() => {
    if (!jumpToAreaReq || handledAreaJump.current === jumpToAreaReq.id || !jumpAreaRowQ.data) return;
    handledAreaJump.current = jumpToAreaReq.id;
    jumpToArea(jumpAreaRowQ.data);
  }, [jumpToAreaReq, jumpAreaRowQ.data]);

  return (
    <div>
      {/* Breadcrumb + Back. Sticky, and rendered on EVERY sub-screen — not just "areas".
          Two reports drove both halves. It used to scroll away on a long area page, so on
          anything below the fold there was no way back without scrolling to the top. And it
          was gated on `screen === "areas"`, so opening "View map" (screen "near") removed the
          only ← Back on the page: the map's own chrome is a List/Map segmented toggle, which
          reads as a view switch rather than an exit, and nothing else said how to get out.
          On a sub-screen Back returns to the area page rather than popping the area stack —
          the panel is a layer over the area you are standing on, not a step deeper into it.
          The crumb strip is one non-wrapping scrollable line (it used to wrap, and a deep
          path could eat several lines of a viewport that is now permanently occupied) and
          auto-scrolls to the end so the area you are actually in is the part you can see. */}
      {crumbs.length ? (
        <div style={{ position: "sticky", top: 0, zIndex: 30, background: C.bg, paddingBottom: 10, marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "9px 11px" }}>
            <button onClick={() => { if (screen !== "areas") setScreen("areas"); else back(); }} style={{ flexShrink: 0, background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "5px 11px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginRight: 4 }}>{"← Back"}</button>
            <div ref={crumbStrip} style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "nowrap", overflowX: "auto", overscrollBehavior: "contain", minWidth: 0, flex: 1, scrollbarWidth: "none" }}>
              {[null, ...crumbs].map((c, i) => {
                const last = i === crumbs.length;
                return (
                  <span key={c ? c.id : "root"} style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap" }}>
                    {i > 0 ? <span style={{ color: C.textSub, fontSize: 16, fontWeight: 700 }}>{"›"}</span> : null}
                    {last && screen === "areas"
                      ? <span style={{ color: C.text, fontWeight: 800, fontSize: 15.5 }}>{c ? c.name : ""}</span>
                      : <button onClick={() => { setScreen("areas"); jump(c ? i - 1 : -1); }} style={{ background: "transparent", border: "none", color: last ? C.text : C.blue, fontSize: 15, cursor: "pointer", fontWeight: last ? 800 : 700, padding: 0, whiteSpace: "nowrap" }}>{c ? c.name : "All areas"}</button>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      {!stateNode ? (
        <StatePicker onPick={pickState} C={C} />
      ) : screen === "finder" ? (
        <RouteFinderPanel scope={current} onOpen={onOpenRoute} onBack={() => setScreen("areas")} C={C} />
      ) : screen === "objectives" ? (
        <ObjectivesPanel area={current} wishlist={wishlist} onOpen={onOpenRoute} onBack={() => setScreen("areas")} C={C} />
      ) : screen === "near" ? (
        <NearMePanel uDistMi={uDistMi} center0={current && current.lat != null ? { lat: current.lat, lng: current.lng } : null} areaType={current && current.area_type} onBack={() => setScreen("areas")} onOpenArea={jumpToArea} C={C} />
      ) : (
        <AreaPage key={current.id} TopContributors={TopContributors} onAddClimb={onAddClimb} uElev={uElev} uDistMi={uDistMi} area={current} booked={bookmarks.includes(current.id)} onToggleSave={() => onToggleBookmark(current.id)} onDrill={drill} onFinder={() => setScreen("finder")} onNear={() => setScreen("near")} onObjectives={() => setScreen("objectives")} onAllAreas={() => setTreeOpen(true)} onOpenRoute={onOpenRoute} onJumpToArea={jumpToArea} C={C} wishlist={wishlist} profile={profile} completedIds={completedIds} rankSuggested={rankSuggested} discSlots={discSlots} />
      )}
      {treeOpen && stateNode ? (
        <DbAreaTree stateRoot={stateNode} current={current} ancestorIds={stack.map(a => a.id)} onNavigate={jumpToArea} onClose={() => setTreeOpen(false)} C={C} />
      ) : null}
    </div>
  );
}
