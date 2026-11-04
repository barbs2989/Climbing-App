import { useState } from "react";
import { campDetail, campFromTrailhead, campNightsLabel, campWalkHrs, campSleptLine, campFromPrev, campRoleLabel } from "../../lib/camps.js";
import { uElev, C, ROUTE_GAP } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import Chevron from "./Chevron.tsx";

/** One camp, bivy or hut as `campSites()` builds it; only the fields this card reads. */
export interface CampRow {
  name?: string | null;
  elev?: number | null;
  kind?: string | null;
  role?: string | null;
  onTrack?: boolean | null;
  notes?: string | null;
  nights?: number[] | null;
  distMi?: number | null;
  gainFt?: number | null;
  capacity?: string | null;
  water?: string | null;
  permit?: string | null;
}

export interface CampSiteProps {
  b: CampRow;
  /** Index in the list; names an unnamed site "Camp N". */
  i: number;
  /** True for the first site, which opens expanded. */
  first: boolean;
  /** The planner's fitness and pack inputs, for the walk-in time. */
  calc?: { fit?: string | null; pack?: number | null } | null;
  /** Length of the trip plan in days. */
  dayCount: number;
  /** Trip reports that slept here (campReportsOf), if any. */
  slept?: { n: number; last: string } | null;
  /** The site before this one in walking order. */
  prev?: CampRow | null;
}

/* One site, collapsed to the fields that are AUTHORED AND STRUCTURED — name, elevation, type,
   and whether it is pinned on the track. Deliberately NOT a derived "water · no permit" summary,
   which was the obvious design and was measured before being rejected
   (scripts/oneoff/measure-camping-verdict-vocabulary.mjs): a keyword rule leaves 44% of permits
   and 30% of waters in no bucket at all, and where it DOES fire it is wrong in the dangerous
   direction — "Free self-issued wilderness permit at the Killen Creek trailhead" reads as *no
   permit* to any negation rule, and a self-issued permit is one you still have to fill in.
   Being wrong about a permit costs a fine; being wrong about water sends a party up dry. This is
   the same refusal the rappel columns already record: do not read a fact out of English prose.
   So the summary line carries only what somebody wrote into a field that holds a VALUE, and the
   prose is one tap away rather than one guess away.
   Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function CampSite({b,i,first,calc,dayCount,slept,prev}: CampSiteProps){
  /* The FIRST site opens expanded: above it sits the overnight-permit panel, and a section that
     shows only a permit and then a column of collapsed rows does not read as naming a place to
     sleep. One full site (capacity, water, permit) proves the rest are real; the others stay one tap away. */
  const [open,setOpen]=useState(!!first);
  const detail=campDetail(b);
  const more=detail.length>0||!!String((b&&b.notes)||"").trim();
  const nm=(b&&b.name)||("Camp "+(i+1));
  /* An explicit aria-label, because the row's own text nodes are a name and an elevation in
     separate elements and this app has been bitten by "Friends2" — a count welded to a label in
     the accessibility tree, where CSS margins do not exist. An authored name cannot glue. */
  const fromTh=campFromTrailhead(b);
  /* The two numbers a party picks a camp BY: which night the trip plan spends here, and how long the
     walk in takes at the fitness and pack set in the planner above. */
  const night=campNightsLabel(b&&b.nights,dayCount);
  const walkH=campWalkHrs(b,calc);
  const walk=walkH!=null?"\u2248"+(Math.round(walkH*2)/2).toFixed(1).replace(/\.0$/,"")+" h walk in at your planner pace":"";
  /* What climbers who logged this route said: how many trip reports slept HERE (campReportsOf). */
  const sleptLine=campSleptLine(slept);
  /* Its place in the walk in: the stretch from the site above it in the list, and what parties use it for. */
  const step=campFromPrev(b,prev);
  const use=campRoleLabel(b&&b.role);
  const label=nm+(b&&b.elev!=null?", "+uElev(b.elev):"")+(b&&b.kind?", "+b.kind:"")+(fromTh?", "+fromTh:"")+(step?", "+step:"")+(walk?", "+walk:"")+(night?", "+night:"")+(sleptLine?", "+sleptLine:"")+(use?", "+use:"");
  /* Each kind gets its own accent so a scan down the list tells a camp from a bivy from a hut
     before reading a word; the three detail fields get theirs so WATER is findable at a glance in
     an open card — it is the field a party most needs and the longest one to wade through. */
  const tone=(b&&{Camp:C.purple,Bivy:C.teal,Hut:C.amber}[b.kind as "Camp"|"Bivy"|"Hut"])||C.purple;
  const DTONE={Capacity:tone,Water:C.blue,Permit:C.amber};
  const chip=function(c: string,bd: string){return {fontSize:11,fontWeight:700,color:c,background:C.surface,border:"1px solid "+bd,borderRadius:20,padding:"2px 9px"};};
  return <div style={{background:C.card,border:"1px solid "+(open?tone+"66":C.border),borderLeft:"3px solid "+tone,borderRadius:12,marginBottom:ROUTE_GAP,overflow:"hidden"}}>
    <div {...(more?clickable(function(){setOpen(!open);}):{})} aria-expanded={more?open:undefined} aria-label={more?((open?"Hide":"Show")+" camping detail for "+label):undefined} style={{minHeight:44,boxSizing:"border-box",padding:"11px 13px",cursor:more?"pointer":"default"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
        <div aria-hidden="true" style={{width:30,height:30,borderRadius:8,background:tone+"22",color:tone,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{"☾"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:9}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,minWidth:0,wordBreak:"break-word",lineHeight:1.3}}>{nm}</div>
            {b.elev!=null?<span style={{flexShrink:0,fontSize:12.5,fontWeight:800,color:tone,whiteSpace:"nowrap"}}>{uElev(b.elev)}</span>:null}
          </div>
          {fromTh?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:2}}>{fromTh}</div>:null}
          {step?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:1}}>{step}</div>:null}
          {walk?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:1}}>{walk}</div>:null}
          {sleptLine?<div style={{fontSize:11.5,color:C.green,fontWeight:700,lineHeight:1.4,marginTop:1}}>{sleptLine}</div>:null}
          {(b.kind||b.onTrack||more||night||use)?<div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,marginTop:7}}>
            {night?<span style={chip(C.green,C.green+"55")}>{night}</span>:null}
            {use?<span style={chip(b.role==="main"?C.blue:C.textSub,(b.role==="main"?C.blue:C.textSub)+"55")}>{use}</span>:null}
            {b.kind?<span style={chip(tone,tone+"55")}>{b.kind}</span>:null}
            {b.onTrack?<span style={chip(C.textMuted,C.border)}>{"Marked on the track"}</span>:null}
            {more?<span style={{fontSize:11.5,fontWeight:700,color:C.blue,marginLeft:"auto",whiteSpace:"nowrap"}}>{open?"Less ":"More "}<Chevron inline open={open} size={13} color={C.blue}/></span>:null}
          </div>:null}
        </div>
      </div>
    </div>
    {open&&more?<div style={{borderTop:"1px solid "+C.borderLight,background:C.surface,padding:"12px 13px 3px"}}>
      {detail.concat(b.notes?[["Notes",b.notes]]:[]).map(function(r,ri){return <div key={ri} style={{display:"flex",gap:10,marginBottom:11}}><span aria-hidden="true" style={{width:3,borderRadius:2,background:DTONE[r[0] as keyof typeof DTONE]||C.borderHi,flexShrink:0}}/><div style={{minWidth:0}}><div style={{fontSize:10.5,fontWeight:800,color:DTONE[r[0] as keyof typeof DTONE]||C.textMuted,letterSpacing:0.6,marginBottom:3}}>{r[0].toUpperCase()}</div><div style={{fontSize:12.5,color:C.text,lineHeight:1.6,opacity:0.88}}>{r[1]}</div></div></div>;})}
    </div>:null}
  </div>;
}
