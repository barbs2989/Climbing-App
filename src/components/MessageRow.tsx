import { createPortal } from "react-dom";
import type { MutableRefObject } from "react";
import { C, photoAlt, relTime } from "../../ClimbMatchCore.jsx";
import { canAppeal, canReportContent, isDbRowId, openAppeal, openContentReport } from "../../lib/reportBus";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";

/** One chat message as the DM and crew threads hold it. */
export interface ChatMessage {
  /** "me" for the climber's own bubbles; anything else is the other side. */
  from?: string | null;
  name?: string | null;
  text?: string | null;
  /** A data URL or photo URL when the message is a photo. */
  image?: string | null;
  ts?: number | null;
  reaction?: string | null;
  /** Moderation state of the climber's OWN message: "visible", "hidden" or "removed". */
  moderation?: string | null;
  /** The database row id, when the message is stored; only such a message can be reported or appealed. */
  _dbId?: unknown;
}
export type ReactKey = string | number;
export interface MessageRowProps {
  m: ChatMessage;
  avatarSrc?: string | null;
  /** Group chats show the sender's name above a run of their bubbles. */
  showName?: boolean;
  /** This row's key in the thread, matched against `reactAt` to open its reaction bar. */
  reactKey: ReactKey;
  reactAt?: ReactKey | null;
  /** The thread's long-press timer, shared across rows so only one bar opens. */
  reactTimer: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  onSetReactAt: (key: ReactKey | null) => void;
  onReact: (reaction: string) => void;
  /** The newest bubble slides up. */
  isLast?: boolean;
  /** "message" or "crew_message": what a report of this row is filed as; unset means it cannot be reported. */
  reportKind?: string;
}

/**
 * One bubble in a DM or crew thread: avatar and name for the other side, the text or photo, the
 * time, a reaction chip, and on long-press or right-click the reaction bar (with Report for a stored
 * message from someone else). The climber's own moderated message says so, with Appeal where that is
 * open. Core's own line, moved by script; only types were added.
 */
export default function MessageRow({m,avatarSrc,showName,reactKey,reactAt,reactTimer,onSetReactAt,onReact,isLast,reportKind}: MessageRowProps) {const canRep=!m||m.from==="me"?false:!!(reportKind&&isDbRowId(m._dbId)&&canReportContent());const modNote=m&&m.from==="me"&&m.moderation&&m.moderation!=="visible"?(m.moderation==="removed"?"Removed by ClimbMatch Safety — only you can see it":"Hidden while ClimbMatch Safety reviews it"):null;const mine=m.from==="me";const open=reactAt===reactKey;return <div className={isLast?"cm-slideup":undefined} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",gap:6,alignItems:"flex-end"}}>{!mine?<Av src={avatarSrc} size={showName?24:22}/>:null}<div style={{maxWidth:showName?"74%":undefined}}>{showName&&!mine?<div style={{fontSize:12,color:C.textMuted,marginBottom:2,marginLeft:4}}>{m.name}</div>:null}<div onContextMenu={e=>{e.preventDefault();onSetReactAt(reactKey);}} onTouchStart={()=>{reactTimer.current=setTimeout(function(){onSetReactAt(reactKey);},420);}} onTouchEnd={()=>clearTimeout(reactTimer.current)} onTouchMove={()=>clearTimeout(reactTimer.current)} style={{position:"relative",maxWidth:showName?undefined:"74%",padding:"8px 12px",borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",background:mine?C.blueSolid:C.card,color:mine?"white":C.text,fontSize:14,lineHeight:1.5,boxShadow:mine?"0 1px 2px rgba(47,129,247,0.35)":"0 1px 2px rgba(0,0,0,0.35)",border:mine?"none":`1px solid ${C.borderLight}`}}>{m.image?<img loading="lazy" decoding="async" src={m.image} alt={photoAlt(m.text,mine?"Photo you sent":"Photo sent in this chat")} style={{maxWidth:"170px",borderRadius:9,display:"block"}}/>:m.text}{m.ts?<div style={{fontSize:11,opacity:0.5,marginTop:3,textAlign:mine?"right":"left"}}>{relTime(m.ts)}</div>:null}{m.reaction?<span className="cm-pop" style={{position:"absolute",bottom:-9,right:mine?8:"auto",left:mine?"auto":8,fontSize:13,background:C.bg,borderRadius:9,padding:"0 3px",border:"1px solid "+C.border,lineHeight:1.4}}>{m.reaction}</span>:null}{open?createPortal(<div {...clickable(()=>onSetReactAt(null))} aria-label="Close reactions" style={{position:"fixed",inset:0,zIndex:55}}/>,document.body):null}{open?<div style={{position:"absolute",top:-40,right:mine?0:"auto",left:mine?"auto":0,zIndex:60,display:"flex",gap:3,background:C.card,border:"1px solid "+C.border,borderRadius:20,padding:"5px 8px",boxShadow:"0 4px 14px rgba(0,0,0,0.45)"}}>{["Nice","Haha","Love","Wow","Oof"].map(function(e,ei){return <button key={ei} onClick={()=>{onReact(e);onSetReactAt(null);}} style={{background:"none",border:"none",fontSize:11.5,fontWeight:700,color:C.textSub,cursor:"pointer",padding:"4px 7px",lineHeight:1}}>{e}</button>;})}{canRep?<button onClick={()=>{onSetReactAt(null);openContentReport({kind:reportKind,id:m._dbId,label:"this message"});}} style={{background:"none",border:"none",borderLeft:"1px solid "+C.border,fontSize:11.5,fontWeight:700,color:C.red,cursor:"pointer",padding:"4px 7px",lineHeight:1}}>Report</button>:null}</div>:null}</div>{modNote?<div style={{fontSize:11,color:C.amber,marginTop:3,textAlign:"right"}}>{modNote}{reportKind&&isDbRowId(m._dbId)?canAppeal()?<span {...clickable(()=>openAppeal({kind:reportKind,id:m._dbId,label:"this message"}))} style={{marginLeft:6,textDecoration:"underline",cursor:"pointer"}}>Appeal</span>:null:null}</div>:null}</div></div>;}
