import { useState } from "react";
import { C, pubFirst } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";

/** The climber being reported; `pubFirst` names them the way they asked. */
export interface ReportedClimber {
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
}
export interface ReportModalProps {
  climber?: ReportedClimber | null;
  onClose: () => void;
  /** The reason picked (the Submit button is disabled until there is one, so `null` never reaches it), the free text, and whether to block as well. */
  onSubmit: (reason: string | null, detail: string, willBlock: boolean) => void;
  /** Already blocked: the "Also block" offer is replaced by a note. */
  alreadyBlocked?: boolean;
}

/** REPORT CLIMBER: a reason list, optional details, and the one enforced protection — block — offered except for a welfare report. The backdrop is a mouse-only div by design (check:clickable baseline). */
export default function ReportModal({climber,onClose,onSubmit,alreadyBlocked}: ReportModalProps){
  const reasons=["Harassment or abuse","Unsafe or dangerous behavior","Fake profile or impersonation","Inappropriate or threatening messages","Spam or scam","Faked climbs or rankings","Someone is in danger","Other"];
  const [reason,setReason]=useState<string | null>(null);const [detail,setDetail]=useState("");const [alsoBlock,setAlsoBlock]=useState(false);
  /* Blocking is the ONE protection here the app actually enforces end to end (0088 messages,
     0094 crew invites, 0095 profile reads). It is not offered for "Someone is in danger",
     which is a welfare report about a third party — cutting contact with somebody you are
     worried about is the opposite of what that reporter wants. The offer being WITHDRAWN is
     read from the same expression that submits it, so ticking the box and then switching to
     that reason cannot block somebody invisibly. */
  const _first=climber?pubFirst(climber):"them";const _danger=reason==="Someone is in danger";const _blockOffered=!_danger&&!alreadyBlocked;const _willBlock=_blockOffered&&alsoBlock;
  return <div onClick={onClose} role="dialog" aria-label="Report climber" aria-modal="true" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:1150,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 12px",overflowY:"auto",overscrollBehavior:"contain"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:420,border:"1px solid "+C.border,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"14px 16px",borderBottom:"1px solid "+C.border}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:700}}>Report {climber?pubFirst(climber):"climber"}</div><div style={{fontSize:12,color:C.textMuted}}>Reports are confidential and reviewed by our team.</div></div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button></div>
      <div style={{padding:16}}>
        <div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:8}}>WHY ARE YOU REPORTING?</div>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:13}}>{reasons.map(r=><button key={r} onClick={()=>setReason(r)} aria-current={reason===r?"true":undefined} style={{textAlign:"left",padding:"10px 12px",borderRadius:10,border:"1px solid "+(reason===r?C.red:C.border),background:reason===r?C.redBg:C.card,color:reason===r?C.red:C.text,fontSize:13.5,cursor:"pointer",fontWeight:reason===r?"700":"400"}}>{r}</button>)}</div>
        {reason==="Someone is in danger"?<div style={{background:C.redBg,border:"1px solid "+C.red,borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12.5,color:C.text,lineHeight:1.5}}>If anyone is in immediate danger, contact local emergency services first. A report here does not reach emergency responders.</div>:null}
        <div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:6}}>DETAILS (optional)</div>
        <textarea aria-label="What happened?" value={detail} onChange={e=>setDetail(e.target.value)} placeholder="What happened? Include dates, messages, or anything that helps us review." rows={4} style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:13,boxSizing:"border-box",resize:"vertical",minHeight:84,outline:"none",fontFamily:"inherit",lineHeight:1.5}}/>
        {alreadyBlocked?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:11}}>You’ve already blocked {_first}, so they cannot message you or see your profile.</div>:_danger?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:11}}>Blocking isn’t offered for this reason — if you’re worried about someone, staying reachable usually helps more. You can still block {_first} from their profile.</div>:<button role="checkbox" aria-checked={alsoBlock} aria-label={"Also block "+_first} onClick={()=>setAlsoBlock(v=>!v)} style={{marginTop:11,width:"100%",display:"flex",alignItems:"flex-start",gap:10,textAlign:"left",padding:"11px 12px",borderRadius:11,border:"1px solid "+(alsoBlock?C.red:C.border),background:alsoBlock?C.redBg:C.card,cursor:"pointer",boxSizing:"border-box",fontFamily:"inherit"}}><span aria-hidden="true" style={{flexShrink:0,width:18,height:18,marginTop:1,borderRadius:5,border:"1px solid "+(alsoBlock?C.red:C.border),background:alsoBlock?C.redSolid:"transparent",color:C.onSolid,fontSize:12,lineHeight:"16px",textAlign:"center",fontWeight:700}}>{alsoBlock?"✓":""}</span><span style={{minWidth:0}}><span style={{display:"block",fontSize:13.5,fontWeight:700,color:alsoBlock?C.red:C.text}}>Also block {_first}</span><span style={{display:"block",fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.45}}>They won’t be able to message you or see your profile. You can undo this in Settings.</span></span></button>}
      </div>
      <div style={{padding:"12px 16px",borderTop:"1px solid "+C.border}}><button disabled={!reason} onClick={()=>onSubmit(reason,detail,_willBlock)} style={{width:"100%",padding:12,background:reason?C.redSolid:C.border,color:reason?"#fff":C.textMuted,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:11,fontSize:15,cursor:reason?"pointer":"default",fontWeight:700}}>{_willBlock?"Submit report and block":"Submit report"}</button></div>
    </div>
  </div>;
}
