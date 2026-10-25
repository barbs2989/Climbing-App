import { useState } from "react";
import { BTN_LG } from "../../lib/buttonStyles.js";
import { createPortal } from "react-dom";
import { C, ME, ROUTES, climberLine, pubFirst } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import Av from "./Av.tsx";

/** The climber being asked to connect: `pubFirst` names them the way they asked; `climberLine` writes the sub-line. */
export interface ConnectClimber {
  id?: string | number;
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
  avatar?: string | null;
  online?: boolean;
  objectiveIds?: ReadonlyArray<string | number> | null;
}
/** A route both of you want: the seed `ROUTES` shape or the caller's `routeById`. */
export interface ConnectRoute {
  id: string | number;
  name: string;
}
export interface ConnectModalProps {
  climber: ConnectClimber;
  onClose: () => void;
  /** Sends the request with the trimmed note ("" when none). */
  onSend: (note: string) => void;
  routeById?: (id: string | number) => ConnectRoute | null | undefined;
}
/** `ME` as this sheet reads it: `objectiveIds` is written onto the seed literal by App at run time, so the literal's own type lacks it. */
interface MeView { objectiveIds?: ReadonlyArray<string | number> | null }

/** The CONNECT sheet: who, the objectives you share, an optional note (with a suggested one), send. Portalled to document.body like FullProfile. The backdrop is a mouse-only div by design (check:clickable baseline). */
export default function ConnectModal({climber,onClose,onSend,routeById}: ConnectModalProps){
  const meView: MeView=ME;
  const c=climber;
  const shared=(meView.objectiveIds||[]).filter(id=>(c.objectiveIds||[]).includes(id)).map(id=>routeById?routeById(id):ROUTES.find(r=>r.id===id)).filter((r): r is ConnectRoute => !!r);
  /* The name THEY chose to show. `.name.split` put a hidden real name in the header, the suggested note and the footer. */
  const first=pubFirst(c);
  const suggested=shared.length?("Hi "+first+", I saw we both want to climb "+shared[0].name+". I’m looking for a solid, safety-minded partner for it — want to team up?"):("Hi "+first+", I’d love to connect and find a climb to do together.");
  const [note,setNote]=useState("");
  const MAX=300;
  /* Portalled, like FullProfile. "+ Add" under Stay in touch is tapped inside Past crews, itself a portal on document.body; left in App's tree this sheet sat EARLIER in the DOM than the list it opens from, so only its zIndex kept it on top. Here it is the last child of body, so order and zIndex agree. */
  return createPortal(<div onClick={onClose} role="dialog" aria-modal="true" aria-label="Connect with climber" style={{position:"fixed",inset:0,zIndex:9950,background:C.scrim,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:"18px 18px 0 0",border:"1px solid "+C.border,width:"100%",maxWidth:520,padding:18,boxShadow:"0 -10px 40px rgba(0,0,0,0.5)",maxHeight:"90%",overflowY:"auto",overscrollBehavior:"contain"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <Av src={c.avatar} size={46} online={c.online}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:700}}>Connect with {first}</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{climberLine(c)}</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>
      {shared.length?<div style={{display:"flex",alignItems:"center",gap:9,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:11,padding:"10px 12px",marginBottom:14}}><span style={{fontSize:17,flexShrink:0}}></span><div style={{fontSize:12.5,color:C.green,fontWeight:600,lineHeight:1.45}}>You both want to climb {shared.map(r=>r.name).join(", ")}</div></div>:null}
      <div style={{fontSize:13,color:C.text,fontWeight:800,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Add a note (optional)</div>
      <textarea aria-label="Add a note (optional)" value={note} onChange={e=>setNote(e.target.value.slice(0,MAX))} placeholder={suggested} rows={4} style={{width:"100%",padding:"11px 12px",borderRadius:11,border:"1px solid "+C.border,background:C.bg,color:C.text,fontSize:13.5,lineHeight:1.5,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",outline:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:7,marginBottom:15}}>
        <button onClick={()=>setNote(suggested)} style={{background:"transparent",border:"none",color:C.blue,fontSize:12.5,fontWeight:600,cursor:"pointer",padding:0}}>Use suggested note</button>
        <span style={{fontSize:12,color:note.length>MAX-30?C.amber:C.textMuted}}>{note.length}/{MAX}</span>
      </div>
      <div style={{display:"flex",gap:12}}>
        <button onClick={onClose} style={{flex:"0 0 auto",padding:"12px 17px",background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancel</button>
        <button onClick={()=>onSend(note.trim())} style={{...BTN_LG,flex:1,background:C.blueSolid,color:C.onSolid,border:"none"}}>{note.trim()?"Send request":"Send without note"}</button>
      </div>
      <div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginTop:11,lineHeight:1.5}}>A connection is mutual — {first} confirms before you’re connected.</div>
    </div>
  </div>,document.body);
}
