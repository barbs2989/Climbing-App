import { DISCIPLINES, ATYPE } from "../../lib/areaBrowserShared.js";
import { useState, useRef, useContext, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useArea, useAreaClimbStats, useAreaContributions, useAreaChildren, useAreaChildrenGradeCounts, useAreaChildrenDiscCounts, useAreaRoutes, useAreaClassics, useAreaLoggedMonths, useAreaNamesByIds, useScopedWishlistRoutes, submitAreaPlacementClaim, submitWallOrderSuggestion } from "../../lib/db";
import type { WallGradeRow } from "./WallGradeBars.tsx";
import AreaActionRow from "./AreaActionRow.tsx";
import AreaChildrenList from "./AreaChildrenList.tsx";
import type { ChildDiscCounts } from "../../lib/areaChildSort.js";
import AreaPhotoStrip from "./AreaPhotoStrip.tsx";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { ScreenHero } from "../../lib/ScreenHero";
import { Pill, SL } from "../../lib/areaBrowserParts.jsx";
import { PendingAreaEdits, AboutCard, AreaFactsCard, GradeSpreadDisclosure, gradeFinderFilters, areaSheet } from "../../lib/AreaPageSections";
import { useWideScreen, useFullWidth } from "../../lib/wideLayout.js";
import { ClimberCtx } from "../../lib/climberCtx.js";
import { headerValue } from "../../lib/headerValue.js";
import ClassicsList from "./ClassicsList.tsx";
import { BTN_LG, CHIP, BTN } from "../../lib/buttonStyles.js";
import Chevron from "./Chevron.tsx";
import AreaGettingThere from "./AreaGettingThere.tsx";
import PartnersHereCard from "./PartnersHereCard.tsx";
import DbSearchSplit from "./DbSearchSplit.tsx";
import SummitBriefing from "./SummitBriefing.tsx";
import LoadingRows from "./LoadingRows.tsx";
import EmptyState from "./EmptyState.tsx";
import CommentMenu from "./CommentMenu.tsx";
import { discLabel } from "../../lib/areaDiscLabel.js";
import { gradeNumFor, gradeSystemForDiscipline } from "../../lib/grade.js";
import RouteRow from "./RouteRow.tsx";
import { DISC_GRADE_SCALES, FINDER_DEF, FinderFilterSheet, FinderChipLine, finderArgs, finderChips, finderFilterCount, dropUnfit, isFinderMetric } from "./RouteFinderPanel.tsx";
import type { RouteFinderPanelFilters } from "./RouteFinderPanel.tsx";
import { finderRowFilter } from "../../lib/offline.js";
import AddHereFooter from "./AddHereFooter.tsx";
import AreaWrongSpot from "../../lib/AreaWrongSpot";
import { fetchCragForecastMeasured } from "../../lib/forecast";
import { CRAG_SCORE_DISCIPLINES } from "../../lib/conditionsScore.js";
import WallOrderSuggest from "./WallOrderSuggest.tsx";
import DbSuggestedClimbs from "./DbSuggestedClimbs.tsx";
import AreaLatestReports from "./AreaLatestReports.tsx";
import NearbyPeaks from "./NearbyPeaks.tsx";
import type { ComponentType, ReactNode } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { ClassicsListRow } from "./ClassicsList.tsx";
import type { NearbyPeaksRow } from "./NearbyPeaks.tsx";
import type { PartnersHereCardProps } from "./PartnersHereCard.tsx";
import type { ViewableClimber } from "./TopContributors.tsx";
import type { DbSearchSplitArea, DbSearchSplitRoute } from "./DbSearchSplit.tsx";
import type { AreaGettingThereArea } from "./AreaGettingThere.tsx";
import type { AddHereFooterArea } from "./AddHereFooter.tsx";

/** A raw `routes.discipline` whose climb can carry the crag conditions score ("rock" is split by style, sport or trad). */
const CRAG_WX_DISCS: string[] = ["rock", ...CRAG_SCORE_DISCIPLINES];
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
  parent_id?: string | null;
  elevation_ft?: number | null;
  prominence_ft?: number | null;
  avy_zone?: string | null;
  dominant_discipline?: keyof typeof DL | null;
  parent_peak?: string | null;
  blurb?: string | null;
  path?: string | null;
  season_months?: number[] | null;
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
// The sidebar map thumbnail opens at a zoom that frames the area: a region shows its valleys, a wall its cliff.
// Only a crag or a wall is ONE place a pin can mark: a state, region, range or peak area is framed with no "C" crag pin.
const MAP_ZOOM: Record<string, number> = { state: 6, region: 8, range: 9, canyon: 12, peak: 12, crag: 14, wall: 15 };
const PARTNER_CARD_TYPES = ["region", "range", "canyon", "crag", "wall"];
// The order a crag's own climb list can be read in (Mountain Project and theCrag: left to right as
// on the wall, the default, or by name). `sort_order` is the left-to-right position; a climb with no
// position stays LAST in both wall orders, by name, rather than being guessed into the line.
// "By discipline" groups the list under one heading per discipline (in DISCIPLINES order), each A → Z.
// Easiest / Hardest and Best first are the seed wall list's Grade and Stars sorts (seed-vs-real audit,
// 2026-11-11). A grade is only comparable inside its own system, so a mixed list groups by system
// (in DISCIPLINES order) before grade; an ungraded climb sorts last. "Best" is the classics ranking
// the page already uses (the classic flag, then classic_score / guide stars) — not the raw star
// average, which only 6 of 205k routes carry.
const AREA_LIST_SORTS = [["lr", "Left → right"], ["rl", "Right → left"], ["easy", "Easiest"], ["hard", "Hardest"], ["best", "Best first"], ["az", "A → Z"], ["za", "Z → A"], ["disc", "By discipline"]];
function sortAreaRoutes(routes: AreaPageRoute[], key: string) {
  const byName = (a: AreaPageRoute, b: AreaPageRoute) => String(a.name || "").localeCompare(String(b.name || ""));
  if (key === "easy" || key === "hard") {
    // Grouped by GRADE SYSTEM, not discipline: trad and sport both read YDS and interleave by grade.
    const SYS_ORDER = ["yds", "v", "wi", "m", "aid", "class"];
    const sysRank = (r: AreaPageRoute) => { const i = SYS_ORDER.indexOf(String(gradeSystemForDiscipline(r.discipline) || "")); return i < 0 ? 99 : i; };
    const num = (r: AreaPageRoute) => gradeNumFor(r.grade || r.rock_grade || r.ice_grade || r.alpine_grade, r.discipline);
    const dir = key === "hard" ? -1 : 1;
    return [...routes].sort((a: AreaPageRoute, b: AreaPageRoute) => { const na = num(a), nb = num(b); return Number(na == null) - Number(nb == null) || sysRank(a) - sysRank(b) || (na != null && nb != null ? dir * (na - nb) : 0) || byName(a, b); });
  }
  if (key === "best") return [...routes].sort((a: AreaPageRoute, b: AreaPageRoute) => (b.classic ? 1 : 0) - (a.classic ? 1 : 0) || classicQuality(b) - classicQuality(a) || byName(a, b));
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
  /** The finder's number-and-unit pair, for the climb list's Filters sheet (length labels in the climber's units). */
  uElevN: (ft: number | null | undefined) => number | null;
  uElevUnit: () => string;
  uDistMi?: (mi: number) => string;
  /** Whether this area is in Saved. */
  booked?: boolean;
  onToggleSave: () => void;
  /** Saves or unsaves ONE climb on My Objectives (App toggleWish): the star at the end of each row of this wall's climb list. Absent hides it. */
  onToggleWish?: ((id: string | number) => void) | null;
  /** The header's ONE Log button: the climb picker opened at this area, for a quick or a full log. Absent hides it. */
  onLog?: ((area: AreaPageArea, mode: "quick" | "full") => void) | null;
  onDrill: (a: AreaPageArea) => void;
  /** Opens the route finder, optionally preset to a discipline. */
  onFinder: (disc?: unknown) => void;
  onNear: () => void;
  onObjectives: () => void;
  onAllAreas: () => void;
  onOpenRoute: (r: RouteRowRoute | DbSearchSplitRoute) => void;
  /** Opens a trip report or logged climb from LATEST FROM THIS AREA over this page, with the climb it is about. */
  onOpenReport?: (ascent: Record<string, unknown>, route: RouteRowRoute) => void;
  onJumpToArea: (a: AreaPageJump) => void;
  C: typeof Palette;
  onAddClimb?: ((area: AddHereFooterArea) => void) | null;
  onAddArea?: ((area: AddHereFooterArea) => void) | null;
  TopContributors?: ComponentType<{ areaId: string; mb?: number; onViewProfile?: (climber: ViewableClimber) => void }> | null;
  /** Opens the profile of a climber named on TOP CONTRIBUTORS (its rows hand over a different shape than PARTNERS HERE). */
  onViewContributor?: (climber: ViewableClimber) => void;
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
  /** The area browser's Back and the path above this area, drawn in this page's header card (DbAreaBrowser
   *  areaNav); `names` are the areas on that path, so the facts line does not print one of them again. */
  headerNav?: { back: ReactNode; path: ReactNode; names: string[] } | null;
}
// THE HEADER CARD'S BUTTONS: Save area, Area tree and Fire map are ONE size (owner, 2026-11-18: "fire map needs to be
// the same size as save area") -- 34px, the height Save was given on 2026-11-14 -- and one width; only the colour differs.
const HEAD_BTN: CSSProperties = { flexShrink: 0, boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, height: 34, minWidth: 100, padding: "0 12px", borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap" };
export default function AreaPage({ area: areaRow, onSignIn, uElev, uElevN, uElevUnit, uDistMi, booked, onToggleSave, onToggleWish, onLog, onDrill, onFinder, onNear, onObjectives, onAllAreas, onOpenRoute, onOpenReport, onJumpToArea, C, onAddClimb, onAddArea, TopContributors, onViewContributor, onFireMap, onSuggestAreaEdit, myId, PartnerRow, uid, myListings, onListMe, onFindPartnersInArea, onViewProfile, notify, onStartCrew, onCrewsHere, onGroupsHere, openCrewCountAt, headerNav}: AreaPageProps) {
  const [wrongOpen, setWrongOpen] = useState(false);
  // The Log button's choice sheet: Quick log or Full log, then the climb.
  const [logChoice, setLogChoice] = useState(false);
  // ORDER WRONG? (0485): the sheet where a climber puts this wall's climbs in left-to-right order. A suggestion only.
  const [orderOpen, setOrderOpen] = useState(false);
  const listEndRef = useRef(null);
  const [listSort, setListSort] = useState("lr");
  // Filters on a WALL's own climb list: since the owner's note of 2026-11-25 ("the filters button isn't showing all the
  // filters like we have on the route finder ... If so add it") the SAME sheet and the same test as the Route finder —
  // discipline, grade, stars, pitches, length, gain, round trip — applied to the rows already loaded, so no query and it
  // works offline. `wf` is applied, `wd` the open sheet's draft (null while closed).
  const [wf, setWf] = useState<RouteFinderPanelFilters>(FINDER_DEF);
  const [wd, setWd] = useState<RouteFinderPanelFilters | null>(null);
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
  /* START THE CONDITIONS SCORE'S READ HERE (owner, 2026-11-25: "Conditions score is slow still"). Every climb listed on
     this page is filed on THIS area, so its score is read at this area's coordinate: the same read RouteDetail starts
     when a crag climb opens and the card then joins (lib/forecast.js fetchCragForecastMeasured, one per crag for ten
     minutes). Started while the climber is still choosing a climb, it is usually back before they reach Conditions.
     Only where a listed climb could carry a score (a crag discipline, not on a peak, where trad reads as alpine). */
  const cragWx = area.area_type !== "peak" && Array.isArray(routes) && routes.some(function (r) { return CRAG_WX_DISCS.includes(String(r.discipline)); }) && area.lat != null && area.lng != null && isFinite(Number(area.lat)) && isFinite(Number(area.lng));
  useEffect(function () { if (cragWx) fetchCragForecastMeasured(Number(area.lat), Number(area.lng)).catch(function () { /* the card asks again, and says so if it fails */ }); }, [cragWx, area.lat, area.lng]);
  // A state, region or range always has areas under it, so its subtree reads (classics, the wall cards'
  // grade bars) start with the page instead of waiting a round trip for the children list. Anything
  // else waits for the list: a crag or peak can be a leaf.
  const aboveLeaf = isLeaf === false || (!Array.isArray(children) && ["state", "region", "range"].includes(area.area_type || ""));
  // Each child's climbs by discipline (0455), for the sub-area list's "Most sport / trad…" sorts and its type line.
  const kidDiscs: AreaPageQuery<ChildDiscCounts> = useAreaChildrenDiscCounts(area.id, { enabled: aboveLeaf });
  // The website's arrangement (competitor review item 15, 2026-11-04): CLIMBS HERE and GRADE SPREAD side by
  // side, the finder's form inline under them preset to the climber's grade, classics as one-line rows,
  // and MOST LOGGED HERE beside Season. The phone keeps its stacked page and its Route finder button.
  const wide = useWideScreen();
  // The website's LEFT PANEL (App's #cm-left-panel, lib/wideLayout.js wideLeft), from FULL_MIN up: the map and the
  // sub-areas are drawn there, beside the page, and the page column keeps its whole width (owner, 2026-11-11: "this
  // needs to be in the left panel on desktop… then everything else isn't squished in the middle section"). They
  // used to be a 196px column INSIDE the page column. Narrower than that there is no panel: the phone's section.
  const full = useFullWidth();
  const [leftEl, setLeftEl] = useState<HTMLElement | null>(null);
  useEffect(() => { setLeftEl(wide && full ? document.getElementById("cm-left-panel") : null); }, [wide, full]);
  const logged: AreaPageQuery<number[]> = useAreaLoggedMonths(wide && formation ? area.id : null);
  // The grades the climber typed on their profile (ClimberCtx.stated). This read `profile` until 2026-11-19, which is
  // the LOGBOOK's summary and carries no stated grade, so the finder's "Up to your grade" preset never fired.
  const { stated } = useContext(ClimberCtx);
  const said = (g?: string | null) => (g && g !== "N/A" ? g : null);
  const myGrades = stated ? { sport: said(stated.sport), trad: said(stated.trad), boulder: said(stated.bouldering) } : null;
  const discOptions = DISCIPLINES.map(d => d[0]).filter(Boolean);
  const inlineDiscs: string[] = stats.data && Array.isArray(stats.data.by_disc) ? stats.data.by_disc.filter((d: { disc: string; n: number }) => d && Number(d.n) > 0 && discOptions.includes(d.disc)).map((d: { disc: string }) => d.disc) : [];
  // The mini grade chart on each child's card (item 13, 2026-11-04) is a website thing: one call for
  // the whole list, only where there is a list to draw it on. The phone card is unchanged.
  // The desktop "add / edit / wrong place" row's cells (see the row under the climb list).
  // A state, country or the world has its place fixed by the map: no "Wrong place?" (owner, 2026-11-11).
  // So has a state's own top-level division (Washington's Northwest Region; owner, 2026-11-19): a region or range
  // filed DIRECTLY under a state or country. The parent decides it, not the type: most `region` rows sit under
  // another region and many of those are crags, which can be misfiled. Until the parent row is read (it is
  // normally cached from the drill down) a region or range shows no button, so a failed read cannot offer it.
  const division = ["region", "range"].includes(area.area_type);
  const { data: parentArea }: AreaPageQuery<AreaPageArea> = useArea(division ? area.parent_id || null : null);
  const fixedPlace = ["world", "country", "state"].includes(area.area_type) || (division && (!parentArea || parentArea.id !== area.parent_id || ["state", "country"].includes(parentArea.area_type)));
  const cellBox: CSSProperties = { flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" };
  const cellQ: CSSProperties = { fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8, overflowWrap: "anywhere" };
  const cellBtn: CSSProperties = { ...BTN_LG, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  const kidGrades: AreaPageQuery<Record<string, WallGradeRow[]>> = useAreaChildrenGradeCounts(wide && !full && chartable && aboveLeaf ? area.id : null); // not in the left panel (owner, 2026-11-13: "remove the grade spread from the left panel"), so not read there
  // Above a wall the classics come from the whole subtree (0390); a wall ranks its own loaded rows (areaClassics).
  const classicsUp: AreaPageQuery<AreaPageClassic[]> = useAreaClassics(area.id, aboveLeaf && chartable);
  const loading = lc || (isLeaf && lr);
  const error = ec || er;
  // dominant_discipline used to reach only the map pin's colour and icon, so the DB
  // browser was missing a chip the seed browser has always shown. Same gate as seed:
  // it only means something on a formation, not on a range/state/country.
  const domDisc = ["peak", "crag", "wall"].includes(area.area_type) ? area.dominant_discipline : null;
  // The avalanche zone is a bare name ("West Slopes North"), so its chip says what it is; a paragraph is not a chip (lib/headerValue.js).
  const _avyChip = headerValue(area.avy_zone);
  const chips = [domDisc ? DL[domDisc] || domDisc : null, _avyChip ? "Avalanche zone: " + _avyChip : null].filter(Boolean);
  const noun = childNoun(children).toLowerCase();
  // parent_peak is stored two ways: 67 areas hold a display name (sometimes with a
  // trailing "— …per…" note), 28 hold a raw area id. Resolve the ids to names rather
  // than printing "wa_mount_anderson_olympic" at someone.
  const rawParent = area.parent_peak || null;
  const parentIsId = !!rawParent && /^[a-z]{2}_[a-z0-9_]+$/.test(rawParent);
  const { data: parentNames }: AreaPageQuery<Record<string, string>> = useAreaNamesByIds(parentIsId ? [rawParent] : []);
  const parentPeak = !rawParent ? null : parentIsId ? (parentNames && parentNames[rawParent]) || null : String(rawParent).split(" — ")[0].trim();
  // YOUR OBJECTIVES HERE (the action row's count, and the ★N on each sub-area): the wishlist rows under this area,
  // read by id as the My objectives screen reads them (useScopedWishlistRoutes), then bucketed by child path.
  const { wishlist } = useContext(ClimberCtx);
  const scoped: AreaPageQuery<{ areas?: { path?: string | null } | null }[]> = useScopedWishlistRoutes(area, wishlist);
  const objectivesHere = wishlist && wishlist.length ? (scoped.data ? scoped.data.length : null) : 0;
  const objByChild: Record<string, number> = {};
  if (scoped.data && children) for (const c of children) {
    const p = c.path ? String(c.path) : "";
    if (!p) continue;
    const n = scoped.data.filter(r => { const rp = r.areas && r.areas.path ? String(r.areas.path) : ""; return rp === p || rp.startsWith(p + "."); }).length;
    if (n) objByChild[String(c.id)] = n;
  }
  // IN SEASON / OFF SEASON (the header line): this month against the stored season. Mountain Project draws a
  // weather-averages block; the one-word answer is what a climber planning a trip wants first.
  const season = Array.isArray(area.season_months) && area.season_months.length ? (area.season_months as unknown[]).map(Number) : null;
  const inSeason = season ? season.includes(new Date().getMonth() + 1) : null;
  // A grade column opens the Route finder on that grade (the chart is the way in, not a picture).
  // It opens on the chip's own discipline when the finder can filter that discipline on that scale; else on every discipline the scale grades.
  const onGrade = (sys: string, b: number, disc?: string) => { const fl = gradeFinderFilters(sys, b, stats.data, disc && discOptions.includes(disc) && (DISC_GRADE_SCALES[disc] || []).includes(sys) ? disc : undefined); if (fl) onFinder(fl); else onFinder(); };

  // THE PAGE, top to bottom (owner, 2026-11-11, area page redesign): the header; then the grade spread (Climbs here
  // by type behind a dropdown), the description, the Route finder · objectives · Map row, the sub-areas (phone), the
  // classic climbs, the photo strip, Getting there -- and under them everything else in its old order. A CRAG OR WALL
  // reads climb first instead (owner, 2026-11-18): Route finder row, the climbs, description, grade spread, classics. On the website the sub-areas are a column to the left of all of it, as Mountain Project
  // lays out its area pages, so you never scroll past the page to reach the areas below.
  const showAbout = formation || !!(area.blurb && String(area.blurb).trim());
  const childRows = !loading && children && children.length > 0 ? children : null;
  const mapPin = area.lat != null && area.lng != null && isFinite(Number(area.lat)) && isFinite(Number(area.lng)) ? { lat: Number(area.lat), lng: Number(area.lng), zoom: MAP_ZOOM[area.area_type] || 10, name: area.name, pin: area.area_type === "crag" || area.area_type === "wall" } : null;
  const childList = (variant: "sidebar" | "section") => childRows ? <AreaChildrenList rows={childRows} noun={childNoun(children)} onDrill={onDrill} C={C} grades={wide && variant === "section" ? kidGrades.data || null : null} objectives={objByChild} variant={variant} onAllAreas={onAllAreas} map={variant === "sidebar" ? mapPin : null} onNear={onNear} discCounts={kidDiscs.data || null} /> : null;
  // CLASSIC CLIMBS HERE. Above a wall: all of them across the subtree (ClassicsList: five, then a dropdown), each
  // row naming the wall it is on; a failed read says so; an area with no classics shows nothing rather than "none".
  // A wall: areaClassics over its own rows; with none, TOP RATED HERE -- the rows that carry a climber star rating
  // (routes.stars, kept by 0294), best first. An area with neither shows nothing rather than "no ratings yet".
  const classicsEl = isLeaf === false && chartable
    ? (classicsUp.error ? <div role="status" style={{ fontSize: 12, color: C.textMuted, padding: "10px 14px", borderTop: "1px solid " + C.border }}>Couldn't load the classic climbs here.</div>
      : classicsUp.data && classicsUp.data.length ? <ClassicsList rows={classicsUp.data} total={classicsUp.data[0].total} withWall dense={wide} onOpen={onOpenRoute} C={C} /> : null)
    : !loading && isLeaf && routes && routes.length > 1 ? (() => { const cl = areaClassics(routes); if (cl.length) return <ClassicsList rows={cl} dense={wide} onOpen={onOpenRoute} C={C} />; const top = routes.filter(r => r.stars > 0).sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name)).slice(0, 5); return top.length ? <ClassicsList rows={top} title="Top rated here" dense={wide} onOpen={onOpenRoute} C={C} /> : null; })() : null;
  const metaParts = [area.region && area.region !== area.name && !(headerNav && headerNav.names.includes(area.region)) ? area.region : null, area.elevation_ft ? (uElev ? uElev(area.elevation_ft) : area.elevation_ft.toLocaleString() + " ft") : null, area.prominence_ft ? ((uElev ? uElev(area.prominence_ft) : area.prominence_ft.toLocaleString() + " ft") + " prom") : null, area.rock ? String(area.rock).replace(/^./, (x: string) => x.toUpperCase()) : null, area.approach_min != null && Number(area.approach_min) > 0 ? Number(area.approach_min) + " min walk" : null].filter(Boolean);

  // Partners here and the area/route search are placed differently on the website and the phone (see their sites below).
  const partnersEl = PARTNER_CARD_TYPES.includes(area.area_type) ? <PartnersHereCard area={area} C={C} uid={uid} myListings={myListings} onListMe={onListMe} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={onViewProfile} PartnerRow={PartnerRow} notify={notify} onStartCrew={onStartCrew} onCrewsHere={onCrewsHere} onGroupsHere={onGroupsHere} openCrewCountAt={openCrewCountAt} /> : null;
  // PHONE: the area/route search sits DIRECTLY UNDER "Climbs here by type" (owner, 2026-11-18), the first
  // thing in the sheet after the grade spread, and pins near the top as you scroll (usePinnedBar, released at
  // listEndRef at the foot of the page). The website keeps it under the Route finder · Objectives · Map row.
  // It is drawn from the FIRST paint wherever the page already knows there are areas below (aboveLeaf: a state,
  // region or range), so it does not appear late and push every card under it down once the list arrives
  // (2026-11-18). A crag or peak still waits for its list: it may be a leaf, which has no search.
  const searchEl = aboveLeaf && (!error || (children && children.length > 0)) ? <DbSearchSplit scope={area} onJumpToArea={onJumpToArea} onOpenRoute={onOpenRoute} C={C} endRef={listEndRef} /> : null;
  const phoneSearch = !wide && !!searchEl;
  // A CRAG, PEAK OR WALL (and any area with climbs and nothing under it) reads list first: under the Route finder row
  // comes its climbs, or -- when it has walls or boulders under it -- its search and that list. Decided by the area's
  // TYPE, which is known on the first paint, not by whether it has children, which is not: deciding by children
  // drew a crag like Jackson Falls climb-first while it loaded and then reordered it (2026-11-18).
  const listUp = formation || isLeaf;
  /* SUGGESTED CLIMBS sits directly UNDER CLASSIC CLIMBS (owner, 2026-11-19: "Move suggested climbs dropdown box under
     classic climbs"), in both page orders, and in that slot on a page that draws no classics. It was in the page's
     tail, under the photos, Getting there, Partners and the "Add it" prompts. Its own box, not a section(): it is a
     dropdown that draws nothing at all when it has nothing to suggest, and a section would leave an empty card. */
  const suggestedEl = <DbSuggestedClimbs area={area} onOpen={onOpenRoute} C={C} />;
  const section = (el: ReactNode) => <div style={areaSheet(C)}><div style={{ marginTop: -1 }}>{el}</div></div>;
  // AREA FACTS sits directly under the description (owner, 2026-11-18: "area facts should go under description"),
  // in both page orders. It was below the photos and Getting there.
  const factsEl = formation ? <AreaFactsCard area={area} C={C} uElev={uElev} onEdit={editOn} loggedMonths={wide && logged.data ? logged.data : null} /> : null;
  // THE CLIMBS LIST: the loading and error lines, the summit briefing and (on a crag or wall) the rows with their
  // Filters and sorts. On a crag or wall it is a card right under the Route finder row (listUp, below).
  const listBlock = (<>
      {/* Sits directly above the route rows it summarises. It renders nothing unless the routes support it. */}
      {!loading && routes && routes.length ? <SummitBriefing area={area} routes={routes} uElev={uElev} uDistMi={uDistMi} C={C} /> : null}
      {loading && <LoadingRows C={C} label="Loading…"/>}
      {/* Data outranks error: a failed REFETCH leaves the previous children/routes intact. Red stays for
          "there is nothing here"; a surviving list gets a muted staleness note instead. */}
      {error && !((children && children.length) || (routes && routes.length)) ? <div style={{ color: C.red, fontSize: 12.5, lineHeight: 1.5 }}>Couldn't load this area — check your connection and try again.</div> : null}
      {error && ((children && children.length) || (routes && routes.length)) ? <div style={{ color: C.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>Couldn't refresh just now — showing what loaded last.</div> : null}

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
                const opts = placed ? AREA_LIST_SORTS : AREA_LIST_SORTS.filter(o => o[0] !== "lr" && o[0] !== "rl");
                const key = opts.some(o => o[0] === listSort) ? listSort : opts[0][0];
                const discsHere = [...new Set(routes.map(r => r.discipline).filter(Boolean))] as string[];
                const metric = isFinderMetric(uElevUnit);
                const passes = (f: RouteFinderPanelFilters) => { const t = finderRowFilter(finderArgs("", f, metric)); return routes.filter(r => t(r)); };
                const shownAll = finderFilterCount(wf) ? passes(wf) : routes;
                const unplaced = (key === "lr" || key === "rl") ? shownAll.filter(r => r.sort_order == null && r.discipline !== "bouldering").length : 0;
                const filtersOn = finderFilterCount(wf);
                const wallChips = finderChips(wf, setWf, uElevN, uElevUnit);
                const draftN = wd ? passes(dropUnfit(wd)).length : 0;
                const noun = (n: number) => (discsHere.length === 1 && discsHere[0] === "bouldering" ? " problem" : " climb") + (n !== 1 ? "s" : "");
                return <>
                  {routes.length > 1 ? <div style={{ marginBottom: 8 }}>
                    {/* Drawn as the Route finder draws its own Filters button (BTN_LG, the text colour, a
                        turning chevron), not as one more chip: as a chip in the muted colour it was the same
                        size and shade as the sort chips under it, and the owner could not find it (2026-11-05). */}
                    <button onClick={() => setWd(wf)} aria-haspopup="dialog" style={{ ...BTN_LG, width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid " + (filtersOn ? C.blue : C.border), background: filtersOn ? C.blueBg : C.surface, color: filtersOn ? C.onSolid : C.text }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 6h16M7 12h10M10 18h4" /></svg>{"Filters" + (filtersOn ? " (" + filtersOn + ")" : "")}</button>
                    {wallChips.length ? <div style={{ marginTop: 8 }}><FinderChipLine chips={wallChips} onClearAll={() => setWf(FINDER_DEF)} C={C} /></div> : null}
                    {filtersOn ? <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45 }}>{shownAll.length + " of " + routes.length + noun(routes.length) + " match" + (wf.minStars ? ". Climbs nobody has rated yet stay in." : ".")}</div> : null}
                    {wd ? <FinderFilterSheet title={"Filter " + (area.name || "climbs")} df={wd} setDf={fn => setWd(d => d && fn(d))} onClose={() => setWd(null)} onApply={() => { setWf(dropUnfit(wd)); setWd(null); }} showLabel={"Show " + draftN + noun(draftN)} discOptions={discsHere} onePlace uElevN={uElevN} uElevUnit={uElevUnit} C={C} /> : null}
                  </div> : null}
                  {routes.length > 1 ? <div role="group" aria-label="Sort climbs" className="cm-hscroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 8 }}>{opts.map(o => <button key={o[0]} onClick={() => setListSort(o[0])} aria-pressed={key === o[0]} style={{ ...CHIP, flexShrink: 0, border: "1px solid " + (key === o[0] ? C.blue : C.border), background: key === o[0] ? C.blueBg : C.surface, color: key === o[0] ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{o[1]}</button>)}</div> : null}
                  {unplaced ? <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.45 }}>{unplaced + (unplaced !== 1 ? " climbs have" : " climb has") + " no position on the wall yet, so " + (unplaced !== 1 ? "they are" : "it is") + " listed last, by name."}</div> : null}
                  {/* ORDER WRONG? (owner, 2026-11-19): offered beside the wall orders it corrects, and on a wall with no
                      order stored, where it asks for one. Never on a peak (its routes are not a line along a wall), and
                      a boulder problem is never part of it. The sheet holds every roped climb, whatever the filters hide: the placed ones in line, the rest waiting to be placed. */}
                  {area.area_type !== "peak" && (!placed || key === "lr" || key === "rl") && routes.filter(r => r.discipline !== "bouldering").length > 1 ? <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <button onClick={() => setOrderOpen(true)} style={{ ...BTN, border: "none", background: "transparent", color: C.blue, padding: "2px 0", fontSize: 12, fontWeight: 600 }}>{placed ? "Suggest a different order" : "Add the wall order"}</button>
                  </div> : null}
                  {shownAll.length ? (() => {
                    // By discipline: one heading per run of the same discipline, rows under it in name order.
                    const out: ReactNode[] = []; let last: string | undefined | null = null;
                    sortAreaRoutes(shownAll, key).forEach(r => {
                      if (key === "disc" && r.discipline !== last) out.push(<SL key={"h-" + r.discipline} C={C}>{discLabel(r.discipline)}</SL>);
                      last = r.discipline;
                      // SAVE FROM THE WALL'S LIST (owner note, 2026-11-25: "Add another save to objectives"): one tap puts the
                      // climb on My Objectives, or takes it off, without opening it. The route finder's rows already had a star;
                      // the wall's own list, where a crag is browsed, did not. Same toggle as the route page's header Save.
                      const onList = (wishlist || []).includes(r.id as string | number);
                      out.push(onToggleWish && r.id != null ? <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                        <RouteRow r={r} onOpen={onOpenRoute} C={C} savedMark={false} />
                        <button onClick={() => onToggleWish(r.id as string | number)} aria-pressed={onList} aria-label={onList ? "Remove " + (r.name || "this climb") + " from My Objectives" : "Save " + (r.name || "this climb") + " to My Objectives"} title={onList ? "On My Objectives, tap to remove" : "Save to My Objectives"} style={{ ...CHIP, flexShrink: 0, width: 44, minHeight: 44, marginBottom: 8, padding: 0, fontSize: 17, cursor: "pointer", border: "1px solid " + (onList ? C.amber : C.border), background: onList ? C.amberBg : C.card, color: onList ? C.amber : C.textSub }}><span aria-hidden="true">{onList ? "★" : "☆"}</span></button>
                      </div> : <RouteRow key={r.id} r={r} onOpen={onOpenRoute} C={C} />);
                    });
                    return out;
                  })() : <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{"No climb on this wall matches these filters. "}<button onClick={() => setWf(FINDER_DEF)} style={{ ...BTN, border: "none", background: "transparent", color: C.blue, padding: 0, fontWeight: 700, textDecoration: "underline" }}>Clear filters</button></div>}
                </>;
              })()}
            </>
          /* Only claim the crag is empty when the load actually succeeded — otherwise a
             failed refetch reports "no routes" about a crag it never managed to read. */
          : !error ? <EmptyState C={C} icon="mountain" action={onAddClimb ? <button onClick={() => onAddClimb(area)} style={{ ...HEAD_BTN, background: C.blueBg, border: "1px solid " + C.blue, color: C.text }}>Add a climb</button> : null}>{onAddClimb ? "No climbs here yet. Know one? Add it so the next climber finds it." : "No climbs here yet."}</EmptyState> : null
      )}
  </>);
  const main = (
    <div style={{ minWidth: 0 }}>
      {/* The area's box IS the Climbs tab's header once you are in an area: App's generic "Climbs"
          box is drawn only on the picker (rootHeader), so Florida heads Florida. */}
      {/* ONE HEADER CARD (owner, 2026-11-18: "combine this ... so that the name of the area is the top section"): the
          name, the path above the area (it was a separate bar over this box, ending on the same name), the
          pills, ONE facts line, and a foot row -- the browser's Back (the phone's top bar takes it over, lib/pageBack.js)
          on the left, Save area, Area tree and Fire map on the right. SAVE lives in the foot row, left of Area tree
          (owner, 2026-11-25: "move save area to the left of area tree. That would give us more space for the area
          name"): the title row is the name alone, full width, so a long name wraps less. */}
      <ScreenHero C={C} title={area.name}>
        {headerNav ? <div style={{ marginTop: 6 }}>{headerNav.path}</div> : null}
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Pill label={ATYPE[area.area_type] || "Area"} color={C.blue} bg={C.blueBg} sm />
          {inSeason != null ? <Pill label={inSeason ? "In season" : "Off season"} color={inSeason ? C.green : C.textMuted} bg={inSeason ? C.greenBg : "rgba(255,255,255,0.06)"} sm /> : null}
          {chips.map((t, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: C.text, background: "rgba(255,255,255,0.12)", border: "1px solid " + C.border, borderRadius: 7, padding: "3px 9px" }}>{t}</span>)}
        </div>
        <div style={{ fontSize: 13, color: C.textSub, marginTop: 9, lineHeight: 1.45 }}>
          {/* A jump from the Route finder's wall heading hands over { id, name } and hydrates the full row first; when
              that read FAILS the narrow row arrives with no route_count, and this line threw ("This section hit a bug",
              2026-11-26). An unknown count is left out, never printed as 0. */}
          <span style={{ color: C.text, fontWeight: 800 }}>{[children && children.length ? children.length + " " + noun : "", typeof area.route_count === "number" ? area.route_count.toLocaleString() + " climb" + (area.route_count !== 1 ? "s" : "") : ""].filter(Boolean).join(" · ")}</span>
          {metaParts.length ? " · " + metaParts.join(" · ") : null}
        </div>
        {parentPeak ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{"Parent peak — " + parentPeak}</div> : null}
        {area.coords_approx ? <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4, lineHeight: 1.45 }}>Coordinates are approximate — the map pin, any distance shown, and the Directions link are rough.</div> : null}
        {/* The Fire map entry, on the area it opens focused on. Not drawn on a country or state page (owner,
            2026-10-24): far too broad a place to ask "is anything burning near here?". */}
        {(() => {
          const fire = onFireMap && area.area_type !== "country" && area.area_type !== "state" ? (
            <button onClick={() => onFireMap(area)} aria-label={"Fire map — active wildfires and red-flag warnings near " + area.name} style={{ ...HEAD_BTN, background: C.redBg, border: "1px solid " + C.red + "66", color: C.red }}>
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.7 1.2 2.7 2.5 3 0-3.5-1-6.5 0-9z" /></svg>
              {"Fire map"}
            </button>
          ) : null;
          // AREA TREE is a labelled button (owner, 2026-11-14: the tree was "difficult to find ... make that more clear that is a button").
          const tree = headerNav ? (
            <button onClick={onAllAreas} aria-haspopup="dialog" style={{ ...HEAD_BTN, background: "rgba(255,255,255,0.08)", border: "1px solid " + C.blue, color: C.text }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="5" rx="1" /><rect x="15" y="10" width="6" height="5" rx="1" /><rect x="15" y="17" width="6" height="5" rx="1" /><path d="M6 8v11h9M6 12.5h9" /></svg>
              {"Area tree"}
            </button>
          ) : null;
          // SAVE STANDS OUT (owner note, 2026-11-25: "Save area blends in too well"): it was the grey of the card with a
          // grey rim, the one button of the row with no colour and no icon. Unsaved it is now the amber of Saved, as an
          // outline with a bookmark; saved, the solid amber it always was.
          const save = area.area_type !== "country" && area.area_type !== "state" ? (
            <button onClick={onToggleSave} aria-label={booked ? "Remove from Saved" : area.area_type === "peak" ? "Save this peak" : "Save this area"} style={{ ...HEAD_BTN, background: booked ? C.amber : C.amberBg, border: (booked ? "1px solid " : "1.5px solid ") + C.amber, color: booked ? "#1a1200" : C.text }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={booked ? "currentColor" : "none"} stroke={booked ? "currentColor" : C.amber} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
              {booked ? "Saved" : area.area_type === "peak" ? "Save peak" : "Save area"}
            </button>
          ) : null;
          // ONE LOG BUTTON (owner note, 2026-11-25: "have log button there too. Make it just 1 log button and when they
          // click that they can choose full log or quick log"): it asks which, then opens the climb picker AT this area.
          const log = onLog && area.route_count > 0 ? (
            <button onClick={() => setLogChoice(true)} aria-haspopup="dialog" aria-label={"Log a climb at " + area.name} style={{ ...HEAD_BTN, background: C.greenBg, border: "1px solid " + C.greenDim, color: C.text }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              {"Log"}
            </button>
          ) : null;
          if (!fire && !tree && !save && !log && !headerNav) return null;
          // Three 100px buttons (and the website's Back) outgrow a small phone's card, so the row WRAPS, right-aligned,
          // rather than running off the edge.
          return (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.border }}>
              {headerNav ? headerNav.back : null}
              <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, minWidth: 0 }}>{save}{log}{tree}{fire}</div>
              {logChoice && onLog ? <CommentMenu label={"Log a climb at " + area.name} items={[["Quick log: tick, date and stars", () => onLog(area, "quick")], ["Full log: partners, notes and a report", () => onLog(area, "full")]]} onClose={() => setLogChoice(false)} /> : null}
            </div>
          );
        })()}
      </ScreenHero>

      {formation && areaEdits.data && areaEdits.data.length ? <PendingAreaEdits rows={areaEdits.data} C={C} myId={myId} /> : null}

      {/* EVERY SECTION ITS OWN CARD, with space between (owner, 2026-11-18: "every section needs to be it's own
          with spacing"): the grade spread, the search, the description, the Route finder row, the sub-areas, the
          classics, the photos and Getting there were one bordered sheet split by hairlines. Each is drawn by
          section(), which clips the 1px top rule a section draws to divide itself inside a shared sheet. */}
      {/* A CRAG, PEAK OR WALL reads climb first (owner, 2026-11-18: "the list of actual climbs is too far down"): the
          Route finder · Objectives · Map row, the climbs (or its search and walls), the description, Climbs here by
          type, the classics. The chart is
          left off under 3 climbs and the classics at 5 or fewer: there both only repeat the list right above them. */}
      {listUp ? <>
        {section(<AreaActionRow C={C} first routeCount={area.route_count} onFinder={() => onFinder()} inlineDiscs={wide && chartable ? inlineDiscs : []} myGrades={myGrades} onFindInline={fl => onFinder(fl)} objectivesHere={objectivesHere} onObjectives={onObjectives} onNear={onNear} />)}
        {childRows ? <>
          {searchEl ? section(<div style={{ padding: "12px 14px 4px" }}>{searchEl}</div>) : null}
          {!leftEl ? section(<div style={{ padding: "12px 14px 4px" }}>{childList("section")}</div>) : null}
          {listBlock}
        </> : section(<div style={{ padding: "4px 14px 12px" }}>{listBlock}</div>)}
        {showAbout ? section(<AboutCard area={area} C={C} onEdit={editOn} flat first />) : null}
        {factsEl}
        {chartable && !(isLeaf && routes && routes.length < 3) ? section(<GradeSpreadDisclosure first stats={stats.data} loading={stats.isLoading} error={stats.error} C={C} discOptions={discOptions} onDisc={onFinder} onGrade={onGrade} />) : null}
        {classicsEl && !(isLeaf && routes && routes.length <= 5) ? section(classicsEl) : null}
        {suggestedEl}
      </> : <>
        {chartable ? section(<GradeSpreadDisclosure first stats={stats.data} loading={stats.isLoading} error={stats.error} C={C} discOptions={discOptions} onDisc={onFinder} onGrade={onGrade} />) : null}
        {phoneSearch ? section(<div style={{ padding: "12px 14px 4px" }}>{searchEl}</div>) : null}
        {showAbout ? section(<AboutCard area={area} C={C} onEdit={editOn} flat first />) : null}
        {factsEl}
        {section(<AreaActionRow C={C} first routeCount={area.route_count} onFinder={() => onFinder()} inlineDiscs={wide && chartable ? inlineDiscs : []} myGrades={myGrades} onFindInline={fl => onFinder(fl)} objectivesHere={objectivesHere} onObjectives={onObjectives} onNear={onNear} />)}
        {/* DESKTOP: the area/route search sits directly under the Route finder · Objectives · Map row (owner,
            2026-11-14), not below the facts and Partners cards. The phone draws it under the grade spread above. */}
        {wide && searchEl ? section(<div style={{ padding: "12px 14px 4px" }}>{searchEl}</div>) : null}
        {!leftEl && childRows ? section(<div style={{ padding: "12px 14px 4px" }}>{childList("section")}</div>) : null}
        {classicsEl ? section(classicsEl) : null}
        {suggestedEl}
      </>}
      {/* PHOTOS only on a specific place (0541): the strip asks the database and draws its card through `section`
          only when this area takes photos, so a general area (North Cascades, a state) shows no empty card. */}
      {area.area_type !== "world" && area.area_type !== "country" ? <AreaPhotoStrip area={{ id: String(area.id), name: area.name }} C={C} signedIn={!!(myId || uid)} onSignIn={onSignIn} onOpenRoute={r => onOpenRoute(r as unknown as RouteRowRoute)} wrap={section} /> : null}
      {/* GETTING THERE -- the one drive control on the area page: the words first, then the map. ONLY where a
          destination is actionable: "Directions to Colorado" routes you to a state centroid. A crag, peak or
          wall has somewhere you can actually park (check:area-surfaces reads this gate). */}
      {["crag", "peak", "wall"].includes(area.area_type) ? section(<AreaGettingThere area={area} C={C} onEdit={editOn} flat trailRoute={(routes || []).find(r => String(r.area_id) === String(area.id)) || null} />) : null}

      {wide ? null : partnersEl}

      {listUp ? null : listBlock}

      {/* "Don't see a climb? Add it" stays at the FOOT of the page (owner, 2026-11-18), though a crag's climbs list
          now sits near the top; an empty crag's list card carries its own "Add a climb". It used to sit directly
          under the list (2026-10-15, 2026-10-23). It is NOT gated on the list rendering — an empty crag is exactly where a missing route is likeliest. */}
      <div ref={listEndRef} />
      {/* DESKTOP: ONE ROW, NOT A STACK (owner 2026-11-05). On a monitor the three prompts sat one under another
          as label-wide buttons down the left of the column; side by side, each is its question with its button
          under it. The phone keeps the stack: a 360px screen has no room for three. */}
      {/* DESKTOP: Partners here / Crews here sits directly above "Don't see a climb or area here?" (owner, 2026-11-14). */}
      {wide && partnersEl ? <div style={{ marginTop: 10 }}>{partnersEl}</div> : null}
      {wide ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: "12px 14px", marginTop: 10, marginBottom: 16 }}>
        <AddHereFooter area={area} onAddClimb={onAddClimb} onAddArea={onAddArea} cell C={C} />
        {editOn ? <div style={cellBox}>
          <div style={cellQ}>{"Know " + area.name + "?"}</div>
          <button onClick={() => editOn(null)} aria-label={"Suggest an edit to " + area.name} style={{ ...cellBtn, border: "1px dashed " + C.border, color: C.blue }}>{"Suggest an edit"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span></button>
        </div> : null}
        {!fixedPlace ? <div style={cellBox}>
          <div style={cellQ}>{"Wrong place?"}</div>
          <button onClick={() => setWrongOpen(true)} aria-label={"Tell us where " + area.name + " belongs"} style={{ ...cellBtn, border: "1px solid " + C.border, color: C.textSub }}>{"Tell us where"}</button>
        </div> : null}
      </div> : <>
        <AddHereFooter area={area} onAddClimb={onAddClimb} onAddArea={onAddArea} C={C} />

        {editOn ? (
          <button onClick={() => editOn(null)} style={{ ...BTN_LG, width: "100%", border: "1px dashed " + C.border, background: C.surface, color: C.blue, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {"Know " + area.name + "? Suggest an edit"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span>
          </button>
        ) : null}

        {/* WRONG PLACE (0372): a claim only. The page does not change; the owner moves the area and resolves it.
            Not on a state/province, country or the world (owner, 2026-11-11): their place is fixed by the map,
            so "Tell us where Alabama belongs" made no sense. Nor on a state's top-level region or range
            (owner, 2026-11-19; see fixedPlace). */}
        {!fixedPlace ? <button onClick={() => setWrongOpen(true)} style={{ ...BTN_LG, width: "100%", border: "1px solid " + C.border, background: C.surface, color: C.textSub, marginBottom: 14 }}>
          {"Wrong place? Tell us where " + area.name + " belongs"}
        </button> : null}
      </>}
      {orderOpen && routes ? <WallOrderSuggest area={area} routes={sortAreaRoutes(routes.filter(r => r.discipline !== "bouldering" && r.sort_order != null), "lr")} unplaced={sortAreaRoutes(routes.filter(r => r.discipline !== "bouldering" && r.sort_order == null), "az")} C={C} onClose={() => setOrderOpen(false)} onSubmit={(order, note) => submitWallOrderSuggestion(area.id, order, note)} onSignIn={onSignIn} /> : null}
      {wrongOpen ? <AreaWrongSpot area={area} C={C} onClose={() => setWrongOpen(false)} onSubmit={(note: string, place: string) => submitAreaPlacementClaim(area.id, note, place)} onSignIn={onSignIn} /> : null}

      {/* Tail order is the owner's (2026-10-15): nearby peaks, then Top contributors LAST (Suggested climbs sat
          here until 2026-11-19; it is under Classic climbs now, suggestedEl) —
          App mounts the area Discussion directly after this component, so Discussion ends the page. */}
      <AreaLatestReports area={area} onOpenRoute={onOpenRoute} onOpenReport={onOpenReport} C={C} />

      <NearbyPeaks area={area} onJumpToArea={onJumpToArea} C={C} uDistMi={uDistMi} />

      {/* 14px above, the same gap Suggested climbs keeps above itself: with no Nearby peaks (a crag) the board
          sat flush under the Suggested climbs box (owner, 2026-11-11). Block margins collapse, so with
          Nearby peaks shown the gap is 14, not 14 + its own 10. Below it, 20: the Discussion App mounts next opens
          with a divider line (marginTop 10, collapsing with this), and at 8 that line sat ~11px under the box and read
          as part of it (owner, 2026-11-18: "needs spacing"). */}
      {TopContributors ? <div style={{ marginTop: 14 }}><TopContributors areaId={area.id} mb={20} onViewProfile={onViewContributor}/></div> : null}
    </div>
  );
  // The website: the map and the sub-areas in the left panel beside the page (owner chose "Sidebar on web, early on
  // phone"; in the left panel since 2026-11-11), and the page column all the page's own.
  if (leftEl && childRows) return (
    <>
      {createPortal(<aside aria-label={childNoun(children) + " in " + area.name} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px" }}>{childList("sidebar")}</aside>, leftEl)}
      {main}
    </>
  );
  return main;
}
