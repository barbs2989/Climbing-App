import { catOf, routeAscentFt, gainCoversWholeOuting, wpIs, uElev, shapeOf, uDist, uDistMi, C, CRAG_CATS, sunReadout, SUB_LABEL } from "../../ClimbMatchCore.jsx";
import { effDistKm, recShapeOf, effDistIsWholeTrip, roadWalkMi } from "../../lib/outing.js";
import { uLen } from "../../lib/uLen.js";
import { cruxGrade, displayGrade, gradeConversions, gradeDetail, gradeRangeNote, singleGrade } from "../../lib/grade";
import { routeRock } from "../../lib/rockType";
import { pitchAnchorSummary } from "../../lib/pitchAnchors.js";
import { fmtRopeLen, _ropeEdited } from "../../lib/rack";
import { ropeworkFacts } from "../../lib/ropework";
import CragFactRows from "./CragFactRows.tsx";
import CragFactSection from "./CragFactSection.tsx";
import CardHead from "./CardHead.tsx";
import EditIconButton from "./EditIconButton.tsx";
import CountUp from "./CountUp.tsx";
import { FACT_FIELD } from "../../lib/cragFactField.js";
import { usableFa } from "../../lib/fa";
import type { CragFact } from "./CragFactRows.tsx";

/** One variation as a route stores it: a bare string, or an object with the name, grade and a note. */
type Variation = string | {name?: string | null; grade?: string | null; note?: string | null};
/** A tile in the stats grid: label, value, colour. */
type StatTile = [string, string | number | null | undefined, string];
/** The route; only the fields this card reads. Everything may be missing on a bare route. */
export interface TechStatsRoute {
  /** `walkMi` / `walkGainFt`, one way: the closed road the stored distance includes (lib/outing.js roadWalkMi). */
  road?: {name?: string | null; walkMi?: number | string | null; walkGainFt?: number | string | null} | null;
  elevPts?: number[] | null;
  highPointFt?: number | null;
  waypoints?: unknown[] | null;
  routeFt?: number | null;
  pitchDetail?: {lengthM?: number | null}[] | null;
  pitches?: number | null;
  grade?: string | null;
  cruxGrade?: string | null;
  alpineGrade?: string | null; alpine_grade?: string | null;
  rockGrade?: string | null; rock_grade?: string | null;
  iceGrade?: string | null; ice_grade?: string | null;
  aidGrade?: string | null; aid_grade?: string | null;
  commitment?: string | null;
  maxAngle?: number | null;
  peakMetadata?: {prominence?: number | null; firstAscent?: unknown} | null;
  protRating?: string | null;
  startType?: string | null;
  landing?: string | null;
  pads?: string | number | null;
  crux?: string | null;
  guideStars?: number | string | null; guide_stars?: number | string | null;
  altNames?: unknown; alt_names?: unknown;
  variations?: Variation[] | null;
  bolts?: number | string | null;
  anchor?: string | null;
  location?: string | null;
  descent?: string | null;
  sun?: string | null;
  aspect?: string | null;
  _dbArea?: {aspect?: string | null} | null;
  wet?: string | null; rockQuality?: string | null; fixedGear?: string | null;
  season?: string | null;
  ropeLen?: string | number | null; ropeLengthM?: number | null; ropeType?: string | null;
  fa?: string | null; ffa?: string | null; fwa?: string | null;
}
export interface TechStatsProps {
  route: TechStatsRoute;
  /** Opens the editor, at a field when one is given; without it there are no edit controls. */
  onEdit?: ((field?: string) => void) | null;
  /** "rack" or another crag fact section: draw only that section's rows (the page places them in other cards) instead of the whole card. */
  part?: string | null;
}

const COMMITMENT_EXPLAINERS={I:"A few hours — backing off is quick and low-consequence.",II:"Half a day — retreat is straightforward.",III:"Most of a day — retreat takes real time and planning.",IV:"Full day+ — committing. Retreat is difficult once you're in it.",V:"Multi-day — big commitment. Retreat can mean an overnight out.",VI:"Multi-day, remote, or high-altitude — retreat is a serious undertaking on its own."};
/* "rack" has no heading of its own: its rows (the bolt count and the G/PG-13/R/X protection rating) open the
   RACK card, so a crag route states its protection in ONE place (owner note: "remove protection and just move
   that info to the rack section. Consolidate and remove duplicates"), as Mountain Project's one Protection box does. */
const CRAG_FACT_SECTIONS: [string,string,string[]][]=[["location","WHERE IT STARTS",["Location","Start"]],["rack","RACK",["Bolts","Protection"]],["gear","GEAR & SAFETY",["Anchor","Rope","Rope notes","Fixed gear","Landing","Crash pads","Descent"]],["cond","CONDITIONS",["Aspect","Sun","Season","Wet","Rock quality"]]];
/* Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function TechStats({route,onEdit,part}: TechStatsProps){
  const disc=catOf(route);
  const hasElevPts=route.elevPts&&route.elevPts.length>0;
  const maxEl=hasElevPts?Math.max(...(route.elevPts as number[])):(route.highPointFt||0),minEl=hasElevPts?Math.min(...(route.elevPts as number[])):0,relief=maxEl-minEl;
  const rawAscent=routeAscentFt(route);
  const hasAscent=rawAscent!=null&&rawAscent>0;
  const totalAscentFt=rawAscent||0;const gainIsWholeOuting=gainCoversWholeOuting(route);
  const distKm=effDistKm(route);
  const hasDist=distKm!=null&&distKm>0;
  const roundTripKm=hasDist?distKm*2:null;
  const avgGrade=(hasDist&&hasAscent)?((totalAscentFt/3.28084/(distKm*1000))*100):null;
  const waterCount=(route.waypoints||[]).filter(w=>wpIs(w,"Water")).length;
  const usePitchSumForLen=!route.routeFt&&route.pitchDetail&&route.pitchDetail.length;
  const climbLenRaw=route.routeFt||(route.pitchDetail&&route.pitchDetail.length?route.pitchDetail.reduce((a,pp)=>a+(pp.lengthM||0),0):null);
  const climbDisp=climbLenRaw?(usePitchSumForLen?uLen(climbLenRaw):uElev(climbLenRaw)):null;
  // A loop or point-to-point outing has no "same trail back", so distKm*2 is not a round
  // trip for it — show the distance without inventing a return leg.
  //
  // `outing_shape` (migration 0087) is the recorded answer and wins when a route has one.
  // shapeOf() is the fallback guess, and it is a weak one: it reads name+blurb+summary, and
  // `blurb`/`summary` have no column in `routes`, so on a DB route it sees the NAME alone and
  // defaults to "outback" — 480 of 496 WA alpine routes with a distance, and its `loop` branch
  // never fires because nothing is named "loop". Doubling is still right for most of them (the
  // approach is retraced even when the CLIMB descends another line), which is why the fallback
  // is left as-is rather than made stricter: a prose classifier over `descent` was measured and
  // would have deleted 376 round-trip figures, most of them correct.
  const recShape=recShapeOf(route);const distIsWholeTrip=effDistIsWholeTrip(route);
  const isOutBack=recShape?recShape==="outback":shapeOf(route)==="outback";
  const rtNote=isOutBack?(recShape?" Round trip: this route is recorded as retracing its approach.":" Round trip assumes the same trail back to the trailhead.")
    :recShape==="loop"?" This route loops back to the trailhead by a different line, so doubling the approach would overstate it."
    :recShape==="point"?" This route finishes at a different trailhead, so the total runs from one trailhead to the other."
    :" This route is a loop or point-to-point outing, so no round-trip distance is shown.";
  /* ONE distance tile, and never the one-way figure. It used to print "Distance"/"Approach"
     (the walk IN) beside "Round trip" (the same number doubled) — two tiles for one fact, and the
     one-way one is not what a party plans a day around. What shows now is the whole outing:
     doubled for a route that retraces its approach, and as stored for a recorded loop/point,
     whose distance is the whole outing (effDistIsWholeTrip records how that was established). A
     loop/point GUESSED from the name alone keeps a plain "Distance": it claims neither. */
  const distTile: StatTile|null=!hasDist?null:isOutBack?["Round trip",uDist(roundTripKm),C.blue]
    :distIsWholeTrip?[recShape==="point"?"Total distance":"Round trip",uDist(distKm),C.blue]
    :["Distance",uDist(distKm),C.blue];
  let stats: StatTile[],note: string|null;
  if(disc==="bouldering"){
    stats=[["Crux grade",cruxGrade(route.cruxGrade||route.grade),C.amber]];
    if(distTile)stats.unshift(distTile);
    if(route.routeFt)stats.unshift(["Boulder height",uElev(route.routeFt),C.orange]);
    note="Height is the boulder itself. The distance is just the walk in and out — there is no meaningful elevation gain to a single boulder."+rtNote+"";
  }else if(disc==="hiking"||disc==="mountaineering"){
    stats=[];
    if(hasAscent)stats.push(["Total ascent","↑ "+uElev(totalAscentFt),C.green]);
    if(distTile)stats.push(distTile);
    if(maxEl>0)stats.push(["High point",uElev(maxEl),C.amber]);
    if(route.peakMetadata&&route.peakMetadata.prominence)stats.push(["Prominence",uElev(route.peakMetadata.prominence),C.purple]);
    if(avgGrade!=null)stats.push(["Avg grade",avgGrade.toFixed(1)+"%",C.textSub]);
    if(hasElevPts)stats.push(["Vertical relief",uElev(relief),C.purple]);
    if(route.maxAngle)stats.push(["Max slope",route.maxAngle+"°",C.orange]);
    if(waterCount)stats.push(["Water sources",waterCount,C.blue]);
    note="For a summit objective, total ascent from the trailhead is the number that matters most."+rtNote+"";
  }else if(disc==="alpine"){
    stats=[];
    if(hasAscent)stats.push(["Total ascent","↑ "+uElev(totalAscentFt),C.green]);
    if(climbDisp)stats.push(["Climb length",climbDisp,C.teal]);
    if((route.pitches as number)>0)stats.push(["Pitches",route.pitches,C.blue]);
    if(distTile)stats.push(distTile);
    if(route.maxAngle)stats.push(["Max slope",route.maxAngle+"°",C.orange]);
    if(route.cruxGrade||route.grade)stats.push(["Crux grade",cruxGrade(route.cruxGrade||route.grade),C.amber]);
    if(maxEl>0)stats.push(["High point",uElev(maxEl),C.purple]);
    if(route.peakMetadata&&route.peakMetadata.prominence)stats.push(["Prominence",uElev(route.peakMetadata.prominence),C.purple]);
    /* The Rappels tile used to sit here, at the top of Overview, while every other rappel
       fact — the table, its total length, the prose — sat further down the same tab. It said
       the same thing the RAPPELS heading now says, and it said it on routes that have none:
       rappelCount("0") is 0, not null, so 195 walk-offs rendered a red "0x". Count and
       content are together in one place now; see rappelsAreNone. */
    note="Total ascent is the whole day from the trailhead; climb length is just the technical climbing within it."+rtNote+"";
  }else{
    const climbLabel=disc==="aid"?"Wall height":disc==="scrambling"?"Scramble section":"Route length";
    stats=climbDisp?[[climbLabel,climbDisp,C.teal]]:[];
    /* A scramble is never roped, so it has no pitches: a stored count on a scrambling row is not printed here (owner note, 2026-10-25). Its climbing sections stay on Plan. */
    if((route.pitches as number)>0&&disc!=="scrambling")stats.push(["Pitches",route.pitches,C.blue]);
    if(hasAscent)stats.push([gainIsWholeOuting?"Total ascent":"Approach gain","↑ "+uElev(totalAscentFt),C.green]);
    if(distTile)stats.push(distTile);
    /* On sport, trad and top-rope the route's grade IS its crux (a YDS grade rates the hardest move), so a
       "Crux grade" tile repeated the Composite Grade panel above it, value for value. Mountain
       Project and theCrag print one grade for these. The tile stays only when a stored crux
       disagrees with the route's displayed grade (displayGrade, the header pill), which is
       information rather than an echo. */
    const _cx=(route.cruxGrade||route.grade)?cruxGrade(route.cruxGrade||route.grade):null;
    const _cxEcho=_cx&&(disc==="sport"||disc==="trad"||disc==="toprope")&&displayGrade(route)===_cx;
    if(_cx&&!_cxEcho)stats.push(["Crux grade",_cx,C.amber]);
    if(route.maxAngle)stats.push(["Max slope",route.maxAngle+"°",C.orange]);
    if(route.peakMetadata&&route.peakMetadata.prominence)stats.push(["Prominence",uElev(route.peakMetadata.prominence),C.purple]);
    /* Second copy of the Rappels tile — same reasoning as the pitched branch above. */
    const _gainClause=!hasAscent?"":(gainIsWholeOuting?"Total ascent is the whole day from the trailhead, not just the walk in.":"Approach gain is the hike in to the base.");const _distClause=!hasDist?"":(distIsWholeTrip?" Distance is the whole outing, not just the walk in.":isOutBack?" Round trip is the walk in to the base and back out.":"");note=(hasAscent||hasDist)?(climbLabel+" is the climbing itself. "+(_gainClause+_distClause).trim()+rtNote+""):null;
  }
  /* Discipline-agnostic tiles, appended after BOTH branches above so they cannot be lost to
     whichever branch a route falls into. Every one of these is offered in SuggestFix and, until
     now, rendered nowhere at all: protRating (trad/sport), landing/pads/startType (the WHOLE
     bouldering group of the contribute form). A contributor could pass the 3-agree gate on a
     runout X-rated line and the route would still say nothing about it. protRating is coloured
     by consequence rather than uniformly, because "R" and "X" are the reason the field exists. */
  if(route.protRating)stats.push(["Protection",route.protRating,(/^(R|X)$/i.test(String(route.protRating).trim())?C.red:/PG/i.test(String(route.protRating))?C.amber:C.green)]);
  if(route.startType)stats.push(["Start",route.startType,C.blue]);
  if(route.landing)stats.push(["Landing",route.landing,(/bad|danger/i.test(String(route.landing))?C.red:/slop/i.test(String(route.landing))?C.amber:C.green)]);
  if(route.pads!=null&&route.pads!=="")stats.push(["Crash pads",String(route.pads),C.teal]);
  /* 0131 gave `rock` and `crux` columns. They join the tiles rather than getting a section of
     their own, because both are a short noun or phrase — a rock type and "what the hard bit
     is" — and a column that lands somewhere nothing reads is the failure this block was
     written to fix. Neither is coloured: there is no hazard reading to make of "granite". */
  /* Since 0248 the AREA carries a rock type too, so a route that states none still shows its crag's.
     A MAPPED one (the bedrock at the crag's coordinate) reads plainly as "Rock", the way Mountain
     Project and theCrag print a crag's rock: the owner removed the mapped qualifier 2026-10-15. */
  const _rk=routeRock(route);
  if(_rk)stats.push(["Rock",_rk.label,C.textSub]);
  if(route.crux)stats.push(["Crux",String(route.crux),C.textSub]);
  /* ROUTE FACTS. On a crag discipline (sport, trad, toprope, aid, bouldering) this card is the ONE
     place the guidebook facts live, so every crag route reads the same set in the same order rather
     than each discipline growing its own box. Every row is gated on its own value: a bare route —
     name, grade, pitches — gains nothing here, because a row that says "unknown" under every fact
     is a placeholder, not a fact. Bolts is `bolts` (0240), never counted out of pitch prose. Aspect
     and season are here because a crag route without a Plan tab had nowhere else to show them.
     REPUTATION, ALSO CALLED, VARIATIONS and the first FREE ascent are facts about any line, so they
     render on every discipline. Reputation is `guide_stars` (0-4), a guidebook rating kept apart from
     `stars` (the climbers' own 1-5 votes) and never attributed. It was labelled "Quality", then "Star rating";
     both read as the climbers' votes, which a route with no votes yet then seemed to have (owner, 2026-10-30). */
  const crag=CRAG_CATS.includes(disc);const facts: CragFact[]=[];let _missN=0,_firstMiss: string|null=null;
  const _gsRaw=route.guideStars!=null?route.guideStars:route.guide_stars;const _gs=(_gsRaw==null||_gsRaw===""||!isFinite(+_gsRaw))?null:Math.max(0,Math.min(4,Math.round(+_gsRaw)));
  if(_gs!=null)stats.unshift(["Reputation","★".repeat(_gs)+"☆".repeat(4-_gs),C.amber]);
  const _alt=(function(a: unknown){return (Array.isArray(a)?a:(a?[a]:[])).map(function(x: unknown){return String(x==null?"":x).trim();}).filter(Boolean);})(route.altNames!=null?route.altNames:route.alt_names);
  if(_alt.length)facts.push(["Also called",_alt.join(", ")]);
  const _vars=(Array.isArray(route.variations)?route.variations:[]).map(function(v){if(v==null)return "";if(typeof v!=="object")return String(v).trim();return [v.name,v.grade].filter(Boolean).join(" · ")+(v.note?" — "+v.note:"");}).filter(Boolean);
  if(_vars.length)facts.push(["Variations",<>{_vars.map(function(v,i){return <div key={i} style={{marginTop:i?3:0}}>{v}</div>;})}</>]);
  if(crag){
    if(disc!=="bouldering"&&+(route.bolts as number|string)>0)stats.push(["Bolts",String(Math.round(+(route.bolts as number|string))),C.blue]);
    /* ANCHOR is `anchor` (0242): a short value ("2-bolt chains", "tree, walk off"), the route's TOP
       anchor — a pitch's own anchor stays on its ROUTE BREAKDOWN row. Style is NOT here: `features`
       already draws as the tag chips (RouteTagRow), and a row would print it twice. */
    /* A multipitch crag line whose belays differ says so: the top anchor, then each kind by pitch. */
    const _anc=String(route.anchor||"").trim();const _pAnc=disc!=="bouldering"?pitchAnchorSummary(route):null;if(disc!=="bouldering"&&((_anc&&_anc.length<=80)||_pAnc))facts.push(["Anchor",_pAnc?((_anc&&_anc.length<=80?_anc+" at the top · ":"")+"by pitch: "+pitchAnchorText(_pAnc)):_anc]);const _longOnFile: string[]=[];if(_anc.length>80)_longOnFile.push("Anchor");
    /* LOCATION is `location` (0243): where the line starts on its wall, which is how a climber finds it
       at the base. First among the facts, because it is the first thing needed at the crag. */
    const _loc=String(route.location||"").trim();const _locAll=CRAG_CATS.includes(disc);/* on a crag it has a section of its own, so it is never too long to show */if(_loc&&(_locAll||_loc.length<=160))facts.unshift(["Location",_loc]);if(!_locAll&&_loc.length>160)_longOnFile.push("Location");
    const _dsc=String(route.descent||"").trim();if(_dsc&&_dsc.length<=140)facts.push(["Descent",_dsc]);
    /* SUN is `sun` (0247): when this wall is in sun or shade, as stated for it. Where it exists it
       replaces the sun line computed from the aspect — the stated hours are the better fact. */
    const _sun=String(route.sun||"").trim();
    const _aspOwn=String(route.aspect||"").trim();const _aspWall=_aspOwn?"":String((route._dbArea&&route._dbArea.aspect)||"").trim();const _asp=_aspOwn||_aspWall;if(_asp){const _sr=_sun?null:sunReadout(_asp,disc);facts.push(["Aspect",(/^[NSEW]{1,3}([/ -][NSEW]{1,3})*$/i.test(_asp)?_asp+"-facing":_asp.replace(/\.$/,""))+(_aspWall?" (the crag's wall)":"")+"."+(_sr&&_sr.line?" "+_sr.line:"")]);}
    if(_sun)facts.push(["Sun",_sun]);
    /* WET, ROCK QUALITY and FIXED GEAR (0247): seepage after rain, loose or polished rock, and the
       pitons/bolt ladders already in place. Short stated values, so each is a facts row, not a tile. */
    [["Wet",route.wet],["Rock quality",route.rockQuality],["Fixed gear",route.fixedGear]].forEach(function(f){const v=String(f[1]||"").trim();if(v&&v.length<=160)facts.push([f[0] as string,v]);else if(v)_longOnFile.push(f[0] as string);});
    const _sea=String(route.season||"").trim();if(_sea)facts.push(["Season",_sea]);
    /* ROPE. Rope length, rope type and the ropework note were read only by RouteRackBox and RopeworkBox,
       which mount OFF the crag disciplines, so on a trad, sport or aid route all three reached no screen
       (122 crag routes carry one) and the editor's rope length had nowhere to show. Same precedence as
       the RACK box: an agreed correction wins, else the enrichment number. */
    if(disc!=="bouldering"&&disc!=="toprope"){const _rc=route.ropeLen?fmtRopeLen(route.ropeLen):"";const _rl=(_ropeEdited(route)&&_rc)?_rc:(route.ropeLengthM?(route.ropeLengthM+"m"):_rc);const _rope=[route.ropeType,_rl].filter(Boolean).join(" ").trim();if(_rope)facts.push(["Rope",_rope]);const _rf=ropeworkFacts(route);if(_rf.link)facts.push(["Pitches link",_rf.link]);if(_rf.simul)facts.push(["Simul-climbing",_rf.simul]);}
    /* EMPTY IS A PLACEHOLDER (owner, 2026-10-07): every fact THIS DISCIPLINE has is listed whether or
       not the route states it, so a climber sees what is missing and can add it. Only facts that
       pertain to the discipline — no bolts on a boulder, no landing on a sport line. A missing fact
       reads "Not on file yet", never "unknown" or a guess, and one link under the list opens the editor. */
    const _have=new Set(facts.map(function(f){return f[0];}).concat(stats.map(function(t){return t[0];})).concat(_longOnFile));
    /* Each of these is a field the contribute form offers for this discipline (its DROP rules match),
       so every "Not on file yet" can actually be filled. Descent is not here: the DESCENT section
       below carries its own placeholder. */
    const _want=disc==="bouldering"?["Location","Landing","Crash pads","Start","Aspect","Season","Rock quality","Wet"]
      :["Location"].concat(disc==="toprope"?[]:["Pitches",disc==="aid"?"Wall height":"Route length"]).concat(disc==="sport"?["Bolts"]:[]).concat(disc==="sport"||disc==="trad"?["Protection"]:[]).concat(["Anchor"]).concat(disc==="toprope"?[]:["Rope"]).concat(["Aspect","Season","Rock quality","Wet"]).concat(disc==="trad"||disc==="aid"?["Fixed gear"]:[]);
    _want.forEach(function(k){if(_have.has(k))return;facts.push([k,<span style={{color:C.textMuted,fontStyle:"italic"}}>Not on file yet</span>,true]);});
    const _secL=new Set(CRAG_FACT_SECTIONS.flatMap(function(s){return s[2];}));
    for(let i=stats.length-1;i>=0;i--){if(_secL.has(stats[i][0])){facts.push([stats[i][0],<span style={{color:stats[i][2],fontWeight:700}}>{stats[i][1]}</span>]);stats.splice(i,1);}}
    if(part){const sec=CRAG_FACT_SECTIONS.find(function(s){return s[0]===part;});const rows=sec?sec[2].map(function(l){return facts.find(function(f){return f[0]===l;});}).filter(Boolean) as CragFact[]:[];return !rows.length?null:part==="rack"?<div style={{marginTop:-6,marginBottom:6,borderBottom:"1px solid "+C.border}}><CragFactRows rows={rows} onEdit={onEdit}/></div>:<CragFactSection title={(sec as [string,string,string[]])[1]} rows={rows} onEdit={onEdit}/>;}
    facts.splice(0,facts.length,...facts.filter(function(f){return !_secL.has(f[0]);}));
    const _mt=facts.filter(function(f){return f[2];});_missN=_mt.length;_firstMiss=_mt.length?_mt[0][0]:null;
  }
  /* A road closed below the trailhead: the distance starts where a climber can park, and the note
     says how much of it is the road (lib/outing.js roadWalkMi), so it reads as the walk it is. */
  const _walk=roadWalkMi(route);if(_walk&&hasDist&&!crag){const _wg=Number(route.road&&route.road.walkGainFt);const _rn=String((route.road&&route.road.name)||"").trim();note=(note?note+" ":"")+(hasAscent&&_wg>0?"Distance and ascent include ":"Distance includes ")+"about "+uDistMi(_walk)+" each way on the closed road"+(_rn?" ("+_rn+")":"")+(hasAscent&&_wg>0?" and the "+uElev(_wg)+" it climbs":"")+", from where you can park to the trailhead.";}
  if(part)return null;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><CardHead>{crag?"ROUTE FACTS":"TECHNICAL STATS"}</CardHead>{onEdit?<EditIconButton onClick={onEdit} title={crag?"Edit route facts":"Edit technical stats"}/>:null}</div>{(function(){const ag=route.alpineGrade||route.alpine_grade,rg=route.rockGrade||route.rock_grade,ig=route.iceGrade||route.ice_grade,adg=route.aidGrade||route.aid_grade,cm=route.commitment,gg=route.grade;const P: [string,string][]=[];if(rg)P.push(["Rock",rg]);if(cm)P.push(["Commitment",cm]);if(ag)P.push(["Alpine",ag]);if(ig)P.push(["Ice",ig]);if(adg)P.push(["Aid",adg]);if(P.length<1&&gg)P.push(["Grade",gg]);const notes: [string,string][]=[];[["Rock",rg],["Commitment",cm],["Alpine",ag],["Ice",ig],["Aid",adg],["Grade",gg]].forEach(function(p){const d=p[1]?gradeDetail(p[1]):"";if(!d||notes.some(function(n){return n[1]===d;}))return;notes.push([p[0] as string,d]);});if(P.length<1)return null;/* A class RANGE is one grade on screen (its top, or the headline it contains) plus this notice — see gradeRangeNote. */const rangeNote=gradeRangeNote(route);/* The same grade in other scales, as Mountain Project prints it under a route's grade (lib/grade.js gradeConversions). */const conv=gradeConversions(displayGrade(route));const cmExp=cm?(COMMITMENT_EXPLAINERS as Record<string,string>)[String(cm).replace(/^Grade\s*/i,"").trim()]:null;return <div style={{marginBottom:11,paddingBottom:11,borderBottom:"1px solid "+C.border}}><div style={{...SUB_LABEL,marginBottom:7}}>Composite Grade</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{P.map(function(p){return <span key={p[0]} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:13,fontWeight:700,color:C.text,background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"3px 9px"}}><span style={{color:C.textMuted,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.3}}>{p[0]}</span>{singleGrade(p[1],route)}</span>;})}</div>{conv.length?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:7}}>{"About "+conv.map(function(x){return x[1]+" "+x[0];}).join(" · ")}</div>:null}{rangeNote?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:8}}>{rangeNote}</div>:null}{notes.length?<div style={{marginTop:8}}>{notes.map(function(n){return <div key={n[0]} style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:4}}><span style={{fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3}}>{n[0]}</span>{" · "+n[1]}</div>;})}</div>:null}{cmExp?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:8}}>{cmExp}</div>:null}{cmExp?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:4}}>{"Commitment counts the climb, not the walk in — a long approach can make a Grade II a multi-day trip."}</div>:null}</div>;})()}<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>{stats.map(st=><div key={st[0]} style={{background:C.surface,borderRadius:9,padding:"8px 10px"}}><div style={{fontSize:15,fontWeight:700,color:st[2]}}><CountUp value={st[1]}/></div><div style={{fontSize:11,color:C.textMuted,marginTop:2,textTransform:"uppercase",letterSpacing:0.4}}>{st[0]}</div></div>)}</div>{facts.length?<div style={{marginTop:stats.length?14:4}}>{(function(){/* GROUPED, so ten facts do not read as one undifferentiated run: what the line IS, what protects it,
     and when it is in shape. The label column is 92px and wraps at spaces — at 62px "PROTECTION" and
     "ROCK QUALITY" ran under their own values. A heading shows only when more than one group renders. */const G: [string,string[]][]=[["The line",["Also called","Variations","Location","Start"]],["Gear & safety",["Bolts","Protection","Anchor","Rope","Rope notes","Fixed gear","Landing","Crash pads","Descent"]],["Conditions",["Aspect","Sun","Season","Wet","Rock quality"]]];const placed=new Set();let groups=G.map(function(g): [string,CragFact[]]{const rows=g[1].map(function(l){return facts.find(function(f){return f[0]===l;});}).filter(Boolean) as CragFact[];rows.forEach(function(f){placed.add(f[0]);});return [g[0],rows];});const rest=facts.filter(function(f){return !placed.has(f[0]);});if(rest.length)groups[0][1]=groups[0][1].concat(rest);groups=groups.filter(function(g){return g[1].length;});return groups.map(function(g,gi){return <div key={g[0]} style={{marginTop:gi?14:0}}>{groups.length>1?<div style={{...SUB_LABEL,color:C.textSub,paddingBottom:6,marginBottom:2,borderBottom:"1px solid "+C.border}}>{g[0]}</div>:null}{g[1].map(function(f,i){return <div key={f[0]} style={{display:"flex",gap:12,alignItems:"baseline",padding:"8px 0",borderTop:i===0?"none":"1px solid "+C.borderLight}}><span style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.35,width:92,flexShrink:0}}>{f[0]}</span><span style={{fontSize:13,color:C.text,lineHeight:1.5,flex:1,minWidth:0,overflowWrap:"anywhere"}}>{f[1]}</span></div>;})}</div>;});})()}</div>:null}{_missN&&onEdit?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginTop:12,paddingTop:10,borderTop:"1px solid "+C.border}}><span style={{fontSize:12,color:C.textMuted,lineHeight:1.4}}>{_missN+(_missN===1?" fact":" facts")+" not on file yet"}</span><button onClick={function(){onEdit((FACT_FIELD as Record<string,string>)[_firstMiss as string]);}} style={{padding:"6px 0",border:"none",background:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{"Add what you know →"}</button></div>:null}{route.fa&&!(route.peakMetadata&&route.peakMetadata.firstAscent)?<div style={{marginTop:10,fontSize:12.5,color:C.textSub,lineHeight:1.4}}><span style={{...SUB_LABEL}}>First Ascent</span>{" · "+route.fa}</div>:null}{(function(){/* The first FREE and first WINTER ascent sit under the first-ascent line, each only when present and
   different from it. Both go through usableFa(), the same placeholder test `fa` gets ("unknown", "??"). */const fa0=String(route.fa||"").trim();const rows=[["First Free Ascent",route.ffa],["First Winter Ascent",route.fwa]].map(function(p){const v=usableFa(p[1]);return [p[0],v==null?"":String(v).trim()];}).filter(function(p){return p[1]&&p[1]!==fa0;});if(!rows.length)return null;return <>{rows.map(function(p,i){return <div key={p[0]} style={{marginTop:(i||route.fa)?4:10,fontSize:12.5,color:C.textSub,lineHeight:1.4}}><span style={{...SUB_LABEL}}>{p[0]}</span>{" · "+p[1]}</div>;})}</>;})()}{note?<div style={{fontSize:11.5,color:C.textMuted,marginTop:8,lineHeight:1.5}}>{note}</div>:null}</div>;
}
const pitchAnchorText=function(sum: NonNullable<ReturnType<typeof pitchAnchorSummary>>){return sum.map(function(x){return x[0]+" "+x[1];}).join(" · ");};
