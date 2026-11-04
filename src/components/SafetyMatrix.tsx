import { useState } from "react";
import { catOf, isRecent, C, enrichRoute, CRAG_CATS } from "../../ClimbMatchCore.jsx";
import { routeTerrain, saysNotApplicable } from "../../lib/terrain";
import { routeKw, HAZ_KW } from "../../lib/routeKw.js";
import { knownHazards } from "../../lib/hazards";
import { avyCenterFor } from "../../lib/avyCenter.js";
import CragSafetyNotes from "./CragSafetyNotes.tsx";
import CardHead from "./CardHead.tsx";
import EditIconButton from "./EditIconButton.tsx";
import ActionIcon from "./ActionIcon.tsx";
import CRow from "./CRow.tsx";
import type { CRowProps } from "./CRow.tsx";
import GapNote from "./GapNote.tsx";
import { climbNoun } from "../../lib/discLabels.js";
import { EditIconButton as AreaEditIconButton } from "../../lib/areaChrome";
import { monthRank } from "../../EnrichmentPanels";

// function the merge removed — so it sent a reader looking for a structure that no longer
const ENV_HAZ_RE=/raptor|nesting closure|nesting season|bear activity|black bear|grizzly|mountain goat|rattlesnake|tick season|poison oak|poison ivy|wasp nest|hornet|hunting season|elk rut/i;
// on this route: reporting a bad bolt or anchor on a sport climb.
export interface SafetyMatrixProps {
  /** The route; reads its hazard fields and trip reports, and terrain/catOf/enrichRoute read the rest. */
  route: {
    id: string;
    /** bouldering calls its line a PROBLEM (lib/discLabels climbNoun) */ discipline?: string | null;
    activity?: { date?: string | null }[] | null;
    hazards?: string[] | null;
    /** One string or a list. */
    objHaz?: string[] | string | null;
    watchOut?: string[] | string | null;
  };
  /** The merged trip reports (seed + yours + every climber's); none means the route's own. */
  activity?: { date?: string | null }[] | null;
  /** The area the route hangs under; its avalanche zone labels the forecast card and its centre is linked. */
  mountain?: { avyZone?: string | null; areaType?: string | null; parentId?: string | null; region?: string | null } | null;
  /** Still-there / gone-now tallies, keyed `routeId|label`. */
  hzVotes?: CRowProps["hzVotes"];
  /** Casts a hazard vote; without it the vote buttons are not drawn. */
  onVote?: CRowProps["onVote"];
  /** Opens the hazards editor, optionally prefilled; none means the climber cannot edit hazards. */
  onOpenHazards?: ((seed?: string | string[]) => void) | null;
  /** Opens the editor on a named field (seasonalHazards). */
  onEdit?: ((field: string) => void) | null;
}

/* Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function SafetyMatrix({route,activity,mountain,hzVotes,onVote,onOpenHazards,onEdit}: SafetyMatrixProps){
  const [openK,setOpenK]=useState<string|null>(null);
  const cat=catOf(route);/* The avalanche panel used to appear for every ice/mixed/alpine/mountaineering route with an
   avy zone on its area. A dry summer rock climb sits in a zone too, and printing a forecast
   block for it reads as a hazard the route does not have — SEWS's own row says as much
   ("N/A - non-glaciated summer rock route"). */
const avyRelevant=["ice","mixed","alpine","mountaineering"].includes(cat)&&routeTerrain(route).avalanche!=="no";/* `activity` is the merged list (seed + yours + every climber’s DB report); route.activity alone is only your own logs on a DB route, so no other climber could ever flag a hazard here. */const _acts=activity||route.activity||[];const kcon=routeKw(Object.assign({},route,{activity:_acts}));const flaggedHaz=kcon.hazards.filter(h=>!h.official&&(h.count>=2||(h.reports||[]).some((rp: {date?: string | null})=>isRecent(rp.date))));const confHaz=(hstr: string)=>kcon.hazards.find(h=>h.official&&h.count>=2&&(HAZ_KW as Record<string,string[]>)[h.label].some((kk: string)=>hstr.toLowerCase().indexOf(kk)>=0));const envRelevant=["alpine","mountaineering"].includes(cat);const _objHaz=Array.isArray(route.objHaz)?route.objHaz:(route.objHaz?[route.objHaz]:[]);/* The box merges hazards, objHaz and watchOut. It used to de-duplicate the first two by exact
     string equality and compare watchOut against neither, so Southwest Rib on SEWS printed
     "runout slab" twice verbatim and a third time as a full sentence. mergeHazards drops an
     entry only when every significant word in it appears in one that is kept, so the surviving
     line always says at least as much.
     It must be ONE merge over all three. Two — hazards+objHaz for the bullets, then all three for
     the ⚠ lines — printed a hazards line AND the longer watchOut line that restates it, on 250
     routes. knownHazards merges once and splits the survivors by field. */
  const _known=knownHazards(route.hazards,_objHaz,route.watchOut);const _allHaz=_known.hazards;
  const _watchOut=_known.watchOut;const envHaz=envRelevant?_allHaz.filter(h=>ENV_HAZ_RE.test(h)):[];const physHaz=envRelevant?_allHaz.filter(h=>!ENV_HAZ_RE.test(h)):_allHaz;const _rd=_acts.map(a=>a.date).filter(Boolean).sort();const repN=_acts.length;const lastRepY=_rd.length?new Date(_rd[_rd.length-1] as string).getFullYear():null;const nowY=new Date().getFullYear();const stale=lastRepY&&(nowY-lastRepY)>=2;const avyCenter=avyCenterFor(mountain);
  return <div>
    <CragSafetyNotes route={route} onOpenHazards={onOpenHazards}/>
    {/* watchOut is rendered inside this box but was not part of its condition, so a route
        carrying only watch-outs and no hazards printed none of them. */}
    {(physHaz.length||flaggedHaz.length||_watchOut.length)?<div style={{background:C.redBg,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.red}44`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}><CardHead tone={C.red}>KNOWN HAZARDS</CardHead></div>{/* The card-header edit control every other route-page card uses; a full-size BTN here outweighed the heading it sat beside. Wrapped so the click event never reaches onOpenHazards (#2584). */}{onOpenHazards?<EditIconButton onClick={function(){onOpenHazards();}} title="Suggest a fix to the known hazards"/>:null}</div>{physHaz.map((h,i)=>{const cf=confHaz(h);return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0",flexWrap:"wrap"}}><span style={{fontSize:13,color:C.textSub,flex:1,minWidth:120,lineHeight:1.45}}>• {h}</span>{cf?<span style={{fontSize:12,fontWeight:700,color:C.green,background:C.greenBg,borderRadius:6,padding:"2px 7px",whiteSpace:"nowrap"}}>{"✓ confirmed · "+cf.count+" report"+(cf.count===1?"":"s")+(cf.season?" · "+cf.season:"")+(cf.year?" · "+cf.year:"")}</span>:null}</div>;})}{_watchOut.map((w,i)=><div key={"wo"+i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0"}}><span aria-hidden="true" style={{display:"inline-flex",flexShrink:0,marginTop:2}}><ActionIcon name="alert" size={13} color={C.amber}/></span><span style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{w}</span></div>)}{flaggedHaz.length?<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.red}33`}}><div style={{fontSize:11.5,fontWeight:700,color:C.amber,marginBottom:7}}>Reported by climbers — not yet in official info</div>{flaggedHaz.map(h=><CRow key={h.label} item={h} kind="h" routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>)}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:7}}>Pulled from recent trip reports and not in the official list yet. Treat them seriously and verify before you commit.</div></div>:null}</div>:<GapNote what={"No "+climbNoun(route)+"-specific hazards recorded"} why={"The advice above is general to this discipline, not to this line. Nobody has recorded rockfall, cornices, moats or anything else particular to this "+climbNoun(route)+" — that is missing information, not a clean bill of health."} cta="Add what you know" onFix={onOpenHazards?function(){onOpenHazards();}:undefined}/>}{envHaz.length?<div style={{background:C.greenBg,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.green}44`}}><CardHead tone={C.green} style={{marginBottom:8}}>WILDLIFE & SEASONAL NOTICES</CardHead>{envHaz.map((h,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0"}}><span style={{fontSize:13,color:C.textSub,flex:1,lineHeight:1.45}}>• {h}</span></div>)}</div>:null}{kcon.conflicts.length?<div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name="alert" size={14} color={C.amber}/></span><div style={{fontSize:11.5,color:C.amber,lineHeight:1.45}}>{kcon.conflicts[0]}</div></div>:null}{repN?<div style={{display:"flex",alignItems:"flex-start",gap:8,background:stale?C.amberBg:C.surface,border:`1px solid ${stale?C.amber:C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name={stale?"alert":"check"} size={14} color={stale?C.amber:C.textSub}/></span><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>{repN<2?("Only "+repN+" trip report so far — low confidence. Verify conditions yourself, and consider logging one for the climbers after you."):(stale?("Most recent trip report is from "+lastRepY+" — conditions and hazards can change year to year. Verify current conditions before you go."):("Based on "+repN+" trip reports"+(lastRepY?", most recent "+lastRepY:"")+" · "+kcon.confidence+" data confidence. Hazards and conditions update automatically as climbers log new reports."))}</div></div>:<div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name="doc" size={14} color={C.textMuted}/></span><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>Add a trip report from your logbook — be the first to log conditions and hazards for the climbers after you.</div></div>}
    {/* The rest of seasonal_hazards. The avalanche block below has been the column's only
        reader, so `exposure` (504 WA routes), `weather.typical` (499) and `weather.probability`
        (456) were researched, stored, and shown to nobody — the descent_text shape. `crevasses`
        is read by lib/terrain.js as a glacier SIGNAL, which is use without display.
        Not gated on avyZone: exposure and afternoon-storm risk apply to rock routes that have
        no avalanche zone at all, and gating them the same way is what kept them invisible. */}
    {(()=>{const sh=enrichRoute(route).seasonalHazards||{};const wx=sh.weather||{};
      // crevasses holds TWO shapes — a string on most rows, {timing,location} on 34 of them.
      const cv=sh.crevasses;const cvText=typeof cv==="string"?cv:(cv&&typeof cv==="object"?[cv.timing,cv.location].filter(Boolean).join(" "):"");
      // "N/A - no glacier travel" is a positive statement of absence, and it is what most of
      // these rows say. Valuable to terrain.js as evidence; noise as a bullet on hundreds of
      // rock scrambles, so it is suppressed here rather than printed.
      const rows=[["Exposure",sh.exposure],["Crevasses",saysNotApplicable(cvText)?"":cvText],["Typical weather",wx.typical],["Storm timing",wx.probability]]
        .filter(r=>r[1]&&String(r[1]).trim());
      /* EDITABLE (owner note, 2026-10-24: "seasonal hazards isn't editable"). The contribute form has
         carried a Seasonal hazards field (SEASHAZ_KEYS) since it was built, but this card had no pencil,
         and an empty one rendered nothing, so the only way in was hunting through Suggest a fix. Empty,
         it stays a placeholder on the disciplines where exposure, storms and crevasses are the hazard;
         a crag gets nothing rather than a prompt on every sport line. */
      if(!rows.length)return onEdit&&!CRAG_CATS.includes(cat)?<div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:8}}>SEASONAL HAZARDS</CardHead><div style={{paddingLeft:9,borderLeft:"2px solid "+C.borderLight}}><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.55}}>No exposure, weather or crevasse notes for this climb yet</span><button onClick={()=>onEdit("seasonalHazards")} style={{display:"block",marginTop:1,padding:"5px 0",border:"none",background:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Add seasonal hazards</button></div></div>:null;
      return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}><CardHead>SEASONAL HAZARDS</CardHead>{onEdit?<AreaEditIconButton onClick={()=>onEdit("seasonalHazards")} title="Edit seasonal hazards" C={C}/>:null}</div>
        {rows.map(([label,text],i)=><div key={label} style={{marginTop:i?9:0}}>
          <div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:2}}>{label}</div>
          <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{String(text)}</div>
        </div>)}
      </div>;})()}
    {avyRelevant?(()=>{const avy=(enrichRoute(route).seasonalHazards||{}).avalanche;const months=avy&&avy.byMonth?Object.entries(avy.byMonth as Record<string,string>).sort((a,b)=>monthRank(a[0])-monthRank(b[0])):[];
  /* THE GATE READ THE AREA AND THE CONTENT LIVES ON THE ROUTE. It was
     `mountain && mountain.avyZone && avyRelevant`, so a route carrying its own month-by-month
     avalanche ratings showed NOTHING whenever the area it hangs under had no `avy_zone` string.
     Measured: 146 of 184 avy-relevant routes with real ratings were hidden that way — Chair Peak's
     north face has twelve months of them. Same shape as the fire map gated on the seed-only
     selArea, fixed by reading `dbAreaCtx || selArea`.

     The obvious repair — fall back to the ROUTE's own `avalanche.zone` in the label — is wrong,
     and the data says so: that field is prose, not a zone name. 196 real values, p50 128
     characters, 154 over 60, max 327 ("NWAC's daily avalanche forecast does not run during this
     route's July-September climbing season..."). Putting it where `mountain.avyZone` goes is the
     season/grade/bivy defect again: a display slot taking a paragraph.

     So the LABEL keeps taking only the short area zone, the ratings gate on themselves, and the
     route's prose renders as prose beneath the grid where it reads properly. */
  const _realAvyMonths=months.filter(function(m){return !/^n\/?a$/i.test(String(m[1]||"").trim());});
  /* Deliberately NOT an IIFE, for the reason the `_peakGeoPm` comment above records: check:fire
     finds the fire panel's element by looking backwards from `<FireNearRoute` for a
     `const <name>=(function(){`, so an IIFE-assigned const above `fireEl` makes the guard hunt
     for the wrong symbol and report the panel missing. */
  const _avyZoneRaw=avy&&avy.zone?String(avy.zone).trim():"",_avyNote=_avyZoneRaw&&!/^n\/?a\b/i.test(_avyZoneRaw)?_avyZoneRaw:"";
  if(!(mountain&&mountain.avyZone)&&!_realAvyMonths.length)return null;const AVY_COL={Extreme:[C.red,C.redBg],High:[C.red,C.redBg],Considerable:[C.red,C.redBg],Moderate:[C.amber,C.amberBg],Low:[C.green,C.greenBg]};return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,flex:1,minWidth:0}}><CardHead>AVALANCHE FORECAST</CardHead>{mountain&&mountain.avyZone?<span style={{fontSize:12,color:C.textMuted}}>{mountain.avyZone}</span>:null}</div>{/* Its zone line and its month ratings are the Avalanche forecast zone and Avalanche danger by month rows of the Seasonal hazards field, so the pencil opens that. */onEdit?<AreaEditIconButton onClick={()=>onEdit("seasonalHazards")} title="Edit the avalanche forecast" C={C}/>:null}</div>{months.length?<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:9}}>{months.map(([month,level])=>{const [col,bg]=(AVY_COL as Record<string,string[]>)[level]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:11.5,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:10.5,color:C.textSub}}>{level}</div></div>;})}</div>:null}{_avyNote?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:7}}><span style={{fontWeight:700}}>{"Forecast coverage: "}</span>{_avyNote}</div>:null}<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>This app doesn't pull a live danger rating — check the forecast below before you go.</div><a href={avyCenter[2]} target="_blank" rel="noreferrer" style={{display:"block",marginTop:8,fontSize:12,color:C.blue,textDecoration:"none"}}>{"→ Full forecast at "+avyCenter[1]}</a></div>;})():null}
    {/* The BAILOUT & TURNAROUND card was removed app-wide (owner, 2026-10-07), and the lone
        "+ Add start location" button it left behind went too (owner, 2026-10-15): the start of a
        climb is where to find it, not a hazard, and it is already filed from the Start of climb
        section of Add or fix info and from the log form, and shown as START OF CLIMB on Overview. */}
  </div>;
}
