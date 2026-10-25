import { useState } from "react";
import { C, PRE_QS, RISK_LEVELS } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { POP_BACK } from "../../lib/popupChrome.js";
import ActionIcon from "./ActionIcon.tsx";

/** What the questionnaire hands back: the chosen risk tolerance and, per pre-climb question id, the index of the option picked. */
export interface QuestionnaireAnswers {
  riskTolerance: string | null;
  preClimbAnswers: Record<string, number>;
}
export interface QuestionnaireProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
}

/** The PRE-CLIMB QUESTIONNAIRE on the safety plan: risk tolerance first, then one `PRE_QS` question per step, with a progress bar; answers are shared with the crew only as group-level flags. */
export default function Questionnaire({onComplete}: QuestionnaireProps){
  /* `RISK_LEVELS` ids to their icons. Built HERE, at render time: an object literal indexed by a string is an implicit any,
     and a hoisted copy would be a module-scope read if it ever named a core export. */
  const RISK_ICON: Record<string, string>={conservative:"shield",moderate:"balance",aggressive:"fire"};
  const [step,setStep]=useState(0),[risk,setRisk]=useState<string | null>(null),[ans,setAns]=useState<Record<string, number>>({});
  const total=PRE_QS.length+1,pct=Math.round((step/total)*100);
  if(step===0)return <div>
    <div style={{background:C.blueBg,borderRadius:12,padding:"12px 14px",marginBottom:16,border:`1px solid ${C.blueDim}`}}><div style={{fontSize:14,fontWeight:700,color:C.blue,marginBottom:4}}>Pre-climb questionnaire</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.6}}>Your answers are shared anonymously with the group to surface alignment issues. No one sees your exact answers — only group-level flags. This removes social pressure.</div></div>
    <div style={{marginBottom:10,background:C.surface,borderRadius:8,overflow:"hidden",height:6}}><div style={{width:`${pct}%`,height:"100%",background:C.blueSolid}}/></div>
    <div style={{fontSize:12,color:C.textMuted,marginBottom:14}}>Step {step+1} of {total}</div>
    <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>What is your risk tolerance?</div>
    <div style={{fontSize:13,color:C.textSub,marginBottom:14,lineHeight:1.6}}>Be honest — mismatched risk tolerance is the most common cause of conflict on climbs.</div>
    {RISK_LEVELS.map(r=><div key={r.id} {...clickable(()=>setRisk(r.id))} style={{background:risk===r.id?r.bg:C.card,borderRadius:13,padding:"13px 15px",marginBottom:10,border:`1.5px solid ${risk===r.id?r.color:C.border}`,cursor:"pointer"}}><div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}><span style={{fontSize:23,display:"inline-flex"}}><ActionIcon name={RISK_ICON[r.id]||"shield"} size={23} color={risk===r.id?r.color:C.textSub}/></span><div style={{fontWeight:700,fontSize:15,color:risk===r.id?r.color:C.text}}>{r.label}</div>{risk===r.id?<span style={{marginLeft:"auto",fontSize:17,color:r.color}}>✓</span>:null}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{r.desc}</div></div>)}
    <button onClick={()=>setStep(1)} disabled={!risk} style={{width:"100%",padding:12,background:risk?C.blueSolid:C.border,color:risk?"#fff":C.textMuted,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:11,fontSize:15,cursor:"pointer",fontWeight:700,opacity:risk?1:0.4}}>Continue →</button>
  </div>;
  if(step>0&&step<=PRE_QS.length){
    const q=PRE_QS[step-1];
    return <div>
      <div style={{marginBottom:12,background:C.surface,borderRadius:8,overflow:"hidden",height:6}}><div style={{width:`${pct}%`,height:"100%",background:C.blueSolid}}/></div>
      <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>Step {step+1} of {total} · {q.category}</div>
      <div style={{fontSize:15,fontWeight:700,marginBottom:16,lineHeight:1.5}}>{q.question}</div>
      {q.options.map((opt,i)=><div key={i} {...clickable(()=>setAns(a=>({...a,[q.id]:i})))} style={{background:ans[q.id]===i?C.blueBg:C.card,borderRadius:12,padding:"11px 14px",marginBottom:8,border:`1.5px solid ${ans[q.id]===i?C.blue:C.border}`,cursor:"pointer",display:"flex",gap:10,alignItems:"center"}}><div style={{width:20,height:20,borderRadius:"50%",border:`1.5px solid ${ans[q.id]===i?C.blue:C.border}`,background:ans[q.id]===i?C.blueSolid:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:"white",fontWeight:700}}>{ans[q.id]===i?"✓":""}</div><span style={{fontSize:14,color:ans[q.id]===i?C.text:C.textSub,lineHeight:1.4}}>{opt}</span>{i>=2?<span style={{marginLeft:"auto",fontSize:12,color:i===2?C.amber:C.red,flexShrink:0}}><ActionIcon name="alert" size={12} color={i===2?C.amber:C.red}/></span>:null}</div>)}
      <div style={{display:"flex",gap:8,marginTop:8}}><button onClick={()=>setStep(step-1)} style={POP_BACK}>← Back</button><button onClick={()=>step===PRE_QS.length?onComplete({riskTolerance:risk,preClimbAnswers:ans}):setStep(step+1)} disabled={ans[q.id]===undefined} style={{flex:1,padding:10,background:ans[q.id]!==undefined?C.blueSolid:C.border,color:ans[q.id]!==undefined?"#fff":C.textMuted,border:"none",borderRadius:10,fontSize:14,cursor:"pointer",fontWeight:700,opacity:ans[q.id]!==undefined?1:0.4}}>{step===PRE_QS.length?"Submit & View Alignment":"Next →"}</button></div>
    </div>;
  }
  return null;
}
