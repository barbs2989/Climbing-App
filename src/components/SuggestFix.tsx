import { MONTHS, CRAG_CATS, catOf, blankItinDay, uLenN, uLenUnit, uImp, parseGpxText, MAX_BIVY, itinDraftVal, MAX_WAYPOINTS, ADDR_GRADES, ADDR_AIDS, ADDR_HAZ, ADDR_STYLE, uElev, uDist, C, ADDR_YDS, SUB_LABEL, DISC_GEAR, intOnly, uDistMiUnit, uElevUnit, WP_TYPES, WP_SINGLE_TYPES, mtnOf, itinStoreVal, uLenIn, itinDraftToStructured } from "../../ClimbMatchCore.jsx";
import { breakdownRows } from "../../lib/breakdownRows.js";
import { pitchShortfall, anchorKind } from "../../lib/pitchAnchors.js";
import { isRackItem, rackItemKind, rackItemLine, rackQty, fmtRopeLen, rackRows, contribRack } from "../../lib/rack";
import { useRef, useState, useEffect, useContext, useMemo } from "react";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { useSession } from "../AuthContext.tsx";
import { USE_DB } from "../../lib/supabase";
import { useMyContributionStanding } from "../../lib/db";
import { ConfidenceCtx, ConfChip } from "../../lib/confidence.jsx";
import { _rapEdited, fmtRappels } from "../../lib/rappelEdits.js";
import { ROAD_KEYS, ACCESS_KEYS, TIMING_KEYS, CROWDS_KEYS, PARTNER_KEYS, SEASONAL_KEYS, EMERGENCY_KEYS, LOGISTICS_KEYS, CLIMATE_KEYS, SEASHAZ_KEYS, cleanMonths, MONTH_NAMES } from "../../lib/objKeys.js";
import { fmtSlingVal } from "../../lib/slingFormat.js";
import { tripTrailheadDraft, viaPitchSpans, spanLabel, tripTrailheadMerge } from "../../lib/approaches.js";
import { ROCK_OPTIONS, routeRock } from "../../lib/rockType";
import { effDistIsWholeTrip, recShapeOf } from "../../lib/outing.js";
import { campingGate } from "../../lib/campingGate.js";
import { CHIP, BTN } from "../../lib/buttonStyles.js";
import GradePicker from "./GradePicker.tsx";
import { POP_REMOVE, POP_CLOSE } from "../../lib/popupChrome.js";
import { EMPTY_ARR } from "../../lib/emptyArr.js";
import ItineraryEditor from "./ItineraryEditor.tsx";
import WaypointMapPicker from "./WaypointMapPicker.tsx";
import { clickable } from "../../lib/clickable";
import { createPortal } from "react-dom";
import { ContributionStandingNotice } from "../../lib/SafetyNotices.jsx";
import { openAppeal } from "../../lib/reportBus.js";
import CardHead from "./CardHead.tsx";
import DiscIcon from "./DiscIcon.tsx";
import { HINTS } from "../../lib/fieldHints.js";
import Chevron from "./Chevron.tsx";
import type { CSSProperties } from "react";
import type { Itinerary } from "./ItineraryEditor.tsx";
import type { Coord, Waypoint } from "./GPXMap.tsx";

type SFNum = string | number;
/** A stored pitch row (pitch_detail) as the route page hands it over. */
interface SFStoredPitch { pitch?: SFNum | null; n?: number | null; grade?: string | null; lengthM?: number | null; gear?: string | null; belay?: string | null; note?: string | null; notes?: string | null; anchor?: string | null; bolts?: SFNum | null; crux?: boolean | null }
/** A pitch row as the editor holds it: the app's own pitch shape, lengths in the climber's units. */
interface SFPitchRow { _src?: number; _pad?: boolean; pitch: SFNum; grade: string; lengthM: SFNum; gear: string; belay: string; notes: string; anchor: string; bolts: SFNum; crux: boolean }
/** A stored rappel station (rappel_detail). */
interface SFStoredRap { n?: number | null; lengthM?: number | null; anchor?: string | null; station?: string | null; hazards?: string[] | string | null; notes?: string | null; note?: string | null }
/** A rappel row as the editor holds it. */
interface SFRapRow { n: number; lengthM: SFNum; anchor: string; station: string; hazards: string; notes: string }
/** A stored waypoint. */
interface SFStoredWp { type?: string | null; name?: string | null; lat?: SFNum | null; lng?: SFNum | null; elev?: SFNum | null; distMi?: SFNum | null; note?: string | null; directions?: string | null }
/** A waypoint row as the editor holds it (coordinates and figures are the text boxes' strings). */
interface SFWpRow { type: string; name: string; lat: string; lng: string; elev: string; distMi: string; note: string; directions?: string }
/** A stored camp or bivy. */
interface SFStoredBivy { name?: string | null; type?: string | null; role?: string | null; elev?: SFNum | null; elevM?: number | null; capacity?: string | null; water?: string | null; permit?: string | null; notes?: string | null }
/** A camp row as the editor holds it. */
interface SFBivyRow { name: string; type: string; role: string; elev: string; capacity: string; water: string; permit: string; notes: string }
/** A stored CLIMBING ROUTE section. */
interface SFStoredSec { n?: number | null; label?: string | null; class?: string | null; notes?: string | null }
/** A section row as the editor holds it. */
interface SFSecRow { label: string; cls: string; notes: string }
/** A way in's own whole-trip record (`trip`): any of the route's camelCase keys. */
interface SFTrip { distKm?: number; outingShape?: string; gainFt?: number; gainM?: number; lossFt?: number; lossM?: number; approachLogistics?: Record<string, unknown> | null; timing?: { approachTimeHrs?: number } & Record<string, unknown>; gpxPts?: number[][]; elevPts?: number[]; bivy?: SFStoredBivy[]; [key: string]: unknown }
/** A GPX track as the way-in editor keeps it: the points and, when every point had one, the heights. */
interface SFTrack { pts: number[][]; elev: number[] | null }
/** A stored approach variant (approach_variants). */
interface SFStoredVar { name?: string | null; season?: string | null; distMi?: number | null; gainFt?: number | null; hours?: SFNum | null; notes?: string | null; whyThisWay?: string | null; baseFinding?: string | null; primary?: boolean; longForm?: boolean; storedRow?: boolean; viaRouteId?: string | null; viaPitches?: Record<string, unknown> | null; trip?: SFTrip | null; camps?: string[]; hazards?: string[] | string | null }
/** An approach row as the editor holds it. */
interface SFVarRow { name: string; season: string; distMi: string; gainFt: string; _orig?: { distMi?: number | null; gainFt?: number | null }; hours: string; notes: string; whyThisWay: string; baseFinding?: string; primary?: boolean; longForm?: boolean; storedRow?: boolean; viaRouteId?: string; viaPitches?: Record<string, unknown> | null; _origVia?: string; trip?: SFTrip | null; campSel?: string[] | null; mode: string; thName: string; thLat: string; thLng: string; tDist: string; tGain: string; tLoss: string; tHrs: string; tGpx: SFTrack | null; _tSeed?: { dist: string; gain: string; loss: string; t: SFTrip }; _gpxErr?: string; hazards: string }
/** One counted rack row (rack_items). */
interface SFRackRow { item?: string; sizes?: string | null; qty?: SFNum | null }
/** The rack builder's state: `"cam:#1": 2` counters, plus the rows it keeps, the picked hardware, its months and a free-text note. */
interface SFRack { keep?: SFRackRow[]; items?: string[]; itemMonths?: Record<string, number[]>; note?: string; [key: string]: number | string | SFRackRow[] | string[] | Record<string, number[]> | undefined }
/** The sub-key editors' state: a flat or dotted-key object. */
type SFObj = Record<string, unknown>;
/** The route, as far as this sheet reads it: every field optional and nullable, and anything else is carried as unknown. */
interface SFRoute {
  id?: string | number; name?: string; grade?: string; fa?: string; ffa?: string; fwa?: string; discipline?: string; style?: string; mountainId?: string;
  altNames?: string[]; variations?: Array<{ name?: string } | string | null>; highPointFt?: number; aspect?: string; season?: string; bestSeason?: string;
  protRating?: string; aidGrade?: string; ropeLen?: string; ropeType?: string; ropeNote?: string; pitches?: SFNum | null;
  rack?: string[]; detailedRack?: string; _rackCounted?: boolean; rackItems?: SFRackRow[]; whatToBring?: string[]; hazards?: string[]; objHaz?: string[] | string;
  watchOut?: string[]; features?: string[]; landing?: string; pads?: SFNum | null; startType?: string; location?: string; bolts?: SFNum | null; anchor?: string;
  fixedGear?: string; rockQuality?: string; wet?: string; routeFt?: number; cruxGrade?: string; rockGrade?: string; iceGrade?: string; face?: string;
  alpineGrade?: string; commitment?: string; condWindow?: string[] | string; distKm?: number; gainFt?: number; gainM?: number; lossFt?: number; lossM?: number;
  maxAngle?: SFNum | null; rappels?: unknown; rappelDetail?: SFStoredRap[] | null; rappelCountNote?: string; permits?: string; permitUrl?: string;
  access?: { permit?: string | null } & Record<string, unknown>; approach?: string; descentText?: string; descent?: string; overview?: string; desc?: string;
  beta?: string | string[]; proTips?: string[]; sun?: string; comms?: string; approachVariants?: SFStoredVar[]; climbingRoute?: SFStoredSec[];
  pitchDetail?: SFStoredPitch[] | null; waypoints?: SFStoredWp[] | null; bivy?: SFStoredBivy[]; itinerary?: Itinerary | null; _contribAgreed?: Record<string, number>;
  [key: string]: unknown;
}
/** The sheet's draft: what the climber has typed, by field key. */
interface SFVals {
  rack?: SFRack; itinerary?: Itinerary; pitchDetail?: SFPitchRow[]; rappelDetail?: SFRapRow[]; waypoints?: SFWpRow[]; bivy?: SFBivyRow[];
  climbingRoute?: SFSecRow[]; approachVariants?: SFVarRow[]; haz?: string[]; pitchCount?: string;
  road?: SFObj; access?: SFObj; timing?: SFObj; crowds?: SFObj; partnerRequirements?: SFObj; seasonalGuidance?: SFObj; emergency?: SFObj; approachLogistics?: SFObj; climate?: SFObj; seasonalHazards?: SFObj;
  [key: string]: unknown;
}
/** One sub-key of a structured column: [key, label, placeholder, kind ("num" | "enum" | "months" | text), options for enum/months]. */
type SFKey = [string, string, string, string?, Array<[SFNum, string]>?];
/** A suggestion the sheet hands to `onSubmit`, one per changed field. */
export interface SFContribution { type: string; field: string; label: string; value: unknown; wasEmpty: boolean; routeId?: string | number; note: string; title?: string; area: string; meta: string; status: string; when: string }
/** An edit already waiting for the owner, as the route page keys them by field. */
interface SFPending { live?: boolean; mine?: boolean; removes?: boolean; value?: unknown }
/** One row of the sheet: a route field, how to edit it and what it holds now. */
interface SFField { k: string; label: string; type: string; cur: string; unit?: string; opts?: Array<string | [string, string]> }
/** A discipline chip: label, category, and the discipline/style it writes. */
type SFDisc = [string, string, { discipline: string; style?: string }];

/* The stored vocabulary is exactly three codes — measured against the live catalog, where
   outing_shape is populated on 172 routes and holds only outback (141), loop (20), point (11).
   These labels are the ones the planner already uses in prose a few hundred lines down
   ("retracing its approach" / "loops back to the trailhead by a different line" / "finishes at
   a different trailhead"), so the contribute form names each shape the same way the screen
   explains it. A code with no entry falls through to "—" rather than rendering the raw token. */
const SHAPE_LABEL: Record<string,string>={outback:"Out and back",loop:"Loop",point:"Point to point"};
const DISC_HAZ: Record<string,string[]>={sport:["Loose rock","Runout","Warms up / sun-affected"],trad:["Rockfall","Loose rock","Runout","Serious exposure","Warms up / sun-affected"],bouldering:["Bad landing zone","Loose rock","Warms up / sun-affected"],aid:["Rockfall","Loose rock","Runout","Serious exposure"],ice:["Avalanche terrain","Rockfall","Serious exposure"],mixed:["Rockfall","Loose rock","Avalanche terrain","Serious exposure"],alpine:["Rockfall","Loose rock","Lightning / storms","Avalanche terrain","Crevasse hazard","Cornices","Serious exposure","Complex route-finding","River / creek crossing"],mountaineering:["Rockfall","Lightning / storms","Avalanche terrain","Crevasse hazard","Cornices","Serious exposure","Complex route-finding","River / creek crossing"],hiking:["Avalanche terrain","River / creek crossing","Complex route-finding","Serious exposure"],scrambling:["Rockfall","Loose rock","Serious exposure"]};
/* [4,5,6] -> "May–Jul"; [10,11,0,1] -> "Nov–Feb" (a run may wrap the new year); gaps split with ", ". */
function monthSpan(ms: number[]){const s=ms.slice().sort(function(a,b){return a-b;});if(!s.length)return "";const runs: number[][]=[];s.forEach(function(m){const last=runs[runs.length-1];if(last&&m===last[1]+1)last[1]=m;else runs.push([m,m]);});if(runs.length>1&&runs[0][0]===0&&runs[runs.length-1][1]===11){const w=runs.pop() as number[];runs[0][0]=w[0];}return runs.map(function(r){return r[0]===r[1]?MONTHS[r[0]]:MONTHS[r[0]]+"–"+MONTHS[r[1]];}).join(", ");}
/* A pitch label that is a plain number (3, "3") — not a range ("3-4") or a named leg ("Approach gully"). */
function isNumLbl(v: unknown){return typeof v==="number"?isFinite(v):(typeof v==="string"&&/^\s*\d+\s*$/.test(v));}
/* The pitch editor's rows in the PAGE's order, plus a not-described row for each pitch the route
   claims and does not describe (see routePitches in SuggestFix). `rows` is the draft built from
   pitch_detail, or [blank(1)] when there is none; `r` carries only pitchDetail and pitches. */
function padPitchRows(rows: SFPitchRow[],r: { pitchDetail?: unknown[] | null; pitches?: SFNum | null },blank: (n: number)=>SFPitchRow){const pd=(r.pitchDetail&&r.pitchDetail.length)?r.pitchDetail:[];const out=pd.length?rows.slice():[];
  if(out.length&&out.every(function(x){return isNumLbl(x.pitch);}))out.sort(function(a,b){return +a.pitch-+b.pitch;});
  const described=pd.length?breakdownRows(r).pitchCount:0;const claimed=+(r.pitches as SFNum)>0?Math.round(+(r.pitches as SFNum)):0;
  if(claimed>described&&(!pd.length||pitchShortfall(r,pd.length))&&(pd.length||claimed>1)){const top=out.reduce(function(m,x){return isNumLbl(x.pitch)?Math.max(m,+x.pitch):m;},0);for(let k=0;k<claimed-described;k++)out.push(Object.assign(blank(top+k+1),{_pad:true}));}
  return out.length?out:rows;}
/* The pin editor's TYPES on a crag route. A crag has no summit or camp; it has a car park, the trail
   junctions to the wall, water and hazards. The stored type stays "Trailhead" -- trailheadPoint()
   reads that first -- and is SHOWN as Parking, which is what it is at a crag. */
const WP_TYPES_CRAG=["Trailhead"];/* A crag climb carries no waypoints: the only pin a crag climber sets is where to PARK (stored Trailhead, shown as Parking). The walk in is the GPX line drawn on the CRAG MAP. A pin already stored with another type keeps its own chip (the concat below). */
function wpTypeLbl(t: string,disc: string){return t==="Trailhead"&&CRAG_CATS.includes(disc)?"Parking":t;}
/* shortDate now lives in ClimbMatchCore beside DLOCALE: three more surfaces needed it, and two
   copies of a date formatter is how this codebase ended up with four grade parsers. Its catch was
   also DEAD -- toLocaleDateString on an Invalid Date returns "Invalid Date" rather than throwing --
   so the core copy is hardened rather than moved verbatim. */
const ADDR_GEAR=["Quickdraws","Alpine draws","Single rack","Double rack","Micro/offset cams","Cams to #2","Cams to #3","Cams to #4","Cams to #5","Big cams (#5+)","Nuts / stoppers","Offset nuts","Tricams","Hexes","Ball nuts","Nut tool","Long slings","Cordelette","60m rope","70m rope","80m rope","Half / twin ropes","Tag line","Aiders / etriers","Pitons / beaks","Hooks","Ascenders","Ice screws","V-thread tool","Ice tools","Crampons","Pickets","Whippet","Mountaineering boots","Beacon · probe · shovel","Approach shoes","Helmet","Stick clip","Belay gloves","Headlamp","Crash pad(s)"];
/* HINTS moved to lib/fieldHints.js, so Add a climb can say the same thing about each field. */
function itinSummaryStr(it: Itinerary | null | undefined){return (it&&it.days&&it.days.length)?it.days.map(function(d,i){return "Day "+(i+1)+": "+(d.title||"");}).join(" · "):"";}
/* Drawn from what the catalog's own 845 anchor strings say, not invented: "gear" is far and
   away the most common (352), then bolted stations (48 + 32), walk-offs (36), ice screws,
   trees, slung horns and pickets. */
const PITCH_ANCHORS=["Bolted","Gear","Tree","Slung horn / block","Fixed pin","Picket","Ice screws","Walk-off (no belay)"];
/* A REMOVAL IS NOT AN EDIT LIKE THE OTHERS (0351, owner 2026-10-22: "people shouldn't be able to delete waypoints when editing"). The same test the database runs at insert (_edit_removes): the page holds rows and the edit has fewer, or fewer that carry a map pin. The database is the gate — it holds such an edit for the owner however many climbers send it; this copy only lets the sheet say so BEFORE the climber sends, and ask why. The list fields are the ones whose editor has a remove ✕. */
const REMOVABLE_LISTS: Record<string,(r: SFRoute)=>unknown>={waypoints:function(r){return r.waypoints;},pitchDetail:function(r){return r.pitchDetail;},rappelDetail:function(r){return r.rappelDetail;},bivy:function(r){return r.bivy;},approachVariants:function(r){return r.approachVariants;},climbingRoute:function(r){return r.climbingRoute;},haz:function(r){return r.hazards;}};
function listPins(a: Array<{ lat?: unknown; lng?: unknown } | null>){return a.filter(function(w){return w&&typeof w==="object"&&w.lat!=null&&w.lat!==""&&w.lng!=null&&w.lng!=="";}).length;}
function editRemoves(cur: unknown,nxt: unknown){if(!Array.isArray(cur)||!cur.length)return false;if(!Array.isArray(nxt)||nxt.length<cur.length)return true;return listPins(nxt)<listPins(cur);}
/* The edit sheet's rack steppers, and how they map onto rack_items rows (lib/rack.js). A row the steppers
   cannot state (quickdraws, a rope, pitons, "#0.5-#3", "one set") is KEPT as it is, shown under the
   steppers with a ✕, and submitted untouched, so correcting one cam never deletes the route's quickdraws. */
const SF_RACK_CATS: Array<[string,string[],string]>=[["Cams",["#0.3","#0.4","#0.5","#0.75","#1","#2","#3","#4","#5"],"cam"],["Nuts / stoppers",["#1","#2","#3","#4","#5","#6","#7","#8","#9","#10","#11","#12","#13"],"nut"],["Slings",["60cm","120cm","180cm","240cm"],"sling"],["Alpine draws",["Qty"],"adraw"]];
const SF_RACK_ITEM: Record<string,string>={cam:"cams",nut:"nuts",sling:"slings",adraw:"alpine draws"};
const SF_KIND_CAT: Record<string,string>={cams:"cam",nuts:"nut",stoppers:"nut",slings:"sling","alpine draws":"adraw"};
function sfRackSize(cat: string,sizes: unknown){let s=String(sizes==null?"":sizes).trim().toLowerCase();if(cat==="adraw")return s?null:"Qty";if(cat==="sling"){const m=s.match(/^(\d+)\s*cm$/);return m?m[1]+"cm":null;}s=s.replace(/^#/,"");return /^\d*\.?\d+$/.test(s)?"#"+String(parseFloat(s)):null;}
/* The stepper state a route's stored rack starts the editor in: {"cam:#1":2, …, keep:[rows]}. */
function rackSeedOf(route: SFRoute | null | undefined){const rk: SFRack={},keep: SFRackRow[]=[];((route&&route.rackItems)||[]).filter(isRackItem).forEach(function(x){const cat=SF_KIND_CAT[rackItemKind(x)];const c=cat?SF_RACK_CATS.find(function(y){return y[2]===cat;}):null;const sz=c?sfRackSize(cat,x.sizes):null;const q=Math.round(+(x.qty as SFNum));if(c&&sz&&c[1].indexOf(sz)>=0&&q>0){const k=cat+":"+sz;rk[k]=(rk[k] as number||0)+q;}else keep.push({item:x.item,sizes:x.sizes,qty:x.qty});});if(keep.length)rk.keep=keep;return rk;}
/* ...and the rows it submits, in the shape rack_items stores. */
function rackItemsOf(rk: SFRack){const out: Array<SFRackRow | string>=[];SF_RACK_CATS.forEach(function(c){c[1].forEach(function(s){const q=rk[c[2]+":"+s] as number;if(q>0)out.push(c[2]==="adraw"?{item:"alpine draws",qty:q}:{item:SF_RACK_ITEM[c[2]],sizes:s,qty:q});});});return out.concat((rk.keep||[]).filter(isRackItem));}
export interface SuggestFixProps {
  /** The route being edited (the row the page renders). */
  route: SFRoute;
  onClose: () => void;
  /** Receives one contribution per changed field (and one per changed discipline). */
  onSubmit?: ((c: SFContribution) => void) | null;
  /** Opens the trip-report form instead ("Climbed it? Log a trip report"); the link is absent without it. */
  onLog?: (() => void) | null;
  /** The field key to scroll to and open. */
  scrollTo?: string | null;
  /** Edits already waiting for review, by field key. */
  pending?: Record<string, SFPending> | null;
  /** The peak's own coordinate, for the waypoint map's ring. */
  peakCoord?: Coord | null;
  /** Values to open the sheet with, by field key (an edit pencil's seed). */
  prefill?: SFVals | null;
  /** The peak's other routes, offered as "by climbing X first" ways in. */
  approachSibs?: Array<{ id: string; name: string }> | null;
  /** The pitch (its _src index) to scroll to inside the pitch editor. */
  focusPitch?: SFNum | null;
}

/* Moved verbatim from RouteDetail.jsx (PR59); only the types were added. */
export default function SuggestFix({route,onClose,onSubmit,onLog,scrollTo,pending,peakCoord,prefill,approachSibs,focusPitch}: SuggestFixProps){
  const scrollRef=useRef<HTMLDivElement | null>(null);
  const [groupOpen,setGroupOpen]=useState<Record<string,boolean>>({});
  const jumpTo=function(k: string){setOpen(function(o){return Object.assign({},o,{[k]:true});});setTimeout(function(){if(scrollRef.current){const el=scrollRef.current.querySelector("#sf-section-"+k);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});}},60);};
  useEffect(function(){if(!scrollTo||!scrollRef.current)return;const t=setTimeout(function(){let el=focusPitch!=null?(scrollRef.current as HTMLDivElement).querySelector("[data-src=\""+focusPitch+"\"]"):null;if(!el)el=(scrollRef.current as HTMLDivElement).querySelector("#sf-section-"+scrollTo);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});},80);return function(){clearTimeout(t);};},[scrollTo,focusPitch]);
  // discipline chips → app convention. catTo = filtering category; disc = {discipline, style}
  const DISCS: SFDisc[]=[[DL.trad,"trad",{discipline:"rock",style:"Trad"}],[DL.sport,"sport",{discipline:"rock",style:"Sport"}],[DL.toprope,"toprope",{discipline:"toprope"}],[DL.bouldering,"bouldering",{discipline:"bouldering"}],[DL.alpine,"alpine",{discipline:"alpine"}],[DL.ice,"ice",{discipline:"ice"}],[DL.mixed,"mixed",{discipline:"mixed"}],[DL.aid,"aid",{discipline:"aid"}],[DL.mountaineering,"mountaineering",{discipline:"mountaineering"}],[DL.scrambling,"scrambling",{discipline:"scrambling"}]];
  const catToChip=function(c: string){if(c==="hiking")return "scrambling";return DISCS.some(function(d){return d[1]===c;})?c:"trad";};
  const [disc,setDisc]=useState(catToChip(catOf(route)));
  const [vals,setVals]=useState<SFVals>(function(){const p=prefill||{};/* A rack prefill (the RACK card's pencil) is the rack TEXT; the counts start from what is stored. */return p.rack?Object.assign({},p,{rack:Object.assign(rackSeedOf(route),p.rack)}):p;});const [note,setNote]=useState("");const [sent,setSent]=useState(false);const [sentN,setSentN]=useState(0);const [open,setOpen]=useState<Record<string,boolean>>({});/* There is no "I see this too" any more: every edit is held for the owner (0307–0309), so a second climber's agreement is information for the review queue, not a vote that can push a value live. */const _sfSess=useSession();const _sfUid=(USE_DB&&_sfSess&&_sfSess.user)?_sfSess.user.id:null;const _standQ=useMyContributionStanding(_sfUid);const _standing=(_standQ&&_standQ.data)||null;const _sfCx=useContext(ConfidenceCtx) as { levels?: Record<string,string> } | null;const _lvOf=function(k: string){return _sfCx&&_sfCx.levels?_sfCx.levels[k]:null;};
  // rack builder (keyed per use; shared across the single rack field)
  /* The rack starts from the route's stored counts (rackSeedOf) and becomes an edit only when touched. The Alpine draws stepper shows only where # Alpine draws has no box of its own: two places to type one count wrote it twice, once as a number and once as "Alpine draws: Qty ×8". okField is read at render, after it is defined. */
  const rackCats=function(){return SF_RACK_CATS.filter(function(c){return c[2]!=="adraw"||!okField("alpineDraws");});};
  const rack=vals.rack||rackSeedOf(route);const setRack=function(fn: (r: SFRack)=>SFRack){setVals(function(v){return Object.assign({},v,{rack:fn(v.rack||rackSeedOf(route))});});};
  const itin=vals.itinerary||{days:[blankItinDay()]};
  const setItin=function(next: Itinerary){setVals(function(v){return Object.assign({},v,{itinerary:next});});};
  /* `note` is a reserved key alongside the size counters. A researched rack is prose —
     "Typically climbed with no protection on the standard class 3-4 ramp; a rope and light
     rack are only useful if you take the direct summit-block finish" — and the size steppers
     cannot state that, let alone correct it. Without a free-text path the rack was the one
     field on the route that no contributor could fix. */
  const rackLinesOf=function(rk: SFRack){const gi=(rk.items||[]).map(function(it){const ms=(rk.itemMonths||{})[it];return (ms&&ms.length&&ms.length<12)?it+" ("+monthSpan(ms)+")":it;});const note=(rk.note||"").trim();return note?gi.concat([note]):gi;};
  const rackStr=function(rk: SFRack){const out=[];SF_RACK_CATS.forEach(function(c){const items=c[1].filter(function(s){return rk[c[2]+":"+s];}).map(function(s){return (s==="Qty"?"":s+" ")+"×"+rk[c[2]+":"+s];});if(items.length)out.push(c[0]+": "+items.join(", "));});(rk.keep||[]).forEach(function(x){out.push(rackItemLine(x));});const gi=(rk.items||[]).map(function(it){const ms=(rk.itemMonths||{})[it];return (ms&&ms.length&&ms.length<12)?it+" ("+monthSpan(ms)+")":it;});if(gi.length)out.push(gi.join(", "));const note=(rk.note||"").trim();if(note)out.push(note);return out.join("; ");};
  // Absorbed from the deleted `gear` field — the hardware the size steppers cannot express.
  const togRackItem=function(v: string){setRack(function(r){const arr=r.items||[];const had=arr.indexOf(v)>=0;const im=Object.assign({},r.itemMonths||{});if(had)delete im[v];return Object.assign({},r,{items:had?arr.filter(function(x){return x!==v;}):arr.concat([v]),itemMonths:im});});}; // eslint-disable-line @typescript-eslint/no-dynamic-delete -- the key is removed from a fresh copy of a keyed map, which is the point
  /* Some gear is only needed part of the year — crampons and an axe for the early-season snow,
     not in August. A picked item can name the months it is needed in; none means all year. */
  const togItemMonth=function(it: string,m: number){setRack(function(r){const im=Object.assign({},r.itemMonths||{});const cur=im[it]||[];im[it]=cur.indexOf(m)>=0?cur.filter(function(x){return x!==m;}):cur.concat([m]).sort(function(a,b){return a-b;});if(!im[it].length)delete im[it];return Object.assign({},r,{itemMonths:im});});}; // eslint-disable-line @typescript-eslint/no-dynamic-delete -- the key is removed from a fresh copy of a keyed map, which is the point
  /* Tap adds one, − takes one away. It used to cycle 1→5→0, so a route needing a sixth
     alpine draw or a triple set of cams could not be described. 60 is a sanity ceiling only. */
  const bumpRack=function(key: string,d: number){setRack(function(r){const n=Object.assign({},r);const q=Math.max(0,Math.min(60,(n[key] as number||0)+(d||1)));if(q===0)delete n[key];else n[key]=q;return n;});}; // eslint-disable-line @typescript-eslint/no-dynamic-delete -- the key is removed from a fresh copy of a keyed map, which is the point
  /* The pitch editor opened on ONE BLANK ROW even when the route already had a full
     pitch-by-pitch breakdown on the screen behind it — 919 catalog routes carry 3,569 pitch
     rows. So correcting pitch 7 meant retyping pitches 1-6 from memory, or submitting a
     one-pitch array that replaces all of them. Start from what is on file and edit that.

     Rows are held in the app's OWN pitch shape rather than a private {grade,len,notes} one.
     That private shape is why lengths vanished from both summary strings: pitchStr read
     pp.len while every stored row uses lengthM, and pendStr's mapper read pp.lengthM off rows
     the editor had just written as pp.len. One shape means what gets submitted is what
     PitchTable already renders. Prefill is no longer strictly IDENTITY: it converts the stored
     metres into the CLIMBER'S OWN UNITS, because the box asks in those units while the column
     stays canonical. The row SHAPE is still one shape -- only the length's unit differs between
     draft and column, exactly as itinDaysToDraft puts metres under the key `gainFt` for a
     metric climber. Reverting any one of those edges is silent; see the injection suite. */
  /* Editor rows are keyed by IDENTITY, not index. With index keys, removing a middle pitch or waypoint handed every later row's DOM state (focus, IME composition, scroll) to the wrong row. A WeakMap gives each row object a number the first time it renders; an edit or a renumber copies it onto the replacement object (keep), so a row keeps its key while its text changes. The derived row lists are memoised so an untouched row is the same object from render to render. */
  const rowKeys=useRef(new WeakMap<object,number>());const rowSeq=useRef(0);const keyFor=function(row: object){let k=rowKeys.current.get(row);if(k==null){k=++rowSeq.current;rowKeys.current.set(row,k);}return k;};const keep=function<T extends object>(from: object,to: T){const k=rowKeys.current.get(from);if(k!=null)rowKeys.current.set(to,k);return to;};
  const blankPitch=function(n: number): SFPitchRow{return {pitch:n,grade:"",lengthM:"",gear:"",belay:"",notes:"",anchor:"",bolts:"",crux:false};};const blankRap=function(n: number): SFRapRow{return {n:n,lengthM:"",anchor:"",station:"",hazards:"",notes:""};};
  /* EVERY PITCH THE PAGE SHOWS (owner's note, 2026-10-24: "the pitch by pitch submission doesn't show all
     the current pitches"). Three ways it fell short of ROUTE BREAKDOWN: (1) a route claiming more pitches
     than it describes ("The route lists 8 pitches, so 5 are not described here") opened on the 3 described,
     with nowhere to put the other 5 — they are rows now, marked not described, and an untouched one submits
     nothing; (2) it always sorted by number, so a route with named legs ("Approach gully") came out in a
     different order from the page, which sorts only when every label is a number; (3) a named leg was
     headed "Pitch Approach gully". */
  const routePitches=useMemo(function(){return padPitchRows((route.pitchDetail&&route.pitchDetail.length)
    ?route.pitchDetail.map(function(p,i){return {_src:i,pitch:p.pitch!=null?p.pitch:(p.n!=null?p.n:i+1),grade:p.grade||"",lengthM:p.lengthM!=null?uLenN(p.lengthM) as number:"",gear:p.gear||"",belay:p.belay||"",notes:p.note!=null?p.note:(p.notes||""),anchor:p.anchor||"",bolts:p.bolts!=null?p.bolts:"",crux:!!p.crux};})
    :[blankPitch(1)],{pitchDetail:route.pitchDetail,pitches:route.pitches},blankPitch);},[route.pitchDetail,route.pitches]);
  const pitches=vals.pitchDetail||routePitches;const setPitches=function(fn: (p: SFPitchRow[])=>SFPitchRow[]){setVals(function(v){return Object.assign({},v,{pitchDetail:fn(v.pitchDetail||routePitches)});});};
  const pitchStr=function(ps: SFPitchRow[],sep?: string){return ps.map(function(pp,i){const bits=[pp.grade,pp.lengthM?pp.lengthM+uLenUnit():"",pp.anchor?("anchor: "+pp.anchor):"",(pp.bolts!==""&&pp.bolts!=null)?(pp.bolts+" bolts"):"",pp.crux?"crux":"",pp.gear,pp.notes].filter(Boolean);return bits.length?("P"+(pp.pitch!=null?pp.pitch:i+1)+": "+bits.join(", ")):"";}).filter(Boolean).join(sep||"; ");};
  const setPitch=function(i: number,k: string,v: unknown){setPitches(function(p){return p.map(function(x,j){return j===i?keep(x,Object.assign({},x,{[k]:v})):x;});});};/* Renumber after a move or a removal: the numbered pitches count 1, 2, 3 in their new order; a named leg keeps its name. */const relabel=function(list: SFPitchRow[]): SFPitchRow[]{let c=0;return list.map(function(x){if(!isNumLbl(x.pitch))return x;c++;return keep(x,Object.assign({},x,{pitch:c}));});};const addPitch=function(){setPitches(function(p){return p.concat([blankPitch(p.filter(function(x){return isNumLbl(x.pitch);}).length+1)]);});};const rmPitch=function(i: number){setPitches(function(p){return relabel(p.filter(function(_,j){return j!==i;}));});};/* Move a pitch one place; the renumber follows the new order, as remove does. */const mvPitch=function(i: number,d: number){setPitches(function(p){const j=i+d;if(j<0||j>=p.length)return p;const q=p.slice();const t=q[i];q[i]=q[j];q[j]=t;return relabel(q);});};
  /* RAPPELS, STATION BY STATION — the editor the rappel table never had (0307–0309). Same identity-keyed rows and the same units-at-the-edges rule as pitches: lengths are typed in the climber's units and stored in metres; hazards are one per line. Rows are prefilled from rappel_detail so a climber corrects the table rather than retyping it. */
  /* Honours _rapEdited like every reader of the station table (check:correction-readers): once climbers' corrected count is on the route, the editor starts from a blank row rather than re-offering the table they overrode. */const routeRaps=useMemo<SFRapRow[]>(function(){return (route.rappelDetail&&route.rappelDetail.length&&!_rapEdited(route))?route.rappelDetail.map(function(r,i){return {n:r.n!=null?r.n:i+1,lengthM:r.lengthM!=null?uLenN(r.lengthM) as number:"",anchor:r.anchor||"",station:r.station||"",hazards:Array.isArray(r.hazards)?r.hazards.join("\n"):(r.hazards||""),notes:r.notes||r.note||""};}).sort(function(a,b){return a.n-b.n;}):[blankRap(1)];},[route.rappelDetail]); // eslint-disable-line react-hooks/exhaustive-deps -- draft seeded from the stored rappel list only; the rest of route must not reset a form in progress
  const raps=vals.rappelDetail||routeRaps;const setRaps=function(fn: (p: SFRapRow[])=>SFRapRow[]){setVals(function(v){return Object.assign({},v,{rappelDetail:fn(v.rappelDetail||routeRaps)});});};
  const rapStr=function(rs: SFRapRow[] | null | undefined,sep?: string){return (rs||[]).map(function(r,i){const bits=[r.lengthM?r.lengthM+uLenUnit():"",r.anchor,r.station?("station: "+r.station):"",r.hazards?String(r.hazards).split("\n").filter(Boolean).join("/"):"",r.notes].filter(Boolean);return bits.length?("R"+(r.n!=null?r.n:i+1)+": "+bits.join(", ")):"";}).filter(Boolean).join(sep||"; ");};
  const setRap=function(i: number,k: string,v: unknown){setRaps(function(p){return p.map(function(x,j){return j===i?keep(x,Object.assign({},x,{[k]:v})):x;});});};const addRap=function(){setRaps(function(p){return p.concat([blankRap(p.length+1)]);});};const rmRap=function(i: number){setRaps(function(p){return p.filter(function(_,j){return j!==i;}).map(function(x,j){return keep(x,Object.assign({},x,{n:j+1}));});});};const mvRap=function(i: number,d: number){setRaps(function(p){const j=i+d;if(j<0||j>=p.length)return p;const q=p.slice();const t=q[i];q[i]=q[j];q[j]=t;return q.map(function(x,k){return keep(x,Object.assign({},x,{n:k+1}));});});};
  /* road / access builders. Both columns are jsonb OBJECTS, not scalars, which is why they had
     no contribute path for so long — every other field here is a value, a list or a purpose-built
     builder. They are the two blocks on the route page that go stale independently of the rock:
     a washout, a gate that opens late, a permit system that changed this season. The catalog
     cannot know any of that; the last party does.

     THE SUB-KEY NAMES ARE NOT A GUESS. Each one is the key the panel's own reader looks at, and
     where a reader accepts more than one spelling the form writes the CANONICAL one:

       * `access` carries TWO land-manager keys — `land_manager` on 399 of 400 sampled rows and
         `landManager` on 8. Display reads `ac.land_manager||ac.landManager`, so writing the
         canonical one shows immediately AND leaves a legacy value in place as the fallback it
         already is. Same story for the pass: `parking_pass` (397) is the rendered row, while
         `passRequired` (7) feeds a different row and is offered separately.
       * Seasonal closures render as `ac.closures||ac.closure||ac.seasonal`; the form writes
         `closures`, first in that chain.
       * `road` is single-convention camelCase across the board — name / driveNote / status /
         seasonalGate — and all four render in GETTING THERE.

     Anything the form does NOT offer (`_raw`, `permitZone`, a legacy `landManager`) survives,
     because the merge in ClimbMatch.jsx assigns over a copy of the existing object rather than
     replacing it. Replacing would silently delete enrichment nobody asked to remove. */
  
  
  /* The PUBLISHED times — the guidebook figure the planner shows beside Scarf's Rule and, since
     #819, beside what parties actually logged. A fourth element marks a key numeric: these are
     hours and must merge back as NUMBERS, because every reader does arithmetic on them
     (`totalHrs - approachTimeHrs - descentTimeHrs` derives the summit time) and a string would
     make that concatenate rather than subtract. `recommendedStart` is deliberately free prose —
     the live column holds 401 distinct values like "5:00 AM from camp" and "Alpine start from
     high camp", which no picker can express.
     `sectionBreakdown` is NOT offered, and that is the whole reason the merge below copies
     rather than assigns: it is a nested array of {hrs,note,fromTo,section} on 546 routes, and a
     form that cannot author it must not be able to delete it. */
  
  /* Keyed by input type, and the type is deliberately the same string as the route property, so
     one lookup serves the key list, the current value and the draft state. It replaces a
     `f.type==="road"?ROAD_KEYS:ACCESS_KEYS` ternary that appeared in four places — a third
     object field would have had to be added to all four, and missing one reads as a field that
     renders but never submits. */
/* A sub-key may be DOTTED (`fitnessSpec.hiking`). partner_requirements.fitnessSpec is an
     OBJECT on 473 of 504 populated routes — 460 carry `hiking` and 455 `packWeight` — so a single
     text row there would offer to replace a structured fact with a sentence. The panel renders
     both shapes, so nothing would break; it would just be a quiet downgrade, and one that could
     never be agreed anyway because free prose cannot cluster. */
  const _dget=function(o: unknown,p: string){const q=String(p).split(".");let v: unknown=o;for(let i=0;i<q.length;i++){if(v==null||typeof v!=="object")return undefined;v=(v as SFObj)[q[i]];}return v;};
  const _dset=function(o: unknown,p: string,val: unknown){const q=String(p).split("."),r: SFObj=Object.assign({},o||{});let t=r;for(let i=0;i<q.length-1;i++){t[q[i]]=Object.assign({},t[q[i]]||{});t=t[q[i]] as SFObj;}t[q[q.length-1]]=val;return r;};
  const OBJ_KEYS={road:ROAD_KEYS as SFKey[],access:ACCESS_KEYS as SFKey[],timing:TIMING_KEYS as SFKey[],crowds:CROWDS_KEYS as SFKey[],partnerRequirements:PARTNER_KEYS as SFKey[],seasonalGuidance:SEASONAL_KEYS as SFKey[],emergency:EMERGENCY_KEYS as SFKey[],approachLogistics:LOGISTICS_KEYS as SFKey[],climate:CLIMATE_KEYS as SFKey[],seasonalHazards:SEASHAZ_KEYS as SFKey[]} as Record<string,SFKey[]>;
/* An enum row stores the CODE the column already holds (solitudeRating is a number 1-5 on
     499 routes, not a phrase), and shows the label. Printing the raw code in the summary line
     would make the collapsed field read "solitude: 4". */
  const objLabel=function(k: SFKey,v: unknown){if(k[3]!=="enum"||!k[4])return v;const hit=k[4].filter(function(o){return String(o[0])===String(v);})[0];return hit?hit[1]:v;};
  const objStr=function(keys: SFKey[],o: unknown){if(!o)return "";return keys.map(function(k){const v=_dget(o,k[0]);/* a months map reads "Jan Low, Feb Moderate", its blanks dropped, so a picker set back to "—" is no change */if(k[3]==="months"){const _cm=cleanMonths(v) as Record<string,string> | null;return _cm?k[1]+": "+Object.keys(_cm).map(function(m){return m.slice(0,3)+" "+_cm[m];}).join(", "):null;}/* `String(v)` HERE PUT "[object Object]" ON EVERY ROUTE CARRYING seasonal_hazards. The dotted key specs are the real fix (see the note on SEASHAZ_KEYS), and this is the fail-safe: `crevasses` is a string on 453 rows and an OBJECT on 34, so no single key spec is right for it, and the next column to drift shape would reintroduce the defect. fmtSlingVal is the app's own leaf flattener — despite the name it is generic (string, number, array, keyed object) — so there is one flattener rather than two that drift. */const s=(v!=null&&typeof v==="object")?fmtSlingVal(v):v;return (s==null||String(s).trim()==="")?null:k[1]+": "+s;}).filter(Boolean).join(" · ");};
  const _clip=function(s: string){return s.length>44?s.slice(0,44)+"…":s;};
  /* `cur` drives three things, and "—" is load-bearing in all of them: the collapsed summary
     line, `wasEmpty` (which decides whether one climber can fill a blank or three must agree),
     and the reference string. An access block that exists but holds only keys this form does not
     offer reads as "—", which is correct — there is nothing here for a climber to confirm. */
  const roadCur=function(r: SFRoute | null | undefined){const s=objStr(ROAD_KEYS as SFKey[],r&&r.road);return s?_clip(s):"—";};
  const accessCur=function(r: SFRoute | null | undefined){const s=objStr(ACCESS_KEYS as SFKey[],r&&r.access);return s?_clip(s):"—";};
  const road=vals.road||{};const setRoad=function(k: string,v: unknown){setVals(function(p){const o=Object.assign({},p.road||{});o[k]=v;return Object.assign({},p,{road:o});});};
  const access=vals.access||{};const setAccess=function(k: string,v: unknown){setVals(function(p){const o=Object.assign({},p.access||{});o[k]=v;return Object.assign({},p,{access:o});});};
  /* `cur` drives the collapsed summary AND wasEmpty, which decides whether one climber can
     fill a blank or three must agree. */
  const varCur=function(r: SFRoute | null | undefined){const a=(r&&r.approachVariants)||[];if(!a.length)return "—";return _clip(a.map(function(x){return x.name||"unnamed way in";}).join(" · "));};
  const secCur=function(r: SFRoute | null | undefined){const a=(r&&r.climbingRoute)||[];if(!a.length)return "—";return _clip(a.slice().sort(function(x,y){return (x.n||0)-(y.n||0);}).map(function(x){return x.label||("Section "+(x.n||"?"));}).join(" · "));};
  const timingCur=function(r: SFRoute | null | undefined){const s=objStr(TIMING_KEYS as SFKey[],r&&r.timing);return s?_clip(s):"—";};
  const objSet=function(field: string){return function(k: string,v: unknown){setVals(function(p){const o=_dset(p[field]||{},k,v);const n: SFVals={};n[field]=o;return Object.assign({},p,n);});};};
  const timing=vals.timing||{};const setTiming=objSet("timing");
  const objCur=function(keys: SFKey[]){return function(r: SFRoute | null | undefined,f: string){const s=objStr(keys,r&&r[f]);return s?_clip(s):"—";};};
  const climateCur=objCur(CLIMATE_KEYS as SFKey[]);const seasHazCur=objCur(SEASHAZ_KEYS as SFKey[]);const crowdsCur=objCur(CROWDS_KEYS as SFKey[]),partnerCur=objCur(PARTNER_KEYS as SFKey[]),seasonalCur=objCur(SEASONAL_KEYS as SFKey[]),emergencyCur=objCur(EMERGENCY_KEYS as SFKey[]),logisticsCur=objCur(LOGISTICS_KEYS as SFKey[]);
  const crowdsV=vals.crowds||{},setCrowdsV=objSet("crowds");
  const partnerV=vals.partnerRequirements||{},setPartnerV=objSet("partnerRequirements");
  const seasonalV=vals.seasonalGuidance||{},setSeasonalV=objSet("seasonalGuidance");
  const emergencyV=vals.emergency||{},setEmergencyV=objSet("emergency");
  const logisticsV=vals.approachLogistics||{},setLogisticsV=objSet("approachLogistics");
  
  const climateV=vals.climate||{},setClimateV=objSet("climate");
  const seasHazV=vals.seasonalHazards||{},setSeasHazV=objSet("seasonalHazards");
  const OBJ_STATE={road:[road,setRoad],access:[access,setAccess],timing:[timing,setTiming],crowds:[crowdsV,setCrowdsV],partnerRequirements:[partnerV,setPartnerV],seasonalGuidance:[seasonalV,setSeasonalV],emergency:[emergencyV,setEmergencyV],approachLogistics:[logisticsV,setLogisticsV],climate:[climateV,setClimateV],seasonalHazards:[seasHazV,setSeasHazV]} as Record<string,[SFObj,(k: string,v: unknown)=>void]>;
  // waypoints builder — structured rows so a confirmed edit writes a real array, not text (a text override used to crash the waypoints list/map, see WP_TYPES-driven renderInput below)
  const blankWp=function(): SFWpRow{return {type:"Junction",name:"",lat:"",lng:"",elev:"",distMi:"",note:"",directions:""};};
  const [activeWpIdx,setActiveWpIdx]=useState(0);
  /* Same defect the pitch editor had, and the same fix: this opened on one blank Junction
     row while the route's real waypoints sat listed on the screen behind it, so "edit
     waypoints" could only ever ADD one — correcting the trailhead coordinate meant retyping
     every other waypoint or wiping them. The row shape here is the editor's (lat/lng as
     strings for the text inputs), so stringify on the way in and let the existing submit path
     parse on the way out. */
  const routeWps=useMemo<SFWpRow[]>(function(){return (route.waypoints&&route.waypoints.length)
    ?route.waypoints.map(function(w){return {type:w.type||"Junction",name:w.name||"",lat:w.lat!=null?String(w.lat):"",lng:w.lng!=null?String(w.lng):"",elev:w.elev!=null?String(w.elev):"",distMi:w.distMi!=null?String(w.distMi):"",note:w.note||""};})
    :[CRAG_CATS.includes(catOf(route))?Object.assign(blankWp(),{type:"Trailhead"}):blankWp()];},[route.waypoints]); // eslint-disable-line react-hooks/exhaustive-deps -- draft seeded from the stored waypoint list only; the rest of route must not reset a form in progress
  /* CAMPING & BIVY is contributable from here. It was the one section a climber could look at,
     disagree with, and have no way to correct: `bivy` was in neither FIELDS nor SS, and the
     panel's edit pencil opened the WAYPOINTS editor, which edits a different store. Every one of
     the ~380 routes carrying camping got it from an enrichment pass, so the person who actually
     slept there could not fix a word of it.
     Modelled on the waypoints editor directly below, including its unit handling: `elev` is
     stored in FEET, so what the climber types is converted through uImp() on submit exactly as
     a waypoint elevation is. See campElevFt() for the read side, which also accepts the legacy
     metres spelling. */
  /* The option list is the catalog's own vocabulary rather than an invented one. 290 stored
     `class` values canonicalise to these for 89% of sections (3 x63, 2-3 x53, 2 x27, 4 x24,
     3-4 x24), with 11% low-5th technical steps on otherwise unroped ground. A 16-option picker
     reproduces ~74% of stored values EXACTLY; the rest are compound ("2-3 with occasional class
     3-4 moves") and belong in the section's own notes, because this renders as a CHIP. */
  const SEC_CLASSES=["Class 1","Class 1-2","Class 2","Class 2-3","Class 3","Class 3-4","Class 4","Class 4-5","Glacier travel","5.0-5.4","5.5","5.6","5.7","5.8","5.9","5.10"];
  const MAX_SEC=24;
  const blankSec=function(): SFSecRow{return {label:"",cls:"",notes:""};};
  const MAX_VAR=8;
  const blankVar=function(): SFVarRow{return Object.assign({name:"",season:"",distMi:"",gainFt:"",hours:"",notes:"",whyThisWay:"",hazards:""},tripDraft({}));};
  /* WHERE A WAY IN STARTS, AND WHAT THE WHOLE TRIP IS VIA IT (lib/approaches.js). Without this a
     climber could add a way in only as a prose card: the page could not switch to it, so its
     trailhead, track and numbers never reached the map, the planner or the trip plan. A way in is
     either ANOTHER ROUTE on this peak (`viaRouteId` — the Southeast Ridge reached by the Fisher
     Chimneys) or its OWN TRAILHEAD with whole-trip numbers and an optional GPX track (`trip`).
     Numbers are typed in the climber's units and seeded from the stored ones; `_tSeed` keeps the
     seeded strings so an untouched box writes back the exact stored value, not a unit round-trip. */
  const tripDraft=function(v: SFStoredVar | null | undefined): Pick<SFVarRow,"mode"|"thName"|"thLat"|"thLng"|"tDist"|"tGain"|"tLoss"|"tHrs"|"tGpx"|"_tSeed">{const t: SFTrip=v&&v.trip&&typeof v.trip==="object"?v.trip:{};const imp=uImp();
    const dS=t.distKm!=null?String(+(imp?t.distKm/1.609344:t.distKm).toFixed(1)):"";
    const gS=t.gainFt!=null?String(imp?t.gainFt:Math.round(t.gainFt/3.28084)):"";
    const lS=t.lossFt!=null?String(imp?t.lossFt:Math.round(t.lossFt/3.28084)):"";
    return {mode:v&&v.viaRouteId?"via":(v&&v.trip?"own":""),...tripTrailheadDraft(t),
      tDist:dS,tGain:gS,tLoss:lS,tHrs:t.timing&&t.timing.approachTimeHrs!=null?String(t.timing.approachTimeHrs):"",
      tGpx:Array.isArray(t.gpxPts)&&t.gpxPts.length?{pts:t.gpxPts,elev:Array.isArray(t.elevPts)?t.elevPts:null}:null,
      _tSeed:{dist:dS,gain:gS,loss:lS,t:t}};};
  const loadVarGpx=function(idx: number,file: File | null | undefined){if(!file)return;const rd=new FileReader();rd.onload=function(){const g=parseGpxText(String(rd.result||""));const trk=(g&&Array.isArray(g.track)?g.track:[]) as number[][];
    if(trk.length<2){setAvar(idx,"_gpxErr","That file has no track in it — export the recorded track, not just waypoints.");return;}
    /* Thinned to 2,000 points: a phone records one a second, and the route's own tracks are a few hundred. */
    const step=Math.max(1,Math.ceil(trk.length/2000));const keep=trk.filter(function(_,i){return i%step===0||i===trk.length-1;});
    const elev=keep.every(function(p){return p[2]!=null;})?keep.map(function(p){return p[2];}):null;
    setAvars(function(p){return p.map(function(x,j){if(j!==idx)return x;const o=Object.assign({},x,{tGpx:{pts:keep.map(function(q){return [q[0],q[1]];}),elev:elev},_gpxErr:""});
      /* The track's first point IS where it starts: fill the trailhead pin from it only when the climber left it blank. */
      if(!o.thLat&&!o.thLng){o.thLat=String(+keep[0][0].toFixed(5));o.thLng=String(+keep[0][1].toFixed(5));}return o;});});};
    rd.readAsText(file);};
  const blankBivy=function(): SFBivyRow{return {name:"",type:"camp",role:"",elev:"",capacity:"",water:"",permit:"",notes:""};};
  /* The box is typed in the READER's units (its caption says ft or m) and structuredVal converts it back to feet, so a stored height is shown in those units too. It was prefilled in FEET for everyone: a metric climber who touched any camp saved every site's height 3.28x too high. */
  const _bivyElevBox=function(b: SFStoredBivy){const ft=b.elev!=null&&b.elev!==""?parseFloat(b.elev as string):(b.elevM!=null?b.elevM*3.28084:NaN);return isNaN(ft)?"":String(Math.round(uImp()?ft:ft/3.28084));};
  const _bivyShown=(Array.isArray(route.bivy)?route.bivy:[]).filter(function(b){return !(b&&b.role==="hidden");});
  const routeBivy=_bivyShown.length
    ? _bivyShown.map(function(b){return {name:b.name||"",type:b.type||"camp",role:b.role||"",elev:_bivyElevBox(b),capacity:b.capacity||"",water:b.water||"",permit:b.permit||"",notes:b.notes||""};})
    :[blankBivy()];
  const bivies=vals.bivy||routeBivy;
  const setBivies=function(fn: (p: SFBivyRow[])=>SFBivyRow[]){setVals(function(v){return Object.assign({},v,{bivy:fn(v.bivy||routeBivy)});});};
  const setBivy=function(i: number,k: string,v: unknown){setBivies(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};
  const addBivy=function(){if(bivies.length>=MAX_BIVY)return;setBivies(function(p){return p.concat([blankBivy()]);});};
  const delBivy=function(i: number){setBivies(function(p){return p.length<=1?[blankBivy()]:p.filter(function(_,j){return j!==i;});});};
/* CLIMBING ROUTE sections. Prefilled from what is on file, like the bivy and pitch editors
     and for the reason both record: opening on one blank row while the route's real sections sit
     on the screen behind it means "edit" can only ever ADD. */
  const routeSecs: SFSecRow[]=(Array.isArray(route.climbingRoute)&&route.climbingRoute.length)
    ? route.climbingRoute.slice().sort(function(a,b){return (a.n||0)-(b.n||0);}).map(function(x){return {label:x.label||"",cls:x.class||"",notes:x.notes||""};})
    :[blankSec()];
  const secs=vals.climbingRoute||routeSecs;
  const setSecs=function(fn: (p: SFSecRow[])=>SFSecRow[]){setVals(function(v){return Object.assign({},v,{climbingRoute:fn(v.climbingRoute||routeSecs)});});};
  const setSec=function(i: number,k: string,v: unknown){setSecs(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};
  const addSec=function(){if(secs.length>=MAX_SEC)return;setSecs(function(p){return p.concat([blankSec()]);});};
  const delSec=function(i: number){setSecs(function(p){return p.length<=1?[blankSec()]:p.filter(function(_,j){return j!==i;});});};
/* APPROACH variants. Prefilled from what is on file for the reason the bivy and pitch editors
     record: opening on a blank row while the route's real variants sit on screen behind it means
     "edit the approaches" can only ever ADD one. hazards is an ARRAY in the column and a textarea
     here, one per line, because 4,644 stored hazards are 96% unique prose. */
  const routeVars: SFVarRow[]=(Array.isArray(route.approachVariants)&&route.approachVariants.length)
    ? route.approachVariants.map(function(v){return {name:v.name||"",season:v.season||"",
        /* SEEDED IN THE CLIMBER'S OWN UNITS, and _orig carries the numbers the boxes were
           seeded FROM: converting on both edges makes an UNTOUCHED field lossy (4.8 km back
           to 2.98 mi), so editing one variant's notes would move every distance on the
           route. The APPROACHES panel already renders these through uDistMi/uElev, so before
           this the card said 4.8 km and the box under it said 3. */
        distMi:itinDraftVal(v,"distMi"),gainFt:itinDraftVal(v,"gainFt"),
        _orig:{distMi:v.distMi,gainFt:v.gainFt},
        hours:v.hours!=null?String(v.hours):"",notes:v.notes||"",whyThisWay:v.whyThisWay||"",
        /* Not edited here, but CARRIED: the form has no box for them, and dropping them on submit
           meant any edit to a way in silently deleted its base-finding note, its MOST USED mark and
           the mark saying which way in the route's paragraph describes. */
        baseFinding:v.baseFinding||"",primary:v.primary===true,longForm:v.longForm===true,storedRow:v.storedRow===true,
        /* ...and the WAY-IN LINK (lib/approaches.js) the same way: dropping `viaRouteId` would turn the
           Southeast Ridge's "via Fisher Chimneys" back into a prose card on the next accepted edit. */
        viaRouteId:v.viaRouteId||"",viaPitches:v.viaPitches&&typeof v.viaPitches==="object"?v.viaPitches:null,_origVia:v.viaRouteId||"",trip:v.trip&&typeof v.trip==="object"?v.trip:null,
        /* WHICH CAMPS this way in uses: its own trip's camps, or for the way in the row itself describes, the names it keeps. null = never chosen, so nothing is rewritten. */
        campSel:(v.trip&&Array.isArray(v.trip.bivy)?v.trip.bivy.map(function(c){return c&&c.name;}).filter(Boolean):Array.isArray(v.camps)?v.camps.slice():null) as string[] | null,
        ...tripDraft(v),
        hazards:(Array.isArray(v.hazards)?v.hazards.filter(Boolean):(v.hazards?[v.hazards]:[])).join("\n")};})
    :[blankVar()];
  const avars=vals.approachVariants||routeVars;
  const setAvars=function(fn: (p: SFVarRow[])=>SFVarRow[]){setVals(function(v){return Object.assign({},v,{approachVariants:fn(v.approachVariants||routeVars)});});};
  const setAvar=function(i: number,k: string,v: unknown){setAvars(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};
  const addAvar=function(){if(avars.length>=MAX_VAR)return;setAvars(function(p){return p.concat([blankVar()]);});};
  const delAvar=function(i: number){setAvars(function(p){return p.length<=1?[blankVar()]:p.filter(function(_,j){return j!==i;});});};
  const wps=vals.waypoints||routeWps;const setWps=function(fn: (p: SFWpRow[])=>SFWpRow[]){setVals(function(v){return Object.assign({},v,{waypoints:fn(v.waypoints||routeWps)});});};
  const setWp=function(i: number,k: string,v: unknown){setWps(function(p){return p.map(function(x,j){return j===i?keep(x,Object.assign({},x,{[k]:v})):x;});});};const addWp=function(){if(wps.length>=MAX_WAYPOINTS)return;setWps(function(p){return p.concat([blankWp()]);});setActiveWpIdx(wps.length);};const rmWp=function(i: number){setWps(function(p){return p.filter(function(_,j){return j!==i;});});setActiveWpIdx(function(a){return a>=i?Math.max(0,a-1):a;});};
  const gs=(ADDR_GRADES as Record<string,string[]>)[disc]||(ADDR_GRADES as Record<string,string[]>)[route.discipline as string]||[];const tr=function(x: unknown){return x?(String(x).length>44?String(x).slice(0,44)+"…":String(x)):"—";};const onf=function(x: ArrayLike<unknown> | null | undefined){return (x&&x.length)?"✓ on file":"—";};const campNames=function(x: SFStoredBivy[] | undefined){const ns=(Array.isArray(x)?x:[]).map(function(b){return b&&b.name?String(b.name).trim():"";}).filter(Boolean);return ns.length?ns.join(" · "):onf(x);};
  /* `anchorType` and `gear` both used to sit here and both were dead ends.
  
     `anchorType` was a route-level single-select ("Bolted / Gear anchor / Tree") whose answer
     NOTHING rendered — there is no anchor_type column, dbRouteToCamel never maps one, and no
     read site exists in the app — so a climber could answer it and see nothing change. It also
     asked the wrong question: anchors vary BY PITCH (101 routes already use more than one kind
     across their own pitches), which is a fact the per-pitch editor can state and a single
     select cannot. Replaced by the anchor row in the pitch editor, which feeds the Anchor tile
     PitchTable already renders.
  
     `gear` was a multi-select labelled "Gear / rack" showing `route.rack` as its current value
     — the same value, under a near-identical label, sitting directly above the `rack` builder,
     on exactly the five disciplines where both appeared. Both also wrote to the same place:
     ClimbMatch's merge maps gear→rack AND rack→rack, then concatenates the two into
     gearTiers.required. The item checklist it offered is now a row inside the rack builder, so
     there is one control for "what does this route take" instead of two that disagree. */
  const FIELDS=[{k:"grade",label:"Grade",type:"grade",cur:route.grade||"—"},{k:"fa",label:"First ascent",type:"text",cur:route.fa||"—"},{k:"ffa",label:"First free ascent",type:"text",cur:route.ffa||"—"},{k:"fwa",label:"First winter ascent",type:"text",cur:route.fwa||"—"},{k:"altNames",label:"Also known as (comma-separated)",type:"text",cur:(Array.isArray(route.altNames)&&route.altNames.length)?route.altNames.join(", "):"—"},{k:"variations",label:"Variations (comma-separated)",type:"text",cur:(Array.isArray(route.variations)&&route.variations.length)?route.variations.map(function(v){return v&&typeof v==="object"?(v.name||""):String(v||"");}).filter(Boolean).join(", "):"—"},{k:"highPointFt",label:"High point",type:"num",unit:uImp()?"ft":"m",cur:route.highPointFt!=null?(uImp()?Math.round(route.highPointFt)+" ft":Math.round(route.highPointFt/3.28084)+" m"):"—"},{k:"rock",label:"Rock type",type:"single",opts:(ROCK_OPTIONS as string[]).map(function(x){return [x,x];}),cur:(function(){const rr=routeRock(route);return rr?rr.label:"—";})()},{k:"aspect",label:"Aspect (sun exposure)",type:"single",opts:["N","NE","E","SE","S","SW","W","NW"].map(function(x){return [x,x];}),cur:route.aspect||"—"},{k:"season",label:"Best season",type:"single",opts:["Spring","Summer","Fall","Winter","Year-round"].map(function(x){return [x,x];}),cur:route.season||"—"},/* NOT a second copy of `season` above. That one is the WINDOW rendered in the header strap and is deliberately a short enum; this is the prose "When to go:" line on Conditions, and the two are separate columns precisely so a paragraph never lands in the strap — see the season note in CLAUDE.md. Labelled for where it appears rather than by column name, since "Best season" is already taken by the enum. */{k:"bestSeason",label:"When to go (detail)",type:"long",cur:tr(route.bestSeason)},{k:"protRating",label:"Protection rating",type:"single",opts:["G","PG-13","R","X"].map(function(x){return [x,x];}),cur:route.protRating||"—"},{k:"draws",label:"# Quickdraws",type:"num",unit:"draws",cur:(rackQty(route,"quickdraws")!=null?String(rackQty(route,"quickdraws")):"—")},{k:"screws",label:"# Ice screws",type:"num",unit:"screws",cur:(rackQty(route,"ice screws")!=null?String(rackQty(route,"ice screws")):"—")},{k:"aidGrade",label:"Aid grade",type:"single",opts:ADDR_AIDS.map(function(x){return [x,x];}),cur:route.aidGrade||"—"},{k:"ropeLen",label:"Rope length",type:"pickTwo",opts:[["50 m","50 m"],["60 m","60 m"],["70 m","70 m"],["80 m","80 m"]],cur:route.ropeLen?fmtRopeLen(route.ropeLen):"—"},{k:"ropeType",label:"Rope type",type:"single",opts:[["Single","Single"],["Half / twin (2 ropes)","Half / twin (2 ropes)"],["Static (fixed line)","Static (fixed line)"]],cur:route.ropeType||"—"},{k:"ropeNote",label:"Ropework note",type:"text",cur:route.ropeNote||"—"},{k:"alpineDraws",label:"# Alpine draws",type:"num",unit:"draws",cur:(rackQty(route,"alpine draws")!=null?String(rackQty(route,"alpine draws")):"—")},{k:"pitchCount",label:"How many pitches?",type:"num",unit:"pitches",cur:((route.pitches as number)>1?String(route.pitches):"—")},{k:"rack",label:"Rack & gear",type:"rack",cur:([rackRows(route).filter(function(x: SFRackRow){const _k=rackItemKind(x);return _k!=="quickdraws"&&_k!=="ice screws"&&_k!=="alpine draws"&&_k!=="crash pads";}).map(rackItemLine).join(", "),((contribRack(route)||[]).join(", ")||(route._rackCounted?"":(route.detailedRack||((route.rack&&route.rack.length)?route.rack.join(", "):""))))].filter(Boolean).join("; ")||"—")},{k:"whatToBring",label:"Route-specific essentials",type:"long",cur:((route.whatToBring&&route.whatToBring.length)?route.whatToBring.join("\n"):"—")},{k:"haz",label:"Hazards",type:"multi",/* A hazard seeded from the page ("Fixed gear: Spinning hanger") is not a stock option; keep it as a chip so it shows as picked and can be un-picked. */opts:(DISC_HAZ[disc]||ADDR_HAZ).concat((Array.isArray(vals.haz)?vals.haz:[]).filter(function(h){return (DISC_HAZ[disc]||ADDR_HAZ).indexOf(h)<0;})),cur:(route.hazards&&route.hazards.length?route.hazards.join(", "):"—")},{k:"objHaz",label:"Objective hazards",type:"multi",opts:["Rockfall","Avalanche","Crevasse","Serac","Cornice"],cur:(route.objHaz?(Array.isArray(route.objHaz)?(route.objHaz.length?route.objHaz.join(", "):"—"):route.objHaz):"—")},{k:"watchOut",label:"Watch out for",type:"long",cur:((route.watchOut&&route.watchOut.length)?route.watchOut.join("\n"):"—")},{k:"style",label:"Style / character",type:"multi",opts:ADDR_STYLE,cur:(route.features&&route.features.length?route.features.join(", "):"—")},{k:"landing",label:"Landing",type:"single",opts:["Flat","Sloped","Bad/dangerous"].map(function(x){return [x,x];}),cur:route.landing||"—"},{k:"pads",label:"Crash pads",type:"num",unit:"pads",cur:(route.pads!=null?String(route.pads):"—")},{k:"startType",label:"Start",type:"single",opts:["Stand","Sit"].map(function(x){return [x,x];}),cur:route.startType||"—"},{k:"location",label:"Location on the wall",type:"text",cur:route.location||"—"},{k:"bolts",label:"# Bolts",type:"num",unit:"bolts",cur:(+(route.bolts as SFNum)>0?String(Math.round(+(route.bolts as SFNum))):"—")},{k:"anchor",label:"Top anchor",type:"text",cur:route.anchor||"—"},{k:"fixedGear",label:"Fixed gear",type:"text",cur:route.fixedGear||"—"},{k:"rockQuality",label:"Rock quality",type:"text",cur:route.rockQuality||"—"},{k:"wet",label:"Wet / seepage",type:"text",cur:route.wet||"—"},{k:"length",label:"Height / length",type:"num",unit:uImp()?"ft":"m",cur:(route.routeFt?uElev(route.routeFt):"—")},{k:"crux",label:"Crux grade",type:"grade",cur:route.cruxGrade||"—"},{k:"rockGrade",label:"Rock grade",type:"grade",cur:route.rockGrade||"—"},{k:"iceGrade",label:"Ice grade",type:"single",opts:["WI2","WI2+","WI3","WI3+","WI4","WI4+","WI5","WI5+","WI6","AI2","AI3","AI3+","AI4","M4","M4+","M5","M5+","M6","M6+"].map(function(x){return [x,x];}),cur:route.iceGrade||"—"},{k:"face",label:"Face / route-group",type:"text",cur:route.face||"—"},{k:"alpineGrade",label:"Alpine grade",type:"single",opts:["F","F+","PD-","PD","PD+","AD-","AD","AD+","D-","D","D+","TD-","TD","TD+","ED1","ED2","ED3","I","II","III","IV","V","VI"].map(function(x){return [x,x];}),cur:route.alpineGrade||"—"},{k:"commit",label:"Commitment grade (I–VI)",type:"single",opts:["I","II","III","IV","V","VI"].map(function(x){return [x,x];}),cur:route.commitment||"—"},{k:"condWindow",label:"Conditions window",type:"multi",opts:["Year-round","Best in spring","Best in summer","Best in fall","Best in winter","After freeze-thaw stabilizes","Before spring melt/runoff","Dry rock only","Avoid monsoon/rain season","Check current beta before going"],cur:(route.condWindow?(Array.isArray(route.condWindow)?(route.condWindow.length?route.condWindow.join(", "):"—"):route.condWindow):"—")},/* WHICH distance, in the label: `dist_km` is the walk in, ONE WAY, which the page doubles into its Round trip tile — except on a recorded loop or point-to-point, where it is the whole outing. A bare "Distance" beside a header reading twice the number invited a climber to "correct" it to the round trip. */{k:"dist",label:effDistIsWholeTrip(route)?"Total distance":"Approach, one way",type:"num",unit:uImp()?"mi":"km",cur:route.distKm?uDist(route.distKm):"—"},{k:"gain",label:"Elev. gain",type:"num",unit:uImp()?"ft":"m",cur:(route.gainFt||route.gainM)?uElev(route.gainFt||(route.gainM as number)*3.28084):"—"},{k:"loss",label:"Elev. loss",type:"num",unit:uImp()?"ft":"m",cur:(route.lossFt||route.lossM)?uElev(route.lossFt||(route.lossM as number)*3.28084):"—"},{k:"angle",label:"Max angle (°)",type:"num",unit:"°",cur:route.maxAngle?route.maxAngle+"°":"—"},{k:"rap",label:"Rappels",type:"text",cur:(fmtRappels(route.rappels)||"—")},{k:"rappelDetail",label:"Rappels, station by station",type:"rappels",cur:((route.rappelDetail&&route.rappelDetail.length&&!_rapEdited(route))?(route.rappelDetail.length+" station"+(route.rappelDetail.length!==1?"s":"")):"—")},/* The note that sits ABOVE the rappel table and says how the count was arrived at ("depending on rope length / number of ropes carried"). It rendered with no way to correct it, which matters more here than elsewhere: check:rappel-lengths exists because a table can be repaired while this note still states the method that produced the wrong numbers, and the next enrichment pass then re-derives them. */{k:"rappelCountNote",label:"Rappel count note",type:"long",cur:tr(route.rappelCountNote)},{k:"outingShape",label:"Trip shape",type:"single",opts:[["outback","Out and back"],["loop","Loop"],["point","Point to point"]],cur:(SHAPE_LABEL[recShapeOf(route)]||"—")},{k:"permit",label:"Permits",type:"text",cur:route.permits||(route.access&&route.access.permit)||"—"},{k:"permitUrl",label:"Permit link",type:"text",cur:route.permitUrl||"—"},{k:"road",label:"Road & driving",type:"road",cur:roadCur(route)},{k:"access",label:"Access & permits",type:"access",cur:accessCur(route)},{k:"timing",label:"Published times",type:"timing",cur:timingCur(route)},{k:"approachLogistics",label:"Trailhead & directions",type:"approachLogistics",cur:logisticsCur(route,"approachLogistics")},{k:"climate",label:"Climate & forecast zone",type:"climate",cur:climateCur(route,"climate")},{k:"seasonalHazards",label:"Seasonal hazards",type:"seasonalHazards",cur:seasHazCur(route,"seasonalHazards")},{k:"crowds",label:"Crowds & solitude",type:"crowds",cur:crowdsCur(route,"crowds")},{k:"partnerRequirements",label:"What a partner needs",type:"partnerRequirements",cur:partnerCur(route,"partnerRequirements")},{k:"seasonalGuidance",label:"Best window",type:"seasonalGuidance",cur:seasonalCur(route,"seasonalGuidance")},{k:"emergency",label:"Emergency contacts",type:"emergency",cur:emergencyCur(route,"emergency")},{k:"approach",label:"Approach",type:"long",cur:tr(route.approach)},{k:"descentText",label:"Descent detail",type:"long",cur:tr(route.descentText||route.descent)},{k:"overview",label:"Route description",type:"long",cur:tr(route.overview||route.desc)},{k:"beta",label:"Beta & pro tips",type:"long",cur:tr(Array.isArray(route.beta)?route.beta.join(" "):(route.beta||route.desc))},{k:"proTips",label:"Pro tips (one per line)",type:"long",cur:(Array.isArray(route.proTips)&&route.proTips.length)?route.proTips.join("\n"):"—"},{k:"sun",label:"Sun — when the wall gets it",type:"text",cur:tr(route.sun)},{k:"comms",label:"Cell / sat coverage",type:"single",opts:["Full cell coverage","Spotty cell coverage","No cell coverage","Satellite (inReach/SPOT) recommended","Emergency call box nearby"].map(function(x){return [x,x];}),cur:route.comms||"—"},{k:"approachVariants",label:"Ways in (approach variants)",type:"variants",cur:varCur(route)},{k:"climbingRoute",label:"Climbing route sections",type:"sections",cur:secCur(route)},{k:"pitchDetail",label:"Pitch-by-pitch",type:"pitches",cur:onf(route.pitchDetail)},{k:"waypoints",label:CRAG_CATS.includes(disc)?"Parking spot":"Key waypoints",type:"waypoints",cur:onf(route.waypoints)},{k:"bivy",label:"Camping & bivy",type:"bivy",cur:/* the camps by NAME, so the row and ON THE APP NOW say which sites are on file, not just "✓ on file" */campNames(route.bivy)},{k:"itinerary",label:"Day-by-day plan",type:"itinerary",cur:(route.itinerary&&route.itinerary.days&&route.itinerary.days.length)?(route.itinerary.days.length+" day"+(route.itinerary.days.length!==1?"s":"")+" on file"):"—"},{k:"name",label:"Route name",type:"text",cur:route.name||"—"}] as SFField[];
  const cat=disc;const roped=["trad","sport","alpine","ice","mixed","aid","mountaineering"].indexOf(cat)>=0;const alpiney=["alpine","mountaineering","ice","mixed","scrambling"].indexOf(cat)>=0;const boulder=cat==="bouldering";
  // single-pitch detection (drives the crux-grade hint) — selected discipline + route's real pitch count
  const singlePitch=boulder||(vals.pitchCount?parseInt(vals.pitchCount)<=1:(route.pitches!=null&&(route.pitches as number)<=1));
  // discipline rules: which fields make sense for the SELECTED discipline (live-driven by the chips above)
  const DROP={/* Route-specific essentials (whatToBring) have no reader on a crag page: GEAR & ESSENTIALS is mounted off CRAG_CATS only, and the RACK card is the crag's gear (owner note 2026-10-21: "remove gear and essentials from sport, trad and bouldering routes"). Offering the field there collected text that reached no screen. */whatToBring:CRAG_CATS.includes(cat),commit:!alpiney,rockGrade:!alpiney,iceGrade:!alpiney,face:!alpiney,dist:!alpiney,gain:!alpiney,loss:!alpiney,/* `waypoints` is offered on crags too: it is the only editor that takes a PIN, and the crag card's "Add parking" opens it. Dropped there, a crag route's parking could be read but never added or moved (owner, 2026-10-15: "I'm not seeing parking location for sport, trad or bouldering"). */waypoints:!(alpiney||CRAG_CATS.includes(cat)),itinerary:!alpiney,/* A RACK card renders for every discipline: RouteRackBox off CRAG_CATS, CragRack on them. Bouldering
   and sport are dropped here because CragRack's pencil opens their own count instead (`pads`,
   `draws`); every other discipline, ice, mountaineering and scrambling included, edits the rack
   itself. Offering it only to trad/aid/alpine/mixed once left those three showing a rack with no
   way to correct it. Match the cards. */
rack:(boulder||cat==="sport"),protRating:!(cat==="trad"||cat==="sport"),/* `draws:true` made this the one field in the form unreachable for EVERY discipline — it sat in
   the Protection & gear group, in SS, and in the help text, and could never be filled in. Its
   stated reason does not hold: nothing derives a draw count from a bolt count (there is no
   route-level bolt column). `gearReadout` only parses a number back out of the free-text gear
   prose, so a bolted route with no prose says nothing and had no way to be corrected. Offer it
   where a draw count is the standard beta. */draws:!(cat==="sport"||cat==="trad"||cat==="mixed"||cat==="aid"),screws:!(cat==="ice"||cat==="mixed"),aidGrade:cat!=="aid",ropeLen:!roped||cat==="mountaineering",ropeType:!roped||cat==="mountaineering"||cat==="sport",alpineDraws:!(cat==="trad"||cat==="aid"||cat==="alpine"||cat==="mixed"),pitchCount:!roped,angle:!(cat==="mountaineering"||cat==="scrambling"),landing:!boulder,pads:!boulder,startType:!boulder,alpineGrade:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"||cat==="mixed"),condWindow:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"||cat==="mixed"),objHaz:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"),/* approach is offered for boulders: the walk to the boulder is real beta, and the APPROACH placeholder on a boulder opens it. */pitchDetail:boulder,rap:boulder,descentText:boulder,crux:singlePitch,/* The crag ROUTE FACTS rows (owner, 2026-10-07: every fact a discipline has is shown, and an empty one can be filled). Offered exactly where that card lists them. */location:!CRAG_CATS.includes(cat),rockQuality:!CRAG_CATS.includes(cat),wet:!CRAG_CATS.includes(cat),bolts:cat!=="sport",anchor:!(CRAG_CATS.includes(cat)&&!boulder),fixedGear:!(cat==="trad"||cat==="aid")} as Record<string,boolean>;
  /* A camp is edited only where CAMPING & BIVY can render it: the Planner section is gated on campingGate(), so on a crag line that climbs no peak the field collected camps that reached no screen (the same reason whatToBring is dropped on a crag). */
  if(!campingGate(route))DROP.bivy=true;
  const okField=function(k: string){return !DROP[k];};
  /* The group names camping when it holds the camp editor, so a climber scanning the headings for camp or bivy finds it. */
  const APPR=DROP.bivy?"Approach & descent":"Approach, descent & camping";
  const GROUPS=[["Basics",["name","grade","alpineGrade","rockGrade","iceGrade","crux","face","aidGrade","pitchCount","fa","ffa","fwa","altNames","variations","highPointFt","style","rock","length","location"]],["Protection & gear",["protRating","bolts","anchor","fixedGear","ropeLen","ropeType","ropeNote","draws","alpineDraws","screws","rack","whatToBring","climbingRoute","pitchDetail"]],["Bouldering",["landing","pads","startType"]],[APPR,["road","approachLogistics","approach","approachVariants","descentText","rap","rappelDetail","rappelCountNote","dist","gain","loss","angle","waypoints","bivy"]],["Conditions & character",["aspect","season","rockQuality","wet","bestSeason","condWindow","haz","objHaz","watchOut","overview","beta","comms","climate","seasonalHazards","seasonalGuidance","crowds","proTips","sun"]],["Logistics",["access","permit","permitUrl","commit","outingShape","timing","itinerary","partnerRequirements","emergency"]]] as Array<[string,string[]]>;
  // per-group accent color
  const ACCENT: Record<string,string[]>={"Basics":[C.blue,C.blueBg],"Protection & gear":[C.amber,C.amberBg],"Bouldering":[C.teal,C.tealDim],[APPR]:[C.green,C.greenBg],"Conditions & character":[C.blue,C.blueBg],"Logistics":[C.textMuted,C.borderLight]};
  const GROUPED=GROUPS.map(function(g): [string,SFField[]]{return [g[0],g[1].map(function(k){return FIELDS.find(function(f){return f.k===k;});}).filter(function(f){return f&&okField(f.k);}) as SFField[]];}).filter(function(g){return g[1].length;});
  // value helpers per field
  const valOf=function(f: SFField){return vals[f.k];};
  // unit-ambiguous numerics: the inputs are labelled in the SUBMITTER's units, so canonicalize here (routeFt/distKm/gainM/lossM) instead of at merge time — the merge runs in the READER's session and would otherwise convert with the wrong setting (3.28x error) and stop two agreeing climbers from ever converging in sameEditValue
  const CANON: Record<string,(v: string)=>number | null>={length:function(v){const n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n:n*3.28084);},/* high_point_ft is FEET, like length_m is metres: typed in the climber's units, stored canonical. */highPointFt:function(v){const n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n:n*3.28084);},dist:function(v){const n=parseFloat(v);return isNaN(n)?null:Math.round((uImp()?n*1.60934:n)*100)/100;},gain:function(v){const n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n/3.28084:n);},loss:function(v){const n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n/3.28084:n);}};
  const UNCANON: Record<string,(n: number)=>string>={length:function(n){return uImp()?Math.round(n)+" ft":Math.round(n/3.28084)+" m";},highPointFt:function(n){return uImp()?Math.round(n)+" ft":Math.round(n/3.28084)+" m";},dist:function(n){return uImp()?(Math.round(n/1.60934*100)/100)+" mi":(Math.round(n*100)/100)+" km";},gain:function(n){return uImp()?Math.round(n*3.28084)+" ft":Math.round(n)+" m";},loss:function(n){return uImp()?Math.round(n*3.28084)+" ft":Math.round(n)+" m";}};
  const wpStr=function(ws: SFStoredWp[] | null | undefined,sep?: string){return (ws||[]).filter(function(w){return w.name||w.lat||w.note;}).map(function(w){return w.type+(w.name?" — "+w.name:"");}).join(sep||"; ");};
  const pendStr=function(f: SFField,v: unknown){if(v==null)return "";if(UNCANON[f.k]&&v!==""&&!isNaN(parseFloat(v as string)))return UNCANON[f.k](parseFloat(v as string));if(f.type==="waypoints")return wpStr(v as SFWpRow[]);if(f.type==="pitches")return pitchStr((v||[]) as SFPitchRow[]);if(f.type==="rappels")return rapStr((v||[]) as SFRapRow[]);if(f.type==="itinerary")return itinSummaryStr(v as Itinerary);if(OBJ_KEYS[f.type])return objStr(OBJ_KEYS[f.type],v);if(Array.isArray(v))return v.join(", ");return String(v);};
  /* WHAT IS ON THE APP NOW, IN FULL. `cur` is clipped to 44 characters because it is a one-line
     row summary and the "from → to" line a contribution records; opening a field to edit it showed
     that same clip, so a climber correcting an approach saw its first seven words and had to guess
     at the rest. FULL holds the untruncated text for every field whose `cur` is clipped, and the
     list-shaped fields (pitches, rappels, pins, ways in, sections) put one item per line. */
  const FULL: Record<string,unknown>={bestSeason:route.bestSeason,rappelCountNote:route.rappelCountNote,approach:route.approach,descentText:route.descentText||route.descent,overview:route.overview||route.desc,beta:Array.isArray(route.beta)?route.beta.join(" "):(route.beta||route.desc),sun:route.sun,
    approachVariants:((route.approachVariants)||[]).map(function(x){return x.name||"unnamed way in";}).join("\n"),
    climbingRoute:((route.climbingRoute)||[]).slice().sort(function(x,y){return (x.n||0)-(y.n||0);}).map(function(x){return x.label||("Section "+(x.n||"?"));}).join("\n")};
  Object.keys(OBJ_KEYS).forEach(function(k){FULL[k]=objStr(OBJ_KEYS[k],route[k]);});
  const curRefStr=function(f: SFField){if(f.type==="pitches")return (route.pitchDetail&&route.pitchDetail.length)?pitchStr(routePitches,"\n"):"";if(f.type==="rappels")return (route.rappelDetail&&route.rappelDetail.length&&!_rapEdited(route))?rapStr(routeRaps,"\n"):"";if(f.type==="waypoints")return (route.waypoints&&route.waypoints.length)?wpStr(route.waypoints,"\n"):"";if(f.type==="itinerary")return itinSummaryStr(route.itinerary);if(f.cur==null||f.cur==="—")return "";if(FULL[f.k]!=null&&String(FULL[f.k]).trim())return String(FULL[f.k]).trim();return Array.isArray(f.cur)?f.cur.join(", "):String(f.cur);};
  const filledStr=function(f: SFField){const v=vals[f.k];if(f.type==="multi")return (v&&(v as string[]).length)?(v as string[]).join(", "):"";if(f.type==="rack")return v?rackStr(v as SFRack):"";if(f.type==="pitches")return v?pitchStr(v as SFPitchRow[]):"";if(f.type==="rappels")return v?rapStr(v as SFRapRow[]):"";if(f.type==="waypoints")return v?wpStr(v as SFWpRow[]):"";if(f.type==="itinerary")return v?itinSummaryStr(v as Itinerary):"";if(OBJ_KEYS[f.type])return v?objStr(OBJ_KEYS[f.type],v):"";return v!=null?String(v).trim():"";};
  /* "Start from this text" copies what is on the app into a text box, so a climber can fix one
     word of a long approach instead of retyping it. A copy left as it is changes nothing, so it
     must not count as a suggestion: an empty box already means "no change", and a box that still
     reads exactly what is on the app means the same. Whitespace alone is not an edit either. */
  const _txtField=function(f: SFField){return f.type==="text"||f.type==="long";};const _wsNorm=function(x: unknown){return String(x==null?"":x).replace(/\s+/g," ").trim();};
  const sameAsApp=function(f: SFField){return _txtField(f)&&_wsNorm(vals[f.k])!==""&&_wsNorm(vals[f.k])===_wsNorm(curRefStr(f));};
  const isFilled=function(f: SFField){return filledStr(f)!==""&&!sameAsApp(f);};
  const changedFields=FIELDS.filter(function(f){return isFilled(f);});
  const allEmpty=changedFields.every(function(f){return !f.cur||f.cur==="—";});
  const fld: CSSProperties={width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none"};
  const bivyCap=function(t: string){return <span style={{display:"block",fontSize:11,fontWeight:700,color:C.textMuted,margin:"0 0 3px 2px"}}>{t}</span>;};
  const sm=function(on: boolean){return {...CHIP,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub};};
  const setV=function(k: string,v: unknown){setVals(function(p){return Object.assign({},p,{[k]:v});});};
  const togMulti=function(k: string,o: string){setVals(function(p){const arr=(p[k]||[]) as string[];return Object.assign({},p,{[k]:arr.indexOf(o)>=0?arr.filter(function(x){return x!==o;}):arr.concat([o])});});};
  // render a single field's input by type
  const renderInput=function(f: SFField){const v=valOf(f) as string;
    if(f.type==="grade"){const fgs=f.k==="rockGrade"?ADDR_YDS:gs;return fgs.length?<GradePicker scale={fgs} value={v} label={f.label} onChange={function(g){setV(f.k,g);}}/>:<input aria-label={f.label} value={v||""} onChange={function(e){setV(f.k,e.target.value);}} placeholder="e.g. 5.10a" style={fld}/>;}
    /* A long list (every rock type is ~50) is a dropdown: fifty chips would bury the rest of the form. */
    if(f.type==="single"&&(f.opts as Array<[string,string]>).length>12)return <select value={v||""} onChange={function(e){setV(f.k,e.target.value);}} aria-label={f.label} style={{width:"100%",background:C.surface,color:C.text,border:"1px solid "+C.border,borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"inherit"}}><option value="">Choose…</option>{(f.opts as Array<[string,string]>).map(function(o){return <option key={o[0]} value={o[0]}>{o[1]}</option>;})}</select>;
    if(f.type==="single")return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(f.opts as Array<[string,string]>).map(function(o){const on=v===o[0];return <button key={o[0]} onClick={function(){setV(f.k,on?"":o[0]);}} style={sm(on)}>{o[1]}</button>;})}</div>;
    /* Up to TWO choices, kept in option order and written "60 m / 70 m". A route that a 60 m rope
       gets down is also fine on a 70 m, and one length could not say so. A third tap is refused
       rather than silently dropping one of the first two. */
    if(f.type==="pickTwo"){const _pk=String(v||"").split(/\s*\/\s*/).filter(Boolean);return <div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(f.opts as Array<[string,string]>).map(function(o){const on=_pk.indexOf(o[0])>=0;const full=!on&&_pk.length>=2;return <button key={o[0]} aria-pressed={on} disabled={full} onClick={function(){const nx=on?_pk.filter(function(x){return x!==o[0];}):_pk.concat([o[0]]);setV(f.k,(f.opts as Array<[string,string]>).map(function(p){return p[0];}).filter(function(p){return nx.indexOf(p)>=0;}).join(" / "));}} style={Object.assign({},sm(on),full?{opacity:0.45,cursor:"default"}:null)}>{o[1]}</button>;})}</div><div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"Pick up to two — e.g. 60 m and 70 m when either works."}</div></div>;}
    if(f.type==="multi")return <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{(f.opts as string[]).map(function(o){const on=((v as unknown as string[])||[]).indexOf(o)>=0;return <button key={o} onClick={function(){togMulti(f.k,o);}} style={sm(on)}>{o}</button>;})}</div>;
    if(f.type==="num")return <div style={{display:"flex",alignItems:"center",gap:8}}><input aria-label={f.label} value={v||""} onChange={function(e){setV(f.k,e.target.value.replace(/[^0-9.]/g,""));}} inputMode="numeric" placeholder="0" style={Object.assign({},fld,{flex:1})}/>{f.unit?<span style={{fontSize:13,color:C.textMuted,fontWeight:600}}>{f.unit}</span>:null}</div>;
    if(f.type==="text")return <input aria-label="Add a value" value={v||""} onChange={function(e){setV(f.k,e.target.value);}} placeholder="Add a value" style={fld}/>;
    if(f.type==="long")return <textarea aria-label="Add the full text here" value={v||""} onChange={function(e){setV(f.k,e.target.value);}} rows={String(v||"").length>160?8:3} placeholder="Add the full text here" style={Object.assign({},fld,{resize:"vertical",lineHeight:1.5,minHeight:78})}/>;
    if(f.type==="rack"){return <div>{rackCats().map(function(c){return <div key={c[0]} style={{marginBottom:9}}><div style={{...SUB_LABEL,marginBottom:6}}>{c[0]}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{c[1].map(function(s){const key=c[2]+":"+s;const qty=rack[key]||0;const nm=c[0]+" "+(s==="Qty"?"":s);return <span key={key} style={{display:"inline-flex",alignItems:"stretch"}}><button aria-label={"Add one: "+nm+(qty?", "+qty+" so far":"")} onClick={function(){bumpRack(key,1);}} style={{padding:"7px 10px",borderRadius:qty?"10px 0 0 10px":10,border:"1px solid "+(qty?C.blue:C.border),background:qty?C.blueBg:C.surface,color:qty?C.onSolid:C.textSub,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{s==="Qty"?"Draws":s}{qty?" ×"+qty:""}</button>{qty?<button aria-label={"Remove one: "+nm} onClick={function(){bumpRack(key,-1);}} style={{padding:"7px 9px",borderRadius:"0 10px 10px 0",border:"1px solid "+C.blue,borderLeft:"none",background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:800,cursor:"pointer"}}>{"−"}</button>:null}</span>;})}</div></div>;})}<div style={{fontSize:11,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{"Tap a size to add one — tap again for more. Tap − to take one away."}</div>{(function(){/* Stored rows the steppers cannot state. A quickdraw, screw or pad row whose own box this sheet offers is edited there, so it is carried, not listed twice. */const OWN: Record<string,string>={"quickdraws":"draws","ice screws":"screws","crash pads":"pads"};const keep=(rack.keep||[]).map(function(x,i){return {x:x,i:i};}).filter(function(o){const own=OWN[rackItemKind(o.x)];return !(own&&okField(own));});if(!keep.length)return null;return <div style={{marginTop:9}}><div style={{...SUB_LABEL,marginBottom:6}}>{"Also on this rack"}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{keep.map(function(o){const t=rackItemLine(o.x);return <span key={o.i} style={{display:"inline-flex",alignItems:"center",gap:2,padding:"2px 2px 2px 10px",borderRadius:10,border:"1px solid "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:12.5,fontWeight:700}}>{t}<button aria-label={"Remove from the rack: "+t} onClick={function(){setRack(function(r){return Object.assign({},r,{keep:(r.keep||[]).filter(function(_y,j){return j!==o.i;})});});}} style={POP_REMOVE}>{"✕"}</button></span>;})}</div></div>;})()}{(function(){/* No chip for something this section already asks for in its own box: a "Rope" chip beside Rope length, or "Quickdraws" beside # Quickdraws, wrote the same fact twice in two spellings. The size steppers above ARE the trad rack. */const OWN_BOX: Record<string,string>={"Rope":"ropeLen","60m rope":"ropeLen","70m rope":"ropeLen","80m rope":"ropeLen","Half / twin ropes":"ropeType","Quickdraws":"draws","Alpine draws":"alpineDraws","Ice screws":"screws","Trad rack / protection":"rack","Single rack":"rack","Double rack":"rack"};const opts=((DISC_GEAR as Record<string,string[]>)[disc]||ADDR_GEAR).filter(function(o){return !(OWN_BOX[o]&&okField(OWN_BOX[o]));});if(!opts||!opts.length)return null;return <div style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.borderLight}}><div style={{...SUB_LABEL,marginBottom:6}}>{"Other gear"}</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{opts.map(function(o){const on=(rack.items||[]).indexOf(o)>=0;return <button key={o} onClick={function(){togRackItem(o);}} aria-pressed={on} style={{padding:"7px 10px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub,fontSize:12,fontWeight:600,cursor:"pointer"}}>{o}</button>;})}</div><div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"Tools and hardware a rack size cannot describe."+(CRAG_CATS.includes(disc)?"":" An axe, crampons or glacier kit is listed under GEAR & ESSENTIALS, not RACK.")}</div>{(rack.items||[]).length?<div style={{marginTop:10}}><div style={{...SUB_LABEL,marginBottom:4}}>{"Only needed some months?"}</div><div style={{fontSize:11,color:C.textMuted,marginBottom:7,lineHeight:1.4}}>{"Tap the months an item is needed in — e.g. crampons early season. Leave blank for all year."}</div>{(rack.items||[]).map(function(it){const ms=(rack.itemMonths||{})[it]||[];return <div key={it} style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.textSub,marginBottom:4}}>{it+(ms.length&&ms.length<12?" — "+monthSpan(ms):" — all year")}</div><div role="group" aria-label={"Months "+it+" is needed"} style={{display:"flex",flexWrap:"wrap",gap:4}}>{MONTHS.map(function(mo,mi){const on=ms.indexOf(mi)>=0;return <button key={mo} onClick={function(){togItemMonth(it,mi);}} aria-pressed={on} aria-label={it+": "+mo} style={{padding:"5px 8px",borderRadius:10,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{mo}</button>;})}</div></div>;})}</div>:null}</div>;})()}<div style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.borderLight}}><div style={{...SUB_LABEL,marginBottom:6}}>{"In your own words"}</div><textarea aria-label="Rack description" value={rack.note||""} onChange={function(e){const v=e.target.value;setRack(function(r){return Object.assign({},r,{note:v});});}} rows={4} placeholder={"e.g. no gear needed on the standard line — a rope and a couple of slings only if you take the direct finish"} style={{width:"100%",boxSizing:"border-box",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13,lineHeight:1.5,outline:"none",resize:"vertical",fontFamily:"inherit"}}/><div style={{fontSize:11,color:C.textMuted,marginTop:5,lineHeight:1.4}}>{"Use this to correct a rack that is written as a sentence, or to say what the sizes above cannot — what you actually placed, and what you carried and never used."}</div></div></div>;}
    if(f.type==="rappels"){const _rpre=!vals.rappelDetail&&route.rappelDetail&&route.rappelDetail.length;return <div>{_rpre?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"Loaded the "+(route.rappelDetail as SFStoredRap[]).length+" station"+((route.rappelDetail as SFStoredRap[]).length!==1?"s":"")+" already on file, top to bottom. Edit what is wrong and leave the rest."}</div>:null}{raps.map(function(rr,idx){return <div key={keyFor(rr)} id={"sf-rap-"+idx} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}><span style={{fontSize:12.5,fontWeight:700,color:C.red}}>{"Rappel "+(rr.n!=null?rr.n:idx+1)}</span><div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>{idx>0?<button onClick={function(){mvRap(idx,-1);}} aria-label={"Move rappel "+(idx+1)+" up"} style={POP_REMOVE}>{"↑"}</button>:null}{idx<raps.length-1?<button onClick={function(){mvRap(idx,1);}} aria-label={"Move rappel "+(idx+1)+" down"} style={POP_REMOVE}>{"↓"}</button>:null}{raps.length>1?<button onClick={function(){rmRap(idx);}} aria-label={"Remove rappel "+(idx+1)} style={POP_REMOVE}>{"✕"}</button>:null}</div></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Rappel "+(idx+1)+" length in "+(uImp()?"feet":"metres")} value={rr.lengthM} onChange={function(e){setRap(idx,"lengthM",intOnly(e.target.value));}} inputMode="numeric" placeholder={"Length ("+uLenUnit()+")"} style={Object.assign({},fld,{width:110,flex:"none"})}/><input aria-label={"Rappel "+(idx+1)+" anchor"} value={rr.anchor} onChange={function(e){setRap(idx,"anchor",e.target.value);}} placeholder="Anchor — e.g. 2 bolts with chains, slung tree" style={Object.assign({},fld,{flex:1})}/></div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{PITCH_ANCHORS.map(function(a){const on=(rr.anchor||"").toLowerCase()===a.toLowerCase();return <button key={a} onClick={function(){setRap(idx,"anchor",on?"":a);}} aria-pressed={on} style={{padding:"5px 9px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,color:on?C.onSolid:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{a}</button>;})}</div><input aria-label={"Rappel "+(idx+1)+" station — how to find it"} value={rr.station} onChange={function(e){setRap(idx,"station",e.target.value);}} placeholder="Finding the station — e.g. 10 m climber’s left of the notch" style={Object.assign({},fld,{marginBottom:6})}/><textarea aria-label={"Rappel "+(idx+1)+" hazards, one per line"} value={rr.hazards} onChange={function(e){setRap(idx,"hazards",e.target.value);}} rows={2} placeholder="Hazards, one per line — e.g. rope snags on the flake; pendulum left" style={Object.assign({},fld,{marginBottom:6,resize:"vertical",lineHeight:1.4})}/><input aria-label={"Rappel "+(idx+1)+" notes"} value={rr.notes} onChange={function(e){setRap(idx,"notes",e.target.value);}} placeholder="Notes — e.g. lands on a ledge; walk 20 m right to the next station" style={fld}/></div>;})}<button onClick={addRap} style={{...BTN,width:"100%",border:"1px dashed "+C.border,background:C.surface,color:C.textSub}}>{"+ Add a rappel"}</button></div>;}
    if(f.type==="pitches"){const _prefilled=!vals.pitchDetail&&route.pitchDetail&&route.pitchDetail.length;const _padN=routePitches.filter(function(x){return x._pad;}).length;
      /* A VARIATION climbs another route's pitches too (viaPitches, #2744), and the page lays them out as
         "The whole climb". Those rows belong to the other route, so they are named here, not offered for
         editing on this one — a correction typed here would land on the wrong route. */
      const _vv=(Array.isArray(route.approachVariants)?route.approachVariants:EMPTY_ARR).find(function(v){return v&&v.viaRouteId&&viaPitchSpans(v);});const _vsp=_vv?viaPitchSpans(_vv):null;const _vsib=_vv?(approachSibs||EMPTY_ARR).find(function(s){return s.id===_vv.viaRouteId;}):null;const _vname=_vsib?_vsib.name:"the route it is a variation of";
      return <div>{_prefilled?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"Loaded the "+(route.pitchDetail as SFStoredPitch[]).length+" pitch"+((route.pitchDetail as SFStoredPitch[]).length!==1?"es":"")+" already on file"+(_padN?", and "+_padN+" more the route lists but nobody has described yet":"")+". Edit what is wrong and leave the rest — you are correcting the breakdown, not replacing it."}</div>:(_padN>1&&!vals.pitchDetail?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"This route lists "+_padN+" pitches and none is described yet. Fill in the ones you know; a pitch left empty is not sent."}</div>:null)}{_vsp?<div data-via-pitches="" style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"This route is a variation of "+_vname+": the whole climb also takes its "+[_vsp.before,_vsp.after].filter(Boolean).map(spanLabel).join(" and ")+". Those pitches are "+_vname+"’s, so they are corrected on its page; below are this route’s own."}</div>:null}{pitches.map(function(pp,idx){return <div key={keyFor(pp)} id={"sf-pitch-"+idx} data-src={pp._src!=null?pp._src:undefined} style={{background:C.surface,border:"1px solid "+(pp.crux?C.amber:C.border),borderStyle:pp._pad&&!pp.grade&&!pp.lengthM&&!pp.notes&&!pp.anchor&&!pp.gear?"dashed":"solid",borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{isNumLbl(pp.pitch)||pp.pitch==null||pp.pitch===""?"Pitch "+(pp.pitch!=null&&pp.pitch!==""?pp.pitch:idx+1):String(pp.pitch)}{pp._pad?<span style={{fontSize:11,fontWeight:600,color:C.textMuted}}>{" · not described yet"}</span>:null}</span><div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}><button onClick={function(){setPitch(idx,"crux",!pp.crux);}} aria-pressed={!!pp.crux} style={{padding:"5px 10px",borderRadius:13,border:"1px solid "+(pp.crux?C.amber:C.border),background:pp.crux?C.amberBg:C.card,color:pp.crux?C.amber:C.textMuted,fontSize:11,fontWeight:700,cursor:"pointer"}}>{"Crux pitch"}</button>{idx>0?<button onClick={function(){mvPitch(idx,-1);}} aria-label={"Move pitch "+(idx+1)+" up"} style={POP_REMOVE}>{"↑"}</button>:null}{idx<pitches.length-1?<button onClick={function(){mvPitch(idx,1);}} aria-label={"Move pitch "+(idx+1)+" down"} style={POP_REMOVE}>{"↓"}</button>:null}{pitches.length>1?<button onClick={function(){rmPitch(idx);}} aria-label={"Remove pitch "+(pp.pitch!=null?pp.pitch:idx+1)} style={POP_REMOVE}>{"✕"}</button>:null}</div></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Pitch "+(idx+1)+" grade"} value={pp.grade} onChange={function(e){setPitch(idx,"grade",e.target.value);}} placeholder="Grade (5.10a)" style={Object.assign({},fld,{flex:1})}/><input aria-label={"Pitch "+(idx+1)+" length in "+(uImp()?"feet":"metres")} value={pp.lengthM} onChange={function(e){setPitch(idx,"lengthM",intOnly(e.target.value));}} inputMode="numeric" placeholder={"Length ("+uLenUnit()+")"} style={Object.assign({},fld,{width:88,flex:"none"})}/><input aria-label={"Pitch "+(idx+1)+" bolt count"} value={pp.bolts} onChange={function(e){setPitch(idx,"bolts",intOnly(e.target.value));}} inputMode="numeric" placeholder="Bolts" style={Object.assign({},fld,{width:72,flex:"none"})}/></div>
      {/* Per-pitch, because that is how anchors actually vary: 845 stored pitch rows carry
          one, and 101 routes use MORE THAN ONE kind across their own pitches (a tree at P1,
          gear at P2, bolts at the top). The route-level "Anchor type" select this replaces
          could not say that, and nothing rendered its answer anyway. Chips write the
          vocabulary the catalog already uses; the text box keeps the qualifier that makes a
          station findable ("2-bolt anchor (alcove)", "gear (large ledge)"). */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{PITCH_ANCHORS.map(function(a){/* Lit by KIND, so a stored "2-bolt anchor (alcove)" shows as Bolted rather than as no chip at all. */const on=(pp.anchor||"").toLowerCase()===a.toLowerCase()||anchorKind(pp.anchor)===a;return <button key={a} onClick={function(){setPitch(idx,"anchor",on?"":a);}} aria-pressed={on} style={{padding:"5px 9px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,color:on?C.onSolid:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{a}</button>;})}</div>
      <input aria-label={"Pitch "+(idx+1)+" anchor"} value={pp.anchor} onChange={function(e){setPitch(idx,"anchor",e.target.value);}} placeholder="Anchor — e.g. 2-bolt anchor (alcove), tree (sling)" style={Object.assign({},fld,{marginBottom:6})}/>
      <input aria-label={"Pitch "+(idx+1)+" belay station"} value={pp.belay||""} onChange={function(e){setPitch(idx,"belay",e.target.value);}} placeholder="Belay station: where the belayer stands and how to find it" style={Object.assign({},fld,{marginBottom:6})}/><input aria-label={"Pitch "+(idx+1)+" gear"} value={pp.gear} onChange={function(e){setPitch(idx,"gear",e.target.value);}} placeholder="Gear (e.g. #0.3–#2, nuts)" style={Object.assign({},fld,{marginBottom:6})}/><input aria-label={"Pitch "+(idx+1)+" notes"} value={pp.notes} onChange={function(e){setPitch(idx,"notes",e.target.value);}} placeholder="Notes (belay stance, runout, route-finding…)" style={fld}/></div>;})}<button onClick={addPitch} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Add pitch"}</button></div>;}
    if(OBJ_KEYS[f.type]){const _ks=OBJ_KEYS[f.type],_cur=(route[f.type]||{}),_val=OBJ_STATE[f.type][0],_set=OBJ_STATE[f.type][1];
      /* One labelled input per sub-key, each showing what is on file beneath it. Showing the
         current value matters more here than elsewhere: these blocks are usually PARTLY filled,
         so a climber is correcting one line of nine and needs to see which. Leaving a box empty
         leaves that key untouched — structuredVal drops blanks, and the merge assigns over the
         existing object — so nobody has to retype eight correct facts to fix the ninth. */
      return <div>{_ks.map(function(k){if(k[3]==="months"){/* Twelve pickers, three to a row, one per month. A month's rating on file shows in its blank
           choice, so a climber sees what they would be changing. The stored key may be "Jan" or
           "January"; monthIdx finds either, and the edit is written under the full name. */const _onM=(cleanMonths(_dget(_cur,k[0]))||{}) as Record<string,string>,_vM=(_dget(_val,k[0])||{}) as Record<string,string>;return <div key={k[0]} style={{marginBottom:9}}>
        <div style={{...SUB_LABEL,marginBottom:4}}>{k[1]}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6}}>{MONTH_NAMES.map(function(m){const _was=_onM[m];const _now=_vM[m];return <label key={m} style={{display:"block",minWidth:0}}>
          <span style={{display:"block",fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:2}}>{m.slice(0,3)}</span>
          <select aria-label={k[1]+", "+m} value={_now==null?"":String(_now)} onChange={function(e){_set(k[0]+"."+m,e.target.value);}} style={{...fld,padding:"8px 6px",fontSize:12.5}}><option value="">{_was?("— ("+_was+")"):"—"}</option>{(k[4] as Array<[SFNum,string]>).map(function(o){return <option key={String(o[0])} value={String(o[0])}>{o[1]}</option>;})}</select>
        </label>;})}</div>
        <div style={{fontSize:11,color:C.textMuted,marginTop:4,lineHeight:1.4}}>{"The usual danger that month, on the scale avalanche centers publish. A month left on — keeps what is on file, shown in brackets."}</div>
      </div>;}let on=_dget(_cur,k[0]);if(on!=null&&typeof on==="object")on=objLabel(k,on);else if(on!=null&&k[3]==="enum")on=objLabel(k,on);return <div key={k[0]} style={{marginBottom:9}}>
        <div style={{...SUB_LABEL,marginBottom:4}}>{k[1]}</div>
        {k[3]==="enum"?<select aria-label={k[1]} value={_dget(_val,k[0])==null?"":String(_dget(_val,k[0]))} onChange={function(e){_set(k[0],e.target.value);}} style={fld}><option value="">Not sure</option>{(k[4] as Array<[SFNum,string]>).map(function(o){return <option key={String(o[0])} value={String(o[0])}>{o[1]}</option>;})}</select>:<input aria-label={k[1]} value={_dget(_val,k[0])==null?"":_dget(_val,k[0]) as string} onChange={function(e){_set(k[0],e.target.value);}} placeholder={k[2]} inputMode={k[3]==="num"?"numeric":undefined} style={fld}/>}
        {on?<div style={{fontSize:11,color:C.textMuted,marginTop:3,lineHeight:1.4}}>{"On file: "+on}</div>:null}
      </div>;})}<div style={{fontSize:11,color:C.textMuted,lineHeight:1.45,marginTop:2}}>{"Leave anything you don't know blank — blank means unchanged, not cleared."}</div></div>;}
    if(f.type==="variants"){return <div>{avars.map(function(av,idx){return <div key={idx} style={{border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:9,background:C.surface}}>
      <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
        <input aria-label={"Approach "+(idx+1)+" name"} value={av.name} onChange={function(e){setAvar(idx,"name",e.target.value);}} placeholder="e.g. Snow Creek trail, log crossing" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        {avars.length>1?<button onClick={function(){delAvar(idx);}} aria-label={"Remove approach "+(idx+1)} style={{flexShrink:0,padding:"7px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Remove"}</button>:null}
      </div>
      {/* NUMBERS AS NUMBERS. distMi and gainFt are stored as real numbers on the rows that carry
          them, and a number is the one thing that already clusters loosely — sameEditValue
          compares these with a tolerance, so two climbers who measure 4.8 and 4.9 miles agree.
          A text box here would make the same fact unagreeable. `hours` stays text: 27% of its
          values are ranges ("3-4", "1-1.5"), which a single number cannot express. */}
      <div style={{fontSize:11,color:C.textMuted,marginBottom:4}}>{"Trailhead to the base, one way — to two decimals if you know them"}</div>
      <div style={{display:"flex",gap:7,marginBottom:7}}>
        <input aria-label={"Approach "+(idx+1)+" distance in "+(uImp()?"miles":"kilometres")+", one way to the base"} inputMode="decimal" value={av.distMi} onChange={function(e){setAvar(idx,"distMi",e.target.value.replace(/[^0-9.]/g,""));}} placeholder={"one way "+uDistMiUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        <input aria-label={"Approach "+(idx+1)+" gain in "+(uImp()?"feet":"metres")+", trailhead to the base"} inputMode="numeric" value={av.gainFt} onChange={function(e){setAvar(idx,"gainFt",e.target.value.replace(/[^0-9]/g,""));}} placeholder={"gain "+uElevUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        <input aria-label={"Approach "+(idx+1)+" hours, trailhead to the base"} value={av.hours} onChange={function(e){setAvar(idx,"hours",e.target.value);}} placeholder="hrs, e.g. 3-4" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
      </div>
      <input aria-label={"Approach "+(idx+1)+" season"} value={av.season} onChange={function(e){setAvar(idx,"season",e.target.value);}} placeholder="Window, e.g. Jul-Sep" style={Object.assign({},fld,{marginBottom:7})}/>
      <textarea aria-label={"Approach "+(idx+1)+" hazards, one per line"} value={av.hazards} onChange={function(e){setAvar(idx,"hazards",e.target.value);}} rows={2} placeholder="Hazards, one per line" style={Object.assign({},fld,{marginBottom:7,resize:"vertical"})}/>
      <textarea aria-label={"Approach "+(idx+1)+" notes"} value={av.notes} onChange={function(e){setAvar(idx,"notes",e.target.value);}} rows={3} placeholder="What the walk in is actually like" style={Object.assign({},fld,{marginBottom:0,resize:"vertical"})}/>
      {avars.length>1&&!av.primary?<textarea aria-label={"Approach "+(idx+1)+": why a party would go this way"} value={av.whyThisWay||""} onChange={function(e){setAvar(idx,"whyThisWay",e.target.value);}} rows={2} placeholder="Why go this way instead of the most used one, e.g. early season while the gully holds snow" style={Object.assign({},fld,{marginTop:7,marginBottom:0,resize:"vertical"})}/>:null}
      <div style={{marginTop:9,paddingTop:9,borderTop:"1px solid "+C.border}}>
        <div style={{fontSize:11,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Where this way in starts</div>
        <select aria-label={"Approach "+(idx+1)+": where it starts"} value={av.mode==="via"&&av.viaRouteId?"via:"+av.viaRouteId:av.mode==="own"?"own":""} onChange={function(e){const x=e.target.value;if(x.indexOf("via:")===0){setAvar(idx,"mode","via");setAvar(idx,"viaRouteId",x.slice(4));}else{setAvar(idx,"mode",x);}}} style={Object.assign({},fld,{marginBottom:7})}>
          <option value="">Not set — show it as a description only</option>
          <option value="own">From its own trailhead</option>
          {(approachSibs||EMPTY_ARR).map(function(sr){return <option key={sr.id} value={"via:"+sr.id}>{"By climbing "+sr.name+" first"}</option>;})}
        </select>
        {av.mode==="own"?<>
          <input aria-label={"Approach "+(idx+1)+" trailhead name"} value={av.thName} onChange={function(e){setAvar(idx,"thName",e.target.value);}} placeholder="Trailhead name" style={Object.assign({},fld,{marginBottom:7})}/>
          <div style={{display:"flex",gap:7,marginBottom:7}}>
            <input aria-label={"Approach "+(idx+1)+" trailhead latitude"} inputMode="decimal" value={av.thLat} onChange={function(e){setAvar(idx,"thLat",e.target.value.replace(/[^0-9.-]/g,""));}} placeholder="Trailhead latitude" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
            <input aria-label={"Approach "+(idx+1)+" trailhead longitude"} inputMode="decimal" value={av.thLng} onChange={function(e){setAvar(idx,"thLng",e.target.value.replace(/[^0-9.-]/g,""));}} placeholder="Trailhead longitude" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
          </div>
          <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:6}}>The whole trip by this way in — trailhead to summit and back:</div>
          <div style={{display:"flex",gap:7,marginBottom:7}}>
            <input aria-label={"Approach "+(idx+1)+" one-way distance to the climb in "+(uImp()?"miles":"kilometres")} inputMode="decimal" value={av.tDist} onChange={function(e){setAvar(idx,"tDist",e.target.value.replace(/[^0-9.]/g,""));}} placeholder={"one way "+(uImp()?"mi":"km")} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
            <input aria-label={"Approach "+(idx+1)+" total gain in "+(uImp()?"feet":"metres")} inputMode="numeric" value={av.tGain} onChange={function(e){setAvar(idx,"tGain",e.target.value.replace(/[^0-9]/g,""));}} placeholder={"gain "+uElevUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
            <input aria-label={"Approach "+(idx+1)+" total loss in "+(uImp()?"feet":"metres")} inputMode="numeric" value={av.tLoss} onChange={function(e){setAvar(idx,"tLoss",e.target.value.replace(/[^0-9]/g,""));}} placeholder={"loss "+uElevUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
          </div>
          <input aria-label={"Approach "+(idx+1)+" hours from the trailhead to the start of the climbing"} inputMode="decimal" value={av.tHrs} onChange={function(e){setAvar(idx,"tHrs",e.target.value.replace(/[^0-9.]/g,""));}} placeholder="Hours from trailhead to the start of the climbing" style={Object.assign({},fld,{marginBottom:7})}/>
          <label style={{display:"block",fontSize:12,color:C.blue,fontWeight:700,cursor:"pointer",marginBottom:4}}>
            {av.tGpx&&av.tGpx.pts?("GPX track: "+av.tGpx.pts.length+" points — replace"):"Add a GPX track of this way in"}
            <input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" aria-label={"Approach "+(idx+1)+" GPX track"} onChange={function(e){loadVarGpx(idx,e.target.files&&e.target.files[0]);e.target.value="";}} style={{display:"block",marginTop:4,fontSize:12,color:C.textSub}}/>
          </label>
          {av._gpxErr?<div style={{fontSize:11.5,color:C.amber,marginTop:2}}>{av._gpxErr}</div>:null}
        </>:null}
        {av.mode==="via"?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5}}>That route's trailhead, track, camps and numbers are used for this way in; this route keeps its own climbing.</div>:null}
        {av.mode!=="via"&&varCampPool(av).length?<div style={{marginTop:8}}>
          <div style={{fontSize:11,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:4}}>Camps on this way in</div>
          <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:6}}>Tick the camps a party uses on this way in. A camp both ways share can be ticked on both.</div>
          {varCampPool(av).map(function(c){const on=Array.isArray(av.campSel)?av.campSel.some(function(n){return String(n).toLowerCase()===String(c.name).toLowerCase();}):av.mode!=="own";return <label key={c.name} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:12.5,color:C.text,cursor:"pointer"}}><input type="checkbox" checked={on} onChange={function(){const cur=Array.isArray(av.campSel)?av.campSel.slice():(av.mode!=="own"?varCampPool(av).map(function(p){return p.name;}):[]);const i=cur.findIndex(function(n){return String(n).toLowerCase()===String(c.name).toLowerCase();});if(i>=0)cur.splice(i,1);else cur.push(c.name);setAvar(idx,"campSel",cur);}} aria-label={"Approach "+(idx+1)+" uses camp "+c.name}/>{c.name}{c.elev!=null?<span style={{color:C.textMuted}}>{" · "+uElev(c.elev)}</span>:null}</label>;})}
        </div>:null}
      </div>
    </div>;})}
      {avars.length<MAX_VAR?<button onClick={addAvar} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px dashed "+C.border,background:C.card,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add another way in"}</button>:null}
    </div>;}
    if(f.type==="sections"){return <div>{secs.map(function(sc,idx){return <div key={idx} style={{border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:9,background:C.surface}}>
      <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
        <input aria-label={"Section "+(idx+1)+" name"} value={sc.label} onChange={function(e){setSec(idx,"label",e.target.value);}} placeholder="e.g. Summit block" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        {secs.length>1?<button onClick={function(){delSec(idx);}} aria-label={"Remove section "+(idx+1)} style={{flexShrink:0,padding:"7px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Remove"}</button>:null}
      </div>
      {/* A PICKER, not a text box, and the option list is the catalog's own vocabulary rather
          than an invented one: 290 stored values canonicalise to class 2/2-3/3/3-4/4 for 89% of
          sections, with a low-5th tail. It renders as a CHIP, so it takes a value and anything
          qualifying it belongs in the notes below — the rule this repo already states for season
          and grade. A picker is also the only way three climbers can agree: the merge needs three
          in one cluster, and prose never clusters. */}
      <select aria-label={"Section "+(idx+1)+" class"} value={sc.cls} onChange={function(e){setSec(idx,"cls",e.target.value);}} style={Object.assign({},fld,{marginBottom:7})}>
        <option value="">{"Class / grade — not sure"}</option>
        {SEC_CLASSES.map(function(c){return <option key={c} value={c}>{c}</option>;})}
      </select>
      <textarea aria-label={"Section "+(idx+1)+" notes"} value={sc.notes} onChange={function(e){setSec(idx,"notes",e.target.value);}} rows={3} placeholder="What a party actually does here" style={Object.assign({},fld,{marginBottom:0,resize:"vertical"})}/>
    </div>;})}
      {secs.length<MAX_SEC?<button onClick={addSec} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px dashed "+C.border,background:C.card,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add a section"}</button>:null}
    </div>;}
    if(f.type==="itinerary"){return <ItineraryEditor itin={itin} onChange={setItin}/>;}
    /* One card per site. Every field except the name is optional on purpose: a climber who only
       knows that the water at a camp has dried up should be able to say that without inventing a
       capacity or a permit. Blank means unchanged rather than cleared, the same contract the
       object-key editor above states. */
    if(f.type==="bivy"){return <div>{bivies.map(function(b,idx){return <div key={idx} style={{border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:9,background:C.surface}}>
      {/* Every box carries a visible caption: a filled box loses its placeholder, and a site already on file showed six unlabelled values (owner, 2026-10-23). */}
      <div style={{display:"flex",gap:7,alignItems:"flex-end",marginBottom:7}}>
        <label style={{flex:1,minWidth:0}}>{bivyCap("Site "+(idx+1)+" name")}<input aria-label={"Site "+(idx+1)+" name"} value={b.name} onChange={function(e){setBivy(idx,"name",e.target.value);}} placeholder="e.g. Boston Basin" style={Object.assign({},fld,{width:"100%",marginBottom:0})}/></label>
        {bivies.length>1?<button onClick={function(){delBivy(idx);}} aria-label={"Remove site "+(idx+1)} style={{flexShrink:0,padding:"7px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Remove"}</button>:null}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:7}}>
        <label style={{flex:1,minWidth:0}}>{bivyCap("Kind")}<select aria-label={"Site "+(idx+1)+" type"} value={b.type} onChange={function(e){setBivy(idx,"type",e.target.value);}} style={Object.assign({},fld,{width:"100%",marginBottom:0})}>
          <option value="camp">{"Camp"}</option><option value="bivy">{"Bivy"}</option><option value="hut">{"Hut"}</option>
        </select></label>
        <label style={{flex:1,minWidth:0}}>{bivyCap(uImp()?"Elevation (ft)":"Elevation (m)")}<input aria-label={"Site "+(idx+1)+" elevation"} inputMode="numeric" value={b.elev} onChange={function(e){setBivy(idx,"elev",e.target.value);}} placeholder={uImp()?"e.g. 6200":"e.g. 1890"} style={Object.assign({},fld,{width:"100%",marginBottom:0})}/></label>
      </div>
      <label style={{display:"block",marginBottom:7}}>{bivyCap("Used for")}<select aria-label={"Site "+(idx+1)+" role"} value={b.role||""} onChange={function(e){setBivy(idx,"role",e.target.value);}} style={Object.assign({},fld,{width:"100%",marginBottom:0})}>
          <option value="">{"Not sure"}</option><option value="main">{"Where most parties sleep"}</option><option value="route">{"Other option (slow day, weather, emergency)"}</option>
        </select></label>
      <label style={{display:"block"}}>{bivyCap("Water")}<input aria-label={"Site "+(idx+1)+" water"} value={b.water} onChange={function(e){setBivy(idx,"water",e.target.value);}} placeholder="Is there any, and is it reliable?" style={fld}/></label>
      <label style={{display:"block"}}>{bivyCap("Capacity")}<input aria-label={"Site "+(idx+1)+" capacity"} value={b.capacity} onChange={function(e){setBivy(idx,"capacity",e.target.value);}} placeholder="e.g. 3 tents on gravel" style={fld}/></label>
      <label style={{display:"block"}}>{bivyCap("Permit")}<input aria-label={"Site "+(idx+1)+" permit"} value={b.permit} onChange={function(e){setBivy(idx,"permit",e.target.value);}} placeholder="Which agency, and is it a quota?" style={fld}/></label>
      <label style={{display:"block"}}>{bivyCap("Notes")}<textarea aria-label={"Site "+(idx+1)+" notes"} value={b.notes} onChange={function(e){setBivy(idx,"notes",e.target.value);}} placeholder="Anything a party arriving at dusk would want to know" rows={2} style={Object.assign({},fld,{marginBottom:0,resize:"vertical",fontFamily:"inherit"})}/></label>
    </div>;})}
      {bivies.length<MAX_BIVY?<button onClick={addBivy} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px dashed "+C.border,background:C.card,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add another site"}</button>:<div style={{fontSize:11.5,color:C.textMuted}}>{"That is the most sites this form takes."}</div>}
      <div style={{fontSize:11,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{"Leave anything you don't know blank — blank means unchanged, not cleared. A site needs a name to be submitted."}</div>
    </div>;}
    if(f.type==="waypoints"){const wpsWithNum=wps.map(function(w){return Object.assign({},w,{lat:w.lat?parseFloat(w.lat):null,lng:w.lng?parseFloat(w.lng):null});});return <div><WaypointMapPicker waypoints={wpsWithNum as unknown as Waypoint[]} activeIdx={activeWpIdx} peakCoord={peakCoord} onPick={function(lat,lng){setWp(activeWpIdx,"lat",lat.toFixed(5));setWp(activeWpIdx,"lng",lng.toFixed(5));}}/>{wps.map(function(wp,idx){const _types=CRAG_CATS.includes(cat)?WP_TYPES_CRAG.concat(WP_TYPES_CRAG.indexOf(wp.type)<0&&WP_TYPES.indexOf(wp.type)>=0?[wp.type]:[]):WP_TYPES;const dupType=WP_SINGLE_TYPES.indexOf(wp.type)>=0&&wps.some(function(w,wi){return wi!==idx&&w.type===wp.type;});return <div key={keyFor(wp)} {...clickable(function(){setActiveWpIdx(idx);})} style={{background:C.surface,border:"1px solid "+(idx===activeWpIdx?C.blue:C.border),borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{"Waypoint "+(idx+1)+(wp.lat&&wp.lng?" · pin set":"")}</span>{wps.length>1?<button onClick={function(e){e.stopPropagation();rmWp(idx);}} aria-label="Remove waypoint" style={POP_REMOVE}>{"✕"}</button>:null}</div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>{_types.map(function(t){const on=wp.type===t;const blocked=WP_SINGLE_TYPES.indexOf(t)>=0&&wps.some(function(w,wi){return wi!==idx&&w.type===t;});return <button key={t} disabled={blocked} onClick={function(e){e.stopPropagation();setWp(idx,"type",t);}} title={blocked?"Only one "+wpTypeLbl(t,cat)+" per route":undefined} style={Object.assign({},sm(on),blocked?{opacity:0.35,cursor:"not-allowed"}:null)}>{wpTypeLbl(t,cat)}</button>;})}</div>{dupType?<div style={{fontSize:11,color:C.amber,marginBottom:6}}>{"Only one "+wpTypeLbl(wp.type,cat)+" per route — pick a different type or edit the other one."}</div>:null}<input aria-label="Name" value={wp.name} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"name",e.target.value);}} placeholder="Name (e.g. Pandora Mill Gate)" style={Object.assign({},fld,{marginBottom:6})}/><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label="Latitude (or tap the map above)" value={wp.lat} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"lat",e.target.value.replace(/[^0-9.-]/g,""));}} inputMode="decimal" placeholder="Lat (or tap map above)" style={Object.assign({},fld,{flex:1})}/><input aria-label="Longitude" value={wp.lng} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"lng",e.target.value.replace(/[^0-9.-]/g,""));}} inputMode="decimal" placeholder="Lng" style={Object.assign({},fld,{flex:1})}/></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Elevation ("+(uImp()?"ft":"m")+")"} value={wp.elev} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"elev",intOnly(e.target.value));}} inputMode="numeric" placeholder={"Elev ("+(uImp()?"ft":"m")+")"} style={Object.assign({},fld,{flex:1})}/><input aria-label={"Distance ("+(uImp()?"mi":"km")+")"} value={wp.distMi} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"distMi",e.target.value.replace(/[^0-9.]/g,""));}} inputMode="decimal" placeholder={"Dist ("+(uImp()?"mi":"km")+")"} style={Object.assign({},fld,{flex:1})}/></div><input aria-label="Note (optional)" value={wp.note} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"note",e.target.value);}} placeholder="Note (optional)" style={fld}/><input aria-label="How to get here from the last waypoint (optional)" value={wp.directions||""} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"directions",e.target.value);}} placeholder="Getting here — which way to go from the last point" style={Object.assign({},fld,{marginTop:6})}/></div>;})}{wps.length<MAX_WAYPOINTS?<button onClick={addWp} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Add waypoint"}</button>:<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",padding:"6px 0"}}>{"Maximum "+MAX_WAYPOINTS+" waypoints per route — keep it to the essentials."}</div>}</div>;}
    return null;};
  const discChanged=disc!==catToChip(catOf(route));
  const discContribs=function(){if(!discChanged)return [];const cfg=(DISCS.find(function(d){return d[1]===disc;})||[])[2]||{discipline:disc};const lbl=(DISCS.find(function(d){return d[1]===disc;})||["",""])[0];const out=[{field:"discipline",label:"Discipline",value:cfg.discipline,cur:route.discipline||"—"}];if(cfg.style)out.push({field:"rockStyle",label:"Style",value:cfg.style,cur:route.style||"—"});return out.map(function(x){return {type:"edit",field:x.field,label:x.label,value:x.value,wasEmpty:(!x.cur||x.cur==="—"),routeId:route.id,note:note,title:route.name,area:mtnOf(route),meta:x.label+": "+(x.cur||"—")+" → "+x.value+" ("+lbl+")",status:"review",when:"just now"};});};
  /* Every camp a way in could use: its own recorded camps first, then the route's. */
  const varCampPool=function(x: SFVarRow | null | undefined){const seen: Record<string,number>={},pool: SFStoredBivy[]=[];((x&&x.trip&&Array.isArray(x.trip.bivy))?x.trip.bivy:[] as SFStoredBivy[]).concat(Array.isArray(route.bivy)?route.bivy:[]).forEach(function(c){const k=c&&c.name?String(c.name).toLowerCase():"";if(k&&!seen[k]){seen[k]=1;pool.push(c);}});return pool;};
  /* A rack edit submits its COUNTED rows, then its text lines (rackEditValue, lib/rack.js), never one flattened string. */
  const structuredVal=function(f: SFField){if(f.type==="rack"){const _rk=vals.rack||{};return rackItemsOf(_rk).concat(rackLinesOf(_rk));}if(f.type==="variants")return (vals.approachVariants||[]).map(function(x){
    const o: SFObj={name:String(x.name||"").trim(),season:String(x.season||"").trim(),notes:String(x.notes||"").trim()};
    const hz=String(x.hazards||"").split("\n").map(function(h){return h.trim();}).filter(Boolean);
    if(hz.length)o.hazards=hz;
    /* Numbers go in as NUMBERS, matching the 123 gainFt and 120 distMi rows already stored that
       way. A numeric string here would break the tolerant comparison and read as a different
       value from the identical measurement. */
    /* WHAT WAS TYPED IS READ IN THE CLIMBER'S OWN UNITS. The columns stay canonical (miles,
       feet) -- sameEditValue compares these numerically with a tolerance, so a stored
       kilometre would not merely display wrong, it would fail to cluster with the identical
       measurement taken by somebody on the other setting, and the 3-agree gate could never
       be reached. Same conversion-at-the-edges shape as the itinerary builder, and the same
       one this very function already applies to a contributed waypoint's elev and distMi. */
    const d=itinStoreVal(x,"distMi");if(d!=null&&isFinite(d))o.distMi=d;
    const g=itinStoreVal(x,"gainFt");if(g!=null&&isFinite(g))o.gainFt=g;
    const h=String(x.hours||"").trim();if(h)o.hours=h;
    const bf=String(x.baseFinding||"").trim();if(bf)o.baseFinding=bf;
    const wy=String(x.whyThisWay||"").trim();if(wy)o.whyThisWay=wy;
    if(x.primary===true)o.primary=true;
    if(x.longForm===true)o.longForm=true;
    if(x.storedRow===true)o.storedRow=true;
    if(x.mode!=="via"&&x.mode!=="own"&&Array.isArray(x.campSel))o.camps=x.campSel.slice();
    /* WHERE IT STARTS (see tripDraft). The mode decides, so switching a way in from "own trailhead"
       to "by another route" really drops the typed trailhead rather than storing both. */
    if(x.mode==="via"){const vr=String(x.viaRouteId||"").trim();if(vr)o.viaRouteId=vr;/* ...and the pitches of it a VARIATION climbs, kept only while the link points at the same route. */if(vr&&vr===x._origVia&&x.viaPitches)o.viaPitches=x.viaPitches;}
    else if(x.mode==="own"){/* START FROM THE STORED RECORD: a way in also carries camps, a road, pins and an itinerary this form has no box for, and rebuilding it from the boxes alone deleted them on the next accepted edit. Only what the form controls is replaced. */const tr: SFTrip=Object.assign({},x.trip&&typeof x.trip==="object"?x.trip:{});["distKm","outingShape","gainFt","gainM","lossFt","lossM"].forEach(function(k){delete tr[k];});const _oal=tr.approachLogistics;delete tr.approachLogistics;const _ot=tr.timing&&typeof tr.timing==="object"?Object.assign({},tr.timing):{};delete _ot.approachTimeHrs;delete tr.timing;const sd=x._tSeed||{dist:"",gain:"",loss:"",t:{}},imp=uImp(); // eslint-disable-line @typescript-eslint/no-dynamic-delete -- the key is removed from a fresh copy of a keyed map, which is the point
      const al=tripTrailheadMerge(_oal,x.thName,x.thLat,x.thLng);if(Object.keys(al).length)tr.approachLogistics=al;
      const dv=parseFloat(x.tDist);if(isFinite(dv)&&dv>0)tr.distKm=x.tDist===sd.dist&&sd.t.distKm!=null?sd.t.distKm:+(imp?dv*1.609344:dv).toFixed(2);
      // The box is the walk TO the climb, so the page doubles it into a round trip — unless this way in was stored as a loop or a point-to-point.
      if(tr.distKm!=null)tr.outingShape=(sd.t.distKm!=null&&sd.t.outingShape)||"outback";
      const gv=parseFloat(x.tGain);if(isFinite(gv)&&gv>0){tr.gainFt=x.tGain===sd.gain&&sd.t.gainFt!=null?sd.t.gainFt:Math.round(imp?gv:gv*3.28084);tr.gainM=Math.round(tr.gainFt/3.28084);}
      const lv=parseFloat(x.tLoss);if(isFinite(lv)&&lv>0){tr.lossFt=x.tLoss===sd.loss&&sd.t.lossFt!=null?sd.t.lossFt:Math.round(imp?lv:lv*3.28084);tr.lossM=Math.round(tr.lossFt/3.28084);}
      const hv=parseFloat(x.tHrs);if(isFinite(hv)&&hv>0)_ot.approachTimeHrs=hv;if(Object.keys(_ot).length)tr.timing=_ot;
      if(x.tGpx&&Array.isArray(x.tGpx.pts)&&x.tGpx.pts.length>1){tr.gpxPts=x.tGpx.pts;if(Array.isArray(x.tGpx.elev))tr.elevPts=x.tGpx.elev;}
      if(Array.isArray(x.campSel)){const _cb=varCampPool(x).filter(function(c){return (x.campSel as string[]).some(function(n){return String(n).toLowerCase()===String(c.name).toLowerCase();});});if(_cb.length)tr.bivy=_cb;else delete tr.bivy;}
      if(Object.keys(tr).length)o.trip=tr;}
    return o;}).filter(function(x){return x.name||x.notes;});
  if(f.type==="sections")return (vals.climbingRoute||[]).map(function(x,i){return {n:i+1,label:String(x.label||"").trim(),class:String(x.cls||"").trim(),notes:String(x.notes||"").trim()};}).filter(function(x){return x.label||x.notes;});
  if(f.type==="rappels")return (vals.rappelDetail||[]).map(function(r,i){const _l=uLenIn(r.lengthM);const hz=String(r.hazards||"").split("\n").map(function(h){return h.trim();}).filter(Boolean);const o: SFObj={n:i+1,lengthM:(_l!=null&&isFinite(_l))?_l:null,anchor:String(r.anchor||"").trim(),notes:String(r.notes||"").trim()};const st=String(r.station||"").trim();if(st)o.station=st;if(hz.length)o.hazards=hz;return o;}).filter(function(r){return r.lengthM!=null||r.anchor||r.notes||r.station||r.hazards;});if(f.type==="pitches")return (vals.pitchDetail||[]).map(function(p,i){
    /* IT READ `p.len`, A KEY NO EDITOR ROW HAS EVER CARRIED. Every row is
       {pitch,grade,lengthM,gear,notes,anchor,bolts,crux}, so parseInt(undefined)||null
       dropped every length a climber typed — and because the filter below tests the
       OUTPUT lengthM, a pitch carrying only a length vanished ENTIRELY, under a success
       toast. The comment above the editor records this private {grade,len,notes} shape
       being removed from the SUMMARY strings; the submit path kept it.
       bolts/anchor/crux were hardcoded empty over whatever was entered. Numbers go in as
       NUMBERS, matching the stored rows and the variants branch above. */
    /* What was typed is read in the climber's OWN units and stored CANONICAL (metres) —
       the same conversion-at-the-edges the variants and waypoint branches apply. */
    const _len=uLenIn(p.lengthM),_bolts=parseInt(p.bolts as string,10);
    /* `n` is the row's OWN label: the not-described rows the editor adds are dropped below when left
       empty, so numbering by position would hand a filled-in P5 behind an empty P4 the number 4; and a
       named leg ("Approach gully") keeps its name rather than becoming a number. */
    const _lbl=isNumLbl(p.pitch)?+p.pitch:String(p.pitch==null?"":p.pitch).trim();
    return {n:(_lbl===""||_lbl===0)?i+1:_lbl,grade:p.grade||"",lengthM:(_len!=null&&isFinite(_len))?_len:null,gear:p.gear||"",belay:String(p.belay||"").trim(),note:p.notes||"",bolts:isFinite(_bolts)?_bolts:0,anchor:String(p.anchor||"").trim(),crux:!!p.crux,photos:[],comments:[]};
  }).filter(function(p){return p.grade||p.gear||p.note||p.lengthM||p.anchor||p.bolts||p.crux;});if(f.type==="waypoints")return (vals.waypoints||[]).filter(function(w){return w.name||w.lat||w.note||w.directions;}).map(function(w){return {type:w.type,name:w.name||w.type,lat:w.lat?parseFloat(w.lat):null,lng:w.lng?parseFloat(w.lng):null,elev:w.elev?(uImp()?parseInt(w.elev):Math.round(parseInt(w.elev)*3.28084)):null,distMi:w.distMi?(uImp()?parseFloat(w.distMi):Math.round(parseFloat(w.distMi)/1.60934*100)/100):null,note:w.note||"",directions:w.directions||""};});if(f.type==="itinerary")return itinDraftToStructured(vals.itinerary);if(f.type==="bivy")return (vals.bivy||[]).filter(function(b){return b.name&&String(b.name).trim();}).map(function(b){
  /* elev goes to the DB in FEET, converted from whatever the reader's units are — the same
     handling as a waypoint elevation two branches up. This matters more than it looks: the
     column already holds two conventions (`elev` feet, legacy `elevM` metres) and writing a
     metric number into `elev` would put a third reading into a field uElev() treats as feet.
     Only `elevM` is never written here — the read side converts the legacy spelling, and the
     write side should not add to it. */
  const _e=String(b.elev||"").trim();const _n=_e?parseInt(_e,10):null;
  return {name:String(b.name).trim(),type:b.type||"camp",role:(b.role==="main"||b.role==="route")?b.role:"",elev:(_n!=null&&!isNaN(_n))?(uImp()?_n:Math.round(_n*3.28084)):null,capacity:(b.capacity||"").trim(),water:(b.water||"").trim(),permit:(b.permit||"").trim(),notes:(b.notes||"").trim()};
/* The form never shows the role:"hidden" stubs (they name Campsite PINS the camping list skips), so
   they are carried through untouched — otherwise one climber's edit would bring every hidden pin back. */
}).concat((Array.isArray(route.bivy)?route.bivy:[]).filter(function(b){return b&&b.role==="hidden"&&b.name;}).map(function(b){return {name:b.name,role:"hidden"};}) as never[]);if(OBJ_KEYS[f.type]){const _ks=OBJ_KEYS[f.type],_src=vals[f.k]||{};let _o: SFObj={};_ks.forEach(function(k){let v=_dget(_src,k[0]) as string | null | undefined;if(v==null)return;if(k[3]==="months"){const _cm=cleanMonths(v);if(_cm)_o=_dset(_o,k[0],_cm);return;}v=String(v).trim();if(!v)return;
/* A key marked numeric merges back as a NUMBER. The hour fields are arithmetic — the planner
   derives the summit time as totalHrs-approachTimeHrs-descentTimeHrs — so a string would
   concatenate instead of subtract, silently. Non-numeric input is dropped rather than stored
   as text, because a bad number is worse here than a missing one: the tile still renders.
   group_limit keeps its integer parse, now declared on the key rather than hardcoded here. */
const _pv=(k[3]==="num")?(isFinite(parseFloat(v))?parseFloat(v):undefined):(k[3]==="enum")?((k[4]||[]).some(function(o){return typeof o[0]==="number";})?(isFinite(parseFloat(v))?parseFloat(v):undefined):v):((k[0]==="group_limit"&&/^[0-9]+$/.test(v))?parseInt(v,10):v);if(_pv===undefined)return;/* dotted keys write nested, so `fitnessSpec.hiking` lands inside the object the panel reads */if(String(k[0]).indexOf(".")>=0){_o=_dset(_o,k[0],_pv);}else{_o[k[0]]=_pv;}});return _o;}if(CANON[f.k])return CANON[f.k](filledStr(f));return filledStr(f);};
  const submit=function(){const dc=discContribs();if(!changedFields.length&&!dc.length)return;changedFields.forEach(function(f){const c={type:"edit",field:f.k,label:f.label,value:structuredVal(f),wasEmpty:(!f.cur||f.cur==="—"),routeId:route.id,note:note,title:route.name,area:mtnOf(route),meta:f.label+": "+(f.cur||"—")+" → "+filledStr(f),status:"review",when:"just now"};if(onSubmit)onSubmit(c);});dc.forEach(function(c){if(onSubmit)onSubmit(c);});setSentN(changedFields.length+dc.length);setSent(true);};
  const _removals=changedFields.filter(function(f){const pg=REMOVABLE_LISTS[f.k];return !!pg&&editRemoves(pg(route),structuredVal(f));});const _needWhy=_removals.length>0&&note.trim().length<10;const totalUpdates=changedFields.length+(discChanged?(disc==="trad"||disc==="sport"?2:1):0);const canSubmit=totalUpdates>0&&!_needWhy;
  const submitLbl=_needWhy?"Say why you’re removing it":!canSubmit?"Fill in any one field to submit":totalUpdates>1?("Submit "+totalUpdates+" updates"):(allEmpty&&!discChanged?"Add to route":"Submit update");
  /* A STRAY TAP OUTSIDE THE PANEL MUST NOT DESTROY TYPED BETA. This backdrop closed the form
     unconditionally, and the form holds up to 35 inputs — so one tap beside the panel discarded
     everything a climber had written, with no warning and nothing to undo it. The inner panel
     already shields the click, so only a genuine outside tap gets here.
     Gated on the form's OWN emptiness signal rather than a new one: `canSubmit` is
     `totalUpdates > 0`, which the submit button already computes. An untouched form still
     dismisses on a backdrop tap, which is what makes an accidental open cheap to leave; once
     there is work to lose, leaving is a deliberate act via the ✕ or Cancel, both of which are
     right there. The two mistakes do not cost the same. */
  return createPortal(<div onClick={canSubmit?undefined:onClose} role="dialog" aria-modal="true" aria-label="Contribute info" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:100000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"72px 12px 32px",overflowY:"auto",overscrollBehavior:"contain"}}>
    <div onClick={function(e){e.stopPropagation();}} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:460,border:"1px solid "+C.border,overflowY:"auto",overscrollBehavior:"contain",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid "+C.border,flexShrink:0}}><div style={{fontSize:16,fontWeight:700,color:C.text}}>{sent?"Thanks for contributing":"Add or fix info"}</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button></div>
      <ContributionStandingNotice standing={_standing} onAppeal={function(){openAppeal({kind:"contributing",label:"your route-editing standing"});}}/>
      {sent?<div style={{padding:16}}><div style={{fontSize:40,textAlign:"center",marginBottom:8}}>{"✓"}</div><div style={{textAlign:"center",fontWeight:700,fontSize:15,color:C.text,marginBottom:12}}>{"Thanks — "+sentN+" sent for review"}</div><div style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:11,padding:"11px 13px",fontSize:12.5,color:C.text,lineHeight:1.55,marginBottom:12}}>{"ClimbMatch checks every edit before it goes on the page, so the next party can trust what they read. You’ll be told when it’s checked, and credited as the contributor."}</div><button onClick={onClose} style={{...BTN,width:"100%",background:C.blueSolid,color:C.onSolid,border:"none"}}>Done</button></div>:<div>
      <div ref={scrollRef} style={{minHeight:0,padding:16,overflowY:"auto",overscrollBehavior:"contain",flex:1}}>
        <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px",marginBottom:10}}>{"Spotted something wrong or missing on "}<b>{route.name}</b>{"? Fill in any fields below — leave the rest blank. Every edit is checked by ClimbMatch before it goes on the page, and you’ll be told when it is."}</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>{GROUPED.map(function(g){return <button key={g[0]} onClick={function(){jumpTo(g[1][0].k);}} style={{...CHIP,border:"1px solid "+C.border,background:C.card,color:C.textSub}}>{g[0]}</button>;})}</div>
        <div style={{background:"linear-gradient(180deg,"+C.blueBg+","+C.card+")",border:"1px solid "+C.blue+"55",borderRadius:14,padding:"13px 14px 14px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:10}}><CardHead>{"Discipline"}</CardHead>{discChanged?<span style={{fontSize:11,fontWeight:700,color:C.amber}}>{"Will update the route"}</span>:null}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{DISCS.map(function(d){const on=disc===d[1];return <button key={d[1]} onClick={function(){setDisc(d[1]);}} aria-current={on?"true":undefined} style={{...CHIP,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueSolid:C.surface,color:on?C.onSolid:C.textSub,boxShadow:on?"0 1px 6px "+C.blue+"66":"none",display:"inline-flex",alignItems:"center",gap:6}}><DiscIcon d={d[1]} size={14} color={on?C.onSolid:undefined}/>{d[0]}</button>;})}</div>
        </div>
        {/* Group headers carry their own missing-count and an explicit opener. Every EMPTY field
            used to auto-expand, and the shape almost every route in the catalog actually has is
            name + grade + pitches and nothing else — so on the routes that most need contributing
            to, the form opened with essentially all of them expanded at once: 35 of 39 on a bare
            alpine route, and among them the waypoint MAP PICKER, the itinerary editor and the
            pitch builder, all mounted unasked before the climber had picked anything to fix.
            Collapsing loses nothing, because the collapsed row already says "Not set yet" in
            italic muted text — the gap was never communicated by the expansion, only by the row.
            Same shape as the Bailout and Start-of-climb blocks below, which have always been a
            button that opens a form rather than a form. `scrollTo` and pending suggestions still
            force their own field open, so every deep link into the form still lands expanded. */}
        {GROUPED.map(function(g){const acc=ACCENT[g[0]]||[C.blue,C.blueBg];const _missing=g[1].filter(function(f){return !f.cur||f.cur==="—";});const _gOpen=!!groupOpen[g[0]];return <div key={g[0]} style={{background:C.card,border:"1px solid "+acc[0]+"40",borderLeft:"4px solid "+acc[0],borderRadius:12,padding:"5px 14px 14px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,margin:"11px 0 2px"}}><CardHead tone={acc[0]}>{g[0]}</CardHead>{_missing.length?<button aria-label={(_gOpen?"Hide the ":"Fill in the ")+_missing.length+" missing "+g[0]+" field"+(_missing.length===1?"":"s")} onClick={function(){setGroupOpen(function(p){const o=Object.assign({},p);o[g[0]]=!p[g[0]];return o;});}} style={{flexShrink:0,padding:"5px 10px",borderRadius:9,border:"1px solid "+acc[0]+"55",background:_gOpen?acc[1]:"transparent",color:_gOpen&&acc[1]===C.blueBg?"#fff":acc[0],fontSize:11,fontWeight:700,cursor:"pointer"}}>{_gOpen?"Hide":("Fill in "+_missing.length+" missing")}</button>:null}</div>
          {g[1].map(function(f,fi){const filled=isFilled(f);const pend=(pending&&pending[f.k]&&!pending[f.k].live)?pending[f.k]:null;const isOpen=_lvOf(f.k)!=="high"&&(!!open[f.k]||(_gOpen&&(!f.cur||f.cur==="—"))||scrollTo===f.k||!!pend);const shown=filled?filledStr(f):(pend?("Awaiting review: "+pendStr(f,pend.value)):((!f.cur||f.cur==="—")?"Not set yet":f.cur));const dim=!filled&&!pend&&(!f.cur||f.cur==="—");const help=(HINTS as Record<string,string>)[f.k]||"";return <div key={f.k} id={"sf-section-"+f.k} style={{marginTop:fi?9:0,paddingTop:fi?9:0,borderTop:fi?"1px solid "+C.borderLight:"none"}}>
            <div {...clickable(function(){setOpen(function(o){return Object.assign({},o,{[f.k]:!o[f.k]});});})} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",padding:"8px 0"}}>
              <span style={{fontSize:12.5,fontWeight:700,color:C.text,flexShrink:0}}>{f.label}</span>{(function(){const _lv=_lvOf(f.k);return _lv?<ConfChip level={_lv} label={f.label} compact/>:null;})()}{(function(){const _ag=(route._contribAgreed||{})[f.k];return _ag&&!pend?<span style={{flexShrink:0,fontSize:11,fontWeight:700,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:6,padding:"1px 6px"}}>{_ag>1?"✓ "+_ag+" climbers, checked":"✓ climber edit, checked"}</span>:null;})()}
              <span style={{flex:1,minWidth:0,textAlign:"right",fontSize:11.5,color:filled?acc[0]:(pend?C.amber:(dim?C.textMuted:C.textSub)),fontWeight:(filled||pend)?700:400,fontStyle:dim?"italic":"normal",overflowWrap:"anywhere"}}>{shown}</span>
              <span style={{flexShrink:0,width:24,height:24,borderRadius:"50%",background:isOpen?C.blueSolid:C.blueBg,border:"1px solid "+C.blueDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:isOpen?C.onSolid:"#fff",transform:isOpen?"rotate(180deg)":"none",transition:"transform .15s, background .15s"}}><Chevron open size={13} color="currentColor"/></span>
            </div>
            {isOpen?<div style={{marginTop:8}}>{pend&&pend.mine?<div style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:9,padding:"7px 9px",marginBottom:8,display:"flex",alignItems:"center",gap:7}}><span style={{flex:1,fontSize:11,color:C.text,lineHeight:1.4}}>{"You suggested: "}<b>{pendStr(f,pend.value)}</b>{pend.removes?" — it removes something, so ClimbMatch checks it before it changes the page. Sending another value replaces it.":" — awaiting review by ClimbMatch. Sending another value replaces it."}</span></div>:null}{help?<div style={{fontSize:11,color:C.textMuted,lineHeight:1.4,marginBottom:7}}>{help}</div>:null}{(function(){const cr=curRefStr(f);return cr?<div style={{marginBottom:9,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"9px 11px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5}}><div style={SUB_LABEL}>{"On the app now"}</div>{_txtField(f)&&!_wsNorm(vals[f.k])?<button onClick={function(){setV(f.k,cr);}} aria-label={"Start from this text: copy what is on the app into the "+f.label+" box to edit it"} style={{flexShrink:0,padding:"4px 9px",borderRadius:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>{"Start from this text"}</button>:null}</div><div style={{fontSize:13,color:C.text,lineHeight:1.55,whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:260,overflowY:"auto",overscrollBehavior:"contain"}}>{cr}</div></div>:null;})()}{renderInput(f)}{sameAsApp(f)?<div role="status" style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{"Same as what’s on the app — change it to send a fix."}</div>:null}</div>:null}
          </div>;})}
        </div>;})}
        {_removals.length?<div role="note" style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:11,padding:"10px 12px",marginBottom:10,fontSize:12.5,color:C.text,lineHeight:1.55}}>{"You’re removing something from "}<b>{_removals.map(function(f){return f.label;}).join(", ")}</b>{". Like every edit, ClimbMatch checks it before it changes the page — other parties rely on what’s here. Say why below (at least 10 characters): it’s gone, it’s a duplicate, it’s in the wrong place…"}</div>:null}
        <div style={{marginBottom:4}}><div style={{...SUB_LABEL,margin:"2px 0 6px"}}>{_removals.length?"Why (required)":"Why (optional)"}</div><input aria-label={_removals.length?"Why (required)":"Why (optional)"} value={note} onChange={function(e){setNote(e.target.value);}} placeholder={_removals.length?"e.g. the old bivy at the col is gone, washed out in 2025":"e.g. climbed it last week and it is WI4 now"} style={fld}/></div>
      </div>
      <div style={{padding:"9px 16px 12px",borderTop:"1px solid "+C.border,flexShrink:0}}>{onLog?<div {...clickable(onLog)} style={{fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",textAlign:"center",marginBottom:9}}>Climbed it? Log a trip report instead →</div>:null}<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",marginBottom:8,lineHeight:1.4}}>No need to fill everything — add or fix only what you know.</div><div style={{display:"flex",gap:12}}><button onClick={onClose} style={{flex:1,padding:11,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:"pointer",fontWeight:600}}>Cancel</button><button onClick={submit} disabled={!canSubmit} style={{flex:2,padding:11,background:canSubmit?C.blueSolid:C.surface,color:canSubmit?C.onSolid:C.textMuted,border:canSubmit?"none":"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:canSubmit?"pointer":"default",fontWeight:700}}>{submitLbl}</button></div></div>
    </div>}
    </div>
  </div>,document.body);
}
