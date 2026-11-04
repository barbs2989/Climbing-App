import { C } from "../../ClimbMatchCore.jsx";
import { POP_BACK } from "../../lib/popupChrome.js";
import Av from "./Av.tsx";
import { unblockUser } from "../../lib/db";
import ActionIcon from "./ActionIcon.tsx";
import type { Dispatch, SetStateAction } from "react";

/** A blocked climber: an example row or a stored block (`_dbId` is the block row's id). */
interface BlockedClimbersSheetRow { id: string | number; name?: string | null; avatar?: string | null; _dbId?: string | number }

export interface BlockedClimbersSheetProps {
  /** The stored block row for a climber id, if there is one. */
  _blockRow: (otherId: string | number) => BlockedClimbersSheetRow | null;
  blocked: BlockedClimbersSheetRow[];
  /** The block list could not be read, so an empty list is not "nobody". */
  blockedUnavailable: boolean;
  myBlockQ: { refetch?: () => unknown };
  setBlocked: Dispatch<SetStateAction<BlockedClimbersSheetRow[]>>;
  setBlockedOpen: Dispatch<SetStateAction<boolean>>;
  showToast: (t: string, d?: number) => void;
  uid: string | null;
}

/* blockedOpen&& — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function BlockedClimbersSheet({_blockRow,blocked,blockedUnavailable,myBlockQ,setBlocked,setBlockedOpen,showToast,uid}: BlockedClimbersSheetProps){
  return <div onClick={()=>setBlockedOpen(false)} role="dialog" aria-label="Blocked climbers" style={{position:"fixed",inset:0,background:C.bg,zIndex:1300,overflowY:"auto",overscrollBehavior:"contain",maxWidth:520,margin:"0 auto",boxSizing:"border-box"}}><div onClick={e=>e.stopPropagation()} style={{minHeight:"100%"}}><div style={{position:"sticky",top:0,background:C.surface,borderBottom:"1px solid "+C.border,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,zIndex:2}}><button onClick={()=>setBlockedOpen(false)} style={POP_BACK}>← Back</button><div style={{fontSize:15,fontWeight:700}}>Blocked climbers</div></div><div style={{maxWidth:560,margin:"0 auto",padding:"14px 16px 40px"}}><div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5,marginBottom:13}}>Blocked climbers can’t message you, add you to a crew, or open your profile from their account, and they’re removed from your partners. Anything public on ClimbMatch stays visible to signed-out visitors. Unblock anyone here to restore contact.</div>{blocked.length?<div style={{display:"flex",flexDirection:"column",gap:8}}>{blocked.map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:10,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px"}}><Av src={b.avatar} size={38}/><span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{b.name}</span><button onClick={()=>{const _r=b._dbId?b:_blockRow(b.id);setBlocked(bb=>bb.filter(x=>x.id!==b.id));const _ubn=String(b.name||"").split(" ")[0]||"They";if(uid&&_r&&_r._dbId){unblockUser(_r._dbId).then(function(){if(myBlockQ.refetch)myBlockQ.refetch();showToast(_ubn+" unblocked — they can message you and invite you to crews again");}).catch(function(){setBlocked(bb=>bb.some(x=>x.id===b.id)?bb:[...bb,b]);showToast("Couldn't unblock — try again.");});}else showToast(_ubn+" unblocked"+(uid?"":" on this device — sign in to keep it"));}} style={{flexShrink:0,background:C.surface,color:C.text,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 14px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Unblock</button></div>)}</div>:<div style={{textAlign:"center",padding:"44px 18px",color:C.textMuted}}><div aria-hidden="true" style={{display:"flex",justifyContent:"center",marginBottom:8}}><ActionIcon name="shield" size={30} color={C.textMuted}/></div><div style={{fontSize:14,fontWeight:600,color:C.text}}>{blockedUnavailable?"Couldn’t load your blocked list":"You haven’t blocked anyone"}</div><div style={{fontSize:12.5,marginTop:5,lineHeight:1.5}}>{blockedUnavailable?"Something went wrong reading it, so this list is not showing who you have blocked. Try again in a moment.":"Blocking someone from their profile removes them from your connections and hides them from search, rankings and suggestions."}</div></div>}</div></div></div>;
}
