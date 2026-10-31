import { C, SUB_LABEL, RSL as SL, ROUTE_GAP, ago, rxOf, rappelReportsOf, uLenN, uLenUnit, isRecent, catOf, wpPlaced, gpxDownload, shortDate, CRAG_CATS } from "../../ClimbMatchCore.jsx";
import type { Dispatch, ReactNode, Ref, SetStateAction } from "react";
import type { CalcInputs, CalculatorProps } from "./Calculator.tsx";
import type { ItineraryViewProps } from "./ItineraryView.tsx";
import type { RouteBreakdownProps } from "./RouteBreakdown.tsx";
import type { BaseCheckinPanelProps } from "./BaseCheckinPanel.tsx";
import type { NeighbourRow } from "./WallNeighbours.tsx";
import type { PairRoute } from "./PairsWellWith.tsx";
import type { RouteGearCheckProps } from "./RouteGearCheck.tsx";
import type { CragLocationCardProps } from "./CragLocationCard.tsx";
import type { CampingPanelProps } from "./CampingPanel.tsx";
import type { TrailheadCardProps } from "./TrailheadCard.tsx";
import type { SummitLegsCardProps } from "./SummitLegsCard.tsx";
import type { CragWalkInProps } from "./CragWalkIn.tsx";
import type { ApproachVariantsProps } from "./ApproachVariants.tsx";
import type { ClimbingRouteTableProps } from "./ClimbingRouteTable.tsx";
import type { BreakdownHandoffProps } from "./BreakdownHandoff.tsx";
import type { DescentLegStripProps } from "./DescentLegStrip.tsx";
import type { RappelTableProps } from "./RappelTable.tsx";
import type { TripProfileCardProps } from "./TripProfileCard.tsx";
import EditIconButton from "./EditIconButton.tsx";
import Capped from "./Capped.tsx";
import { accessCheckedLine } from "../../lib/road";
import { roadReportsOf, ROAD_TONE } from "../../lib/roadReports.js";
import GapNote from "./GapNote.tsx";
import TrailheadCard from "./TrailheadCard.tsx";
import SummitLegsCard from "./SummitLegsCard.tsx";
import { _pmSays } from "../../lib/permitMention.js";
import AccessFold from "./AccessFold.tsx";
import CardHead from "./CardHead.tsx";
import CragWalkIn from "./CragWalkIn.tsx";
import ApproachVariants from "./ApproachVariants.tsx";
import EmptySection from "./EmptySection.tsx";
import ClimbingRouteTable from "./ClimbingRouteTable.tsx";
import BreakdownHandoff from "./BreakdownHandoff.tsx";
import { isPitched } from "../../lib/breakdownRows.js";
import RouteBreakdown from "./RouteBreakdown.tsx";
import { gapPitches, _gapDist, gapTrack } from "../../lib/routeGaps.js";
import DescentLegStrip from "./DescentLegStrip.tsx";
import { descentBeta } from "../../lib/descentBeta.js";
import { splitParagraphs } from "../../EnrichmentPanels";
import { rappelsAreNone, rappelNoteText, rappelHeadingCount } from "../../lib/rappelText.js";
import { pitchCountOf } from "../../lib/pitchCount.js";
import RappelTable from "./RappelTable.tsx";
import ItineraryView from "./ItineraryView.tsx";
import TripProfileCard from "./TripProfileCard.tsx";
import Calculator from "./Calculator.tsx";
import { campingGate } from "../../lib/campingGate.js";
import CampingPanel from "./CampingPanel.tsx";
import { trackCoverage, trackCoverageCaveat, trackStubCaveat, waypointCaveat } from "../../lib/track";
import { _shortDist } from "../../lib/shortDist.js";
import CragLocationCard from "./CragLocationCard.tsx";
import BaseCheckinPanel from "./BaseCheckinPanel.tsx";
import { USE_DB } from "../../lib/supabase";
import WallNeighbours from "./WallNeighbours.tsx";
import BoulderNeighbours from "./BoulderNeighbours.tsx";
import { BTN } from "../../lib/buttonStyles.js";
import { seasonName } from "../../lib/seasonName.js";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";
import Chevron from "./Chevron.tsx";
import { navTarget, navLinks } from "../../lib/navLinks";
import WaypointList from "./WaypointList.tsx";
import RouteGearCheck from "./RouteGearCheck.tsx";
import { routeRackFor, rackRows, DISC_RACK } from "../../lib/rack";

/** One row of the route's `road` block (GETTING THERE reads it). */
interface PlanRoad {
  name?: string | null;
  driveNote?: string | null;
  status?: string | null;
  seasonalGate?: string | null;
}
/** The route's `access` block; every row of ACCESS & REGULATIONS comes from it. */
interface PlanAccess {
  passRequired?: boolean | string | null;
  fees?: number | string | null;
  land_manager?: string | null;
  landManager?: string | null;
  closures?: string | null;
  closure?: string | null;
  seasonal?: string | null;
  permit?: string | null;
  rules?: string | null;
  group_limit?: number | null;
  parking_pass?: string | null;
  notes?: string | null;
}
/** A recorded walk another party shared, or a trip report standing in for one. */
interface PlanTrack {
  who?: string | null;
  avatar?: string | null;
  date?: string | null;
  season?: string | null;
  note?: string | null;
  report?: string | null;
  gpxPts?: unknown[] | null;
}
/** One merged trip report, as the Plan body and the cards under it read it. */
export interface PlanActivity {
  date?: string | null;
  user?: string | null;
  avatar?: string | null;
  text?: string | null;
  cond?: { camps?: string[] | null } | null;
}
/** What the Plan body itself reads off the route; the children's own route types are intersected below. */
interface PlanOwnRoute {
  id: string;
  name: string;
  discipline?: string | null;
  pitches?: number | null;
  road?: PlanRoad | null;
  driveMinSLC?: number | null;
  access?: PlanAccess | null;
  permits?: string | null;
  permitUrl?: string | null;
  descent?: unknown;
  descentText?: string | null;
  communityTracks?: PlanTrack[] | null;
  gpxPts?: unknown[] | null;
  /** Set when the line is the crag's shared walk in (areas.walkin_gpx, 0397), not this climb's own. */
  _walkIn?: "recorded" | "traced" | null;
  whatToBring?: RouteGearCheckProps["essentials"];
}
/** The route; only what the Plan body and the cards it mounts read. */
export type PlanRoute = PlanOwnRoute & TrailheadCardProps["route"] & SummitLegsCardProps["route"] & CragWalkInArea2 & ApproachVariantsProps["route"] & ClimbingRouteTableProps["route"] & BreakdownHandoffProps["route"] & RouteBreakdownProps["route"] & DescentLegStripProps["route"] & RappelTableProps["route"] & TripProfileCardProps["route"] & CalculatorProps["route"] & CampingPanelProps["route"] & CragLocationCardProps["route"] & BaseCheckinPanelProps["route"] & RouteGearCheckProps["route"] & ItineraryViewProps["route"];
/** The `_dbArea` and `approach` reads of the crag walk-in. */
type CragWalkInArea2 = NonNullable<CragWalkInProps["route"]>;

export interface RoutePlanTabProps {
  /** The first heading's top margin is dropped when the body starts the tab; Overview passes none. */
  atTabTop?: boolean;
  /** The offline-save control under the map. */
  _mapOffline: ReactNode;
  /** The route map and elevation profile. */
  _routeMap: ReactNode;
  /** The recorded-tracks panel under the map. */
  _tracksPanel: ReactNode;
  /** The merged trip reports. */
  activity: PlanActivity[];
  baseQ: BaseCheckinPanelProps["q"];
  baseSpots: BaseCheckinPanelProps["spots"];
  calcInputs: CalcInputs;
  /** CLIMATE & SEASON, shown here only for a discipline with no Conditions tab. */
  climateEl: ReactNode;
  /** The page's comment actions; `canPost` false hides the pitch comment box. */
  commentApi: { canPost?: boolean; onAdd: RouteBreakdownProps["onCommentAdd"] };
  comments: RouteBreakdownProps["comments"];
  commentsUnavailable: RouteBreakdownProps["commentsUnavailable"];
  /** The crowds, sun and season panels the page mounts. */
  condPanels: ReactNode;
  /** The route has a Conditions tab. */
  condTab: boolean;
  /** Renders one part of the crag's technical facts. */
  cragFactsEl: (part: string) => ReactNode;
  cragOnly: boolean;
  cragSibs: NeighbourRow[];
  crewsForRoute: ItineraryViewProps["crewsForRoute"];
  dbPhotos: RouteBreakdownProps["dbPhotos"];
  /** Focuses a placed waypoint on the map by its index. */
  focusWaypoint: (index: number) => void;
  gearUpdateBox: ReactNode;
  logged: boolean;
  mapWrapRef: Ref<HTMLDivElement>;
  /** The route's area; the fields the nav links and cards read. */
  mtn: CragLocationCardProps["mtn"] & { name?: string | null; lat?: number | string | null; lng?: number | string | null };
  myItin: ItineraryViewProps["myItin"];
  noWaypoints: boolean;
  notify: ItineraryViewProps["notify"];
  /** Uploads photos for a pitch; absent when the page has no upload path. */
  onAddPhotos?: ((files: File[], alts: string[], pitch: string | number) => unknown) | null;
  /** Opens another climb (a neighbour card or a paired climb). */
  onOpenRoute?: ((route: NeighbourRow | PairRoute) => void) | null;
  onSaveMyItin: ItineraryViewProps["onSaveMyItin"];
  onShareItinToCrew: ItineraryViewProps["onShareItinToCrew"];
  /** Opens the edit sheet at a section. */
  openFix: (section: string) => void;
  /** The side rail renders the map instead when set. */
  railEl: ReactNode;
  route: PlanRoute;
  setCalcInputs: NonNullable<CalculatorProps["onCalc"]>;
  setFixFocusPitch: (pitch: number | null) => void;
  setFixPrefill: (prefill: { rack: { note: string } } | null) => void;
  setShowGpsModal: (open: boolean) => void;
  setTab: (tab: string) => void;
  setTrackHistOpen: Dispatch<SetStateAction<boolean>>;
  setTrackOpen: (index: number | null) => void;
  trackHistOpen: boolean;
  trackOpen: number | null;
  who: BaseCheckinPanelProps["who"];
}

/* planBody — the body of that closure of RouteDetail, lifted verbatim by extract-from-parent.mjs (closure mode);
   its parameters (atTabTop) and every binding it read from RouteDetail are props of the same name.
   Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RoutePlanTab({atTabTop,_mapOffline,_routeMap,_tracksPanel,activity,baseQ,baseSpots,calcInputs,climateEl,commentApi,comments,commentsUnavailable,condPanels,condTab,cragFactsEl,cragOnly,cragSibs,crewsForRoute,dbPhotos,focusWaypoint,gearUpdateBox,logged,mapWrapRef,mtn,myItin,noWaypoints,notify,onAddPhotos,onOpenRoute,onSaveMyItin,onShareItinToCrew,openFix,railEl,route,setCalcInputs,setFixFocusPitch,setFixPrefill,setShowGpsModal,setTab,setTrackHistOpen,setTrackOpen,trackHistOpen,trackOpen,who}: RoutePlanTabProps){
  return <div>{(route.road||route.driveMinSLC)?(function(){const road=route.road||{};let _rowN=0;function row(label: string,val: ReactNode){if(!val)return null;const first=_rowN++===0;return <div style={{padding:first?"0 0 9px":"9px 0",borderTop:first?"none":"1px solid "+C.borderLight}}><div style={{...SUB_LABEL,marginBottom:3}}>{label}</div><div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{val}</div></div>;}const driveTxt=route.driveMinSLC?(route.driveMinSLC>=60?(Math.floor(route.driveMinSLC/60)+"h "+(route.driveMinSLC%60?route.driveMinSLC%60+"m ":"")+"from Salt Lake City"):(route.driveMinSLC+" min from Salt Lake City")):null;return <>{/* Points at `road`, not `approach`: every row in THIS panel comes from the road block (name / driveNote / status / seasonalGate), so the edit button used to open a form section that could not change a single line of what it sits beside. The overview panel above still opens `approach`, because that one mixes road and approach content. */}<SL first={atTabTop} action={<EditIconButton onClick={()=>{openFix("road");}} title="Edit road and driving information"/>} wp="Trailhead">GETTING THERE</SL><Capped><div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:"1px solid "+C.border,marginBottom:ROUTE_GAP}}>{row("Drive time",driveTxt)}{row("Road / access point",road.name)}{row("Drive notes",road.driveNote)}{road.status?row("Road status",road.status+(road.seasonalGate?" — "+road.seasonalGate:"")):row("Seasonal gate",road.seasonalGate)}{accessCheckedLine(route)?<div style={{marginTop:2,fontSize:11.5,color:C.textMuted,lineHeight:1.5}}>{accessCheckedLine(route)}</div>:null}{/* The rows above are the catalog's, researched once. The line below is what the last climber who drove in reported — the full list is ROAD CONDITIONS on the Conditions tab. */(function(){const ls=roadReportsOf(activity).find(function(r: {status?: string | null}){return r.status;});if(!ls)return null;const tc=ROAD_TONE(ls.tone);return <div style={{marginTop:8,fontSize:12,color:C.textSub,lineHeight:1.5}}>{"Climbers reported: "}<b style={{color:tc[0]}}>{ls.status}</b>{" · "+ago(ls.date)}</div>;})()}</div></Capped></>;})():<><SL first={atTabTop} action={<EditIconButton onClick={()=>{openFix("road");}} title="Edit road and driving information"/>} wp="Trailhead">GETTING THERE</SL><GapNote what="No driving directions yet" why="Nothing says which road gets you here, how long the drive is, or whether a gate or rough road stands in the way." cta="Add the drive" onFix={()=>{openFix("road");}}/></>}{/* THE TRAILHEAD BELONGS BESIDE THE DRIVE, NOT ON TOP OF THE APPROACH PROSE. This card used
           to open the APPROACH section further down the tab, which put the place you are driving to
           several screens below the road that gets you there — and left APPROACH answering two
           questions at once (where does the walk start, and how does the walk go). GETTING THERE is
           the drive; this is the point it ends at; APPROACH is what you do on foot afterwards.
           IT REPLACES a standalone "Directions to trailhead" button that stood here, not merely
           joins it: that button resolved its destination through trailheadPoint() and so does this
           card's "Drive here", so the two were the same link. trailheadPoint never returns a point
           with a null lat (every branch goes through wpPlaced), so wherever the button rendered the
           card renders too and nothing is lost. */}{cragOnly?null:<Capped><TrailheadCard route={route} onEdit={()=>{openFix("approach");}}/><SummitLegsCard route={route} calc={calcInputs}/></Capped>}{(()=>{const rx=rxOf(route.id);const dbA=route.access||{};const ac={...dbA,...rx.access};const passVal=ac.passRequired===true?"Yes":(typeof ac.passRequired==="string"?ac.passRequired:null);const feesVal=typeof ac.fees==="number"?("$"+ac.fees):ac.fees;/* DISPLAY prefers land_manager: it is the canonical field — 2,103 routes across just 80
   distinct values, "Agency (Ranger District) — Wilderness". landManager is legacy free prose:
   984 routes across 474 distinct values, a quarter of them over 110 chars, sometimes a whole
   sentence ("Most of the route ... lie within the ..."). 604 routes carry BOTH with different
   text, and the || order meant the prose always won and the canonical value was never seen. */
const landMgrVal=ac.land_manager||ac.landManager;const closuresVal=ac.closures||ac.closure||ac.seasonal;/* `permits`/`permitUrl` are TOP-LEVEL columns, not part of the `access` jsonb every other row here comes from — which is why they used to render on a different tab entirely. Kept as their own row rather than folded into ["Permit",ac.permit]: the two say different things and 67% of alpine routes carry both. `ac.permit` is the permit's NAME ("Mount Baker Climbing"); `route.permits` is how it actually works ("Free self-issue Mount Baker Wilderness permit or trailhead registration; no quota or fee"). Collapsing them with a `||` would drop one, which is the exact defect #741 fixed on the Trailhead row. When there IS a link the text renders inside it below, so it is not listed twice. */const _ownPermit=route.permits||null;const _ownPermitUrl=route.permitUrl||null;const rows=[["Permit",ac.permit],["Permit details",_ownPermitUrl?null:_ownPermit],["Fees",feesVal],["Seasonal closures",closuresVal],["Rules & limits",ac.rules],["Group size limit",ac.group_limit!=null?ac.group_limit+(ac.group_limit===1?" climber":" climbers"):null],["Land manager",landMgrVal],["Pass required",passVal],["Parking / entrance",ac.parking_pass],["How to apply",ac.notes]].filter(r=>r[1]);/* An empty access block used to render NOTHING — no panel, no heading, and therefore no edit button, so the routes with no access information were exactly the routes on which nobody could add any. That is the shape [[per-section-gap-notices-replaced-page-banner]] exists for: say what is missing where it would have been, and offer the way to fix it. */if(!rows.length&&!_ownPermitUrl)return <GapNote what="No access or permit information" why="Nothing on file says who manages this land, what pass the trailhead needs, or whether a permit is required — and that is the part that turns people around at the gate." cta="Add what you know" onFix={function(){openFix("access");}}/>;/* Deliberately NOT landMgrVal — matching reads BOTH land-manager strings, display reads one.
   Neither key alone is a good haystack. Preferring the canonical land_manager loses links the
   legacy prose earned (13 lost, 5 moved: "Mount Rainier National Park" collapses to "National
   Park Service", the Enchantments permit area vanishes from Alpine Lakes routes). Preferring
   the legacy prose loses what only the canonical field says — Mount Torment, Challenger and
   Olympus are Park Service land and linked to NOTHING. The union loses neither, and on its own
   it would let 15 Mt. Baker boilerplate routes through to the wrong agency; PERMIT_PERIPHERAL
   above is what makes it safe. Measured together: 107 wrong links removed, 7 genuine park
   links gained, 1 moved. Do not "tidy" display and matching back into one expression. */
const _pmLm=((ac.land_manager||"")+" "+(ac.landManager||"")+" "+(ac.permit||"")+" "+(feesVal||"")).toLowerCase();/* Match the agency name only where it is ASSERTED, never where it is disclaimed. This haystack is land manager + permit + fees, and 1,282 WA routes carry the fees line "None - no climbing fee (National Forest, not Mount Rainier NP)". A bare /rainier/ test reads that as Rainier and sends a climber on a Snoqualmie or Index route to Mount Rainier's climbing-permit page - contradicting the very sentence it matched. 1,308 of the 1,941 routes showing a permit link were pointed at the wrong agency this way. Same defect the rack summary already guards with RACK_NEG ("ice screws are not worth carrying" must not advertise screws). */const _pmUrl=_pmSays(_pmLm,/enchantment/g)?["Enchantment Permit Area lottery — Recreation.gov","https://www.recreation.gov/permits/233273"]:_pmSays(_pmLm,/north cascades/g)?["North Cascades NP backcountry permits — nps.gov","https://www.nps.gov/noca/planyourvisit/permits.htm"]:_pmSays(_pmLm,/rainier/g)?["Mount Rainier climbing permits — nps.gov","https://www.nps.gov/mora/planyourvisit/climbing.htm"]:_pmSays(_pmLm,/olympic national park/g)?["Olympic NP wilderness permits — nps.gov","https://www.nps.gov/olym/planyourvisit/wilderness-reservations.htm"]:_pmSays(_pmLm,/recreation\.gov/g)?["Reserve on Recreation.gov","https://www.recreation.gov"]:null;const _accSummary=rows.map(function(r){return r[0];}).concat(_ownPermitUrl?["Permit link"]:[]).join(" · ");return <AccessFold summary={_accSummary} onEdit={function(){openFix("access");}}>{/* The pencil points at `access`, not `permit`. Every row here comes from the `access` block; `permit` is the separate top-level column, so this button opened a form section that could not change one line of what it labels. */}{rows.map(r=><div key={r[0]} style={{marginBottom:7}}><CardHead style={{marginBottom:8}}>{r[0]}</CardHead><div style={{fontSize:13,color:C.textSub,lineHeight:1.55}}>{r[1]}</div></div>)}{/* The route's OWN permit link, rehomed here from Overview. It comes first because it is specific to this climb, where `_pmUrl` below is inferred from the land-manager string and only ever points at an agency's general permit page. `rel` gains `noopener` — the Overview copy had `noreferrer` alone, and while every current browser implies the one from the other, stating it is what the two other external links in this panel already do. */}{_ownPermitUrl?<a href={_ownPermitUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:9,padding:"9px 12px",background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:9,fontSize:12.5,fontWeight:700,textAlign:"center",textDecoration:"none"}}>{(_ownPermit||"Get the permit")+" →"}</a>:null}{_pmUrl?<a href={_pmUrl[1]} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:9,padding:"9px 12px",background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:9,color:C.onSolid,fontSize:12.5,fontWeight:700,textDecoration:"none",textAlign:"center"}}>{_pmUrl[0]+" →"}</a>:null}<div style={{fontSize:12,color:C.textMuted,marginTop:8,fontStyle:"italic"}}>Confirm current permits and closures with the land manager before you go.</div></AccessFold>;})()}{/* The structured approaches come FIRST, then the long-form prose below. A climber
    choosing a way in wants the comparison (which one, what season, how long) before the
    narrative; the narrative is what you read once you have chosen. */}{(cragOnly&&route._dbArea&&String(route._dbArea.approach||"").trim())?<div style={{marginBottom:12}}><Capped><CragWalkIn route={route}/></Capped></div>:null}{/* A crag's WALK-IN (areas.approach) used to sit lower on Overview under its own "GETTING THERE"
     title — a second heading of that name once the Plan body moved to Overview, and beside a GapNote
     saying the walk was not written down when the crag's walk-in was right there. It renders here,
     in the approach slot, and the GapNote yields to it. */}{(route.approach||(Array.isArray(route.approachVariants)&&route.approachVariants.some(Boolean)))?<Capped><ApproachVariants route={route} onEdit={()=>{openFix("approachVariants");}} onEditProse={()=>{openFix("approach");}}/></Capped>:(cragOnly&&route._dbArea&&String(route._dbArea.approach||"").trim())?null:<EmptySection title="APPROACH" what="No approach description" why="Getting from the trailhead to the start of the climbing is not written down yet." cta="Describe the approach" onFix={()=>{openFix("approach");}}/>}{/* GATED ON THE WALK ITSELF — the prose or a way in — never on the trailhead alone. The old gate
           also admitted a route that merely had a trailhead, because a card underneath was the thing
           being shown; with that card at the top of the tab such a route would render the APPROACH
           heading over an empty box. It takes the GapNote above instead, which is true — the trailhead
           is on screen and the walk from it genuinely is not written down. */}{/* TURNAROUND and BAILOUT were removed from the app entirely (owner, 2026-10-07). The `turnaround` and
    `bail` columns stay in the database, unread. */}{/* Up, then down. PITCH-BY-PITCH sits after the approach and before the descent; the rappels
    follow the descent prose immediately below. There is no PROTECTION section here any more
    (owner note, 2026-10-23: "remove protection and just move that info to the rack section"):
    its one line — a cam range, a rack summary, or "N bolts · N+ quickdraws" — repeated the RACK
    card further down this tab, which lists the same cams and rack in full. The bolt count was the
    one fact only it carried, and it is a line in RACK now. Mountain Project prints one protection
    box per route, not two. */}
{/* OVERVIEW, THEN DETAIL. CLIMBING ROUTE (the climb at a glance, section by section) comes
    BEFORE ROUTE BREAKDOWN (every pitch and leg), the order a climber reads a route in and the
    order guidebooks print it: the line as a whole, then pitch by pitch (owner, 2026-10-22). It
    used to sit AFTER the breakdown, and on a pitched route it was not drawn at all: 121
    scramble/mountaineering routes showed the detail before the overview, and 46 alpine routes
    held a written CLIMBING ROUTE nobody saw. It now renders wherever it is written; only its
    EMPTY state stays unpitched-only, so a rock route is not asked for a second description of
    pitches it already lists. When both are on the page they are drawn as one piece: the
    overview ends in a connector that hands off to the breakdown directly under it. No section
    is matched to a pitch — nothing in the record says which pitches a section spans, and
    guessing from words would be a claim the record never made. */}
{route.discipline!=="bouldering"&&(route.climbingRoute||[]).length?<div id="climbing-route" style={{marginBottom:14,scrollMarginTop:"80px"}}><Capped><ClimbingRouteTable route={route} onEdit={()=>{openFix("climbingRoute");}}/></Capped>{route.pitchDetail&&route.pitchDetail.length?<BreakdownHandoff route={route}/>:null}</div>:(!isPitched(route)&&route.discipline!=="bouldering"?<EmptySection title="CLIMBING ROUTE" what="No climbing route breakdown" why="Nothing describes the climbing section by section — where it steepens, where it gets exposed, where the crux is." cta="Describe the climbing" onFix={()=>{openFix("climbingRoute");}}/>:null)}
{route.discipline!=="bouldering"&&route.pitchDetail&&route.pitchDetail.length?<Capped><RouteBreakdown route={route} logged={logged} comments={comments} commentsUnavailable={commentsUnavailable} onCommentAdd={commentApi.canPost===false?null:commentApi.onAdd}dbPhotos={dbPhotos} onAddPitchPhoto={onAddPhotos?function(files,n){return onAddPhotos(files,files.map(function(){return "";}),n);}:null} onEdit={(pIdx)=>{setFixFocusPitch(typeof pIdx==="number"?pIdx:null);openFix("pitchDetail");}}/></Capped>:(gapPitches(route)?<EmptySection title="ROUTE BREAKDOWN" what="No pitch-by-pitch breakdown" why={route.pitches+" pitches are listed, but none of them are described — no per-pitch grades, belays or crux."} cta="Add the pitches" onFix={()=>{openFix("pitchDetail");}}/>:(isPitched(route)&&!cragOnly&&!(route.pitches>0)?<EmptySection title="ROUTE BREAKDOWN" what="No pitch-by-pitch breakdown" why="Nothing records how many pitches this climbs or what each one asks of you." cta="Add the pitches" onFix={()=>{openFix("pitchDetail");}}/>:null))}
{(route.descent||route.descentText)?<div style={{marginBottom:ROUTE_GAP}}><SL action={<EditIconButton onClick={()=>{openFix("descentText");}} title="Edit descent information"/>}>DESCENT</SL><Capped><DescentLegStrip route={route} calc={calcInputs}/></Capped><Capped>{[["Descent",descentBeta(route)]].filter(x=>x[1]).map(x=><div key={x[0]} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:5}}>{x[0]}</div>{splitParagraphs(x[1]).map((p,i)=><p key={i} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:i===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}</div>)}</Capped></div>:(route.discipline==="bouldering"?null:<><DescentLegStrip route={route} calc={calcInputs}/><EmptySection title="DESCENT" what="No descent recorded" why="Nothing says how you get off this route — and on many climbs the way down is the committing part." cta="Describe the descent" onFix={()=>{openFix("descentText");}}/></>)}{/* The rappel table and its prose/count summary, immediately after the descent they belong
    to. Both were on Overview; keeping them adjacent is what matters — see the note where
    they used to sit. */}
{(function(){
  /* What climbers who logged it said about the rappels. Shown UNDER the catalog's own
     account and never in place of its headline count. Shown even where the catalog says
     there are no rappels: a party that rapped is evidence the catalog should hear. */
  const crep=rappelReportsOf(activity);
  const crepCard=crep?<div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`,marginTop:8}}><div style={{...SUB_LABEL,marginBottom:4}}>{"CLIMBERS REPORTED · "+crep.n+(crep.n===1?" report":" reports")}</div><div style={{fontSize:12.5,color:C.text,lineHeight:1.6}}>{[(crep.min===crep.max?crep.min:((crep.count as NonNullable<typeof crep.count>).value+" most often ("+crep.min+"–"+crep.max+")"))+" rappel"+(crep.min===crep.max&&crep.min===1?"":"s"),crep.longestM?"longest "+uLenN(crep.longestM)+" "+uLenUnit():null,crep.rope?crep.rope.value+(crep.rope.n>1?" ("+crep.rope.n+")":""):null].filter(Boolean).join(" · ")}</div>{crep.latest?<div style={{fontSize:11.5,color:isRecent(crep.latest)?C.textMuted:C.amber,marginTop:3}}>{"latest "+ago(crep.latest)}</div>:null}</div>:null;
  if(rappelsAreNone(route))return crepCard?<div style={{marginBottom:ROUTE_GAP}}><SL>RAPPELS</SL>{crepCard}</div>:null;
  const hasTable=!!(route.rappelDetail&&route.rappelDetail.length);
  const note=rappelNoteText(route);
  const heading=rappelHeadingCount(route);
  /* 245 routes store the summary as a bare digit and have no table. Printing that digit as
     the body under a heading that already says "3 rappels" gives a box whose whole content is
     "3" — the same emptiness the walk-offs had, one step along. Say what is missing instead. */
  const noteIsJustCount=!!note&&/^~?\s*\d+(?:\s*[-–]\s*\d+)?\s*x?$/.test(String(note).trim());
  const prose=(note&&!noteIsJustCount)?note:null;
  const openEdit=function(){openFix("rap");};
  /* EMPTY IS A PLACEHOLDER, NOT AN ABSENCE — but only where rappelling is a question the route can
     have: not a boulder problem, not a walk-up, and not a single-pitch crag line (it lowers off). */
  if(!hasTable&&!heading&&!prose&&!crepCard)return (route.discipline!=="bouldering"&&!["scrambling","hiking","scramble","hike"].includes(route.discipline)&&(!cragOnly||pitchCountOf(route)>1))?<EmptySection title="RAPPELS" what="No rappel information" why="Nothing says whether you rappel off this, how many raps, or how long a rope they need." cta="Add the rappels" onFix={openEdit}/>:null;
  return <div style={{marginBottom:12}}>
    {hasTable?<Capped><RappelTable route={route} onEdit={openEdit}/></Capped>:<>
      <SL action={<EditIconButton onClick={openEdit} title="Edit rappel information"/>}>{"RAPPELS"+(heading?" · "+heading:"")}</SL>
      <div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.7}}>{prose||"No per-rappel breakdown on file yet — the anchors, individual lengths and rope requirement are unrecorded."}</div></div>
    </>}
    {(hasTable&&note)?<div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`,marginTop:ROUTE_GAP}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.7}}>{note}</div></div>:null}
    {crepCard}
  </div>;
})()}{!cragOnly?<div style={{marginBottom:ROUTE_GAP}}><Capped><ItineraryView route={route} activity={activity} seasonOnConditions={!!(condTab&&condPanels)} onSeeSeason={()=>{if(condTab&&condPanels)setTab("forecast");setTimeout(()=>{if(typeof document!=="undefined"){const el=document.getElementById("seasonal-guidance");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}} onContribute={()=>{openFix("itinerary");}} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){const el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}} myItin={myItin} onSaveMyItin={onSaveMyItin} crewsForRoute={crewsForRoute} onShareItinToCrew={onShareItinToCrew} notify={notify}/></Capped></div>:null}{/* CLIMATE & SEASON lives on the Conditions (`forecast`) tab (owner note 2026-10-24), after the
    forecast: it is the weather a climber should EXPECT, read beside the weather coming. It sat here
    on Plan (and on a crag's Overview) since #2049; it renders here now only for a discipline with
    no Conditions tab, so no route loses it. */}{condTab?null:climateEl}{!cragOnly?<Capped><TripProfileCard route={route} calc={calcInputs}/></Capped>:null}{!cragOnly?<Calculator route={route} activity={activity} calc={calcInputs} onCalc={setCalcInputs}/>:null}{/* CAMPING & BIVY, moved off the Safety tab (see the note on the safety line). It sits directly
    after the time estimate because the two answer one question together — how long this takes,
    and where you stop if it takes longer. SCRAMBLING is in the gate: it was the one discipline
    excluded before, and a scramble that overruns benights a party exactly like an alpine route.
    Gated on campingGate(), which is catOf() PLUS "trad is alpine when it climbs a peak" — catOf()
    folds `rock` into trad/sport first, and a big alpine rock route carries `trad` by convention here. */}{campingGate(route)?<CampingPanel route={route} calc={calcInputs} activity={activity} onEdit={()=>{openFix("bivy");}}/>:null}{<><SL action={<EditIconButton onClick={()=>{openFix("waypoints");}} title={cragOnly?"Edit the parking pin":"Edit waypoints and route information"}/>}>{cragOnly?"CRAG MAP":"ROUTE TRACK"}</SL><div style={{marginBottom:12}}>{/* A crag climb summits nothing, so its map is not a route track: it shows WHERE the crag is and where to park, plus the walk in from parking to the base (on to this climb's start when it sits apart from the main wall) once someone shares one. The climb itself is never drawn. The parking pin lives in CragLocationCard below. */}{cragOnly?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{(route.gpxPts&&route.gpxPts.length)?(route._walkIn?"Where the crag is and where to park. The line is the crag's walk in, from parking to the base, shared by every climb here"+(route._walkIn==="traced"?"; a climber traced it on the map, so it is not a GPS recording":"")+" — not the climb itself.":"Where the crag is and where to park. The line is the walk in from parking to the base of the crag, on to this climb's start if it sits away from the main wall — not the climb itself."):"Where the crag is and where to park. This is a location map, not a track of the climb."}</div>:null}{(function(){const _cov=trackCoverage(route.gpxPts,route.waypoints);return _cov?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:8}}>{trackCoverageCaveat(_cov,_gapDist)}</div>:null;})()}{(function(){const _stub=trackStubCaveat(route.gpxPts,route.waypoints,_shortDist);return _stub?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:8}}>{_stub}</div>:null;})()}{railEl?null:<div ref={mapWrapRef}>{_routeMap}{_mapOffline}{_tracksPanel}</div>}{cragOnly?<Capped><CragLocationCard route={route} mtn={mtn} onEditParking={()=>{openFix("waypoints");}}/></Capped>:null}{/* BASE OF THE CLIMB sits directly under the map that draws its spots: it used to be far down Overview, away from the one picture that shows where the start is. */}{cragOnly?<div style={{marginTop:ROUTE_GAP}}>{cragFactsEl("location")}</div>:null}<BaseCheckinPanel route={route} who={who} spots={baseSpots} q={baseQ}/>{cragOnly&&USE_DB&&catOf(route)!=="bouldering"?<div style={{marginTop:ROUTE_GAP}}><WallNeighbours rows={cragSibs} routeId={route.id} onOpen={onOpenRoute}/></div>:null}{cragOnly&&USE_DB&&catOf(route)==="bouldering"?<div style={{marginTop:ROUTE_GAP}}><BoulderNeighbours rows={cragSibs} routeId={route.id} areaName={mtn.name==="this area"?null:mtn.name} onOpen={onOpenRoute}/></div>:null}{((route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced))?<div style={{marginTop:ROUTE_GAP}}><button onClick={()=>gpxDownload(route)} style={{...BTN,width:"100%",background:C.blueBg,color:"#fff",border:`1px solid ${C.blueDim}`}}>{(route.gpxPts&&route.gpxPts.length)?"Download GPX":(cragOnly?"Download GPX (pins only)":"Download GPX (waypoints only)")}</button></div>:null}{gapTrack(route)?(cragOnly?<GapNote mt={10} what="No trail to the crag yet" why="Nobody has shared the walk in from parking. Know the way? Trace it on the map from the parking to the crag, or add a recording from your phone or watch, and the next party finds the crag first time." cta="Add the trail" onFix={()=>setShowGpsModal(true)}/>:<GapNote mt={10} what="No recorded GPS track" why="There is no line on this map to follow — just the waypoints, if any were added. Recorded a GPX up here?" cta="Submit a track" onFix={()=>setShowGpsModal(true)}/>):null}<div style={{marginTop:14}}><SL>Recent tracks & trip reports</SL><div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 9px",lineHeight:1.5}}>{cragOnly?"Walk-ins other parties recorded, plus recent trip reports — trails get rerouted and closed, so check a recent one.":"Recorded lines other parties walked, plus recent trip reports — conditions and detours shift with the season, so check a recent one."}</div>{(function(){const ctSeed=(route.communityTracks||[]);const actTracks=(activity||[]).filter(function(a){return a&&a.date;}).map(function(a){return {who:a.user,avatar:a.avatar,date:a.date,note:"Trip report — no recorded track.",report:a.text};});const seenT: Record<string, number>={},ct: PlanTrack[]=[];ctSeed.concat(actTracks).forEach(function(t: PlanTrack){const kk=(t.who||"")+"|"+(t.date||"");if(!seenT[kk]){seenT[kk]=1;ct.push(t);}});ct.sort(function(a,b){return (b.date||"").localeCompare(a.date||"");});if(!ct.length)return <div style={{fontSize:12.5,color:C.textSub,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}>No recent tracks or trip reports yet — share one after you climb it.</div>;const shown=trackHistOpen?ct:ct.slice(0,2);const older=ct.length-2;return <div>{shown.map(function(t,i){const op=trackOpen===i;const season=t.season||seasonName(t.date);const sc=({Winter:C.blue,Spring:C.green,Summer:C.amber,Fall:C.orange} as Record<string, string>)[season]||C.textSub;return <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:ROUTE_GAP,overflow:"hidden"}}><div {...clickable(function(){setTrackOpen(op?null:i);})} aria-expanded={op} style={{minHeight:44,boxSizing:"border-box",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}}><Av src={t.avatar} size={30}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflowWrap:"anywhere"}}>{t.who||"A climber"}</div>{/* The date lives on the second line. Sharing the name's one-line ellipsis, it was the part cut first: at 360px "Nathan Barber · Jun 20, 2026" needed 186px of 169, so what tells two recordings apart went missing. */}<div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{[t.date?shortDate(t.date):"",t.note].filter(Boolean).join(" · ")}</div></div><span style={{flexShrink:0,fontSize:11,fontWeight:700,color:sc,background:sc+"22",border:`1px solid ${sc}55`,borderRadius:20,padding:"2px 8px"}}>{season}</span><span style={{marginLeft:6,display:"flex"}}><Chevron open={op} size={15} color={C.textMuted}/></span></div>{op?<div style={{borderTop:`1px solid ${C.borderLight}`,padding:"9px 12px"}}>{t.report?<div style={{fontSize:12.5,color:C.text,lineHeight:1.55,fontStyle:"italic",marginBottom:9}}>{"“"+t.report+"”"}</div>:null}{((t.gpxPts&&t.gpxPts.length)||(route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced))?<button onClick={function(){const hasOwn=t.gpxPts&&t.gpxPts.length;gpxDownload(route,hasOwn?t.gpxPts:null,route.name+(t.who?" — "+t.who:"")+(t.date?" "+t.date:""));}} style={{...BTN,width:"100%",border:`1px solid ${C.blueDim}`,background:C.blueBg,color:"#fff"}}>{(t.gpxPts&&t.gpxPts.length)?"Download this track (GPX)":"Download standard route line (GPX)"}</button>:null}{!(t.gpxPts&&t.gpxPts.length)?<div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"No recorded path from "+(t.who||"this climber")+(((route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced))?" — this downloads the route’s standard line, not their exact track.":".")}</div>:null}</div>:null}</div>;})}{older>0?<button onClick={function(){setTrackHistOpen(function(v){return !v;});}} style={{...BTN,width:"100%",border:"1px solid "+C.border,background:C.surface,color:C.blue}}>{trackHistOpen?"Show fewer":"See "+older+" older track"+(older!==1?"s":"")+" from past trips"}</button>:null}</div>;})()}</div>{(function(){const _nav=navTarget(route,mtn);if(!_nav)return null;const _row={display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`};const _go={fontSize:12,color:C.blue,fontWeight:600,textDecoration:"none"};return <div style={{marginTop:12,background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:6}}>OPEN IN NAVIGATION APP</CardHead>{navLinks(_nav,(mtn&&mtn.name)||route.name).map(function(a){return a.app?<div key={a.n} style={_row}><span style={{fontSize:13,color:C.textSub}}>{a.n}</span><span style={{display:"flex",alignItems:"center",gap:12}}><a href={a.href} target="_blank" rel="noreferrer" aria-label={a.n+" web map, at this climb"} style={{..._go,color:C.textMuted,fontWeight:500}}>Web map</a><a href={a.app} aria-label={"Open this climb in the "+a.n+" app"} style={_go}>Open app →</a></span></div>:<a key={a.n} href={a.href} target="_blank" rel="noreferrer" aria-label={"Open this climb in "+a.n} style={{..._row,textDecoration:"none"}}><span style={{fontSize:13,color:C.textSub}}>{a.n}</span><span style={_go}>Open →</span></a>;})}</div>;})()}</div></>}{noWaypoints?null:<div style={{marginTop:12}}><SL action={<EditIconButton onClick={()=>{openFix("waypoints");}} title="Edit waypoints"/>}>WAYPOINTS</SL>{(function(){const _wpCav=waypointCaveat(route.id,route.waypoints);return _wpCav?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{_wpCav}</div>:null;})()}{<Capped><WaypointList waypoints={route.waypoints} onFocus={focusWaypoint} emptyCopy={cragOnly?"No named waypoints yet — add the parking/approach point (and anchor, if useful) to help other climbers find this crag.":"No named waypoints yet — the track above is a raw GPS line with no key points marked. Add the trailhead, camps, junctions and summit to unlock a turn-by-turn list here and per-point weather forecasts on the Safety tab."} onAdd={function(){openFix("waypoints");}}/></Capped>}</div>}{!CRAG_CATS.includes(catOf(route))?<RouteGearCheck route={route} activity={activity} afterRack={gearUpdateBox} rack={routeRackFor(route)||(rackRows(route).length?[]:((DISC_RACK as Record<string, typeof DISC_RACK["sport"]>)[catOf(route)]||[]))} rackGeneric={!routeRackFor(route)&&!rackRows(route).length} essentials={route.whatToBring} onEditEssentials={function(){openFix("whatToBring");}} onEditRopeNote={function(){openFix("ropeNote");}} onEditRack={cur=>{setFixPrefill(cur?{rack:{note:cur}}:null);openFix("rack");}} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){const el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}}/>:null}</div>;
}
