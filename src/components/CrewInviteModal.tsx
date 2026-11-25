import { FONT_DISPLAY } from "../../lib/fonts.js";
import { useState } from "react";
import { BTN_LG, SOLID_FILL } from "../../lib/buttonStyles.js";
import { C, FALLBACK_COVER, onImgErr, pubFirst } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import Av from "./Av.tsx";
import { withProtection } from "../../lib/grade";

/** The climber being invited: `pubFirst` names them the way they asked (first name, or @username). */
export interface InviteeClimber {
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
  avatar?: string | null;
  online?: boolean;
}
/** The crew's objective, as the card shows it. */
export interface InviteRoute {
  name: string;
  grade?: string | null;
  cover?: string | null;
}
export interface CrewInviteModalProps {
  climber: InviteeClimber;
  /** Everyone this ONE note goes to, when more than one climber was picked while browsing. */
  climbers?: ReadonlyArray<InviteeClimber> | null;
  route: InviteRoute;
  onClose: () => void;
  /** Sends the invite with the trimmed note ("" when none). */
  onSend: (note: string) => void;
}

/** The INVITE TO CREW sheet: who, for which climb, an optional note (with a suggested one), send. The backdrop is a mouse-only div by design (check:clickable baseline). */
export default function CrewInviteModal({climber,climbers,route,onClose,onSend}: CrewInviteModalProps){
  const many=climbers&&climbers.length>1?climbers:null;
  const c=climber,first=many?"":pubFirst(c);
  const names=many?many.map(x=>pubFirst(x)):[];
  const nameList=names.length<3?names.join(" and "):names.slice(0,-1).join(", ")+" and "+names[names.length-1];
  const suggested=(many?"Hi":"Hi "+first)+", want to join my crew for "+route.name+"? "+(withProtection(route.grade,route)?("It’s "+withProtection(route.grade,route)+". "):"")+"Looking for a solid, safety-minded partner — let me know!";
  const [note,setNote]=useState("");
  const MAX=300;
  return <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Invite to crew" style={{position:"fixed",inset:0,zIndex:80,background:C.scrim,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:"18px 18px 0 0",border:"1px solid "+C.border,width:"100%",maxWidth:520,padding:18,boxShadow:"0 -10px 40px rgba(0,0,0,0.5)",maxHeight:"90%",overflowY:"auto",overscrollBehavior:"contain"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:13}}>
        {many?null:<Av src={c.avatar} size={46} online={c.online}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:700}}>{many?"Invite "+many.length+" climbers to your crew":"Invite "+first+" to your crew"}</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:1,overflowWrap:"anywhere"}}>{many?nameList:"They join the trip for this objective"}</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:11,padding:"9px 11px",marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:8,overflow:"hidden",flexShrink:0}}><img loading="lazy" decoding="async" src={route.cover||undefined} className="cover-x" alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/></div>
        <div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{route.name}</div><div style={{fontSize:11.5,color:"#fff",fontWeight:600}}>{withProtection(route.grade,route)}</div></div>
      </div>
      <div style={{fontFamily:FONT_DISPLAY,fontSize:18,lineHeight:1.15,color:C.text,fontWeight:600,textTransform:"uppercase",letterSpacing:0.7,marginBottom:8}}>Add a note (optional)</div>
      <textarea aria-label="Add a note (optional)" value={note} onChange={e=>setNote(e.target.value.slice(0,MAX))} placeholder={suggested} rows={4} style={{width:"100%",padding:"11px 12px",borderRadius:11,border:"1px solid "+C.field,background:C.bg,color:C.text,fontSize:13.5,lineHeight:1.5,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",outline:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:7,marginBottom:15}}>
        <button onClick={()=>setNote(suggested)} style={{background:"transparent",border:"none",color:C.blue,fontSize:12.5,fontWeight:600,cursor:"pointer",padding:0}}>Use suggested note</button>
        <span style={{fontSize:12,color:note.length>MAX-30?C.amber:C.textMuted}}>{note.length}/{MAX}</span>
      </div>
      <div style={{display:"flex",gap:12}}>
        <button onClick={onClose} style={{...BTN_LG,flex:"0 0 auto",padding:"13px 17px",background:C.surface,color:C.textSub,border:"1px solid "+C.border}}>Cancel</button>
        <button onClick={()=>onSend(note.trim())} style={{...BTN_LG,flex:1,...SOLID_FILL(C),color:C.onSolid,border:"none"}}>{many?(note.trim()?"Send "+many.length+" invites":"Send "+many.length+" without note"):note.trim()?"Send invite":"Send without note"}</button>
      </div>
      <div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginTop:11,lineHeight:1.5}}>{many?"Each climber can accept or decline your invite.":first+" can accept or decline your invite."}</div>
    </div>
  </div>;
}
