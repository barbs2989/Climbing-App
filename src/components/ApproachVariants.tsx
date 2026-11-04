import { approachKeyOf } from "../../lib/approaches.js";
import { primaryApproachIndex, longFormApproachIndex, approachHasCrossing } from "../../lib/approachIndex.js";
import { catOf, routeAscentFt, uDist, uElev, gainCoversWholeOuting, uDistMi, C, ROUTE_GAP, RSL as SL } from "../../ClimbMatchCore.jsx";
import { effDistKm, effDistIsWholeTrip } from "../../lib/outing.js";
import ActionIcon from "./ActionIcon.tsx";
import { splitParagraphs } from "../../EnrichmentPanels";
import EditIconButton from "./EditIconButton.tsx";

/** One way in, as stored in `approach_variants`; only the fields its card reads. */
export interface ApproachVariant {
  name?: string | null;
  primary?: boolean | null;
  longForm?: boolean | null;
  /** A window as often as a paragraph. */
  season?: string | null;
  /** Free text as often as a number. */
  hours?: string | number | null;
  distMi?: number | null;
  gainFt?: number | null;
  notes?: string | null;
  baseFinding?: string | null;
  hazards?: string[] | string | null;
  whyThisWay?: string | null;
}

export interface ApproachVariantsProps {
  route: {
    approachVariants?: ApproachVariant[] | null;
    /** The long-form `approach` paragraph. */
    approach?: string | null;
    /** The picked way in (lib/approaches.js), if any. */
    _approach?: { key: string } | null;
    timing?: { approachTimeHrs?: string | number | null } | null;
  };
  /** Opens the editor at the approaches; none means the climber cannot edit them. */
  onEdit?: (() => void) | null;
  /** Opens the editor at the long-form paragraph. */
  onEditProse?: (() => void) | null;
}

/* APPROACH — ONE section, holding every way in. It used to be two: "APPROACHES · N ways in"
   (the `approach_variants` cards) and, under it, a separate APPROACH box holding the `approach`
   paragraph. Read top to bottom that paragraph looked like a THIRD way in, and nothing said which
   of the ways in people actually take. Measured 2026-09-24: 796 routes carry both, and on 771 of
   them the paragraph is the long-form account of the FIRST variant — so it now renders INSIDE
   the main way in's card as its full description, not as a sibling of it.
   The MAIN way in is the variant marked `primary:true`, else index 0 (the enrichment has always
   written the standard way in first), and it is drawn first. It is badged MOST USED only when that
   is a RECORDED decision — `primary:true` on a route with a choice to make — never on array order
   alone: research on the 124 multi-way routes moved the answer off index 0 on 16 of them.
   The paragraph and the route-level numbers follow `longForm:true` when a variant carries it: on
   ~20 routes the paragraph describes a way in that is NOT the most used one (a road since washed
   out, a trail closed since 2003), and hanging it under the MOST USED card would put the long
   account, and its miles and gain, under the wrong way in. Without the mark they follow the main
   card, which is where the paragraph belongs on 771 of 796 routes.
   The other ways in keep their season window, and each may carry `whyThisWay`: one sentence on
   WHEN a party takes it instead of the most used one ("early season, while the gully still holds
   snow"; "when the ford is running high"). Guidebooks print exactly this beside an alternative
   approach; before it, the reason sat mid-paragraph in `notes`, where nobody choosing between two
   cards would find it. It renders only on a card that is NOT the most used one.
   `baseFinding` gets its own highlighted block rather than a sentence inside `notes`: it is the
   answer to "how do I know I'm at the start of the climbing", which is the question that actually
   gets parties lost, and burying it mid-paragraph is exactly how it got lost before.
   Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function ApproachVariants({route,onEdit,onEditProse}: ApproachVariantsProps){
  const vars=Array.isArray(route.approachVariants)?route.approachVariants.filter(Boolean):[];
  const prose=route.approach?String(route.approach):"";
  if(!vars.length&&!prose)return null;
  /* With a way in PICKED (lib/approaches.js), the paragraph and the route-level numbers are that
     way in's — the overlay replaced them — so they hang under ITS card, and that card leads. */const _selIdx=route._approach?vars.findIndex(function(v,i){return approachKeyOf(v,i)===(route._approach as {key: string}).key;}):-1;const pIdx=_selIdx>=0?_selIdx:primaryApproachIndex(vars);const lfIdx=_selIdx>=0?_selIdx:(vars.length?longFormApproachIndex(vars):-1);const marked=vars.some(v=>v.primary===true);
  const order=vars.length?[pIdx,...vars.map((_,i)=>i).filter(i=>i!==pIdx)]:[-1];
  /* Route-level numbers backfill ONE card — the one the paragraph describes — because they measure
     the same approach the paragraph does, and
     888 of 1,001 variants carry no distance of their own. Each keeps the label TechStats gives it on
     Overview, because on a summit route gain_ft is the whole ascent, not the walk in, and printing it
     as "approach gain" would claim the trail climbs 5,500 ft before the route starts. */
  const disc=catOf(route);const summitDisc=disc==="alpine"||disc==="mountaineering"||disc==="hiking";
  const rAsc=routeAscentFt(route);const rKm=effDistKm(route);const rHrs=route.timing&&route.timing.approachTimeHrs;
  const routeFacts={
    hours:rHrs!=null&&rHrs!==""?String(rHrs):null,
    dist:rKm!=null&&rKm>0?uDist(rKm)+(effDistIsWholeTrip(route)?" whole outing":" one way"):null,
    gain:rAsc!=null&&rAsc>0?"↑ "+uElev(rAsc)+(summitDisc||gainCoversWholeOuting(route)?" total ascent":" approach gain"):null};
  /* `hours` is free text as often as a number: "Multi-day", "2 days", "4–5 from camp". Appending
     " hr" to the END printed "Multi-day hr" and "4–5 from camp hr" (15 of 197 values). A value that
     already names its unit is left alone; otherwise the unit goes after the FIRST number range
     ("under 1" -> "under 1 hr"). The unit test is whole words: `\bh` matched "high camp". */
  const hrsFmt=(hv: string|number)=>/\b(?:hrs?|hours?|days?)\b|\d\s*h\b/i.test(String(hv))?String(hv):String(hv).replace(/(~?\d+(?:\.\d+)?(?:\s*(?:[-–]|to)\s*\d+(?:\.\d+)?)?)/,"$1 hr");
  const card=(v: ApproachVariant,i: number,main: boolean)=>{
    const own=i===lfIdx;
    const haz=Array.isArray(v.hazards)?v.hazards.filter(Boolean):(v.hazards?[v.hazards]:[]);
    /* `season` on an approach variant is a WINDOW, and 534 of 801 variants (67%, across 470
       routes) hold a paragraph instead — up to 392 characters. It used to sit in a nowrap pill
       beside the name, cut to 48 characters, with the full sentence repeated as prose below: the
       pill squeezed the name into a sliver on the left, the cut read as a bug, and its first clause
       printed twice. Now the WHOLE window sits at the top of the card, full width, and wraps. */
    const seasonFull=String(v.season||"").trim().replace(/\s+/g," ");
    const hrsTxt=v.hours?hrsFmt(v.hours):(own&&routeFacts.hours?hrsFmt(routeFacts.hours)+" approach":null);
    const distTxt=v.distMi!=null?uDistMi(v.distMi)+" one way":(own?routeFacts.dist:null);/* "one way" like the route's own figure beside it: a bare "4.8 mi" on one card and "4.8 mi one way" on the next read as two different measurements. */
    const gainTxt=v.gainFt!=null?uElev(v.gainFt)+" gain":(own?routeFacts.gain:null);
    const facts=[hrsTxt,distTxt,gainTxt].filter(Boolean);
    const crossing=approachHasCrossing(haz);
    const why=v.primary!==true&&marked&&vars.length>1?String(v.whyThisWay||"").trim():"";
    const badge=v.primary===true&&marked&&vars.length>1;/* the primary card, not the first one: with a way in picked, the picked card leads and must not inherit MOST USED */
    return <div key={i} data-approach-card={main?"main":"other"} style={{background:C.card,border:"1px solid "+(badge?C.greenDim:C.border),borderRadius:12,padding:"11px 13px",marginBottom:ROUTE_GAP}}>
      {seasonFull?<div data-approach-window="1" style={{fontSize:12.5,fontWeight:700,color:C.onSolid,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:10,padding:"6px 10px",lineHeight:1.5,marginBottom:9,overflowWrap:"anywhere"}}>{seasonFull}</div>:null}
      {badge?<div style={{fontSize:9.5,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Most used</div>:null}
      {vars.length?<div style={{fontSize:13.5,fontWeight:800,color:C.text,wordBreak:"break-word",marginBottom:6}}>{v.name||("Approach "+(i+1))}</div>:null}
      {why?<div data-approach-why="1" style={{borderLeft:"3px solid "+C.blue,background:C.surface,borderRadius:"0 9px 9px 0",padding:"6px 10px",marginBottom:8}}>
        <div style={{fontSize:9.5,fontWeight:800,color:C.blue,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Why go this way</div>
        <div style={{fontSize:12.5,color:C.text,lineHeight:1.55}}>{why}</div>
      </div>:null}
      {facts.length||crossing?<div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",marginBottom:7}}>{facts.map((f,fi)=><span key={fi} style={{fontSize:11.5,color:C.textSub}}>{f}</span>)}{crossing?<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:20,padding:"1px 8px"}}><ActionIcon name="alert" size={11} color={C.amber}/>Stream crossing</span>:null}</div>:null}
      {v.notes?splitParagraphs(v.notes).map((p,pi)=><p key={pi} style={{fontSize:12.5,color:C.textSub,lineHeight:1.6,margin:pi===0?"0 0 7px":"7px 0 0"}}>{p}</p>):null}
      {/* The full account renders IN FULL, never behind a "read more": check:field-renders proves
          this column reaches a screen by server-rendering the page, and a collapsed paragraph is
          not in that markup. It is labelled only when a summary sits above it. */}
      {own&&prose?<div style={{marginTop:v.notes?9:0}}>
        {v.notes?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:4}}><div style={{fontSize:9.5,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5}}>Full description</div>{onEditProse?<EditIconButton onClick={onEditProse} title="Edit the full approach description"/>:null}</div>:null}
        {splitParagraphs(prose).map((p,pi)=><p key={pi} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:pi===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}
      </div>:null}
      {v.baseFinding?<div style={{marginTop:7,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"8px 10px"}}>
        <div style={{fontSize:9.5,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>Finding the base of the climbing</div>
        <div style={{fontSize:12.5,color:C.text,lineHeight:1.55}}>{v.baseFinding}</div>
      </div>:null}
      {haz.length?<div style={{marginTop:7,display:"flex",flexDirection:"column",gap:4}}>{haz.map((h,hi)=><div key={hi} style={{display:"flex",gap:6,alignItems:"flex-start",background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:8,padding:"5px 8px"}}><span style={{flexShrink:0,marginTop:1}}><ActionIcon name="alert" size={12} color={C.amber}/></span><span style={{fontSize:11.5,color:C.text,lineHeight:1.45}}>{h}</span></div>)}</div>:null}
    </div>;
  };
  const editFn=vars.length?onEdit:onEditProse;
  return <div style={{marginBottom:12}}>
    <SL action={editFn?<EditIconButton onClick={editFn} title={vars.length?"Edit the approaches":"Edit approach information"}/>:null} wp="Approach">APPROACH</SL>
    {vars.length>1?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,margin:"-4px 0 9px"}}>{vars.length+" ways in."+(marked?" Most parties take the one marked Most used"+(vars.every(v=>v.primary===true||String(v.whyThisWay||"").trim())?"; each other one says when to take it instead.":"."):" Read the season window on each before you pick.")}</div>:null}
    {order.map((i,k)=>card(i<0?{}:vars[i],i<0?-1:i,k===0))}
  </div>;
}
