// The DB-catalog area finder: state picker -> drill-down area pages -> Route
// finder / Near-me map / Objectives / "View all N routes". Deliberately mirrors
// the static catalog's AreaBrowse -> AreaView -> RouteFinder/OverviewMap chain
// (same layout, copy, and C-palette styling) so the two feel like one product —
// just fetched on demand from Supabase instead of walking the in-memory
// MOUNTAINS/ROUTES arrays, since the DB catalog (47k+ areas / 200k+ routes) is
// far too large to hold in memory. Rendered only when USE_DB is on.
import { createContext, Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchArea, useArea, useAreaContributions, useAreaClimbStats, useAreaChildren, useAreaRoutes, useStates, useCountries, useSubtreeRoutes, useSubtreeRouteCount, useNearbyAreas, useNearbyPeaks, useScopedWishlistRoutes, useRoutesByIds, useAreaSearch, areaSearchTotal, useAreaNamesByIds, fetchAreaBreadcrumb, usePartnerAreaCount, usePartnersInArea, savePartnerArea, removePartnerArea } from "./db";
import { useRecentRouteIds } from "./recent";
import { loadLeaflet, applyBaseLayer, BaseLayerToggle, ViewToggle, pinHtml, useFollowMe, locateLabel, searchPlaces } from "./mapKit";
import { discIconMarkup, DISC_COLORS } from "./disciplines";
import { DISC_LABELS as DL, DISC_SHORT as DS } from "./discLabels";
import { shortGrade, gradeNumFrom, displayGrade, gradeSystemForDiscipline } from "./grade";
import { clickable } from "./clickable";
import { subdivisionNoun, countryOfArea } from "./countries";
import { effDistKm } from "./outing";
import { POP_BACK, POP_CLOSE, POP_CLOSE_MEDIA, POP_REMOVE, POP_CHIP_X } from "./popupChrome.js";
import { BTN, BTN_LG, BTN_SM, BTN_LINK, CHIP } from "./buttonStyles.js";
import { useWideScreen } from "./wideLayout.js";
import { ScreenHero } from "./ScreenHero";
import { AboutCard, AreaFactsCard, ClimbsChart, GradeSpread, PendingAreaEdits } from "./AreaPageSections";
import { EditIconButton, CopyCoordButton, NO_PARKING_PIN_LINE, NO_PARKING_PIN_BUT_NOTE_LINE } from "./areaChrome";
import Chevron from "../src/components/Chevron.tsx";
import ActionIcon from "../src/components/ActionIcon.tsx";

// Grade for a compact row. Two things happen inside displayGrade(): a qualifier carried inline
// ("Class 3 (short 4th-class crux)") is dropped, and the route page's Composite Grade panel shows
// it instead; and a column holding a COMMITMENT grade rather than a difficulty is skipped when the
// row has a real one — this used to write the column chain out again, snake_case only, and showed
// a bare NCCS roman numeral on 30 routes. An area list is where a wrong grade is read fastest:
// every row carries one.
function rowGrade(r) { return displayGrade(r) || "—"; }

// THE CLIMBER, for the panels that personalise this browser. `wishlist`, `profile`,
// `completedIds`, `rankSuggested` and `discSlots` come from App and are read only by
// DbSuggestedClimbs and ObjectivesPanel — two and three components below the browser — so
// DbAreaBrowser provides them once instead of AreaPage carrying five props it never reads.
// Local to this file on purpose: everything app-wide is either the react-query cache or App's
// own state (ARCHITECTURE.md).
const ClimberCtx = createContext({ wishlist: [], profile: null, completedIds: new Set(), rankSuggested: () => [], discSlots: null });

const ATYPE = { world: "World", country: "Country", state: "State", range: "Range", canyon: "Canyon", peak: "Peak", crag: "Crag", region: "Region", wall: "Wall" };
const CHILD_NOUN = { crag: "Areas", peak: "Peaks", canyon: "Canyons", range: "Ranges", region: "Areas", wall: "Areas", state: "States", country: "Countries" };
// These keys are sent verbatim to routes_in_subtree, which filters on the raw
// `routes.discipline` column (`r.discipline = disc`) — so a discipline with no
// entry here is unreachable by any filter, however well the rest of the app
// understands it. "toprope" (7,437 rows) was stored as "rock" until 0202: they are
// OpenBeta's top-rope-only climbs (its count matched ours crag for crag), typed the way
// Mountain Project types them. There is no "Rock" type anywhere (owner decision).
const DISCIPLINES = [["", "All"], ["sport", DL.sport], ["trad", DL.trad], ["toprope", DL.toprope], ["bouldering", DS.bouldering], ["alpine", DL.alpine], ["ice", DL.ice], ["mixed", DL.mixed], ["mountaineering", DL.mountaineering], ["aid", DL.aid], ["scrambling", DS.scrambling]];

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
const SL = ({ children, C }) => <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 18, marginBottom: 9 }}><span style={{ width: 3, height: 14, borderRadius: 2, background: C.blueSolid, flexShrink: 0 }} /><span role="heading" aria-level={2} style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</span></div>;
/* = core's CardHead (this module does not import core). Keep the two in step. */
const CardHead = ({ children, C, style }) => <div role="heading" aria-level={3} style={Object.assign({ display: "flex", alignItems: "center", gap: 7, minWidth: 0, fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.5, textTransform: "uppercase" }, style)}><span aria-hidden="true" style={{ width: 3, height: 12, borderRadius: 2, background: C.blueSolid, flexShrink: 0 }} /><span style={{ minWidth: 0 }}>{children}</span></div>;
const Pill = ({ label, color, bg, sm }) => <span style={{ background: bg, color, padding: sm ? "2px 7px" : "3px 10px", borderRadius: 20, fontSize: sm ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>{label}</span>;

// TOP CONTRIBUTORS used to be forked here — a second implementation of the panel that
// ClimbMatchCore already owns. The fork is why the crag page rendered `c.contributor`, an auth
// uid, as a person's name: the good copy resolved profiles and this one never learned to, and
// nothing tied them together. #945 fixed the symptom; deleting the fork is what stops it
// recurring. The shared component arrives as a prop for the same reason `C` and `ActionIcon`
// do — this file must not import ClimbMatchCore, which lazy-imports this module and would make
// the cycle static.

function RouteRow({ r, onOpen, C, areaName }) {
  const stars = r.stars ? Math.round(r.stars) : 0;
  // The PITCH COUNT sits beside the discipline, as Mountain Project's lists write it ("Trad, 5 pitches"):
  // the stored count, exactly as the route page's Pitches stat shows it. A boulder has no pitches.
  const pitches = r.pitches > 0 && r.discipline !== "bouldering" ? r.pitches + " pitch" + (r.pitches !== 1 ? "es" : "") : null;
  const sub = [areaName || null, r.discipline ? (DL[r.discipline] || r.discipline) : null, pitches, r.sort_order != null ? "#" + r.sort_order + " in this area" : null].filter(Boolean).join(" · ");
  return (
    <div {...clickable(() => onOpen(r))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 11, cursor: "pointer", flex: 1, minWidth: 0 }}>
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
// this file doesn't import — see its own header comment on why) and read from ClimberCtx.
function DbSuggestedClimbs({ area, onOpen, C }) {
  const { profile, completedIds, wishlist, rankSuggested, discSlots } = useContext(ClimberCtx);
  // Collapsed until the climber opens it — the user's call (2026-09-30): the rows are one tap
  // away behind the "Suggested climbs · N" header, never spread across the area page by default.
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
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", cursor: "pointer" }}>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 700, color: C.text }}>{"Suggested climbs · " + total}</span>
        <Chevron open={open} color={C.blue} />
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
// The subdivision noun and the country an area sits in come from ./countries, shared with
// the add-a-climb and list/log pickers so the three cannot drift.

function StatePicker({ onPick, C }) {
  const { data: countries, isLoading: lc, error: ec } = useCountries();
  const { data: states, isLoading, error } = useStates();
  const [countryId, setCountryId] = useState("");
  const wide = useWideScreen();
  // One country is not a choice, it is a dead tap — so skip the step until there are two.
  // The catalog ran on a single root for its whole life and would have shown a pointless
  // "pick a country" select the entire time.
  const only = countries && countries.length === 1 ? countries[0].id : null;
  // A country step that cannot LOAD must not GATE the step below it. `useCountries` has no
  // offline fallback while `useStates` does, so with a downloaded state the climber had the
  // whole catalog in IndexedDB and a greyed-out select in front of it: `country` is "" here,
  // and "" was in the state select's `disabled`. Storing countries would not help -- the
  // download filters `path cd st.path` (ltree `<@`), which stores the state and its
  // DESCENDANTS, and a country is an ancestor. Same reasoning as `only` one line up: when the
  // step cannot be offered it must not be required. `inCountry` already falls through to every
  // state when `country` is "", so the list below is correct as it stands.
  const noCountryStep = !!only || !!ec;
  const country = countryId || only || "";
  const noun = subdivisionNoun(country);
  const inCountry = (states || []).filter(x => !country || countryOfArea(x) === country);
  // THE WEBSITE (lib/wideLayout.js): a desktop has the room to SHOW the regions instead of hiding
  // them in a select, the way Mountain Project's location directory does — the countries as
  // buttons (only when there are two or more) and every region as a card with its climb count.
  // Same data, same onPick, same loading and failure wording as the phone selects below.
  if (wide) {
    const card = { textAlign: "left", background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", cursor: "pointer", color: C.text };
    return (
      <div style={{ marginBottom: 14 }}>
        {only ? null : (
          <div style={{ marginBottom: 14 }}>
            <SL C={C}>Pick a country</SL>
            {lc ? <div style={{ color: C.textMuted, fontSize: 13 }}>Loading countries…</div>
              : ec && !(countries && countries.length) ? <div style={{ color: C.red, fontSize: 12.5 }}>{"Couldn’t load countries — the " + noun + "s below are every one we have."}</div>
              : <div role="radiogroup" aria-label="Country" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(countries || []).map(c => { const on = country === c.id; return <button key={c.id} role="radio" aria-checked={on} onClick={() => setCountryId(on ? "" : c.id)} style={{ padding: "9px 14px", borderRadius: 999, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.card, color: on ? "#fff" : C.text, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{c.name}{c.route_count != null ? <span style={{ color: on ? C.blue : C.textMuted, fontWeight: 600 }}>{" · " + c.route_count.toLocaleString()}</span> : null}</button>; })}</div>}
          </div>
        )}
        <SL C={C}>{`Pick a ${noun}`}</SL>
        {!country && !noCountryStep ? <div style={{ color: C.textMuted, fontSize: 13 }}>{"Choose a country above to see its " + noun + "s."}</div>
          : isLoading ? <div style={{ color: C.textMuted, fontSize: 13 }}>{`Loading ${noun}s…`}</div>
          : inCountry.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>{inCountry.map(s => <button key={s.id} onClick={() => onPick(s)} style={card}><div style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>{s.route_count != null ? <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>{s.route_count.toLocaleString() + (s.route_count === 1 ? " climb" : " climbs")}</div> : null}</button>)}</div>
          : error ? <div style={{ color: C.red, fontSize: 12.5 }}>{"Couldn't load " + noun + "s — check your connection and try again."}</div>
          : <div style={{ color: C.textMuted, fontSize: 13 }}>{`No ${noun}s found`}</div>}
        {error && states && states.length ? <div style={{ color: C.textMuted, fontSize: 12.5, marginTop: 8 }}>Couldn't refresh just now — showing the list from your last load.</div> : null}
      </div>
    );
  }
  const phoneGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };
  const phoneCard = { textAlign: "left", minWidth: 0, minHeight: 56, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", cursor: "pointer", color: C.text, fontFamily: "inherit" };
  const phoneCardName = { fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const phoneCardSub = { fontSize: 12, color: C.textMuted, marginTop: 2 };
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
      <select aria-label={`Select a ${noun}`} value="" disabled={isLoading || !states || (!country && !noCountryStep)} onChange={e => { const s = (states || []).find(x => x.id === e.target.value); if (s) onPick(s); }} style={{ ...selStyle, opacity: (country || noCountryStep) ? 1 : 0.55, cursor: isLoading || !states || (!country && !noCountryStep) ? "default" : "pointer" }}>
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
      {/* THE SAME LIST AS CARDS under the selects (2026-10-24). On a phone this screen was two
          dropdowns over a screen of empty dark space; the website already lays the countries and
          regions out as cards, the way Mountain Project's directory does. Same data and same
          onPick/setCountryId as the selects above, which stay (check:ui drives them), so the
          cards add a way in and take none away. Nothing new is loaded. */}
      {!country && !noCountryStep && countries && countries.length > 1 ? (
        <div style={{ marginTop: 16 }}>
          <SL C={C}>Countries</SL>
          <div style={phoneGrid}>{countries.map(c => <button key={c.id} onClick={() => setCountryId(c.id)} style={phoneCard}><div style={phoneCardName}>{c.name}</div>{c.route_count != null ? <div style={phoneCardSub}>{c.route_count.toLocaleString() + (c.route_count === 1 ? " climb" : " climbs")}</div> : null}</button>)}</div>
        </div>
      ) : null}
      {(country || noCountryStep) && inCountry.length ? (
        <div style={{ marginTop: 16 }}>
          <SL C={C}>{`All ${noun}s`}</SL>
          <div style={phoneGrid}>{inCountry.map(s => <button key={s.id} onClick={() => onPick(s)} style={phoneCard}><div style={phoneCardName}>{s.name}</div>{s.route_count != null ? <div style={phoneCardSub}>{s.route_count.toLocaleString() + (s.route_count === 1 ? " climb" : " climbs")}</div> : null}</button>)}</div>
        </div>
      ) : null}
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
//
// THE BAR STAYS PUT while you scroll the list under it (owner, 2026-10-23: "the search function for
// areas and routes ... sticky to the top of the view as they scroll down"), as the route finder's
// has since 2026-10-21 — and lets go once the list (`endRef`, a marker AreaPage puts after it) has
// scrolled past, so it does not ride over the rest of the page.
function DbSearchSplit({ scope, onJumpToArea, onOpenRoute, C, onModeChange, endRef }) {
  const [mode, setMode] = useState("areas");
  const [q, setQ] = useState("");
  const { wrapRef, barRef, pin } = usePinnedBar(endRef);
  const qq = q.trim();
  const { data: areaHits, isLoading: la, error: ea } = useAreaSearch(scope.id, qq);
  const { data: routeHits, isLoading: lr, error: er } = useSubtreeRoutes(scope.id, { q: qq, page: 0, pageSize: 40 });
  // Which crag each hit is on, as the Route finder's rows say: two "Beckey Route"s read as one
  // climb listed twice. A failed read leaves the line off, never empty.
  const hitAreaIds = useMemo(() => [...new Set((routeHits || []).map(r => r.area_id).filter(Boolean))], [routeHits]);
  const { data: hitAreaNames } = useAreaNamesByIds(hitAreaIds);
  useEffect(() => { if (onModeChange) onModeChange(mode); }, [mode, onModeChange]);
  const tab = on => ({ flex: 1, padding: "7px 0", textAlign: "center", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: 7, background: on ? C.blueSolid : "transparent", color: on ? "#fff" : C.textSub });
  const row = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", cursor: "pointer", borderBottom: "1px solid " + C.borderLight };
  return (
    <div style={{ marginBottom: 14 }}>
      <SL C={C}>{"Search " + scope.name}</SL>
      <div ref={wrapRef} style={{ margin: "0 -14px", height: pin ? pin.height : undefined }}>
      <div ref={barRef} style={{ ...(pin ? { position: "fixed", top: pin.top, left: pin.left, width: pin.width, zIndex: 25, boxShadow: "0 6px 12px rgba(0,0,0,0.25)", borderBottom: "1px solid " + C.borderLight } : {}), boxSizing: "border-box", background: C.bg, padding: "6px 14px 8px" }}>
      <div style={{ display: "flex", gap: 4, background: C.surface, border: "1px solid " + C.border, borderRadius: 9, padding: 3, marginBottom: 8 }}>
        <div {...clickable(() => setMode("areas"))} aria-pressed={mode === "areas"} style={tab(mode === "areas")}>Areas</div>
        <div {...clickable(() => setMode("routes"))} aria-pressed={mode === "routes"} style={tab(mode === "routes")}>Routes</div>
      </div>
      <input aria-label={mode === "areas" ? "Search areas, crags, peaks" : "Search routes"} value={q} onChange={e => setQ(e.target.value)} placeholder={mode === "areas" ? "Search areas, crags, peaks…" : "Search routes…"} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
      </div>
      </div>
      {qq ? (
        // No maxHeight/overflow: the hits used to scroll inside a 46vh box of their own, so most
        // of them were hidden behind a second scrollbar. They run down the page instead.
        <div style={{ marginTop: 6 }}>
          {mode === "areas" ? (
            la ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>Loading…</div>
            : ea ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search areas.</div>
            : !areaHits || !areaHits.length ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>No areas match.</div>
            : <>
              {areaHits.map(a => (
                <div key={a.id} {...clickable(() => onJumpToArea(a))} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{a.name}</div>
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
                  {hitAreaNames && hitAreaNames[r.area_id] ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hitAreaNames[r.area_id]}</div> : null}
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
// MOUNTAIN rather than of one line on it — how far the shortest way in is, how many ways up
// there even are — was one tap further in, on a route page.
//
// NO ACCESS & PERMITS BLOCK, by the owner's call (2026-10-04). It used to close this panel
// with Permit / Land manager / Parking rows agreed across the peak's routes; the owner asked
// for it removed from the peak overview. Access stays on each ROUTE page, where it is
// specific to the approach you are actually taking. check:summit-briefing asserts it stays gone.
//
// Everything here comes from `useAreaRoutes`, which the page has already fetched and which
// selects `*` — so this is a new READING of rows already in memory, not a new query, and it
// cannot fail separately from the route list it sits above.
const ALPINE_FAMILY = ["alpine", "mountaineering", "scrambling", "ice", "mixed"];

// Smallest and largest of a numeric column, each with the route it came from.
function numericSpan(routes, pick) {
  const vals = routes.map(r => ({ r, v: Number(pick(r)) })).filter(x => Number.isFinite(x.v) && x.v > 0);
  if (!vals.length) return null;
  vals.sort((a, b) => a.v - b.v);
  return { lo: vals[0], hi: vals[vals.length - 1], said: vals.length, of: routes.length };
}

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
    /* THE SAME EFFECTIVE DISTANCE THE ROUTE PAGE SHOWS, not the raw column. This read `dist_km`
       while RouteDetail has always preferred the route's own itinerary — the sum of its days'
       miles, halved unless the trip is recorded as a loop or point-to-point. Measured over WA:
       of the 543 routes carrying both, 336 differ by more than 15%, and this row moved on 128 of
       the 198 peak pages, almost always by a FACTOR OF TWO, because on those rows `dist_km` holds
       the round trip while the itinerary agrees with half of it. So this panel labelled the whole
       trip "Approach" and the route page for the same climb said half of it — one climb, two
       answers, the #1203 shape across two screens.
       It changes WHICH SOURCE is preferred and never what `dist_km` means: with no itinerary the
       stored column is returned untouched, and CLAUDE.md's rule that this column holds two
       conventions and must not be normalised in bulk is unaffected. */
    const ap = numericSpan(rs, effDistKm);
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

  if (!rows || !rows.length) return null;
  const lbl = { fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 };
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "13px 15px", marginBottom: 14 }}>
      <CardHead C={C} style={{ marginBottom: 10 }}>ACROSS EVERY ROUTE HERE</CardHead>
      {rows.map(([label, value, note]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={lbl}>{label}</div>
          <div style={{ fontSize: 13.5, color: C.text, fontWeight: 600, marginTop: 3, lineHeight: 1.45 }}>{value}</div>
          {note ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>{note}</div> : null}
        </div>
      ))}
      {/* NOT here, deliberately: a season window. Combining the routes' own `season` strings
          means reading English — and these legitimately wrap the year end ("May-Oct (snow
          climb Dec-Apr)"), so a min-to-max of the months mentioned renders Mount Stuart's
          Cascadian Couloir as "Apr to Dec". The same class of mistake CLAUDE.md records for
          `rappels` and for `season` itself. Season stays on the route, where it belongs. */}
    </div>
  );
}

// ── GETTING THERE: drive & park, walk in, and the maps links — the area's own columns only ──
function AreaGettingThere({ area, C, onEdit }) {
  const note = area.parking_note && String(area.parking_note).trim();
  const walk = area.approach && String(area.approach).trim();
  const park = area.parking_lat != null && area.parking_lng != null && isFinite(Number(area.parking_lat)) && isFinite(Number(area.parking_lng)) ? { lat: Number(area.parking_lat), lng: Number(area.parking_lng) } : null;
  const crag = area.lat != null && area.lng != null ? { lat: Number(area.lat), lng: Number(area.lng) } : null;
  const dest = park || crag;
  const lbl = { fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 };
  const linkSt = { flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.greenDim, background: C.greenBg, color: C.green, fontSize: 12.5, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" };
  const ll = dest ? dest.lat + "," + dest.lng : "";
  const to = park ? "parking" : "crag";
  return <div style={{ background: C.card, borderRadius: 12, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}><div role="heading" aria-level={3} style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>Getting there</div>{onEdit ? <EditIconButton C={C} onClick={() => onEdit(note ? "approach" : "parking_note")} title={"Edit how to get to " + area.name} /> : null}</div>
    {!note && !walk ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: dest ? 10 : 0 }}>{"No directions on file yet. Know the way in? "}{onEdit ? <button onClick={() => onEdit("parking_note")} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Add it</button> : "Add it"}{"."}</div> : null}
    {note || park ? <div style={{ marginBottom: 10 }}>
      <div style={lbl}>{"Drive & park" + (area.parking_name && area.parking_name !== "Trailhead" ? " · " + area.parking_name : "")}</div>
      {note ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55, marginBottom: park ? 6 : 0 }}>{note}</div> : null}
      {park ? <CopyCoordButton lat={park.lat} lng={park.lng} what="parking" C={C} /> : null}
    </div> : null}
    {walk || area.approach_min ? <div style={{ marginBottom: 10 }}>
      <div style={lbl}>{"Walk in" + (area.approach_min ? " · about " + area.approach_min + " min" : "")}</div>
      {walk ? <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>{walk}</div> : null}
    </div> : null}
    {dest ? <div>
      <div style={lbl}>{park ? "Directions to parking" : "Directions"}</div>
      {park ? null : <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 6 }}>{note ? NO_PARKING_PIN_BUT_NOTE_LINE : NO_PARKING_PIN_LINE}</div>}
      {area.coords_approx ? <div style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.45, marginBottom: 6 }}>Coordinates are approximate, so these are rough.</div> : null}
      {/* The mount above is gated on ["crag", "peak", "wall"].includes(area.area_type) — a drive link is offered only where there is somewhere to park. */}
      <div style={{ display: "flex", gap: 6 }}>
        <a href={"https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + ll} target="_blank" rel="noopener noreferrer" aria-label={"Driving directions to the " + to + " in Google Maps" + (area.coords_approx ? " (approximate location)" : "")} style={linkSt}>Google Maps</a>
        <a href={"https://maps.apple.com/?dirflg=d&daddr=" + ll} target="_blank" rel="noopener noreferrer" aria-label={"Driving directions to the " + to + " in Apple Maps" + (area.coords_approx ? " (approximate location)" : "")} style={linkSt}>Apple Maps</a>
      </div>
    </div> : null}
  </div>;
}

// ── one area's own page: hero + save + View all/View map/Objectives + sub-areas ──
// "Route finder" (it read "View all N routes" until the owner renamed it) opens the finder
// unfiltered — the finder's own default state is every route in the subtree. There used to be a second "Route finder" button in
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
//   - It does not gate on state, and it no longer needs to. That claim used to read "WA-only
//     today" and is now WRONG: measured 2026-08-19, 445 areas are typed `peak` with coordinates
//     and routes — 402 in Washington, 39 in Colorado, 2 each in California and Oregon — and this
//     panel is LIVE on 37 of the 39 Colorado peaks, 28 of them showing a full six rows. What
//     limits it is how many areas are typed `peak`, never the code, which is a plain lat/lng box.
//     Where a peak genuinely has no neighbour inside the box (both California peaks, both Oregon
//     ones) it renders NOTHING rather than an empty "no nearby peaks" panel, which would read as
//     a fact about the mountains rather than about our data. Re-measure before repeating a
//     coverage claim here; this one rotted within weeks.
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
            <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text, minWidth: 0, lineHeight: 1.3, overflowWrap: "anywhere" }}>{a.name}</span>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 600, flexShrink: 0 }}>{(uDistMi ? uDistMi(mi) : mi.toFixed(1) + " mi") + " · " + a.route_count + " →"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
// PARTNERS HERE (0300): who is listed as an available partner at this area, inside it, or across a wider
// area that contains it — and the one-tap "List me here". Crag-family areas and their ancestors below the
// state; NOT a peak (a peak's climbing is matched by route) and not a state (too broad to list from here;
// the Partners tab's picker still allows it). The count and the rows are signed-in reads: the server
// refuses a signed-out caller, so the card says "Sign in" rather than "nobody".
const PARTNER_CARD_TYPES = ["region", "range", "canyon", "crag", "wall"];
const CRAG_FAMILY = ["trad", "sport", "toprope", "aid", "bouldering"];
function PartnersHereCard({ area, C, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, PartnerRow, notify, onStartCrew, onCrewsHere, openCrewCountAt }) {
  // CREWS HERE (0302): a crag session is a crew bound to this area. Start one from the page you are on, or
  // see the open ones in Join a crew → By Area, preset to this area.
  const crewN = openCrewCountAt ? openCrewCountAt(area.id) : 0;
  const on = !!uid;
  const countQ = usePartnerAreaCount(area.id, on);
  const rowsQ = usePartnersInArea(area.id, null, null, on, 3);
  const [busy, setBusy] = useState(false);
  const listed = !!(myListings || []).find((l) => l && l.areaId === area.id);
  const count = countQ.data;
  const rows = (rowsQ.data || []).filter((p) => p && p.id && String(p.id) !== String(uid));
  const toggle = async () => {
    if (!on || busy) return;
    setBusy(true);
    try {
      if (listed) await removePartnerArea(uid, area.id);
      else await savePartnerArea(uid, { areaId: area.id, disciplines: (area.disciplines || []).filter((d) => CRAG_FAMILY.includes(d)) });
    } catch (e) { notify && notify((listed ? "Couldn’t remove your listing — " : "Couldn’t list you here — ") + ((e && e.message) || "try again")); }
    finally { setBusy(false); }
  };
  const openAll = () => onFindPartnersInArea && onFindPartnersInArea({ id: area.id, name: area.name, areaType: area.area_type });
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "12px 13px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>Partners here</div>
          <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{!on ? "Sign in to see who climbs here." : countQ.isError ? "Couldn’t load who’s listed." : count == null ? "Counting…" : count === 0 ? "Nobody listed here yet — be the first." : count + " climber" + (count === 1 ? "" : "s") + " listed here or nearby"}</div>
        </div>
        {on ? <button onClick={toggle} disabled={busy} aria-pressed={listed} aria-label={listed ? "Listed at " + area.name + " — tap to remove" : "List me at " + area.name} style={{ flexShrink: 0, minHeight: 40, padding: "0 13px", borderRadius: 10, border: "1px solid " + (listed ? C.green : C.blueDim), background: listed ? C.greenBg : C.blueBg, color: listed ? C.green : C.blue, fontSize: 12.5, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{listed ? "Listed ✓" : "List me here"}</button> : null}
      </div>
      {/* Once listed, the follow-up — when you can climb here and what — is a real, full-width
          control, not a bare word. It and "See all" used to spread `BTN_LINK` as an object; it is a
          FUNCTION of C, so both rendered as the browser's default grey button: tiny, hard to see,
          and the owner's first complaint about this card. */}
      {on && listed && onListMe ? (
        <button onClick={() => onListMe({ areaId: area.id, name: area.name, areaType: area.area_type, disciplines: (area.disciplines || []).filter((d) => CRAG_FAMILY.includes(d)) })} aria-label={"Add the dates and climbing types for your listing at " + area.name} style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10, marginTop: 8, marginBottom: 4, padding: "10px 12px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, cursor: "pointer", textAlign: "left" }}>
          <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 9, background: C.blueBg, border: "1px solid " + C.blueDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: C.text }}>Add dates or climbing types</span>
            <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>When you can climb here, and what — so the right partners find you.</span>
          </span>
          <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>
        </button>
      ) : null}
      {on && rows.length && PartnerRow ? <div style={{ marginTop: 6 }}>{rows.map((p) => <PartnerRow key={p.id} p={p} onOpen={onViewProfile} />)}</div> : null}
      {on && (count > 0 || rows.length) ? <button onClick={openAll} style={{ ...BTN_LINK(C), padding: "6px 0 0", fontSize: 12.5 }}>{"See all at " + area.name + " →"}</button> : null}
      {onStartCrew || onCrewsHere ? <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid " + C.border }}>
        {onStartCrew ? <button onClick={() => onStartCrew(area)} style={{ ...BTN, flex: 1, border: "1px solid " + C.blueDim, background: C.blueBg, color: "#fff" }}>Start a crew here</button> : null}
        {onCrewsHere ? <button onClick={() => onCrewsHere(area)} style={{ ...BTN, flex: 1, border: "1px solid " + C.border, background: C.surface, color: C.textSub }}>{"Crews here" + (crewN ? " · " + crewN : "")}</button> : null}
      </div> : null}
    </div>
  );
}

// The order a crag's own climb list can be read in (Mountain Project and theCrag: left to right as
// on the wall, the default, or by name). `sort_order` is the left-to-right position; a climb with no
// position stays LAST in both wall orders, by name, rather than being guessed into the line.
const AREA_LIST_SORTS = [["lr", "Left → right"], ["rl", "Right → left"], ["az", "A → Z"], ["za", "Z → A"]];
function sortAreaRoutes(routes, key) {
  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
  if (key === "az") return [...routes].sort(byName);
  if (key === "za") return [...routes].sort((a, b) => byName(b, a));
  const dir = key === "rl" ? -1 : 1;
  return [...routes].sort((a, b) => Number(a.sort_order == null) - Number(b.sort_order == null) || (a.sort_order != null && b.sort_order != null ? dir * (a.sort_order - b.sort_order) : 0) || byName(a, b));
}

// "Don't see a climb or area here?" — under the list on an area page AND under the route finder's
// results (owner, 2026-10-23). Add an area is Mountain Project's "Add to Page → Sub-Area", under the
// same rule MP and our trg_areas_leaf_xor share: an area holds sub-areas OR climbs, so a crag that
// already lists climbs offers only Add a climb; a country (its states are fixed) offers no new area.
function AddHereFooter({ area, onAddClimb, onAddArea, C }) {
  const { data: kids } = useAreaChildren(onAddArea && area ? area.id : null);
  if (!area || (!onAddClimb && !onAddArea)) return null;
  const holdsClimbs = Array.isArray(kids) && kids.length === 0 && area.route_count > 0;
  const canArea = !!onAddArea && Array.isArray(kids) && !holdsClimbs && !["world", "country"].includes(area.area_type);
  const btn = { ...BTN_LG, flex: 1, minWidth: 0, border: "1px dashed " + C.border, background: C.surface, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  return (
    <div style={{ marginTop: 10, marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{canArea && onAddClimb ? "Don’t see a climb or area here?" : canArea ? "Don’t see an area here?" : "Don’t see a climb here?"}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {onAddClimb ? <button onClick={() => onAddClimb(area)} aria-label={"Add a climb to " + area.name} style={btn}>{"Add a climb"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span></button> : null}
        {canArea ? <button onClick={() => onAddArea(area)} aria-label={"Add an area to " + area.name} style={btn}>{"Add an area"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span></button> : null}
      </div>
    </div>
  );
}

function AreaPage({ area: areaRow, uElev, uDistMi, booked, onToggleSave, onDrill, onFinder, onNear, onObjectives, onAllAreas, onOpenRoute, onJumpToArea, C, onAddClimb, onAddArea, TopContributors, onFireMap, onSuggestAreaEdit, myId, PartnerRow, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, notify, onStartCrew, onCrewsHere, openCrewCountAt}) {
  const [searchMode, setSearchMode] = useState("areas");
  const listEndRef = useRef(null);
  const [listSort, setListSort] = useState("lr");
  // The row in the drill stack is a snapshot of a CHILD row read when its parent was opened. An
  // agreed edit rewrites the areas row on the server (0304) and refreshes ["area", id] — so the
  // page reads the live row over the snapshot, or a climber's own fill would never show.
  const { data: liveArea } = useArea(areaRow.id);
  const area = liveArea && liveArea.id === areaRow.id ? liveArea : areaRow;
  const formation = ["crag", "peak", "wall"].includes(area.area_type);
  // The chart runs on everything below a country: the whole catalog in one call is ~2 s against
  // a 3 s statement timeout, and a country page is a list of states anyway.
  const chartable = !["world", "country"].includes(area.area_type);
  const stats = useAreaClimbStats(chartable ? area.id : null);
  const areaEdits = useAreaContributions(formation && onSuggestAreaEdit ? area.id : null);
  const editOn = formation && onSuggestAreaEdit ? (k) => onSuggestAreaEdit(area, k) : null;
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
      {/* The area's box IS the Climbs tab's header once you are in an area: App's generic "Climbs"
          box is drawn only on the picker (rootHeader), so Florida heads Florida. */}
      <ScreenHero C={C} title={area.name} right={area.area_type !== "country" && area.area_type !== "state" ? (
          <button onClick={onToggleSave} aria-label={booked ? "Remove from Saved" : area.area_type === "peak" ? "Save this peak" : "Save this area"} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, height: 34, padding: "0 12px", background: booked ? C.amber : "rgba(255,255,255,0.08)", border: "1px solid " + (booked ? C.amber : C.border), borderRadius: 9, fontSize: 12, fontWeight: 800, color: booked ? "#1a1200" : C.text, cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap" }}>{booked ? "Saved" : area.area_type === "peak" ? "Save peak" : "Save area"}</button>
        ) : null}>
        {/* Two columns: the facts on the left and the Fire map button on the right, centred
            against them. It used to be a small pill in the bottom-right corner beside the climb
            count; the owner asked for it larger and more central on the box, still on the right. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginTop: 6, marginBottom: 4 }}>
              <Pill label={ATYPE[area.area_type] || "Area"} color={C.blue} bg={C.blueBg} sm />
            </div>
            {(() => { const parts = [area.region && area.region !== area.name ? area.region : null, area.elevation_ft ? (uElev ? uElev(area.elevation_ft) : area.elevation_ft.toLocaleString() + " ft") : null, area.prominence_ft ? ((uElev ? uElev(area.prominence_ft) : area.prominence_ft.toLocaleString() + " ft") + " prom") : null].filter(Boolean); return parts.length ? <div style={{ fontSize: 12, color: C.textSub }}>{parts.join(" · ")}</div> : null; })()}
            {parentPeak ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{"Parent peak — " + parentPeak}</div> : null}
            {area.coords_approx ? <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4, lineHeight: 1.45 }}>Coordinates are approximate — the map pin, any distance shown, and the Directions link are rough.</div> : null}
            {chips.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>{chips.map((t, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: C.text, background: "rgba(255,255,255,0.12)", border: "1px solid " + C.border, borderRadius: 7, padding: "3px 9px" }}>{t}</span>)}</div> : null}
            {/* The description moved out of the hero into the ABOUT card below (0304), where it has an edit control. */}
            <div style={{ fontSize: 13, color: C.blue, marginTop: 8 }}>{children && children.length ? children.length + " " + noun + " · " + area.route_count.toLocaleString() + " climbs" : area.route_count.toLocaleString() + " climb" + (area.route_count !== 1 ? "s" : "")}</div>
          </div>
          {/* The Fire map entry. It used to be a full-width card at the very top of the Climbs
              tab, above the path and the area itself; it lives here now, on the area it opens
              focused on. It makes no claim about whether anything is burning — the map is where
              that data lives, and it is honest about loading and failing. It is not drawn on a
              country or state page — the first screen after the country/state picker — which is
              far too broad a place to ask "is anything burning near here?" (owner, 2026-10-24); it
              starts at the range, the first level with a place to focus on, as Save does. */}
          {onFireMap && area.area_type !== "country" && area.area_type !== "state" ? (
            <button onClick={() => onFireMap(area)} aria-label={"Fire map — active wildfires and red-flag warnings near " + area.name} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7, minHeight: 44, background: C.redBg, border: "1px solid " + C.red + "66", color: C.red, borderRadius: 11, padding: "0 16px", fontSize: 14.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.7 1.2 2.7 2.5 3 0-3.5-1-6.5 0-9z" /></svg>
              {"Fire map"}
            </button>
          ) : null}
        </div>
      </ScreenHero>

      {/* What Mountain Project's area page has and ours did not (audit 2026-10-15): a description,
          the facts a crag visit needs, a count by discipline, and a way to improve the page.
          Every section prints only what is stored; an empty one invites the edit instead. */}
      {formation && areaEdits.data && areaEdits.data.length ? <PendingAreaEdits rows={areaEdits.data} C={C} myId={myId} /> : null}
      {formation || (area.blurb && String(area.blurb).trim()) ? <AboutCard area={area} C={C} onEdit={editOn} /> : null}
      {formation ? <AreaFactsCard area={area} C={C} uElev={uElev} onEdit={editOn} /> : null}
      {chartable ? <ClimbsChart stats={stats.data} loading={stats.isLoading} error={stats.error} C={C} discOptions={DISCIPLINES.map(d => d[0]).filter(Boolean)} onDisc={onFinder}><GradeSpread stats={stats.data} C={C} /></ClimbsChart> : null}

      {area.route_count > 0 ? (
        <button onClick={onFinder} style={{ ...BTN_LG, width: "100%", marginBottom: 8, border: "1px solid " + C.blue, background: C.blueBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {"Route finder"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span>
        </button>
      ) : null}
      {/* Route finder is the one primary button; the three ways to look elsewhere sit in one quiet row
          under it. "All areas" used to be a second blue full-width button further down the page. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={onNear} style={{ ...BTN_LG, flex: 1, minWidth: 0, paddingLeft: 6, paddingRight: 6, fontSize: 13.5, border: "1px solid " + C.border, background: C.surface, color: C.text }}>View map</button>
        <button onClick={onObjectives} style={{ ...BTN_LG, flex: 1, minWidth: 0, paddingLeft: 6, paddingRight: 6, fontSize: 13.5, border: "1px solid " + C.border, background: C.surface, color: C.text }}>My objectives</button>
        <button onClick={onAllAreas} style={{ ...BTN_LG, flex: 1, minWidth: 0, paddingLeft: 6, paddingRight: 6, fontSize: 13.5, border: "1px solid " + C.border, background: C.surface, color: C.text }}>All areas</button>
      </div>
      {/* GETTING THERE — the one drive control on the area page, as CragLocationCard is on a crag
          route. It used to be a bare "Directions" button in the row above, with no words; the
          Mountain Project page for the same crag says how to drive there, where to park and how
          long the walk is. Drive & park is areas.parking_note + the parking pin; Walk in is
          areas.approach + approach_min. Nothing here is derived — an empty card invites the edit.
          ONLY where a destination is actionable: every area carries a coordinate, including
          `country`, `state`, `region` and `range` — and "Directions to Colorado" routes you to a
          state centroid, which is noise at best and misleading at worst. A crag, peak or wall has
          somewhere you can actually park (check:area-surfaces reads this gate). */}
      {["crag", "peak", "wall"].includes(area.area_type) ? <AreaGettingThere area={area} C={C} onEdit={editOn} /> : null}
      {PARTNER_CARD_TYPES.includes(area.area_type) ? <PartnersHereCard area={area} C={C} uid={uid} myListings={myListings} onListMe={onListMe} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={onViewProfile} PartnerRow={PartnerRow} notify={notify} onStartCrew={onStartCrew} onCrewsHere={onCrewsHere} openCrewCountAt={openCrewCountAt} /> : null}
      {!loading && (!error || (children && children.length > 0)) && isLeaf === false ? <DbSearchSplit scope={area} onJumpToArea={onJumpToArea} onOpenRoute={onOpenRoute} C={C} onModeChange={setSearchMode} endRef={listEndRef} /> : null}

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
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textMuted, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{a.route_count.toLocaleString() + " climb" + (a.route_count !== 1 ? "s" : "")}<Chevron size={16} color={C.textMuted} /></span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && isLeaf && (
        routes && routes.length > 0
          ? <>
              <SL C={C}>{routes.length + " climb" + (routes.length !== 1 ? "s" : "")}</SL>
              {(() => {
                // Left/right is offered only where a wall order is stored: on a list with no
                // positions both wall orders would be A → Z under another name.
                const placed = routes.filter(r => r.sort_order != null).length;
                const opts = placed ? AREA_LIST_SORTS : AREA_LIST_SORTS.filter(o => o[0] === "az" || o[0] === "za");
                const key = opts.some(o => o[0] === listSort) ? listSort : opts[0][0];
                const unplaced = (key === "lr" || key === "rl") ? routes.length - placed : 0;
                return <>
                  {routes.length > 1 ? <div role="group" aria-label="Sort climbs" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 8 }}>{opts.map(o => <button key={o[0]} onClick={() => setListSort(o[0])} aria-pressed={key === o[0]} style={{ ...CHIP, flexShrink: 0, border: "1px solid " + (key === o[0] ? C.blue : C.border), background: key === o[0] ? C.blueBg : C.surface, color: key === o[0] ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{o[1]}</button>)}</div> : null}
                  {unplaced ? <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.45 }}>{unplaced + (unplaced !== 1 ? " climbs have" : " climb has") + " no position on the wall yet, so " + (unplaced !== 1 ? "they are" : "it is") + " listed last, by name."}</div> : null}
                  {sortAreaRoutes(routes, key).map(r => <RouteRow key={r.id} r={r} onOpen={onOpenRoute} C={C} />)}
                </>;
              })()}
            </>
          /* Only claim the crag is empty when the load actually succeeded — otherwise a
             failed refetch reports "no routes" about a crag it never managed to read. */
          : !error ? <div style={{ color: C.textMuted, fontSize: 12 }}>No routes in this crag yet.</div> : null
      )}

      {/* The seed browser has had "Don't see a climb? Add it" since forever, but it lives
          behind `selArea`, which is null under USE_DB — so on every real area page the
          affordance did not exist. It sits DIRECTLY UNDER the areas/climbs list (owner, 2026-10-15
          and again 2026-10-23): a climber who has just read to the end of the list and not found
          their climb — or their crag — is the one who adds it. It is NOT gated on the list
          rendering — an empty crag is exactly where a missing route is likeliest. */}
      <div ref={listEndRef} />
      <AddHereFooter area={area} onAddClimb={onAddClimb} onAddArea={onAddArea} C={C} />

      {editOn ? (
        <button onClick={() => editOn(null)} style={{ ...BTN_LG, width: "100%", border: "1px dashed " + C.border, background: C.surface, color: C.blue, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {"Know " + area.name + "? Suggest an edit"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span>
        </button>
      ) : null}

      {/* TOP RATED HERE — Mountain Project's "Classic Climbing Routes". Only the rows that carry a
          star rating (routes.stars, kept by 0294), best first; an area with no ratings shows
          nothing rather than "no ratings yet". */}
      {!loading && isLeaf && routes && routes.length > 1 ? (() => { const top = routes.filter(r => r.stars > 0).sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name)).slice(0, 5); return top.length ? <><SL C={C}>Top rated here</SL>{top.map(r => <RouteRow key={"top-" + r.id} r={r} onOpen={onOpenRoute} C={C} />)}</> : null; })() : null}

      {/* Tail order is the owner's (2026-10-15): suggested climbs right under "Don't see a climb",
          then nearby peaks, then Top contributors LAST — App mounts the area Discussion directly
          after this component, so Top contributors sits right above it and Discussion ends the page. */}
      <DbSuggestedClimbs area={area} onOpen={onOpenRoute} C={C} />

      <NearbyPeaks area={area} onJumpToArea={onJumpToArea} C={C} uDistMi={uDistMi} />

      {TopContributors ? <TopContributors areaId={area.id} mb={8}/> : null}
    </div>
  );
}

// ── Route finder: search + Filters sheet (discipline, grade, sort, stars, pitches,
// length), paged via routes_in_subtree (0015; filters added in 0018). ──
//
// GRADE RANGE IS OFFERED ONLY ONCE A DISCIPLINE IS PICKED, AND NOT FOR EVERY DISCIPLINE.
// grade_num is only comparable within one grading system — a YDS 5.9, a V9 boulder problem and a
// WI4 are all just numbers on one line — so with "All" selected no range means anything. See
// DISC_GRADE_SCALES for which scales each discipline offers and why.
//
// ALPINE, MOUNTAINEERING AND SCRAMBLING filter BY SCALE (2026-10-01). Their grade_num used to mix
// YDS, Class, French grades and commitment numerals under labels nobody had corrected, so they
// were left out. Every WA route in them now carries ONE researched final grade — its crux, on Class,
// 5.x or WI/AI — in `grade`, with grade_system and grade_num to match (audits/route-grades/), and
// the out-of-state rows were relabelled to the scale their grade text is written on
// (scripts/oneoff/relabel-mountain-grade-systems.mjs). So a range passes grade_sys and one number
// means one grade again: Class 4 and 5.4 are both 4, and the label is what keeps them apart.
//
// The RPC compares `grade_num >= min_grade`, which is NULL — i.e. excluded — for a route with
// no readable grade. The sheet says so rather than letting the count drop unexplained. ──
// [key, labelLoFt, labelHiFt, queryLoM, queryHiM]. THE LABEL NUMBERS ARE FEET AND THE QUERY BOUNDS
// ARE METRES, and that is not a muddle — it is what makes the label true in both units. The stored
// column is metric and the bounds are half-open (61/183/457), which are exactly 200/600/1500 ft
// through `uElevN`, so the imperial rendering is byte-for-byte what it has always been and the
// metric one states the real cut points rather than a re-rounded approximation of them.
//
// These labels were imperial WHATEVER THE SETTING until now, on the LIVE filter every DB-catalog
// climber uses. #1670 fixed the same defect in `RouteFinder`'s twin and consolidated it onto core's
// `ROUTE_LENGTHS`/`routeLengthLabel` — but that twin is SEED-ONLY and reaches nobody, so the fix
// landed on dead code while this stayed wrong. CLAUDE.md recorded the gap; this closes it.
//
// DELIBERATELY NOT consolidated onto `routeLengthLabel`: its bounds are INCLUSIVE FEET (201-599,
// 600-1499) while these are HALF-OPEN METRES, so a 600 ft (182.88 m) route is in this bucket and
// that helper would label it "201–599 ft". Sharing the vocabulary would trade a units defect for an
// off-by-one one. Reconciling the two bound sets is a separate change.
const LEN_BUCKETS = [["any", null, null, null, null], ["u200", null, 200, null, 61], ["200", 200, 600, 61, 183], ["600", 600, 1500, 183, 457], ["1500", 1500, null, 457, null]];

// `uElevN`/`uElevUnit` arrive as PROPS, like `C` and `ActionIcon`, because this file must not
// import ClimbMatchCore — core lazy-imports this module, and a static import would make that cycle
// static. That is this file's own recorded rule, not a new one.
const lenLabel = (o, uElevN, uElevUnit) => {
  if (o[0] === "any") return "Any";
  const u = uElevUnit();
  if (o[1] == null) return "< " + uElevN(o[2]) + " " + u;
  if (o[2] == null) return uElevN(o[1]) + "+ " + u;
  return uElevN(o[1]) + "–" + uElevN(o[2]) + " " + u;
};
// GAIN, ROUND TRIP, PEAK ELEVATION, PROMINENCE and DISTANCE AWAY (owner, 2026-10-24: "filter peaks
// and routes by prominence, elevation gain, miles, etc ... Also by location and distance away").
// AllTrails offers length and elevation gain as ranges and "Distance away" as a radius around you
// or a place you pick; Peakbagger lists peaks by elevation and prominence. Each bucket is written
// in ROUND numbers of BOTH unit systems — [key, imperial [lo, hi], metric [lo, hi]] — rather than
// one set converted, which would offer a metric climber "305–914 m". The key is shared, so a saved
// search keeps its meaning when the unit setting changes. What each reads is 0369's header.
const FT_PER_M = 3.28084, KM_PER_MI = 1.60934;
const GAIN_BUCKETS = [["any"], ["g1", [null, 1000], [null, 300]], ["g2", [1000, 3000], [300, 900]], ["g3", [3000, 5000], [900, 1500]], ["g4", [5000, null], [1500, null]]];
const TRIP_BUCKETS = [["any"], ["t1", [null, 5], [null, 8]], ["t2", [5, 10], [8, 16]], ["t3", [10, 15], [16, 25]], ["t4", [15, null], [25, null]]];
const PEAK_ELEV_MINS = [["any"], ["e1", 5000, 1500], ["e2", 8000, 2500], ["e3", 10000, 3000], ["e4", 12000, 3500], ["e5", 14000, 4000]];
const PROM_MINS = [["any"], ["p1", 1000, 300], ["p2", 2000, 600], ["p3", 3000, 1000], ["p4", 5000, 1500]];
const WITHIN = [["w1", 10, 15], ["w2", 25, 40], ["w3", 50, 80], ["w4", 100, 150]];
const isMetric = uElevUnit => uElevUnit() === "m";
const fmtN = n => n.toLocaleString("en-US");
const rangeLabel = (o, metric, unit) => {
  if (!o || o[0] === "any") return "Any";
  const [lo, hi] = metric ? o[2] : o[1];
  return lo == null ? "< " + fmtN(hi) + " " + unit : hi == null ? fmtN(lo) + "+ " + unit : fmtN(lo) + "–" + fmtN(hi) + " " + unit;
};
const minLabel = (o, metric, unit) => !o || o[0] === "any" ? "Any" : fmtN(metric ? o[2] : o[1]) + "+ " + unit;
const withinLabel = (o, metric, unit) => (metric ? o[2] : o[1]) + " " + unit;
const findB = (list, k) => list.find(o => o[0] === k) || null;
/* The grade options a range can be set from, per grading system, on the SAME number line as
   gradeNumFrom (lib/grade.js). Each entry is [label, lo, hi]: `lo` is the bound used when the
   grade is the MINIMUM, `hi` when it is the MAXIMUM, so a pick means "this grade" at either end.
   YDS letters sit on quarter steps (5.10a = 10.25 … 5.10d = 11, the catalog's unanimous
   convention). A bare "5.10" stores 10, so 5.10a as the MINIMUM uses 10 — otherwise a route
   written without a letter falls out of the 5.10 band it belongs to. The one collision is in the
   DATA, not here: 5.10d and a bare 5.11 are both stored as 11, so they travel together there. */
const GRADE_SCALES = (() => {
  const yds = [];
  for (let i = 0; i <= 9; i++) yds.push(["5." + i, i, i]);
  for (let b = 10; b <= 15; b++) for (let k = 0; k < 4; k++) yds.push(["5." + b + "abcd"[k], k === 0 ? b : b + (k + 1) / 4, b + (k + 1) / 4]);
  const ints = (pre, a, z) => { const o = []; for (let i = a; i <= z; i++) o.push([pre + i, i, i]); return o; };
  // A/C: aid and clean-aid grades share one number (A2 and C2 are both 2), so one option covers both.
  const aid = []; for (let i = 0; i <= 5; i++) aid.push(["A" + i + "/C" + i, i, i]);
  return { yds, v: [["VB", -1, -1], ...ints("V", 0, 17)], class: ints("Class ", 1, 5), wi: ints("WI", 1, 7), m: ints("M", 1, 14), aid, snow: [["Easy Snow", 1, 1], ["Mod. Snow", 2, 2], ["Steep Snow", 3, 3]] };
})();
const SCALE_NAMES = { yds: "5.x rock", v: "V", class: "Class", wi: "WI ice", m: "M mixed", aid: "A/C aid", snow: "Snow" };
// AN ALLOW-LIST, each entry MEASURED rather than assumed (2026-09-24, all 205,543 routes —
// scripts/oneoff/measure-grade-num-coverage-by-discipline.mjs and measure-typed-grade-columns.mjs).
//   sport / trad / toprope / bouldering: 100% graded on one scale; scrambling 90.6% on Class.
//   ice / mixed / aid: a route can carry several grades at once ("5.8 AI3", "5.9 A2"), so each
//     offers its own scale — read from the per-scale columns 0206 added, filled from Mountain
//     Project's export (scripts/pipeline/import-route-grades.mjs) — plus 5.x, the free grade most of
//     these rows store as their primary grade.
// Re-run the measurements before widening this.
//   mountaineering / alpine / scrambling: one final grade per route, on the scale its crux is on —
//     Class for walk-ups, scrambles and glacier climbs, 5.x for roped rock, WI/AI for an ice crux
//     (an ice final also fills ice_grade_num, which the WI range reads). Both also offer Snow:
//     Mountain Project's Easy / Mod. / Steep Snow, read from snow_grade_num (0246), which a route
//     carries BESIDE its Class or 5.x grade — the owner wanted both (2026-10-04).
const DISC_GRADE_SCALES = { sport: ["yds"], trad: ["yds"], toprope: ["yds"], bouldering: ["v"], scrambling: ["class", "yds"], mountaineering: ["class", "snow", "yds", "wi"], alpine: ["yds", "class", "wi", "snow"], aid: ["aid", "yds"], mixed: ["m", "yds"], ice: ["wi", "yds"] };
// The disciplines whose grade_system says which scale grade_num is on, so a range there passes it
// as grade_sys: ice/mixed/aid since 0196, and the three mountain disciplines since their labels
// were corrected (above). The rock disciplines keep #1811's behaviour — one scale each, no label
// needed.
const GRADE_SYS_FILTERED = { ice: 1, mixed: 1, aid: 1, mountaineering: 1, alpine: 1, scrambling: 1 };
// SEVERAL DISCIPLINES can be picked at once (0334), as Mountain Project ticks Trad, Sport and Toprope
// together. A range is then offered on the scales EVERY picked discipline shares — sport + trad on
// 5.x, ice + mixed on 5.x, bouldering + sport on none — because one number means one grade only
// within one scale.
const gradeScalesFor = discs => { const ls = (discs || []).map(d => DISC_GRADE_SCALES[d] || []); return ls.length ? ls[0].filter(s => ls.every(l => l.indexOf(s) >= 0)) : []; };
const gradeScaleFor = (discs, sys) => { const ss = gradeScalesFor(discs); if (!ss.length) return null; return GRADE_SCALES[ss.indexOf(sys) >= 0 ? sys : ss[0]] || null; };
const gradeSysFor = (discs, sys) => { const ss = gradeScalesFor(discs); return ss.indexOf(sys) >= 0 ? sys : (ss[0] || ""); };
const discLabel = d => (DISCIPLINES.find(x => x[0] === d) || [, d])[1];
// Wall order first (owner, 2026-10-21: "grouped by area such as crag or wall so they show up in
// order"): each wall's climbs together, left to right, under the wall's name.
const FINDER_SORTS = [["lr", "By wall, left → right"], ["rl", "By wall, right → left"], ["name", "Name A→Z"], ["name_desc", "Name Z→A"], ["stars_desc", "Most starred"]];
const SORT_PHRASE = { name: "name", name_desc: "name (Z→A)", area: "wall", lr: "wall, left to right", rl: "wall, right to left", grade_asc: "easiest", grade_desc: "hardest", stars_desc: "most starred", near: "nearest first" };
const GROUPED_SORTS = { area: 1, lr: 1, rl: 1, near: 1 };
// A whole state (or more) is not listed until an area in it is picked or a name is typed: an
// unfiltered California list took 3.3 s in the database (2026-10-21), and nobody pages through
// 44,000 climbs. Mountain Project's Route Finder starts from a Location the same way.
const FINDER_NEEDS_AREA = { world: 1, country: 1, state: 1 };
const gradeRangeLabel = (lo, hi) => lo && hi ? (lo === hi ? lo : lo + "–" + hi) : lo ? lo + " and up" : hi ? "Up to " + hi : "";
// One filter state -> the RPC's arguments. Shared by the applied query and the sheet's draft
// count, so the number on "Show N routes" is the number the list then shows.
// `metric` decides which of a bucket's two bound sets is meant; the RPC always takes feet and km.
const finderArgs = (q, f, metric) => {
  const len = LEN_BUCKETS.find(l => l[0] === f.len) || LEN_BUCKETS[0];
  const sc = gradeScaleFor(f.discs, f.gSys);
  const lo = sc && f.gLo ? sc.find(o => o[0] === f.gLo) : null, hi = sc && f.gHi ? sc.find(o => o[0] === f.gHi) : null;
  const g = findB(GAIN_BUCKETS, f.gain), t = findB(TRIP_BUCKETS, f.trip), e = findB(PEAK_ELEV_MINS, f.elev), p = findB(PROM_MINS, f.prom), w = f.near && findB(WITHIN, f.within);
  const gr = g && g[1] ? (metric ? g[2].map(v => v == null ? null : Math.round(v * FT_PER_M)) : g[1]) : [null, null];
  const tr = t && t[1] ? (metric ? t[2] : t[1].map(v => v == null ? null : v * KM_PER_MI)) : [null, null];
  return { q, disc: f.discs.join(","), gradeSys: (lo || hi) && f.discs.some(d => GRADE_SYS_FILTERED[d]) ? gradeSysFor(f.discs, f.gSys) : null, minGrade: lo ? lo[1] : null, maxGrade: hi ? hi[2] : null, minStars: f.minStars || null, minPitches: f.minPitches || null, minLengthM: len[3], maxLengthM: len[4], sortBy: f.sortBy === "near" && !f.near ? "lr" : f.sortBy,
    minGainFt: gr[0], maxGainFt: gr[1], minTripKm: tr[0], maxTripKm: tr[1],
    minElevFt: e && e[1] ? (metric ? Math.round(e[2] * FT_PER_M) : e[1]) : null, minPromFt: p && p[1] ? (metric ? Math.round(p[2] * FT_PER_M) : p[1]) : null,
    nearLat: f.near ? f.near.lat : null, nearLng: f.near ? f.near.lng : null, withinKm: w ? (metric ? w[2] : w[1] * KM_PER_MI) : null };
};
// Filters that narrow the AREAS before any climb is read (0369) make a whole state cheap to search,
// so they lift FINDER_NEEDS_AREA. Gain and round trip are read climb by climb and do not: alone
// over California they took 3.6 s cold, past the 3 s statement timeout (2026-10-24).
const narrowsAreas = f => !!(f.near || (f.elev && f.elev !== "any") || (f.prom && f.prom !== "any"));
// PINS a bar under the app's own top bar once the page scrolls past it. Not CSS sticky: #appscroll
// is overflow:auto but grows to its content on a phone, where the DOCUMENT scrolls, and a sticky
// child of a scroll container that never scrolls never sticks. The pin line is the bottom of the
// app's sticky top bar (phone), or the top of #appscroll when that is what scrolls (desktop); both
// are measured, because the bar's height differs between the two shells.
// `endRef` (optional) marks where the list the bar searches ENDS: once that marker rises to the
// bar's bottom edge the bar lets go and scrolls away with the list, as CSS sticky would inside it.
function usePinnedBar(endRef) {
  const wrapRef = useRef(null), barRef = useRef(null);
  const [pin, setPin] = useState(null); // null, or { top, left, width, height } while pinned
  useEffect(() => {
    const lineY = () => {
      const w = wrapRef.current, sc = w && w.closest("#appscroll");
      if (sc && sc.scrollHeight > sc.clientHeight + 1) return sc.getBoundingClientRect().top;
      let bottom = 0;
      for (const e of document.elementsFromPoint(window.innerWidth / 2, 1)) {
        if (w && w.contains(e)) continue;
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          const pos = getComputedStyle(n).position;
          if (pos === "sticky" || pos === "fixed") { bottom = Math.max(bottom, n.getBoundingClientRect().bottom); break; }
        }
      }
      return bottom;
    };
    let line = lineY(), raf = 0;
    const check = () => {
      raf = 0;
      const w = wrapRef.current, b = barRef.current;
      if (!w || !b) return;
      const r = w.getBoundingClientRect(), end = endRef && endRef.current;
      const past = !!end && end.getBoundingClientRect().top < line + b.offsetHeight;
      const next = r.top < line && !past ? { top: Math.round(line), left: Math.round(r.left), width: Math.round(r.width), height: b.offsetHeight } : null;
      setPin(p => (!p && !next) || (p && next && p.top === next.top && p.left === next.left && p.width === next.width && p.height === next.height) ? p : next);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    const onResize = () => { line = lineY(); onScroll(); };
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    check();
    return () => { document.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onResize); if (raf) cancelAnimationFrame(raf); };
  }, [endRef]);
  return { wrapRef, barRef, pin };
}
function RouteFinderPanel({ scope, onOpen, onJumpToArea, C, uElevN, uElevUnit, presetDisc, bookmarks, onToggleBookmark, onToggleWish, userLists, onToggleListRoute, onAddClimb, onAddArea }) {
  const { wishlist } = useContext(ClimberCtx);
  const DEF = { discs: [], sortBy: "lr", minStars: 0, minPitches: 0, len: "any", gSys: "", gLo: "", gHi: "", gain: "any", trip: "any", elev: "any", prom: "any", near: null, within: "w2" };
  const metric = isMetric(uElevUnit);
  // A chart bar on the area page opens the finder already narrowed to its discipline.
  const DEF0 = presetDisc ? { ...DEF, discs: [presetDisc] } : DEF;
  // LOCATION: where the search runs. Starts as the area the finder was opened from; on a state it
  // must be narrowed to an area inside it first (FINDER_NEEDS_AREA). The panel is keyed by the
  // scope's id, so a new scope starts a new Location.
  const [loc, setLoc] = useState(scope);
  const [q, setQ] = useState("");
  // The query follows the box a beat behind, so typing "castle" is one search, not six.
  const [qD, setQD] = useState("");
  useEffect(() => { const t = setTimeout(() => setQD(q), 250); return () => clearTimeout(t); }, [q]);
  const needsAreaFor = f => !!FINDER_NEEDS_AREA[loc.area_type] && !qD.trim() && !narrowsAreas(f);
  const [saveFor, setSaveFor] = useState(null);
  const { wrapRef: barWrap, barRef, pin } = usePinnedBar();
  // Routes | Areas. One text box serves both, so switching carries what you typed across.
  const [mode, setMode] = useState("routes");
  const [af, setAf] = useState(DEF0);
  const [df, setDf] = useState(DEF0);
  const needsArea = needsAreaFor(af);
  const [sheet, setSheet] = useState(false);
  // DISTANCE AWAY's point: your device's location, or a town / zip you type (AllTrails offers both).
  const [nearQ, setNearQ] = useState("");
  const [nearSt, setNearSt] = useState({ busy: false, err: "", hits: [] });
  const pickNear = pt => { setNearSt({ busy: false, err: "", hits: [] }); setNearQ(""); setDf(d => ({ ...d, near: pt, sortBy: "near" })); };
  const locateMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setNearSt({ busy: false, err: "Location isn’t available on this device — type a town or zip code instead.", hits: [] }); return; }
    setNearSt({ busy: true, err: "", hits: [] });
    navigator.geolocation.getCurrentPosition(
      pos => pickNear({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" }),
      e => setNearSt({ busy: false, err: e && e.code === 1 ? "Location is turned off for this site — allow it, or type a town or zip code." : "Couldn’t find your location — try again, or type a town or zip code.", hits: [] }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  };
  const findNear = () => {
    if (!nearQ.trim()) return;
    setNearSt({ busy: true, err: "", hits: [] });
    searchPlaces(nearQ).then(rows => {
      if (!rows.length) setNearSt({ busy: false, err: "No town or zip code matches “" + nearQ.trim() + "”.", hits: [] });
      else if (rows.length === 1) pickNear({ lat: rows[0].lat, lng: rows[0].lng, label: rows[0].name });
      else setNearSt({ busy: false, err: "", hits: rows });
    }, () => setNearSt({ busy: false, err: "Couldn’t look that place up — check your connection and try again.", hits: [] }));
  };
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [page, setPage] = useState(0);
  const [all, setAll] = useState([]);
  const lenRange = (LEN_BUCKETS.find(l => l[0] === af.len) || LEN_BUCKETS[0]);
  // Resolved against the APPLIED discipline's scale, so a label saved under one discipline can
  // never be read on another's number line (a "V5" bound is not a 5.5 bound).
  const gScale = gradeScaleFor(af.discs, af.gSys);
  const gLoO = gScale && af.gLo ? gScale.find(o => o[0] === af.gLo) : null;
  const gHiO = gScale && af.gHi ? gScale.find(o => o[0] === af.gHi) : null;
  const queryArgs = { ...finderArgs(qD, af, metric), page };
  const { data: batch, isLoading: lr0, error } = useSubtreeRoutes(needsArea ? null : loc.id, queryArgs);
  const { data: total } = useSubtreeRouteCount(needsArea ? null : loc.id, queryArgs);
  // A disabled query can still report loading; while the area picker shows, nothing is loading.
  const isLoading = !needsArea && lr0;
  const { data: locKids, isLoading: lk, error: ek } = useAreaChildren(loc.id, { enabled: needsArea });
  // The sheet's button says how many routes the DRAFT would show ("Show 212 routes"), as
  // Mountain Project's filter screen does — so a tap on it visibly does something, and a
  // combination that matches nothing is seen before the sheet is left. Queried only while open.
  const { data: draftTotal, isFetching: draftCounting } = useSubtreeRouteCount(sheet && !needsAreaFor(df) ? loc.id : null, finderArgs(qD, df, metric));
  // While the sheet is open the page behind it must not scroll. The document is the scroller
  // here, and on a phone a drag past the end of the sheet moved the page instead, which slid the
  // browser's own toolbar in and out and shifted the sheet under the climber's finger.
  useEffect(() => {
    if (!sheet) return;
    const el = document.documentElement, prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => { el.style.overflow = prev; };
  }, [sheet]);

  const saveSearch = () => {
    const name = q.trim() || "Untitled search";
    const newSearch = { id: Date.now(), name, q, filters: af, loc };
    setSavedSearches(prev => [newSearch, ...prev]);
  };
  const loadSearch = (search) => {
    setQ(search.q);
    setAf({ ...DEF, ...search.filters });
    setLoc(search.loc || scope);
    setShowSaved(false);
    setPage(0);
    setAll([]);
  };
  const deleteSearch = (id) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  };
  useEffect(() => { setPage(0); setAll([]); }, [qD, af, loc.id]);
  useEffect(() => {
    if (!batch) return;
    setAll(prev => page === 0 ? batch : [...prev, ...batch]);
  }, [batch, page]);
  const areaIds = useMemo(() => [...new Set(all.map(r => r.area_id).filter(Boolean))], [all]);
  const { data: areaNames } = useAreaNamesByIds(areaIds);
  const { data: areaHits, isLoading: la, error: ea } = useAreaSearch(scope.id, mode === "areas" ? qD.trim() : "");

  const nF = af.discs.length + (gLoO || gHiO ? 1 : 0) + (af.minStars ? 1 : 0) + (af.minPitches ? 1 : 0) + (af.len !== "any" ? 1 : 0) + (af.sortBy !== DEF.sortBy ? 1 : 0) + ["gain", "trip", "elev", "prom"].filter(k => af[k] && af[k] !== "any").length + (af.near ? 1 : 0);
  const afChips = [];
  // One chip per discipline; removing one keeps the grade range only if the disciplines left still
  // share its scale.
  af.discs.forEach(d => afChips.push({ k: "d-" + d, label: discLabel(d), clear: () => setAf(a => { const discs = a.discs.filter(x => x !== d); const keep = discs.length && gradeSysFor(discs, a.gSys) === gradeSysFor(a.discs, a.gSys); return { ...a, discs, ...(keep ? {} : { gSys: "", gLo: "", gHi: "" }), sortBy: !discs.length && (a.sortBy === "grade_asc" || a.sortBy === "grade_desc") ? DEF.sortBy : a.sortBy }; }) }));
  if (gLoO || gHiO) afChips.push({ k: "g", label: gradeRangeLabel(gLoO && gLoO[0], gHiO && gHiO[0]), clear: () => setAf(a => ({ ...a, gLo: "", gHi: "" })) });
  if (af.minStars) afChips.push({ k: "s", label: af.minStars + "★+", clear: () => setAf(a => ({ ...a, minStars: 0 })) });
  if (af.minPitches) afChips.push({ k: "p", label: af.minPitches + "+ pitches", clear: () => setAf(a => ({ ...a, minPitches: 0 })) });
  // The APPLIED-filter chip is a second label site, and it must go through the same formatter or
  // the filter bar and the chip that says what you filtered by disagree about units.
  if (af.len !== "any") afChips.push({ k: "len", label: lenLabel(lenRange, uElevN, uElevUnit), clear: () => setAf(a => ({ ...a, len: "any" })) });
  const eU = uElevUnit(), dU = metric ? "km" : "mi";
  if (af.gain && af.gain !== "any") afChips.push({ k: "gain", label: rangeLabel(findB(GAIN_BUCKETS, af.gain), metric, eU) + " gain", clear: () => setAf(a => ({ ...a, gain: "any" })) });
  if (af.trip && af.trip !== "any") afChips.push({ k: "trip", label: rangeLabel(findB(TRIP_BUCKETS, af.trip), metric, dU) + " round trip", clear: () => setAf(a => ({ ...a, trip: "any" })) });
  if (af.elev && af.elev !== "any") afChips.push({ k: "elev", label: "Peak " + minLabel(findB(PEAK_ELEV_MINS, af.elev), metric, eU), clear: () => setAf(a => ({ ...a, elev: "any" })) });
  if (af.prom && af.prom !== "any") afChips.push({ k: "prom", label: minLabel(findB(PROM_MINS, af.prom), metric, eU) + " prominence", clear: () => setAf(a => ({ ...a, prom: "any" })) });
  if (af.near) afChips.push({ k: "near", label: "Within " + withinLabel(findB(WITHIN, af.within) || WITHIN[1], metric, dU) + " of " + af.near.label, clear: () => setAf(a => ({ ...a, near: null, sortBy: a.sortBy === "near" ? DEF.sortBy : a.sortBy })) });
  if (af.sortBy !== DEF.sortBy) afChips.push({ k: "sort", label: { name: "A→Z", name_desc: "Z→A", area: "By area", lr: "Left → right", rl: "Right → left", grade_asc: "↓ Easiest", grade_desc: "↑ Hardest", stars_desc: "Most starred", near: "Nearest first" }[af.sortBy], clear: () => setAf(a => ({ ...a, sortBy: DEF.sortBy })) });
  const inList = (l, id) => (l.routeIds || []).includes(id);
  const customLists = (userLists || []).filter(l => l.id !== "ul_obj");
  const isSaved = id => (wishlist || []).includes(id) || customLists.some(l => inList(l, id));

  const rowBtn = on => ({ ...BTN_LG, flex: 1, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.text });
  const chip = (label, on, fn) => <button key={label} onClick={fn} aria-pressed={on} style={{ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>;
  const lab = s => <SL C={C}>{s}</SL>;

  const savePill = on => ({ ...CHIP, flexShrink: 0, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.textSub });
  const nRes = total != null ? total : all.length;

  return (
    <div>
      <ScreenHero C={C} title={"Route finder · " + loc.name} />
      {/* THE SEARCH BAR STAYS PUT (owner, 2026-10-21: "keep the search for areas and routes bar sticky
          to the top of the page"): Routes | Areas, the box, Filters and the applied chips pin under the
          app's top bar (usePinnedBar) while the results scroll under them. */}
      <div ref={barWrap} style={{ margin: "0 -14px", height: pin ? pin.height : undefined }}>
      <div ref={barRef} style={{ ...(pin ? { position: "fixed", top: pin.top, left: pin.left, width: pin.width, zIndex: 25, boxShadow: "0 6px 12px rgba(0,0,0,0.25)" } : {}), boxSizing: "border-box", background: C.bg, padding: "8px 14px 2px", borderBottom: "1px solid " + C.borderLight }}>
      <div style={{ display: "flex", gap: 4, background: C.surface, border: "1px solid " + C.border, borderRadius: 9, padding: 3, marginBottom: 8 }}>
        {[["routes", "Routes"], ["areas", "Areas"]].map(([k, l]) => <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 7, background: mode === k ? C.blueSolid : "transparent", color: mode === k ? "#fff" : C.textSub, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{l}</button>)}
      </div>
      <input aria-label={mode === "areas" ? "Search areas, crags, peaks" : "Search routes"} value={q} onChange={e => setQ(e.target.value)} placeholder={mode === "areas" ? "Search areas, crags, peaks…" : "Search routes in " + loc.name + "…"} style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 8 }} />
      {mode === "routes" ? <>
      {/* ONE style for the three buttons in this row. Filters was drawn in the text colour and
          Save search in blue, which read as two different sizes of type side by side. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => { setDf(af); setSheet(true); }} style={rowBtn(nF)}>{"Filters" + (nF ? " (" + nF + ")" : "")}</button>
        <button onClick={saveSearch} style={rowBtn(false)}>Save search</button>
        {savedSearches.length > 0 && <button onClick={() => setShowSaved(!showSaved)} style={rowBtn(true)}>{savedSearches.length} saved</button>}
      </div>
      {afChips.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          {afChips.map(c => <button key={c.k} onClick={c.clear} aria-label={"Remove filter: " + c.label} style={{ ...CHIP, display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px 7px 12px", border: "1px solid " + C.blueDim, background: C.blueBg, color: "#fff" }}>{c.label}<span aria-hidden="true" style={POP_CHIP_X}>✕</span></button>)}
          <button onClick={() => setAf(DEF)} style={{ ...BTN_LINK(C), padding: "7px 8px", color: C.textMuted, textDecoration: "underline" }}>Clear all</button>
        </div>
      ) : null}
      {/* No count after a failed read: "0 routes" above "Couldn't search routes" reads as an empty area. */}
      {!needsArea && !(error && total == null && !all.length) ? <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6, padding: "0 2px" }}>{nRes.toLocaleString() + " route" + (nRes !== 1 ? "s" : "") + " · sorted by " + SORT_PHRASE[af.sortBy]}</div> : null}
      </> : null}
      </div>
      </div>
      {loc.id !== scope.id ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 2px", fontSize: 12.5, color: C.textSub }}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"In " + loc.name + ", " + scope.name}</span>
          <button onClick={() => setLoc(scope)} style={{ ...BTN_LINK(C), padding: "4px 2px", flexShrink: 0 }}>Change area</button>
        </div>
      ) : null}
      {mode === "areas" ? (
        !qD.trim() ? <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "22px 12px", lineHeight: 1.5 }}>{"Type a name to find any area, crag or peak in " + scope.name + "."}</div>
        : la ? <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>
        : ea ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't search areas — check your connection and try again.</div>
        : !areaHits || !areaHits.length ? <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "22px 12px" }}>No areas match.</div>
        : <>
          {areaHits.map(a => (
            <div key={a.id} {...clickable(() => onJumpToArea(a))} style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[ATYPE[a.area_type] || a.area_type, a.parent_name].filter(Boolean).join(" · ")}</div>
              </div>
              {a.route_count > 0 ? <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{a.route_count + " climb" + (a.route_count !== 1 ? "s" : "")}</span> : null}
            </div>
          ))}
          {areaSearchTotal(areaHits) > areaHits.length ? <div style={{ fontSize: 11.5, color: C.textMuted, padding: "10px 4px", textAlign: "center" }}>{"Closest " + areaHits.length + " of " + areaSearchTotal(areaHits).toLocaleString() + " — keep typing to narrow."}</div> : null}
        </>
      ) : <>
      {showSaved && savedSearches.length > 0 && (
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: 10, margin: "10px 0" }}>
          {savedSearches.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderBottom: "1px solid " + C.borderLight, cursor: "pointer" }} {...clickable(() => loadSearch(s))}>
              <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 600 }}>{s.name}</div>
              <button aria-label="Remove saved search" onClick={e => { e.stopPropagation(); deleteSearch(s.id); }} style={POP_REMOVE}>✕</button>
            </div>
          ))}
        </div>
      )}
      {/* PICK AN AREA FIRST on a state (FINDER_NEEDS_AREA). The filters still apply once one is
          picked; typing a climb's name searches the whole state straight away. */}
      {needsArea ? <>
        <SL C={C}>{"Pick an area in " + loc.name}</SL>
        <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: 10 }}>{"Choose where to look and the finder lists its climbs with your filters — or type a climb's name above, or set Distance away, Peak elevation or Prominence under Filters, to search all of " + loc.name + "."}</div>
        {lk ? <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div> : null}
        {ek && !(locKids && locKids.length) ? <div style={{ color: C.red, fontSize: 12.5 }}>{"Couldn't load the areas in " + loc.name + " — check your connection and try again."}</div> : null}
        {(locKids || []).filter(a => a.route_count > 0).map(a => (
          <div key={a.id} {...clickable(() => setLoc(a))} style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{a.name}</span>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 600, flexShrink: 0 }}>{a.route_count.toLocaleString() + " climb" + (a.route_count !== 1 ? "s" : "") + " →"}</span>
          </div>
        ))}
      </> : <>
      {af.minStars ? <div style={{ fontSize: 11.5, color: C.textMuted, margin: "8px 2px", lineHeight: 1.45 }}>{"Few climbs have a star rating yet, so climbs nobody has rated still show. Only climbs rated below " + af.minStars + "★ are hidden."}</div> : null}
      {error && !all.length ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't search routes — check your connection and try again.</div> : null}
      {error && all.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Couldn't refresh just now — showing the results from your last load.</div> : null}
      {/* GROUPED BY WALL on a wall sort: a heading opens the wall's page and saves it; the rows under
          it then drop the wall's name, which the heading already says. */}
      {all.map((r, i) => {
        const wall = areaNames && areaNames[r.area_id];
        const head = GROUPED_SORTS[af.sortBy] && (i === 0 || all[i - 1].area_id !== r.area_id);
        const booked = (bookmarks || []).includes(r.area_id);
        const saved = isSaved(r.id);
        return <Fragment key={r.id}>
          {head ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: i ? "16px 0 8px" : "10px 0 8px" }}>
              <button onClick={() => onJumpToArea({ id: r.area_id, name: wall || "" })} style={{ ...BTN_LINK(C), flex: 1, minWidth: 0, textAlign: "left", padding: "3px 0", fontSize: 13.5, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(wall || "This wall") + " ›"}</button>
              {onToggleBookmark ? <button onClick={() => onToggleBookmark(r.area_id)} aria-label={booked ? "Remove " + (wall || "this wall") + " from Saved" : "Save " + (wall || "this wall")} style={savePill(booked)}>{booked ? "★ Saved" : "☆ Save area"}</button> : null}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
            <RouteRow r={r} onOpen={onOpen} C={C} areaName={GROUPED_SORTS[af.sortBy] ? null : wall} />
            {onToggleWish ? <button onClick={() => setSaveFor({ ...r, wall })} aria-haspopup="dialog" aria-label={"Save " + r.name + (saved ? ", saved" : "")} style={{ ...CHIP, flexShrink: 0, width: 44, marginBottom: 8, padding: 0, fontSize: 17, cursor: "pointer", border: "1px solid " + (saved ? C.blue : C.border), background: saved ? C.blueBg : C.card, color: saved ? "#fff" : C.textSub }}><span aria-hidden="true">{saved ? "★" : "☆"}</span></button> : null}
          </div>
        </Fragment>;
      })}
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {!isLoading && all.length > 0 && total != null && all.length < total && (
        <button onClick={() => setPage(p => p + 1)} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Load more</button>
      )}
      {/* A star minimum no longer empties a search (0334: unrated climbs stay in), so the
          explanation left is the grade range's: a route with no readable grade fails it. */}
      {!isLoading && !error && !all.length && <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "26px 12px", lineHeight: 1.5 }}>{(gLoO || gHiO) ? "No routes match these filters. Routes without a readable grade are hidden while a grade range is set — try widening it or setting it back to Any." : ["gain", "trip", "elev", "prom"].some(k => af[k] && af[k] !== "any") ? "No routes match these filters. Gain, round trip, peak elevation and prominence are recorded mostly for mountain routes, and climbs without the figure are hidden while one is set." : af.near ? "No routes in " + loc.name + " are that close to " + af.near.label + " — try a wider distance." : "No routes match these filters."}</div>}
      </>}
      </>}

      {/* Under the list of areas and climbs, as on the area page: a search that did not find it is
          exactly when a climber adds it. Files into the area the finder is looking in. */}
      {!isLoading && !la ? <AddHereFooter area={loc} onAddClimb={onAddClimb} onAddArea={onAddArea} C={C} /> : null}

      {/* SAVE FROM THE LIST (owner, 2026-10-21: "a quick option ... to add the climb to list of
          objectives, saved climbs, areas"): the same three things the route and area pages save —
          My Objectives, your own lists, and the climb's wall — without opening the climb.
          Portalled for the same #appscroll stacking reason as the Filters sheet below. */}
      {saveFor ? createPortal(
        <div role="dialog" aria-modal="true" aria-label={"Save " + saveFor.name} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          {/* The backdrop is a real button under the sheet, so a tap outside closes it without a
              mouse-only div; the ✕ and Done are the keyboard's way out. */}
          <button onClick={() => setSaveFor(null)} aria-label="Close" tabIndex={-1} style={{ position: "absolute", inset: 0, background: "transparent", border: "none", padding: 0, cursor: "default" }} />
          <div style={{ position: "relative", background: C.bg, width: "100%", maxWidth: 440, borderRadius: "16px 16px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ borderBottom: "1px solid " + C.border, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "16px 16px 12px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"Save " + saveFor.name}</div>
              <button onClick={() => setSaveFor(null)} aria-label="Close" style={POP_CLOSE}>✕</button>
            </div>
            <div style={{ padding: "6px 16px 18px", overflowY: "auto", overscrollBehavior: "contain", flex: 1, minHeight: 0 }}>
              {(() => {
                const row = (key, label, sub, on, fn) => (
                  <button key={key} onClick={fn} aria-pressed={on} style={{ ...BTN_LG, width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", marginTop: 8, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: C.text }}>
                    <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{label}</span>{sub ? <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, fontWeight: 500, marginTop: 2, lineHeight: 1.4 }}>{sub}</span> : null}</span>
                    <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: on ? C.blue : C.textSub }}>{on ? "✓ Saved" : "+ Add"}</span>
                  </button>
                );
                return <>
                  {row("obj", "My Objectives", "Climbs you want to do. Partners who want the same climb can find you.", (wishlist || []).includes(saveFor.id), () => onToggleWish(saveFor.id))}
                  {onToggleListRoute ? customLists.map(l => row("l-" + l.id, l.name, null, inList(l, saveFor.id), () => onToggleListRoute(l.id, saveFor.id))) : null}
                  {onToggleBookmark && saveFor.area_id ? row("area", "Save the area: " + (saveFor.wall || "this wall"), "Saved areas are listed under Logbook → Saved.", (bookmarks || []).includes(saveFor.area_id), () => onToggleBookmark(saveFor.area_id)) : null}
                  {!customLists.length ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 12, lineHeight: 1.45 }}>Make your own lists under Logbook → Saved, and they show up here.</div> : null}
                </>;
              })()}
              <button onClick={() => setSaveFor(null)} style={{ ...BTN_LG, width: "100%", marginTop: 16, border: "none", background: C.blueSolid, color: "#fff" }}>Done</button>
            </div>
          </div>
        </div>, document.body) : null}

      {/* Portalled to <body>, and not because 300 was too low a z-index. #appscroll — the
          tab's scroll container — carries `animation-fill-mode: both`, which makes it a
          permanent stacking context at z-index auto. Every fixed overlay rendered inside it
          is therefore trapped below the app header + primary nav (z-index 30), whatever
          z-index it asks for. This sheet opens at 88vh, so its top 81px — the whole title
          row and the × — sat behind the tabs, with the × not even clickable. Same reason
          RouteDetail portals its own sheets.

          A FULL-HEIGHT SCREEN, not an 88vh bottom sheet (owner, 2026-10-21: on a phone the
          Discipline row was hidden under the header, the × misbehaved and Show routes did
          nothing). On iOS `vh` is the viewport with the browser toolbar HIDDEN, so an 88vh sheet
          pinned to the bottom of a shorter visible area overflowed off the TOP: the title, the ×
          and the Discipline chips sat under the browser's own bar, and Show routes was the last
          thing in a long scroll. Now it fills the visible area like Mountain Project's filter
          screen — the title row clears the notch (safe-area-inset-top), the list scrolls between,
          and Clear all / Show N routes are pinned at the bottom above the home indicator. */}
      {sheet ? createPortal(
        <div onClick={() => setSheet(false)} role="dialog" aria-modal="true" aria-label="Filter routes" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "stretch", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 520, height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
            <div style={{ zIndex: 2, background: C.bg, borderBottom: "1px solid " + C.border, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Filter routes</div>
              <button onClick={() => setSheet(false)} aria-label="Close" style={POP_CLOSE}>✕</button>
            </div>
            {/* overscrollBehavior: without it a drag that reaches the end of this list keeps going on
                the page behind the sheet (the document is the scroller here), so the sheet reads as
                stuck — the same chaining #684 fixed on the other sheets. */}
            <div style={{ padding: "0 16px 18px", overflowY: "auto", overscrollBehavior: "contain", flex: 1, minHeight: 0 }}>
            {lab("Distance away")}
            {df.near ? <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, marginBottom: 8 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{"From " + df.near.label}</span>
                <button onClick={() => setDf(d => ({ ...d, near: null, sortBy: d.sortBy === "near" ? DEF.sortBy : d.sortBy }))} style={{ ...BTN_LINK(C), padding: "4px 2px", flexShrink: 0 }}>Change</button>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{WITHIN.map(o => chip("Within " + withinLabel(o, metric, dU), df.within === o[0], () => setDf(d => ({ ...d, within: o[0] }))))}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.45 }}>{"Measured in a straight line to each climb's crag or peak, inside " + loc.name + "."}</div>
            </> : <>
              <button onClick={locateMe} disabled={nearSt.busy} style={{ ...BTN_LG, width: "100%", marginBottom: 8, border: "1px solid " + C.border, background: C.surface, color: C.text }}>{nearSt.busy ? "Finding…" : "Use my location"}</button>
              <form onSubmit={e => { e.preventDefault(); findNear(); }} style={{ display: "flex", gap: 8 }}>
                <input aria-label="Town or zip code" value={nearQ} onChange={e => setNearQ(e.target.value)} placeholder="…or a town or zip code" style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box" }} />
                <button type="submit" disabled={nearSt.busy || !nearQ.trim()} style={{ ...BTN_LG, flexShrink: 0, border: "1px solid " + C.border, background: C.surface, color: C.text }}>Go</button>
              </form>
              {nearSt.err ? <div style={{ fontSize: 12, color: C.red, marginTop: 8, lineHeight: 1.45 }}>{nearSt.err}</div> : null}
              {nearSt.hits.length ? <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>Which one?</div>
                {nearSt.hits.map((h, i) => <button key={i} onClick={() => pickNear({ lat: h.lat, lng: h.lng, label: h.name })} style={{ ...BTN_LG, width: "100%", textAlign: "left", marginBottom: 6, border: "1px solid " + C.border, background: C.surface, color: C.text }}>{h.name}{h.sub ? <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, fontWeight: 500 }}>{h.sub}</span> : null}</button>)}
              </div> : null}
            </>}
            {lab("Discipline")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {/* Tick as many as you like; a range stays only while every ticked discipline shares its scale. */}
              {DISCIPLINES.filter(d => d[0]).map(d => chip(d[1], df.discs.includes(d[0]), () => setDf(x => { const discs = x.discs.includes(d[0]) ? x.discs.filter(v => v !== d[0]) : [...x.discs, d[0]]; const keep = discs.length && gradeSysFor(discs, x.gSys) === gradeSysFor(x.discs, x.gSys) && gradeScalesFor(discs).length; return { ...x, discs, ...(keep ? {} : { gSys: "", gLo: "", gHi: "" }), sortBy: !discs.length && (x.sortBy === "grade_asc" || x.sortBy === "grade_desc") ? DEF.sortBy : x.sortBy }; })))}
            </div>
            {df.discs.length > 1 ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>{"Showing " + df.discs.map(discLabel).join(" + ") + " climbs."}</div> : null}
            {lab("Grade")}
            {(() => {
              const sc = gradeScaleFor(df.discs, df.gSys);
              if (!df.discs.length) return <div style={{ fontSize: 12.5, color: C.textMuted }}>Pick a discipline above to filter by grade — grades aren't comparable across climbing types.</div>;
              if (!sc) return <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.45 }}>{df.discs.map(discLabel).join(" and ") + " are graded on different scales, so a grade range can't cover them together. Pick disciplines that share a scale, such as Sport and Trad."}</div>;
              const scales = gradeScalesFor(df.discs), curSys = gradeSysFor(df.discs, df.gSys);
              const iLo = df.gLo ? sc.findIndex(o => o[0] === df.gLo) : -1, iHi = df.gHi ? sc.findIndex(o => o[0] === df.gHi) : -1;
              const sel = (label, val, opts, set) => (
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: C.textMuted, fontWeight: 700 }}>{label}
                  <select aria-label={label + " grade"} value={val} onChange={e => set(e.target.value)} style={{ padding: "10px 10px", borderRadius: 10, border: "1px solid " + (val ? C.blue : C.border), background: val ? C.blueBg : C.surface, color: val ? "#fff" : C.text, fontSize: 14, fontWeight: 700 }}>
                    <option value="">Any</option>
                    {opts.map(o => <option key={o[0]} value={o[0]}>{o[0]}</option>)}
                  </select>
                </label>
              );
              return (
                <div>
                  {/* Ice is graded on two scales in this catalog, so the range is set on one at a
                      time; switching scale clears the bounds, which belong to the old one. */}
                  {scales.length > 1 ? <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>{scales.map(s => chip(SCALE_NAMES[s] || s, curSys === s, () => setDf(d => ({ ...d, gSys: s, gLo: "", gHi: "" }))))}</div> : null}
                  {/* Each end only offers grades on its own side of the other, so the pair can never
                      describe an empty range. */}
                  <div style={{ display: "flex", gap: 10 }}>
                    {sel("From", df.gLo, iHi >= 0 ? sc.slice(0, iHi + 1) : sc, v => setDf(d => ({ ...d, gLo: v })))}
                    {sel("To", df.gHi, iLo >= 0 ? sc.slice(iLo) : sc, v => setDf(d => ({ ...d, gHi: v })))}
                  </div>
                  {df.gLo || df.gHi ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>{"Routes without a readable grade are hidden while a grade range is set." + (df.discs.some(d => GRADE_SYS_FILTERED[d]) ? " So are routes graded only on a different scale." : "")}</div> : null}
                </div>
              );
            })()}
            {lab("Sort by")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {df.near ? chip("Nearest first", df.sortBy === "near", () => setDf(d => ({ ...d, sortBy: "near" }))) : null}
              {FINDER_SORTS.map(o => chip(o[1], df.sortBy === o[0], () => setDf(d => ({ ...d, sortBy: o[0] }))))}
              {df.discs.length ? [["grade_asc", "↓ Easiest"], ["grade_desc", "↑ Hardest"]].map(o => chip(o[1], df.sortBy === o[0], () => setDf(d => ({ ...d, sortBy: o[0] })))) : null}
            </div>
            {!df.discs.length ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>Pick a discipline above to sort by grade.</div> : null}
            {lab("Minimum stars")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{[[0, "Any"], [2, "★★+"], [3, "★★★+"], [4, "★★★★+"]].map(o => chip(o[1], df.minStars === o[0], () => setDf(d => ({ ...d, minStars: o[0] }))))}</div>
            {/* 0334: an unrated climb is not ruled out. 2 of 90,084 sport climbs had a rating when this
                was written, so the old rule turned every star search into an empty list. */}
            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.45 }}>Few climbs have a star rating yet, so climbs nobody has rated always show. This hides only climbs rated below the minimum.</div>
            {lab("Pitches")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{[[0, "Any"], [1, "1+ (single)"], [2, "2+ (multi-pitch)"], [3, "3+"], [5, "5+"], [10, "10+"]].map(o => chip(o[1], df.minPitches === o[0], () => setDf(d => ({ ...d, minPitches: o[0] }))))}</div>
            {lab("Length")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{LEN_BUCKETS.map(o => chip(lenLabel(o, uElevN, uElevUnit), df.len === o[0], () => setDf(d => ({ ...d, len: o[0] }))))}</div>
            {/* Recorded mostly on mountain routes (0369's header has the counts), so each says what a
                climb without the figure does: it is hidden while the filter is set, as an ungraded climb is by a grade range. */}
            {lab("Elevation gain")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{GAIN_BUCKETS.map(o => chip(rangeLabel(o, metric, eU), df.gain === o[0], () => setDf(d => ({ ...d, gain: o[0] }))))}</div>
            {lab("Round trip")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{TRIP_BUCKETS.map(o => chip(rangeLabel(o, metric, dU), df.trip === o[0], () => setDf(d => ({ ...d, trip: o[0] }))))}</div>
            {lab("Peak elevation")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{PEAK_ELEV_MINS.map(o => chip(minLabel(o, metric, eU), df.elev === o[0], () => setDf(d => ({ ...d, elev: o[0] }))))}</div>
            {lab("Prominence")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{PROM_MINS.map(o => chip(minLabel(o, metric, eU), df.prom === o[0], () => setDf(d => ({ ...d, prom: o[0] }))))}</div>
            {[df.gain, df.trip, df.elev, df.prom].some(v => v && v !== "any") ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.45 }}>Gain, round trip, peak elevation and prominence are recorded mostly for mountain routes. Climbs without the figure are hidden while one of these is set.</div> : null}
            </div>
            <div style={{ flexShrink: 0, display: "flex", gap: 8, padding: "12px 16px calc(env(safe-area-inset-bottom) + 12px)", borderTop: "1px solid " + C.border, background: C.bg }}>
              <button onClick={() => setDf(DEF)} style={{ ...BTN_LG, flex: 1, border: "1px solid " + C.border, background: C.surface, color: C.textSub }}>Clear all</button>
              <button onClick={() => { setAf(df); setSheet(false); }} style={{ ...BTN_LG, flex: 2, border: "none", background: C.blueSolid, color: "#fff" }}>{draftTotal == null || draftCounting ? "Show routes" : "Show " + draftTotal.toLocaleString() + " route" + (draftTotal !== 1 ? "s" : "")}</button>
            </div>
          </div>
        </div>, document.body) : null}
    </div>
  );
}

// ── Objectives: your wishlisted routes that fall within the current area ──
function ObjectivesPanel({ area, onOpen, C }) {
  const { wishlist } = useContext(ClimberCtx);
  const { data, isLoading, error } = useScopedWishlistRoutes(area, wishlist);
  return (
    <div>
      <ScreenHero C={C} title={"My objectives" + (area ? " · " + area.name : "")} />
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
function NearMePanel({ center0, areaType, name, onBack, onOpenArea, C, uDistMi }) {
  const mapDiv = useRef(null), mapRef = useRef(null), markRef = useRef(null), tileRef = useRef(null), placeMarkRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [center, setCenter] = useState(center0 || null);
  const [baseLayer, setBaseLayer] = useState("street");
  // WHAT YOU TAPPED, listed BELOW the map (2026-10-24, owner: "Sometimes when you click on the circle,
  // the climbs don't show up. The blue circles in particular ... I would prefer if the climbs showed
  // up in list view below the map"). A blue circle used to ONLY zoom: the zoomed view refetched,
  // re-clustered the larger set it found into new circles with BIGGER numbers, and the areas you
  // tapped were never shown; when they sat on one spot (or the map was already at its deepest
  // zoom) nothing happened at all. Now a circle zooms AND lists its areas here, and a single pin
  // lists its one area here instead of a card over the map. The list survives the zoom it causes:
  // it is cleared by its own ✕, a tap on the bare map, or a tap on another circle.
  const [pick, setPick] = useState(null);
  // Go to a town, county, or zip/postal code (US and Canada). `alts` are the other matches, offered as "Not it?".
  const [placeQ, setPlaceQ] = useState("");
  const [place, setPlace] = useState({ busy: false, err: "", alts: [] });
  const [fullscreen, setFullscreen] = useState(false);
  // Type-of-climbing filter over what is in view. Matches EVERY type an area holds
  // (`disciplines`, 0198: any type with at least one climb; on a peak, crag types count as
  // alpine; top rope is its own type since 0202), so a mostly-sport crag with trad lines shows under both.
  // Falls back to the main type for a row read before that column existed.
  const [disc, setDisc] = useState(null);

  // FULL SCREEN IS A REAL FULL-SCREEN VIEW, drawn over the whole app like the route map's. It used
  // to stretch the map in place, in the page's flow: on a phone it ran on under the bottom bar, the
  // header stayed on top of it, the controls above it vanished so the ✕ jumped ~100px up the screen,
  // and the height was ANIMATED, so the map's ResizeObserver re-measured and re-read the view on
  // every frame of the transition. The owner reported a crash on closing it (2026-10-23).
  // It is still the SAME Leaflet instance -- same markers, zoom, pan and your dot, so collapsing
  // back drops you exactly where you were. The map is rendered through a portal into `host`, a div
  // this panel owns, and only `host` moves: into document.body for full screen, back into the
  // inline slot for the page. Moving a node keeps everything inside it, Leaflet included.
  const hostRef = useRef(null), slotRef = useRef(null), wasFullRef = useRef(false);
  if (!hostRef.current && typeof document !== "undefined") hostRef.current = document.createElement("div");
  // Layout, not passive: the map div must be in the document before Leaflet's init effect measures it.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (fullscreen) { wasFullRef.current = true; document.body.appendChild(host); }
    else if (slotRef.current) {
      slotRef.current.appendChild(host);
      // While the map was away the page was shorter and its scroll clamped: put the map back in view.
      if (wasFullRef.current) { wasFullRef.current = false; try { slotRef.current.scrollIntoView({ block: "nearest" }); } catch (e) {} }
    }
    if (mapRef.current) { try { mapRef.current.invalidateSize(); } catch (e) {} }
  }, [fullscreen]);
  useEffect(() => () => { if (hostRef.current) hostRef.current.remove(); }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = e => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);
  const { data, isLoading, error } = useNearbyAreas(bounds);
  const nearbyAll = data && data.rows;
  const typesOf = a => Array.isArray(a.disciplines) ? a.disciplines : (a.dominant_discipline ? [a.dominant_discipline] : []);
  const nearby = useMemo(() => nearbyAll && (disc ? nearbyAll.filter(a => typesOf(a).includes(disc)) : nearbyAll), [nearbyAll, disc]);
  const discsInView = useMemo(() => {
    const n = {};
    (nearbyAll || []).forEach(a => typesOf(a).forEach(d => { n[d] = (n[d] || 0) + 1; }));
    if (disc && !n[disc]) n[disc] = 0; // keep the active chip on screen so it can be cleared
    return Object.entries(n).sort((a, b) => b[1] - a[1]);
  }, [nearbyAll, disc]);

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
      // Zoom sits BOTTOM-LEFT, a corner nothing else on this map uses (the fire map moved its own
      // to a free corner the same way). Top-left it shared with the Street/Satellite/Topo/Snow row,
      // and pushing it 56px down (#2411) still left the owner reporting the row over the + / −.
      const map = L.map(mapDiv.current, { attributionControl: false, zoomControl: false }).setView(center ? [center.lat, center.lng] : [39.5, -98.5], center ? (ZOOM_BY_AREA_TYPE[areaType] || 10) : 4);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      applyBaseLayer(map, tileRef, baseLayer);
      markRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      map.on("moveend", () => readBounds(map));
      map.on("click", () => setPick(null));
      setTimeout(() => { try { map.invalidateSize(); readBounds(map); } catch (e) {} }, 150);
      // ...and again whenever the map's box really changes size. On a slow phone the box can still
      // be unlaid-out at 150ms: the query then asked for a near-zero box, got no areas, and the
      // map said "No climbs in view" over a whole state until the climber panned.
      if (typeof ResizeObserver !== "undefined") {
        let last = "";
        ro = new ResizeObserver(([e]) => {
          const k = Math.round(e.contentRect.width) + "x" + Math.round(e.contentRect.height);
          if (k === last || !mapRef.current) return;
          last = k;
          try { map.invalidateSize(); readBounds(map); } catch (err) {}
        });
        ro.observe(mapDiv.current);
      }
    };
    let ro = null;
    loadLeaflet(init, () => setMapFail(true));
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => { cancelled = true; clearTimeout(ft); if (ro) ro.disconnect(); if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} mapRef.current = null; markRef.current = null; tileRef.current = null; placeMarkRef.current = null; } };
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
        mk.on("click", () => setPick({ areas: [a], cluster: false }));
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
          setPick({ areas, cluster: true });
          try { map.fitBounds(L.latLngBounds(areas.map(a => [a.lat, a.lng])), { padding: [50, 50], maxZoom: 15 }); } catch (e) {}
        });
        grp.addLayer(mk);
      }
    }
  }, [ready, nearby]);

  // Live, and refining: see useFollowMe in lib/mapKit.jsx. Only the FIRST fix re-centres the
  // nearby list -- re-querying on every step of a walk would refetch for nothing.
  const me = useFollowMe(mapRef, { C, zoom: 10, onFix: (f, first) => {
    if (!first) return;
    setCenter({ lat: f.lat, lng: f.lng });
    const map = mapRef.current;
    if (map) setTimeout(() => readBounds(map), 350); // after the pan/zoom animation settles
  } });
  const locate = me.locate, locating = me.locating, geoErr = me.err;
  // Your dot is on the map from the start when location is already allowed -- without moving the
  // map off the area you opened it on. Never asks: the button above does that.
  useEffect(() => { if (ready) me.showDot(); }, [ready]);

  const goToPlace = p => {
    const L = window.L, map = mapRef.current;
    if (!L || !map || !p) return;
    me.release();
    try {
      if (p.bbox) map.fitBounds(p.bbox, { maxZoom: 13 }); else map.setView([p.lat, p.lng], 12);
      if (placeMarkRef.current) map.removeLayer(placeMarkRef.current);
      const html = "<div style='width:16px;height:16px;border-radius:50%;background:" + C.blueSolid + ";border:3px solid #fff;box-shadow:0 0 0 4px " + C.blueSolid + "55,0 2px 7px rgba(0,0,0,0.6);'></div>";
      placeMarkRef.current = L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: "", iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 1000 }).bindTooltip(p.name, { direction: "top", permanent: true }).addTo(map);
    } catch (e) {}
  };
  const findPlace = e => {
    if (e) e.preventDefault();
    const q = placeQ.trim();
    if (!q || place.busy) return;
    setPlace({ busy: true, err: "", alts: [] });
    searchPlaces(q, bounds).then(rows => {
      if (!rows.length) { setPlace({ busy: false, err: "No town, county or zip/postal code called “" + q + "” found.", alts: [] }); return; }
      goToPlace(rows[0]);
      setPlace({ busy: false, err: "", alts: rows.slice(1, 4) });
    }, () => setPlace({ busy: false, err: "Couldn't search places just now — check your connection and try again.", alts: [] }));
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
  const discChip = (k, label, on) => <button key={k || "all"} onClick={() => setDisc(k)} aria-pressed={on} style={{ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</button>;

  const searchUI = (
    <>
        <form onSubmit={findPlace} role="search" style={{ display: "flex", gap: 6, marginBottom: place.err || place.alts.length ? 4 : 8 }}>
          <input type="search" value={placeQ} onChange={e => setPlaceQ(e.target.value)} placeholder="Go to a town, county or zip/postal code" aria-label="Go to a town, county or zip/postal code" enterKeyHint="search" style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16 }} />
          <button type="submit" disabled={!placeQ.trim() || place.busy} style={{ ...BTN, background: C.blueSolid, color: "#fff", border: "none", flexShrink: 0, opacity: !placeQ.trim() || place.busy ? 0.6 : 1 }}>{place.busy ? "Finding…" : "Go"}</button>
        </form>
        {place.err ? <div role="status" style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{place.err}</div> : null}
        {place.alts.length ? (
          <div role="group" aria-label="Other places with that name" style={{ display: "flex", gap: 6, overflowX: "auto", alignItems: "center", marginBottom: 8, paddingBottom: 2 }}>
            <span style={{ fontSize: 11.5, color: C.textMuted, flexShrink: 0 }}>Not it?</span>
            {place.alts.map((p, i) => <button key={i} onClick={() => { goToPlace(p); setPlace(s => ({ ...s, alts: s.alts.filter(x => x !== p) })); }} style={{ ...CHIP, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{p.name + (p.sub ? ", " + p.sub.split(", ").slice(-1)[0] : "")}</button>)}
          </div>
        ) : null}
    </>
  );
  const mapBox = (
    <div style={{ position: "relative", flex: fullscreen ? 1 : "none", minHeight: 0 }}>
      <div ref={mapDiv} style={{ width: "100%", height: fullscreen ? "100%" : 260, borderRadius: 12, overflow: "hidden", background: C.surface }} />
      {!ready ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 12.5, pointerEvents: "none", textAlign: "center", padding: 16 }}>{mapFail ? "Map couldn't load — the nearest areas are listed below." : "Loading map…"}</div> : null}
      <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} snow snowAt={center} />
      {/* ⤢ to go full screen and ✕ to leave it, in the SAME spot on the map, so the way out is where the
          way in was (owner, 2026-10-24: "Exit full screen is a little hidden on the map"). Drawn OPAQUE, with a
          shadow: the translucent fill let the circles beneath show through it. Full screen also has
          ← Back in its title row. */}
      <button onClick={() => setFullscreen(f => !f)} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"} style={Object.assign({}, POP_CLOSE_MEDIA, { position: "absolute", top: 10, right: 10, zIndex: 1000, background: C.surface, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" })}>{fullscreen ? "✕" : "⤢"}</button>
      {/* WHERE AM I, on the map itself, as the route map has it: bottom-right, above the tile
          credit, in full screen too. It used to be a full-width button above the map, which full
          screen hid. */}
      <button onClick={locate} disabled={locating} aria-label="Show my location on the map" style={{ position: "absolute", bottom: 26, right: 10, zIndex: 1000, background: C.blueSolid, color: "#ffffff", border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, cursor: locating ? "default" : "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ActionIcon name="pin" size={14} color="currentColor" />{locateLabel(me, "Me")}</span></button>
    </div>
  );
  // The tapped circle's areas, nearest the middle of the map first.
  const pickRows = pick ? pick.areas.map(a => ({ ...a, _mi: viewCenter ? haversineMi(viewCenter, a) : null })).sort((a, b) => (a._mi ?? 1e9) - (b._mi ?? 1e9)) : [];
  const pickClimbs = pickRows.reduce((n, a) => n + (a.route_count || 0), 0);
  const pickUI = pick ? (
    <section aria-label="Areas you tapped on the map" style={{ marginTop: 8, flexShrink: 0, maxHeight: fullscreen ? "42%" : "none", display: "flex", flexDirection: "column", minHeight: 0, background: C.surface, border: "1px solid " + C.blue + "66", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 12px", borderBottom: "1px solid " + C.border }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: C.text }}>{(pickRows.length === 1 ? "1 area" : pickRows.length + " areas") + " · " + pickClimbs + " climb" + (pickClimbs !== 1 ? "s" : "")}</div>
        <button onClick={() => setPick(null)} title="Close" aria-label="Close the list of tapped areas" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "6px 8px 0" }}>
        {pickRows.map(a => (
          <div key={a.id} {...clickable(() => onOpenArea(a))} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 12px", marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{a.name}</span>
            <span style={{ color: C.textMuted, fontSize: 12, flexShrink: 0 }}>{a._mi != null ? (uDistMi ? uDistMi(a._mi) : a._mi.toFixed(1) + " mi") + " · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </section>
  ) : null;
  const errUI = geoErr ? <div role="status" style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{geoErr}</div> : null;
  const title = "Map" + (name ? " · " + name : "");
  return (
    <div>
      <ViewToggle mode="map" onList={onBack} onMap={() => {}} C={C} />
      {fullscreen ? null : searchUI}
      {/* The inline slot the map's host div sits in when it is not full screen. React renders it
          empty and never touches its children; only the effect above moves the host in and out. */}
      <div ref={slotRef} style={{ marginBottom: 8 }} />
      {/* ONE wrapper in both modes, its children in fixed slots (null when unused): a different
          element around `mapBox` in full screen would make React unmount the map's div, and with it
          the Leaflet map, every time the climber went in or out. */}
      {hostRef.current ? createPortal(
        <div role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen ? "true" : undefined} aria-label={fullscreen ? title : undefined} style={fullscreen ? { position: "fixed", inset: 0, zIndex: 9700, background: C.bg, padding: "calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px)", display: "flex", flexDirection: "column" } : { position: "relative" }}>
          {/* The title row clears the notch (safe-area-inset-top): the page is viewport-fit=cover, so
              with a flat 12px it sat under the phone's status bar and the ✕ was hidden until you
              looked for it (owner, 2026-10-24). ← Back leads, as on every other screen. */}
          {fullscreen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <button onClick={() => setFullscreen(false)} aria-label="Back" style={POP_BACK}>← Back</button>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
            </div>
          ) : null}
          {fullscreen ? searchUI : null}
          {mapBox}
          {pickUI}
          {errUI}
        </div>, hostRef.current) : null}
      {!fullscreen ? (
        <>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8 }}>{"Pan or zoom the map, or type a town above, to see areas anywhere else." + (me.acc != null ? " The green dot is you." : "")}</div>
          {!center && !bounds ? <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>{'Tap "Me" on the map to find climbs near you.'}</div> : null}
          {error && !sorted.length ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load nearby areas — check your connection and try again.</div> : null}
          {error && sorted.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Couldn't refresh just now — showing the areas from your last load.</div> : null}
          {isLoading && bounds ? <div style={{ color: C.textMuted, fontSize: 12 }}>Loading nearby climbs…</div> : null}
          {discsInView.length > 1 || disc ? (
            <div style={{ marginBottom: 8 }}>
              <div role="group" aria-label="Filter areas by type of climbing" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                {discChip(null, "All", !disc)}
                {discsInView.map(([k, n]) => discChip(k, (DL[k] || k) + " · " + n, disc === k))}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Shows areas with at least one climb of that type — on the map too.</div>
            </div>
          ) : null}
          {data && data.total != null && !disc && data.total > sorted.length ? <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 8 }}>{"Showing the busiest " + sorted.length + " of " + data.total + " areas in view — zoom in to see more."}</div> : null}
          {disc && (nearby.length > sorted.length || (data && data.total > nearbyAll.length)) ? <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 8 }}>{"Showing " + sorted.length + " " + (DL[disc] || disc).toLowerCase() + " areas — zoom in to see more."}</div> : null}
          {sorted.map(a => (
            <div key={a.id} {...clickable(() => onOpenArea(a))} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text }}>{a.name}</span>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{a._mi != null ? (uDistMi ? uDistMi(a._mi) : a._mi.toFixed(1) + " mi") + " · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
            </div>
          ))}
          {!isLoading && bounds && !sorted.length && !error ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>{disc && nearbyAll && nearbyAll.length ? "No " + (DL[disc] || disc).toLowerCase() + " areas in view — pan, zoom out, or tap All." : "No climbs in view — pan or zoom out to see more."}</div> : null}
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
// The state you are browsing, and the country above it, are listed FIRST among their
// siblings. The tree opens with the country expanded, and its states are alphabetical,
// so Washington used to sit halfway down a list of fifty — the one row you came from was
// the one you had to scroll to find. Everything else keeps its order.
const pinFirst = (list, pinIds) => pinIds && pinIds.length ? [...list].sort((a, b) => (pinIds.includes(b.id) ? 1 : 0) - (pinIds.includes(a.id) ? 1 : 0)) : list;

function DbAreaTreeNode({ area, depth, currentId, pinIds, expanded, onToggle, onNavigate, C }) {
  const isOpen = expanded.has(area.id);
  // `error` is destructured because without it a FAILED children fetch left `children`
  // undefined and fell through to "No sub-areas." — an affirmative claim that a
  // formation holds nothing, on a node that may hold plenty. main.jsx sets
  // networkMode "always", so an offline device errors immediately rather than pausing,
  // which makes this the common case rather than a rare one.
  const { data: children, isLoading, error } = useAreaChildren(area.id, { enabled: isOpen });
  const cur = area.id === currentId;
  const n = area.route_count;
  // Indent TAPERS. It used to be 22px per level with no ceiling, so the spires under
  // Liberty Bell Group (depth 7: usa > wa > region > hwy 20 > north cascades > pass >
  // group) spent 168px on indent and the name was ellipsised to a few letters on a 390px
  // phone. Every level must still step right — a hard cap put the group and its own
  // spires at one indent, reading as siblings — so past depth 4 each level costs 6px.
  const pad = 12 + Math.min(depth, 4) * 12 + Math.max(depth - 4, 0) * 6;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 12px " + pad + "px", borderBottom: "1px solid " + C.borderLight, background: cur ? C.blueBg : "transparent" }}>
        <button onClick={() => onToggle(area.id)} aria-label={isOpen ? "Collapse" : "Expand"} style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: "1.5px solid " + C.blue, background: C.blueBg, color: "#fff", fontSize: 18, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Chevron open={isOpen} color={C.blue} /></button>
        {/* One target opens the area: the name, its count and the chevron. The chevron used
            to be a separate 16px span and the name was cut to one line, so the only ways in
            were a sliver of truncated text or an arrow a thumb barely covers. Names wrap. */}
        <button onClick={() => onNavigate(area)} aria-label={"Open " + area.name + (n > 0 ? ", " + n + " climb" + (n !== 1 ? "s" : "") : "")} style={{ flex: 1, minWidth: 0, minHeight: 38, display: "flex", alignItems: "center", gap: 8, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, lineHeight: 1.3, fontWeight: cur ? 800 : 700, color: cur ? C.blue : C.text, overflowWrap: "anywhere" }}>{area.name}{cur ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px", whiteSpace: "nowrap", display: "inline-block" }}>You are here</span> : null}</div>
          {n > 0 ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{n}</span> : null}
          <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>
        </button>
      </div>
      {isOpen ? (
        isLoading
          ? <div style={{ padding: "10px 14px 10px " + (pad + 46) + "px", color: C.textMuted, fontSize: 12 }}>Loading…</div>
          : children && children.length
            ? pinFirst(children, pinIds).map(k => <DbAreaTreeNode key={k.id} area={k} depth={depth + 1} currentId={currentId} pinIds={pinIds} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} C={C} />)
            : error
              ? <div style={{ padding: "10px 14px 10px " + (pad + 46) + "px", color: C.amber, fontSize: 12 }}>Couldn’t load what’s inside.</div>
              : <div style={{ padding: "10px 14px 10px " + (pad + 46) + "px", color: C.textMuted, fontSize: 12 }}>No sub-areas.</div>
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
function DbAreaTreeRoots({ currentId, pinIds, expanded, onToggle, onNavigate, C }) {
  const { data: roots, isLoading, error } = useCountries();
  const pad = { padding: "14px 16px", color: C.textMuted, fontSize: 12.5 };
  if (isLoading) return <div style={pad}>Loading…</div>;
  if (error) return <div style={{ ...pad, color: C.amber }}>Couldn’t load the area tree.</div>;
  if (!roots || !roots.length) return <div style={pad}>No areas.</div>;
  return pinFirst(roots, pinIds).map(r => <DbAreaTreeNode key={r.id} area={r} depth={0} currentId={currentId} pinIds={pinIds} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} C={C} />);
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
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 400, display: "flex", flexDirection: "column" ,maxWidth:520,margin:"0 auto",boxSizing:"border-box"}}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Back" style={POP_BACK}>{"← Back"}</button>
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
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <input aria-label="Search areas, crags and peaks" value={q} onChange={e => setQ(e.target.value)} placeholder={"Search " + stateRoot.name + "’s areas, crags and peaks…"} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
        {/* Say what each of the two tap targets does. They look alike and do opposite
            things: the name OPENS the area (closing this screen), the ▸ only reveals
            what is inside it without going anywhere. */}
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 7, lineHeight: 1.45 }}>
          {q.trim()
            ? (total > 0 ? "Best matches first — tap one to open its climbs." : "Searches every area under " + stateRoot.name + ", at any depth.")
            : "Tap a name to open that area’s climbs · tap the arrow to see what’s inside it"}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", paddingBottom: 30 }}>
        {q.trim() ? (
          searching ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading…</div>
          : searchError ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.red, fontSize: 13 }}>Couldn't search areas — check your connection and try again.</div>
          : !results || !results.length ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>{'No areas match "' + q.trim() + '"'}</div>
          : <>
            {results.map(m => (
              <div key={m.id} {...clickable(() => onNavigate(m))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + C.borderLight, cursor: "pointer", background: m.id === current.id ? C.blueBg : "transparent" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: m.id === current.id ? C.blue : C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{m.name}{m.id === current.id ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px" }}>You are here</span> : null}</div>
                  {/* The RPC has always returned area_type and this row threw it away, so a
                      hit read as a bare name with no way to tell a summit from a boulder —
                      while the in-page Areas search two screens over renders exactly this
                      line. Same data, same shape, so the two searches now agree. */}
                  <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[ATYPE[m.area_type] || m.area_type, m.parent_name].filter(Boolean).join(" · ")}</div>
                </div>
                {m.route_count > 0 ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{m.route_count + " climb" + (m.route_count !== 1 ? "s" : "")}</span> : null}
                <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>
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
          <DbAreaTreeRoots currentId={current.id} pinIds={[stateRoot.parent_id, stateRoot.id].filter(Boolean)} expanded={expanded} onToggle={toggle} onNavigate={onNavigate} C={C} />
        )}
      </div>
    </div>,
    document.body
  );
}

export default function DbAreaBrowser({ onOpenRoute, C, bookmarks, onToggleBookmark, wishlist, profile, completedIds, rankSuggested, discSlots, jumpToStateReq, jumpToAreaReq, uElev, uElevN, uElevUnit, uDistMi, onAreaContext, onFireMap, onAddClimb, onAddArea, TopContributors, rootHeader, onSuggestAreaEdit, myId, PartnerRow, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, notify, onStartCrew, onCrewsHere, openCrewCountAt, onToggleWish, userLists, onToggleListRoute }) {
  const [stateNode, setStateNode] = useState(null);
  const [stack, setStack] = useState([]); // drill path within the state; last entry is "current"
  const [screen, setScreen] = useState("areas"); // "areas" | "finder" | "near" | "objectives"
  const [finderDisc, setFinderDisc] = useState(""); // a chart bar presets the finder's discipline
  const [treeOpen, setTreeOpen] = useState(false);
  const climber = useMemo(() => ({ wishlist, profile, completedIds, rankSuggested, discSlots }), [wishlist, profile, completedIds, rankSuggested, discSlots]);
  const handledJumpId = useRef(null);

  const current = stack.length ? stack[stack.length - 1] : stateNode;
  const crumbs = stateNode ? [stateNode, ...stack] : [];

  // Report where the user is browsing to the parent. This exists because App's
  // `selArea` is only ever written on the SEED catalog path, and production builds
  // set VITE_USE_DB=true — so anything outside this component that wanted "the area
  // being looked at" got null in the deployed app. The Fire map's focus point was
  // exactly that: it worked locally on seed data and could never fire in production.
  // Reported as a plain {id,name,lat,lng,areaType} rather than the row itself, so the
  // consumer cannot come to depend on the DB shape.
  useEffect(() => {
    if (!onAreaContext) return;
    // Reported WHETHER OR NOT the area has a coordinate. It used to be null without one, and
    // the only consumer left (area Discussion) then never rendered on an area such as Florida's
    // "Artificial Boulders" (fl_artificial_boulders: 30 climbs, lat/lng null). A consumer that
    // needs a position checks lat/lng itself.
    onAreaContext(current
      ? { id: current.id, name: current.name, lat: current.lat != null ? current.lat : null, lng: current.lng != null ? current.lng : null, areaType: current.area_type }
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
    <ClimberCtx.Provider value={climber}>
    <div>
      {/* Breadcrumb + Back. Sticky, and rendered on EVERY sub-screen — not just "areas".
          Two reports drove both halves. It used to scroll away on a long area page, so on
          anything below the fold there was no way back without scrolling to the top. And it
          was gated on `screen === "areas"`, so opening "View map" (screen "near") removed the
          only ← Back on the page: the map's own chrome is a List/Map segmented toggle, which
          reads as a view switch rather than an exit, and nothing else said how to get out.
          On a sub-screen Back returns to the area page rather than popping the area stack —
          the panel is a layer over the area you are standing on, not a step deeper into it.
          The owner then reported both halves as too hard to use: a small grey "← Back" was
          hard to find, and the path, squeezed into one sideways-scrolling line beside it, was
          cut off. So the bar is now two rows and taller on purpose — a Back button that NAMES
          where it goes (drawn with POP_BACK since 2026-09-25, like every other Back in the app:
          44px tall with a bright edge, so it is still easy to find without its own colour), and under it the full path, WRAPPING rather than scrolling,
          so every level above you is visible and tappable. */}
      {crumbs.length ? (
        <div style={{ position: "sticky", top: 0, zIndex: 30, background: C.bg, paddingBottom: 10, marginBottom: 2 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10, background: C.surface, border: "1px solid " + C.borderHi, borderRadius: 12, padding: "11px 12px" }}>
            <button onClick={() => { if (screen !== "areas") setScreen("areas"); else back(); }} style={{ ...POP_BACK, alignSelf: "flex-start", maxWidth: "100%" }}>
              <span aria-hidden="true">{"←"}</span>
              <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{"Back to " + (screen !== "areas" ? current.name : crumbs.length >= 2 ? crumbs[crumbs.length - 2].name : "All areas")}</span>
            </button>
            {/* On an area page the path stops at the PARENT: the area you are in is the header box
                right below, so naming it here in bold too said it twice. On a sub-screen (Route
                finder, Map…) the area stays in the path as the way back to its page. A path that
                would only repeat the Back button above it (just "All areas") is not drawn. */}
            {(() => {
              const path = screen === "areas" ? [null, ...crumbs.slice(0, -1)] : [null, ...crumbs];
              return path.length < 2 ? null : (
                <nav aria-label="Area path" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 6, columnGap: 6, minWidth: 0 }}>
                  {path.map((c, i) => (
                    <span key={c ? c.id : "root"} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, maxWidth: "100%" }}>
                      {i > 0 ? <span aria-hidden="true" style={{ color: C.textMuted, fontSize: 16, fontWeight: 700 }}>{"›"}</span> : null}
                      <button onClick={() => { setScreen("areas"); jump(c ? i - 1 : -1); }} style={{ background: "transparent", border: "none", color: C.blue, fontSize: 14.5, cursor: "pointer", fontWeight: 700, padding: "2px 0", textAlign: "left", lineHeight: 1.3, overflowWrap: "anywhere" }}>{c ? c.name : "All areas"}</button>
                    </span>
                  ))}
                </nav>
              );
            })()}
          </div>
        </div>
      ) : null}
      {!stateNode ? (
        <>{rootHeader || null}<StatePicker onPick={pickState} C={C} /></>
      ) : screen === "finder" ? (
        <RouteFinderPanel key={current.id} scope={current} onOpen={onOpenRoute} onJumpToArea={jumpToArea} C={C} uElevN={uElevN} uElevUnit={uElevUnit} presetDisc={finderDisc} bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} onToggleWish={onToggleWish} userLists={userLists} onToggleListRoute={onToggleListRoute} onAddClimb={onAddClimb} onAddArea={onAddArea} />
      ) : screen === "objectives" ? (
        <ObjectivesPanel area={current} onOpen={onOpenRoute} C={C} />
      ) : screen === "near" ? (
        <><ScreenHero C={C} title={"Map" + (current ? " · " + current.name : "")} /><NearMePanel uDistMi={uDistMi} name={current ? current.name : null} center0={current && current.lat != null ? { lat: current.lat, lng: current.lng } : null} areaType={current && current.area_type} onBack={() => setScreen("areas")} onOpenArea={jumpToArea} C={C} /></>
      ) : (
        <AreaPage key={current.id} TopContributors={TopContributors} onFireMap={onFireMap} onAddClimb={onAddClimb} onAddArea={onAddArea} PartnerRow={PartnerRow} uid={uid} myListings={myListings} onListMe={onListMe} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={onViewProfile} notify={notify} onStartCrew={onStartCrew} onCrewsHere={onCrewsHere} openCrewCountAt={openCrewCountAt} uElev={uElev} uDistMi={uDistMi} area={current} booked={bookmarks.includes(current.id)} onToggleSave={() => onToggleBookmark(current.id)} onDrill={drill} onFinder={d => { setFinderDisc(typeof d === "string" ? d : ""); setScreen("finder"); }} onSuggestAreaEdit={onSuggestAreaEdit} myId={myId} onNear={() => setScreen("near")} onObjectives={() => setScreen("objectives")} onAllAreas={() => setTreeOpen(true)} onOpenRoute={onOpenRoute} onJumpToArea={jumpToArea} C={C} />
      )}
      {treeOpen && stateNode ? (
        <DbAreaTree stateRoot={stateNode} current={current} ancestorIds={stack.map(a => a.id)} onNavigate={jumpToArea} onClose={() => setTreeOpen(false)} C={C} />
      ) : null}
    </div>
    </ClimberCtx.Provider>
  );
}
