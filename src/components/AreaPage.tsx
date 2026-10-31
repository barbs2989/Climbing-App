import { DISCIPLINES, ATYPE } from "../../lib/areaBrowserShared.js";
import { useState, useRef } from "react";
import { useArea, useAreaClimbStats, useAreaContributions, useAreaChildren, useAreaRoutes, useAreaClassics, useAreaNamesByIds, submitAreaPlacementClaim } from "../../lib/db";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { ScreenHero } from "../../lib/ScreenHero";
import { Pill, SL } from "../../lib/areaBrowserParts.jsx";
import { PendingAreaEdits, AboutCard, AreaFactsCard, ClimbsChart, GradeSpread } from "../../lib/AreaPageSections";
import ClassicsList from "./ClassicsList.tsx";
import { BTN_LG, CHIP, BTN } from "../../lib/buttonStyles.js";
import Chevron from "./Chevron.tsx";
import AreaGettingThere from "./AreaGettingThere.tsx";
import PartnersHereCard from "./PartnersHereCard.tsx";
import DbSearchSplit from "./DbSearchSplit.tsx";
import SummitBriefing from "./SummitBriefing.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { clickable } from "../../lib/clickable";
import { discLabel } from "../../lib/areaDiscLabel.js";
import RouteRow from "./RouteRow.tsx";
import AddHereFooter from "./AddHereFooter.tsx";
import AreaWrongSpot from "../../lib/AreaWrongSpot";
import DbSuggestedClimbs from "./DbSuggestedClimbs.tsx";
import NearbyPeaks from "./NearbyPeaks.tsx";
import type { ComponentType, ReactNode } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { ClassicsListRow } from "./ClassicsList.tsx";
import type { NearbyPeaksRow } from "./NearbyPeaks.tsx";
import type { PartnersHereCardProps } from "./PartnersHereCard.tsx";
import type { DbSearchSplitArea, DbSearchSplitRoute } from "./DbSearchSplit.tsx";
import type { AreaGettingThereArea } from "./AreaGettingThere.tsx";
import type { AddHereFooterArea } from "./AddHereFooter.tsx";

/** A row of the area page's climb list (useAreaRoutes). */
export interface AreaPageRoute extends Omit<RouteRowRoute, "stars"> {
  /** The climbers' mean rating; an unrated climb is null or 0 in the database and compares as 0 here. */
  stars: number;
  id: string | number;
  name: string;
  classic?: boolean | null;
  guide_stars?: number | null;
  classic_score?: number | string | null;
  [column: string]: unknown;
}
/** An areas row, as the drill stack holds it. */
export interface AreaPageArea extends Omit<AreaGettingThereArea, "area_type" | "lat" | "lng">, AddHereFooterArea {
  area_type: keyof typeof ATYPE;
  region?: string | null;
  elevation_ft?: number | null;
  prominence_ft?: number | null;
  avy_zone?: string | null;
  dominant_discipline?: keyof typeof DL | null;
  parent_peak?: string | null;
  blurb?: string | null;
  lat?: number | null;
  lng?: number | null;
  [column: string]: unknown;
}
/** The fields of a react-query result this page reads. */
interface AreaPageQuery<T> { data?: T | null; isLoading?: boolean; error?: unknown }
/** An area_classics row: a list row plus the whole count the read was capped from. */
interface AreaPageClassic extends ClassicsListRow { total?: number | null }
/** What a row of the page's lists or the nearby peaks hands to the jump. */
type AreaPageJump = DbSearchSplitArea | NearbyPeaksRow["a"];
const CHILD_NOUN: Record<string, string> = { crag: "Areas", peak: "Peaks", canyon: "Canyons", range: "Ranges", region: "Areas", wall: "Areas", state: "States", country: "Countries" };
function childNoun(children: { area_type: string }[] | null | undefined) {
  const types = [...new Set((children || []).map((c: { area_type: string }) => c.area_type))];
  return (types.length === 1 && CHILD_NOUN[types[0]]) || "Areas";
}
// CLASSIC CLIMBS HERE: the area page's answer to "what should I climb here?", picked the way Mountain Project's
// area Classic Climbs and theCrag's classics are — by quality ratings — but from OUR ratings only: the curated
// `classic` flag, the guidebook's 3- and 4-star climbs (`guide_stars`, 0-4), and climbs our own climbers rate
// 3.5+ (`stars`, 0294). Nothing here is read from another site. Best first: curated, then guidebook stars, then
// climbers' stars, then name. An area with none falls back to TOP RATED HERE.
const CLASSIC_GUIDE_STARS = 3, CLASSIC_CLIMBER_STARS = 3.5;
function isAreaClassic(r: AreaPageRoute) { return !!r.classic || (r.guide_stars != null && r.guide_stars >= CLASSIC_GUIDE_STARS) || (r.stars != null && r.stars >= CLASSIC_CLIMBER_STARS); }
// Best first, as area_classics (0393) orders the areas above: the classic score, else guidebook stars, else ours.
function classicQuality(r: AreaPageRoute) { return Number(r.classic_score ?? r.guide_stars ?? r.stars ?? 0); }
function areaClassics(routes: AreaPageRoute[]) {
  return routes.filter(isAreaClassic).sort((a: AreaPageRoute, b: AreaPageRoute) => (b.classic ? 1 : 0) - (a.classic ? 1 : 0) || classicQuality(b) - classicQuality(a) || (b.guide_stars || 0) - (a.guide_stars || 0) || (b.stars || 0) - (a.stars || 0) || a.name.localeCompare(b.name));
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
function sortAreaRoutes(routes: AreaPageRoute[], key: string) {
  const byName = (a: AreaPageRoute, b: AreaPageRoute) => String(a.name || "").localeCompare(String(b.name || ""));
  if (key === "az") return [...routes].sort(byName);
  if (key === "za") return [...routes].sort((a: AreaPageRoute, b: AreaPageRoute) => byName(b, a));
  if (key === "disc") {
    const rank = (d: string | undefined) => { const i = DISCIPLINES.findIndex(x => x[0] === d); return i < 0 ? 999 : i; };
    return [...routes].sort((a: AreaPageRoute, b: AreaPageRoute) => rank(a.discipline) - rank(b.discipline) || byName(a, b));
  }
  const dir = key === "rl" ? -1 : 1;
  // A boulder problem has no place in a wall's left-to-right line, so it sorts with the unplaced, by name.
  const pos = (r: AreaPageRoute) => r.discipline === "bouldering" ? null : r.sort_order;
  return [...routes].sort((a: AreaPageRoute, b: AreaPageRoute) => { const pa = pos(a), pb = pos(b); return Number(pa == null) - Number(pb == null) || (pa != null && pb != null ? dir * (pa - pb) : 0) || byName(a, b); });
}
export interface AreaPageProps {
  /** The drill-stack row; the page reads the live row over it. */
  area: AreaPageArea;
  onSignIn?: () => void;
  uElev?: ((ft: number) => string) | null;
  uDistMi?: (mi: number) => string;
  /** Whether this area is in Saved. */
  booked?: boolean;
  onToggleSave: () => void;
  onDrill: (a: AreaPageArea) => void;
  /** Opens the route finder, optionally preset to a discipline. */
  onFinder: (disc?: unknown) => void;
  onNear: () => void;
  onObjectives: () => void;
  onAllAreas: () => void;
  onOpenRoute: (r: RouteRowRoute | DbSearchSplitRoute) => void;
  onJumpToArea: (a: AreaPageJump) => void;
  C: typeof Palette;
  onAddClimb?: ((area: AddHereFooterArea) => void) | null;
  onAddArea?: ((area: AddHereFooterArea) => void) | null;
  TopContributors?: ComponentType<{ areaId: string; mb?: number }> | null;
  onFireMap?: ((area: AreaPageArea) => void) | null;
  /** Absent hides every edit control; null opens the editor with no field chosen. */
  onSuggestAreaEdit?: ((area: AreaPageArea, field: string | null) => void) | null;
  myId?: string | null;
  PartnerRow?: PartnersHereCardProps["PartnerRow"];
  uid?: PartnersHereCardProps["uid"];
  myListings?: PartnersHereCardProps["myListings"];
  onListMe?: PartnersHereCardProps["onListMe"];
  onFindPartnersInArea?: PartnersHereCardProps["onFindPartnersInArea"];
  onViewProfile?: PartnersHereCardProps["onViewProfile"];
  notify?: PartnersHereCardProps["notify"];
  onStartCrew?: PartnersHereCardProps["onStartCrew"];
  onCrewsHere?: PartnersHereCardProps["onCrewsHere"];
  onGroupsHere?: PartnersHereCardProps["onGroupsHere"];
  openCrewCountAt?: PartnersHereCardProps["openCrewCountAt"];
}
export default function AreaPage({ area: areaRow, onSignIn, uElev, uDistMi, booked, onToggleSave, onDrill, onFinder, onNear, onObjectives, onAllAreas, onOpenRoute, onJumpToArea, C, onAddClimb, onAddArea, TopContributors, onFireMap, onSuggestAreaEdit, myId, PartnerRow, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, notify, onStartCrew, onCrewsHere, onGroupsHere, openCrewCountAt}: AreaPageProps) {
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
  const { data: liveArea }: AreaPageQuery<AreaPageArea> = useArea(areaRow.id);
  const area = liveArea && liveArea.id === areaRow.id ? liveArea : areaRow;
  const formation = ["crag", "peak", "wall"].includes(area.area_type);
  // The chart runs on everything below a country: the whole catalog in one call is ~2 s against
  // a 3 s statement timeout, and a country page is a list of states anyway.
  const chartable = !["world", "country"].includes(area.area_type);
  const stats = useAreaClimbStats(chartable ? area.id : null);
  const areaEdits = useAreaContributions(formation && onSuggestAreaEdit ? area.id : null);
  const editOn = formation && onSuggestAreaEdit ? (k: string | null) => onSuggestAreaEdit(area, k) : null;
  const { data: children, isLoading: lc, error: ec }: AreaPageQuery<AreaPageArea[]> = useAreaChildren(area.id);
  const { data: routes, isLoading: lr, error: er }: AreaPageQuery<AreaPageRoute[]> = useAreaRoutes(area.id);
  const isLeaf = Array.isArray(children) && children.length === 0;
  // Above a wall the classics come from the whole subtree (0390); a wall ranks its own loaded rows (areaClassics).
  const classicsUp: AreaPageQuery<AreaPageClassic[]> = useAreaClassics(area.id, isLeaf === false && chartable);
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
  const { data: parentNames }: AreaPageQuery<Record<string, string>> = useAreaNamesByIds(parentIsId ? [rawParent] : []);
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
      {PARTNER_CARD_TYPES.includes(area.area_type) ? <PartnersHereCard area={area} C={C} uid={uid} myListings={myListings} onListMe={onListMe} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={onViewProfile} PartnerRow={PartnerRow} notify={notify} onStartCrew={onStartCrew} onCrewsHere={onCrewsHere} onGroupsHere={onGroupsHere} openCrewCountAt={openCrewCountAt} /> : null}
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
                // positions both wall orders would be A → Z under another name. A boulder problem's
                // stored position is NOT a wall order (owner's note, 2026-10-21: "there's no left to
                // right or right to left order ... with bouldering"), so a list of problems is never
                // offered one, and a problem never counts as a climb missing its place on the wall.
                const placed = routes.filter(r => r.sort_order != null && r.discipline !== "bouldering").length;
                const opts = placed ? AREA_LIST_SORTS : AREA_LIST_SORTS.filter(o => o[0] === "az" || o[0] === "za" || o[0] === "disc");
                const key = opts.some(o => o[0] === listSort) ? listSort : opts[0][0];
                const discsHere = [...new Set(routes.map(r => r.discipline).filter(Boolean))];
                const shownAll = routes.filter(r => (!wallDisc || r.discipline === wallDisc) && (!wallStars || !(r.stars > 0) || r.stars >= wallStars));
                const unplaced = (key === "lr" || key === "rl") ? shownAll.filter(r => r.sort_order == null && r.discipline !== "bouldering").length : 0;
                const filtersOn = (wallDisc ? 1 : 0) + (wallStars ? 1 : 0);
                const wallChip = (on: boolean) => ({ ...CHIP, flexShrink: 0, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
                return <>
                  {routes.length > 1 ? <div style={{ marginBottom: 8 }}>
                    <button onClick={() => setWallFilterOpen(o => !o)} aria-expanded={wallFilterOpen} style={{ ...wallChip(filtersOn > 0), minHeight: 44 }}>{"Filters" + (filtersOn ? " (" + filtersOn + ")" : "")}</button>
                    {wallFilterOpen ? <div style={{ marginTop: 8, padding: "10px 11px", background: C.card, borderRadius: 10, border: "1px solid " + C.border }}>
                      <div id="wall-filter-disc" style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>Discipline</div>
                      <div role="group" aria-labelledby="wall-filter-disc" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 10 }}>{[["", "All"], ...discsHere.map(d => [d, discLabel(d)])].map(o => <button key={o[0] || "all"} onClick={() => setWallDisc(o[0])} aria-pressed={wallDisc === o[0]} style={wallChip(wallDisc === o[0])}>{o[1]}</button>)}</div>
                      <div id="wall-filter-stars" style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>Stars</div>
                      <div role="group" aria-labelledby="wall-filter-stars" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}>{[[0, "Any"] as [number, string], [2, "2+ stars"] as [number, string], [3, "3+ stars"] as [number, string]].map(o => <button key={o[0]} onClick={() => setWallStars(o[0])} aria-pressed={wallStars === o[0]} style={wallChip(wallStars === o[0])}>{o[1]}</button>)}</div>
                      <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.45 }}>{"Climbs nobody has rated yet stay in the list when a star minimum is set."}</div>
                    </div> : null}
                  </div> : null}
                  {routes.length > 1 ? <div role="group" aria-label="Sort climbs" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 8 }}>{opts.map(o => <button key={o[0]} onClick={() => setListSort(o[0])} aria-pressed={key === o[0]} style={{ ...CHIP, flexShrink: 0, border: "1px solid " + (key === o[0] ? C.blue : C.border), background: key === o[0] ? C.blueBg : C.surface, color: key === o[0] ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{o[1]}</button>)}</div> : null}
                  {unplaced ? <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.45 }}>{unplaced + (unplaced !== 1 ? " climbs have" : " climb has") + " no position on the wall yet, so " + (unplaced !== 1 ? "they are" : "it is") + " listed last, by name."}</div> : null}
                  {shownAll.length ? (() => {
                    // By discipline: one heading per run of the same discipline, rows under it in name order.
                    const out: ReactNode[] = []; let last: string | undefined | null = null;
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
          : !error ? <div style={{ color: C.textMuted, fontSize: 12 }}>No climbs in this crag yet.</div> : null
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
      {wrongOpen ? <AreaWrongSpot area={area} C={C} onClose={() => setWrongOpen(false)} onSubmit={(note: string, place: string) => submitAreaPlacementClaim(area.id, note, place)} onSignIn={onSignIn} /> : null}

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
