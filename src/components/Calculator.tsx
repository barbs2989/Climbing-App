import { uImp, gainBelowOwnPins, RSL as SL, C, SUB_LABEL, loggedTimeStats, fmtDurMin, uElev, pitchedFraction, gn, scarfHrs, techHrs, uDist } from "../../ClimbMatchCore.jsx";
import { useState } from "react";
import { FONT_MONO } from "../../lib/fonts.js";
import type { Dispatch, SetStateAction } from "react";
import { planTimes, summitDayPlan } from "../../lib/planTimes";
import { isMultiDayOuting, itinDayCount } from "../../lib/outing.js";
import Hr from "./Hr.tsx";
import EditIconButton from "./EditIconButton.tsx";

/** The four planner inputs (kept in kilograms, hours from midnight). */
export interface CalcInputs {
  fit: string;
  pack: number;
  party: number;
  depart: number;
  /** When the party leaves CAMP on a multi-day trip's summit day (summitDayPlan). Its own input, default
   *  4:00 AM, the alpine start: a 6:00 AM camp start put 115 of 507 multi-day summits after 1 PM. */
  camp?: number;
}
/** One leg of the published plan. */
interface SectionRow {
  section?: string | null;
  fromTo?: string | null;
  note?: string | null;
  hrs?: number | null;
}
/** One day of the itinerary. */
interface DayRow {
  title?: string | null;
  note?: string | null;
  hours?: number | null;
}
/** One stored walking segment. */
interface Segment {
  name?: string | null;
  distKm?: number | null;
  gainM?: number | null;
  lossM?: number | null;
  type?: string | null;
}
/** The route; only the fields the calculator itself reads (planTimes and the other helpers read more). */
export interface CalculatorRoute {
  timing?: {
    recommendedStart?: string | null;
    approachTimeHrs?: number | null;
    /* The climb on a linked way in needed to reach its start: named inside the approach, never added. */
    climbToStartHrs?: number | null;
    summitTimeHrs?: number | null;
    descentTimeHrs?: number | null;
    totalHrs?: number | null;
    sectionBreakdown?: SectionRow[] | null;
  } | null;
  itinerary?: {days?: DayRow[] | null} | null;
  distKm?: number | string | null;
  gainM?: number | string | null;
  lossM?: number | string | null;
  pitches?: number | null;
  grade?: string | null;
  discipline?: string | null;
  segments?: Segment[] | null;
}
export interface CalculatorProps {
  route: CalculatorRoute;
  /** The merged reports list (seed reports, the reader's own logs and other climbers' logs); defaulted so a caller that omits it renders the plain estimate. */
  activity?: unknown[] | null;
  /** Drives fitness alone, when a caller wants to (the page passes `calc`/`onCalc` instead). */
  fit?: string;
  setFit?: (fit: string) => void;
  /** The four inputs, lifted so they survive a sub-tab switch; without them the calculator keeps its own. */
  calc?: CalcInputs | null;
  onCalc?: Dispatch<SetStateAction<CalcInputs>> | null;
  /** Opens the route edit sheet at Published times (offered on the mountain disciplines whose planner shows it, lib/fieldScope.js). Omitted = no pencil. */
  onEditTiming?: (() => void) | null;
}

const uGain=(m: number)=>uImp()?Math.round(m*3.28084).toLocaleString()+" ft":Math.round(m).toLocaleString()+" m";
/* THE PLANNER PRINTED ITS DAY PLAN TWICE, AND THE SECOND COPY WAS THE WORSE ONE.
   `timing.sectionBreakdown[i]` is `{section, fromTo, note, hrs}` and `itinerary.days[i]` is
   `{n, title, note, hours, miles, gainFt, lossFt, packLb, objective, schedule}` — and entry for
   entry, `fromTo` IS `title`, `hrs` IS `hours`, `note` IS `note`. Trip plan renders first, then
   PUBLISHED TIMES repeats it a few hundred pixels down.

   Measured across the catalog (scripts/oneoff/measure-timing-vs-itinerary-shape.mjs): of the 546
   routes carrying a sectionBreakdown, **526 (96.3%) are mirrored entry-for-entry by the days**,
   and on **497** of those the sectionBreakdown `note` is TRUNCATED mid-sentence with an ellipsis
   — so the repeat is not merely redundant, it is a cut-off version of the paragraph already on
   screen above it. The days also carry miles, gain, loss, pack weight and an objective that the
   sections do not.

   So the repair is to stop rendering the duplicate, NOT to merge two panels — which was the first
   plan, and assumed the two carried different content. Nothing is dropped from the panel itself:
   the four hour tiles and `recommendedStart` are its own fields and always render.

   IT IS CONDITIONAL BECAUSE 20 ROUTES STILL NEED IT: 14 whose sectionBreakdown says something the
   days do not, and 6 with no itinerary days at all, where this panel is the only place the
   breakdown reaches a screen. Suppressing unconditionally would delete their only copy — the
   [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] shape. `section`
   ("Approach") is deliberately NOT compared: it is a coarse category rather than content, and
   demanding the day repeat it would keep every duplicate on screen. */
function sectionsCoveredByItinerary(route: CalculatorRoute){
  const sb=(route&&route.timing&&Array.isArray(route.timing.sectionBreakdown))?route.timing.sectionBreakdown:[];
  const days=(route&&route.itinerary&&Array.isArray(route.itinerary.days))?route.itinerary.days:[];
  if(!sb.length||days.length!==sb.length)return false;
  const n=function(x: unknown){return String(x==null?"":x).trim();};
  return sb.every(function(sec,i){
    const d: DayRow=days[i]||{};
    if(n(sec.fromTo)!==n(d.title))return false;
    if(!((sec.hrs==null&&d.hours==null)||Number(sec.hrs)===Number(d.hours)))return false;
    const sn=n(sec.note),dn=n(d.note);
    // An ellipsis-terminated section note is the SHORTER copy; the day holds the full sentence,
    // so a day that merely STARTS with it still covers it.
    return !sn||dn===sn||dn.startsWith(sn.replace(/[\u2026.]+$/,""));
  });
}
/* `activity` is passed in rather than read off `route`: the merged list RouteDetail builds is
   seed reports + the reader's own logs + OTHER CLIMBERS' logs from the DB (#787), and only that
   third source makes "what parties actually took" mean more than "what I took". Defaulted so a
   caller that omits it renders the estimate exactly as before rather than throwing. */
/* Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function Calculator({route,activity,fit:fitProp,setFit:setFitProp,calc,onCalc,onEditTiming}: CalculatorProps){
  /* THE PLANNER INPUTS SURVIVE A SUB-TAB SWITCH, which is the same fix #1581 gave FloatPlan one
     sub-tab over. <Calculator/> renders ~17k characters inside the `tab==='planner'` branch, so
     tapping Safety to check the hazards unmounted it and every input reverted: pack 10kg, party 2,
     depart 06:00. The climber came back to a DIFFERENT estimated summit time than the one they had
     just read, with nothing on screen saying it had changed — and a lighter pack reads FASTER, the
     optimistic direction #641 records for the return tile.
     ONE OF THE FOUR WAS ALREADY LIFTABLE AND THE MECHANISM WAS NEVER WIRED: `fit`/`setFit` props
     existed and the single call site passed neither, so `fitProp` was undefined and it fell back to
     local state like the other three. A lift nothing hands state to is not a lift. The props are
     kept so a caller can still drive fitness alone; `calc`/`onCalc` carry all four. */
  const [own,setOwn]=useState<CalcInputs>({fit:"intermediate",pack:10,party:2,depart:6,camp:4});
  const st=calc||own,setSt=onCalc||setOwn;
  const setK=(k: keyof CalcInputs)=>(v: string|number)=>setSt(x=>({...x,[k]:v}));
  const fit=fitProp||st.fit,setFit=setFitProp||setK("fit");
  const pack=st.pack,setPack=setK("pack");
  const party=st.party,setParty=setK("party");
  const depart=st.depart,setDepart=setK("depart");
  const camp=st.camp!=null?st.camp:4,setCamp=setK("camp");
  /* The time maths -- stored legs vs the walk model, the up/down split, the whole-day rows -- live in
     lib/planTimes.js, because the Conditions tab's alpine start counts back from the same estimate. */
  const P=planTimes(route,{fit,pack,party,depart});
  const {hasPublishedSummitH,hasDerivedSummitH,publishedIsWholeDay}=P;
  // The walk used to be shown only on a raw distance-or-gain test (hasHikeInputs), an OR, so ONE of the three is enough to render a confident total -- while
  // scarfHrs still charges every missing component as 0. Measured on the live catalog: 950
  // routes render a confident estimate and only 625 carry all three, so 325 of them (34%) were
  // quoting a number with a silently free leg. Worst case is dist-only, which drops both the
  // gain and the descent: a route with 1,200 m of climbing rendered a 1.8hr approach as fact,
  // in green, against 5.6hr once the missing pieces are supplied. Name the components rather
  // than saying "no approach data", because here most of it IS present.
  const _missHike: string[]=[];
  // What the walk READ (planTimes: the trip plan's miles and day gains count), so the note never says "no gain" under a leg card printing it.
  if(P.walkKm==null)_missHike.push("approach distance");
  if(P.walkGainM==null)_missHike.push("elevation gain");
  if(route.lossM==null||route.lossM==="")_missHike.push("elevation loss");

  /* There used to be a `hikeCoversWholeDay` flag here (gainCoversWholeOuting: gain and loss within
     3%) that relabelled the Approach tile "On foot" and dropped the walk out from the return,
     because the one walk leg charged gain AND loss and so was already the round trip on those rows.
     The walk is split into its up and down legs now (lib/planTimes.js), so there is no round
     trip to relabel and nothing counted twice: the tile is the walk IN on every row, and every
     return walks out. check:return-leg holds both. */
  /* A gain PRESENT and contradicted, as opposed to absent. _missHike above names what is
     missing; this names what is impossible. Both make the number below a floor, so they are
     worded the same way and sit together. */
  const gainShort=gainBelowOwnPins(route);
  const missHikeLabel=_missHike.length===1?_missHike[0]:_missHike.slice(0,-1).join(", ")+" or "+_missHike[_missHike.length-1];
  /* WHETHER EACH LEG HAS A TIME is planTimes' own test (approachTimed / climbTimed / descentTimed / anyTimed),
     the one SummitLegsCard and DescentLegStrip read, so a tile here can never say N/A beside a leg card that
     times it. It used to be a raw-column test written here, which missed the trip plan's day miles and a pitch
     count estimated from the length (owner, 2026-11-23). */
  const hasAnyEstimate=P.anyTimed;
  const {hikeH,techH,sumH,retH,storedApproachH}=P;
  const dayOf=(h: number)=>Math.floor(Math.round(h*60)/1440);const fmt=(h: number)=>{let total=Math.round(h*60);const day=dayOf(h);total=total%1440;const hr=Math.floor(total/60),mn=total%60,ap=hr>=12?"PM":"AM",h12=hr%12||12;return `${h12}:${String(mn).padStart(2,"0")} ${ap}${day>0?" (+"+day+"d)":""}`;};
  /* THE TWO RED LABELS BELOW ARE COMPARED AGAINST A CLOCK HOUR, AND sumH/retH ARE UNBOUNDED.
     Both are absolute hours from midnight of the DEPARTURE day, so an estimate that crosses
     midnight passes 18.5 (6:30 PM) and 13 (1:00 PM) permanently -- while `fmt`, declared one line
     up, reduces the same value mod 1440 to render a clock time and appends "(+Nd)". The result was
     a red "After dark" beside "Est. return 12:10 PM (+1d)", and "Leave earlier" beside a 4:28 AM
     summit, where leaving earlier makes it DARKER. Measured across the WA catalog at the
     calculator's default settings: 168 of 495 "After dark" labels annotated a return in broad
     daylight (eight within 15 minutes of NOON, one of them wa_mount_stuart_north_ridge -- the
     route check:ui pins as its sample), and 67 of 556 "Leave earlier" labels sat beside a morning
     summit.

     THE TESTS ARE RIGHT AND THE WORDING WAS WRONG, which is why neither threshold moves. `retH >
     18.5` is exactly "this outing runs past dusk", which is the correct trigger for a warning on
     any outing however long; what it cannot say is WHICH DAY the arrival lands on. So the trigger
     is untouched -- no warning is added and none is suppressed -- and the LABEL gains the day.
     "Overnight" is the stronger claim of the two, not a softer one, so this cannot under-warn in
     the #641 direction: a party out past a second dawn is being told something larger than "after
     dark", not something smaller. The tile stays red either way.

     `dayOf` is the SAME function `fmt` uses for the "(+Nd)" suffix, deliberately: a second
     next-day test written here could disagree with the suffix rendered inches away. */
  /* `multiDay` WAS GATED ON `route.campOptions`, WHICH IS SEED-ONLY, SO THIS DISCLAIMER RENDERED
     FOR NOBODY IN PRODUCTION — on exactly the routes whose single-push estimate is least
     believable. The shared derivation and the measurement behind it are in lib/outing.js; note in
     particular that porting the old gate to `bivy` would have LOOKED like a fix and changed
     nothing, because 0 of the 796 WA routes carrying a bivy entry has a starred camp.
     THE COPY MOVED WITH THE GATE, and it had to: it used to say "use the Plan tab for a realistic
     day-by-day plan" while sitting ON the Plan tab, with <ItineraryView/>'s "Trip plan" rendered
     directly above it — a pointer past the very thing it was pointing at, invisible for as long
     as the box rendered for nobody. Ask what a newly-reachable surface SAYS, not only that it now
     reaches somebody. */
  const late=retH>18.5,sumLate=!publishedIsWholeDay&&sumH>13,multiDay=isMultiDayOuting(route);
  /* A MULTI-DAY TRIP IS SHOWN AS DAYS (owner, 2026-11-18: "What if the trip is multiple days?"). The
     single push above added every day into one run from Depart, so 445 of 507 multi-day WA routes
     showed a red After dark or Overnight for a trip that sleeps in camp. summitDayPlan (lib/planTimes.js)
     lays the same estimate out as the walk in, the summit day timed from camp, and the walk out; Depart
     becomes the time the party leaves camp. */
  const sd=multiDay?summitDayPlan(route,P,{depart:camp,party}):null;
  // The N/A on the Approach tile was only half that fix. Total, Est. summit and Est. return
  // all still add hikeH, and hikeH is 0 whenever the approach inputs are missing -- 204,469
  // of the catalog's 205,492 routes. It used to be obvious (0.0hr Total, summit at the
  // departure minute); once a pitch count made techH non-zero it merely looked plausible,
  // so the tell went away and the fault did not. These are lower bounds, not estimates.
  // Never paint one green either: a green "Est. return" asserts you are down before dark,
  // and with the walk in and the walk out both counted as zero we cannot assert that.
  /* A STORED approach or descent is not a hole: lib/planTimes.js uses the route's own leg where it
     has one, so a leg is a floor only when it is neither stored nor fully walkable. */
  const {walkInKnown,walkOutKnown}=P;
  const approachUnknown=hasAnyEstimate&&!(walkInKnown&&walkOutKnown)&&!publishedIsWholeDay;
  /* THE SAME DEFECT ON THE OTHER LEG. `techHrs(0,...)` is 0, so a roped route with no recorded
     pitch count and no published or derived summit time contributes a climbing leg of ZERO to
     Total, Est. summit and Est. return -- "unknown" counted as "none", which is exactly what the
     comment above says about the walk. The catalog makes it look enormous (128,020 roped routes
     store 0 or null pitches) and the SCREEN is what decides: `cragOnly` means trad and sport
     never mount this calculator at all, `hasAnyEstimate` ends in `!!route.pitches` which is FALSY
     at 0, and the Climbing tile already renders N/A. Measured 2026-09-23 by
     scripts/oneoff/measure-zero-pitch-estimate-reach.mjs: SIX routes reach this state, three of
     which `approachUnknown` was already hedging for its own reasons. This is the other three.

     climbKnown IS THE CLIMBING TILE'S OWN TEST, not a second one written beside it. That tile
     renders `techH` when `(hasPublishedSummitH||hasDerivedSummitH||route.pitches)` and N/A
     otherwise, so deriving the marker from the same expression means the "N/A" and the ">=" can
     never disagree -- the rule this file already applies to `_hfr`, `_memN` and `dayOf`.

     NO `!publishedIsWholeDay` CLAUSE, deliberately: `publishedIsWholeDay` requires either
     `summitTimeHrs != null` (`hasPublishedSummitH`) or a positive total with no legs
     (`hasDerivedSummitH`), so it is a SUBSET of climbKnown and the guard could never fire. A redundant condition in a guard reads as
     coverage and is not, so it is asserted in probe-climb-leg-lower-bound.mjs instead of
     written here. */
  const climbKnown=P.climbKnown;
  const climbUnknown=hasAnyEstimate&&!climbKnown;
  /* The AGGREGATES are lower bounds if EITHER leg is missing; the Approach tile keeps its own
     flag, because an unrecorded pitch count says nothing about the walk. */
  const lowerBound=approachUnknown||climbUnknown;
  /* A section of the Plan tab like TRIP PLAN above it, so it takes the same section header (owner's note,
     2026-10-25: "It should look like all the other headers"); it was a 14px blue title inside its own card. */
  /* The lower-bound notes, shared by the one-day clocks and the multi-day view below. */
  const floorNotes=<>{P.upFromCamp?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"The climbing time starts at the camp below the route"+(P.downToCamp?", and the descent ends there":"")+"; the walk from the car to camp is not on file."}</div>:null}{approachUnknown?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Lower bounds only — no recorded "+missHikeLabel+"."}</div>:null}{climbUnknown?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{P.climbTimed?"Lower bounds only — no pitch count on file, so the climbing is estimated from the route’s length.":"Lower bounds only — no climbing time on file."}</div>:null}{gainShort?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Lower bound — the recorded gain of "+uElev(gainShort.gainFt)+" is less than the "+uElev(gainShort.riseFt)+" between this route’s own trailhead and summit pins. The times above are figured on the smaller number, so your real day will be longer."}</div>:null}{(!hasPublishedSummitH&&!hasDerivedSummitH&&route.pitches&&pitchedFraction(gn(route.grade as string))<1)?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Climbing time assumes a party moving continuously; pitching it out roughly doubles it."}</div>:null}</>;
  return <div><SL>Full trip time</SL><div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
    {/* The heading used to read "PUBLISHED TIMES · CAR-TO-CAR", hardcoded on every route carrying a
        timing object, and it never asked whether the published plan WAS car-to-car. Measured over
        the 1,005 WA routes that have one: 404 contradict it in their own words ("5:30 AM from
        camp", "Approach and climb to a bivy below the Gendarme", and one that says outright
        "Pre-dawn if attempting car-to-car; otherwise plan a two-day overnight itinerary"), only
        217 positively support it, and 384 say nothing either way. Car-to-car means no bivy, and a
        climber reading "car-to-car, 23 hr" plans a single push.
        DERIVING the label was measured and rejected: with 384 rows silent, any needle fails in the
        direction that KEEPS the claim on a route that never earned it. The trip style is already
        in the row's own words directly below — `recommendedStart` says "from camp" or a clock
        time, and the section breakdown names each leg — so dropping the unearned half of the
        heading loses nothing and asserts nothing. */}
    {route.timing?(function(){const tm=route.timing;const sb=Array.isArray(tm.sectionBreakdown)?tm.sectionBreakdown:[];const _sbDup=sectionsCoveredByItinerary(route);const _sbShow=_sbDup?[]:sb;/* STOPS: a published total usually counts rest as well as the walking and climbing (owner,
      2026-11-18), so on 18 routes it runs 0.25-1.7 hr past approach + summit + descent. Shown as its own
      tile, so the four figures on the card add up to the total beside them. */const _stopsH=typeof tm.approachTimeHrs==="number"&&typeof tm.summitTimeHrs==="number"&&typeof tm.descentTimeHrs==="number"&&typeof tm.totalHrs==="number"?Math.round((tm.totalHrs-tm.approachTimeHrs-tm.summitTimeHrs-tm.descentTimeHrs)*100)/100:0;return <div style={{background:C.blueBg,borderRadius:10,padding:"10px 12px",margin:"4px 0 12px",border:`1px solid ${C.blueDim}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:6}}><div style={SUB_LABEL}>PUBLISHED TIMES</div>{onEditTiming?<EditIconButton onClick={onEditTiming} title="Edit published times"/>:null}</div>{tm.recommendedStart?<div style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{"Recommended start: "}<b style={{color:C.text}}>{tm.recommendedStart}</b></div>:null}<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:_sbShow.length?8:0}}>{[["Approach",tm.approachTimeHrs],["Summit",tm.summitTimeHrs],["Descent",tm.descentTimeHrs],["Stops",_stopsH>=0.25?_stopsH:null],["Total",tm.totalHrs]].filter(function(x){return x[1]!=null;}).map(function(x,i){return <div key={i} style={{flex:"1 1 56px",background:C.surface,borderRadius:8,padding:"6px 4px",textAlign:"center"}}><div style={{fontSize:10,color:C.textMuted,fontWeight:700}}>{(x[0] as string).toUpperCase()}</div><div style={{fontSize:14,fontWeight:800,color:x[0]==="Total"?C.blue:C.text}}>{x[1]+" hr"}</div></div>;})}</div>{_sbShow.map(function(s,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:`1px solid ${C.borderLight}`}}><div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:600,color:C.text}}>{s.section}{s.fromTo?<span style={{color:C.textMuted,fontWeight:400}}>{" · "+s.fromTo}</span>:null}</div>{s.note?<div style={{fontSize:11,color:C.textMuted,marginTop:1,lineHeight:1.4}}>{s.note}</div>:null}</div><div style={{fontSize:12.5,fontWeight:700,color:C.blue,flexShrink:0,whiteSpace:"nowrap"}}>{typeof s.hrs==="number"?s.hrs+" hr":null}</div></div>;})}</div>;})():null}
    {/* What parties actually took, above the model that predicts it. Ordering is the point:
        the guidebook figure first (route.timing), then measured reality, then the estimate —
        so a formula never sits above evidence. Renders only when somebody has logged a real
        number; there is no empty state, because "0 parties have logged this" is noise on the
        204,000 routes nobody has logged. */}
    {(function(){const _lt=loggedTimeStats(activity);if(!_lt)return null;const _spread=_lt.minMin!==_lt.maxMin?(fmtDurMin(_lt.minMin)+"–"+fmtDurMin(_lt.maxMin)):null;const _legLbl: Record<string,string>={approachMin:"approach",climbMin:"climb",descentMin:"descent"};const _legs=Object.keys(_lt.legs).map(function(k){return _legLbl[k]+" "+fmtDurMin((_lt.legs as Record<string,{medianMin:number}>)[k].medianMin);});
      return <div style={{background:C.greenBg,borderRadius:10,padding:"10px 12px",margin:"4px 0 12px",border:"1px solid "+C.greenDim}}>
        <div style={{...SUB_LABEL,marginBottom:4}}>{"WHAT PARTIES ACTUALLY TOOK"}</div>
        <div style={{fontSize:13,color:C.text,fontWeight:700,marginBottom:2}}>{fmtDurMin(_lt.medianMin)+" car-to-car"+(_spread?" · "+_spread:"")}</div>
        <div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>{"Median of "+_lt.n+" logged trip"+(_lt.n!==1?"s":"")+(_legs.length?" · "+_legs.join(", "):"")}</div>
      </div>;})()}
    <div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>{/* Names what this number IS, never how it is computed. The formula was on screen
        ("Scarf's Rule + exponential technical grade penalty") and told a climber nothing
        they could act on — the inputs below already say what it responds to. */}
      {(route.timing?"Or estimate for your party":"Estimate for your party")+" · approach, climb and descent, car to car"}</div>
    {P.legsStored?<div data-fit-party="1" style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:-8,marginBottom:12}}>{(publishedIsWholeDay?"The car-to-car time is this route’s published time":storedApproachH!=null?"The approach and climb are this route’s published times":"The climb is this route’s published time")+" for a fit party, so fitness and pack don’t change "+(publishedIsWholeDay||storedApproachH==null?"it":"them")+". Allow more if your party is slower."}</div>:null}
    {multiDay?<div data-multiday={itinDayCount(route)} style={{background:C.amberBg,borderRadius:9,padding:"9px 11px",marginBottom:12,border:`1px solid ${C.amber}44`,fontSize:12,color:C.textSub,lineHeight:1.5}}>{"This route is typically done over "+itinDayCount(route)+" days. "+(sd&&sd.timed?"The estimate below times the summit day from camp; the ":"The times below are totals for the whole trip; the ")}<b style={{color:C.amber}}>Trip plan</b>{" below has each day."}</div>:null}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
      <div><div style={{...SUB_LABEL,marginBottom:3}}>FITNESS</div><select aria-label="Your fitness level" value={fit} onChange={e=>setFit(e.target.value)} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.field}`,background:C.surface,color:C.text,fontSize:13}}>{["beginner","intermediate","advanced","expert"].map(f=><option key={f} value={f}>{f[0].toUpperCase()+f.slice(1)}</option>)}</select></div>
      {/* `pack` is kilograms because scarfHrs' penalty tiers are kg (>8, >15), but this was the one input in the app that ignored the unit setting — hardcoded "PACK (KG)" while UNITS defaults to imperial. A US climber typing 30 for a 30 lb pack had it read as 30 kg and got the heaviest slowdown applied to a planning estimate. Show and accept the reader's unit; keep kg in state. */}
      <div><div style={{fontSize:12,color:C.textMuted,marginBottom:3,fontWeight:700}}>{uImp()?"PACK (LB)":"PACK (KG)"}</div><input aria-label="Pack weight" type="number" value={uImp()?Math.round(pack/0.4536):pack} onChange={e=>{const n=Number(e.target.value);if(isNaN(n))return;setPack(uImp()?n*0.4536:n);}} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.field}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
      <div><div style={{...SUB_LABEL,marginBottom:3}}>PARTY SIZE</div><input aria-label="Party size" type="number" value={party} onChange={e=>setParty(Number(e.target.value))} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.field}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
      <div><div style={{...SUB_LABEL,marginBottom:3}}>{sd&&sd.timed?"LEAVE CAMP":"DEPART"}</div><select aria-label={sd&&sd.timed?"Time you leave camp on the summit day":"Departure time"} value={sd&&sd.timed?camp:depart} onChange={e=>(sd&&sd.timed?setCamp:setDepart)(Number(e.target.value))} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.field}`,background:C.surface,color:C.text,fontSize:13}}>{Array.from({length:25},(_,i)=>2+i*0.5).map(h=><option key={h} value={h}>{fmt(h)}</option>)}</select></div>
    </div>
    <div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
      {sd?(function(){
        const dayLbl=(a: number,b: number)=>a===b?"Day "+a:"Days "+a+"–"+b;
        const hr=(h: number)=>h.toFixed(1)+" hr";
        const sdN=sd.inDays+1;
        const row=(key: string,day: string,what: string,val: string,col: string)=><div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.borderLight}`}}><div style={{minWidth:0}}><div style={{fontSize:11,fontWeight:700,color:C.label,textTransform:"uppercase",letterSpacing:0.3}}>{day}</div><div style={{fontSize:13,color:C.text,fontWeight:600}}>{what}</div></div><div style={{fontSize:15,fontWeight:800,color:col,flexShrink:0,whiteSpace:"nowrap"}}>{val}</div></div>;
        const clock=(lbl: string,h: number,red: boolean,warn: string)=><div style={{textAlign:"center",background:red?C.redBg:lowerBound?C.card:C.greenBg,borderRadius:8,padding:8}}><div style={{fontSize:17,fontWeight:700,color:red?C.red:lowerBound?C.text:C.green}}>{(lowerBound?"≥":"")+fmt(h)}</div><div style={{fontSize:12,color:C.textMuted}}>{lbl}</div>{red?<div style={{fontSize:12,color:C.red,marginTop:1}}>{warn}</div>:null}</div>;
        /* A WHOLE-TRIP figure is the only number: the walk model's legs beside it do not add up to it
           (Indian Head printed a 9.5 hr walk in, a 13.6 hr climb and an 8.6 hr descent over a 13.6 hr total). */
        const whole=sd.why==="whole";
        return <div data-summit-day={sd.timed?"timed":sd.why}>
          {whole?null:row("in",dayLbl(1,sd.inDays),sd.why==="enroute"?"Walk in, over the summit, to camp":sd.inDays===1?"Walk in to camp":"Walk in, camping on the way",(walkInKnown?"":"≥")+hr(sd.why==="enroute"?sd.walkInH+techH:sd.walkInH),C.green)}
          {sd.timed?<div style={{padding:"8px 0",borderBottom:sd.outDays?`1px solid ${C.borderLight}`:"none"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.label,textTransform:"uppercase",letterSpacing:0.3}}>{"Day "+sdN+" · summit day"}</div>
            <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:2}}>{"Leaving camp at "+fmt(camp)+(sd.endAt==="car"?", out to the car the same day":"")}</div>
            {/* The summit day's own HOURS, not only its clocks: 467 multi-day routes timed the climb only as an
                Est. summit clock, so the one leg the leg cards under GETTING THERE time had no duration here (owner, 2026-11-23). */}
            <div data-summit-day-legs="1" style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{"Camp to summit "+(climbKnown?"":"≥")+hr(sd.upH as number)+(sd.endClock!=null?" · back "+(sd.endAt==="car"?"to the car ":"to camp ")+(sd.endAt==="car"&&!(walkOutKnown||P.storedDescentH!=null)?"≥":"")+hr(sd.endClock-(sd.summitClock as number)):"")}</div>
            <div style={{display:"grid",gridTemplateColumns:sd.endClock!=null?"1fr 1fr":"1fr",gap:9}}>
              {clock("Est. summit",sd.summitClock as number,!!sd.sumLate,"Leave camp earlier")}
              {sd.endClock!=null?clock(sd.endAt==="car"?"Back at the car":"Back at camp",sd.endClock,!!sd.late,"After dark"):null}
            </div>
          </div>:sd.why==="long"?row("mid",dayLbl(sdN,sdN+(sd.climbDays||1)-1),"The climb, over several days",hr(techH),C.blue):null}
          {!whole&&sd.outDays>0?row("out",dayLbl(sd.nDays-sd.outDays+1,sd.nDays),"Walk out",(walkOutKnown||P.storedDescentH!=null?"":"≥")+hr(sd.timed?(sd.walkOutH as number):P.downH),C.blue):null}
          {!whole&&!sd.timed&&sd.outDays===0?row("down",dayLbl(sd.nDays,sd.nDays),"Descent to the car",(walkOutKnown||P.storedDescentH!=null?"":"≥")+hr(P.downH),C.blue):null}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,paddingTop:9}}><div style={{fontSize:13,color:C.textSub}}>{"Total trip, moving, over "+sd.nDays+" days"}</div><div style={{fontSize:17,fontWeight:800,color:C.amber}}>{hasAnyEstimate?(lowerBound?"≥":"")+hr(P.tripH):"N/A"}</div></div>
          {!sd.timed&&!(sd.why==="noclimb"&&climbUnknown)?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:6}}>{whole?"Published as one time for the whole trip.":sd.why==="long"?"The climb spans several days, so there is no summit-day clock.":sd.why==="enroute"?"The summit is reached on the walk in.":"No summit-day time on file."}</div>:null}
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:4,marginTop:6}}>{floorNotes}</div>
        </div>;})():<>
      {/* A ROUTE THAT PUBLISHES ONE CAR-TO-CAR FIGURE HAS NO LEGS TO SHOW. The four tiles used to print
          "incl." under Approach and Descent (meaning: included in the car-to-car number) and the same
          figure twice, as "Car-to-car" and "Total trip" (owner, 2026-11-18: "Why does it say incl.?").
          So the figure is shown once, and the sentence says why it is not split. */}
      {publishedIsWholeDay?<div style={{textAlign:"center",marginBottom:10}}>
        <div style={{fontSize:17,fontWeight:700,color:C.amber}}>{P.tripH.toFixed(1)+"hr"}</div><div style={{fontSize:12,color:C.textMuted}}>Total trip, car to car</div>
        <div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:6,textAlign:"left"}}>{"Published as one car-to-car time, not split into legs."}</div>
      </div>:<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginBottom:10,textAlign:"center"}}>
        <div><div style={{fontSize:17,fontWeight:700,color:C.green}}>{P.approachTimed?(walkInKnown?"":"≥")+hikeH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Approach{route.timing&&route.timing.climbToStartHrs!=null?" · + "+route.timing.climbToStartHrs+" hr climbing to start (in Total)":""}</div></div>
        {/* A pitch count estimated from the length (climbPitches) is timed and marked "≥", as the leg card under GETTING THERE marks it; N/A only when there is nothing to time. */}
        <div><div style={{fontSize:17,fontWeight:700,color:C.blue}}>{P.climbTimed?(climbKnown?"":"≥")+techH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Climbing</div></div>
        {/* N/A, like the Approach tile beside it, when nothing describes the way down: no stored descent, no walk out (distance or gain) and no rappels (#2336 printed "≥0.0hr"). */}
        <div><div style={{fontSize:17,fontWeight:700,color:C.blue}}>{P.descentTimed?((walkOutKnown||P.storedDescentH!=null)?"":"≥")+P.downH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Descent</div></div>
        <div><div style={{fontSize:17,fontWeight:700,color:C.amber}}>{hasAnyEstimate?(lowerBound?"≥":"")+P.tripH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Total trip</div></div>
        {/* A party over two adds time to the Total that no tile holds; named, so the four tiles add up to it. */}
        {hasAnyEstimate&&P.partyH>0?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5}}>{"Total includes + "+P.partyH.toFixed(1)+" hr for a party of "+party+"."}</div>:null}
      </div>}
      <Hr/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div style={{textAlign:"center",background:sumLate?C.redBg:lowerBound?C.card:C.greenBg,borderRadius:8,padding:8}}><div style={{fontSize:17,fontWeight:700,color:sumLate?C.red:lowerBound?C.text:C.green}}>{publishedIsWholeDay?"N/A":hasAnyEstimate?(lowerBound?"≥":"")+fmt(sumH):"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Est. {route.discipline==="bouldering"?"top-out":["sport","trad","toprope","rock","aid","ice","mixed"].indexOf(route.discipline as string)>=0?"finish":"summit"}</div>{sumLate?<div style={{fontSize:12,color:C.red,marginTop:1}}>{dayOf(sumH)>0?"Overnight":"Leave earlier"}</div>:null}</div>
        <div style={{textAlign:"center",background:late?C.redBg:lowerBound?C.card:C.greenBg,borderRadius:8,padding:8}}><div style={{fontSize:17,fontWeight:700,color:late?C.red:lowerBound?C.text:C.green}}>{hasAnyEstimate?(lowerBound?"≥":"")+fmt(retH):"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Est. return</div>{late?<div style={{fontSize:12,color:C.red,marginTop:1}}>{dayOf(retH)>0?"Overnight":"After dark"}</div>:null}</div>{floorNotes}
      </div></>}
    </div>
    {(route.segments||[]).map((seg,i)=>{
      const sh=scarfHrs(seg.distKm,seg.gainM,seg.lossM,fit,pack)+(seg.type==="technical"?techHrs(2,35,gn(route.grade)):0);
      const cumH=depart+(route.segments as Segment[]).slice(0,i+1).reduce((s,sg)=>s+scarfHrs(sg.distKm,sg.gainM,sg.lossM,fit,pack)+(sg.type==="technical"?techHrs(2,35,gn(route.grade)):0),0);
      return <div key={i} style={{position:"relative",display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`}}>{/* THE ROPE: from this leg's knot to the next one's. */i<(route.segments as Segment[]).length-1?<span aria-hidden="true" data-rope="" style={{position:"absolute",left:11,top:"50%",width:2,height:"100%",background:C.brand}}/>:null}<div data-rope-knot="" style={{position:"relative",zIndex:1,boxSizing:"border-box",width:24,height:24,borderRadius:"50%",background:C.card,border:"2px solid "+C.brand,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:FONT_MONO,fontSize:11.5,fontWeight:600,color:C.text}}>{i+1}</div><div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700}}>{seg.name}</div><div style={{fontSize:12,color:C.textMuted}}>{uDist(seg.distKm)} · ↑{uGain(seg.gainM as number)} · {seg.type}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:C.blue}}>{sh.toFixed(1)}hr</div><div style={{fontSize:12,color:C.textMuted}}>ETA {fmt(cumH)}</div></div></div>;
    })}
  </div></div>;
}
