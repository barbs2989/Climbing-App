import { EMPTY_ARR } from "../../lib/emptyArr.js";
import { viaPitchSpans, wholeLine, spanLabel } from "../../lib/approaches.js";
import { C, ROUTE_GAP } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import { dbRouteToCamel } from "../../lib/db";
import { displayGrade } from "../../lib/grade";

/** One way in, as stored in `approach_variants`; only the fields the picker reads. */
export interface ApproachVariantRef {
  name?: string | null;
  primary?: boolean | null;
  viaRouteId?: string | null;
  whyThisWay?: string | null;
}
/** One pickable way in (lib/approaches.js approachOptions). */
export interface ApproachOption {
  key: string;
  index: number;
  variant: ApproachVariantRef;
}
/** A route the picker names or links to. */
export interface ApproachRouteRef {
  id: string;
  name: string;
  approachVariants?: ApproachVariantRef[] | null;
}

export interface ApproachPickerProps {
  route: {
    id: string;
    approachVariants?: ApproachVariantRef[] | null;
    /** The overlay of the picked way in; absent until the linked route has loaded. */
    _approach?: { viaGrade?: string | null } | null;
    approachLogistics?: { trailhead?: string | null } | null;
  };
  opts: ApproachOption[];
  /** The key of the picked way in. */
  sel: string | null;
  onSel: (key: string) => void;
  /** The peak's routes, read in full for the via route's data; null while loading. */
  sibs?: { id: string; name: string }[] | null;
  /** True when reading the siblings failed. */
  sibsErr?: boolean | null;
  /** Routes that are reached BY this one. */
  finishes: ApproachRouteRef[];
  /** True on Overview only. */
  showFinishes?: boolean | null;
  onOpenRoute?: ((r: ApproachRouteRef) => void) | null;
}

/* HOW YOU GET THERE — the approach picker (lib/approaches.js). Rendered only when choosing
   CHANGES something: a variant pointing at a sibling route, or carrying its own trip data. The 125
   routes whose ways in are prose cards keep the cards and get no control that would change nothing.
   It sits UNDER the sub-tab bar, at the top of every tab (owner, 2026-10-21: above the bar it read as
   part of the header and crowded the top of the page). It stays on every tab because the pick drives
   every one of them — Plan's hours and trip plan, Overview's trailhead and map, the camps — and a
   control on one tab that silently rewrites another is how a climber ends up reading the Sulphide's
   camps under a Fisher Chimneys plan.
   With more than one way in the choice is a RADIO GROUP of full-width rows, each with a radio dot,
   under a heading that says how many there are and that you pick one: as a row of small chips it did
   not read as a choice at all. One way in at a time, all of them visible, one pre-selected (the most
   used) — the case design systems give a radio group, not a dropdown.
   The sibling route is a LINK as well as a source: the way in is one tap from its own page, which
   is where its chimneys and glacier are described pitch by pitch. `finishes` is the reverse: a
   route that other routes are reached BY lists them, in a card of its own, on Overview only — it is
   navigation, not a setting, and changes nothing on the other tabs.
   Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function ApproachPicker({route,opts,sel,onSel,sibs,sibsErr,finishes,showFinishes,onOpenRoute}: ApproachPickerProps){
  const showFin=!!(showFinishes&&finishes.length);
  /* A finish whose way in records `viaPitches.after` rejoins THIS route: a variation of it, named as one. */
  const finSpans=function(r: ApproachRouteRef){const v=(Array.isArray(r.approachVariants)?r.approachVariants:EMPTY_ARR).find(function(x: ApproachVariantRef){return x&&x.viaRouteId===route.id;});return v?viaPitchSpans(v):null;};
  const allVar=showFin&&finishes.every(function(r: ApproachRouteRef){const sp=finSpans(r);return !!(sp&&sp.after);});
  if(!opts.length&&!showFin)return null;
  const ap=route._approach;const selOpt=opts.find(function(o: ApproachOption){return o.key===sel;})||null;
  const via=selOpt&&selOpt.variant.viaRouteId?(sibs||EMPTY_ARR).find(function(r: {id: string; name: string}){return r.id===selOpt.variant.viaRouteId;}):null;
  const viaMissing=!!(selOpt&&selOpt.variant.viaRouteId&&!ap);
  /* A VARIATION (lib/approaches.js wholeLine): the via route's pitches below and above this one's, in climbing order, on Overview. */
  const line=via&&showFinishes?wholeLine(route,(selOpt as ApproachOption).variant,via):null;
  const viaSp=via?viaPitchSpans((selOpt as ApproachOption).variant):null;
  const viaSpText=viaSp?[viaSp.before,viaSp.after].filter(Boolean).map(spanLabel).join(" and "):"";
  const th=route.approachLogistics&&route.approachLogistics.trailhead;
  const many=opts.length>1;
  /* The picker is the page's first decision, so it reads as one: a blue rail and the section's own CardHead
     heading, a tighter box than the cards below it. A box as loud as a card made the choice look like a
     footnote of the title, and a padded box made the page feel as if it had two headers. */
  const card={background:C.card,border:"1px solid "+C.border,borderLeft:"4px solid "+C.blue,borderRadius:12,padding:"11px 12px",marginBottom:ROUTE_GAP};
  const head={fontSize:13.5,fontWeight:800,color:C.text,marginBottom:4};
  const chip=function(r: ApproachRouteRef,label: string,key: string){return <button key={key} onClick={function(){if(onOpenRoute)onOpenRoute(r);}} aria-label={"Open "+r.name} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"7px 12px",minHeight:36,background:"transparent",color:C.blue,border:"1px solid "+C.blueDim,borderRadius:20,fontSize:12.5,fontWeight:700,cursor:"pointer",maxWidth:"100%",textAlign:"left"}}>{label} ›</button>;};
  return <>
    {opts.length?<div data-approach-picker="1" style={card}>
      <CardHead tone={C.blue}>HOW YOU GET THERE</CardHead>
      {many?<div role="radiogroup" aria-label="Your way in" style={{display:"flex",flexDirection:"column",gap:6,marginTop:8,marginBottom:10}}>{opts.map(function(o: ApproachOption){const on=o.key===sel;return <button key={o.key} role="radio" aria-checked={on} onClick={function(){onSel(o.key);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",minHeight:40,padding:"7px 11px",borderRadius:10,border:"1px solid "+(on?C.green:C.border),background:on?C.greenBg:C.surface,color:on?C.green:C.text,fontSize:13,fontWeight:on?800:600,cursor:"pointer",textAlign:"left"}}><span aria-hidden="true" style={{flexShrink:0,width:16,height:16,borderRadius:"50%",border:"2px solid "+(on?C.green:C.textMuted),display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box"}}>{on?<span style={{width:8,height:8,borderRadius:"50%",background:C.green}}/>:null}</span><span style={{flex:1,minWidth:0}}>{o.variant.name||("Approach "+(o.index+1))}{o.variant.primary===true?<span style={{display:"block",fontSize:10,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:0.5,marginTop:1}}>{" Most used"}</span>:null}</span>{on?<span aria-hidden="true" style={{flexShrink:0,fontSize:11,fontWeight:700,color:C.green}}>Showing</span>:null}</button>;})}</div>:null}
      {viaMissing?<div style={{fontSize:12,color:C.amber,lineHeight:1.5}}>{sibsErr?"Couldn’t load the route this approach follows, so the trailhead, map and numbers below are still the ones stored with this climb — try again in a moment.":"Loading the route this approach follows…"}</div>
      :<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>
        {th?<div><span style={{color:C.textMuted}}>Trailhead: </span>{th}</div>:null}
        {/* WHY THIS WAY, at the choice itself: the picker is on every tab and the APPROACH cards are on Plan only. */}
        {many&&selOpt&&selOpt.variant.primary!==true&&(Array.isArray(route.approachVariants)?route.approachVariants:EMPTY_ARR).some(function(v: ApproachVariantRef){return v&&v.primary===true;})&&String(selOpt.variant.whyThisWay||"").trim()?<div data-approach-why="picker" style={{marginTop:6}}><span style={{color:C.textMuted}}>Why go this way: </span>{String(selOpt.variant.whyThisWay).trim()}</div>:null}
        {via&&ap&&ap.viaGrade?<div><span style={{color:C.textMuted}}>The way in: </span>{via.name+" · "+ap.viaGrade}</div>:null}
        {via?<div style={{marginTop:8}}>{chip(dbRouteToCamel(via),"Read the "+via.name+" route",via.id)}</div>:null}
        {line?<div data-whole-line="1" style={{marginTop:10,borderTop:"1px solid "+C.border,paddingTop:10}}>
          <div style={{fontSize:12.5,fontWeight:800,color:C.text,marginBottom:3}}>{"The whole climb · "+line.rows.length+" pitches"}</div>
          <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{"This route is a variation of "+via.name+": you climb "+via.name+"’s "+viaSpText+" as well as this route’s own "+line.ownCount+"."}</div>
          {line.rows.map(function(r){const mine=r.src==="own";return <div key={r.n} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"6px 0",borderTop:r.n>1?"1px solid "+C.border:"none"}}>
            <span style={{flexShrink:0,minWidth:30,textAlign:"center",fontSize:11.5,fontWeight:800,borderRadius:6,padding:"2px 5px",color:mine?C.onSolid:C.textSub,background:mine?C.blueBg:C.surface,border:"1px solid "+(mine?C.blueDim:C.border)}}>{"P"+r.n}</span>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:12.5,fontWeight:700,color:mine?C.text:C.textSub}}>{[r.grade,mine?"This route, pitch "+r.pitch:via.name+", pitch "+r.pitch].filter(Boolean).join(" · ")}</div>
              {r.notes?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.45,marginTop:2}}>{r.notes}</div>:null}
            </div>
          </div>;})}
          <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginTop:6}}>{"This route’s own pitches are in ROUTE BREAKDOWN below; "+via.name+"’s rack, hazards and descent are on its page."}</div>
        </div>:null}
      </div>}
    </div>:null}
    {showFin?<div data-approach-finishes="1" style={card}>
      <div style={head}>{allVar?"Variations of this route":"Other finishes from this route"}</div>
      <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginBottom:9}}>{allVar?(finishes.length>1?"These climbs leave this route partway and rejoin it. Open one to see the whole line, pitch by pitch.":"This climb leaves this route partway and rejoins it. Open it to see the whole line, pitch by pitch."):(finishes.length>1?"These climbs start by climbing this route. Open one to see it.":"This climb starts by climbing this route. Open it to see it.")}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{finishes.map(function(r: ApproachRouteRef){const sp=finSpans(r);const g=displayGrade(r);return chip(r,[r.name,g,sp&&sp.before?"leaves after P"+sp.before[1]:null,sp&&sp.after?"rejoins at P"+sp.after[0]:null].filter(Boolean).join(" · "),r.id);})}</div>
    </div>:null}
  </>;
}
