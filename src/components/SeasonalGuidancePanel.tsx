import { monthRank, seasonWindowMonths, MONTH_ABBR } from "../../lib/seasonWindow.js";
import EmptyPanel from "./EmptyPanel.tsx";
import Head from "./Head.tsx";
import { blueOnBlue } from "../../lib/contrast.js";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type ActionIconType from "./ActionIcon.tsx";

export interface SeasonalGuidancePanelMonth { status: string; reason?: string }
export interface SeasonalGuidancePanelProps {
  route: { season?: string | null; seasonalGuidance?: { optimalWindow?: string | null; monthBreakdown?: Record<string, SeasonalGuidancePanelMonth> | null } | null };
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
  /** Opens the form to add the best season; absent hides the empty-state prompt. */
  onAdd?: () => void;
}

export default function SeasonalGuidancePanel({route, C, ActionIcon, onAdd}: SeasonalGuidancePanelProps) {
  const LBL={fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.6}; /* = core's SUB_LABEL, from this panel's own C prop */
  const {optimalWindow, monthBreakdown} = route.seasonalGuidance || {};
  const sortedMonths = monthBreakdown ? Object.entries(monthBreakdown).sort((a,b)=>monthRank(a[0])-monthRank(b[0])) : [];
  // With no researched breakdown the calendar comes from the route's own season window, and says so.
  const win = sortedMonths.length ? null : seasonWindowMonths(route.season);
  // Empty: a placeholder a climber can fill, when the caller can open the form (onAdd); otherwise nothing.
  if (!optimalWindow && !sortedMonths.length && !win) return onAdd ? <EmptyPanel C={C} ActionIcon={ActionIcon} icon="calendar" title="SEASONAL GUIDANCE" what="No season information for this climb yet" cta="Add the best season" onAdd={onAdd}/> : null;
  const colors: Record<string, string[]> ={optimal:[C.green,C.greenBg],good:[C.blue,C.blueBg],marginal:[C.amber,C.amberBg],risky:[C.red,C.redBg]};
  const byIdx: Record<number, SeasonalGuidancePanelMonth> = {};sortedMonths.forEach(([month,info])=>{const i=monthRank(month);if(i<12&&info)byIdx[i]=info;});
  // One 12-month calendar on every panel that has month-level data, so the section has the same
  // shape on every route. Each cell carries its status as a WORD, not only a colour.
  const cells = sortedMonths.length ? MONTH_ABBR.map((mn,i)=>{const info=byIdx[i];if(!info)return [mn,"—",C.textMuted,C.surface];const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return [mn,info.status||"—",col,bg];})
    : win ? MONTH_ABBR.map((mn,i)=>win.months.includes(i)?(win.partial.includes(i)?[mn,"part",C.green,C.surface]:[mn,"in season",C.green,C.greenBg]):[mn,"off",C.textMuted,C.surface]) : null;
  // Each month carries {status, reason} and only `status` was ever printed, so a tile read
  // "July / good" — a verdict with its justification sitting unused in the same object, on 501
  // routes. The calendar now carries the status; the reasons are listed under it.
  const reasons = sortedMonths.filter(([,info])=>info&&info.reason);
  return <div id="seasonal-guidance" style={{scrollMarginTop:"80px",background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><Head C={C} style={{marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name="calendar" size={14} color={C.text}/>SEASONAL GUIDANCE</span></Head>{optimalWindow?<div style={{background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"10px 12px",marginBottom:12}}><div style={{...LBL,marginBottom:3,color:C.green}}>Optimal window</div><div style={{fontSize:13,color:C.text}}>{optimalWindow}</div></div>:null}{cells?<div role="list" aria-label="Month by month" style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:5,marginBottom:reasons.length||win?10:0}}>{cells.map(([mn,word,col,bg])=><div key={mn} role="listitem" style={{background:bg,border:"1px solid "+col+"55",borderRadius:7,padding:"5px 2px",textAlign:"center",minWidth:0}}><div style={{fontSize:11.5,fontWeight:700,color:blueOnBlue(col,bg,C.card)?"#fff":col}}>{mn}</div><div style={{fontSize:9.5,color:C.textSub,overflowWrap:"anywhere"}}>{word}</div></div>)}</div>:null}{win?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>{"From this route's season ("+String(route.season).split(/[(;]/)[0].trim().replace(/[,.]$/,"")+"). No month-by-month notes for this route yet."}</div>:null}{reasons.length?<div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>{reasons.map(([month,info])=>{const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:9,padding:"8px 10px"}}><div style={{display:"flex",alignItems:"baseline",gap:7}}><div style={{fontSize:12,fontWeight:700,color:blueOnBlue(col,bg,C.card)?"#fff":col}}>{month}</div><div style={{fontSize:11,color:C.textSub}}>{info.status}</div></div><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:4}}>{info.reason}</div></div>;})}</div>:null}</div>;
}
