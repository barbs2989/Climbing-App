import { routeKw } from "../../lib/routeKw.js";
import { useState } from "react";
import { getAvailableItineraries, itinDaysToDraft, blankItinDay, itinDraftToStructured, C, RSL as SL, catOf, ROUTE_GAP, uElev, uDistMi, uMass, SUB_LABEL, shareOrCopy, itinShareText, printSheet, itinSheetHtml, shortDate } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { seasonShort, seasonTidy } from "../../lib/seasonText.js";
import { BTN } from "../../lib/buttonStyles.js";
import ItineraryEditor from "./ItineraryEditor.tsx";
import type { Itinerary } from "./ItineraryEditor.tsx";

/* The topo editor. What it could not do, each of them the difference between a line a climber
   trusts and one they redraw:

     · A mis-placed point could not be fixed. The only tools were "undo last" and "clear all",
       so one bad point four points back cost you the four after it. Every point and pin is a
       draggable handle now, and the selected one can be deleted on its own.
     · No zoom, on a phone-sized image. A belay pin has to land on a specific ledge; at 390px
       wide, 1% of the frame is under 4px. The photo zooms (pinch, the wheel, or − / +) and a
       loupe follows a dragged handle at 3x.
     · A finger moving across the photo DREW. The editor sampled a point every 1.5% of a drag,
       so a climber pushing the photo around to see another part of the wall laid a line across
       it (owner, 2026-10-21). Now only a TAP marks: a press that wanders more than TAP_SLOP
       pixels pans the photo instead, and two fingers pinch-zoom — how every map app separates
       "move the view" from "drop a pin", and how photo viewers zoom.
     · Upload/save errors used alert() — a blocking dialog, in an app that has toasts and
       inline notices everywhere else. Now an inline error inside the section.

   The route line is red and its variations yellow, both drawn on the Draw line tab (a variation
   is a line, not a pin); a pitch's grade is a Grade marker on the Add pins tab, printed beside
   the pitch as on Steph Abegg's overlays. Coordinates stay percentages of the photo: `at` reads
   the ZOOMED layer's on-screen box, so a tap at 3x stores the same 0..100 point it would at 1x,
   and a handle pulled off the edge is clamped onto the rock. */
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

/* Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
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
  const days=(it&&it.days&&it.days.length)?it.days:[];const proseIt=(typeof it==="string"&&(it as string).trim())?(it as string).trim():null;
  const parsed=(!days.length&&proseIt)?splitItineraryDays(proseIt):{days:[],multi:false};
  const totG=days.reduce((a: number,d: StoredDay)=>a+(d.gainFt||0),0),totL=days.reduce((a: number,d: StoredDay)=>a+(d.lossFt||0),0),totMi=days.reduce((a: number,d: StoredDay)=>a+(d.miles||0),0);
  const conf=k.confidence;const confC=conf==="High"?C.green:conf==="Medium"?C.amber:C.red;
  const flagged=k.hazards.filter(h=>!h.official&&h.count>=2).length;
  const chip=(t: string,col: string)=><span style={{fontSize:12,fontWeight:700,color:col,background:col+"22",borderRadius:7,padding:"3px 8px"}}>{t}</span>;
  // `fill`: a day card's row. Five pills at the TOTAL row's padding need ~320px and a day card on a 390px phone has ~294, so the
  // fifth (pack weight) wrapped onto a row of its own; tighter pills that share the row's width keep all five on one line down to
  // a 360px phone (measured on Goode NE Buttress), and below that a wrapped pill stretches to fill its row rather than sit alone.
  const stat=(k: string,ic: string,val: string|null|undefined,col?: string,fill?: number)=>val==null||val===""?null:<div key={k} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:C.surface,borderRadius:8,padding:fill?"5px 5px":"5px 9px",...(fill?{flex:"1 1 auto",whiteSpace:"nowrap"}:null)}}>{ic?<span style={{fontSize:12}}>{ic}</span>:null}<span style={{fontSize:12,fontWeight:700,color:col||C.text}}>{val}</span></div>;
  return <div>
    <SL>Trip plan</SL>
    {(days.length||parsed.multi||proseIt)?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:9}}>A <b style={{color:C.textSub}}>recommended</b> itinerary based on how parties commonly climb this route — not the only way to do it. Faster/slower parties, different camps, or a different order are all normal.</div>:null}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{chip(conf+" confidence",confC)}{repN?<span {...clickable(()=>onSeeReports&&onSeeReports())} style={{cursor:"pointer"}} title="Jump to trip reports">{chip(repN+(repN===1?" trip report":" trip reports")+" →",C.blue)}</span>:chip("0 trip reports",C.textMuted)}{(route.season&&!["trad","sport"].includes(catOf(route)))?chip("Typical season: "+seasonShort(route.season),C.teal):null}{/* The month-by-month guide, as a chip that GOES there (owner note 2026-10-28). It was an italic
      "Full month-by-month seasonal guidance is further down this tab." under the chips, which was false on every route with a
      Conditions tab: SEASONAL GUIDANCE moved there (#2701) and the sentence stayed. */(route.seasonalGuidance&&onSeeSeason&&!["trad","sport"].includes(catOf(route)))?<span {...clickable(onSeeSeason)} style={{cursor:"pointer"}} title="Open the month-by-month season guide">{chip(seasonOnConditions?"Month by month · Conditions tab →":"Month by month →",C.blue)}</span>:null}</div>{(route.season&&!["trad","sport"].includes(catOf(route))&&seasonShort(route.season)!==seasonTidy(route.season))?<div style={{fontSize:12,color:C.textSub,margin:"6px 0 0",lineHeight:1.5}}>{route.season}</div>:null}{(route.bestSeason&&!route.seasonalGuidance&&!["trad","sport"].includes(catOf(route)))?<div style={{fontSize:12,color:C.textSub,margin:"6px 0 0",lineHeight:1.5}}><b style={{color:C.teal}}>When to go: </b>{route.bestSeason}</div>:null}
    {/* `cal` holds what is left of the plan's note once its road and closure sentences moved to the road block GETTING THERE reads (owner note 2026-10-28, scripts/oneoff/move-cal-road-notes.mjs). */}{it&&it.cal?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,marginBottom:4}}>{it.cal}</div>:null}
    {it&&it.totalNote?<div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>{it.totalNote}</div>:<div style={{marginBottom:12}}/>}
    {/* Where the hours actually came from. Populated on 544 routes and read by nothing until
        now, which mattered more than most unread fields: the day-by-day times above look
        equally authoritative whether they came from a trip report, from Beckey, or from
        "no route-specific trip report was found ... timing estimated from its relationship to
        Let it Burn/West Face". Sits beside the confidence chip because it is the sentence that
        chip is summarising. */}
    
    {days.map((d: StoredDay,i: number)=><div key={i} style={{display:"flex",gap:10,marginBottom:ROUTE_GAP}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}><div style={{width:30,height:30,borderRadius:15,background:C.blueBg,color:C.onSolid,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{d.n||i+1}</div>{i<days.length-1?<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:18}}/>:null}</div>
      <div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}>
        <div style={{fontSize:13.5,fontWeight:700,marginBottom:d.objective?5:8,lineHeight:1.35}}>{d.title}</div>{d.objective?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginBottom:9}}><span style={{color:C.blue,fontWeight:700}}>Objective · </span>{d.objective}</div>:null}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",marginBottom:d.note?8:0}}>{[stat("gain","↑",d.gainFt!=null?uElev(d.gainFt):null,C.green,1),stat("loss","↓",d.lossFt!=null?uElev(d.lossFt):null,C.amber,1),stat("hours","",d.hours?d.hours+" hr":null,C.text,1),stat("miles","",d.miles?uDistMi(d.miles):null,C.text,1),stat("pack","",d.packLb?uMass(d.packLb):null,C.purple,1)]}</div>
        {d.note?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{d.note}</div>:null}{d.schedule&&d.schedule.length?<div style={{marginTop:d.note?10:9,borderTop:"1px solid "+C.borderLight,paddingTop:10,display:"flex",flexDirection:"column",gap:9}}>{d.schedule.map((st,si: number)=><div key={si} style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{flexShrink:0,width:68,fontSize:12,fontWeight:700,color:st.time?C.blue:C.textMuted,lineHeight:1.35,paddingTop:1,textAlign:"right",wordBreak:"break-word"}}>{st.time||""}</span><div style={{flex:1,minWidth:0,borderLeft:"2px solid "+C.borderLight,paddingLeft:11}}><div style={{fontSize:12.5,color:C.text,lineHeight:1.4,fontWeight:600}}>{st.label}</div>{st.detail?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:2}}>{st.detail}</div>:null}</div></div>)}</div>:null}
      </div></div>)}
    {(!days.length&&!parsed.multi)?<div style={{fontSize:12.5,color:C.textSub,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px",marginBottom:ROUTE_GAP}}>No day-by-day plan on file yet for this route.</div>:null}
    {days.length?<div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",background:C.surface,borderRadius:10,padding:"9px 11px",marginBottom:ROUTE_GAP}}><span style={{...SUB_LABEL,alignSelf:"center",marginRight:2}}>TOTAL</span>{stat("days","",days.length+(days.length===1?" day":" days"),C.text)}{stat("gain","↑",uElev(totG),C.green)}{totL?stat("loss","↓",uElev(totL),C.amber):null}{totMi?stat("miles","",uDistMi(Math.round(totMi*10)/10),C.text):null}</div>:null}
    {days.length?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>Times and pack weights are estimates for an average party — adjust for your fitness, conditions, and the latest <b style={{color:C.textSub}}>Reports</b> and <b style={{color:C.textSub}}>Safety</b> tabs.{flagged?" Climbers have flagged "+flagged+" hazard"+(flagged!==1?"s":"")+" not in the official info — check Safety before you commit.":""}</div>:null}{(!days.length&&parsed.multi)?<div>{parsed.days.map((d,i)=>{const steps=splitItinerarySteps(d.text);return <div key={i} style={{display:"flex",gap:10,marginBottom:ROUTE_GAP}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}><div style={{width:30,height:30,borderRadius:15,background:C.blueBg,color:C.onSolid,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{d.n}</div>{i<parsed.days.length-1?<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:18}}/>:null}</div><div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}><div style={{fontSize:13.5,fontWeight:700,marginBottom:8}}>{"Day "+d.n}</div>{steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{steps.map((s: string,si: number)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{s}</li>)}</ul>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{d.text}</div>}</div></div>;})}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>Day-by-day timing is a general guide — adjust for your fitness, conditions, and the latest <b style={{color:C.textSub}}>Reports</b> and <b style={{color:C.textSub}}>Safety</b> tabs.{flagged?" Climbers have flagged "+flagged+" hazard"+(flagged!==1?"s":"")+" not in the official info — check Safety before you commit.":""}</div></div>:null}
    {(!days.length&&!parsed.multi&&proseIt)?(()=>{const steps=splitItinerarySteps(parsed.days[0].text);return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px"}}>{steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:7}}>{steps.map((s: string,si: number)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{s}</li>)}</ul>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6}}>{parsed.days[0].text}</div>}</div>;})():null}
    {(!days.length&&!proseIt)?<div style={{background:C.card,border:"1px dashed "+C.border,borderRadius:12,padding:"18px 14px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>No trip plan yet</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:11}}>Climbed this? Add the day-by-day timing — approach, camps, car-to-car — to help the next party.</div><button onClick={()=>onContribute&&onContribute()} style={{...BTN,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid}}>Add a trip plan</button></div>:null}
    {onSaveMyItin?<div>
      <SL>My itinerary</SL>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4,marginBottom:9}}>Build your own plan for this route — start from a suggested one or from scratch.</div>
      {!showBuilder?<div>
        {(myItin&&myItin.days&&myItin.days.length)?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px",marginBottom:ROUTE_GAP}}>
          {myItin.days.map(function(d: StoredDay,i: number){return <div key={i} style={{marginBottom:i<(myItin.days as StoredDay[]).length-1?7:0,paddingBottom:i<(myItin.days as StoredDay[]).length-1?7:0,borderBottom:i<(myItin.days as StoredDay[]).length-1?"1px solid "+C.border:"none"}}><span style={{fontSize:13,fontWeight:700}}>{"Day "+(d.n||i+1)+(d.title?": "+d.title:"")}</span></div>;})}
        </div>:null}
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={function(){startBuilder(myItin&&myItin.days&&myItin.days.length?myItin:null);}} style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{(myItin&&myItin.days&&myItin.days.length)?"Edit my plan":"+ Plan your own itinerary"}</button>
          {(myItin&&myItin.days&&myItin.days.length)?<button onClick={function(){shareOrCopy(route.name+" — plan",itinShareText(myItin,route),notify);}} aria-label="Share my plan" style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{"Share…"}</button>:null}
          {(myItin&&myItin.days&&myItin.days.length)?<button onClick={function(){printSheet(route.name+" — plan",itinSheetHtml(myItin,route),notify);}} aria-label="Save my plan as a PDF" style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{"Save as PDF"}</button>:null}
          {(myItin&&myItin.days&&myItin.days.length&&crewsForRoute&&crewsForRoute.length)?(pickCrew?<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>{crewsForRoute.map(function(c,ci: number){return <button key={c.id} onClick={function(){(onShareItinToCrew as NonNullable<ItineraryViewProps["onShareItinToCrew"]>)(c.id,myItin);setPickCrew(false);}} style={{...BTN,background:C.blueBg,color:C.onSolid,border:"1px solid "+C.blueDim}}>{/* Crews have no name column, so every button used to read "→ Crew". The agreed day tells two crews on one route apart. */"→ "+(c.date?"Crew · "+shortDate(c.date):crewsForRoute.length>1?"Crew "+(ci+1):"Your crew")}</button>;})}</div>:<button onClick={function(){setPickCrew(true);}} style={{...BTN,background:C.card,color:C.green,border:"1px solid "+C.green+"55"}}>Share with crew</button>):null}
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
