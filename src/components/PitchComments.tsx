import { useState } from "react";
import CardHead from "./CardHead.tsx";
import { C, ME, CLIMBERS, ago } from "../../ClimbMatchCore.jsx";
import Chevron from "./Chevron.tsx";
import ClampText from "./ClampText.tsx";
import { BTN_SM } from "../../lib/buttonStyles.js";

/* MANY COMMENTS ON A PITCH: the newest three show, and "Show N earlier comments" opens the rest (owner's note, 2026-10-25:
   "if many ppl comment on the pitch … a dropdown to read more"). The list is still counted in full in its heading. */
/** A comment on a pitch (or any other target), as the comments store holds it. */
export interface PitchComment {
  id?: string | number;
  targetId: string;
  parentId?: string | number | null;
  /** 0 is the signed-in climber. */
  userId?: number | string | null;
  name?: string | null;
  ts: string | number;
  text: string;
}
export interface PitchCommentsProps {
  /** Which pitch the comments are on, e.g. `${routeId}_pitch_${label}`. */
  targetId: string;
  comments?: PitchComment[] | null;
  /** The comments could not be loaded (as opposed to there being none). */
  commentsUnavailable?: boolean;
  /** Posts a comment; none when signed out. */
  onAdd?: ((targetId: string, text: string) => void) | null;
  title?: string;
}
const PITCH_COMMENTS_SHOWN=3;
/* Moved verbatim from RouteDetail.jsx (PR57); only the types were added. */
export default function PitchComments({targetId,comments,commentsUnavailable,onAdd,title="Pitch comments"}: PitchCommentsProps){
  const list=(comments||[]).filter(c=>c.targetId===targetId&&!c.parentId).slice().sort((a,b)=>new Date(a.ts).getTime()-new Date(b.ts).getTime());
  const [txt,setTxt]=useState("");const [allOpen,setAllOpen]=useState(false);
  const add=()=>{const t=txt.trim();if(!t)return;if(onAdd)onAdd(targetId,t);setTxt("");};
  const collapsible=list.length>PITCH_COMMENTS_SHOWN;const shown=(!collapsible||allOpen)?list:list.slice(list.length-PITCH_COMMENTS_SHOWN);const earlier=list.length-shown.length;
  return <div style={{marginTop:10}}><CardHead style={{marginBottom:8}}>{title+(list.length?" · "+list.length:"")}</CardHead>{list.length?<>{earlier>0?<button onClick={function(){setAllOpen(true);}} aria-expanded={false} style={{minHeight:44,background:"none",border:"none",padding:"2px 0 6px",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>{"Show "+earlier+" earlier comment"+(earlier===1?"":"s")}<Chevron open={false} size={14} color={C.blue}/></button>:null}{shown.map((c,i)=><div key={c.id||i} style={{background:C.surface,borderRadius:8,padding:"8px 10px",marginBottom:6}}><div style={{fontSize:11.5,fontWeight:700,color:C.text}}>{(c.userId===0?ME:CLIMBERS.find(x=>x.id===c.userId)||{name:c.name||"Climber"}).name}<span style={{fontSize:11.5,color:C.textMuted,fontWeight:400,marginLeft:6}}>{ago(c.ts)}</span></div><ClampText text={c.text} style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:2}}/></div>)}{collapsible&&allOpen?<button onClick={function(){setAllOpen(false);}} aria-expanded={true} style={{minHeight:44,background:"none",border:"none",padding:"2px 0 6px",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}>Show fewer<Chevron open={true} size={14} color={C.blue}/></button>:null}</>:<div style={{fontSize:11.5,color:C.textMuted,marginBottom:7}}>{commentsUnavailable?"Couldn’t load the comments on this pitch — beta may already be here, so do not read this as none.":"No comments yet — be the first to add beta for this exact pitch."}</div>}{/* Signed out there is no `onAdd`: a guest's comment was kept in this tab only, shown as posted and lost on refresh. Say so instead, as the pitch's Photos box does. */}{onAdd?<div style={{display:"flex",gap:6,marginTop:2}}><input value={txt} onChange={e=>setTxt(e.target.value)} aria-label="Add a pitch comment" placeholder="Add a comment on this pitch…" style={{flex:1,minWidth:0,padding:"7px 9px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:12,boxSizing:"border-box",outline:"none"}}/><button onClick={add} style={{...BTN_SM,border:"none",background:C.blueSolid,color:C.onSolid,flexShrink:0}}>Post</button></div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>Sign in to add a comment.</div>}</div>;
}
