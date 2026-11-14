import { routeKw } from "../../lib/routeKw.js";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { getAvailableItineraries, itinDaysToDraft, blankItinDay, itinDraftToStructured, C, RSL as SL, catOf, ROUTE_GAP, uElev, uDistMi, uMass, SUB_LABEL, shareOrCopy, itinShareText, printSheet, itinSheetHtml, shortDate, hoursNum } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { seasonShort, seasonTidy } from "../../lib/seasonText.js";
import { BTN } from "../../lib/buttonStyles.js";
import ItineraryEditor from "./ItineraryEditor.tsx";
import type { Itinerary } from "./ItineraryEditor.tsx";
import Chevron from "./Chevron.tsx";
import ActionIcon from "./ActionIcon.tsx";

/* TRIP PLAN, the day-by-day plan on the Plan tab (owner note 2026-11-11: "make the whole trip plan
   better ui"). The layout, top to bottom:

     · AT A GLANCE: the day count, the trip totals (gain, loss, distance, moving time) as labelled
       tiles, and the plan's own one-sentence summary. The totals used to sit at the BOTTOM, under
       every day, and the summary was one of four grey paragraphs above the first day.
     · The trust chips (confidence, trip reports, season) and the planning note (`cal`) as one
       "Before you go" row with its icon, not loose text.
     · One card per day with a DAY N tag in its header. The 30px number rail beside each card was
       dropped: it cost 40px of a ~330px phone column and is what forced the stat pills to shrink.
       The stats are now a labelled grid (GAIN / LOSS / TIME / DISTANCE / PACK) — the pills were
       bare numbers, so "38 lb" or "6" read as nothing in particular. A figure the plan does not
       have is a dash in its tile, and a day with no figures at all says so with an Add link, so
       missing data is visible instead of silently leaving the row empty.
     · The hour-by-hour schedule folds behind a 44px toggle that names its first and last stop; a
       summit day's schedule was up to nine rows, always open, between one day and the next.
     · A prose plan ("Day 1: …; Day 2: …") is drawn with the SAME day cards.
     · My itinerary: each saved day is a row with its tag and title and the same figures. */

function splitItineraryDays(text: string | null | undefined): {days: {n: number; text: string}[]; multi: boolean}{
  if(!text)return {days:[],multi:false};
  const re=/\bDay\s+(\d+)\s*(?:of\s*\d+)?\s*[:—\-)]\s*/gi;
  const marks=[];let m;
  while((m=re.exec(text))){marks.push({idx:m.index,end:re.lastIndex,n:parseInt(m[1],10)});}
  if(!marks.length)return {days:[{n:1,text:text.trim()}],multi:false};
  const out=[];
  for(let i=0;i<marks.length;i++){
    const start=marks[i].end;const end=(i+1<marks.length)?marks[i+1].idx:text.length;
    const seg=text.slice(start,end).trim().replace(/^[;,.\s]+/,"").replace(/[;,.\s]+$/,"");
    if(seg)out.push({n:marks[i].n,text:seg});
  }
  return {days:out.length?out:[{n:1,text:text.trim()}],multi:out.length>1};
}
function splitItinerarySteps(text: string){return text.split(/;\s+/).map((s: string)=>s.trim()).filter(Boolean);}

/** One day of a stored itinerary (figures are numbers once saved). */
interface StoredDay {
  n?: number;
  title?: string | null;
  objective?: string | null;
  gainFt?: number | null;
  lossFt?: number | null;
  hours?: number | string | null;
  miles?: number | null;
  packLb?: number | null;
  note?: string | null;
  schedule?: { time?: string | null; label: string; detail?: string | null }[] | null;
}
/** A structured itinerary: its days, the note it carries, and what is left of its calendar line. */
interface StoredItin {
  days?: StoredDay[] | null;
  cal?: string | null;
  totalNote?: string | null;
}

export interface ItineraryViewProps {
  /** The route; its itinerary is a structured plan on most rows and a prose string on some. */
  route: {
    name: string;
    itinerary?: StoredItin | string | null;
    activity?: { date?: string | null }[] | null;
    season?: string | null;
    seasonalGuidance?: unknown;
    bestSeason?: string | null;
  };
  /** The merged trip reports; none means the route's own. */
  activity?: { date?: string | null }[] | null;
  /** Jumps to the trip reports. */
  onSeeReports?: (() => void) | null;
  /** Jumps to the month-by-month guide. */
  onSeeSeason?: (() => void) | null;
  /** The guide lives on the Conditions tab (so the chip says so). */
  seasonOnConditions?: boolean;
  /** Opens the contribute form on the itinerary field. */
  onContribute?: (() => void) | null;
  /** The climber's own plan for this route. */
  myItin?: StoredItin | null;
  /** Saves the climber's own plan; none hides the builder. */
  onSaveMyItin?: ((itin: StoredItin) => void) | null;
  /** The climber's crews on this route, for "Share with crew". */
  crewsForRoute?: { id: string | number; date?: string | null }[] | null;
  /** Posts the plan to a crew's chat. */
  onShareItinToCrew?: ((crewId: string | number, itin: StoredItin) => void) | null;
  /** Shows a toast. */
  notify?: ((msg: string) => void) | null;
}

const cap=(s: string)=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const has=(v: unknown)=>v!=null&&v!==""&&!(typeof v==="number"&&isNaN(v));
// " hr" only after a bare number or range ("6", "8-9"); "45 min" or "6 hr" are shown as stored.
const fmtHrs=(h: number|string|null|undefined)=>{if(!has(h))return null;const s=String(h).trim();return /^[~≈]?\d+(\.\d+)?(\s*[-–]\s*\d+(\.\d+)?)?\+?$/.test(s)?s+" hr":s;};
const CARD: CSSProperties={background:C.card,border:"1px solid "+C.border,borderRadius:12};

/** A labelled figure: a small caps label over its value; a missing value is a muted dash. */
function Tile({label,value,color,big}: {label: string; value: string|null; color?: string; big?: boolean}){
  return <div style={{flex:"1 1 0",minWidth:0,background:C.surface,borderRadius:9,padding:big?"8px 6px 9px":"6px 4px 7px",textAlign:"center"}}>
    <div style={{...SUB_LABEL,fontSize:9.5,letterSpacing:0.3,lineHeight:1.25,marginBottom:2,overflowWrap:"anywhere"}}>{label}</div>
    <div style={{fontSize:big?14.5:12.5,fontWeight:700,lineHeight:1.25,color:value==null?C.textMuted:(color||C.text),overflowWrap:"anywhere"}}>{value==null?"—":value}</div>
  </div>;
}

/** The DAY N tag at the head of a day card. */
function DayTag({n}: {n: number}){return <span style={{flexShrink:0,fontSize:10.5,fontWeight:800,letterSpacing:0.6,color:C.blue,background:C.blueChip,border:"1px solid "+C.blueDim,borderRadius:6,padding:"3px 7px",lineHeight:1.2}}>{"DAY "+n}</span>;}

/** A day's hour-by-hour schedule, folded behind a toggle that names its first and last stop. */
function ScheduleFold({schedule}: {schedule: NonNullable<StoredDay["schedule"]>}){
  const [open,setOpen]=useState(false);
  const first=schedule[0],last=schedule[schedule.length-1];
  const span=first&&first.time&&last&&last.time&&schedule.length>1?first.time+" to "+last.time:null;
  return <div style={{marginTop:10,borderTop:"1px solid "+C.border,paddingTop:2}}>
    <button onClick={()=>setOpen(!open)} aria-expanded={open} style={{minHeight:44,width:"100%",display:"flex",alignItems:"center",gap:8,padding:0,background:"transparent",border:"none",color:C.text,cursor:"pointer",textAlign:"left"}}>
      <span style={{flex:1,minWidth:0}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>Hour by hour</span><span style={{fontSize:11.5,color:C.textMuted}}>{" · "+schedule.length+(schedule.length===1?" stop":" stops")+(span?" · "+span:"")}</span></span>
      <Chevron open={open} size={16} color={C.blue}/>
    </button>
    <div hidden={!open} style={{paddingTop:4,paddingBottom:2}}>{schedule.map((st,si: number)=><div key={si} style={{display:"flex",gap:10,alignItems:"stretch"}}>
      <span style={{flexShrink:0,width:66,fontSize:11.5,fontWeight:700,color:st.time?C.text:C.textMuted,lineHeight:1.35,paddingTop:1,textAlign:"right",wordBreak:"break-word"}}>{st.time||""}</span>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:10}}><span style={{width:8,height:8,borderRadius:4,marginTop:4,background:si===schedule.length-1?C.green:C.blue}}/>{si<schedule.length-1?<span style={{flex:1,width:2,background:C.border,marginTop:2}}/>:null}</div>
      <div style={{flex:1,minWidth:0,paddingBottom:si<schedule.length-1?10:0}}><div style={{fontSize:12.5,color:C.text,lineHeight:1.4,fontWeight:600}}>{st.label}</div>{st.detail?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:2}}>{st.detail}</div>:null}</div>
    </div>)}</div>
  </div>;
}

/** One day of the plan. `steps` is a prose day split at its semicolons. */
function DayCard({n,title,objective,figures,note,steps,schedule,onContribute}: {n: number; title?: string|null; objective?: string|null; figures: StoredDay|null; note?: string|null; steps?: string[]|null; schedule?: StoredDay["schedule"]; onContribute?: (() => void) | null}){
  const f=figures;
  const anyFig=!!f&&[f.gainFt,f.lossFt,f.hours,f.miles,f.packLb].some(has);
  // A spare / weather day stores zeros, which is data ("no travel"), not a gap; five tiles of 0 and dashes said nothing.
  // Rest day: at least one travel figure is STORED as 0 and none is above 0. A day with only a pack weight is missing data, not rest (review, 2026-11-11).
  const travel=f?[f.gainFt,f.lossFt,f.hours,f.miles].filter(has):[];
  const restDay=travel.length>0&&travel.every(v=>Number(v)===0);
  return <div style={{...CARD,borderLeft:"3px solid "+C.blue,padding:"11px 13px 12px",marginBottom:ROUTE_GAP}}>
    <div style={{display:"flex",alignItems:"flex-start",gap:9,marginBottom:objective?4:9}}><DayTag n={n}/>{title?<div style={{fontSize:14,fontWeight:700,lineHeight:1.3,minWidth:0}}>{title}</div>:null}</div>
    {objective?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginBottom:9}}><span style={{color:C.textMuted,fontWeight:700}}>Goal: </span>{objective}</div>:null}
    {restDay?<div style={{fontSize:11.5,color:C.textMuted,background:C.surface,borderRadius:9,padding:"7px 10px",marginBottom:(note||steps)?9:0}}>No travel planned this day.</div>:f&&anyFig?<div style={{display:"flex",gap:4,marginBottom:(note||steps)?9:0}}>
      <Tile label="Gain" value={has(f.gainFt)?uElev(f.gainFt as number):null} color={C.green}/>
      <Tile label="Loss" value={has(f.lossFt)?uElev(f.lossFt as number):null} color={C.amber}/>
      <Tile label="Time" value={fmtHrs(f.hours)}/>
      <Tile label="Dist" value={has(f.miles)?uDistMi(f.miles as number):null}/>
      <Tile label="Pack" value={has(f.packLb)&&f.packLb?uMass(f.packLb as number):null} color={C.purple}/>
    </div>:f?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,fontSize:11.5,color:C.textMuted,background:C.surface,borderRadius:9,padding:"7px 10px",marginBottom:(note||steps)?9:0}}><span>No gain, time or distance on file for this day.</span>{onContribute?<button onClick={onContribute} style={{flexShrink:0,minHeight:32,background:"transparent",border:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",padding:"0 2px"}}>+ Add</button>:null}</div>:null}
    {steps&&steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{steps.map((s: string,si: number)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{cap(s)}</li>)}</ul>:note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{cap(note)}</div>:null}
    {schedule&&schedule.length?<ScheduleFold schedule={schedule}/>:null}
  </div>;
}

export default function ItineraryView({route,activity,onSeeReports,onSeeSeason,seasonOnConditions,onContribute,myItin,onSaveMyItin,crewsForRoute,onShareItinToCrew,notify}: ItineraryViewProps){
  const it=route.itinerary as StoredItin|null;const _acts=activity||route.activity||[];const k=routeKw(Object.assign({},route,{activity:_acts}));const repN=_acts.length;
  const [showBuilder,setShowBuilder]=useState(false);const [draft,setDraft]=useState<Itinerary|null>(null);const [pickCrew,setPickCrew]=useState(false);const [pickedKey,setPickedKey]=useState<string|null>(null);
  const avail=getAvailableItineraries(route);
  const startBuilder=function(seedItin: StoredItin|null){setDraft(seedItin?{days:itinDaysToDraft(seedItin.days)}:{days:[blankItinDay()]});setPickedKey(null);setShowBuilder(true);};
  const draftContentDays=function(){return (itinDraftToStructured(draft).days||[]).length;};
  // itinDraftToStructured drops contentless days, so an untouched builder yields zero
  // days. Saving that used to toast "Saved your plan — added to My Objectives", bump
  // the objectives count and store nothing. Refuse instead of reporting success.
  const saveDraft=function(){if(!draftContentDays())return;if(onSaveMyItin)onSaveMyItin(itinDraftToStructured(draft));setShowBuilder(false);setDraft(null);setPickedKey(null);};
  const days: StoredDay[]=(it&&it.days&&it.days.length)?it.days:[];const proseIt=(typeof it==="string"&&(it as string).trim())?(it as string).trim():null;
  const parsed=(!days.length&&proseIt)?splitItineraryDays(proseIt):{days:[],multi:false};
  const sum=(f: keyof StoredDay)=>days.reduce((a: number,d: StoredDay)=>a+(Number(d[f])||0),0);
  const totG=sum("gainFt"),totL=sum("lossFt"),totMi=sum("miles"),totH=days.reduce((a: number,d: StoredDay)=>a+hoursNum(d.hours),0);
  const dayN=days.length||(parsed.multi?parsed.days.length:0);
  const conf=k.confidence;const confC=conf==="High"?C.green:conf==="Medium"?C.amber:C.red;
  const flagged=k.hazards.filter(h=>!h.official&&h.count>=2).length;
  const peakish=!["trad","sport"].includes(catOf(route));
  const chip=(t: string,col: string,ic?: ReactNode)=><span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,color:col,background:col+"22",borderRadius:7,padding:"4px 8px"}}>{ic}{t}</span>;
  const hasPlan=!!(days.length||proseIt);
  // A plan object with a summary but no days still has something to say (review, 2026-11-11).
  const showSummary=hasPlan||!!(it&&it.totalNote);
  const hasMine=!!(myItin&&myItin.days&&myItin.days.length);
  // The chips (confidence, reports, season, month by month) were drawn on EVERY route before the
  // redesign, plan or not: they are the Plan tab's way to Reports and the season guide. They sit in the
  // at-a-glance card when there is one, and on their own above "No trip plan yet" when there is not.
  const chipRow=<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {chip(conf+" confidence",confC)}
        {repN?<span {...clickable(()=>onSeeReports&&onSeeReports())} style={{cursor:"pointer"}} title="Jump to trip reports">{chip(repN+(repN===1?" trip report":" trip reports")+" →",C.blue)}</span>:chip("0 trip reports",C.textMuted)}
        {route.season&&peakish?chip("Season: "+seasonShort(route.season),C.teal,<ActionIcon name="calendar" size={12} color={C.teal}/>):null}
        {/* The month-by-month guide, as a chip that GOES there (owner note 2026-10-28). */}
        {route.seasonalGuidance&&onSeeSeason&&peakish?<span {...clickable(onSeeSeason)} style={{cursor:"pointer"}} title="Open the month-by-month season guide">{chip(seasonOnConditions?"Month by month · Conditions tab →":"Month by month →",C.blue)}</span>:null}
      </div>;
  const seasonLong=route.season&&peakish&&seasonShort(route.season)!==seasonTidy(route.season)?route.season:null;
  const whenToGo=route.bestSeason&&!route.seasonalGuidance&&peakish?route.bestSeason:null;
  const caveat=<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginTop:2}}>Estimates for an average party. Adjust for your fitness and conditions, and check the latest <b style={{color:C.textSub}}>Reports</b> and <b style={{color:C.textSub}}>Safety</b> tabs.{flagged?<span style={{color:C.amber}}>{" Climbers have flagged "+flagged+" hazard"+(flagged!==1?"s":"")+" not in the official info. Check Safety before you commit."}</span>:null}</div>;
  return <div>
    <SL>Trip plan</SL>
    {showSummary?<div style={{...CARD,padding:"12px 13px",marginBottom:ROUTE_GAP}}>
      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
        <span style={{fontSize:20,fontWeight:800,color:C.text,lineHeight:1.1}}>{dayN?dayN+(dayN===1?" day":" days"):"Suggested plan"}</span>
        <span style={{fontSize:11.5,color:C.textMuted}}>{dayN===1?"car to car":dayN>1?"suggested itinerary":"how parties usually do it"}</span>
      </div>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:8}}>Based on how parties commonly climb it. Faster or slower parties, other camps or another order are all normal.</div>
      {it&&it.totalNote?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginBottom:10}}>{it.totalNote}</div>:null}
      {days.length&&(totG||totL||totMi||totH)?<div style={{display:"flex",gap:5,marginBottom:10}}>
        <Tile big label="Gain" value={totG?uElev(totG):null} color={C.green}/>
        <Tile big label="Loss" value={totL?uElev(totL):null} color={C.amber}/>
        <Tile big label="Distance" value={totMi?uDistMi(Math.round(totMi*10)/10):null}/>
        <Tile big label="Moving" value={totH?"~"+(Math.round(totH*10)/10)+" hr":null}/>
      </div>:null}
      {chipRow}
    </div>:<div style={{marginBottom:ROUTE_GAP}}>{chipRow}</div>}
    {/* "Before you go": the season sentence, When to go, and `cal` — what is left of the plan's note once its road and closure sentences moved to GETTING THERE (owner note 2026-10-28, scripts/oneoff/move-cal-road-notes.mjs). */}
    {(seasonLong||whenToGo||(it&&it.cal))?<div style={{display:"flex",gap:10,background:C.tealBg,border:"1px solid "+C.tealDim,borderRadius:12,padding:"10px 12px",marginBottom:ROUTE_GAP}}>
      <span style={{flexShrink:0,paddingTop:1}}><ActionIcon name="info" size={16} color={C.teal}/></span>
      <div style={{minWidth:0,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{...SUB_LABEL,color:C.teal}}>Before you go</div>
        {seasonLong?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{seasonLong}</div>:null}
        {whenToGo?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}><b style={{color:C.text}}>When to go: </b>{whenToGo}</div>:null}
        {it&&it.cal?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{it.cal}</div>:null}
      </div>
    </div>:null}
    {days.map((d: StoredDay,i: number)=><DayCard key={i} n={d.n||i+1} title={d.title} objective={d.objective} figures={d} note={d.note} schedule={d.schedule} onContribute={onContribute}/>)}
    {parsed.multi?parsed.days.map((d,i)=><DayCard key={i} n={d.n} figures={null} note={d.text} steps={splitItinerarySteps(d.text)}/>):null}
    {(!days.length&&!parsed.multi&&proseIt)?(()=>{const steps=splitItinerarySteps(parsed.days[0].text);return <div style={{...CARD,padding:"12px 14px",marginBottom:ROUTE_GAP}}>{steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:7}}>{steps.map((s: string,si: number)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{s}</li>)}</ul>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6}}>{parsed.days[0].text}</div>}</div>;})():null}
    {(days.length||parsed.multi)?caveat:null}
    {!hasPlan?<div style={{...CARD,border:"1px dashed "+C.border,padding:"18px 14px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:6}}><ActionIcon name="calendar" size={22} color={C.textMuted}/></div>
      <div style={{fontSize:13.5,fontWeight:700,color:C.text,marginBottom:4}}>No trip plan yet</div>
      <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:11}}>Climbed this? Add the day-by-day timing (approach, camps, car to car) to help the next party.</div>
      <button onClick={()=>onContribute&&onContribute()} style={{...BTN,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid}}>Add a trip plan</button>
    </div>:null}
    {onSaveMyItin?<div>
      <SL>My itinerary</SL>
      {!showBuilder?<div>
        {hasMine?<div style={{...CARD,padding:"4px 13px",marginBottom:ROUTE_GAP}}>
          {(myItin&&myItin.days||[]).map(function(d: StoredDay,i: number){const last=i===(myItin.days as StoredDay[]).length-1;const bits=[has(d.gainFt)&&d.gainFt?"+"+uElev(d.gainFt as number):null,fmtHrs(d.hours),has(d.miles)&&d.miles?uDistMi(d.miles as number):null].filter(Boolean).join(" · ");return <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderBottom:last?"none":"1px solid "+C.border}}><DayTag n={d.n||i+1}/><div style={{minWidth:0,flex:1}}><div style={{fontSize:13,fontWeight:700,lineHeight:1.3}}>{d.title||"Untitled day"}</div>{bits?<div style={{fontSize:11.5,color:C.textMuted,marginTop:1}}>{bits}</div>:null}</div></div>;})}
        </div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.45,marginBottom:9}}>Build your own plan for this route: start from a suggested one or from scratch, then share it with your crew.</div>}
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={function(){startBuilder(hasMine?myItin:null);}} style={{...BTN,background:hasMine?C.card:C.blueBg,color:hasMine?C.blue:C.onSolid,border:"1px solid "+(hasMine?C.border:C.blueDim)}}>{hasMine?"Edit my plan":"+ Plan your own itinerary"}</button>
          {hasMine?<button onClick={function(){shareOrCopy(route.name+" — plan",itinShareText(myItin,route),notify);}} aria-label="Share my plan" style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{"Share…"}</button>:null}
          {hasMine?<button onClick={function(){printSheet(route.name+" — plan",itinSheetHtml(myItin,route),notify);}} aria-label="Save my plan as a PDF" style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{"Save as PDF"}</button>:null}
          {(hasMine&&crewsForRoute&&crewsForRoute.length)?(pickCrew?<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>{crewsForRoute.map(function(c,ci: number){return <button key={c.id} onClick={function(){(onShareItinToCrew as NonNullable<ItineraryViewProps["onShareItinToCrew"]>)(c.id,myItin);setPickCrew(false);}} style={{...BTN,background:C.blueBg,color:C.onSolid,border:"1px solid "+C.blueDim}}>{/* Crews have no name column, so every button used to read "→ Crew". The agreed day tells two crews on one route apart. */"→ "+(c.date?"Crew · "+shortDate(c.date):crewsForRoute.length>1?"Crew "+(ci+1):"Your crew")}</button>;})}</div>:<button onClick={function(){setPickCrew(true);}} style={{...BTN,background:C.card,color:C.green,border:"1px solid "+C.green+"55"}}>Share with crew</button>):null}
        </div>
      </div>:<div>
        {avail.length?<div style={{marginBottom:11}}>
          <div style={{...SUB_LABEL,marginBottom:6}}>START FROM A SUGGESTED PLAN</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>{avail.map(function(a){const on=pickedKey===a.key;return <button key={a.key} onClick={function(){setDraft({days:itinDaysToDraft(a.itin.days)});setPickedKey(a.key);}} aria-current={on?"true":undefined} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:9,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,cursor:"pointer",textAlign:"left",width:"100%",boxSizing:"border-box"}}><div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:on?C.blue:C.text}}>{a.label}</div>{a.sub?<div style={{fontSize:11.5,color:C.textMuted,marginTop:2}}>{a.sub}</div>:null}</div>{on?<span style={{color:C.blue,fontSize:15,fontWeight:700,flexShrink:0}}>{"✓"}</span>:null}</button>;})}</div>
        </div>:null}
        <ItineraryEditor itin={draft||{days:[blankItinDay()]}} onChange={setDraft}/>
        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button onClick={function(){setShowBuilder(false);setDraft(null);setPickedKey(null);}} style={{flex:1,padding:9,background:C.card,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={saveDraft} disabled={!draftContentDays()} title={draftContentDays()?"":"Add a day title, a note or some numbers first"} style={{flex:2,padding:9,background:draftContentDays()?C.blueSolid:C.surface,color:draftContentDays()?C.onSolid:C.textMuted,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:draftContentDays()?"pointer":"default"}}>Save my plan</button>
        </div>
      </div>}
    </div>:null}
  </div>;
}
