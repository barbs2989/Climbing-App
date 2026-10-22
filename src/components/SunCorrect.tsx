import { useState } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";

/** The route the sheet is about; only its name is shown. */
export interface SunCorrectRoute {
  name: string;
}

/** What the sheet submits: the vote key (`more` · `accurate` · `less`) and the optional note. */
export interface SunReport {
  vote: string;
  note: string;
}

export interface SunCorrectProps {
  route: SunCorrectRoute;
  onClose: () => void;
  onSubmit: (report: SunReport) => void;
}

/** One vote option: key, label, accent colour, accent background. */
type SunOpt = [string, string, string, string];

/**
 * SUN ON THIS ROUTE: the bottom sheet a climber corrects the sun forecast from — three votes (more sun, about
 * right, more shade), an optional note, and a Submit that reports and closes. Tapping the scrim or ✕ closes it.
 */
export default function SunCorrect({ route, onClose, onSubmit }: SunCorrectProps) {
  const [vote,setVote]=useState<string | null>(null);const [note,setNote]=useState("");
  const opts: SunOpt[]=[["more","More sun than shown",C.amber,C.amberBg],["accurate","About as described",C.green,C.greenBg],["less","More shade than shown",C.blue,C.blueBg]];
  return <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Sun on this route" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:60}}><div onClick={e=>e.stopPropagation()} style={{background:C.surface,width:"100%",maxWidth:440,borderRadius:"18px 18px 0 0",border:"1px solid "+C.border,maxHeight:"90vh",overflowY:"auto",overscrollBehavior:"contain"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid "+C.border}}><div style={{fontSize:15,fontWeight:800,color:C.text}}>Sun on this route</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button></div><div style={{padding:"14px 16px"}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{route.name}</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:14}}>Climbed it? Tell the next party what the sun is really like. Your report joins this route's community sun notes and helps correct the forecast.</div><div style={{fontSize:12,fontWeight:800,letterSpacing:0.3,color:C.textMuted,marginBottom:7}}>HOW WAS THE SUN?</div><div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>{opts.map(o=>{const on=vote===o[0];return <button key={o[0]} onClick={()=>setVote(o[0])} aria-current={on?"true":undefined} style={{textAlign:"left",padding:"10px 12px",borderRadius:10,border:"1px solid "+(on?o[2]:C.border),background:on?o[3]:C.card,color:on?o[2]:C.textSub,fontSize:13.5,fontWeight:600,cursor:"pointer"}}>{o[1]}</button>;})}</div><div style={{fontSize:12,fontWeight:800,letterSpacing:0.3,color:C.textMuted,marginBottom:7}}>NOTES (optional)</div><textarea aria-label="Notes (optional)" value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="e.g. Full sun on the upper glacier all afternoon — bring glacier glasses and sunscreen." style={{width:"100%",padding:"9px 11px",borderRadius:10,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:13,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.5,outline:"none"}}/></div><div style={{padding:"12px 16px",borderTop:"1px solid "+C.border}}><button disabled={!vote} onClick={()=>{if(!vote)return;onSubmit({vote:vote,note:note});onClose();}} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:C.blueSolid,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Submit sun report</button></div></div></div>;
}
