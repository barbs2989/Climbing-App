import { useState } from "react";
import { C, FOLD_GAP } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import Chevron from "./Chevron.tsx";

export interface FloatPlanFoldProps {
  /** The route's cell coverage; "good" changes the reason given. */
  coverage?: string | null;
  /** Opens the float plan for this climb; without it there is no button. */
  onFile?: (() => void) | null;
}

/**
 * The folded FLOAT PLAN card on a committing objective: why to file one, and the button that does. Its heading is a
 * toggle (aria-expanded). Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function FloatPlanFold({coverage,onFile}: FloatPlanFoldProps){const [open,setOpen]=useState(false);
  return <div style={{background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:12,padding:"11px 13px",margin:FOLD_GAP+"px 0"}}>
    <div role="heading" aria-level={2}><button onClick={function(){setOpen(!open);}} aria-expanded={open} style={{minHeight:44,display:"flex",alignItems:"center",gap:8,width:"100%",padding:0,background:"transparent",border:"none",color:C.text,cursor:"pointer",textAlign:"left"}}>
      <span style={{flex:1,minWidth:0}}><CardHead style={{marginBottom:3}}>FLOAT PLAN</CardHead><span style={{display:"block",fontSize:12.5,color:C.text,lineHeight:1.5}}><b style={{color:C.amber}}>Committing objective.</b> {coverage==="good"?"File a float plan in case something still goes wrong.":"File a float plan before you lose cell service."}</span></span>
      <Chevron open={open} size={16} color={C.amber}/>
    </button></div>
    <div hidden={!open} style={{marginTop:10}}>{onFile?<button onClick={onFile} style={{width:"100%",padding:11,background:C.amber,color:C.bg,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:10,fontSize:14.5,cursor:"pointer",fontWeight:700}}>File a float plan for this climb →</button>:null}<div style={{fontSize:11.5,color:C.textMuted,marginTop:6,lineHeight:1.45}}>Float plans live under Crews › Float plans, with your crew's if you have one for this climb — then Share, Email or Save as PDF.</div></div>
  </div>;
}
