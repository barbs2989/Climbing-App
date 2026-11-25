import { useState } from "react";
import { C, FOLD_GAP } from "../../ClimbMatchCore.jsx";
import { BTN_LINK } from "../../lib/buttonStyles.js";
import CardHead from "./CardHead.tsx";
import Chevron from "./Chevron.tsx";
import FloatPlan, { type FloatPlanCoords } from "./FloatPlan.tsx";

/** The route's float plan, drawn in place: the same scope, account, prefill and filing Crews › Float plans uses. */
export interface FloatInline {
  scope: string;
  who?: string | null;
  defaults?: Partial<Record<string, string>> | null;
  coords?: FloatPlanCoords | null;
  /** The crew the plan is filed on, when the climber has one for this climb. */
  crewName?: string | null;
  onFiled?: (form: Record<string, string>) => void;
  onSendToCrew?: (text: string) => void;
}

export interface FloatPlanFoldProps {
  /** The route's cell coverage; "good" changes the reason given. */
  coverage?: string | null;
  /** Opens Crews › Float plans at this climb's plan; without it there is no link. */
  onFile?: (() => void) | null;
  /** The plan itself, drawn here when the card is open. Without it the card only links to Crews › Float plans. */
  inline?: FloatInline | null;
}

/**
 * The folded FLOAT PLAN card on a committing objective: why to file one, and the plan itself. Its heading is a
 * toggle (aria-expanded). Reads `C` at render time.
 * THE PLAN OPENS HERE (2026-11-18): the button used to jump to Crews › Float plans at the bottom of the Crews page.
 * The form is mounted only while the card is open and is uncontrolled, so what survives a closed card or a tab
 * switch is the device copy its `scope` saves (check:float-plan-persistence 7).
 */
export default function FloatPlanFold({coverage,onFile,inline}: FloatPlanFoldProps){const [open,setOpen]=useState(false);
  return <div style={{background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:12,padding:"11px 13px",margin:FOLD_GAP+"px 0"}}>
    <div role="heading" aria-level={2}><button onClick={function(){setOpen(!open);}} aria-expanded={open} style={{minHeight:44,display:"flex",alignItems:"center",gap:8,width:"100%",padding:0,background:"transparent",border:"none",color:C.text,cursor:"pointer",textAlign:"left"}}>
      <span style={{flex:1,minWidth:0}}><CardHead style={{marginBottom:3}}>FLOAT PLAN</CardHead><span style={{display:"block",fontSize:12.5,color:C.text,lineHeight:1.5}}><b style={{color:C.amber}}>Committing objective.</b> {coverage==="good"?"File a float plan in case something still goes wrong.":"File a float plan before you lose cell service."}</span></span>
      <Chevron open={open} size={16} color={C.amber}/>
    </button></div>
    {inline?(open?<div style={{marginTop:10}}>
      {inline.crewName?<div style={{fontSize:12,color:C.textSub,marginBottom:8,lineHeight:1.45}}>{"For your "+inline.crewName+" crew — saving it shows on your crew card."}</div>:null}
      <FloatPlan scope={inline.scope} who={inline.who} defaults={inline.defaults} coords={inline.coords} onFiled={inline.onFiled} onSendToCrew={inline.onSendToCrew}/>
      {onFile?<button onClick={onFile} style={{...BTN_LINK(C),marginTop:6}}>All your float plans ›</button>:null}
    </div>:null):<div hidden={!open} style={{marginTop:10}}>{onFile?<button onClick={onFile} style={{width:"100%",padding:11,background:C.amber,color:C.bg,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:10,fontSize:14.5,cursor:"pointer",fontWeight:700}}>File a float plan for this climb →</button>:null}<div style={{fontSize:11.5,color:C.textMuted,marginTop:6,lineHeight:1.45}}>Float plans live under Crews › Float plans, with your crew's if you have one for this climb — then Share, Email or Save as PDF.</div></div>}
  </div>;
}
