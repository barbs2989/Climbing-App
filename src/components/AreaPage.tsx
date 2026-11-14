import { DISCIPLINES, ATYPE } from "../../lib/areaBrowserShared.js";
import { useState, useRef, useContext, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useArea, useAreaClimbStats, useAreaContributions, useAreaChildren, useAreaChildrenGradeCounts, useAreaRoutes, useAreaClassics, useAreaLoggedMonths, useAreaNamesByIds, useScopedWishlistRoutes, submitAreaPlacementClaim } from "../../lib/db";
import type { WallGradeRow } from "./WallGradeBars.tsx";
import AreaActionRow from "./AreaActionRow.tsx";
import AreaChildrenList from "./AreaChildrenList.tsx";
import AreaPhotoStrip from "./AreaPhotoStrip.tsx";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { ScreenHero } from "../../lib/ScreenHero";
import { Pill, SL } from "../../lib/areaBrowserParts.jsx";
import { PendingAreaEdits, AboutCard, AreaFactsCard, GradeSpreadDisclosure, gradeFinderFilters, areaSheet } from "../../lib/AreaPageSections";
import { useWideScreen, useFullWidth } from "../../lib/wideLayout.js";
import { ClimberCtx } from "../../lib/climberCtx.js";
import ClassicsList from "./ClassicsList.tsx";
import { BTN_LG, CHIP, BTN } from "../../lib/buttonStyles.js";
import Chevron from "./Chevron.tsx";
import AreaGettingThere from "./AreaGettingThere.tsx";
import PartnersHereCard from "./PartnersHereCard.tsx";
import DbSearchSplit from "./DbSearchSplit.tsx";
import SummitBriefing from "./SummitBriefing.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { discLabel } from "../../lib/areaDiscLabel.js";
import { gradeNumFor, gradeSystemForDiscipline } from "../../lib/grade.js";
import RouteRow from "./RouteRow.tsx";
import AddHereFooter from "./AddHereFooter.tsx";
import AreaWrongSpot from "../../lib/AreaWrongSpot";
import DbSuggestedClimbs from "./DbSuggestedClimbs.tsx";
import AreaLatestReports from "./AreaLatestReports.tsx";
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
  const [wrongOpen, setWrongOpen] = useState(false);
  const listEndRef = useRef(null);
  const [listSort, setListSort] = useState("lr");
  // Filters on a WALL's own climb list (owner note, 2026-10-25): discipline and a star minimum,
  // applied to the rows already loaded — no query. Unrated climbs stay in, as the finder keeps them.
  const [wallFilterOpen, setWallFilterOpen] = useState(false);
  const [wallDisc, setWallDisc] = useState("");
  const [wallStars, setWallStars] = useState(0);
  // Single pitch / multi-pitch: the seed wall list's Multipitch filter. Read off the stored pitch count.
  const [wallPitch, setWallPitch] = useState("");
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
  const { profile } = useContext(ClimberCtx);
  const prof = (profile || null) as { sportGrade?: string | null; tradGrade?: string | null; boulderGrade?: string | null } | null;
  const myGrades = prof ? { sport: prof.sportGrade || null, trad: prof.tradGrade || null, boulder: prof.boulderGrade || null } : null;
  const discOptions = DISCIPLINES.map(d => d[0]).filter(Boolean);
  const inlineDiscs: string[] = stats.data && Array.isArray(stats.data.by_disc) ? stats.data.by_disc.filter((d: { disc: string; n: number }) => d && Number(d.n) > 0 && discOptions.includes(d.disc)).map((d: { disc: string }) => d.disc) : [];
  // The mini grade chart on each child's card (item 13, 2026-11-04) is a website thing: one call for
  // the whole list, only where there is a list to draw it on. The phone card is unchanged.
  // The desktop "add / edit / wrong place" row's cells (see the row under the climb list).
  // A state, country or the world has its place fixed by the map: no "Wrong place?" (owner, 2026-11-11).
  const fixedPlace = ["world", "country", "state"].includes(area.area_type);
  const cellBox: CSSProperties = { flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" };
  const cellQ: CSSProperties = { fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8, overflowWrap: "anywhere" };
  const cellBtn: CSSProperties = { ...BTN_LG, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  const kidGrades: AreaPageQuery<Record<string, WallGradeRow[]>> = useAreaChildrenGradeCounts(wide && !full && chartable && isLeaf === false ? area.id : null); // not in the left panel (owner, 2026-11-13: "remove the grade spread from the left panel"), so not read there
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
  const onGrade = (sys: string, b: number) => { const fl = gradeFinderFilters(sys, b, stats.data); if (fl) onFinder(fl); else onFinder(); };

  // THE PAGE, top to bottom (owner, 2026-11-11, area page redesign): the header; then ONE bordered sheet -- grade
  // spread (Climbs here by type behind a dropdown), the description, the Route finder · objectives · Map row, the
  // sub-areas (phone), the classic climbs, the photo strip, Getting there -- and under the sheet everything else
  // in its old order. On the website the sub-areas are a column to the left of all of it, as Mountain Project
  // lays out its area pages, so you never scroll past the page to reach the areas below.
  const showAbout = formation || !!(area.blurb && String(area.blurb).trim());
  const childRows = !loading && children && children.length > 0 ? children : null;
  const mapPin = area.lat != null && area.lng != null && isFinite(Number(area.lat)) && isFinite(Number(area.lng)) ? { lat: Number(area.lat), lng: Number(area.lng), zoom: MAP_ZOOM[area.area_type] || 10, name: area.name } : null;
  const childList = (variant: "sidebar" | "section") => childRows ? <AreaChildrenList rows={childRows} noun={childNoun(children)} onDrill={onDrill} C={C} grades={wide && variant === "section" ? kidGrades.data || null : null} objectives={objByChild} variant={variant} onAllAreas={onAllAreas} map={variant === "sidebar" ? mapPin : null} onNear={onNear} /> : null;
  // CLASSIC CLIMBS HERE. Above a wall: all of them across the subtree (ClassicsList: five, then a dropdown), each
  // row naming the wall it is on; a failed read says so; an area with no classics shows nothing rather than "none".
  // A wall: areaClassics over its own rows; with none, TOP RATED HERE -- the rows that carry a climber star rating
  // (routes.stars, kept by 0294), best first. An area with neither shows nothing rather than "no ratings yet".
  const classicsEl = isLeaf === false && chartable
    ? (classicsUp.error ? <div role="status" style={{ fontSize: 12, color: C.textMuted, padding: "10px 14px", borderTop: "1px solid " + C.border }}>Couldn't load the classic climbs here.</div>
      : classicsUp.data && classicsUp.data.length ? <ClassicsList rows={classicsUp.data} total={classicsUp.data[0].total} withWall dense={wide} onOpen={onOpenRoute} C={C} /> : null)
    : !loading && isLeaf && routes && routes.length > 1 ? (() => { const cl = areaClassics(routes); if (cl.length) return <ClassicsList rows={cl} dense={wide} onOpen={onOpenRoute} C={C} />; const top = routes.filter(r => r.stars > 0).sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name)).slice(0, 5); return top.length ? <ClassicsList rows={top} title="Top rated here" dense={wide} onOpen={onOpenRoute} C={C} /> : null; })() : null;
  const metaParts = [area.region && area.region !== area.name ? area.region : null, area.elevation_ft ? (uElev ? uElev(area.elevation_ft) : area.elevation_ft.toLocaleString() + " ft") : null, area.prominence_ft ? ((uElev ? uElev(area.prominence_ft) : area.prominence_ft.toLocaleString() + " ft") + " prom") : null, area.rock ? String(area.rock).replace(/^./, (x: string) => x.toUpperCase()) : null, area.approach_min != null && Number(area.approach_min) > 0 ? Number(area.approach_min) + " min walk" : null].filter(Boolean);

  const main = (
    <div style={{ minWidth: 0 }}>
      {/* The area's box IS the Climbs tab's header once you are in an area: App's generic "Climbs"
          box is drawn only on the picker (rootHeader), so Florida heads Florida. */}
      <ScreenHero C={C} title={area.name} right={area.area_type !== "country" && area.area_type !== "state" ? (
          <button onClick={onToggleSave} aria-label={booked ? "Remove from Saved" : area.area_type === "peak" ? "Save this peak" : "Save this area"} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, height: 34, padding: "0 12px", background: booked ? C.amber : "rgba(255,255,255,0.08)", border: "1px solid " + (booked ? C.amber : C.border), borderRadius: 9, fontSize: 12, fontWeight: 800, color: booked ? "#1a1200" : C.text, cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap" }}>{booked ? "Saved" : area.area_type === "peak" ? "Save peak" : "Save area"}</button>
        ) : null}>
        {/* Two columns: the facts on the left and the Fire map button on the right. The facts are ONE line now --
            region, elevation, rock, walk-in (the area facts a visit needs first) -- with the in-season pill. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginTop: 6, marginBottom: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Pill label={ATYPE[area.area_type] || "Area"} color={C.blue} bg={C.blueBg} sm />
              {inSeason != null ? <Pill label={inSeason ? "In season" : "Off season"} color={inSeason ? C.green : C.textMuted} bg={inSeason ? C.greenBg : "rgba(255,255,255,0.06)"} sm /> : null}
            </div>
            {metaParts.length ? <div style={{ fontSize: 12, color: C.textSub }}>{metaParts.join(" · ")}</div> : null}
            {parentPeak ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{"Parent peak — " + parentPeak}</div> : null}
            {area.coords_approx ? <div style={{ fontSize: 11.5, color: C.amber, marginTop: 4, lineHeight: 1.45 }}>Coordinates are approximate — the map pin, any distance shown, and the Directions link are rough.</div> : null}
            {chips.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>{chips.map((t, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: C.text, background: "rgba(255,255,255,0.12)", border: "1px solid " + C.border, borderRadius: 7, padding: "3px 9px" }}>{t}</span>)}</div> : null}
            <div style={{ fontSize: 13, color: C.blue, marginTop: 7 }}>{children && children.length ? children.length + " " + noun + " · " + area.route_count.toLocaleString() + " climb" + (area.route_count !== 1 ? "s" : "") : area.route_count.toLocaleString() + " climb" + (area.route_count !== 1 ? "s" : "")}</div>
          </div>
          {/* The Fire map entry, on the area it opens focused on. Not drawn on a country or state page (owner,
              2026-10-24): far too broad a place to ask "is anything burning near here?". Sized like the Save area
              button above it (34px tall, 12px text; owner, 2026-11-14) — it was a 44px button that outweighed the page. */}
          {onFireMap && area.area_type !== "country" && area.area_type !== "state" ? (
            <button onClick={() => onFireMap(area)} aria-label={"Fire map — active wildfires and red-flag warnings near " + area.name} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, height: 34, background: C.redBg, border: "1px solid " + C.red + "66", color: C.red, borderRadius: 9, padding: "0 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.7 1.2 2.7 2.5 3 0-3.5-1-6.5 0-9z" /></svg>
              {"Fire map"}
            </button>
          ) : null}
        </div>
      </ScreenHero>

      {formation && areaEdits.data && areaEdits.data.length ? <PendingAreaEdits rows={areaEdits.data} C={C} myId={myId} /> : null}

      <div style={areaSheet(C)}>
        {chartable ? <GradeSpreadDisclosure first stats={stats.data} loading={stats.isLoading} error={stats.error} C={C} discOptions={discOptions} onDisc={onFinder} onGrade={onGrade} /> : null}
        {showAbout ? <AboutCard area={area} C={C} onEdit={editOn} flat first={!chartable} /> : null}
        <AreaActionRow C={C} first={!chartable && !showAbout} routeCount={area.route_count} onFinder={() => onFinder()} inlineDiscs={wide && chartable ? inlineDiscs : []} myGrades={myGrades} onFindInline={fl => onFinder(fl)} objectivesHere={objectivesHere} onObjectives={onObjectives} onNear={onNear} />
        {!leftEl && childRows ? <div style={{ padding: "12px 14px 4px", borderTop: "1px solid " + C.border }}>{childList("section")}</div> : null}
        {classicsEl}
        {area.area_type !== "world" && area.area_type !== "country" ? <AreaPhotoStrip area={{ id: String(area.id), name: area.name }} C={C} signedIn={!!(myId || uid)} onSignIn={onSignIn} onOpenRoute={r => onOpenRoute(r as unknown as RouteRowRoute)} /> : null}
        {/* GETTING THERE -- the one drive control on the area page: the words first, then the map. ONLY where a
            destination is actionable: "Directions to Colorado" routes you to a state centroid. A crag, peak or
            wall has somewhere you can actually park (check:area-surfaces reads this gate). */}
        {["crag", "peak", "wall"].includes(area.area_type) ? <AreaGettingThere area={area} C={C} onEdit={editOn} flat /> : null}
      </div>

      {formation ? <AreaFactsCard area={area} C={C} uElev={uElev} onEdit={editOn} loggedMonths={wide && logged.data ? logged.data : null} /> : null}
      {PARTNER_CARD_TYPES.includes(area.area_type) ? <PartnersHereCard area={area} C={C} uid={uid} myListings={myListings} onListMe={onListMe} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={onViewProfile} PartnerRow={PartnerRow} notify={notify} onStartCrew={onStartCrew} onCrewsHere={onCrewsHere} onGroupsHere={onGroupsHere} openCrewCountAt={openCrewCountAt} /> : null}
      {!loading && (!error || (children && children.length > 0)) && isLeaf === false ? <DbSearchSplit scope={area} onJumpToArea={onJumpToArea} onOpenRoute={onOpenRoute} C={C} endRef={listEndRef} /> : null}

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
                const discsHere = [...new Set(routes.map(r => r.discipline).filter(Boolean))];
                // A climb with no stored pitch count is never guessed into either side of the pitch filter.
                const pitchOk = (r: AreaPageRoute) => !wallPitch || (wallPitch === "multi" ? r.pitches > 1 : r.pitches === 1);
                const roped = routes.filter(r => r.discipline !== "bouldering" && r.discipline !== "scrambling");
                const pitchChoice = roped.some(r => r.pitches > 1) && roped.some(r => r.pitches === 1);
                const shownAll = routes.filter(r => (!wallDisc || r.discipline === wallDisc) && (!wallStars || !(r.stars > 0) || r.stars >= wallStars) && pitchOk(r));
                const unplaced = (key === "lr" || key === "rl") ? shownAll.filter(r => r.sort_order == null && r.discipline !== "bouldering").length : 0;
                const filtersOn = (wallDisc ? 1 : 0) + (wallStars ? 1 : 0) + (wallPitch ? 1 : 0);
                const wallChip = (on: boolean) => ({ ...CHIP, flexShrink: 0, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" });
                return <>
                  {routes.length > 1 ? <div style={{ marginBottom: 8 }}>
                    {/* Drawn as the Route finder draws its own Filters button (BTN_LG, the text colour, a
                        turning chevron), not as one more chip: as a chip in the muted colour it was the same
                        size and shade as the sort chips under it, and the owner could not find it (2026-11-05). */}
                    <button onClick={() => setWallFilterOpen(o => !o)} aria-expanded={wallFilterOpen} style={{ ...BTN_LG, width: "100%", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid " + (filtersOn ? C.blue : C.border), background: filtersOn ? C.blueBg : C.surface, color: filtersOn ? C.onSolid : C.text }}>{"Filters" + (filtersOn ? " (" + filtersOn + ")" : "")}<span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}><Chevron open={wallFilterOpen} size={16} color={"currentColor"} /></span></button>
                    {wallFilterOpen ? <div style={{ marginTop: 8, padding: "10px 11px", background: C.card, borderRadius: 10, border: "1px solid " + C.border }}>
                      <div id="wall-filter-disc" style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>Discipline</div>
                      <div role="group" aria-labelledby="wall-filter-disc" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3, marginBottom: 10 }}>{[["", "All"], ...discsHere.map(d => [d, discLabel(d)])].map(o => <button key={o[0] || "all"} onClick={() => setWallDisc(o[0])} aria-pressed={wallDisc === o[0]} style={wallChip(wallDisc === o[0])}>{o[1]}</button>)}</div>
                      <div id="wall-filter-stars" style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 6 }}>Stars</div>
                      <div role="group" aria-labelledby="wall-filter-stars" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}>{[[0, "Any"] as [number, string], [2, "2+ stars"] as [number, string], [3, "3+ stars"] as [number, string]].map(o => <button key={o[0]} onClick={() => setWallStars(o[0])} aria-pressed={wallStars === o[0]} style={wallChip(wallStars === o[0])}>{o[1]}</button>)}</div>
                      {pitchChoice || wallPitch ? <>
                        <div id="wall-filter-pitch" style={{ fontSize: 11.5, color: C.textMuted, margin: "10px 0 6px" }}>Pitches</div>
                        <div role="group" aria-labelledby="wall-filter-pitch" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 3 }}>{[["", "Any"], ["single", "Single pitch"], ["multi", "Multi-pitch"]].map(o => <button key={o[0] || "any"} onClick={() => setWallPitch(o[0])} aria-pressed={wallPitch === o[0]} style={wallChip(wallPitch === o[0])}>{o[1]}</button>)}</div>
                      </> : null}
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

      {/* "Don't see a climb? Add it" sits DIRECTLY UNDER the areas/climbs list (owner, 2026-10-15 and again
          2026-10-23): a climber who has just read to the end of the list and not found their climb is the one
          who adds it. It is NOT gated on the list rendering — an empty crag is exactly where a missing route is likeliest. */}
      <div ref={listEndRef} />
      {/* DESKTOP: ONE ROW, NOT A STACK (owner 2026-11-05). On a monitor the three prompts sat one under another
          as label-wide buttons down the left of the column; side by side, each is its question with its button
          under it. The phone keeps the stack: a 360px screen has no room for three. */}
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
            so "Tell us where Alabama belongs" made no sense. */}
        {!fixedPlace ? <button onClick={() => setWrongOpen(true)} style={{ ...BTN_LG, width: "100%", border: "1px solid " + C.border, background: C.surface, color: C.textSub, marginBottom: 14 }}>
          {"Wrong place? Tell us where " + area.name + " belongs"}
        </button> : null}
      </>}
      {wrongOpen ? <AreaWrongSpot area={area} C={C} onClose={() => setWrongOpen(false)} onSubmit={(note: string, place: string) => submitAreaPlacementClaim(area.id, note, place)} onSignIn={onSignIn} /> : null}

      {/* Tail order is the owner's (2026-10-15): suggested climbs, then nearby peaks, then Top contributors LAST —
          App mounts the area Discussion directly after this component, so Discussion ends the page. */}
      <AreaLatestReports area={area} onOpenRoute={onOpenRoute} C={C} />
      <DbSuggestedClimbs area={area} onOpen={onOpenRoute} C={C} />

      <NearbyPeaks area={area} onJumpToArea={onJumpToArea} C={C} uDistMi={uDistMi} />

      {/* 14px above, the same gap Suggested climbs keeps above itself: with no Nearby peaks (a crag) the board
          sat flush under the Suggested climbs box (owner, 2026-11-11). Block margins collapse, so with
          Nearby peaks shown the gap is 14, not 14 + its own 10. */}
      {TopContributors ? <div style={{ marginTop: 14 }}><TopContributors areaId={area.id} mb={8}/></div> : null}
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
