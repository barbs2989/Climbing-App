import { useEffect, useRef } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { POLICY_VERSION, policyVersionLabel } from "../../lib/policy";

export interface PolicyUpdateNoticeProps {
  /** The policy version this account accepted before, when it accepted one; absent, the account predates the published version. */
  previous?: string | null;
  /** The acceptance write is in flight. */
  busy?: boolean;
  /** Opens one of the two documents. */
  onRead: (which: "terms" | "privacy") => void;
  onAccept: () => void;
  /** Stacking order: App passes one below the toast, so an error stays readable over the notice. */
  z?: number;
  /** Reports the measured height so the page can reserve the space the fixed panel covers (check:bottom-panels). */
  onHeight?: (px: number) => void;
}

/* Asks an existing account to accept the current Terms and Privacy Policy.

   NOT a dialog, deliberately, and not dismissible. `role="dialog"` would promise an escape —
   and `check:dialog-dismiss` would rightly demand one — but an acceptance you can wave away is
   not an acceptance. It is a notice with one action, which is what the schema already means by
   acceptance: 0145's own column comment says the record means "the app showed version X and the
   account was created anyway". This is that sentence for an account that already exists.

   Reading first is offered rather than assumed: both documents open from here, and the notice is
   still there when you come back, because nothing about reading them constitutes agreeing. */
export default function PolicyUpdateNotice({previous,busy,onRead,onAccept,z,onHeight}: PolicyUpdateNoticeProps){
  /* Reports its own height so the page can make room for it.

     It is `position:fixed`, so it takes no space in the layout and sits over whatever is at the
     bottom of the viewport -- and it is not dismissible, so scrolling never gets content out
     from under it. Measured at 390x844: 201px of an 844px viewport, covering 39 controls across
     six tabs, including the whole app footer (Settings, Privacy, About us) on every one. The
     notice asking you to review the Privacy Policy was covering the Privacy link.

     MEASURED, never a constant: the three buttons wrap at narrow widths and the first line has
     two different wordings, so its height is a function of the viewport and of `previous`. A
     hardcoded number is right until someone edits the copy. ResizeObserver rather than a
     one-shot read for the same reason -- a rotation or a keyboard changes it after mount. */
  const _ref=useRef<HTMLDivElement>(null);
  useEffect(function(){
    const el=_ref.current; if(!el||!onHeight) return;
    const send=function(){onHeight(Math.ceil(el.getBoundingClientRect().height));};
    send();
    if(typeof ResizeObserver==="undefined") return;
    const ro=new ResizeObserver(send); ro.observe(el);
    return function(){ro.disconnect();onHeight(0);};
  },[onHeight,previous,busy]);
  return <div ref={_ref} style={{position:"fixed",left:0,right:0,bottom:0,zIndex:z,background:C.surface,borderTop:"1px solid "+C.border,boxShadow:"0 -10px 40px rgba(0,0,0,0.45)",padding:"14px 16px calc(14px + env(safe-area-inset-bottom))",maxWidth:520,margin:"0 auto",boxSizing:"border-box"}}>
    <div style={{fontSize:14.5,fontWeight:700,color:C.text,marginBottom:5}}>{previous?"Our Terms and Privacy Policy have changed":"Please review our Terms and Privacy Policy"}</div>
    <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginBottom:11}}>
      {previous?"You accepted the "+policyVersionLabel(previous)+" version. ":"Your account predates the version we now publish. "}
      {"The current one is dated "+policyVersionLabel(POLICY_VERSION)+". Carrying on using ClimbMatch means accepting it."}
    </div>
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      <button onClick={()=>onRead("terms")} style={{flex:"1 1 auto",padding:"9px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Read Terms</button>
      <button onClick={()=>onRead("privacy")} style={{flex:"1 1 auto",padding:"9px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Read Privacy</button>
      <button disabled={busy} onClick={onAccept} style={{flex:"1 1 100%",padding:"11px 12px",borderRadius:11,border:"1px solid rgba(0,0,0,0.22)",background:C.blueSolid,color:C.onSolid,fontSize:14,fontWeight:700,cursor:busy?"default":"pointer",opacity:busy?0.6:1}}>{busy?"Recording…":"I accept"}</button>
    </div>
  </div>;
}
