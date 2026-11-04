import { useCallback, useEffect, useRef, useState, type ChangeEvent, type SetStateAction } from "react";
import { C, floatPlanSheetHtml, floatPlanState, floatPlanText, printSheet } from "../../ClimbMatchCore.jsx";
import { useMyEmergencyContact } from "../../lib/db.js";
import { saveFloatPlan, savedFloatPlan } from "../../lib/offline";
import Lbl from "./Lbl.tsx";
import ActionIcon from "./ActionIcon.tsx";

/** The form as `floatPlanState()` shapes it: every field a string, plus the two flags. */
export interface FloatPlanState {
  form: Record<string, string>;
  saved: boolean;
  checkedIn: boolean;
}
/** The objective's coordinate, named when the climb has a name. */
export interface FloatPlanCoords {
  lat: number;
  lng: number;
  name?: string | null;
}
export interface FloatPlanProps {
  /** Pre-filled fields (the route name, a partner); `floatPlanState` fills in the rest. */
  defaults?: Partial<Record<string, string>> | null;
  coords?: FloatPlanCoords | null;
  /** Lifted state and its setter, when the caller owns the plan (Crews › Float plans, the safety tab); the form keeps its own otherwise. */
  plan?: FloatPlanState | null;
  onPlan?: (next: SetStateAction<FloatPlanState>) => void;
  /** The account the device-local copy is keyed by, and the scope (`route:<id>`) it is saved under; no scope, no save. */
  who?: string | null;
  scope?: string | null;
  onFiled?: (form: Record<string, string>) => void;
  /** Present on a crew's plan: posts the plan text into the crew chat. */
  onSendToCrew?: (text: string) => void;
}

/** The DIGITAL FLOAT PLAN: who, where, when back, how to reach you — filled in, saved device-locally per account, then shared, emailed, printed or posted to the crew. */
export default function FloatPlan({defaults,coords,plan,onPlan,who,scope,onFiled,onSendToCrew}: FloatPlanProps={}){
  const [own,setOwn]=useState<FloatPlanState>(()=>floatPlanState(defaults));
  const st=plan||own,_setSt=onPlan||setOwn;
  /* IT SURVIVES A RELOAD NOW, WHICH IS NOT WHAT #1577/#1581 FIXED. Those lifted the state out of
     a conditional branch so leaving the sub-tab stopped discarding it; the form still reached no
     storage, so eleven fields of a safety document — vehicle, parking, depart, TURNAROUND, HARD
     RETURN, comms, emergency contact — were gone on the next load. Device-local and keyed by
     ACCOUNT (see lib/offline.js), because this form holds somebody's emergency contact.
     `scope` is OPTIONAL and absent means exactly today's behaviour, so a call site that has not
     opted in cannot be broken by this. */
  const _dirty=useRef(false),_hyd=useRef(false);
  const setSt=useCallback(function(fn: SetStateAction<FloatPlanState>){_dirty.current=true;_setSt(function(prev){const next=(typeof fn==="function")?fn(prev):fn;if(scope)saveFloatPlan(who,scope,next);return next;});},[_setSt,who,scope]);
  useEffect(function(){if(!scope||_hyd.current)return;let alive=true;
    /* The latch is set AFTER the read resolves, never before it — the check:profile-edit-gate
       trap, where latching first made one transient failure permanent for the session. And a
       stored plan must never clobber what somebody has already typed while the read was in
       flight, which is what `_dirty` is for. */
    savedFloatPlan(who,scope).then(function(v){if(!alive)return;_hyd.current=true;if(v&&!_dirty.current)_setSt(function(p){return {...p,form:{...p.form,...v.form},saved:v.saved};});}).catch(function(){});
    return function(){alive=false;};},[who,scope,_setSt]);
  const form=st.form,saved=st.saved,checkedIn=st.checkedIn;
  /* The contact saved in Edit profile (0237, owner-only). OFFERED, never written in by itself: the form is
     device-local and may already hold a different contact for this trip. */
  const _ecQ=useMyEmergencyContact(who);const _ec=_ecQ.data?(_ecQ.data.name+" · "+_ecQ.data.phone):"";
  const setSaved=(v: boolean)=>setSt(x=>({...x,saved:v})),setCheckedIn=(v: boolean)=>setSt(x=>({...x,checkedIn:v}));
  const [showShare,setShowShare]=useState(false),[copyState,setCopyState]=useState(""),[pdfNote,setPdfNote]=useState(""),[crewSent,setCrewSent]=useState(false);
  const set=(k: string)=>(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>)=>{const v=e.target.value;setSt(x=>({...x,form:{...x.form,[k]:v}}));};const planText=floatPlanText(form,coords);
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
    <div style={{fontSize:14,fontWeight:700,color:C.amber,marginBottom:4}}>Digital float plan</div>
    <div style={{fontSize:12,color:C.textSub,marginBottom:12,lineHeight:1.5}}>Fill this in, then send it to your emergency contact so they know your route and return time — and can call for help if you're overdue. Nothing leaves your phone until you share it.</div>
    {saved?<div style={{background:C.greenBg,borderRadius:12,padding:14,border:`1px solid ${C.greenDim}`,textAlign:"center"}}><div aria-hidden="true" style={{display:"flex",justifyContent:"center",marginBottom:6}}><ActionIcon name="check" size={24} color={C.green}/></div><div style={{fontSize:15,fontWeight:700,color:C.green}}>{checkedIn?"✓ Checked in safe":"Float plan ready to send"}</div><div style={{fontSize:13,color:C.textSub,marginTop:4}}>Send it to {form.contact||"your emergency contact"} now — use Share below. They can only raise the alarm if you're not back by {form.ret||"your return time"} if they actually have it.</div>{coords?<div style={{fontSize:12,color:C.textSub,marginTop:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:`1px solid ${C.borderLight}`}}>{<Lbl s={"📍 Objective: "+coords.lat.toFixed(4)+", "+coords.lng.toFixed(4)+(coords.name?" · "+coords.name:"")}/>}</div>:null}<div style={{fontSize:11.5,color:C.amber,marginTop:8,lineHeight:1.5,textAlign:"left"}}>If you’re overdue, your contact should call 911 and ask for county Search and Rescue — then share this plan and the coordinates.</div><div style={{display:"flex",gap:7,marginTop:12}}><button onClick={()=>setCheckedIn(true)} disabled={checkedIn} style={{flex:1,padding:8,background:C.greenChip,color:C.green,border:"none",borderRadius:9,fontSize:13,cursor:checkedIn?"default":"pointer",fontWeight:700,opacity:checkedIn?0.6:1}}>{checkedIn?"✓ Checked in":"✓ Check In Safe"}</button><button onClick={()=>setSaved(false)} style={{flex:1,padding:8,background:C.surface,color:C.textSub,border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:"pointer"}}>Edit plan</button></div>{/* SEND IT THREE WAYS: the share sheet, an email with the plan as its body, or a printable page the browser saves as a PDF — the same printSheet the itineraries use, so no PDF library ships. A blocked pop-up is said HERE, because this component has no toast. */}<div style={{display:"flex",gap:7,marginTop:8}}><button onClick={()=>{try{if(typeof navigator!=="undefined"&&navigator.share){navigator.share({title:"Float plan",text:planText}).catch(function(e){if(e&&e.name==="AbortError")return;setShowShare(true);});}else{setShowShare(true);}}catch{setShowShare(true);}}} aria-label="Share float plan" style={{flex:1,minWidth:0,padding:"10px 6px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center",textDecoration:"none",boxSizing:"border-box"}}>Share…</button><a href={"mailto:"+encodeURIComponent(((form.contact||"").match(/[^\s<>(),;]+@[^\s<>(),;]+/)||[""])[0])+"?subject="+encodeURIComponent("Float plan — "+(form.route||"climb"))+"&body="+encodeURIComponent(planText)} aria-label="Email float plan" style={{flex:1,minWidth:0,padding:"10px 6px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center",textDecoration:"none",boxSizing:"border-box"}}>Email</a><button onClick={()=>{setPdfNote("");printSheet("Float plan — "+(form.route||"climb"),floatPlanSheetHtml(form,coords),setPdfNote);}} aria-label="Save float plan as a PDF" style={{flex:1,minWidth:0,padding:"10px 6px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center",textDecoration:"none",boxSizing:"border-box"}}>Save as PDF</button></div>{onSendToCrew?<div style={{marginTop:8}}><button onClick={()=>{onSendToCrew(planText);setCrewSent(true);}} aria-label={crewSent?"Float plan posted in the crew chat — post it again":"Send float plan to the crew chat"} style={{width:"100%",padding:"10px 6px",borderRadius:9,border:"1px solid "+C.amber,background:C.amberBg,color:C.amber,fontSize:13,fontWeight:700,cursor:"pointer"}}>{crewSent?"✓ Posted in the crew chat":"Send to the crew chat"}</button><div style={{fontSize:11.5,color:C.textMuted,marginTop:4,lineHeight:1.45,textAlign:"left"}}>Everyone in the crew can read the whole plan there, your emergency contact included.</div></div>:null}{pdfNote?<div role="status" style={{fontSize:12,color:C.red,marginTop:6,lineHeight:1.5,textAlign:"left"}}>{pdfNote}</div>:null}<button onClick={()=>setShowShare(v=>!v)} aria-expanded={showShare} style={{minHeight:44,width:"100%",marginTop:7,padding:8,background:"none",color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{showShare?"Hide plan text":"Show plan text to copy or text it"}</button>{showShare?<div style={{marginTop:8}}><textarea aria-label="Float plan text" readOnly value={planText} rows={9} style={{width:"100%",padding:"9px 11px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:12,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.5}}/><div style={{display:"flex",gap:7,marginTop:8}}><button onClick={function(){setCopyState("");try{const _p=navigator.clipboard.writeText(planText);if(_p&&_p.then)_p.then(function(){setCopyState("ok");}).catch(function(){setCopyState("err");});else setCopyState("ok");}catch{setCopyState("err");}}} style={{flex:1,padding:"9px",borderRadius:9,border:"1px solid "+(copyState==="err"?C.red:C.border),background:C.surface,color:copyState==="err"?C.red:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{copyState==="ok"?"Copied":copyState==="err"?"Copy failed":"Copy"}</button><a href={"mailto:?subject="+encodeURIComponent("Float plan — "+(form.route||"climb"))+"&body="+encodeURIComponent(planText)} style={{flex:1,padding:"9px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",textAlign:"center",textDecoration:"none"}}>Email it</a><a href={"sms:?&body="+encodeURIComponent(planText)} style={{flex:1,padding:"9px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",textAlign:"center",textDecoration:"none"}}>Text it</a></div>{copyState==="err"?<div role="status" style={{fontSize:12,color:C.red,marginTop:6,lineHeight:1.5}}>{"Couldn’t copy to the clipboard — select the plan text above and copy it manually, or use Email it / Text it."}</div>:null}<div style={{fontSize:12,color:C.textMuted,marginTop:6,textAlign:"left"}}>Send this to your emergency contact before you lose service.</div></div>:null}</div>:<div>
      {[["Route / objective","route","e.g. Kings Peak — Henry's Fork"],["Climbing partner","partner","e.g. Alex Torres"],["Party size","party","e.g. 2 climbers"],["Vehicle description","vehicle","Make, model, color, plate"],["Parking / Trailhead","lot","e.g. Henry's Fork TH"],["Departure time","depart","e.g. Sat 5:00 AM"],["Hard return time","ret","e.g. Sat 8:00 PM"],["Communication plan","comms","e.g. inReach check-in 2pm; no cell above TH"],["Emergency contact","contact","Name and phone"],["Additional notes","notes","Bivy plans, medical info…"]].map(x=><div key={x[1]} style={{marginBottom:10}}><div style={{fontSize:12,color:C.textMuted,marginBottom:3,fontWeight:700}}>{x[0].toUpperCase()}</div>{x[1]==="notes"?<textarea aria-label={x[0]} value={form[x[1]]} onChange={set(x[1])} placeholder={x[2]} rows={2} style={{width:"100%",padding:"7px 9px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",resize:"none",outline:"none"}}/>:<input aria-label={x[0]} value={form[x[1]]} onChange={set(x[1])} placeholder={x[2]} style={{width:"100%",padding:"7px 9px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/>}{x[1]==="contact"&&_ec&&form.contact!==_ec?<button type="button" onClick={()=>setSt(v=>({...v,form:{...v.form,contact:_ec}}))} style={{marginTop:5,padding:"6px 10px",borderRadius:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Use my emergency contact: "+_ec}</button>:null}</div>)}
      <button onClick={()=>{if(form.route&&form.ret&&form.contact){setSaved(true);if(onFiled)onFiled(form);}}} style={{width:"100%",padding:11,background:form.route&&form.ret&&form.contact?C.amber:C.border,color:form.route&&form.ret&&form.contact?C.bg:C.textMuted,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:10,fontSize:15,cursor:"pointer",fontWeight:700,opacity:form.route&&form.ret&&form.contact?1:0.5}}>Save & share float plan</button>
    </div>}
  </div>;
}
