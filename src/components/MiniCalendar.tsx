import { useState, type CSSProperties } from "react";
import { C, DLOCALE } from "../../ClimbMatchCore.jsx";

export interface MiniCalendarProps {
  /** The proposed days as local `YYYY-MM-DD` keys. */
  selected?: string[] | null;
  /** Fires with a day's key when it is tapped; the caller adds or removes it. */
  onToggle: (dayKey: string) => void;
}

/**
 * The month grid a crew proposes days on: ‹ › month nav (never before this month), today outlined, past days
 * disabled, picked days solid blue. Keys are LOCAL dates (not toISOString, which would shift a day across UTC).
 * Reads `DLOCALE` for the month label.
 */
export default function MiniCalendar({ selected, onToggle }: MiniCalendarProps) {
  const sel=new Set(selected||[]);
  const t0=new Date();const tY=t0.getFullYear(),tM=t0.getMonth(),tD=t0.getDate();
  const [vy,setVy]=useState(tY);const [vm,setVm]=useState(tM);
  const pad=(n: number)=>(n<10?"0":"")+n;const mk=(y: number,m: number,d: number)=>y+"-"+pad(m+1)+"-"+pad(d);
  const todayKey=mk(tY,tM,tD);
  const first=new Date(vy,vm,1);const startDow=first.getDay();const dim=new Date(vy,vm+1,0).getDate();
  const monthLabel=first.toLocaleDateString(DLOCALE,{month:"long",year:"numeric"});
  const cells: (number | null)[]=[];for(let i=0;i<startDow;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  const go=(delta: number)=>{let m=vm+delta,y=vy;if(m<0){m=11;y--;}if(m>11){m=0;y++;}setVm(m);setVy(y);};
  const atMin=vy<tY||(vy===tY&&vm<=tM);
  const navBtn: CSSProperties={background:C.surface,border:"1px solid "+C.border,color:C.text,borderRadius:8,width:36,height:36,fontSize:16,fontWeight:700,lineHeight:1};
  return <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 11px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}><button onClick={()=>go(-1)} disabled={atMin} aria-label="Previous month" style={Object.assign({},navBtn,{opacity:atMin?0.3:1,cursor:atMin?"default":"pointer"})}>‹</button><span style={{fontSize:13.5,fontWeight:800,color:C.text}}>{monthLabel}</span><button onClick={()=>go(1)} aria-label="Next month" style={Object.assign({},navBtn,{cursor:"pointer"})}>›</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>{["S","M","T","W","T","F","S"].map((w,wi)=><div key={wi} style={{textAlign:"center",fontSize:10.5,fontWeight:700,color:C.textMuted}}>{w}</div>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>{cells.map((d,ci)=>{if(!d)return <div key={ci} style={{height:34}}/>;const k=mk(vy,vm,d);const on=sel.has(k);const past=k<todayKey;const isToday=k===todayKey;return <button key={ci} disabled={past} onClick={()=>onToggle(k)} style={{height:34,border:on?"1px solid "+C.blue:isToday?"1px solid "+C.blueDim:"1px solid transparent",background:on?C.blueSolid:"transparent",color:on?"#fff":past?C.textMuted:C.text,borderRadius:8,fontSize:12.5,fontWeight:on?800:600,cursor:past?"default":"pointer",opacity:past?0.55:1,padding:0}}>{d}</button>;})}</div><div style={{fontSize:11,color:C.textMuted,marginTop:9,textAlign:"center",lineHeight:1.4}}>Tap days to propose — every day you pick stays highlighted</div></div>;
}
