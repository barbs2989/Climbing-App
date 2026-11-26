import { monthRank, seasonWindowMonths, MONTH_ABBR } from "../../lib/seasonWindow.js";
import { monthsLabel } from "../../lib/areaFields.js";
import EmptyPanel from "./EmptyPanel.tsx";
import Head from "./Head.tsx";
import EditIconButton from "./EditIconButton.tsx";
import ClimateRows, { hasClimate } from "./ClimateSeasonCard.tsx";
import type { Climate } from "./ClimateSeasonCard.tsx";
import { blueOnBlue } from "../../lib/contrast.js";
import { climbNoun } from "../../lib/discLabels.js";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type ActionIconType from "./ActionIcon.tsx";

export interface SeasonalGuidancePanelMonth { status: string; reason?: string }
/** The route's area as the route reads it: its own researched months (1-12), else the nearest ancestor's. */
export interface SeasonArea { areaType?: string | null; seasonMonths?: number[] | null; ancestorSeasonMonths?: number[] | null }
export interface SeasonalGuidancePanelProps {
  route: { /** bouldering calls its line a PROBLEM (lib/discLabels climbNoun) */ discipline?: string | null; season?: string | null; seasonalGuidance?: { optimalWindow?: string | null; monthBreakdown?: Record<string, SeasonalGuidancePanelMonth> | null } | null; climate?: Climate | null; _dbArea?: SeasonArea | null };
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
  /** Opens the form to add the best season; absent hides the empty-state prompt. */
  onAdd?: () => void;
  /** The pencil on the SEASON heading (the season window: the route's own, or its crag's). */
  onEdit?: (() => void) | null;
  /** The pencil on the Climate part. */
  onEditClimate?: (() => void) | null;
}

/* SEASON — ONE section for when this climb is in (owner note, 2026-11-25: "season is redundant in some sections
   on conditions tab ... can we combine"). The Conditions tab used to say it three times over: SEASONAL GUIDANCE
   (the window and a month calendar), a Season row in ROCK & SEASON (the route's season, or its crag's), and
   CLIMATE & SEASON (the typical weather per season), each with its own empty note. theCrag and 27 Crags state a
   crag's season once, as one chart with its words; so does this: the window, the month calendar, the months'
   reasons, then the climate. The forecast-based chart in the score card is the climber's OWN best months
   (their temperature range), titled "Climate by month" so it does not read as a fourth season. */
export default function SeasonalGuidancePanel({route, C, ActionIcon, onAdd, onEdit, onEditClimate}: SeasonalGuidancePanelProps) {
  const LBL={fontSize:10,fontWeight:800,color:C.label,textTransform:"uppercase",letterSpacing:0.6}; /* = core's SUB_LABEL, from this panel's own C prop */
  const {optimalWindow, monthBreakdown} = route.seasonalGuidance || {};
  const sortedMonths = monthBreakdown ? Object.entries(monthBreakdown).sort((a,b)=>monthRank(a[0])-monthRank(b[0])) : [];
  const own = String(route.season||"").trim();
  /* A route with no season of its own takes its area's (lib/seasonText.js routeSeasonShort's rule): an ice or mixed
     line never does, as an area's season is researched for its rock. */
  const ar = route._dbArea || null;
  const arMonths = !own && ar && !/^(ice|mixed)$/.test(route.discipline||"") ? ((ar.seasonMonths&&ar.seasonMonths.length)?ar.seasonMonths:(ar.ancestorSeasonMonths||null)) : null;
  const arLabel = monthsLabel(arMonths);
  const arNoun = ar && ar.seasonMonths && ar.seasonMonths.length && ["crag","wall","peak"].includes(String(ar.areaType)) ? "the "+ar.areaType+"'s season" : "the area's season";
  // With no researched breakdown the calendar comes from the route's own season window, else its area's months.
  const win = sortedMonths.length ? null : seasonWindowMonths(own) || (arLabel ? {months:(arMonths as number[]).map(Number).filter(m=>m>=1&&m<=12).map(m=>m-1), partial:[] as number[]} : null);
  const cl = route.climate && typeof route.climate === "object" ? route.climate : null;
  const climate = cl && hasClimate(cl) ? <ClimateRows climate={cl}/> : null;
  // Empty: one placeholder a climber can fill, when the caller can open the form (onAdd); otherwise nothing.
  if (!optimalWindow && !sortedMonths.length && !win && !own && !climate) return onAdd ? <EmptyPanel C={C} ActionIcon={ActionIcon} icon="calendar" title="SEASON" what="No season information for this climb yet" cta="Add the season" onAdd={onAdd}/> : null;
  const colors: Record<string, string[]> ={optimal:[C.green,C.greenBg],good:[C.blue,C.blueBg],marginal:[C.amber,C.amberBg],risky:[C.red,C.redBg]};
  const byIdx: Record<number, SeasonalGuidancePanelMonth> = {};sortedMonths.forEach(([month,info])=>{const i=monthRank(month);if(i<12&&info)byIdx[i]=info;});
  // One 12-month calendar on every panel that has month-level data, so the section has the same
  // shape on every route. Each cell carries its status as a WORD, not only a colour.
  const cells = sortedMonths.length ? MONTH_ABBR.map((mn,i)=>{const info=byIdx[i];if(!info)return [mn,"—",C.textMuted,C.surface];const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return [mn,info.status||"—",col,bg];})
    : win ? MONTH_ABBR.map((mn,i)=>win.months.includes(i)?(win.partial.includes(i)?[mn,"part",C.green,C.surface]:[mn,"in season",C.green,C.greenBg]):[mn,"off",C.textMuted,C.surface]) : null;
  // Each month carries {status, reason}; the calendar carries the status, the reasons are listed under it.
  const reasons = sortedMonths.filter(([,info])=>info&&info.reason);
  // The season in words: the route's own text whole, else its area's months, saying whose they are.
  const seasonLine = own ? own : arLabel ? arLabel+" ("+arNoun+")" : "";
  const noun = climbNoun(route);
  return <div id="seasonal-guidance" style={{scrollMarginTop:"80px",background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><Head C={C} style={{marginBottom:0}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name="calendar" size={14} color={C.text}/>SEASON</span></Head>{onEdit?<EditIconButton onClick={onEdit} title="Edit the season"/>:null}</div>{seasonLine?<div style={{fontSize:13,color:C.text,lineHeight:1.5,marginBottom:10}}>{seasonLine}</div>:null}{optimalWindow?<div style={{background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"10px 12px",marginBottom:12}}><div style={{...LBL,marginBottom:3,color:C.green}}>Optimal window</div><div style={{fontSize:13,color:C.text}}>{optimalWindow}</div></div>:null}{cells?<div role="list" aria-label="Month by month" style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:5,marginBottom:reasons.length||(win&&!seasonLine)?10:0}}>{cells.map(([mn,word,col,bg])=><div key={mn} role="listitem" style={{background:bg,border:"1px solid "+col+"55",borderRadius:7,padding:"5px 2px",textAlign:"center",minWidth:0}}><div style={{fontSize:11.5,fontWeight:700,color:blueOnBlue(col,bg,C.card)?"#fff":col}}>{mn}</div><div style={{fontSize:9.5,color:C.textSub,overflowWrap:"anywhere"}}>{word}</div></div>)}</div>:null}{sortedMonths.length===0&&win&&!seasonLine?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>{"No month-by-month notes for this "+noun+" yet."}</div>:null}{reasons.length?<div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>{reasons.map(([month,info])=>{const [col,bg]=colors[info.status]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:9,padding:"8px 10px"}}><div style={{display:"flex",alignItems:"baseline",gap:7}}><div style={{fontSize:12,fontWeight:700,color:blueOnBlue(col,bg,C.card)?"#fff":col}}>{month}</div><div style={{fontSize:11,color:C.textSub}}>{info.status}</div></div><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:4}}>{info.reason}</div></div>;})}</div>:null}{climate?<div style={{marginTop:(seasonLine||cells||optimalWindow)?14:0,paddingTop:(seasonLine||cells||optimalWindow)?12:0,borderTop:(seasonLine||cells||optimalWindow)?"1px solid "+C.borderLight:"none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={LBL}>Climate</div>{onEditClimate?<EditIconButton onClick={onEditClimate} title="Edit climate and season"/>:null}</div>{climate}</div>:null}</div>;
}
