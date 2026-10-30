import type { Dispatch, SetStateAction } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import { APP_VERSION } from "../../lib/AppFeedback";

/* aboutOpen? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export interface AboutSheetProps {
  setAboutOpen: Dispatch<SetStateAction<boolean>>;
  setFeedbackOpen: Dispatch<SetStateAction<boolean>>;
  setRateOpen: Dispatch<SetStateAction<boolean>>;
}
export default function AboutSheet({setAboutOpen,setFeedbackOpen,setRateOpen}: AboutSheetProps){
  return <div onClick={()=>setAboutOpen(false)} role="dialog" aria-label="About us" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16,boxSizing:"border-box"}}><div onClick={e=>e.stopPropagation()} style={{background:C.surface,width:"100%",maxWidth:420,borderRadius:16,border:"1px solid "+C.borderHi,boxShadow:"0 20px 60px rgba(0,0,0,0.65)",padding:18,maxHeight:"85vh",overflowY:"auto",overscrollBehavior:"contain",boxSizing:"border-box"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>About us</div><button aria-label="Close about" onClick={()=>setAboutOpen(false)} style={POP_CLOSE}>✕</button></div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{[["Our mission","ClimbMatch helps climbers find trustworthy partners, plan objectives, and share real route conditions — so more people get on rock, safely."],["Who we are","Built by climbers who were tired of flaky partners and stale beta. Trust and safety sit at the center of everything here."],["Get in touch","Questions, ideas or a problem? Send it with Feedback — it goes straight to the ClimbMatch team, and we read every one. For your data or your account, use Settings → Your data."]].map(function(x,i){return <div key={i} style={{marginBottom:13}}><div style={{fontSize:12,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.3,marginBottom:4}}>{x[0]}</div><div>{x[1]}</div></div>;})}<div style={{display:"flex",gap:8,marginTop:4}}><button onClick={()=>{setAboutOpen(false);setFeedbackOpen(true);}} style={{flex:1,minHeight:46,padding:"10px 12px",borderRadius:11,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:14,fontWeight:700,cursor:"pointer"}}>Send feedback</button><button onClick={()=>{setAboutOpen(false);setRateOpen(true);}} style={{flex:1,minHeight:46,padding:"10px 12px",borderRadius:11,border:"1px solid "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:14,fontWeight:700,cursor:"pointer"}}>Rate ClimbMatch</button></div><div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginTop:14}}>{"ClimbMatch version "+APP_VERSION}</div></div></div></div>;
}
