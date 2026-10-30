// The DB-catalog area finder: state picker -> drill-down area pages -> Route
// finder / Near-me map / Objectives / "View all N routes". Deliberately mirrors
// the static catalog's AreaBrowse -> AreaView -> RouteFinder/OverviewMap chain
// (same layout, copy, and C-palette styling) so the two feel like one product —
// just fetched on demand from Supabase instead of walking the in-memory
// MOUNTAINS/ROUTES arrays, since the DB catalog (47k+ areas / 200k+ routes) is
// far too large to hold in memory. Rendered only when USE_DB is on.
import { Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchArea, useArea, useAreaClassics, useAreaContributions, useAreaClimbStats, useAreaChildren, useAreaRoutes, useSubtreeRoutes, useSubtreeRouteCount, useAreaSearch, areaSearchTotal, useAreaNamesByIds, fetchAreaBreadcrumb, useMySavedSearches, createSavedSearchRow, deleteSavedSearchRow } from "./db";
import { searchPlaces } from "./mapKit";
import { DISC_LABELS as DL } from "./discLabels";
import { clickable } from "./clickable";
import { POP_BACK, POP_CLOSE, POP_REMOVE, POP_CHIP_X } from "./popupChrome.js";
import { BTN, BTN_LG, BTN_LINK, CHIP } from "./buttonStyles.js";
import { ScreenHero } from "./ScreenHero";
import { AboutCard, AreaFactsCard, ClimbsChart, GradeSpread, PendingAreaEdits } from "./AreaPageSections";
import Chevron from "../src/components/Chevron.tsx";
import LoadingRows from "../src/components/LoadingRows.tsx";
import AreaWrongSpot from "./AreaWrongSpot";
import { submitAreaPlacementClaim } from "./db";
import EmptyState from "../src/components/EmptyState.tsx";
import { ATYPE, DISCIPLINES } from "./areaBrowserShared.js";
import { nearbyPeaksLive, nearbyPeaksBounds, nearbyPeaksRows } from "./nearbyPeaks.js";
import { ClimberCtx } from "./climberCtx.js";
import { usePinnedBar } from "./usePinnedBar.js";
import { SL, Pill } from "./areaBrowserParts.jsx";
import RouteRow from "../src/components/RouteRow.tsx";
import AddHereFooter from "../src/components/AddHereFooter.tsx";
import AreaGettingThere from "../src/components/AreaGettingThere.tsx";
import ClassicsList from "../src/components/ClassicsList.tsx";
import NearbyPeaks from "../src/components/NearbyPeaks.tsx";
import DbSearchSplit from "../src/components/DbSearchSplit.tsx";
import DbSuggestedClimbs from "../src/components/DbSuggestedClimbs.tsx";
import PartnersHereCard from "../src/components/PartnersHereCard.tsx";
import SummitBriefing from "../src/components/SummitBriefing.tsx";
import ObjectivesPanel from "../src/components/ObjectivesPanel.tsx";
import StatePicker from "../src/components/StatePicker.tsx";
import DbAreaTree from "../src/components/DbAreaTree.tsx";
import NearMePanel from "../src/components/NearMePanel.tsx";
export { SummitBriefing };
export { nearbyPeaksLive, nearbyPeaksBounds, nearbyPeaksRows };


const CHILD_NOUN = { crag: "Areas", peak: "Peaks", canyon: "Canyons", range: "Ranges", region: "Areas", wall: "Areas", state: "States", country: "Countries" };

function childNoun(children) {
  const types = [...new Set((children || []).map(c => c.area_type))];
  return (types.length === 1 && CHILD_NOUN[types[0]]) || "Areas";
}

// TOP CONTRIBUTORS used to be forked here — a second implementation of the panel that
// ClimbMatchCore already owns. The fork is why the crag page rendered `c.contributor`, an auth
// uid, as a person's name: the good copy resolved profiles and this one never learned to, and
// nothing tied them together. #945 fixed the symptom; deleting the fork is what stops it
// recurring. The shared component arrives as a prop for the same reason `C` and `ActionIcon`
// do — this file must not import ClimbMatchCore, which lazy-imports this module and would make
// the cycle static.

// CLASSIC CLIMBS HERE: the area page's answer to "what should I climb here?", picked the way Mountain Project's
// area Classic Climbs and theCrag's classics are — by quality ratings — but from OUR ratings only: the curated
// `classic` flag, the guidebook's 3- and 4-star climbs (`guide_stars`, 0-4), and climbs our own climbers rate
// 3.5+ (`stars`, 0294). Nothing here is read from another site. Best first: curated, then guidebook stars, then
// climbers' stars, then name. An area with none falls back to TOP RATED HERE.
const CLASSIC_GUIDE_STARS = 3, CLASSIC_CLIMBER_STARS = 3.5;
function isAreaClassic(r) { return !!r.classic || (r.guide_stars != null && r.guide_stars >= CLASSIC_GUIDE_STARS) || (r.stars != null && r.stars >= CLASSIC_CLIMBER_STARS); }
// Best first, as area_classics (0393) orders the areas above: the classic score, else guidebook stars, else ours.
function classicQuality(r) { return Number(r.classic_score ?? r.guide_stars ?? r.stars ?? 0); }
function areaClassics(routes) {
  return routes.filter(isAreaClassic).sort((a, b) => (b.classic ? 1 : 0) - (a.classic ? 1 : 0) || classicQuality(b) - classicQuality(a) || (b.guide_stars || 0) - (a.guide_stars || 0) || (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name));
}


// PARTNERS HERE (0300): who is listed as an available partner at this area, inside it, or across a wider
// area that contains it — and the one-tap "List me here". Crag-family areas and their ancestors below the
// state; NOT a peak (a peak's climbing is matched by route) and not a state (too broad to list from here;
// the Partners tab's picker still allows it). The count and the rows are signed-in reads: the server
// refuses a signed-out caller, so the card says "Sign in" rather than "nobody".
const PARTNER_CARD_TYPES = ["region", "range", "canyon", "crag", "wall"];

// The order a crag's own climb list can be read in (Mountain Project and theCrag: left to right as
// on the wall, the default, or by name). `sort_order` is the left-to-right position; a climb with no
// position stays LAST in both wall orders, by name, rather than being guessed into the line.
// "By discipline" groups the list under one heading per discipline (in DISCIPLINES order), each A → Z.
const AREA_LIST_SORTS = [["lr", "Left → right"], ["rl", "Right → left"], ["az", "A → Z"], ["za", "Z → A"], ["disc", "By discipline"]];
function sortAreaRoutes(routes, key) {
  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
  if (key === "az") return [...routes].sort(byName);
  if (key === "za") return [...routes].sort((a, b) => byName(b, a));
  if (key === "disc") {
    const rank = d => { const i = DISCIPLINES.findIndex(x => x[0] === d); return i < 0 ? 999 : i; };
    return [...routes].sort((a, b) => rank(a.discipline) - rank(b.discipline) || byName(a, b));
  }
  const dir = key === "rl" ? -1 : 1;
  return [...routes].sort((a, b) => Number(a.sort_order == null) - Number(b.sort_order == null) || (a.sort_order != null && b.sort_order != null ? dir * (a.sort_order - b.sort_order) : 0) || byName(a, b));
}


function AreaPage({ area: areaRow, onSignIn, uElev, uDistMi, booked, onToggleSave, onDrill, onFinder, onNear, onObjectives, onAllAreas, onOpenRoute, onJumpToArea, C, onAddClimb, onAddArea, TopContributors, onFireMap, onSuggestAreaEdit, myId, PartnerRow, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, notify, onStartCrew, onCrewsHere, openCrewCountAt}) {
  const [searchMode, setSearchMode] = useState("areas");
  const [wrongOpen, setWrongOpen] = useState(false);
  const listEndRef = useRef(null);
  const [listSort, setListSort] = useState("lr");
  // Filters on a WALL's own climb list (owner note, 2026-10-25): discipline and a star minimum,
  // applied to the rows already loaded — no query. Unrated climbs stay in, as the finder keeps them.
  const [wallFilterOpen, setWallFilterOpen] = useState(false);
  const [wallDisc, setWallDisc] = useState("");
  const [wallStars, setWallStars] = useState(0);
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
  // Above a wall the classics come from the whole subtree (0390); a wall ranks its own loaded rows (areaClassics).
  const classicsUp = useAreaClassics(area.id, isLeaf === false && chartable);
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
            <div style={{ fontSize: 13, color: C.blue, marginTop: 8 }}>{children && children.length ? children.length + " " + noun + " · " + area.route_count.toLocaleString() + " climb" + (area.route_count !== 1 ? "s" : "") : area.route_count.toLocaleString() + " climb" + (area.route_count !== 1 ? "s" : "")}</div>
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
      {/* CLASSIC CLIMBS HERE above a wall: all of them (ClassicsList: five, then a dropdown), each row naming the wall it
          is on. A failed read says so; an area with no classics shows nothing rather than "none". */}
      {isLeaf === false && chartable ? (classicsUp.error ? <div role="status" style={{ fontSize: 12, color: C.textMuted, margin: "4px 2px 12px" }}>Couldn't load the classic climbs here.</div>
        : classicsUp.data && classicsUp.data.length ? <ClassicsList rows={classicsUp.data} total={classicsUp.data[0].total} withWall onOpen={onOpenRoute} C={C} /> : null) : null}

      {area.route_count > 0 ? (
        <button onClick={onFinder} style={{ ...BTN_LG, width: "100%", marginBottom: 8, border: "1px solid " + C.blue, background: C.blueBg, color:C.onSolid, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
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
      {loading && <LoadingRows C={C} label="Loading…"/>}
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
                const opts = placed ? AREA_LIST_SORTS : AREA_LIST_SORTS.filter(o => o[0] === "az" || o[0] === "za" || o[0] === "disc");
                const key = opts.some(o => o[0] === listSort) ? listSort : opts[0][0];
                const discsHere = [...new Set(routes.map(r => r.discipline).filter(Boolean))];
                const shownAll = routes.filter(r => (!wallDisc || r.discipline === wallDisc) && (!wallStars || !(r.stars > 0) || r.stars >= wallStars));
                const unplaced = (key === "lr" || key === "rl") ? shownAll.filter(r => r.sort_order == null).length : 0;
                const filtersOn = (wallDisc ? 1 : 0) + (wallStars ? 1 : 0);
                const wallChip = on => ({ ...CHIP, flexShrink: 0, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
                return <>
                  {routes.length > 1 ? <div style={{ marginBottom: 8 }}>
                    <button onClick={() => setWallFilterOpen(o => !o)} aria-expanded={wallFilterOpen} style={{ ...wallChip(filtersOn > 0), minHeight: 44 }}>{"Filters" + (filtersOn ? " (" + filtersOn + ")" : "")}</button>
                    {wallFilterOpen ? <div style={{ marginTop: 8, padding: "10px 11px", background: C.card, borderRadius: 10, border: "1px solid " + C.border }}>
                      <div id="wall-filter-disc" style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>Discipline</div>
                      <div role="group" aria-labelledby="wall-filter-disc" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 10 }}>{[["", "All"], ...discsHere.map(d => [d, discLabel(d)])].map(o => <button key={o[0] || "all"} onClick={() => setWallDisc(o[0])} aria-pressed={wallDisc === o[0]} style={wallChip(wallDisc === o[0])}>{o[1]}</button>)}</div>
                      <div id="wall-filter-stars" style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>Stars</div>
                      <div role="group" aria-labelledby="wall-filter-stars" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}>{[[0, "Any"], [2, "2+ stars"], [3, "3+ stars"]].map(o => <button key={o[0]} onClick={() => setWallStars(o[0])} aria-pressed={wallStars === o[0]} style={wallChip(wallStars === o[0])}>{o[1]}</button>)}</div>
                      <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.45 }}>{"Climbs nobody has rated yet stay in the list when a star minimum is set."}</div>
                    </div> : null}
                  </div> : null}
                  {routes.length > 1 ? <div role="group" aria-label="Sort climbs" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 8 }}>{opts.map(o => <button key={o[0]} onClick={() => setListSort(o[0])} aria-pressed={key === o[0]} style={{ ...CHIP, flexShrink: 0, border: "1px solid " + (key === o[0] ? C.blue : C.border), background: key === o[0] ? C.blueBg : C.surface, color: key === o[0] ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{o[1]}</button>)}</div> : null}
                  {unplaced ? <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.45 }}>{unplaced + (unplaced !== 1 ? " climbs have" : " climb has") + " no position on the wall yet, so " + (unplaced !== 1 ? "they are" : "it is") + " listed last, by name."}</div> : null}
                  {shownAll.length ? (() => {
                    // By discipline: one heading per run of the same discipline, rows under it in name order.
                    const out = []; let last = null;
                    sortAreaRoutes(shownAll, key).forEach(r => {
                      if (key === "disc" && r.discipline !== last) out.push(<SL key={"h-" + r.discipline} C={C}>{discLabel(r.discipline)}</SL>);
                      last = r.discipline;
                      out.push(<RouteRow key={r.id} r={r} onOpen={onOpenRoute} C={C} />);
                    });
                    return out;
                  })() : <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{"No climb on this wall matches these filters. "}<button onClick={() => { setWallDisc(""); setWallStars(0); }} style={{ ...BTN, border: "none", background: "transparent", color: C.blue, padding: 0, fontWeight: 700, textDecoration: "underline" }}>Clear filters</button></div>}
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

      {/* WRONG PLACE (0372): a claim only. The page does not change; the owner moves the area and resolves it. */}
      <button onClick={() => setWrongOpen(true)} style={{ ...BTN_LG, width: "100%", border: "1px solid " + C.border, background: C.surface, color: C.textSub, marginBottom: 14 }}>
        {"Wrong place? Tell us where " + area.name + " belongs"}
      </button>
      {wrongOpen ? <AreaWrongSpot area={area} C={C} onClose={() => setWrongOpen(false)} onSubmit={(note, place) => submitAreaPlacementClaim(area.id, note, place)} onSignIn={onSignIn} /> : null}

      {/* CLASSIC CLIMBS HERE (areaClassics, every one: five, then a dropdown); with none, TOP RATED HERE — the rows
          that carry a climber star rating (routes.stars, kept by 0294), best first. An area with neither shows nothing
          rather than "no ratings yet". */}
      {!loading && isLeaf && routes && routes.length > 1 ? (() => { const cl = areaClassics(routes); if (cl.length) return <ClassicsList rows={cl} onOpen={onOpenRoute} C={C} />; const top = routes.filter(r => r.stars > 0).sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name)).slice(0, 5); return top.length ? <><SL C={C}>Top rated here</SL>{top.map(r => <RouteRow key={"top-" + r.id} r={r} onOpen={onOpenRoute} C={C} />)}</> : null; })() : null}

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
// A saved search's identity: the words, the filters and where it looks. Keys are sorted because the
// filters come back from a jsonb column, which does not keep the order they were written in.
const searchKey = (q, f, locId) => JSON.stringify([(q || "").trim(), Object.keys(f || {}).sort().map(k => [k, f[k]]), locId]);
function RouteFinderPanel({ scope, onOpen, onJumpToArea, C, uElevN, uElevUnit, presetDisc, bookmarks, onToggleBookmark, onToggleWish, userLists, onToggleListRoute, onAddClimb, onAddArea, initial, uid, notify, onSignIn }) {
  const { wishlist } = useContext(ClimberCtx);
  const DEF = { discs: [], sortBy: "lr", minStars: 0, minPitches: 0, len: "any", gSys: "", gLo: "", gHi: "", gain: "any", trip: "any", elev: "any", prom: "any", near: null, within: "w2" };
  const metric = isMetric(uElevUnit);
  // A chart bar on the area page opens the finder already narrowed to its discipline.
  const DEF0 = presetDisc ? { ...DEF, discs: [presetDisc] } : DEF;
  // LOCATION: where the search runs. Starts as the area the finder was opened from; on a state it
  // must be narrowed to an area inside it first (FINDER_NEEDS_AREA). The panel is keyed by the
  // scope's id, so a new scope starts a new Location.
  const [loc, setLoc] = useState(scope);
  // A saved search opened from Logbook › Saved or the Menu arrives as `initial`: its words and
  // filters, on the area it was saved in (which is this panel's scope).
  const [q, setQ] = useState(initial ? initial.q || "" : "");
  // The query follows the box a beat behind, so typing "castle" is one search, not six.
  const [qD, setQD] = useState(initial ? initial.q || "" : "");
  useEffect(() => { const t = setTimeout(() => setQD(q), 250); return () => clearTimeout(t); }, [q]);
  const needsAreaFor = f => !!FINDER_NEEDS_AREA[loc.area_type] && !qD.trim() && !narrowsAreas(f);
  const [saveFor, setSaveFor] = useState(null);
  const { wrapRef: barWrap, barRef, pin } = usePinnedBar();
  // Routes | Areas. One text box serves both, so switching carries what you typed across.
  const [mode, setMode] = useState("routes");
  const AF0 = initial && initial.filters ? { ...DEF, ...initial.filters } : DEF0;
  const [af, setAf] = useState(AF0);
  const [df, setDf] = useState(AF0);
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
  // SAVED SEARCHES ARE THE ACCOUNT'S (saved_searches, 0091), the same rows Logbook › Saved and the
  // Menu's "Saved searches · N" read. This list used to be this panel's own React state: a search
  // saved here was gone the moment the finder closed, never reached the Logbook, and the table held
  // no row at all (0 on 2026-10-24). Only finder searches are listed here; their `kind` says so.
  const mySearchesQ = useMySavedSearches(uid);
  const savedSearches = (mySearchesQ.data || []).filter(s => s.kind === "finder");
  const [showSaved, setShowSaved] = useState(false);
  const [savingSearch, setSavingSearch] = useState(false);
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

  const loadSearch = (search) => {
    setQ(search.q || "");
    setAf({ ...DEF, ...(search.filters || {}) });
    setLoc(search.loc && search.loc.id ? search.loc : scope);
    setShowSaved(false);
    setPage(0);
    setAll([]);
  };
  const deleteSearch = (s) => {
    deleteSavedSearchRow(s._dbId).then(() => { if (notify) notify("Saved search removed"); },
      () => { if (notify) notify("Couldn’t delete that search — try again."); });
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
  const curKey = searchKey(q, af, loc.id);
  const isSavedSearch = savedSearches.some(s => searchKey(s.q, s.filters, s.loc && s.loc.id) === curKey);
  const saveSearch = () => {
    if (!uid) { if (onSignIn) onSignIn(); else if (notify) notify("Sign in to save searches."); return; }
    if (isSavedSearch) { if (notify) notify("Already saved — it’s in Logbook › Saved."); return; }
    if (savingSearch) return;
    // Named for what it IS, as the applied chips read: words, filters, place. "Untitled search"
    // told a climber nothing when they came back to it from the Logbook.
    const name = [q.trim() ? "“" + q.trim() + "”" : null, ...afChips.filter(c => c.k !== "sort").map(c => c.label), loc.name].filter(Boolean).join(" · ");
    setSavingSearch(true);
    createSavedSearchRow(uid, name, { kind: "finder", q: q.trim(), filters: af, loc: { id: loc.id, name: loc.name, area_type: loc.area_type } })
      .then(() => { if (notify) notify("Search saved — find it in Logbook › Saved."); },
        () => { if (notify) notify("Couldn’t save that search — check your connection and try again."); })
      .finally(() => setSavingSearch(false));
  };
  const inList = (l, id) => (l.routeIds || []).includes(id);
  const customLists = (userLists || []).filter(l => l.id !== "ul_obj");
  const isSaved = id => (wishlist || []).includes(id) || customLists.some(l => inList(l, id));

  const rowBtn = on => ({ ...BTN_LG, flex: 1, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.text });
  const chip = (label, on, fn) => <button key={label} onClick={fn} aria-pressed={on} style={{ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>;
  const lab = s => <SL C={C}>{s}</SL>;

  const savePill = on => ({ ...CHIP, flexShrink: 0, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub });
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
        {[["routes", "Routes"], ["areas", "Areas"]].map(([k, l]) => <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 7, background: mode === k ? C.blueSolid : "transparent", color: mode === k ? C.onSolid : C.textSub, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>{l}</button>)}
      </div>
      <input aria-label={mode === "areas" ? "Search areas, crags, peaks" : "Search routes"} value={q} onChange={e => setQ(e.target.value)} placeholder={mode === "areas" ? "Search areas, crags, peaks…" : "Search routes in " + loc.name + "…"} style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 8 }} />
      {mode === "routes" ? <>
      {/* ONE style for the three buttons in this row. Filters was drawn in the text colour and
          Save search in blue, which read as two different sizes of type side by side. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => { setDf(af); setSheet(true); }} style={rowBtn(nF)}>{"Filters" + (nF ? " (" + nF + ")" : "")}</button>
        <button onClick={saveSearch} disabled={savingSearch} aria-pressed={isSavedSearch} style={rowBtn(isSavedSearch)}>{savingSearch ? "Saving…" : isSavedSearch ? "✓ Saved" : "Save search"}</button>
        {savedSearches.length > 0 && <button onClick={() => setShowSaved(!showSaved)} style={rowBtn(true)}>{savedSearches.length} saved</button>}
      </div>
      {afChips.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          {afChips.map(c => <button key={c.k} onClick={c.clear} aria-label={"Remove filter: " + c.label} style={{ ...CHIP, display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px 7px 12px", border: "1px solid " + C.blueDim, background: C.blueBg, color:C.onSolid }}>{c.label}<span aria-hidden="true" style={POP_CHIP_X}>✕</span></button>)}
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
          <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{"In " + loc.name + ", " + scope.name}</span>
          <button onClick={() => setLoc(scope)} style={{ ...BTN_LINK(C), padding: "4px 2px", flexShrink: 0 }}>Change area</button>
        </div>
      ) : null}
      {mode === "areas" ? (
        !qD.trim() ? <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "22px 12px", lineHeight: 1.5 }}>{"Type a name to find any area, crag or peak in " + scope.name + "."}</div>
        : la ? <LoadingRows C={C} label="Loading…"/>
        : ea ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't search areas — check your connection and try again.</div>
        : !areaHits || !areaHits.length ? <EmptyState C={C} icon="search">No areas match.</EmptyState>
        : <>
          {areaHits.map(a => (
            <div key={a.id} {...clickable(() => onJumpToArea(a))} style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, overflowWrap: "anywhere" }}>{[ATYPE[a.area_type] || a.area_type, a.parent_name].filter(Boolean).join(" · ")}</div>
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
              <button aria-label={"Remove saved search " + s.name} onClick={e => { e.stopPropagation(); deleteSearch(s); }} style={POP_REMOVE}>✕</button>
            </div>
          ))}
        </div>
      )}
      {/* PICK AN AREA FIRST on a state (FINDER_NEEDS_AREA). The filters still apply once one is
          picked; typing a climb's name searches the whole state straight away. */}
      {needsArea ? <>
        <SL C={C}>{"Pick an area in " + loc.name}</SL>
        <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, marginBottom: 10 }}>{"Choose where to look and the finder lists its climbs with your filters — or type a climb's name above, or set Distance away, Peak elevation or Prominence under Filters, to search all of " + loc.name + "."}</div>
        {lk ? <LoadingRows C={C} label="Loading…"/> : null}
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
              <button onClick={() => onJumpToArea({ id: r.area_id, name: wall || "" })} style={{ ...BTN_LINK(C), flex: 1, minWidth: 0, textAlign: "left", padding: "3px 0", fontSize: 13.5, fontWeight: 800, color: C.text, overflowWrap: "anywhere" }}>{(wall || "This wall") + " ›"}</button>
              {onToggleBookmark ? <button onClick={() => onToggleBookmark(r.area_id)} aria-label={booked ? "Remove " + (wall || "this wall") + " from Saved" : "Save " + (wall || "this wall")} style={savePill(booked)}>{booked ? "★ Saved" : "☆ Save area"}</button> : null}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
            <RouteRow r={r} onOpen={onOpen} C={C} areaName={GROUPED_SORTS[af.sortBy] ? null : wall} />
            {onToggleWish ? <button onClick={() => setSaveFor({ ...r, wall })} aria-haspopup="dialog" aria-label={"Save " + r.name + (saved ? ", saved" : "")} style={{ ...CHIP, flexShrink: 0, width: 44, marginBottom: 8, padding: 0, fontSize: 17, cursor: "pointer", border: "1px solid " + (saved ? C.blue : C.border), background: saved ? C.blueBg : C.card, color: saved ? C.onSolid : C.textSub }}><span aria-hidden="true">{saved ? "★" : "☆"}</span></button> : null}
          </div>
        </Fragment>;
      })}
      {isLoading && <LoadingRows C={C} label="Loading…"/>}
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
        <div role="dialog" aria-modal="true" aria-label={"Save " + saveFor.name} style={{ position: "fixed", inset: 0, background:C.scrim, zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          {/* The backdrop is a real button under the sheet, so a tap outside closes it without a
              mouse-only div; the ✕ and Done are the keyboard's way out. */}
          <button onClick={() => setSaveFor(null)} aria-label="Close" tabIndex={-1} style={{ position: "absolute", inset: 0, background: "transparent", border: "none", padding: 0, cursor: "default" }} />
          <div style={{ position: "relative", background: C.bg, width: "100%", maxWidth: 440, borderRadius: "16px 16px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ borderBottom: "1px solid " + C.border, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "16px 16px 12px" }}>
              <div style={{ fontSize: 16, fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>{"Save " + saveFor.name}</div>
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
              <button onClick={() => setSaveFor(null)} style={{ ...BTN_LG, width: "100%", marginTop: 16, border: "none", background: C.blueSolid, color:C.onSolid }}>Done</button>
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
          and Clear all / Show N routes are pinned at the bottom above the home indicator. 
          Discipline is the FIRST row (owner, 2026-10-28): it is the filter climbers reach for, and
          the Distance away block (a location button, a search box, its hits) above it pushed the
          chips back below the fold on a phone. */}
      {sheet ? createPortal(
        <div onClick={() => setSheet(false)} role="dialog" aria-modal="true" aria-label="Filter routes" style={{ position: "fixed", inset: 0, background:C.scrim, zIndex: 300, display: "flex", alignItems: "stretch", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 520, height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
            <div style={{ zIndex: 2, background: C.bg, borderBottom: "1px solid " + C.border, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Filter routes</div>
              <button onClick={() => setSheet(false)} aria-label="Close" style={POP_CLOSE}>✕</button>
            </div>
            {/* overscrollBehavior: without it a drag that reaches the end of this list keeps going on
                the page behind the sheet (the document is the scroller here), so the sheet reads as
                stuck — the same chaining #684 fixed on the other sheets. */}
            <div style={{ padding: "0 16px 18px", overflowY: "auto", overscrollBehavior: "contain", flex: 1, minHeight: 0 }}>
            {lab("Discipline")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {/* Tick as many as you like; a range stays only while every ticked discipline shares its scale. */}
              {DISCIPLINES.filter(d => d[0]).map(d => chip(d[1], df.discs.includes(d[0]), () => setDf(x => { const discs = x.discs.includes(d[0]) ? x.discs.filter(v => v !== d[0]) : [...x.discs, d[0]]; const keep = discs.length && gradeSysFor(discs, x.gSys) === gradeSysFor(x.discs, x.gSys) && gradeScalesFor(discs).length; return { ...x, discs, ...(keep ? {} : { gSys: "", gLo: "", gHi: "" }), sortBy: !discs.length && (x.sortBy === "grade_asc" || x.sortBy === "grade_desc") ? DEF.sortBy : x.sortBy }; })))}
            </div>
            {df.discs.length > 1 ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>{"Showing " + df.discs.map(discLabel).join(" + ") + " climbs."}</div> : null}
            {lab("Distance away")}
            {df.near ? <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text, marginBottom: 8 }}>
                <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{"From " + df.near.label}</span>
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
            {lab("Grade")}
            {(() => {
              const sc = gradeScaleFor(df.discs, df.gSys);
              if (!df.discs.length) return <div style={{ fontSize: 12.5, color: C.textMuted }}>Pick a discipline above to filter by grade — grades aren't comparable across climbing types.</div>;
              if (!sc) return <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.45 }}>{df.discs.map(discLabel).join(" and ") + " are graded on different scales, so a grade range can't cover them together. Pick disciplines that share a scale, such as Sport and Trad."}</div>;
              const scales = gradeScalesFor(df.discs), curSys = gradeSysFor(df.discs, df.gSys);
              const iLo = df.gLo ? sc.findIndex(o => o[0] === df.gLo) : -1, iHi = df.gHi ? sc.findIndex(o => o[0] === df.gHi) : -1;
              const sel = (label, val, opts, set) => (
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, fontSize: 11.5, color: C.textMuted, fontWeight: 700 }}>{label}
                  <select aria-label={label + " grade"} value={val} onChange={e => set(e.target.value)} style={{ padding: "10px 10px", borderRadius: 10, border: "1px solid " + (val ? C.blue : C.border), background: val ? C.blueBg : C.surface, color: val ? C.onSolid : C.text, fontSize: 14, fontWeight: 700 }}>
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
              <button onClick={() => { setAf(df); setSheet(false); }} style={{ ...BTN_LG, flex: 2, border: "none", background: C.blueSolid, color:C.onSolid }}>{draftTotal == null || draftCounting ? "Show routes" : "Show " + draftTotal.toLocaleString() + " route" + (draftTotal !== 1 ? "s" : "")}</button>
            </div>
          </div>
        </div>, document.body) : null}
    </div>
  );
}


export default function DbAreaBrowser({ jumpToFinderReq, onSignIn, onOpenRoute, C, bookmarks, onToggleBookmark, wishlist, profile, completedIds, rankSuggested, discSlots, jumpToStateReq, jumpToAreaReq, uElev, uElevN, uElevUnit, uDistMi, onAreaContext, onFireMap, onAddClimb, onAddArea, TopContributors, rootHeader, onSuggestAreaEdit, myId, PartnerRow, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, notify, onStartCrew, onCrewsHere, openCrewCountAt, onToggleWish, userLists, onToggleListRoute }) {
  const [stateNode, setStateNode] = useState(null);
  const [stack, setStack] = useState([]); // drill path within the state; last entry is "current"
  const [screen, setScreen] = useState("areas"); // "areas" | "finder" | "near" | "objectives"
  const [finderDisc, setFinderDisc] = useState(""); // a chart bar presets the finder's discipline
  const [finderInit, setFinderInit] = useState(null); // a saved search being reopened: { id, q, filters }
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
  }, [onAreaContext, current && current.id, current && current.lat, current && current.lng]); // eslint-disable-line react-hooks/exhaustive-deps -- report the area context only when the area identity or position changes; current is a fresh object each render and onAreaContext is listed

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
      if (jumpSeq.current !== seq) return false;
      if (row) { full = row; setStateNode(row); }
    }
    const ancestors = await fetchAreaBreadcrumb(full).catch(() => []);
    if (jumpSeq.current !== seq) return false;
    const state = ancestors.find(x => x.area_type === "state");
    if (!state) return true;
    setStateNode(state);
    setStack([...ancestors.filter(x => x.area_type !== "state"), full]);
    return true;
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
  // A SAVED SEARCH reopened from Logbook › Saved or the Menu: go to the area it was saved in, then
  // open the finder there with its words and filters, as the climber left it.
  const handledFinderJump = useRef(null);
  const finderLocQ = useArea(jumpToFinderReq && jumpToFinderReq.search.loc ? jumpToFinderReq.search.loc.id : null);
  useEffect(() => {
    if (!jumpToFinderReq || handledFinderJump.current === jumpToFinderReq.id) return;
    if (finderLocQ.isError) { handledFinderJump.current = jumpToFinderReq.id; if (notify) notify("Couldn’t open that saved search — check your connection and try again."); return; }
    if (!finderLocQ.data) return;
    handledFinderJump.current = jumpToFinderReq.id;
    const req = jumpToFinderReq;
    jumpToArea(finderLocQ.data).then(ok => {
      if (!ok) return;
      setFinderDisc("");
      setFinderInit({ id: req.id, q: req.search.q, filters: req.search.filters });
      setScreen("finder");
    });
  }, [jumpToFinderReq, finderLocQ.data, finderLocQ.isError, notify]);

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
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{"Back to " + (screen !== "areas" ? current.name : crumbs.length >= 2 ? crumbs[crumbs.length - 2].name : "All areas")}</span>
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
        <RouteFinderPanel key={current.id + (finderInit ? ":" + finderInit.id : "")} initial={finderInit} uid={uid} notify={notify} onSignIn={onSignIn} scope={current} onOpen={onOpenRoute} onJumpToArea={jumpToArea} C={C} uElevN={uElevN} uElevUnit={uElevUnit} presetDisc={finderDisc} bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} onToggleWish={onToggleWish} userLists={userLists} onToggleListRoute={onToggleListRoute} onAddClimb={onAddClimb} onAddArea={onAddArea} />
      ) : screen === "objectives" ? (
        <ObjectivesPanel area={current} onOpen={onOpenRoute} C={C} />
      ) : screen === "near" ? (
        <><ScreenHero C={C} title={"Map" + (current ? " · " + current.name : "")} /><NearMePanel uDistMi={uDistMi} name={current ? current.name : null} center0={current && current.lat != null ? { lat: current.lat, lng: current.lng } : null} areaType={current && current.area_type} onBack={() => setScreen("areas")} onOpenArea={jumpToArea} C={C} /></>
      ) : (
        <AreaPage key={current.id} onSignIn={onSignIn} TopContributors={TopContributors} onFireMap={onFireMap} onAddClimb={onAddClimb} onAddArea={onAddArea} PartnerRow={PartnerRow} uid={uid} myListings={myListings} onListMe={onListMe} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={onViewProfile} notify={notify} onStartCrew={onStartCrew} onCrewsHere={onCrewsHere} openCrewCountAt={openCrewCountAt} uElev={uElev} uDistMi={uDistMi} area={current} booked={bookmarks.includes(current.id)} onToggleSave={() => onToggleBookmark(current.id)} onDrill={drill} onFinder={d => { setFinderInit(null); setFinderDisc(typeof d === "string" ? d : ""); setScreen("finder"); }} onSuggestAreaEdit={onSuggestAreaEdit} myId={myId} onNear={() => setScreen("near")} onObjectives={() => setScreen("objectives")} onAllAreas={() => setTreeOpen(true)} onOpenRoute={onOpenRoute} onJumpToArea={jumpToArea} C={C} />
      )}
      {treeOpen && stateNode ? (
        <DbAreaTree stateRoot={stateNode} current={current} ancestorIds={stack.map(a => a.id)} onNavigate={jumpToArea} onClose={() => setTreeOpen(false)} C={C} />
      ) : null}
    </div>
    </ClimberCtx.Provider>
  );
}
