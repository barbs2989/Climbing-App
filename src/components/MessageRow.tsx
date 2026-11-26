import { useState } from "react";
import { createPortal } from "react-dom";
import type { MutableRefObject } from "react";
import { C, chatText, parseFloatPlanText, photoAlt, relTime } from "../../ClimbMatchCore.jsx";
import { canAppeal, canReportContent, isDbRowId, openAppeal, openContentReport } from "../../lib/reportBus";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";
import FloatPlanCard from "./FloatPlanCard.tsx";
import ChatMediaViewer, { type ChatMedia } from "./ChatMediaViewer.tsx";
import { useChatVideoUrl } from "../../lib/db";

/** One chat message as the DM and crew threads hold it. */
export interface ChatMessage {
  /** "me" for the climber's own bubbles; anything else is the other side. */
  from?: string | null;
  name?: string | null;
  text?: string | null;
  /** A data URL or photo URL when the message is a photo. */
  image?: string | null;
  /** An object URL for a video this device just sent; it plays before (and whether or not) the upload lands. */
  video?: string | null;
  /** The stored video's path in the private chat-videos bucket (0539); played through a signed URL. */
  videoPath?: string | null;
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
  /** Crew threads: a float plan posted here draws as a card, and a crewmate's can be saved into your own plans with this. */
  onSaveFloatPlan?: (text: string) => void;
}

/**
 * One bubble in a DM or crew thread: avatar and name for the other side, the text or photo, the
 * time, a reaction chip, and on long-press or right-click the reaction bar (with Report for a stored
 * message from someone else). The climber's own moderated message says so, with Appeal where that is
 * open. Core's own line, moved by script; only types were added.
 */
export default function MessageRow({m,avatarSrc,showName,reactKey,reactAt,reactTimer,onSetReactAt,onReact,isLast,reportKind,onSaveFloatPlan}: MessageRowProps) {const [view,setView]=useState<ChatMedia | null>(null);const vq=useChatVideoUrl(m.video?null:m.videoPath);const vSrc=m.video||vq.data||null;const isVid=!!(m.video||m.videoPath);const fp=onSaveFloatPlan&&!m.image&&!isVid?parseFloatPlanText(m.text):null;const canRep=!m||m.from==="me"?false:!!(reportKind&&isDbRowId(m._dbId)&&canReportContent());const modNote=m&&m.from==="me"&&m.moderation&&m.moderation!=="visible"?(m.moderation==="removed"?"Removed by ClimbMatch Safety — only you can see it":"Hidden while ClimbMatch Safety reviews it"):null;const mine=m.from==="me";/* A float plan is a card in the thread's own card colours on BOTH sides — a blue bubble would put amber on blue — and gets more of the width, since it is a document rather than a line. */const fpBubble=fp?{width:280,maxWidth:"100%",boxSizing:"border-box" as const,background:C.card,color:C.text,border:`1px solid ${C.amber}`,boxShadow:"0 1px 2px rgba(0,0,0,0.35)",padding:"10px 12px"}:null;const open=reactAt===reactKey;return <div className={isLast?"cm-slideup":undefined} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",gap:6,alignItems:"flex-end"}}>{!mine?<Av src={avatarSrc} size={showName?24:22}/>:null}{/* The column caps the bubble's width and lets it SHRINK (minWidth:0): a flex item defaults to its longest unbreakable word, so a pasted URL used to push the bubble off its side of the thread and spill past it. */}<div style={{maxWidth:fp?"86%":"74%",minWidth:0}}>{showName&&!mine?<div style={{fontSize:12,color:C.textMuted,marginBottom:2,marginLeft:4}}>{m.name}</div>:null}<div onContextMenu={e=>{e.preventDefault();onSetReactAt(reactKey);}} onTouchStart={()=>{reactTimer.current=setTimeout(function(){onSetReactAt(reactKey);},420);}} onTouchEnd={()=>clearTimeout(reactTimer.current)} onTouchMove={()=>clearTimeout(reactTimer.current)} style={{position:"relative",overflowWrap:"anywhere",padding:"8px 12px",borderRadius:mine?"16px 16px 4px 16px":"16px 16px 16px 4px",background:mine?C.actionSolid:C.card,color:mine?"white":C.text,fontSize:14,lineHeight:1.5,boxShadow:mine?"0 1px 2px rgba(98,174,232,0.35)":"0 1px 2px rgba(0,0,0,0.35)",border:mine?"none":`1px solid ${C.borderLight}`,...(fpBubble||{})}}>{fp?<FloatPlanCard plan={fp} mine={mine} onSave={onSaveFloatPlan?()=>onSaveFloatPlan(m.text||""):undefined}/>:isVid?(vSrc?<div {...clickable(()=>setView({kind:"video",src:vSrc,alt:m.text,by:mine?"You":(m.name||null)}))} aria-label={"Play video"+(m.text?": "+m.text:"")} style={{position:"relative",cursor:"pointer",lineHeight:0}}><video src={vSrc+"#t=0.1"} preload="metadata" muted playsInline aria-hidden="true" tabIndex={-1} style={{maxWidth:"170px",maxHeight:240,borderRadius:9,display:"block",background:"#000",pointerEvents:"none"}}/><span aria-hidden="true" style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:44,height:44,borderRadius:22,background:"rgba(0,0,0,0.6)",border:"1.5px solid rgba(255,255,255,0.85)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="18" height="18" viewBox="0 0 18 18" style={{marginLeft:3}}><path d="M4 2 L16 9 L4 16 Z" fill="#fff"/></svg></span></div>:<div style={{width:170,height:110,borderRadius:9,background:"#000",color:"#fff",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",padding:8,boxSizing:"border-box"}}>{vq.isError?"This video could not be loaded":"Loading video…"}</div>):m.image?<img loading="lazy" decoding="async" src={m.image} alt={photoAlt(m.text,mine?"Photo you sent":"Photo sent in this chat")} {...clickable(()=>setView({kind:"image",src:m.image||"",alt:m.text,by:mine?"You":(m.name||null)}))} aria-label={"Open photo full screen"+(m.text?": "+m.text:"")} style={{maxWidth:"170px",borderRadius:9,display:"block",cursor:"zoom-in"}}/>:chatText(m.text)}{isVid&&m.text?<div style={{marginTop:5,overflowWrap:"anywhere"}}>{m.text}</div>:null}{view?<ChatMediaViewer media={view} onClose={()=>setView(null)}/>:null}{m.ts?<div style={{fontSize:11,opacity:0.5,marginTop:3,textAlign:mine?"right":"left"}}>{relTime(m.ts)}</div>:null}{m.reaction?<span className="cm-pop" style={{position:"absolute",bottom:-9,right:mine?8:"auto",left:mine?"auto":8,fontSize:13,background:C.bg,borderRadius:9,padding:"0 3px",border:"1px solid "+C.border,lineHeight:1.4}}>{m.reaction}</span>:null}{open?createPortal(<div {...clickable(()=>onSetReactAt(null))} aria-label="Close reactions" style={{position:"fixed",inset:0,zIndex:55}}/>,document.body):null}{open?<div style={{position:"absolute",top:-40,right:mine?0:"auto",left:mine?"auto":0,zIndex:60,display:"flex",gap:3,background:C.card,border:"1px solid "+C.border,borderRadius:20,padding:"5px 8px",boxShadow:"0 4px 14px rgba(0,0,0,0.45)"}}>{["Nice","Haha","Love","Wow","Oof"].map(function(e,ei){return <button key={ei} onClick={()=>{onReact(e);onSetReactAt(null);}} style={{background:"none",border:"none",fontSize:11.5,fontWeight:700,color:C.textSub,cursor:"pointer",padding:"4px 7px",lineHeight:1}}>{e}</button>;})}{canRep?<button onClick={()=>{onSetReactAt(null);openContentReport({kind:reportKind,id:m._dbId,label:"this message"});}} style={{background:"none",border:"none",borderLeft:"1px solid "+C.border,fontSize:11.5,fontWeight:700,color:C.red,cursor:"pointer",padding:"4px 7px",lineHeight:1}}>Report</button>:null}</div>:null}</div>{modNote?<div style={{fontSize:11,color:C.amber,marginTop:3,textAlign:"right"}}>{modNote}{reportKind&&isDbRowId(m._dbId)?canAppeal()?<span {...clickable(()=>openAppeal({kind:reportKind,id:m._dbId,label:"this message"}))} style={{marginLeft:6,textDecoration:"underline",cursor:"pointer"}}>Appeal</span>:null:null}</div>:null}</div></div>;}
