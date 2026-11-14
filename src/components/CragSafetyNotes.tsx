import { C, catOf } from "../../ClimbMatchCore.jsx";
import { CHIP } from "../../lib/buttonStyles.js";
import ActionIcon from "./ActionIcon.tsx";

export interface CragSafetyNotesProps {
  /** The route; only its discipline is read (the card is for sport routes). */
  route: Parameters<typeof catOf>[0];
  /** Opens the hazard report with the fixed-gear problem filled in. */
  onOpenHazards?: ((label: string) => void) | null;
}

/**
 * On a sport route, "Spot a bolt or anchor problem?": one button per fixed-gear problem, each opening the hazard
 * report with it filled in. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function CragSafetyNotes({route,onOpenHazards}: CragSafetyNotesProps){
  const cat=catOf(route);
  return <>
    {cat==="sport"?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:3,display:"flex",alignItems:"center",gap:7}}><span aria-hidden="true" style={{display:"inline-flex"}}><ActionIcon name="alert" size={14} color={C.amber}/></span>Spot a bolt or anchor problem?</div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:9,lineHeight:1.45}}>Flag worn or unsafe fixed gear so the next party — and local rebolters — know before they clip.</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Rusted","Spinner / loose","Missing hanger","Worn / sharp","Needs replacement"].map(o=><button key={o} onClick={()=>onOpenHazards&&onOpenHazards("Fixed gear: "+o)} style={{...CHIP,border:"1px solid "+C.border,background:C.surface,color:C.textSub}}>{o}</button>)}</div></div>:null}
  </>;
}
