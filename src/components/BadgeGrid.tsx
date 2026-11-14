import { useState } from "react";
import { C, shortDate } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";

/** One badge as `trophies()` builds it: earned or not, with its progress toward a threshold when it has one. */
export interface Badge {
  key: string;
  label: string;
  /** What it was for, read on tap. */
  desc: string;
  icon: string;
  /** Its colour when earned (default `C.blue`). */
  col?: string | null;
  got?: boolean;
  /** Progress toward `tgt` for a locked badge with a threshold. */
  cur: number;
  tgt?: number | null;
  /** The day it was earned. */
  on?: string | null;
}

export interface BadgeGridProps {
  badges: Badge[];
}

/* Tap a badge to read what it was for -- a hover title never reaches a phone. A locked badge with a threshold shows how far along you are. */
export default function BadgeGrid({badges}: BadgeGridProps){
  const [sel,setSel]=useState<string | null>(null);const s=badges.find(b=>b.key===sel);
  return <div><div style={{display:"flex",gap:"11px 8px",flexWrap:"wrap"}}>{badges.map(b=>{const col=b.col||C.blue;const prog=!b.got&&b.tgt?Math.min(b.cur,b.tgt)+" / "+b.tgt:null;return <button key={b.key} onClick={()=>setSel(sel===b.key?null:b.key)} aria-expanded={sel===b.key} aria-label={b.label+(b.got?", earned":", not earned yet"+(prog?", "+Math.min(b.cur,b.tgt||0)+" of "+b.tgt:""))} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:64,padding:0,background:"none",border:"none",cursor:"pointer",opacity:b.got?1:0.4}}><div style={{width:46,height:46,borderRadius:23,background:b.got?col+"22":C.surface,border:`1px solid ${b.got?col:C.border}`,boxShadow:sel===b.key?"0 0 0 2px "+col:"none",display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name={b.icon} size={21} color={b.got?col:C.textMuted}/></div><span style={{fontSize:12,color:b.got?C.text:C.textMuted,textAlign:"center",lineHeight:1.2,fontWeight:600}}>{b.label}</span>{prog?<span style={{fontSize:11,color:C.textMuted,marginTop:-3}}>{prog}</span>:null}</button>;})}</div>
    {s?<div style={{marginTop:11,background:C.card,border:"1px solid "+(s.got?(s.col||C.blue):C.border),borderRadius:10,padding:"9px 12px",fontSize:12.5,color:C.textSub,lineHeight:1.45}}><span style={{color:C.text,fontWeight:700}}>{s.label}</span>{" — "+s.desc+"."}{s.got?<span style={{color:s.col||C.blue,fontWeight:700}}>{" ✓ Earned"+(s.on?" "+shortDate(s.on):"")}</span>:null}</div>:null}</div>;
}
